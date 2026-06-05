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
import { useSettingsState } from "../contexts/SettingsStateContext";
import type { EnvironmentalReading, DeviceInfo, EnvironmentMode } from "../types";
import { ChevronDown, Cpu, Wind, Thermometer, Droplets, Sun, Volume2, Activity, Co2Molecule, Moon, Briefcase } from "../components/Icons";
import { sortDevicesByStatus } from "../utils/deviceSorting";
import { formatLocalDate, formatLocalTime } from "../utils/dateTime";
import { getDisplayDeviceName } from "../utils/deviceDisplayName";
import { withMockModeSuffix } from "../utils/modeLabels";
import { useDashboard } from "../contexts/DashboardContext";
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

// Time range options (preset + custom)
const timeRanges = [
  { label: "1h", hours: 1 },
  { label: "8h", hours: 8 },
  { label: "1d", hours: 24 },
  { label: "7d", hours: 168 },
  { label: "1m", hours: 720 },
  { label: "1y", hours: 8760 },
];

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

function formatChartTitleUnit(unit: string): string {
  if (unit === "ppm") return "PPM";
  if (unit === "lux") return "LUX";
  return unit;
}

type HistoryChartPoint = {
  time: string;
  timeMs: number;
  co2_ppm: number | null;
  temperature_c: number | null;
  humidity_pct: number | null;
  pressure_hpa: number | null;
  light_lux: number | null;
  noise_adc: number | null;
};

type ChartMode = "individual" | "combined";

function formatChartTimeLabel(timeMs: number, hours: number): string {
  const date = new Date(timeMs);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    ...(hours > 24 ? { month: "short", day: "numeric" } : {}),
  });
}

function emptyChartPoint(timeMs: number, hours: number): HistoryChartPoint {
  return {
    time: formatChartTimeLabel(timeMs, hours),
    timeMs,
    co2_ppm: null,
    temperature_c: null,
    humidity_pct: null,
    pressure_hpa: null,
    light_lux: null,
    noise_adc: null,
  };
}

