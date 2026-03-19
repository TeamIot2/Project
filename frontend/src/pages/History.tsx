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
import type { EnvironmentalReading, DeviceInfo, MetricConfig, EnvironmentMode } from "../types";
import { ChevronDown, Cpu } from "../components/Icons";
import type { Translations } from "../i18n/translations";

// Chart metric configurations
const metrics: MetricConfig[] = [
  { key: "co2_ppm", label: "CO2", unit: "ppm", color: "var(--chart-co2)", icon: "wind", decimals: 0, chartDomain: [300, 1500] },
  { key: "temperature_c", label: "Temperature", unit: "°C", color: "var(--chart-temp)", icon: "thermometer", decimals: 1, chartDomain: [15, 35] },
  { key: "humidity_pct", label: "Humidity", unit: "%", color: "var(--chart-humidity)", icon: "droplets", decimals: 1, chartDomain: [20, 80] },
  { key: "pressure_hpa", label: "Pressure", unit: "hPa", color: "var(--chart-pressure)", icon: "gauge", decimals: 0, chartDomain: [960, 1060] },
  { key: "light_lux", label: "Light", unit: "lux", color: "var(--chart-light)", icon: "sun", decimals: 0, chartDomain: [0, 1000] },
  { key: "noise_adc", label: "Noise", unit: "ADC", color: "var(--chart-noise)", icon: "volume", decimals: 0, chartDomain: [0, 1024] },
];

// Translation keys for sensor labels
const sensorLabelKeys: Record<string, keyof Translations> = {
  co2_ppm: "sensor_co2",
  temperature_c: "sensor_temperature",
  humidity_pct: "sensor_humidity",
  pressure_hpa: "sensor_pressure",
  light_lux: "sensor_light",
  noise_adc: "sensor_noise",
};

// Resolve CSS variables to actual colors for Recharts
const colorMap: Record<string, string> = {
  "var(--chart-co2)": "#22C55E",
  "var(--chart-temp)": "#3B82F6",
  "var(--chart-humidity)": "#06B6D4",
  "var(--chart-pressure)": "#8B5CF6",
  "var(--chart-light)": "#F59E0B",
  "var(--chart-noise)": "#EF4444",
};

function resolveColor(cssVar: string): string {
  return colorMap[cssVar] ?? cssVar;
}

// Ideal values per environment mode — deviation is measured from these
const idealValues: Record<EnvironmentMode, Record<string, number>> = {
  sleep: { co2_ppm: 400, temperature_c: 18, humidity_pct: 50, pressure_hpa: 1013, light_lux: 0, noise_adc: 1800 },
  office: { co2_ppm: 500, temperature_c: 22, humidity_pct: 50, pressure_hpa: 1013, light_lux: 400, noise_adc: 1900 },
  sport: { co2_ppm: 600, temperature_c: 18, humidity_pct: 45, pressure_hpa: 1013, light_lux: 300, noise_adc: 2000 },
  outdoor: { co2_ppm: 400, temperature_c: 20, humidity_pct: 50, pressure_hpa: 1013, light_lux: 1000, noise_adc: 2000 },
  school: { co2_ppm: 500, temperature_c: 22, humidity_pct: 50, pressure_hpa: 1013, light_lux: 400, noise_adc: 1900 },
  factory: { co2_ppm: 600, temperature_c: 18, humidity_pct: 45, pressure_hpa: 1013, light_lux: 300, noise_adc: 2000 },
  greenhouse: { co2_ppm: 400, temperature_c: 24, humidity_pct: 65, pressure_hpa: 1013, light_lux: 1000, noise_adc: 1800 },
};

// Max deviation ranges — how far from ideal before it hits 100%
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
];

function getDownsampleStep(hours: number): number {
  if (hours <= 1) return 1;
  if (hours <= 6) return 2;
  if (hours <= 24) return 4;
  if (hours <= 168) return 12;
  return 30;
}

type ChartMode = "individual" | "combined" | "deviation";

