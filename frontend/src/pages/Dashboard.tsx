// Dashboard page: air quality score, sensor cards with sparklines, environment selector.

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import { useEnvironment } from "../contexts/EnvironmentContext";
import { useVisualStyle } from "../contexts/StyleContext";
import { useAnimatedNumber } from "../hooks/useAnimatedNumber";
import { useHeartRate } from "../hooks/useHeartRate";
import { useI18n } from "../contexts/I18nContext";
import { apiGet } from "../api";
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
}: {
  environments: { id: EnvironmentMode; img: string; label: string }[];
  activeId: EnvironmentMode;
  onSelect: (id: EnvironmentMode) => void;
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
        ‹
      </button>
      <div className="env-carousel-track">
        {environments.map((env) => {
          const isActive = env.id === activeId;
          return (
            <button
              key={env.id}
              className={`env-card ${isActive ? "active" : ""}`}
              data-env={env.id}
              onClick={() => onSelect(env.id)}
            >
              <img src={env.img} alt={env.label} className="env-card-img" />
              <span className="env-card-label">{env.label}</span>
            </button>
          );
        })}
      </div>
      <button className="env-carousel-arrow right" onClick={() => navigate(1)} aria-label="Next">
        ›
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
  { key: "co2_ppm", label: "CO2", unit: "ppm", color: "var(--chart-co2)", icon: "wind", decimals: 0, chartDomain: [300, 1500] },
  { key: "temperature_c", label: "Temperature", unit: "°C", color: "var(--chart-temp)", icon: "thermometer", decimals: 1, chartDomain: [15, 35] },
  { key: "humidity_pct", label: "Humidity", unit: "%", color: "var(--chart-humidity)", icon: "droplets", decimals: 1, chartDomain: [20, 80] },
  { key: "pressure_hpa", label: "Pressure", unit: "hPa", color: "var(--chart-pressure)", icon: "gauge", decimals: 0, chartDomain: [960, 1060] },
  { key: "light_lux", label: "Light", unit: "lux", color: "var(--chart-light)", icon: "sun", decimals: 0, chartDomain: [0, 1000] },
  { key: "noise_adc", label: "Noise", unit: "ADC", color: "var(--chart-noise)", icon: "volume", decimals: 0, chartDomain: [0, 1024] },
];