function getMissingDataThresholdMs(hours: number): number {
  if (hours <= 1) return 2 * 60 * 1000;
  if (hours <= 8) return 15 * 60 * 1000;
  if (hours <= 24) return 60 * 60 * 1000;
  if (hours <= 168) return 4 * 60 * 60 * 1000;
  if (hours <= 720) return 12 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

function getGapMarkerTimes(readings: EnvironmentalReading[], hours: number): number[] {
  if (readings.length <= 1) return [];

  const times = readings
    .map((reading) => new Date(reading.timestamp).getTime())
    .filter((timeMs) => Number.isFinite(timeMs))
    .sort((a, b) => a - b);
  if (times.length <= 1) return [];

  const intervals = times
    .slice(1)
    .map((timeMs, index) => timeMs - times[index])
    .filter((interval) => Number.isFinite(interval) && interval > 0)
    .sort((a, b) => a - b);
  if (intervals.length === 0) return [];

  const medianInterval = intervals[Math.floor(intervals.length / 2)];
  const gapThresholdMs = Math.max(getMissingDataThresholdMs(hours), medianInterval * 3);
  const gapMarkers: number[] = [];

  for (let i = 1; i < times.length; i += 1) {
    const previousTimeMs = times[i - 1];
    const currentTimeMs = times[i];
    const gapMs = currentTimeMs - previousTimeMs;

    if (gapMs > gapThresholdMs) {
      gapMarkers.push(previousTimeMs + gapMs / 2);
    }
  }

  return gapMarkers;
}

export default function History() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const { mode, setEnvironment } = useEnvironment();
  const { modeMetaOverrides } = useSettingsState();
  const { deviceModeAssignments } = useDashboard();
  const panelType = usePanelType();
  const getModeLabel = (modeId: EnvironmentMode, fallback: string) =>
    withMockModeSuffix(modeId, modeMetaOverrides[modeId]?.name ?? fallback);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [selectedRange, setSelectedRange] = useState(24);
  const [presetRangeAnchorIso, setPresetRangeAnchorIso] = useState(() => new Date().toISOString());
  const [customRangeActive, setCustomRangeActive] = useState(false);
  const [intervalStartTime, setIntervalStartTime] = useState(() => formatLocalTime(new Date(Date.now() - 24 * 3600 * 1000)));
  const [intervalStartDate, setIntervalStartDate] = useState(() => formatLocalDate(new Date(Date.now() - 24 * 3600 * 1000)));
  const [intervalEndTime, setIntervalEndTime] = useState(() => formatLocalTime(new Date()));
  const [intervalEndDate, setIntervalEndDate] = useState(() => formatLocalDate(new Date()));
  const [expandedHistoryDevice, setExpandedHistoryDevice] = useState<string | null>(null);
  const [selectedSensors, setSelectedSensors] = useState<Set<string>>(new Set(metrics.map(m => m.key)));
  const [chartMode, setChartMode] = useState<ChartMode>("individual");
  const [readings, setReadings] = useState<EnvironmentalReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const devicesForMode = useMemo(
    () =>
      devices.filter((device) => {
        const assignedModes = deviceModeAssignments[device.device_id];
        if (!assignedModes || assignedModes.length === 0) return false;
        return assignedModes.includes(mode);
      }),
    [deviceModeAssignments, devices, mode]
  );

  // Theme-aware chart colors
  const gridColor = theme === "dark" ? "#4B5563" : "#F0EBE5";
  const axisStrokeColor = theme === "dark" ? "#7B8798" : "#F0EBE5";
  const axisColor = theme === "dark" ? "#A8B3C4" : "#9C9590";
  const tooltipBg = theme === "dark" ? "#2A2825" : "#FFFFFF";
  const tooltipBorder = theme === "dark" ? "#3D3A37" : "#E5DDD5";
  const tooltipText = theme === "dark" ? "#F0EBE5" : "#2D2A26";

  // Fetch devices
  useEffect(() => {
    apiGet<DeviceInfo[]>("/devices")
      .then((devs) => {
        const sortedDevices = sortDevicesByStatus(devs);
        setDevices(sortedDevices);
      })
      .catch((err) => setError(err.message));
  }, []); // Intentional: fetch device list once on mount only

  useEffect(() => {
    if (devicesForMode.length === 0) {
      setSelectedDevice("");
      setExpandedHistoryDevice(null);
      return;
    }

    if (!devicesForMode.some((device) => device.device_id === selectedDevice)) {
      setSelectedDevice(devicesForMode[0].device_id);
      setExpandedHistoryDevice(devicesForMode[0].device_id);
    }
  }, [devicesForMode, selectedDevice]);

  function selectHistoryDevice(deviceId: string, nextExpanded = true): void {
    setSelectedDevice(deviceId);
    setExpandedHistoryDevice(nextExpanded ? deviceId : null);
  }

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

  const activeInterval = useMemo(() => {
    if (customRangeActive && customInterval) return customInterval;

    const presetToDate = new Date(presetRangeAnchorIso);
    const presetToMs = Number.isNaN(presetToDate.getTime()) ? Date.now() : presetToDate.getTime();
    const presetFromMs = presetToMs - selectedRange * 3600 * 1000;

    return {
      from: new Date(presetFromMs).toISOString(),
      to: new Date(presetToMs).toISOString(),
      hours: selectedRange,
    };
  }, [customRangeActive, customInterval, presetRangeAnchorIso, selectedRange]);

  const effectiveRangeHours = activeInterval.hours;
  const readingQueryLimit = effectiveRangeHours >= 720 ? 100000 : 25000;
  const chartTimeDomain = useMemo<[number, number]>(() => {
    const fromMs = new Date(activeInterval.from).getTime();
    const toMs = new Date(activeInterval.to).getTime();
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs >= toMs) {
      const fallbackToMs = Date.now();
      return [fallbackToMs - selectedRange * 3600 * 1000, fallbackToMs];
    }
    return [fromMs, toMs];
  }, [activeInterval, selectedRange]);

  // Fetch readings when device or range changes
  useEffect(() => {
    if (!selectedDevice) {
      setReadings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    apiGet<EnvironmentalReading[]>("/readings", {
      device_id: selectedDevice,
      from: activeInterval.from,
      to: activeInterval.to,
      limit: readingQueryLimit,
    })
      .then((data) => setReadings(data.reverse()))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedDevice, activeInterval, readingQueryLimit]);

  // Downsample and format chart data
  const chartData = useMemo(() => {
    const step = getDownsampleStep(effectiveRangeHours);
    const sortedReadings = readings
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const gapPoints = getGapMarkerTimes(sortedReadings, effectiveRangeHours).map((timeMs) =>
      emptyChartPoint(timeMs, effectiveRangeHours)
    );
    const sampledPoints = sortedReadings
      .filter((_, i) => i % step === 0)
      .map((r): HistoryChartPoint => {
        const timeMs = new Date(r.timestamp).getTime();
        return {
          time: formatChartTimeLabel(timeMs, effectiveRangeHours),
          timeMs,
          co2_ppm: r.co2_ppm,
          temperature_c: r.temperature_c,
          humidity_pct: r.humidity_pct,
          pressure_hpa: r.pressure_hpa,
          light_lux: r.light_lux,
          noise_adc: r.sound_level_adc,
        };
      })
      .filter((point) => Number.isFinite(point.timeMs));

    return [...sampledPoints, ...gapPoints].sort((a, b) => a.timeMs - b.timeMs);
  }, [readings, effectiveRangeHours]);

  const displayData = useMemo(() => {
    if (!selectedDevice) return [] as typeof chartData;
    return chartData;
  }, [chartData, selectedDevice]);

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

  const tooltipStyle = {
    background: tooltipBg,
    border: `1px solid ${tooltipBorder}`,
    borderRadius: "8px",
    fontSize: 13,
    color: tooltipText,
  };

  // Environment carousel definitions for mobile
  const isMobile = panelType === "mobile" || panelType === "single";
  const xTickCount = isMobile ? 4 : 7;
  const individualChartHeight = isMobile ? 132 : 220;
  const aggregateChartHeight = isMobile ? 240 : 400;
  const chartMargin = isMobile
    ? { top: 4, right: 10, left: 10, bottom: 0 }
    : { top: 4, right: 0, left: 0, bottom: 0 };
  const xAxisPadding = isMobile ? { left: 12, right: 12 } : { left: 0, right: 0 };
  const xAxisTickFontSize = isMobile ? 10 : 11;
  const carouselEnvs = [
    { id: "sleep" as const, img: "/images/silent/silent_06_bedroom.png", label: getModeLabel("sleep", t.env_sleep), icon: Moon },
    { id: "office" as const, img: "/images/silent/silent_07_office.png", label: getModeLabel("office", t.env_office), icon: Briefcase },
    { id: "sport" as const, img: "/images/silent/silent_02_gym.png", label: getModeLabel("sport", t.env_sport), icon: Activity },
    { id: "outdoor" as const, img: "/images/silent/silent_03_nature.png", label: getModeLabel("outdoor", t.env_outdoor), icon: Wind },
    { id: "school" as const, img: "/images/silent/silent_01_classroom.png", label: getModeLabel("school", t.env_school), icon: Briefcase },
    { id: "factory" as const, img: "/images/silent/silent_08_factory.png", label: getModeLabel("factory", t.env_factory), icon: Activity },
    { id: "greenhouse" as const, img: "/images/silent/silent_04_greenhouse.png", label: getModeLabel("greenhouse", t.env_greenhouse), icon: Sun },
  ];
  const deviceSelectorPanel = (
    <div className="history-devices card devices-list figma-devices">
      {devicesForMode.length === 0 && (
        <p className="text-secondary" style={{ margin: "0.5rem 0.75rem 0.25rem" }}>
          {t.mode_without_device_message}
        </p>
      )}
      {devicesForMode.map((d) => {
        const isSelected = selectedDevice === d.device_id;
        const isExpanded = expandedHistoryDevice === d.device_id;
        const displayName = getDisplayDeviceName(d, t);

        return (
          <div key={d.device_id} className="figma-device-group">
            <div
              className={`figma-device-row ${isSelected ? "selected" : ""}`}
              role="button"
              aria-pressed={isSelected}
              aria-expanded={isExpanded}
              tabIndex={0}
              onClick={() => selectHistoryDevice(d.device_id, true)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  selectHistoryDevice(d.device_id, true);
                }
              }}
            >
              <Cpu size={16} className="figma-device-icon-chip" />
              <span className="figma-device-label">{t.device_label}:</span>
              <span className="figma-device-name">{displayName}</span>
              <button
                className="figma-device-expand"
                onClick={(event) => {
                  event.stopPropagation();
                  if (isExpanded) {
                    setExpandedHistoryDevice(null);
                  } else {
                    selectHistoryDevice(d.device_id, true);
                  }
                }}
                aria-label={`Toggle sensors for ${displayName}`}
                aria-expanded={isExpanded}
              >
                <ChevronDown size={16} className={`figma-chevron ${isExpanded ? "open" : ""}`} />
              </button>
            </div>
            {isSelected && isExpanded && (
              <div className="history-sensor-list">
                {metrics.map((m) => {
                  const tKey = sensorLabelKeys[m.key];
                  const label = tKey ? (t[tKey] as string) : m.label;
                  return (
                    <label key={m.key} className="history-sensor-item">
                      <input
                        id={`sensor-${d.device_id}-${m.key}`}
                        type="checkbox"
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
                      {(() => { const Icon = sensorIconMap[m.icon] ?? Wind; return <span style={{ color: resolveColor(m.color), display: "inline-flex", flexShrink: 0 }}><Icon size={14} /></span>; })()}
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

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
        <h3 className="history-section-label history-mobile-heading">{`${t.time_window}:`}</h3>
        {/* Desktop headings row */}
        <div className="history-headings-row">
          <h3 className="history-section-label">{`${t.time_window}:`}</h3>
          <h3 className="history-section-label history-custom-label">{`${t.custom}:`}</h3>
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
                  setPresetRangeAnchorIso(toDate.toISOString());
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
      {!isMobile && deviceSelectorPanel}

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
            const titleUnit = formatChartTitleUnit(metric.unit);
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
                  {translatedLabel}{"\u00A0\u00A0"}[{titleUnit}]
                </h3>
                {isMobile && (
                  <div className="history-mobile-y-axis-labels history-mobile-y-axis-labels--range" aria-hidden="true">
                    <span>{individualMobileRangeLabel} {metric.unit}</span>
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
                      dataKey="timeMs"
                      type="number"
                      scale="time"
                      domain={chartTimeDomain}
                      tick={{ fontSize: xAxisTickFontSize, fill: axisColor }}
                      tickFormatter={(value) => formatChartTimeLabel(Number(value), effectiveRangeHours)}
                      tickCount={xTickCount}
                      stroke={axisStrokeColor}
                      padding={xAxisPadding}
                      tickMargin={isMobile ? 8 : 6}
                      minTickGap={isMobile ? 16 : 10}
                    />
                    <YAxis
                      tick={isMobile ? false : { fontSize: 11, fill: axisColor }}
                      domain={metricDomain}
                      stroke={axisStrokeColor}
                      width={isMobile ? 0 : 50}
                      axisLine={!isMobile}
                      tickLine={!isMobile}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelFormatter={(value) => formatChartTimeLabel(Number(value), effectiveRangeHours)}
                    />
                    <Area
                      type="monotone"
                      dataKey={metric.key}
                      stroke={color}
                      strokeWidth={2}
                      fill={`url(#gradient-${metric.key})`}
                      fillOpacity={1}
                      dot={false}
                      connectNulls={false}
                      name={translatedLabel}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      ) : (
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
                dataKey="timeMs"
                type="number"
                scale="time"
                domain={chartTimeDomain}
                tick={{ fontSize: xAxisTickFontSize, fill: axisColor }}
                tickFormatter={(value) => formatChartTimeLabel(Number(value), effectiveRangeHours)}
                tickCount={xTickCount}
                stroke={axisStrokeColor}
                padding={xAxisPadding}
                tickMargin={isMobile ? 8 : 6}
                minTickGap={isMobile ? 16 : 10}
              />
              {isMobile ? (
                <YAxis
                  tick={false}
                  stroke={axisStrokeColor}
                  width={0}
                  axisLine={false}
                  tickLine={false}
                  domain={combinedMobileDomain}
                />
              ) : (
                <>
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: axisColor }} stroke={axisStrokeColor} width={50} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: axisColor }} stroke={axisStrokeColor} width={50} />
                </>
              )}
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(value) => formatChartTimeLabel(Number(value), effectiveRangeHours)}
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
                    connectNulls={false}
                    name={translatedLabel}
                    yAxisId={isMobile ? undefined : (i < 3 ? "left" : "right")}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {isMobile && deviceSelectorPanel}
    </div>
  );
}
