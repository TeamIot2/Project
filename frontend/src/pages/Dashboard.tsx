// Dashboard page: air quality score, sensor cards with sparklines, environment selector

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import { useEnvironment } from "../contexts/EnvironmentContext";
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
} from "../components/Icons";
import type { EnvironmentMode } from "../types";

/**
 * Circular carousel for environment cards.
 * Active card centered, neighbours visible and dimmed. Loops infinitely.
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

  function getOffset(i: number): number {
    const len = environments.length;
    let diff = i - activeIndex;
    // Wrap around for circular effect
    if (diff > len / 2) diff -= len;
    if (diff < -len / 2) diff += len;
    return diff;
  }

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
        {environments.map((env, i) => {
          const offset = getOffset(i);
          const isActive = offset === 0;
          const absOffset = Math.abs(offset);
          return (
            <button
              key={env.id}
              className={`env-card ${isActive ? "active" : ""}`}
              data-env={env.id}
              onClick={() => onSelect(env.id)}
              style={{
                transform: `translateX(${offset * 85}%) scale(${isActive ? 1.1 : 0.8})`,
                opacity: absOffset === 0 ? 1 : absOffset === 1 ? 0.45 : 0.2,
                zIndex: 10 - absOffset,
                filter: isActive ? "none" : "brightness(0.85)",
              }}
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
      setLastUpdate(new Date().toLocaleTimeString());
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
      {/* Environment carousel — centered active card, looping */}
      <EnvironmentCarousel
        environments={[
          { id: "office" as const, img: "/images/env_office.png", label: t.env_office },
          { id: "sleep" as const, img: "/images/env_sleep.png", label: t.env_sleep },
          { id: "sport" as const, img: "/images/env_sport.png", label: t.env_sport },
          { id: "outdoor" as const, img: "/images/env_outdoor.png", label: t.env_outdoor },
        ]}
        activeId={mode}
        onSelect={setEnvironment}
      />

      {/* Measuring status bar */}
      <section className="measuring-bar">
        <div className="measuring-status">
          <span className={`measuring-dot ${isMeasuring ? "active" : ""}`} />
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              {t.measuring_stop}
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20" /></svg>
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
              className="sensor-card"
              style={{ borderLeft: `4px solid ${borderColor}` }}
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
              </div>

              <Sparkline data={sparkData} dataKey="value" color={metric.color} />
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
