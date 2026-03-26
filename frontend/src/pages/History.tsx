// History page: time-series area charts with time range and device selectors

import { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { apiGet } from "../api";
import { useI18n } from "../contexts/I18nContext";
import { useTheme } from "../contexts/ThemeContext";
import { useEnvironment } from "../contexts/EnvironmentContext";
import type { EnvironmentalReading, DeviceInfo, EnvironmentMode } from "../types";
import { ChevronDown, Cpu, Wind, Thermometer, Droplets, Sun, Volume2, Activity, Co2Molecule, Moon, Briefcase } from "../components/Icons";
import { sortDevicesByStatus } from "../utils/deviceSorting";
import { formatLocalDate, formatLocalTime } from "../utils/dateTime";
import { useExpandedDevices } from "../contexts/ExpandedDevicesContext";
import EnvironmentCarousel from "../components/EnvironmentCarousel";
import { usePanelType } from "../components/DualViewShell";
import { METRICS as metrics, SENSOR_LABEL_KEYS as sensorLabelKeys, resolveColor } from "../constants/chartColors";

const sensorIconMap: Record<string, typeof Wind> = {
  co2molecule: Co2Molecule,
  wind: Co2Molecule,
  thermometer: Thermometer,
  droplets: Droplets,
  sun: Sun,
  volume: Volume2,
  gauge: Activity,
};

// Ideal values per environment mode - deviation is measured from these
const idealValues: Record<EnvironmentMode, Record<string, number>> = {
  sleep: { co2_ppm: 400, temperature_c: 18, humidity_pct: 50, pressure_hpa: 1013, light_lux: 0, noise_adc: 1800 },
  office: { co2_ppm: 500, temperature_c: 22, humidity_pct: 50, pressure_hpa: 1013, light_lux: 400, noise_adc: 1900 },
  sport: { co2_ppm: 600, temperature_c: 18, humidity_pct: 45, pressure_hpa: 1013, light_lux: 300, noise_adc: 2000 },
  outdoor: { co2_ppm: 400, temperature_c: 20, humidity_pct: 50, pressure_hpa: 1013, light_lux: 1000, noise_adc: 2000 },
  school: { co2_ppm: 500, temperature_c: 22, humidity_pct: 50, pressure_hpa: 1013, light_lux: 400, noise_adc: 1900 },
  factory: { co2_ppm: 600, temperature_c: 18, humidity_pct: 45, pressure_hpa: 1013, light_lux: 300, noise_adc: 2000 },
  greenhouse: { co2_ppm: 400, temperature_c: 24, humidity_pct: 65, pressure_hpa: 1013, light_lux: 1000, noise_adc: 1800 },
};

// Max deviation ranges - how far from ideal before it hits 100%
const deviationRanges: Record<string, number> = {
  co2_ppm: 1000,
  temperature_c: 10,
  humidity_pct: 30,
  pressure_hpa: 40,
  light_lux: 500,
  noise_adc: 800,
};

// Time range options (preset + custom)
const timeRanges = [
  { label: "1h", hours: 1 },
  { label: "8h", hours: 8 },
  { label: "1d", hours: 24 },
  { label: "7d", hours: 168 },
  { label: "1m", hours: 720 },
  { label: "1y", hours: 8760 },
];

const carouselModeLabels: Record<EnvironmentMode, string> = {
  sleep: "Sleep",
  office: "Office",
  sport: "Gym",
  outdoor: "Outside",
  school: "School",
  factory: "Factory",
  greenhouse: "Greenhouse",
};

// Generate mock data so charts always have something to show
function generateMockData(hours: number): Array<Record<string, unknown>> {
  const points = Math.min(48, Math.max(12, Math.floor(hours)));
  const now = Date.now();
  const step = (hours * 3600 * 1000) / points;
  const data: Array<Record<string, unknown>> = [];

  for (let i = 0; i < points; i++) {
    const t = new Date(now - (points - 1 - i) * step);
    const label = hours > 24
      ? t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })
      : t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const jitter = (base: number, amp: number) => base + (Math.sin(i * 0.5) + Math.random() - 0.5) * amp;

    data.push({
      time: label,
      co2_ppm: Math.round(jitter(500, 120)),
      temperature_c: Math.round(jitter(22, 3) * 10) / 10,
      humidity_pct: Math.round(jitter(50, 10) * 10) / 10,
      pressure_hpa: Math.round(jitter(1013, 8)),
      light_lux: Math.round(Math.max(0, jitter(350, 150))),
      noise_adc: Math.round(Math.max(0, jitter(512, 200))),
    });
  }
  return data;
}

