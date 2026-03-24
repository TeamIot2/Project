// Dashboard page: air quality score, sensor cards with sparklines, environment selector.

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDashboard } from "../contexts/DashboardContext";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useEnvironment } from "../contexts/EnvironmentContext";
import { useVisualStyle } from "../contexts/StyleContext";
import { useTheme } from "../contexts/ThemeContext";
import { useAnimatedNumber } from "../hooks/useAnimatedNumber";
import { useHeartRate } from "../hooks/useHeartRate";
import { useI18n } from "../contexts/I18nContext";
import { apiGet } from "../api";
import { sortDevicesByStatus } from "../utils/deviceSorting";
import type { EnvironmentalReading, DeviceInfo, MetricConfig } from "../types";
import type { Translations } from "../i18n/translations";
import {
  Droplets,
  Thermometer,
  Wind,
  Sun,
  Volume2,
  Activity,
  Clock,
  Heart,
  Bluetooth,
  ChevronDown,
  Moon,
  Briefcase,
  GraduationCap,
  Tree,
  Factory,
  Sprout,
  Cpu,
  Co2Molecule,
} from "../components/Icons";
import type { EnvironmentMode } from "../types";

/**
 * Mobile environment strip.
 * Horizontal scroll with one highlighted active card.
 */
function EnvironmentCarousel({
  environments,
  activeId,
  onSelect,
  overlayStyle = false,
}: {
  environments: { id: EnvironmentMode; img: string; label: string; icon?: typeof Wind }[];
  activeId: EnvironmentMode;
  onSelect: (id: EnvironmentMode) => void;
  overlayStyle?: boolean;
}) {
  const activeIndex = environments.findIndex((e) => e.id === activeId);

  function navigate(direction: number) {
    const len = environments.length;
    const nextIndex = ((activeIndex + direction) % len + len) % len;
    onSelect(environments[nextIndex].id);
  }

  return (
    <section className="env-carousel">
      <button className="env-carousel-arrow left" onClick={() => navigate(-1)} aria-label="Previous">
        â€ą
      </button>
      <div className="env-carousel-track">
        {environments.map((env, i) => {
          const len = environments.length;
          let diff = i - activeIndex;
          if (diff > len / 2) diff -= len;
          if (diff < -len / 2) diff += len;
          const absDiff = Math.abs(diff);
          const isActive = diff === 0;
          const Icon = env.icon;

          return (
            <button
              key={env.id}
              className={`env-card ${isActive ? "active" : ""}`}
              data-env={env.id}
              onClick={() => onSelect(env.id)}
              style={{
                transform: `translateX(${diff * (overlayStyle ? 100 : 75)}%) scale(1)`,
                opacity: absDiff <= 1 ? 1 : 0,
                zIndex: 10 - absDiff,
              }}
            >
              <img src={env.img} alt={env.label} className="env-card-img" />
              {overlayStyle && Icon ? (
                <>
                  <div className="env-card-overlay" />
                  <div className="env-card-copy">
                    <Icon size={isActive ? 29 : 24} className="env-card-icon" />
                    <span className="env-card-label">{env.label}</span>
                  </div>
                </>
              ) : (
                <span className="env-card-label">{env.label}</span>
              )}
            </button>
          );
        })}
      </div>
      <button className="env-carousel-arrow right" onClick={() => navigate(1)} aria-label="Next">
        â€ş
      </button>
    </section>
  );
}

// Resolved color values for sensor card left borders (CSS vars don't work inline for border)
const sensorColors: Record<string, string> = {
  co2_ppm: "#22C55E",
  temperature_c: "#3B82F6",
  humidity_pct: "#06B6D4",
  pressure_hpa: "#8B5CF6",
  light_lux: "#F59E0B",
  noise_adc: "#EF4444",
  heart_rate_bpm: "#E11D48",
  hrv_rmssd_ms: "#EC4899",
};

// Translation keys for sensor labels
const sensorLabelKeys: Record<string, keyof Translations> = {
  co2_ppm: "sensor_co2",
  temperature_c: "sensor_temperature",
  humidity_pct: "sensor_humidity",
  pressure_hpa: "sensor_pressure",
  light_lux: "sensor_light",
  noise_adc: "sensor_noise",
  heart_rate_bpm: "sensor_heart_rate",
  hrv_rmssd_ms: "sensor_hrv",
};

// Sensor metric configurations
const metrics: MetricConfig[] = [
  { key: "co2_ppm", label: "CO2", unit: "ppm", color: "var(--chart-co2)", icon: "co2molecule", decimals: 0, chartDomain: [300, 1500] },
  { key: "temperature_c", label: "Temperature", unit: "Â°C", color: "var(--chart-temp)", icon: "thermometer", decimals: 1, chartDomain: [15, 35] },
  { key: "humidity_pct", label: "Humidity", unit: "%", color: "var(--chart-humidity)", icon: "droplets", decimals: 1, chartDomain: [20, 80] },
  { key: "pressure_hpa", label: "Pressure", unit: "hPa", color: "var(--chart-pressure)", icon: "wind", decimals: 0, chartDomain: [960, 1060] },
  { key: "light_lux", label: "Light", unit: "lux", color: "var(--chart-light)", icon: "sun", decimals: 0, chartDomain: [0, 1000] },
  { key: "noise_adc", label: "Noise", unit: "ADC", color: "var(--chart-noise)", icon: "volume", decimals: 0, chartDomain: [0, 1024] },
];

// Map icon names to components
const iconMap: Record<string, typeof Wind> = {
  wind: Wind,
  thermometer: Thermometer,
  droplets: Droplets,
  sun: Sun,
  volume: Volume2,
  heart: Heart,
  co2molecule: Co2Molecule,
};

/**
 * Compare current value vs oldest reading to determine trend direction and delta.
 */
function getTrend(key: string, current: number | null, readings: EnvironmentalReading[]): { direction: "up" | "down" | "stable"; delta: number } {
  if (current === null || current === undefined || readings.length < 2) return { direction: "stable", delta: 0 };
  const oldest = readings[0];
  const oldValue = key === "noise_adc" ? oldest.sound_level_adc : (oldest[key as keyof EnvironmentalReading] as number);
  if (oldValue === undefined) return { direction: "stable", delta: 0 };
  const diff = current - oldValue;
  const threshold = Math.abs(oldValue) * 0.02; // 2% change threshold
  if (Math.abs(diff) < threshold) return { direction: "stable", delta: 0 };
  return { direction: diff > 0 ? "up" : "down", delta: Math.round(Math.abs(diff) * 10) / 10 };
}

/**
 * Generate a one-line insight describing the worst sensor condition.
 * Used in the desktop hero panel.
 */
function generateInsight(
  reading: EnvironmentalReading | null,
  getQuality: (key: string, value: number) => "good" | "moderate" | "poor",
  t: Translations
): string {
  if (!reading) return "";
  const sensors = [
    { key: "co2_ppm", value: reading.co2_ppm, label: t.sensor_co2 },
    { key: "temperature_c", value: reading.temperature_c, label: t.sensor_temperature },
    { key: "humidity_pct", value: reading.humidity_pct, label: t.sensor_humidity },
    { key: "light_lux", value: reading.light_lux, label: t.sensor_light },
  ];
  const poor = sensors.filter(s => getQuality(s.key, s.value) === "poor");
  const moderate = sensors.filter(s => getQuality(s.key, s.value) === "moderate");
  if (poor.length > 0) return `\u26A0 ${poor.map(s => s.label).join(", ")} \u2014 ${t.quality_poor}`;
  if (moderate.length > 0) return `${moderate.map(s => s.label).join(", ")} \u2014 ${t.quality_moderate}`;
  return `\u2713 ${t.quality_good}`;
}