export default function History() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const { mode } = useEnvironment();
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [selectedRange, setSelectedRange] = useState(24);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customRangeActive, setCustomRangeActive] = useState(false);
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);
  const [selectedSensors, setSelectedSensors] = useState<Set<string>>(new Set(metrics.map(m => m.key)));
  const [chartMode, setChartMode] = useState<ChartMode>("individual");
  const [readings, setReadings] = useState<EnvironmentalReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setDevices(devs);
        if (devs.length > 0 && !selectedDevice) {
          setSelectedDevice(devs[0].device_id);
        }
      })
      .catch((err) => setError(err.message));
  }, []); // Intentional: fetch device list once on mount only

  // Fetch readings when device or range changes
  useEffect(() => {
    if (!selectedDevice) return;
    setLoading(true);
    setError(null);

    const to = new Date().toISOString();
    const from = new Date(Date.now() - selectedRange * 3600 * 1000).toISOString();

    apiGet<EnvironmentalReading[]>("/readings", {
      device_id: selectedDevice,
      from,
      to,
      limit: 2000,
    })
      .then((data) => setReadings(data.reverse()))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedDevice, selectedRange]);

  // Downsample and format chart data
  const chartData = useMemo(() => {
    const step = getDownsampleStep(selectedRange);
    return readings
      .filter((_, i) => i % step === 0)
      .map((r) => ({
        time: new Date(r.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          ...(selectedRange > 24 ? { month: "short", day: "numeric" } : {}),
        }),
        co2_ppm: r.co2_ppm,
        temperature_c: r.temperature_c,
        humidity_pct: r.humidity_pct,
        pressure_hpa: r.pressure_hpa,
        light_lux: r.light_lux,
        noise_adc: r.sound_level_adc,
      }));
  }, [readings, selectedRange]);

  // Deviation chart data — normalize all values to 0-100 scale (0 = ideal)
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

  const xInterval = Math.max(1, Math.floor(chartData.length / 8));

  const tooltipStyle = {
    background: tooltipBg,
    border: `1px solid ${tooltipBorder}`,
    borderRadius: "8px",
    fontSize: 13,
    color: tooltipText,
  };

  return (
    <div className="history-page">
      {/* Controls bar */}
      <div className="history-controls">
        <div className="time-range-selector">
          {timeRanges.map((tr) => (
            <button
              key={tr.hours}
              className={`time-pill ${selectedRange === tr.hours && !customRangeActive ? "active" : ""}`}
              onClick={() => { setSelectedRange(tr.hours); setCustomRangeActive(false); setShowDatePicker(false); }}
            >
              {tr.label}
            </button>
          ))}
          <button
            className={`time-pill date-pick-btn ${showDatePicker ? "active" : ""}`}
            onClick={() => setShowDatePicker(!showDatePicker)}
            title="Custom range"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
          <input
            type="number"
            className="form-input custom-hours-input"
            placeholder="h"
            min="1"
            max="8760"
            value={customRangeActive ? selectedRange : ""}
            onChange={(e) => {
              const h = parseInt(e.target.value, 10);
              if (h > 0 && h <= 8760) {
                setSelectedRange(h);
                setCustomRangeActive(true);
                setShowDatePicker(false);
              }
            }}
          />
        </div>

        {showDatePicker && (
          <div className="date-picker-row">
            <input
              type="datetime-local"
              className="form-input date-input"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <span className="date-separator">→</span>
            <input
              type="datetime-local"
              className="form-input date-input"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (customFrom && customTo) {
                  const fromMs = new Date(customFrom).getTime();
                  const toMs = new Date(customTo).getTime();
                  const hours = Math.max(1, Math.round((toMs - fromMs) / 3600000));
                  setSelectedRange(hours);
                  setCustomRangeActive(true);
                  setShowDatePicker(false);
                }
              }}
            >
              OK
            </button>
          </div>
        )}

        <div className="history-options">

          <div className="chart-mode-toggle">
            <button
              className={`btn btn-sm ${chartMode === "individual" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setChartMode("individual")}
            >
              {t.individual}
            </button>
            <button
              className={`btn btn-sm ${chartMode === "combined" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setChartMode("combined")}
            >
              {t.combined}
            </button>
            <button
              className={`btn btn-sm ${chartMode === "deviation" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setChartMode("deviation")}
            >
              {t.deviation}
            </button>
          </div>
        </div>
      </div>

      {/* Device & sensor selector */}
      <div className="history-devices">
        {devices.map((d) => (
          <div key={d.device_id} className="history-device-row">
            <button
              className={`history-device-header ${selectedDevice === d.device_id ? "selected" : ""}`}
              onClick={() => {
                setSelectedDevice(d.device_id);
                setExpandedDevice(expandedDevice === d.device_id ? null : d.device_id);
              }}
            >
              <Cpu size={16} />
              <span className="history-device-name">{d.name}</span>
              <ChevronDown size={14} className={`device-chevron ${expandedDevice === d.device_id ? "open" : ""}`} />
            </button>
            {expandedDevice === d.device_id && (
              <div className="history-sensor-list">
                {metrics.map((m) => {
                  const tKey = sensorLabelKeys[m.key];
                  const label = tKey ? (t[tKey] as string) : m.label;
                  return (
                    <label key={m.key} className="history-sensor-item">
                      <input
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
                      <span className="history-sensor-dot" style={{ background: resolveColor(m.color) }} />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}
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
      ) : chartData.length === 0 ? (
        <div className="empty-state">
          <p>{t.no_data_range}</p>
        </div>
      ) : chartMode === "individual" ? (
        // Individual area charts — vivid solid fills, filtered by selectedSensors
        <div className="charts-grid">
          {metrics.filter((m) => selectedSensors.has(m.key)).map((metric) => {
            const color = resolveColor(metric.color);
            const translatedLabel = t[sensorLabelKeys[metric.key]] ?? metric.label;

            return (
              <div key={metric.key} className="card chart-card">
                <h3 className="chart-title">
                  {translatedLabel} ({metric.unit})
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id={`gradient-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.7} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.15} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="time" tick={{ fontSize: 11, fill: axisColor }} interval={xInterval} stroke={gridColor} />
                    <YAxis tick={{ fontSize: 11, fill: axisColor }} domain={metric.chartDomain ?? ["auto", "auto"]} stroke={gridColor} width={50} />
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
        // Combined area chart — vivid stacked
        <div className="card chart-card combined-chart">
          <h3 className="chart-title">{t.all_sensors}</h3>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <defs>
                {metrics.map((metric) => {
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
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: axisColor }} interval={xInterval} stroke={gridColor} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: axisColor }} stroke={gridColor} width={50} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: axisColor }} stroke={gridColor} width={50} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              {metrics.map((metric, i) => {
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
                    yAxisId={i < 3 ? "left" : "right"}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        // Deviation / Warning chart — stacked area, 0 = ideal, higher = worse
        <div className="card chart-card combined-chart">
          <h3 className="chart-title">{t.deviation}</h3>
          <p className="text-secondary" style={{ fontSize: "0.8125rem", marginBottom: "0.75rem" }}>
            {t.deviation_desc}
          </p>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={deviationData}>
              <defs>
                {/* Stacked gradient from green (bottom, good) to red (top, bad) */}
                <linearGradient id="deviation-bg" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity={0.15} />
                  <stop offset="50%" stopColor="#F59E0B" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0.15} />
                </linearGradient>
                {metrics.map((metric) => {
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
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: axisColor }} interval={xInterval} stroke={gridColor} />
              <YAxis
                tick={{ fontSize: 11, fill: axisColor }}
                stroke={gridColor}
                width={50}
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => [`${value ?? 0}%`, name]}
              />
              <Legend />
              {metrics.map((metric) => {
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
