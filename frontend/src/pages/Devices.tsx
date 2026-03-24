// Devices page: expandable device list with sensor details

import { useState, useEffect } from "react";
import { apiGet } from "../api";
import { useI18n } from "../contexts/I18nContext";
import { useEnvironment } from "../contexts/EnvironmentContext";
import type { DeviceInfo, EnvironmentalReading } from "../types";
import { Cpu, Wifi, WifiOff, AlertCircle, Battery, Clock, ChevronDown } from "../components/Icons";
import { sortDevicesByStatus } from "../utils/deviceSorting";

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
  const { t, locale } = useI18n();
  const isCs = locale === "cs";
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newDeviceLocation, setNewDeviceLocation] = useState("");
  const [newDeviceTransport, setNewDeviceTransport] = useState("wifi");
  const [connectMessage, setConnectMessage] = useState<string | null>(null);

  useEffect(() => {
    apiGet<DeviceInfo[]>("/devices")
      .then((devs) => setDevices(sortDevicesByStatus(devs)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function resetConnectModal() {
    setConnectModalOpen(false);
    setConnectMessage(null);
    setNewDeviceName("");
    setNewDeviceLocation("");
    setNewDeviceTransport("wifi");
  }

  function handleConnectDevice() {
    if (!newDeviceName.trim()) {
      setConnectMessage(
        isCs
          ? "Vypln nazev zarizeni."
          : "Enter a device name."
      );
      return;
    }

    setConnectMessage(
      isCs
        ? "Pripojeni noveho zarizeni je pripraveno (demo flow)."
        : "New device connect flow is ready (demo mode)."
    );
  }

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
        <div className="devices-hero-actions">
          <button className="btn btn-primary btn-sm devices-connect-btn" onClick={() => setConnectModalOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{isCs ? "Pripojit nove zarizeni" : "Connect new device"}</span>
          </button>
        </div>
      </div>

      <div className="devices-list">
        {devices.map((device) => (
          <DeviceRow key={device.device_id} device={device} />
        ))}
      </div>

      {connectModalOpen && (
        <div className="modal-overlay" onClick={resetConnectModal}>
          <div className="modal-card devices-connect-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="devices-connect-title">
              {isCs ? "Pripojit nove zarizeni" : "Connect new device"}
            </h3>
            <p className="devices-connect-subtitle text-secondary">
              {isCs
                ? "Vytvor pripojovaci profil noveho senzoru."
                : "Create a new sensor connection profile."}
            </p>

            <div className="devices-connect-form">
              <div className="form-group">
                <label className="form-label">{isCs ? "Nazev zarizeni" : "Device name"}</label>
                <input
                  className="form-input"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder={isCs ? "napr. Trida 2A" : "e.g. Office sensor"}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{isCs ? "Misto" : "Location"}</label>
                <input
                  className="form-input"
                  value={newDeviceLocation}
                  onChange={(e) => setNewDeviceLocation(e.target.value)}
                  placeholder={isCs ? "napr. 2. patro" : "e.g. 2nd floor"}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{isCs ? "Typ pripojeni" : "Connection type"}</label>
                <select className="form-select" value={newDeviceTransport} onChange={(e) => setNewDeviceTransport(e.target.value)}>
                  <option value="wifi">Wi-Fi</option>
                  <option value="ble">Bluetooth LE</option>
                  <option value="usb">USB Gateway</option>
                </select>
              </div>
            </div>

            {connectMessage && <p className="devices-connect-message">{connectMessage}</p>}

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={resetConnectModal}>
                {isCs ? "Zavrit" : "Close"}
              </button>
              <button className="btn btn-primary" onClick={handleConnectDevice}>
                {isCs ? "Pripojit" : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