/**
 * Generate a context-aware tip based on the worst sensor value.
 * Used in the desktop tip bar between hero and sensor grid.
 * Returns an object with emoji, text, and severity for the narrative tip card.
 */
function generateTip(
  reading: EnvironmentalReading | null,
  getQuality: (key: string, value: number) => string,
  t: Translations
): { emoji: string; text: string } {
  if (!reading) return { emoji: "", text: "" };
  // Check poor first
  if (getQuality("co2_ppm", reading.co2_ppm) === "poor") return { emoji: "\u{1F4A1}", text: t.tip_ventilate };
  if (getQuality("temperature_c", reading.temperature_c) === "poor") return { emoji: "\u{1F321}\uFE0F", text: t.tip_temperature };
  if (getQuality("humidity_pct", reading.humidity_pct) === "poor") return { emoji: "\u{1F4A7}", text: t.tip_humidity };
  if (getQuality("light_lux", reading.light_lux) === "poor") return { emoji: "\u2600\uFE0F", text: t.tip_light };
  // Then moderate
  if (getQuality("co2_ppm", reading.co2_ppm) === "moderate") return { emoji: "\u26A0\uFE0F", text: t.tip_ventilate };
  if (getQuality("humidity_pct", reading.humidity_pct) === "moderate") return { emoji: "\u{1F4A7}", text: t.tip_humidity };
  return { emoji: "\u2705", text: t.tip_all_good };
}

/**
 * Determine overall tip severity based on the worst sensor reading.
 * Used for the narrative tip card border accent.
 */
function getTipSeverity(
  reading: EnvironmentalReading | null,
  getQuality: (key: string, value: number) => "good" | "moderate" | "poor"
): "good" | "moderate" | "poor" {
  if (!reading) return "good";
  const keys = ["co2_ppm", "temperature_c", "humidity_pct", "pressure_hpa", "light_lux"];
  for (const key of keys) {
    const val = reading[key as keyof EnvironmentalReading] as number;
    if (val !== undefined && getQuality(key, val) === "poor") return "poor";
  }
  for (const key of keys) {
    const val = reading[key as keyof EnvironmentalReading] as number;
    if (val !== undefined && getQuality(key, val) === "moderate") return "moderate";
  }
  return "good";
}

/**
 * Calculate air quality score (0-100) from all sensor readings
 * against current environment thresholds.
 */
function calcAirQuality(
  reading: EnvironmentalReading,
  getQuality: (key: string, value: number) => "good" | "moderate" | "poor"
): number {
  const scores: number[] = [];
  const sensorKeys = ["co2_ppm", "temperature_c", "humidity_pct", "pressure_hpa", "light_lux"];
  // Map noise: use sound_level_adc as noise_adc
  const noiseValue = reading.sound_level_adc;

  for (const key of sensorKeys) {
    const val = reading[key as keyof EnvironmentalReading] as number;
    const q = getQuality(key, val);
    scores.push(q === "good" ? 100 : q === "moderate" ? 60 : 20);
  }
  // Noise
  const noiseQ = getQuality("noise_adc", noiseValue);
  scores.push(noiseQ === "good" ? 100 : noiseQ === "moderate" ? 60 : 20);

  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/**
 * SVG circular gauge for air quality score.
 */
function AirQualityGauge({ score, qualityLabel }: { score: number | null; qualityLabel: string }) {
  const radius = 62;
  const stroke = 9;
  const size = 160;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const displayScore = score ?? 0;
  const progress = (displayScore / 100) * circumference;
  const color = score === null ? "#94A3B8"
    : score >= 80 ? "#22C55E"   // green
    : score >= 60 ? "#FACC15"   // yellow
    : score >= 40 ? "#F97316"   // orange
    : "#EF4444";                // red

  return (
    <div className="gauge-container">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--border-light)" strokeWidth={stroke} />
        <circle
          cx={center} cy={center} r={radius} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          transform={`rotate(-90 ${center} ${center})`}
          className="gauge-progress"
        />
        <text x={center} y={center - 6} textAnchor="middle" className="gauge-score" fill="var(--text-primary)">
          {score !== null ? `${score}%` : "--"}
        </text>
        <text x={center} y={center + 16} textAnchor="middle" className="gauge-label" fill={color}>
          {qualityLabel}
        </text>
      </svg>
    </div>
  );
}

/**
 * Small SVG circular gauge for individual sensor quality score.
 */