// Map icon names to components
const iconMap: Record<string, typeof Wind> = {
  wind: Wind,
  thermometer: Thermometer,
  droplets: Droplets,
  gauge: Activity,
  sun: Sun,
  volume: Volume2,
  heart: Heart,
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
  const color = score === null ? "var(--text-muted)" : score >= 70 ? "var(--good)" : score >= 40 ? "var(--moderate)" : "var(--poor)";

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
  const { t } = useI18n();
  const hr = useHeartRate();

  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [currentReading, setCurrentReading] = useState<EnvironmentalReading | null>(null);
  const [recentReadings, setRecentReadings] = useState<EnvironmentalReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [isMeasuring, setIsMeasuring] = useState(true);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<"start" | "stop" | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState(30);
  const [figmaTab, setFigmaTab] = useState<"measure" | "history" | "devices" | "settings">("measure");

  // Figma mode carousel definitions (style 16)
  const figmaModes: { id: EnvironmentMode; label: string; icon: typeof Wind; gradient: string; bgImage: string }[] = [
    { id: "sleep", label: t.env_sleep, icon: Moon, gradient: "linear-gradient(135deg, #6366F1, #818CF8)", bgImage: "/images/env_sleep.png" },
    { id: "office", label: t.env_office, icon: Briefcase, gradient: "linear-gradient(135deg, #FDE047, #FACC15)", bgImage: "/images/env_office.png" },
    { id: "school", label: t.env_school, icon: GraduationCap, gradient: "linear-gradient(135deg, #22C55E, #4ADE80)", bgImage: "/images/style1_warm/s1_office.png" },
    { id: "outdoor", label: t.env_outdoor, icon: Tree, gradient: "linear-gradient(135deg, #F59E0B, #FBBF24)", bgImage: "/images/env_outdoor.png" },
    { id: "sport", label: t.env_sport, icon: Activity, gradient: "linear-gradient(135deg, #EF4444, #F87171)", bgImage: "/images/env_sport.png" },
    { id: "factory", label: t.env_factory, icon: Factory, gradient: "linear-gradient(135deg, #6B7280, #9CA3AF)", bgImage: "/images/style7_industrial/s7_office.png" },
    { id: "greenhouse", label: t.env_greenhouse, icon: Sprout, gradient: "linear-gradient(135deg, #10B981, #34D399)", bgImage: "/images/style3_nature/s3_outdoor.png" },
  ];

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
        setDevices(devs);
        if (devs.length > 0 && !selectedDevice) {
          setSelectedDevice(devs[0].device_id);
        }
        // Select all devices for measuring by default
        setSelectedDevices(new Set(devs.map(d => d.device_id)));
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
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
  const environmentDefs = [
    { id: "office" as const, img: `${activeStyle.scenePrefix}office${activeStyle.sceneSuffix}`, label: t.env_office },
    { id: "sleep" as const, img: `${activeStyle.scenePrefix}sleep${activeStyle.sceneSuffix}`, label: t.env_sleep },
    { id: "sport" as const, img: `${activeStyle.scenePrefix}sport${activeStyle.sceneSuffix}`, label: t.env_sport },
    { id: "outdoor" as const, img: `${activeStyle.scenePrefix}outdoor${activeStyle.sceneSuffix}`, label: t.env_outdoor },
  ];
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
      {/* Environment carousel — centered active card, looping (mobile only) */}
      <EnvironmentCarousel
        environments={environmentDefs}
        activeId={mode}
        onSelect={setEnvironment}
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
              {lastUpdate && <span>· {t.updated} {lastUpdate}</span>}
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
            {environmentDefs.map(env => (
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
            {(environmentDefs.find((env) => env.id === mode)?.label ?? mode)} - {cubePrimaryLabel}
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
          <span className="measuring-text">
            {isMeasuring ? t.measuring_active : t.measuring_inactive}
          </span>
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

      {/* Device selection — expandable with sensor checkboxes */}
      <section className="device-checkboxes">
        {devices.map((d) => {
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
                  style={{ background: d.status === "error" ? "var(--poor)" : isChecked && isMeasuring ? "var(--good)" : "var(--text-muted)" }}
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
                        style={{ background: isChecked && isMeasuring ? "var(--good)" : "var(--text-muted)" }}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>

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
          {lastUpdate && (
            <p className="last-update">
              <Clock size={14} />
              <span>{t.updated} {lastUpdate}</span>
            </p>
          )}
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
                    {recentReadings[0]?.co2_ppm} → {currentReading?.co2_ppm} ppm
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

      {/* ===== FIGMA DESKTOP LAYOUT (Style 16) ===== */}
      {activeStyle.id === 16 && (
        <div className="figma-desktop">
          {/* Mode Carousel — 7 colorful cards */}
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
              ‹
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

                return (
                  <button
                    key={m.id}
                    className={`figma-mode-card ${isActive ? "active" : ""}`}
                    data-env={m.id}
                    onClick={() => setEnvironment(m.id)}
                    style={{
                      transform: `translateX(${diff * 42}%) scale(${isActive ? 1.1 : 1 - absDiff * 0.05})`,
                      opacity: absDiff === 0 ? 1 : absDiff === 1 ? 0.85 : absDiff === 2 ? 0.6 : absDiff === 3 ? 0.35 : 0.15,
                      zIndex: 10 - absDiff,
                      filter: isActive ? "none" : `brightness(${1 - absDiff * 0.1})`,
                    }}
                  >
                    <img src={m.bgImage} alt="" className="figma-mode-bg" />
                    <div className="figma-mode-overlay" style={{ background: m.gradient }} />
                    <m.icon size={isActive ? 28 : 18} className="figma-mode-icon" />
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
              ›
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
                      <span className="figma-measure-timestamp">{t.updated} {lastUpdate}</span>
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
                <div className="figma-devices">
                  {devices.map((d) => (
                    <div key={d.device_id} className="figma-device-group">
                      <div className="figma-device-row">
                        <input
                          type="checkbox"
                          checked={selectedDevices.has(d.device_id)}
                          onChange={() => {
                            setSelectedDevices((prev) => {
                              const next = new Set(prev);
                              if (next.has(d.device_id)) next.delete(d.device_id);
                              else next.add(d.device_id);
                              return next;
                            });
                          }}
                        />
                        <span className="figma-device-name">{d.name}</span>
                        <span className={`figma-device-status ${d.status === "online" ? "online" : ""}`}>
                          {d.status === "online" ? t.status_online : t.status_offline}
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
                  ))}
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
                        <div className="figma-sensor-icon" style={{ color: borderColor }}><IconComponent size={18} /></div>
                        <span className="figma-sensor-label">{translatedLabel}</span>
                        <span className="figma-sensor-value">
                          {value !== null ? value.toFixed(metric.decimals) : "--"} <small>{metric.unit}</small>
                        </span>
                        <span className={`figma-sensor-quality ${quality}`}>{getQualityLabel(quality)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {figmaTab === "history" && (
              <div className="figma-placeholder">
                <p>{t.nav_history}</p>
              </div>
            )}

            {figmaTab === "devices" && (
              <div className="figma-placeholder">
                <p>{t.nav_devices}</p>
              </div>
            )}

            {figmaTab === "settings" && (
              <div className="figma-placeholder">
                <p>{t.nav_settings}</p>
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
