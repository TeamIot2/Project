// Devices page: expandable device list with sensor details

import { useState, useEffect } from "react";
import { apiGet } from "../api";
import { useI18n } from "../contexts/I18nContext";
import { useEnvironment } from "../contexts/EnvironmentContext";
import type { DeviceInfo, EnvironmentalReading } from "../types";
import { Cpu, Wifi, WifiOff, AlertCircle, Battery, Clock, ChevronDown } from "../components/Icons";

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "< 1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// Sensor display config for the expanded view
const sensorFields = [
  { key: "co2_ppm", label: "CO2", unit: "ppm", color: "#22C55E" },
  { key: "temperature_c", label: "sensor_temperature", unit: "°C", color: "#3B82F6" },
  { key: "humidity_pct", label: "sensor_humidity", unit: "%", color: "#06B6D4" },
  { key: "pressure_hpa", label: "sensor_pressure", unit: "hPa", color: "#8B5CF6" },
  { key: "light_lux", label: "sensor_light", unit: "lux", color: "#F59E0B" },
  { key: "sound_level_adc", label: "sensor_noise", unit: "ADC", color: "#EF4444" },
] as const;

function DeviceRow({ device }: { device: DeviceInfo }) {
  const { t } = useI18n();
  const { getQuality } = useEnvironment();
  const [expanded, setExpanded] = useState(false);
  const [reading, setReading] = useState<EnvironmentalReading | null>(null);
  const [loadingReading, setLoadingReading] = useState(false);

  function statusLabel(status: string): string {
    if (status === "online") return t.status_online;
    if (status === "offline") return t.status_offline;
    return t.status_error;
  }

  // Fetch latest reading when expanded
  useEffect(() => {
    if (expanded && !reading && !loadingReading) {
      setLoadingReading(true);
      apiGet<EnvironmentalReading>(`/readings/latest/${device.device_id}`)
        .then(setReading)
        .catch(() => {})
        .finally(() => setLoadingReading(false));
    }
  }, [expanded, reading, loadingReading, device.device_id]);

  // Translate sensor label keys
  function getSensorLabel(label: string): string {
    const key = label as keyof typeof t;
    return (t[key] as string) ?? label;
  }

  return (
    <article className="card device-row">
      <button className="device-row-header" onClick={() => setExpanded(!expanded)}>
        <div className="device-row-left">
          <div className="device-icon">
            <Cpu size={20} />
          </div>
          <div className="device-row-info">
            <span className="device-name-label">Device name</span>
            <h3 className="device-name">{device.name}</h3>
          </div>
        </div>

        <div className="device-row-right">
          <span className={`status-badge status-${device.status}`}>
            {device.status === "online" && <Wifi size={12} />}
            {device.status === "offline" && <WifiOff size={12} />}
            {device.status === "error" && <AlertCircle size={12} />}
            <span>{statusLabel(device.status)}</span>
          </span>
          <ChevronDown size={16} className={`device-chevron ${expanded ? "open" : ""}`} />
        </div>
      </button>

      {expanded && (
        <div className="device-row-body">
          <div className="device-meta-row">
            <span className="device-location">{device.location}</span>
            <div className="device-meta-group">
              <div className="device-meta">
                <Clock size={12} />
                <span>{timeAgo(device.last_seen)} {t.ago}</span>
              </div>
              {device.battery_v !== undefined && (
                <div className="device-meta">
                  <Battery size={12} />
                  <span>{device.battery_v.toFixed(1)}V</span>
                </div>
              )}
              {device.firmware_version && (
                <div className="device-meta">
                  <span className="fw-label">{t.firmware}</span>
                  <span>{device.firmware_version}</span>
                </div>
              )}
            </div>
          </div>

          {loadingReading ? (
            <div className="device-sensors-loading">
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 36, borderRadius: 8 }} />)}
            </div>
          ) : reading ? (
            <div className="device-sensors-grid">
              {sensorFields.map((sf) => {
                const value = reading[sf.key as keyof EnvironmentalReading] as number | undefined;
                const qualityKey = sf.key === "sound_level_adc" ? "noise_adc" : sf.key;
                const quality = value !== undefined ? getQuality(qualityKey, value) : "moderate";
                return (
                  <div key={sf.key} className="device-sensor-item" style={{ borderLeftColor: sf.color }}>
                    <span className="device-sensor-label">{getSensorLabel(sf.label)}</span>
                    <span className="device-sensor-value">
                      {value !== undefined ? (sf.key === "temperature_c" ? value.toFixed(1) : Math.round(value)) : "--"}
                      <small>{sf.unit}</small>
                    </span>
                    <span className={`device-sensor-quality quality-${quality}`} />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted" style={{ fontSize: "0.75rem" }}>No data</p>
          )}
        </div>
      )}
    </article>
  );
}

export default function Devices() {
  const { t } = useI18n();
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<DeviceInfo[]>("/devices")
      .then(setDevices)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
        <p>{t.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-banner">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="devices-page">
      <div className="devices-hero">
        <img src="/images/device_sensor.png" alt="IoT Sensor" className="devices-hero-img" />
        <div className="devices-hero-text">
          <h1 className="devices-title">{t.devices_title}</h1>
          <p className="text-secondary">{t.registered_devices}: {devices.length}</p>
        </div>
      </div>

      <div className="devices-list">
        {devices.map((device) => (
          <DeviceRow key={device.device_id} device={device} />
        ))}
      </div>
    </div>
  );
}