function SensorMiniGauge({
  score,
  qualityLabel,
  compact = false,
  scoreColor = "#1E293B",
}: {
  score: number;
  qualityLabel: string;
  compact?: boolean;
  scoreColor?: string;
}) {
  const radius = 40;
  const stroke = 7;
  const size = 100;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 80 ? "#22C55E" : score >= 60 ? "#FACC15" : score >= 40 ? "#F97316" : "#EF4444";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="sensor-mini-gauge">
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
      <circle
        cx={center} cy={center} r={radius} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${progress} ${circumference}`}
        transform={`rotate(-90 ${center} ${center})`}
      />
      <text
        className="sensor-mini-score"
        x={center}
        y={center - 3}
        textAnchor="middle"
        fontSize={compact ? "16" : "20"}
        fontWeight="700"
        fill={scoreColor}
      >
        {score}%
      </text>
      <text x={center} y={center + 14} textAnchor="middle" fontSize="12" fontWeight="600" fill={color}>{qualityLabel}</text>
    </svg>
  );
}

/**
 * Sparkline component using Recharts.
 */
function Sparkline({ data, dataKey, color }: { data: Record<string, unknown>[]; dataKey: string; color: string }) {
  if (data.length < 2) return <div className="sparkline-empty" />;

  return (
    <div className="sparkline-wrapper">
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Dashboard() {
  const { mode, getQuality, setEnvironment } = useEnvironment();
  const { activeStyle } = useVisualStyle();
  const { theme } = useTheme();
  const { t } = useI18n();
  const hr = useHeartRate();

  const {
    isMeasuring, setIsMeasuring,
    devicesExpanded, setDevicesExpanded,
    selectedDevices, setSelectedDevices,
    expandedDevice, setExpandedDevice,
    selectedDevice, setSelectedDevice,
    showConfirmModal, setShowConfirmModal,
  } = useDashboard();

  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [currentReading, setCurrentReading] = useState<EnvironmentalReading | null>(null);
  const [recentReadings, setRecentReadings] = useState<EnvironmentalReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState(30);
  const [fetchSuccess, setFetchSuccess] = useState(0);
  const [fetchTotal, setFetchTotal] = useState(0);
  const [measureStart, setMeasureStart] = useState<number | null>(Date.now());
  const [uptime, setUptime] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const figmaTab = location.pathname === "/history" ? "history"
    : location.pathname === "/devices" ? "devices"
    : location.pathname === "/settings" ? "settings"
    : "measure";
  const setFigmaTab = useCallback((tab: "measure" | "history" | "devices" | "settings") => {
    const paths = { measure: "/", history: "/history", devices: "/devices", settings: "/settings" };
    navigate(paths[tab]);
  }, [navigate]);

  const FIGMA_ACTIVE_CARD_WIDTH = 356;
  const FIGMA_SIDE_CARD_WIDTH = 228;

  function getFigmaCardScale(absDiff: number): number {
    if (absDiff === 0) return 1;
    if (absDiff === 1) return 1;
    if (absDiff === 2) return 0.92;
    return 0.84;
  }

  function getFigmaCardWidth(absDiff: number): number {
    return (absDiff === 0 ? FIGMA_ACTIVE_CARD_WIDTH : FIGMA_SIDE_CARD_WIDTH) * getFigmaCardScale(absDiff);
  }

  // Keep the desktop carousel evenly stacked: each deeper card reveals 25% of its width.
  function getFigmaCardOffset(diff: number): number {
    const sign = diff < 0 ? -1 : 1;
    const absDiff = Math.abs(diff);
    if (absDiff === 0) return 0;

    let offset = FIGMA_ACTIVE_CARD_WIDTH / 2 - getFigmaCardWidth(1) / 4;
    if (absDiff === 1) return sign * offset;

    let previousWidth = getFigmaCardWidth(1);
    for (let depth = 2; depth <= absDiff; depth += 1) {
      const currentWidth = getFigmaCardWidth(depth);
      offset += previousWidth / 2 - currentWidth / 4;
      previousWidth = currentWidth;
    }

    return sign * offset;
  }

  // Figma mode carousel definitions (style 16)
  const figmaModes: { id: EnvironmentMode; label: string; icon: typeof Wind; gradient: string; bgImage: string }[] = [
    { id: "sleep",      label: "Sleep",       icon: Moon,          gradient: "linear-gradient(135deg, #7C3AED, #A78BFA)", bgImage: "/images/silent/silent_06_bedroom.png" },
    { id: "office",     label: "Office",      icon: Briefcase,     gradient: "linear-gradient(135deg, #38BDF8, #BAE6FD)", bgImage: "/images/silent/silent_07_office.png" },
    { id: "school",     label: "School",      icon: GraduationCap, gradient: "linear-gradient(135deg, #FACC15, #FDE68A)", bgImage: "/images/silent/silent_01_classroom.png" },
    { id: "outdoor",    label: "Outside",     icon: Tree,          gradient: "linear-gradient(135deg, #1E3A2F, #2D5040)", bgImage: "/images/silent/silent_03_nature.png" },
    { id: "sport",      label: "Gym",         icon: Activity,      gradient: "linear-gradient(135deg, #F97316, #FCA044)", bgImage: "/images/silent/silent_02_gym.png" },
    { id: "factory",    label: "Factory",     icon: Factory,       gradient: "linear-gradient(135deg, #6B7280, #9CA3AF)", bgImage: "/images/silent/silent_08_factory.png" },
    { id: "greenhouse", label: "Greenhouse",  icon: Sprout,        gradient: "linear-gradient(135deg, #16A34A, #4ADE80)", bgImage: "/images/silent/silent_04_greenhouse.png" },
  ];

  // Accent color for the active mode â€” drives tab/content border color
  const modeAccentColor: Record<string, string> = {
    sleep:      "#A78BFA",
    office:     "#38BDF8",
    school:     "#FACC15",
    outdoor:    "#2D5040",
    sport:      "#F97316",
    factory:    "#9CA3AF",
    greenhouse: "#4ADE80",
  };
  const accentColor = modeAccentColor[mode] ?? "#FDE68A";

  // Live clock â€” updates every second
  const [liveClock, setLiveClock] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
  );
  useEffect(() => {
    const clock = setInterval(() => {
      setLiveClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    }, 1000);
    return () => clearInterval(clock);
  }, []);

  // Refresh countdown timer (resets every 30s)
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown(prev => prev <= 1 ? 30 : prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch devices on mount
  useEffect(() => {
    apiGet<DeviceInfo[]>("/devices")
      .then((devs) => {
        const sortedDevices = sortDevicesByStatus(devs);
        setDevices(sortedDevices);
        if (sortedDevices.length > 0 && !selectedDevice) {
          setSelectedDevice(sortedDevices[0].device_id);
        }
        // Select all devices for measuring by default
        setSelectedDevices(new Set(sortedDevices.map(d => d.device_id)));
      })
      .catch((err) => setError(err.message));
  }, []); // Intentional: fetch device list once on mount only

  // Fetch readings when device changes
  const fetchData = useCallback(async () => {
    if (!selectedDevice) return;
    try {
      const [latest, recent] = await Promise.all([
        apiGet<EnvironmentalReading>(`/readings/latest/${selectedDevice}`),
        apiGet<EnvironmentalReading[]>("/readings", {
          device_id: selectedDevice,
          limit: 12,
        }),
      ]);
      setCurrentReading(latest);
      setRecentReadings(recent.reverse());
      setLastUpdate(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
      setRefreshCountdown(30);
      setError(null);
      setFetchTotal(p => p + 1);
      setFetchSuccess(p => p + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
      setFetchTotal(p => p + 1);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Track measuring start time
  useEffect(() => {
    if (isMeasuring) {
      setMeasureStart(Date.now());
    } else {
      setMeasureStart(null);
      setUptime("");
    }
  }, [isMeasuring]);

  // Live uptime counter
  useEffect(() => {
    if (!measureStart) return;
    function tick() {
      const elapsed = Math.floor((Date.now() - measureStart!) / 1000);
      const d = Math.floor(elapsed / 86400);
      const h = Math.floor((elapsed % 86400) / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      const s = elapsed % 60;
      const parts: string[] = [];
      if (d > 0) parts.push(`${d}d`);
      parts.push(`${h}h`);
      parts.push(`${String(m).padStart(2, "0")}m`);
      parts.push(`${String(s).padStart(2, "0")}s`);
      setUptime(parts.join(" "));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [measureStart]);

  /**
   * Get the sensor value from the current reading, mapping noise to sound_level_adc.
   */
  function getSensorValue(key: string): number | null {
    if (!currentReading) return null;
    if (key === "noise_adc") return currentReading.sound_level_adc;
    return currentReading[key as keyof EnvironmentalReading] as number;
  }

  /**
   * Build sparkline data for a given metric key.
   */
  function getSparklineData(key: string): Record<string, unknown>[] {
    return recentReadings.map((r) => ({
      value: key === "noise_adc" ? r.sound_level_adc : (r[key as keyof EnvironmentalReading] as number),
    }));
  }

  // Compute quality label for the gauge
  const airQualityScore = currentReading ? calcAirQuality(currentReading, getQuality) : null;
  const animatedScore = useAnimatedNumber(airQualityScore ?? 0, 800);
  const qualityLabel = airQualityScore === null
    ? t.quality_loading
    : airQualityScore >= 70
      ? t.quality_good
      : airQualityScore >= 40
        ? t.quality_moderate
        : t.quality_poor;

  // Desktop hero insight text
  const insightText = generateInsight(currentReading, getQuality, t);

  // Desktop tip bar text and severity
  const tip = generateTip(currentReading, getQuality, t);
  const tipSeverity = getTipSeverity(currentReading, getQuality);

  // Environment definitions shared between carousel and desktop env row
  const isStyle16 = activeStyle.id === 16;
  const environmentDefs = [
    {
      id: "office" as const,
      img: `${activeStyle.scenePrefix}office${activeStyle.sceneSuffix}`,
      label: t.env_office,
      icon: Briefcase,
    },
    {
      id: "sleep" as const,
      img: `${activeStyle.scenePrefix}sleep${activeStyle.sceneSuffix}`,
      label: t.env_sleep,
      icon: Moon,
    },
    {
      id: "sport" as const,
      img: `${activeStyle.scenePrefix}sport${activeStyle.sceneSuffix}`,
      label: t.env_sport,
      icon: Activity,
    },
    {
      id: "outdoor" as const,
      img: `${activeStyle.scenePrefix}outdoor${activeStyle.sceneSuffix}`,
      label: t.env_outdoor,
      icon: Tree,
    },
  ];
  const figmaEnvironmentDefs = figmaModes.map(({ id, label, icon, bgImage }) => ({
    id,
    label,
    icon,
    img: bgImage,
  }));
  const activeEnvironmentDefs = isStyle16 ? figmaEnvironmentDefs : environmentDefs;
  const cubeByMode: Record<EnvironmentMode, { orientation: string; sensorLabel: string }> = {
    office: { orientation: "0deg 180deg 0deg", sensorLabel: t.sensor_co2 },
    sleep: { orientation: "-90deg 0deg 0deg", sensorLabel: t.sensor_light },
    sport: { orientation: "0deg 0deg 0deg", sensorLabel: t.sensor_temperature },
    outdoor: { orientation: "0deg -90deg 0deg", sensorLabel: t.sensor_humidity },
    school: { orientation: "0deg 180deg 0deg", sensorLabel: t.sensor_co2 },
    factory: { orientation: "0deg 0deg 0deg", sensorLabel: t.sensor_temperature },
    greenhouse: { orientation: "0deg -90deg 0deg", sensorLabel: t.sensor_humidity },
  };
  const cubeOrientation = cubeByMode[mode].orientation;
  const cubePrimaryLabel = cubeByMode[mode].sensorLabel;

  // Quality label resolver for badges
  function getQualityLabel(q: string): string {
    if (q === "good") return t.quality_good;
    if (q === "moderate") return t.quality_moderate;
    return t.quality_poor;
  }

  const historyPreviewData = recentReadings.length > 0
    ? recentReadings.slice(-6).map((reading, index) => ({
        label: `${index + 1}`,
        co2: Math.round(reading.co2_ppm),
        temp: Number(reading.temperature_c.toFixed(1)),
        humidity: Math.round(reading.humidity_pct),
      }))
    : [
        { label: "1", co2: 540, temp: 21.3, humidity: 46 },
        { label: "2", co2: 575, temp: 21.7, humidity: 47 },
        { label: "3", co2: 598, temp: 22.0, humidity: 48 },
        { label: "4", co2: 562, temp: 21.8, humidity: 47 },
        { label: "5", co2: 524, temp: 21.5, humidity: 46 },
        { label: "6", co2: 508, temp: 21.2, humidity: 45 },
      ];

  const historySummary = [
    {
      label: "7 day avg",
      value: `${Math.round(historyPreviewData.reduce((sum, item) => sum + item.co2, 0) / historyPreviewData.length)} ppm`,
      tone: "good",
    },
    {
      label: "Peak period",
      value: "14:00 - 16:00",
      tone: "moderate",
    },
    {
      label: "Most stable room",
      value: "Bedroom",
      tone: "good",
    },
  ];

  const devicePreviewCards = (devices.length > 0 ? devices : [
    { device_id: "demo-1", name: "Living Room", status: "online", location: "Ground floor", battery_v: 3.9, last_seen: new Date().toISOString() },
    { device_id: "demo-2", name: "Office", status: "online", location: "2nd floor", battery_v: 3.7, last_seen: new Date(Date.now() - 1000 * 60 * 8).toISOString() },
    { device_id: "demo-3", name: "Bedroom", status: "offline", location: "1st floor", battery_v: 3.4, last_seen: new Date(Date.now() - 1000 * 60 * 48).toISOString() },
  ]).slice(0, 3).map((device, index) => ({
    ...device,
    sync: index === 0 ? "Auto sync every 30 s" : index === 1 ? "Battery saver mode" : "Reconnect scheduled",
    sensors: index === 0
      ? ["CO2", "Temperature", "Humidity", "Light"]
      : index === 1
        ? ["CO2", "Pressure", "Noise"]
        : ["Temperature", "Humidity"],
  }));

  const settingsPreview = [
    { label: "Push alerts", value: "Enabled", hint: "High CO2 and offline device warnings" },
    { label: "Weekly summary", value: "Monday 08:00", hint: "Email digest with trends and anomalies" },
    { label: "Shared access", value: "2 members", hint: "Office manager and family viewer" },
    { label: "Privacy mode", value: "Balanced", hint: "Sensor data retained for 30 days" },
  ];

  const automationPreview = [
    { name: "Night comfort mode", detail: "Reduce brightness after 22:00 and watch noise spikes", state: "Active" },
    { name: "Ventilation reminder", detail: "Notify when CO2 stays above 900 ppm for 10 min", state: "Pending" },
    { name: "Office arrival preset", detail: "Switch to Office scene at first device wake-up", state: "Active" },
  ];

  if (loading && !currentReading) {
    return (
      <div className="dashboard-page">
        <section className="air-quality-section card">
          <div className="skeleton skeleton-gauge" />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 24, width: '60%', marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 16, width: '80%' }} />
          </div>
        </section>
        <section className="sensor-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="dashboard-page" data-env={mode}>
      {/* Environment carousel â€” centered active card, looping (mobile only) */}
      <EnvironmentCarousel
        environments={activeEnvironmentDefs}
        activeId={mode}
        onSelect={setEnvironment}
        overlayStyle={isStyle16}
      />

      {/* ===== DESKTOP HERO STAGE: full-width hero with background image ===== */}
      <section className="desktop-hero-stage" style={{ backgroundImage: `url(${activeStyle.heroPrefix}${mode}${activeStyle.heroSuffix})` }}>
        <div className="hero-bg-overlay" />
        <div className="hero-content">
          <div className="hero-kpi-block">
            <div className="hero-score">{airQualityScore !== null ? `${Math.round(animatedScore)}%` : "--"}</div>
            <div className="hero-quality" style={{ color: airQualityScore === null ? "var(--text-muted)" : airQualityScore >= 70 ? "var(--good)" : airQualityScore >= 40 ? "var(--moderate)" : "var(--poor)" }}>
              {qualityLabel}
            </div>
            <p className="hero-insight">{insightText}</p>
            <div className="hero-meta">
              <span className={`hero-live-dot ${isMeasuring ? "" : "inactive"}`} />
              <span>{isMeasuring ? t.measuring_active : t.measuring_inactive}</span>
              {lastUpdate && <span>Â· {t.updated} {lastUpdate}</span>}
              <span className="hero-countdown">{refreshCountdown}s</span>
              <button
                className="hero-action-btn"
                onClick={() => setShowConfirmModal(isMeasuring ? "stop" : "start")}
              >
                {isMeasuring ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <rect x="6" y="5" width="4" height="14" rx="1.2" />
                      <rect x="14" y="5" width="4" height="14" rx="1.2" />
                    </svg>
                    {t.measuring_stop}
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <polygon points="7,5 19,12 7,19" />
                    </svg>
                    {t.measuring_start}
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="hero-gauge">
            <AirQualityGauge score={airQualityScore !== null ? Math.round(animatedScore) : null} qualityLabel={qualityLabel} />
          </div>
        </div>
        <div className="hero-bottom-bar">
          <div className="hero-env-strip">
            {activeEnvironmentDefs.map(env => (
              <button
                key={env.id}
                className={`hero-env-thumb ${mode === env.id ? "active" : ""}`}
                data-env={env.id}
                onClick={() => setEnvironment(env.id)}
              >
                <img src={env.img} alt={env.label} />
                <span>{env.label}</span>
              </button>
            ))}
          </div>
          <div className="hero-room-chips">
            {devices.map(d => (
              <div key={d.device_id} className="room-chip-wrapper">
                <button
                  className={`room-chip ${selectedDevice === d.device_id ? "active" : ""}`}
                  onClick={() => setSelectedDevice(d.device_id)}
                >
                  <span className="room-chip-dot" style={{ background: d.status === "online" ? "var(--good)" : "var(--text-muted)" }} />
                  {d.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sensor cube stage below hero panel; mode switches which face turns to the front */}
      <section className="sensor-cube-stage" data-env={mode}>
        <div className="sensor-cube-copy">
          <h3 className="sensor-cube-title">Sensor Cube</h3>
          <p className="sensor-cube-text">
            {(activeEnvironmentDefs.find((env) => env.id === mode)?.label ?? mode)} - {cubePrimaryLabel}
          </p>
        </div>
        <div className="sensor-cube-viewer-wrap">
          <model-viewer
            src="/models/cube_asset_sensor_faces.glb"
            alt="Rotating sensor cube"
            camera-controls
            auto-rotate
            auto-rotate-delay="0"
            rotation-per-second="14deg"
            orientation={cubeOrientation}
            camera-orbit="35deg 74deg 2.9m"
            min-camera-orbit="auto 35deg auto"
            max-camera-orbit="auto 105deg auto"
            interaction-prompt="none"
            disable-zoom
            shadow-intensity="1"
            exposure="1.2"
            environment-image="neutral"
          ></model-viewer>
        </div>
      </section>

      {/* Desktop narrative tip card */}
      <section className="desktop-narrative-tip" data-severity={tipSeverity}>
        <div className="tip-icon">{tip.emoji}</div>
        <div className="tip-content">
          <span className="tip-primary">{tip.text}</span>
          {lastUpdate && <span className="tip-secondary">{t.updated} {lastUpdate}</span>}
        </div>
      </section>

      {/* Measuring status bar */}
      <section className="measuring-bar">
        <div className="measuring-status">
          <div className={`measuring-cube ${isMeasuring ? "on" : "off"}`} aria-hidden="true">
            <div className="status-cube-scene">
              <div className="status-cube-solid">
                <span className="status-cube-face front" />
                <span className="status-cube-face back" />
                <span className="status-cube-face right" />
                <span className="status-cube-face left" />
                <span className="status-cube-face top" />
                <span className="status-cube-face bottom" />
              </div>
            </div>
          </div>
          <div className="measuring-copy">
            <span className="measuring-text">
              {isMeasuring ? t.measuring_active : t.measuring_inactive}
            </span>
            <span className="measuring-timestamp">Live: {liveClock}</span>
          </div>
        </div>
        <button
          className={`measuring-btn ${isMeasuring ? "stop" : "start"}`}
          onClick={() => setShowConfirmModal(isMeasuring ? "stop" : "start")}
        >
          {isMeasuring ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="5" width="4" height="14" rx="1.2" />
                <rect x="14" y="5" width="4" height="14" rx="1.2" />
              </svg>
              {t.measuring_stop}
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="6,4 20,12 6,20" />
              </svg>
              {t.measuring_start}
            </>
          )}
        </button>
      </section>

      {/* Device selection â€” expandable with sensor checkboxes */}
      <div className="device-checkboxes-wrapper">
        <button
          className="devices-collapse-btn"
          onClick={() => setDevicesExpanded(e => !e)}
          aria-label={devicesExpanded ? "Collapse" : "Expand"}
        >
          <span style={{ display: "inline-flex", transform: devicesExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s" }}>
            <ChevronDown size={14} />
          </span>
        </button>
      <section className={`device-checkboxes ${!devicesExpanded ? "collapsed" : ""}`}>
        {(devicesExpanded ? devices : devices.slice(0, 2)).map((d) => {
          const isChecked = selectedDevices.has(d.device_id);
          const isExpanded = expandedDevice === d.device_id;
          return (
            <div key={d.device_id} className="device-expand-row">
              <div className="device-checkbox-item">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {
                    setSelectedDevices((prev) => {
                      const next = new Set(prev);
                      if (next.has(d.device_id)) next.delete(d.device_id);
                      else next.add(d.device_id);
                      return next;
                    });
                    if (!isChecked) setSelectedDevice(d.device_id);
                  }}
                />
                <span className="device-checkbox-name">{d.name}</span>
                <span
                  className="device-measuring-dot"
                  style={{
                    background:
                      d.status === "error"
                        ? "var(--poor)"
                        : d.status === "offline"
                          ? "var(--text-muted)"
                          : isChecked && isMeasuring
                            ? "var(--good)"
                            : "var(--text-muted)",
                  }}
                />
                <button
                  className="device-expand-btn"
                  onClick={() => {
                    setExpandedDevice(isExpanded ? null : d.device_id);
                    setSelectedDevice(d.device_id);
                  }}
                >
                  <ChevronDown size={14} className={`device-chevron ${isExpanded ? "open" : ""}`} />
                </button>
              </div>
              {isExpanded && (
                <div className="device-sensor-expand">
                  {[
                    { key: "co2_ppm", hw: "MH-Z19B (CO2)" },
                    { key: "temperature_c", hw: "BME280 (Temp)" },
                    { key: "humidity_pct", hw: "BME280 (Humidity)" },
                    { key: "pressure_hpa", hw: "BME280 (Pressure)" },
                    { key: "light_lux", hw: "BH1750 (Light)" },
                    { key: "noise_adc", hw: "MAX9814 (Noise)" },
                  ].map((sensor) => (
                    <label key={sensor.key} className="device-sensor-row">
                      <input type="checkbox" defaultChecked />
                      <span className="device-sensor-hw">{sensor.hw}</span>
                      <span
                        className="sensor-measuring-dot"
                        style={{ background: d.status === "online" && isChecked && isMeasuring ? "var(--good)" : "var(--text-muted)" }}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
        </div>
      )}

      {/* Air quality gauge */}
      <section className="air-quality-section">
        <AirQualityGauge score={airQualityScore !== null ? Math.round(animatedScore) : null} qualityLabel={qualityLabel} />
        <div className="air-quality-info">
          <h2>{t.air_quality}</h2>
          <p className="text-secondary">
            {t.air_quality_based_on}
          </p>
          <p className="last-update">
            <Clock size={14} />
            <span>{t.updated} {liveClock}</span>
          </p>
        </div>
      </section>

      {/* Sensor cards grid */}
      <section className="sensor-grid">
        {metrics.map((metric) => {
          const value = getSensorValue(metric.key);
          const quality = value !== null ? getQuality(metric.key, value) : "moderate";
          const IconComponent = iconMap[metric.icon] ?? Wind;
          const sparkData = getSparklineData(metric.key);
          const borderColor = sensorColors[metric.key] ?? "#9C9590";
          const translatedLabel = t[sensorLabelKeys[metric.key]] ?? metric.label;

          return (
            <article
              key={metric.key}
              className={`sensor-card ${metric.key === "co2_ppm" ? "sensor-card--featured" : ""}`}
              style={{ borderLeft: `4px solid ${borderColor}` }}
              onClick={() => setSelectedSensor(selectedSensor === metric.key ? null : metric.key)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedSensor(selectedSensor === metric.key ? null : metric.key); } }}
              role="button"
              tabIndex={0}
              aria-expanded={selectedSensor === metric.key}
            >
              <div className="sensor-card-header">
                <div className="sensor-icon" style={{ color: borderColor }}>
                  <IconComponent size={20} />
                </div>
                <span className="quality-badge" data-quality={quality}>
                  <span className="quality-dot" />
                  {getQualityLabel(quality)}
                </span>
              </div>

              <div className="sensor-card-body">
                <span className="sensor-label">{translatedLabel}</span>
                <div className="sensor-value">
                  <span className="value-number">
                    {value !== null ? value.toFixed(metric.decimals) : "--"}
                  </span>
                  <span className="value-unit">{metric.unit}</span>
                </div>
                {(() => {
                  const trend = getTrend(metric.key, value, recentReadings);
                  if (trend.direction === "stable") return null;
                  return (
                    <span className={`sensor-trend trend-${trend.direction}`}>
                      {trend.direction === "up" ? "\u2191" : "\u2193"} {trend.delta}
                      <span className="trend-label">
                        {trend.direction === "up" ? t.trend_rising : t.trend_falling}
                      </span>
                    </span>
                  );
                })()}
              </div>

              <Sparkline data={sparkData} dataKey="value" color={metric.color} />

              {metric.key === "co2_ppm" && recentReadings.length > 1 && (
                <div className="sensor-featured-detail">
                  <span className="featured-context">
                    {recentReadings[0]?.co2_ppm} â†’ {currentReading?.co2_ppm} ppm
                  </span>
                </div>
              )}

              {selectedSensor === metric.key && (
                <div className="sensor-popover" onClick={(e) => e.stopPropagation()}>
                  <div className="popover-header">
                    <span className="popover-title">{translatedLabel}</span>
                    <button className="popover-close" onClick={() => setSelectedSensor(null)}>&times;</button>
                  </div>
                  <div className="popover-value">{value !== null ? value.toFixed(metric.decimals) : "--"} <small>{metric.unit}</small></div>
                  <div className="popover-stats">
                    {(() => {
                      const values = recentReadings.map(r => metric.key === "noise_adc" ? r.sound_level_adc : (r[metric.key as keyof EnvironmentalReading] as number)).filter(v => v !== undefined);
                      if (values.length === 0) return null;
                      const min = Math.min(...values);
                      const max = Math.max(...values);
                      const avg = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
                      return (
                        <>
                          <div className="popover-stat"><span>Min</span><strong>{min}</strong></div>
                          <div className="popover-stat"><span>Max</span><strong>{max}</strong></div>
                          <div className="popover-stat"><span>Avg</span><strong>{avg}</strong></div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>

      {/* Heart Rate section */}
      <section className="hr-section">
        <div className="hr-header">
          <h3 className="hr-title">
            <Heart size={18} />
            <span>{t.sensor_heart_rate}</span>
          </h3>
          {hr.isSupported && (
            <button
              className={`btn btn-sm ${hr.connected ? "btn-danger" : "btn-primary"}`}
              onClick={hr.connected ? hr.disconnect : hr.connect}
              disabled={hr.connecting}
            >
              <Bluetooth size={14} />
              {hr.connecting ? t.hr_connecting : hr.connected ? t.hr_disconnect : t.hr_connect}
            </button>
          )}
          {!hr.isSupported && (
            <span className="text-muted" style={{ fontSize: "0.75rem" }}>{t.hr_not_supported}</span>
          )}
        </div>

        {hr.connected && hr.bpm !== null ? (
          <div className="hr-cards">
            <article className="sensor-card" style={{ borderLeft: "4px solid #E11D48" }}>
              <div className="sensor-card-header">
                <div className="sensor-icon" style={{ color: "#E11D48" }}>
                  <Heart size={20} />
                </div>
                <span className="quality-badge" data-quality={hr.bpm < 100 ? "good" : hr.bpm < 150 ? "moderate" : "poor"}>
                  <span className="quality-dot" />
                  {hr.bpm < 100 ? t.quality_good : hr.bpm < 150 ? t.quality_moderate : t.quality_poor}
                </span>
              </div>
              <div className="sensor-card-body">
                <span className="sensor-label">{t.sensor_heart_rate}</span>
                <div className="sensor-value">
                  <span className="value-number">{hr.bpm}</span>
                  <span className="value-unit">BPM</span>
                </div>
              </div>
            </article>

            <article className="sensor-card" style={{ borderLeft: "4px solid #EC4899" }}>
              <div className="sensor-card-header">
                <div className="sensor-icon" style={{ color: "#EC4899" }}>
                  <Activity size={20} />
                </div>
                <span className="quality-badge" data-quality={hr.rmssd !== null && hr.rmssd > 40 ? "good" : hr.rmssd !== null && hr.rmssd > 20 ? "moderate" : "poor"}>
                  <span className="quality-dot" />
                  {hr.rmssd !== null && hr.rmssd > 40 ? t.quality_good : hr.rmssd !== null && hr.rmssd > 20 ? t.quality_moderate : t.quality_poor}
                </span>
              </div>
              <div className="sensor-card-body">
                <span className="sensor-label">{t.sensor_hrv} (RMSSD)</span>
                <div className="sensor-value">
                  <span className="value-number">{hr.rmssd ?? "--"}</span>
                  <span className="value-unit">ms</span>
                </div>
              </div>
            </article>
          </div>
        ) : hr.connected ? (
          <p className="text-muted" style={{ fontSize: "0.8125rem" }}>{t.hr_connecting}</p>
        ) : null}

        {hr.error && (
          <p className="text-muted" style={{ fontSize: "0.75rem", color: "var(--poor)", marginTop: "0.5rem" }}>{hr.error}</p>
        )}

        {hr.deviceName && hr.connected && (
          <p className="text-muted" style={{ fontSize: "0.6875rem", marginTop: "0.25rem" }}>
            Polar: {hr.deviceName}
          </p>
        )}
      </section>

      {/* Monitoring stats panel (mobile) */}
      <section className="monitoring-stats-panel">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <div className="monitoring-stats-text">
          <span>Uptime: {uptime || "--"}</span>
          <span>Interval: 30s</span>
          <span>Reliability: {fetchTotal > 0 ? Math.round((fetchSuccess / fetchTotal) * 100) : 100}%</span>
        </div>
      </section>

      {/* ===== FIGMA DESKTOP LAYOUT (Style 16) ===== */}
      {activeStyle.id === 16 && (
        <div className="figma-desktop" style={{ "--figma-accent": accentColor } as React.CSSProperties}>
          {/* Mode Carousel â€” 7 colorful cards */}
          <section className="figma-carousel">
            <button
              className="figma-arrow figma-arrow-left"
              onClick={() => {
                const modes = figmaModes.map(m => m.id);
                const idx = modes.indexOf(mode);
                const prev = (idx - 1 + modes.length) % modes.length;
                setEnvironment(modes[prev]);
              }}
              aria-label="Previous"
            >
              â€ą
            </button>

            <div className="figma-carousel-track">
              {figmaModes.map((m, i) => {
                const activeIdx = figmaModes.findIndex(fm => fm.id === mode);
                const len = figmaModes.length;
                let diff = i - activeIdx;
                if (diff > len / 2) diff -= len;
                if (diff < -len / 2) diff += len;
                const absDiff = Math.abs(diff);
                const isActive = diff === 0;
                const translateX = getFigmaCardOffset(diff);
                const scale = getFigmaCardScale(absDiff);

                return (
                  <button
                    key={m.id}
                    className={`figma-mode-card ${isActive ? "active" : ""}`}
                    data-env={m.id}
                    onClick={() => setEnvironment(m.id)}
                    style={{
                      transform: `translateX(${translateX}px) scale(${scale})`,
                      opacity: 1,
                      zIndex: 10 - absDiff,
                      filter: isActive ? "none" : `brightness(${1 - absDiff * 0.05}) saturate(${1 - absDiff * 0.08})`,
                    }}
                  >
                    <img src={m.bgImage} alt="" className="figma-mode-bg" />
                    <div className="figma-mode-overlay" style={{ background: m.gradient }} />
                    <m.icon size={isActive ? 44 : 36} className="figma-mode-icon" />
                    <span className="figma-mode-label">{m.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              className="figma-arrow figma-arrow-right"
              onClick={() => {
                const modes = figmaModes.map(m => m.id);
                const idx = modes.indexOf(mode);
                const next = (idx + 1) % modes.length;
                setEnvironment(modes[next]);
              }}
              aria-label="Next"
            >
              â€ş
            </button>
          </section>

          {/* Mode indicator dots */}
          <div className="figma-dots">
            {figmaModes.map((m) => (
              <span
                key={m.id}
                className={`figma-dot ${mode === m.id ? "active" : ""}`}
                onClick={() => setEnvironment(m.id)}
              />
            ))}
          </div>

          {/* Tab Navigation */}
          <nav className="figma-tabs">
            <button className={`figma-tab ${figmaTab === "measure" ? "active" : ""}`} onClick={() => setFigmaTab("measure")}>{t.nav_dashboard}</button>
            <button className={`figma-tab ${figmaTab === "history" ? "active" : ""}`} onClick={() => setFigmaTab("history")}>{t.nav_history}</button>
            <button className={`figma-tab ${figmaTab === "devices" ? "active" : ""}`} onClick={() => setFigmaTab("devices")}>{t.nav_devices}</button>
            <button className={`figma-tab ${figmaTab === "settings" ? "active" : ""}`} onClick={() => setFigmaTab("settings")}>{t.nav_settings}</button>
          </nav>

          {/* Tab Content */}
          <section className="figma-content">
            {figmaTab === "measure" && (
              <>
                {/* Measuring status */}
                <div className="figma-measure-bar">
                  <div className="figma-measure-status">
                    <div className={`figma-measure-cube ${isMeasuring ? "on" : "off"}`} aria-hidden="true">
                      <div className="status-cube-scene">
                        <div className="status-cube-solid">
                          <span className="status-cube-face front" />
                          <span className="status-cube-face back" />
                          <span className="status-cube-face right" />
                          <span className="status-cube-face left" />
                          <span className="status-cube-face top" />
                          <span className="status-cube-face bottom" />
                        </div>
                      </div>
                    </div>
                    <div className="figma-measure-copy">
                      <h2>{isMeasuring ? t.measuring_active : t.measuring_inactive}</h2>
                      <span className="figma-measure-timestamp">Live: {liveClock}</span>
                    </div>
                  </div>
                  <div className="figma-measure-stats">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    <div className="figma-measure-stats-text">
                      <span>Uptime: {uptime || "--"}</span>
                      <span>Interval: 30s</span>
                      <span>Reliability: {fetchTotal > 0 ? Math.round((fetchSuccess / fetchTotal) * 100) : 100}%</span>
                    </div>
                  </div>
                  <button
                    className={`figma-measure-btn ${isMeasuring ? "stop" : "start"}`}
                    onClick={() => setShowConfirmModal(isMeasuring ? "stop" : "start")}
                  >
                    {isMeasuring ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <rect x="6" y="5" width="4" height="14" rx="1.2" />
                          <rect x="14" y="5" width="4" height="14" rx="1.2" />
                        </svg>
                        {t.measuring_stop}
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <polygon points="7,5 19,12 7,19" />
                        </svg>
                        {t.measuring_start}
                      </>
                    )}
                  </button>
                </div>

                {/* Device list */}
                <div className="figma-devices-wrapper">
                  <button
                    className="figma-devices-collapse"
                    onClick={() => setDevicesExpanded(e => !e)}
                    aria-label={devicesExpanded ? "Collapse" : "Expand"}
                  >
                    <span style={{ display: "inline-flex", transform: devicesExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s" }}>
                      <ChevronDown size={14} />
                    </span>
                  </button>
                <div className={`figma-devices ${!devicesExpanded ? "collapsed" : ""}`}>
                  {(devicesExpanded ? devices : devices.slice(0, 2)).map((d) => {
                    const isSelectable = d.status === "online";
                    return (
                    <div key={d.device_id} className="figma-device-group">
                      <div className="figma-device-row">
                        <input
                          type="checkbox"
                          checked={selectedDevices.has(d.device_id)}
                          disabled={!isSelectable}
                          style={isSelectable ? {} : { cursor: "not-allowed" }}
                          onChange={() => {
                            if (!isSelectable) return;
                            setSelectedDevices((prev) => {
                              const next = new Set(prev);
                              if (next.has(d.device_id)) next.delete(d.device_id);
                              else next.add(d.device_id);
                              return next;
                            });
                          }}
                        />
                        <Cpu size={16} className="figma-device-icon-chip" />
                        <span className="figma-device-label">Device:</span>
                        <span className="figma-device-name">{d.name}</span>
                        <span className={`figma-device-status ${d.status === "online" ? "online" : d.status === "error" ? "error" : ""}`}>
                          {d.status === "online" ? t.status_online : d.status === "error" ? "Error" : t.status_offline}
                        </span>
                        <button
                          className="figma-device-expand"
                          onClick={() => setExpandedDevice(expandedDevice === d.device_id ? null : d.device_id)}
                        >
                          <ChevronDown size={16} className={`figma-chevron ${expandedDevice === d.device_id ? "open" : ""}`} />
                        </button>
                      </div>
                      {expandedDevice === d.device_id && (
                        <div className="figma-device-sensors">
                          {[
                            { hw: "MH-Z19B (CO2)", color: "#22C55E" },
                            { hw: "BME280 (Temp)", color: "#3B82F6" },
                            { hw: "BME280 (Humidity)", color: "#06B6D4" },
                            { hw: "BME280 (Pressure)", color: "#8B5CF6" },
                            { hw: "BH1750 (Light)", color: "#F59E0B" },
                            { hw: "MAX9814 (Noise)", color: "#EF4444" },
                          ].map(s => (
                            <div key={s.hw} className="figma-sensor-row">
                              <span className="figma-sensor-dot" style={{ background: s.color }} />
                              <span>{s.hw}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                  })}
                </div>
                </div>

                {/* Air quality gauge */}
                <div className="figma-gauge-section">
                  <AirQualityGauge score={airQualityScore !== null ? Math.round(animatedScore) : null} qualityLabel={qualityLabel} />
                  <div className="figma-gauge-info">
                    <h2>{t.air_quality}</h2>
                    <p>{t.air_quality_based_on}</p>
                  </div>
                </div>

                {/* Sensor cards */}
                <div className="figma-sensor-grid">
                  {metrics.map((metric) => {
                    const value = getSensorValue(metric.key);
                    const quality = value !== null ? getQuality(metric.key, value) : "moderate";
                    const IconComponent = iconMap[metric.icon] ?? Wind;
                    const borderColor = sensorColors[metric.key] ?? "#9C9590";
                    const translatedLabel = t[sensorLabelKeys[metric.key]] ?? metric.label;
                    return (
                      <div key={metric.key} className="figma-sensor-card" style={{ borderTopColor: borderColor }}>
                        <div className="figma-sensor-card-content">
                          <div className="figma-sensor-icon" style={{ color: borderColor }}><IconComponent size={18} /></div>
                          <span className="figma-sensor-label">{translatedLabel}</span>
                          <span className="figma-sensor-value">
                            {value !== null ? value.toFixed(metric.decimals) : "--"} <small>{metric.unit}</small>
                          </span>
                          <span className={`figma-sensor-quality ${quality}`}>{getQualityLabel(quality)}</span>
                        </div>
                        <SensorMiniGauge
                          score={quality === "good" ? 100 : quality === "moderate" ? 60 : 20}
                          qualityLabel={getQualityLabel(quality)}
                          compact
                          scoreColor={theme === "dark" ? "#CBD5E1" : "#1E293B"}
                        />
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {figmaTab === "history" && (
              <div className="figma-preview-grid figma-preview-history">
                <div className="figma-preview-card figma-history-chart-card">
                  <div className="figma-preview-head">
                    <div>
                      <span className="figma-preview-eyebrow">History</span>
                      <h3>Air quality trend</h3>
                    </div>
                    <span className="figma-preview-pill">Last 6 samples</span>
                  </div>
                  <div className="figma-history-chart">
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={historyPreviewData}>
                        <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={34} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.4)",
                            background: "rgba(255,255,255,0.94)",
                            boxShadow: "0 12px 32px rgba(15,23,42,0.08)",
                          }}
                        />
                        <Line type="monotone" dataKey="co2" stroke="#22C55E" strokeWidth={3} dot={{ r: 3, fill: "#22C55E" }} />
                        <Line type="monotone" dataKey="temp" stroke="#8B5CF6" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="figma-preview-card">
                  <div className="figma-preview-head">
                    <div>
                      <span className="figma-preview-eyebrow">Highlights</span>
                      <h3>Quick insights</h3>
                    </div>
                  </div>
                  <div className="figma-history-summary">
                    {historySummary.map((item) => (
                      <div key={item.label} className="figma-summary-row">
                        <span>{item.label}</span>
                        <strong className={`figma-summary-tone ${item.tone}`}>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="figma-history-note">
                    <Clock size={16} />
                    <span>Example view for trend exploration, comparisons, and chart drill-down.</span>
                  </div>
                </div>

                <div className="figma-preview-card">
                  <div className="figma-preview-head">
                    <div>
                      <span className="figma-preview-eyebrow">Timeline</span>
                      <h3>Recent events</h3>
                    </div>
                  </div>
                  <div className="figma-timeline">
                    {[
                      { time: "10:34", title: "CO2 returned to healthy range", detail: "Living Room dropped under 650 ppm after ventilation." },
                      { time: "09:52", title: "Humidity rose after sleep scene", detail: "Bedroom reached 48% and stabilized." },
                      { time: "08:15", title: "Office device reconnected", detail: "Sensor resumed normal 30 s reporting interval." },
                    ].map((event) => (
                      <div key={`${event.time}-${event.title}`} className="figma-timeline-item">
                        <span className="figma-timeline-time">{event.time}</span>
                        <div>
                          <strong>{event.title}</strong>
                          <p>{event.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {figmaTab === "devices" && (
              <div className="figma-preview-grid figma-preview-devices">
                <div className="figma-preview-card figma-device-preview-list">
                  <div className="figma-preview-head">
                    <div>
                      <span className="figma-preview-eyebrow">Devices</span>
                      <h3>Registered units</h3>
                    </div>
                    <span className="figma-preview-pill">{devicePreviewCards.length} shown</span>
                  </div>
                  <div className="figma-device-preview-stack">
                    {devicePreviewCards.map((device) => (
                      <div key={device.device_id} className="figma-device-preview-item">
                        <div className="figma-device-preview-main">
                          <div className="figma-device-preview-icon">
                            <Cpu size={18} />
                          </div>
                          <div>
                            <strong>{device.name}</strong>
                            <p>{device.location}</p>
                          </div>
                        </div>
                        <span className={`figma-device-status ${device.status === "online" ? "online" : device.status === "error" ? "error" : ""}`}>
                          {device.status}
                        </span>
                        <div className="figma-device-preview-meta">
                          <span>{device.sync}</span>
                          <span>{device.battery_v?.toFixed(1) ?? "--"}V</span>
                        </div>
                        <div className="figma-device-preview-tags">
                          {device.sensors.map((sensor) => (
                            <span key={sensor}>{sensor}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="figma-preview-card">
                  <div className="figma-preview-head">
                    <div>
                      <span className="figma-preview-eyebrow">Coverage</span>
                      <h3>Sensor health</h3>
                    </div>
                  </div>
                  <div className="figma-health-meters">
                    {[
                      { label: "Connectivity", value: 92, color: "#38BDF8" },
                      { label: "Battery", value: 78, color: "#22C55E" },
                      { label: "Calibration", value: 64, color: "#F59E0B" },
                    ].map((meter) => (
                      <div key={meter.label} className="figma-meter-row">
                        <div className="figma-meter-label">
                          <span>{meter.label}</span>
                          <strong>{meter.value}%</strong>
                        </div>
                        <div className="figma-meter-track">
                          <span style={{ width: `${meter.value}%`, background: meter.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="figma-preview-card">
                  <div className="figma-preview-head">
                    <div>
                      <span className="figma-preview-eyebrow">Maintenance</span>
                      <h3>Upcoming tasks</h3>
                    </div>
                  </div>
                  <div className="figma-maintenance-list">
                    {[
                      "Replace Office battery within 6 days",
                      "Run calibration check for Living Room CO2 sensor",
                      "Reconnect Bedroom gateway after scheduled move",
                    ].map((task) => (
                      <div key={task} className="figma-maintenance-item">
                        <span className="figma-maintenance-dot" />
                        <span>{task}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {figmaTab === "settings" && (
              <div className="figma-preview-grid figma-preview-settings">
                <div className="figma-preview-card">
                  <div className="figma-preview-head">
                    <div>
                      <span className="figma-preview-eyebrow">Settings</span>
                      <h3>User preferences</h3>
                    </div>
                  </div>
                  <div className="figma-settings-list">
                    {settingsPreview.map((item) => (
                      <div key={item.label} className="figma-settings-item">
                        <div>
                          <strong>{item.label}</strong>
                          <p>{item.hint}</p>
                        </div>
                        <span className="figma-preview-pill">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="figma-preview-card">
                  <div className="figma-preview-head">
                    <div>
                      <span className="figma-preview-eyebrow">Automation</span>
                      <h3>Scenes and routines</h3>
                    </div>
                  </div>
                  <div className="figma-automation-list">
                    {automationPreview.map((item) => (
                      <div key={item.name} className="figma-automation-item">
                        <div>
                          <strong>{item.name}</strong>
                          <p>{item.detail}</p>
                        </div>
                        <span className={`figma-summary-tone ${item.state === "Active" ? "good" : "moderate"}`}>{item.state}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="figma-preview-card">
                  <div className="figma-preview-head">
                    <div>
                      <span className="figma-preview-eyebrow">Profile</span>
                      <h3>Account snapshot</h3>
                    </div>
                  </div>
                  <div className="figma-profile-preview">
                    <div className="figma-profile-avatar">
                      D
                    </div>
                    <div>
                      <strong>Demo User</strong>
                      <p>demo@projectiot.local</p>
                    </div>
                  </div>
                  <div className="figma-profile-grid">
                    <div>
                      <span>Theme</span>
                      <strong>Light</strong>
                    </div>
                    <div>
                      <span>Language</span>
                      <strong>CS</strong>
                    </div>
                    <div>
                      <span>Mode</span>
                      <strong>{mode}</strong>
                    </div>
                    <div>
                      <span>Role</span>
                      <strong>Owner</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

        </div>
      )}

      {/* Confirmation modal */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <p className="modal-text">
              {showConfirmModal === "stop" ? t.confirm_stop : t.confirm_start}
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => setShowConfirmModal(null)}
              >
                {t.confirm_cancel}
              </button>
              <button
                className={`btn ${showConfirmModal === "stop" ? "btn-danger" : "btn-primary"}`}
                onClick={() => {
                  setIsMeasuring(showConfirmModal === "start");
                  setShowConfirmModal(null);
                }}
              >
                {t.confirm_yes}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