function getDownsampleStep(hours: number): number {
  if (hours <= 1) return 1;
  if (hours <= 6) return 2;
  if (hours <= 24) return 4;
  if (hours <= 168) return 12;
  return 30;
}

function normalizeAxisDomain(min: number, max: number): [number, number] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 100];
  if (min === max) return [min - 1, max + 1];
  return [min, max];
}

function formatAxisValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) return Math.round(value).toString();
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(1).replace(/\.0$/, "");
  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function buildRangeLabel(min: number, max: number, suffix = ""): string {
  const [safeMin, safeMax] = normalizeAxisDomain(min, max);
  const suffixPart = suffix ? ` ${suffix}` : "";
  return `${formatAxisValue(safeMin)} - ${formatAxisValue(safeMax)}${suffixPart}`;
}

function formatMetricNumber(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return "--";
  if (decimals <= 0) return Math.round(value).toString();
  return value
    .toFixed(decimals)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
}

type ChartMode = "individual" | "combined" | "deviation";

export default function History() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const { mode, setEnvironment } = useEnvironment();
  const panelType = usePanelType();
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [selectedRange, setSelectedRange] = useState(24);
  const [customRangeActive, setCustomRangeActive] = useState(false);
  const [intervalStartTime, setIntervalStartTime] = useState(() => formatLocalTime(new Date(Date.now() - 24 * 3600 * 1000)));
  const [intervalStartDate, setIntervalStartDate] = useState(() => formatLocalDate(new Date(Date.now() - 24 * 3600 * 1000)));
  const [intervalEndTime, setIntervalEndTime] = useState(() => formatLocalTime(new Date()));
  const [intervalEndDate, setIntervalEndDate] = useState(() => formatLocalDate(new Date()));
  const { toggle: toggleExpand, isExpanded: isDeviceExpanded } = useExpandedDevices();
  const [selectedSensors, setSelectedSensors] = useState<Set<string>>(new Set(metrics.map(m => m.key)));
  const [chartMode, setChartMode] = useState<ChartMode>("deviation");
  const [readings, setReadings] = useState<EnvironmentalReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);

  // Theme-aware chart colors
  const gridColor = theme === "dark" ? "#3D3A37" : "#F0EBE5";
  const axisColor = theme === "dark" ? "#706860" : "#9C9590";
  const tooltipBg = theme === "dark" ? "#2A2825" : "#FFFFFF";
  const tooltipBorder = theme === "dark" ? "#3D3A37" : "#E5DDD5";
  const tooltipText = theme === "dark" ? "#F0EBE5" : "#2D2A26";

  // Fetch devices
  useEffect(() => {
    apiGet<DeviceInfo[]>("/devices")
      .then((devs) => {
        const sortedDevices = sortDevicesByStatus(devs);
        setDevices(sortedDevices);
        if (sortedDevices.length > 0 && !selectedDevice) {
          setSelectedDevice(sortedDevices[0].device_id);
        }
      })
      .catch((err) => setError(err.message));
  }, []); // Intentional: fetch device list once on mount only

  const customInterval = useMemo(() => {
    if (!customRangeActive) return null;
    if (!intervalStartDate || !intervalStartTime || !intervalEndDate || !intervalEndTime) return null;

    const fromDate = new Date(`${intervalStartDate}T${intervalStartTime}`);
    const toDate = new Date(`${intervalEndDate}T${intervalEndTime}`);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate >= toDate) {
      return null;
    }

    return {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      hours: Math.max(1, (toDate.getTime() - fromDate.getTime()) / 3600000),
    };
  }, [customRangeActive, intervalStartDate, intervalStartTime, intervalEndDate, intervalEndTime]);

  // Show user-visible error when the custom date range is invalid
  useEffect(() => {
    if (!customRangeActive) {
      setRangeError(null);
      return;
    }
    if (!intervalStartDate || !intervalStartTime || !intervalEndDate || !intervalEndTime) {
      setRangeError(null);
      return;
    }
    const fromDate = new Date(`${intervalStartDate}T${intervalStartTime}`);
    const toDate = new Date(`${intervalEndDate}T${intervalEndTime}`);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      setRangeError(t.invalid_date_values);
    } else if (fromDate >= toDate) {
      setRangeError(t.invalid_date_range);
    } else {
      setRangeError(null);
    }
  }, [customRangeActive, intervalStartDate, intervalStartTime, intervalEndDate, intervalEndTime, t]);

  const effectiveRangeHours = customRangeActive && customInterval ? customInterval.hours : selectedRange;

  // Fetch readings when device or range changes
  useEffect(() => {
    if (!selectedDevice) return;
    setLoading(true);
    setError(null);

    const to = customRangeActive && customInterval
      ? customInterval.to
      : new Date().toISOString();
    const from = customRangeActive && customInterval
      ? customInterval.from
      : new Date(Date.now() - selectedRange * 3600 * 1000).toISOString();

    apiGet<EnvironmentalReading[]>("/readings", {
      device_id: selectedDevice,
      from,
      to,
      limit: 2000,
    })
      .then((data) => setReadings(data.reverse()))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedDevice, selectedRange, customRangeActive, customInterval]);

  // Downsample and format chart data
  const chartData = useMemo(() => {
    const step = getDownsampleStep(effectiveRangeHours);
    return readings
      .filter((_, i) => i % step === 0)
      .map((r) => ({
        time: new Date(r.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          ...(effectiveRangeHours > 24 ? { month: "short", day: "numeric" } : {}),
        }),
        co2_ppm: r.co2_ppm,
        temperature_c: r.temperature_c,
        humidity_pct: r.humidity_pct,
        pressure_hpa: r.pressure_hpa,
        light_lux: r.light_lux,
        noise_adc: r.sound_level_adc,
      }));
  }, [readings, effectiveRangeHours]);

  // Deviation chart data - normalize all values to 0-100 scale (0 = ideal)
  const deviationData = useMemo(() => {
    const ideals = idealValues[mode];
    return chartData.map((point) => {
      const result: Record<string, unknown> = { time: point.time };
      for (const m of metrics) {
        const value = point[m.key as keyof typeof point] as number;
        const ideal = ideals[m.key] ?? 0;
        const range = deviationRanges[m.key] ?? 1;
        const deviation = Math.min(100, (Math.abs(value - ideal) / range) * 100);
        result[m.key] = Math.round(deviation);
      }
      return result;
    });
  }, [chartData, mode]);

  // Fallback to mock data when no real data is available
  const displayData = chartData.length > 0 ? chartData : generateMockData(effectiveRangeHours) as typeof chartData;

  // Deviation data based on displayData
  const displayDeviationData = useMemo(() => {
    if (chartData.length > 0) return deviationData;
    const ideals = idealValues[mode];
    return displayData.map((point) => {
      const result: Record<string, unknown> = { time: point.time };
      for (const m of metrics) {
        const value = point[m.key as keyof typeof point] as number;
        const ideal = ideals[m.key] ?? 0;
        const range = deviationRanges[m.key] ?? 1;
        const deviation = Math.min(100, (Math.abs(value - ideal) / range) * 100);
        result[m.key] = Math.round(deviation);
      }
      return result;
    });
  }, [displayData, chartData, deviationData, mode]);

  const selectedMetricConfigs = useMemo(
    () => metrics.filter((metric) => selectedSensors.has(metric.key)),
    [selectedSensors]
  );

  const metricConfigByKey = useMemo(
    () =>
      Object.fromEntries(
        metrics.map((metric) => [metric.key, metric] as const)
      ) as Record<string, (typeof metrics)[number]>,
    []
  );

  function formatCombinedTooltipValue(metricKey: string, value: number): string {
    const metric = metricConfigByKey[metricKey];
    const decimals = metric?.decimals ?? (Number.isInteger(value) ? 0 : 1);
    const formattedValue = formatMetricNumber(value, decimals);
    return metric?.unit ? `${formattedValue} ${metric.unit}` : formattedValue;
  }

  const combinedMobileDomain = useMemo<[number, number]>(() => {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (const point of displayData) {
      for (const metric of selectedMetricConfigs) {
        const value = point[metric.key as keyof typeof point];
        if (typeof value !== "number" || Number.isNaN(value)) continue;
        if (value < min) min = value;
        if (value > max) max = value;
      }
    }

    if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 100];
    const [safeMin, safeMax] = normalizeAxisDomain(min, max);
    return [Math.floor(safeMin), Math.ceil(safeMax)];
  }, [displayData, selectedMetricConfigs]);

  const xInterval = Math.max(1, Math.floor(displayData.length / 8));

  const tooltipStyle = {
    background: tooltipBg,
    border: `1px solid ${tooltipBorder}`,
    borderRadius: "8px",
    fontSize: 13,
    color: tooltipText,
  };

  // Environment carousel definitions for mobile
  const isMobile = panelType === "mobile" || panelType === "single";
  const individualChartHeight = isMobile ? 132 : 220;
  const aggregateChartHeight = isMobile ? 240 : 400;
  const mobileDeviationRangeLabel = "0 - 100 %";
  const chartMargin = isMobile
    ? { top: 4, right: 10, left: 10, bottom: 0 }
    : { top: 4, right: 0, left: 0, bottom: 0 };
  const xAxisPadding = isMobile ? { left: 12, right: 12 } : { left: 0, right: 0 };
  const xAxisTickFontSize = isMobile ? 10 : 11;
  const carouselEnvs = [
    { id: "sleep" as const, img: "/images/silent/silent_06_bedroom.png", label: carouselModeLabels.sleep, icon: Moon },
    { id: "office" as const, img: "/images/silent/silent_07_office.png", label: carouselModeLabels.office, icon: Briefcase },
    { id: "sport" as const, img: "/images/silent/silent_02_gym.png", label: carouselModeLabels.sport, icon: Activity },
    { id: "outdoor" as const, img: "/images/silent/silent_03_nature.png", label: carouselModeLabels.outdoor, icon: Wind },
    { id: "school" as const, img: "/images/silent/silent_01_classroom.png", label: carouselModeLabels.school, icon: Briefcase },
    { id: "factory" as const, img: "/images/silent/silent_08_factory.png", label: carouselModeLabels.factory, icon: Activity },
    { id: "greenhouse" as const, img: "/images/silent/silent_04_greenhouse.png", label: carouselModeLabels.greenhouse, icon: Sun },
  ];

  return (
    <div className="history-page">
      {/* Environment carousel — mobile only */}
      {isMobile && (
        <EnvironmentCarousel
          environments={carouselEnvs}
          activeId={mode}
          onSelect={setEnvironment}
          overlayStyle
        />
      )}

      {/* Controls bar */}
      <div className="history-controls">
        {/* Mobile heading */}
        <h3 className="history-section-label history-mobile-heading">{t.time_window}</h3>
        {/* Desktop headings row */}
        <div className="history-headings-row">
          <h3 className="history-section-label">{t.time_window}</h3>
          <h3 className="history-section-label history-custom-label">{t.custom_time_window}</h3>
        </div>
        <div className="history-range-row">
          <div className="time-range-selector">
            {timeRanges.map((tr) => (
              <button
                key={tr.hours}
                className={`time-pill ${selectedRange === tr.hours && !customRangeActive ? "active" : ""}`}
                onClick={() => {
                  const toDate = new Date();
                  const fromDate = new Date(toDate.getTime() - tr.hours * 3600 * 1000);
                  setSelectedRange(tr.hours);
                  setCustomRangeActive(false);
                  setIntervalStartTime(formatLocalTime(fromDate));
                  setIntervalStartDate(formatLocalDate(fromDate));
                  setIntervalEndTime(formatLocalTime(toDate));
                  setIntervalEndDate(formatLocalDate(toDate));
                }}
              >
                {tr.label}
              </button>
            ))}
          </div>
          {/* Desktop: inline row */}
          <div className="history-interval-fields history-interval-desktop">
            <button
              className={`time-pill ${customRangeActive ? "active" : ""}`}
              onClick={() => setCustomRangeActive(prev => !prev)}
              title="Custom range"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </button>
            <input
              type="time"
              className="form-input history-time-input"
              value={intervalStartTime}
              onChange={(e) => {
                setIntervalStartTime(e.target.value);
                setCustomRangeActive(true);
              }}
            />
            <input
              type="date"
              className="form-input history-date-input"
              value={intervalStartDate}
              onChange={(e) => {
                setIntervalStartDate(e.target.value);
                setCustomRangeActive(true);
              }}
            />
            <span className="history-interval-separator">&mdash;</span>
            <input
              type="time"
              className="form-input history-time-input"
              value={intervalEndTime}
              onChange={(e) => {
                setIntervalEndTime(e.target.value);
                setCustomRangeActive(true);
              }}
            />
            <input
              type="date"
              className="form-input history-date-input"
              value={intervalEndDate}
              onChange={(e) => {
                setIntervalEndDate(e.target.value);
                setCustomRangeActive(true);
              }}
            />
          </div>
        </div>
        {/* Range error — desktop (shown between desktop & mobile sections) */}
        {rangeError && customRangeActive && (
          <p className="history-range-error" role="alert" style={{ color: "var(--color-danger, #EF4444)", fontSize: "0.8125rem", margin: "0.25rem 0 0" }}>
            {rangeError}
          </p>
        )}
        {/* Mobile: From/To layout */}
        <div className="history-interval-mobile">
          <button
            className={`time-pill ${customRangeActive ? "active" : ""}`}
            onClick={() => setCustomRangeActive(prev => !prev)}
            title="Custom range"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
          <div className="history-fromto-fields">
            <div className="history-fromto-row">
              <span className="history-fromto-label">{t.time_from}</span>
              <input type="time" className="form-input history-time-input" value={intervalStartTime} onChange={(e) => { setIntervalStartTime(e.target.value); setCustomRangeActive(true); }} />
              <input type="date" className="form-input history-date-input" value={intervalStartDate} onChange={(e) => { setIntervalStartDate(e.target.value); setCustomRangeActive(true); }} />
            </div>
            <div className="history-fromto-row">
              <span className="history-fromto-label">{t.time_to}</span>
              <input type="time" className="form-input history-time-input" value={intervalEndTime} onChange={(e) => { setIntervalEndTime(e.target.value); setCustomRangeActive(true); }} />
              <input type="date" className="form-input history-date-input" value={intervalEndDate} onChange={(e) => { setIntervalEndDate(e.target.value); setCustomRangeActive(true); }} />
            </div>
          </div>
        </div>
      </div>

      {/* Device & sensor selector */}
      <div className="history-devices card devices-list figma-devices">
        {devices.map((d) => (
          <div key={d.device_id} className="figma-device-group">
            <div className="figma-device-row">
              <Cpu size={16} className="figma-device-icon-chip" />
              <span className="figma-device-label">Device:</span>
              <span className="figma-device-name">{d.name}</span>
              <input
                type="checkbox"
                checked={selectedDevice === d.device_id}
                onChange={() => setSelectedDevice(selectedDevice === d.device_id ? "" : d.device_id)}
                aria-label={`Select device ${d.name}`}
              />
              <button
                className="figma-device-expand"
                onClick={() => toggleExpand(d.device_id)}
              >
                <ChevronDown size={16} className={`figma-chevron ${isDeviceExpanded(d.device_id) ? "open" : ""}`} />
              </button>
            </div>
            {isDeviceExpanded(d.device_id) && (
              <div className={`history-sensor-list ${selectedDevice !== d.device_id ? "sensors-inactive" : ""}`}>
                {metrics.map((m) => {
                  const tKey = sensorLabelKeys[m.key];
                  const label = tKey ? (t[tKey] as string) : m.label;
                  return (
                    <label key={m.key} className="history-sensor-item">
                      <input
                        id={`sensor-${d.device_id}-${m.key}`}
                        type="checkbox"
                        className={selectedDevice !== d.device_id && selectedSensors.has(m.key) ? "checkbox-gray" : ""}
                        checked={selectedSensors.has(m.key)}
                        onChange={() => {
                          setSelectedSensors((prev) => {
                            const next = new Set(prev);
                            if (next.has(m.key)) next.delete(m.key);
                            else next.add(m.key);
                            return next;
                          });
                        }}
                      />
                      {(() => { const Icon = sensorIconMap[m.icon] ?? Wind; return <span style={{ color: selectedDevice !== d.device_id ? "#9CA3AF" : resolveColor(m.color), display: "inline-flex", flexShrink: 0 }}><Icon size={14} /></span>; })()}
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Visualization mode selector */}
      <div className="history-options">
        <span className="history-section-label">{t.graph_style}:</span>
        <div className="chart-mode-toggle">
          <button
            className={`btn btn-sm btn-bordered ${chartMode === "individual" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setChartMode("individual")}
          >
            {t.individual}
          </button>
          <button
            className={`btn btn-sm btn-bordered ${chartMode === "combined" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setChartMode("combined")}
          >
            {t.combined}
          </button>
          <button
            className={`btn btn-sm btn-bordered ${chartMode === "deviation" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setChartMode("deviation")}
          >
            {t.deviation}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="charts-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card">
              <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 16 }} />
              <div className="skeleton skeleton-chart" />
            </div>
          ))}
        </div>
      ) : chartMode === "individual" ? (
        // Individual area charts - vivid solid fills, filtered by selectedSensors
        <div className="charts-grid">
          {selectedMetricConfigs.map((metric) => {
            const color = resolveColor(metric.color);
            const translatedLabel = t[sensorLabelKeys[metric.key]] ?? metric.label;
            const metricDomain = (() => {
              if (metric.chartDomain) return metric.chartDomain;

              let min = Number.POSITIVE_INFINITY;
              let max = Number.NEGATIVE_INFINITY;
              for (const point of displayData) {
                const value = point[metric.key as keyof typeof point];
                if (typeof value !== "number" || Number.isNaN(value)) continue;
                if (value < min) min = value;
                if (value > max) max = value;
              }
              return normalizeAxisDomain(min, max);
            })();
            const individualMobileRangeLabel = buildRangeLabel(metricDomain[0], metricDomain[1]);

            return (
              <div key={metric.key} className="card chart-card">
                <h3 className="chart-title">
                  {translatedLabel} ({metric.unit})
                </h3>
                {isMobile && (
                  <div className="history-mobile-y-axis-labels history-mobile-y-axis-labels--range" aria-hidden="true">
                    <span>{individualMobileRangeLabel}</span>
                  </div>
                )}
                <ResponsiveContainer width="100%" height={individualChartHeight}>
                  <AreaChart data={displayData} margin={chartMargin}>
                    <defs>
                      <linearGradient id={`gradient-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.7} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.15} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: xAxisTickFontSize, fill: axisColor }}
                      interval={xInterval}
                      stroke={gridColor}
                      padding={xAxisPadding}
                      tickMargin={isMobile ? 8 : 6}
                      minTickGap={isMobile ? 16 : 10}
                    />
                    <YAxis
                      tick={isMobile ? false : { fontSize: 11, fill: axisColor }}
                      domain={metricDomain}
                      stroke={gridColor}
                      width={isMobile ? 0 : 50}
                      axisLine={!isMobile}
                      tickLine={!isMobile}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey={metric.key}
                      stroke={color}
                      strokeWidth={2}
                      fill={`url(#gradient-${metric.key})`}
                      fillOpacity={1}
                      dot={false}
                      name={translatedLabel}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      ) : chartMode === "combined" ? (
        // Combined area chart - vivid stacked, filtered by selectedSensors
        <div className="card chart-card combined-chart">
          <h3 className="chart-title">{t.all_sensors}</h3>
          <ResponsiveContainer width="100%" height={aggregateChartHeight}>
            <AreaChart data={displayData} margin={chartMargin}>
              <defs>
                {selectedMetricConfigs.map((metric) => {
                  const color = resolveColor(metric.color);
                  return (
                    <linearGradient key={metric.key} id={`gradient-combined-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.6} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.1} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: xAxisTickFontSize, fill: axisColor }}
                interval={xInterval}
                stroke={gridColor}
                padding={xAxisPadding}
                tickMargin={isMobile ? 8 : 6}
                minTickGap={isMobile ? 16 : 10}
              />
              {isMobile ? (
                <YAxis
                  tick={false}
                  stroke={gridColor}
                  width={0}
                  axisLine={false}
                  tickLine={false}
                  domain={combinedMobileDomain}
                />
              ) : (
                <>
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: axisColor }} stroke={gridColor} width={50} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: axisColor }} stroke={gridColor} width={50} />
                </>
              )}
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name, item) => {
                  if (typeof value !== "number" || Number.isNaN(value)) {
                    return [String(value ?? "--"), name];
                  }
                  const metricKey = String(item?.dataKey ?? "");
                  return [formatCombinedTooltipValue(metricKey, value), name];
                }}
              />
              <Legend />
              {selectedMetricConfigs.map((metric, i) => {
                const color = resolveColor(metric.color);
                const translatedLabel = t[sensorLabelKeys[metric.key]] ?? metric.label;
                return (
                  <Area
                    key={metric.key}
                    type="monotone"
                    dataKey={metric.key}
                    stroke={color}
                    strokeWidth={1.5}
                    fill={`url(#gradient-combined-${metric.key})`}
                    fillOpacity={0.8}
                    dot={false}
                    name={translatedLabel}
                    yAxisId={isMobile ? undefined : (i < 3 ? "left" : "right")}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        // Deviation / Warning chart - stacked area, 0 = ideal, higher = worse
        <div className="card chart-card combined-chart">
          <h3 className="chart-title">{t.deviation}</h3>
          <p className="text-secondary" style={{ fontSize: "0.8125rem", marginBottom: "0.75rem" }}>
            {t.deviation_desc}
          </p>
          {isMobile && (
            <div className="history-mobile-y-axis-labels history-mobile-y-axis-labels--range" aria-hidden="true">
              <span>{mobileDeviationRangeLabel}</span>
            </div>
          )}
          <ResponsiveContainer width="100%" height={aggregateChartHeight}>
            <AreaChart data={displayDeviationData} margin={chartMargin}>
              <defs>
                {/* Stacked gradient from green (bottom, good) to red (top, bad) */}
                <linearGradient id="deviation-bg" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity={0.15} />
                  <stop offset="50%" stopColor="#F59E0B" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0.15} />
                </linearGradient>
                {selectedMetricConfigs.map((metric) => {
                  const color = resolveColor(metric.color);
                  return (
                    <linearGradient key={metric.key} id={`deviation-${metric.key}`} x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.4} />
                    </linearGradient>
                  );
                })}
              </defs>
              {/* Background gradient zone */}
              <rect x="0" y="0" width="100%" height="100%" fill="url(#deviation-bg)" />
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: xAxisTickFontSize, fill: axisColor }}
                interval={xInterval}
                stroke={gridColor}
                padding={xAxisPadding}
                tickMargin={isMobile ? 8 : 6}
                minTickGap={isMobile ? 16 : 10}
              />
              <YAxis
                tick={isMobile ? false : { fontSize: 11, fill: axisColor }}
                stroke={gridColor}
                width={isMobile ? 0 : 50}
                axisLine={!isMobile}
                tickLine={!isMobile}
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => [`${value ?? 0}%`, name]}
              />
              <Legend />
              {selectedMetricConfigs.map((metric) => {
                const color = resolveColor(metric.color);
                const translatedLabel = t[sensorLabelKeys[metric.key]] ?? metric.label;
                return (
                  <Area
                    key={metric.key}
                    type="monotone"
                    dataKey={metric.key}
                    stackId="deviation"
                    stroke={color}
                    strokeWidth={1}
                    fill={`url(#deviation-${metric.key})`}
                    fillOpacity={0.9}
                    dot={false}
                    name={translatedLabel}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
