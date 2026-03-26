// Devices page: expandable device list with sensor details

import { useState, useEffect } from "react";
import { apiGet } from "../api";
import { useI18n } from "../contexts/I18nContext";
import { useEnvironment } from "../contexts/EnvironmentContext";
import { useDashboard } from "../contexts/DashboardContext";
import type { DeviceInfo, EnvironmentalReading, EnvironmentMode } from "../types";
import { Cpu, Battery, Clock, ChevronDown, Co2Molecule, Thermometer, Droplets, Activity, Sun, Volume2, LogOut } from "../components/Icons";
import { sortDevicesByStatus } from "../utils/deviceSorting";
import { useExpandedDevices } from "../contexts/ExpandedDevicesContext";

const ALL_ENV_MODES: EnvironmentMode[] = [
  "sleep",
  "office",
  "sport",
  "outdoor",
  "school",
  "factory",
  "greenhouse",
];

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
  { key: "co2_ppm", label: "CO2", unit: "ppm", color: "#22C55E", range: "0 – 5000" },
  { key: "temperature_c", label: "sensor_temperature", unit: "°C", color: "#3B82F6", range: "–40 – +85" },
  { key: "humidity_pct", label: "sensor_humidity", unit: "%", color: "#06B6D4", range: "0 – 100" },
  { key: "pressure_hpa", label: "sensor_pressure", unit: "hPa", color: "#8B5CF6", range: "300 – 1100" },
  { key: "light_lux", label: "sensor_light", unit: "lux", color: "#F59E0B", range: "1 – 65535" },
  { key: "sound_level_adc", label: "sensor_noise", unit: "ADC", color: "#EF4444", range: "0 – 4095", rangeNote: "≈ 30 – 100 dB est." },
] as const;

const sensorIconMap: Record<string, typeof Co2Molecule> = {
  co2_ppm: Co2Molecule,
  temperature_c: Thermometer,
  humidity_pct: Droplets,
  pressure_hpa: Activity,
  light_lux: Sun,
  sound_level_adc: Volume2,
};

function DeviceRow({
  device,
  onRenameDevice,
  onDisconnectDevice,
}: {
  device: DeviceInfo;
  onRenameDevice: (deviceId: string, nextName: string) => void;
  onDisconnectDevice: (deviceId: string) => void;
}) {
  const { t } = useI18n();
  const { getQuality } = useEnvironment();
  const {
    selectedDevices,
    setSelectedDevices,
    deviceModeAssignments,
    setDeviceModeAssignments,
  } = useDashboard();
  const { toggle: toggleExpand, isExpanded } = useExpandedDevices();
  const expanded = isExpanded(device.device_id);
  const [reading, setReading] = useState<EnvironmentalReading | null>(null);
  const [loadingReading, setLoadingReading] = useState(false);
  const [renameValue, setRenameValue] = useState(device.name);

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

  useEffect(() => {
    setRenameValue(device.name);
  }, [device.name]);

  // Translate sensor label keys
  function getSensorLabel(label: string): string {
    const key = label as keyof typeof t;
    return (t[key] as string) ?? label;
  }

  function handleConfirmRename() {
    const nextName = renameValue.trim();
    if (!nextName || nextName === device.name) return;
    onRenameDevice(device.device_id, nextName);
  }

  const assignedModes = deviceModeAssignments[device.device_id] ?? ALL_ENV_MODES;
  const modeLabels: Record<EnvironmentMode, string> = {
    sleep: t.env_sleep,
    office: t.env_office,
    sport: t.env_sport,
    outdoor: t.env_outdoor,
    school: t.env_school,
    factory: t.env_factory,
    greenhouse: t.env_greenhouse,
  };

  function getShortModeLabel(envMode: EnvironmentMode): string {
    const source = modeLabels[envMode] ?? envMode;
    return source.split("/")[0].trim();
  }

  function toggleModeAssignment(targetMode: EnvironmentMode) {
    setDeviceModeAssignments((prev) => {
      const current = new Set(prev[device.device_id] ?? ALL_ENV_MODES);
      if (current.has(targetMode)) current.delete(targetMode);
      else current.add(targetMode);

      const nextModes = ALL_ENV_MODES.filter((mode) => current.has(mode));
      const next = { ...prev, [device.device_id]: nextModes };

      // Full mode set is implicit default; keep storage compact.
      if (nextModes.length === ALL_ENV_MODES.length) {
        delete next[device.device_id];
      }
      return next;
    });
  }

  return (
    <div className="figma-device-group">
      <div className="figma-device-row">
        <Cpu size={16} className="figma-device-icon-chip" />
        <span className="figma-device-label">Device:</span>
        <span className="figma-device-name">{device.name}</span>
        <button
          className="figma-device-expand"
          onClick={() => toggleExpand(device.device_id)}
        >
          <ChevronDown size={16} className={`figma-chevron ${expanded ? "open" : ""}`} />
        </button>
      </div>
      {expanded && (
        <div className="device-row-body">
          <div className="device-tech-desc">
            <b>LOLIN32 ESP32</b> — main board, 240 MHz, WiFi/Bluetooth
            {" · "}
            <b>MH-Z19B</b> — CO2 sensor, 0–5000 ppm
            {" · "}
            <b>BME280</b> — temperature, humidity &amp; pressure sensor
            {" · "}
            <b>BH1750</b> — ambient light sensor, 1–65535 lux
            {" · "}
            <b>MAX9814</b> — microphone module for noise detection
          </div>

          <div className="device-meta-group device-meta-group--left">
            <div className="device-meta">
              <Clock size={12} />
              <span>Last data: {timeAgo(device.last_seen)} {t.ago}</span>
            </div>
            {device.battery_v !== undefined && (
              <div className="device-meta">
                <Battery size={12} />
                <span>{device.battery_v.toFixed(1)}V</span>
              </div>
            )}
            {device.firmware_version && (
              <div className="device-meta">
                <Cpu size={12} />
                <span>Firmware {device.firmware_version}</span>
              </div>
            )}
          </div>

          <div className="device-rename-row">
            <span className="device-rename-label">Rename device</span>
            <input
              type="text"
              className="form-input device-rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirmRename();
              }}
              aria-label="Rename device"
            />
            <button
              type="button"
              className="btn btn-sm btn-outline device-rename-confirm"
              onClick={handleConfirmRename}
              disabled={!renameValue.trim() || renameValue.trim() === device.name}
            >
              Confirm
            </button>
          </div>

          <div className="device-mode-row">
            <span className="device-mode-label">This device contributes to these modes:</span>
            <div className="device-mode-chips">
              {ALL_ENV_MODES.map((envMode) => {
                const isActive = assignedModes.includes(envMode);
                return (
                  <button
                    key={envMode}
                    type="button"
                    className={`device-mode-chip ${isActive ? "active" : ""}`}
                    onClick={() => toggleModeAssignment(envMode)}
                    aria-pressed={isActive}
                    title={isActive ? "Click to remove mode" : "Click to add mode"}
                  >
                    {getShortModeLabel(envMode)}
                  </button>
                );
              })}
            </div>
          </div>

          <h4 className="device-measures-heading">This device measures:</h4>
          <div className="device-sensors-grid">
            {sensorFields.map((sf) => {
              const SensorIcon = sensorIconMap[sf.key] ?? Co2Molecule;
              return (
                <div key={sf.key} className="device-sensor-item" style={{ borderLeftColor: sf.color }}>
                  <span className="device-sensor-label">{getSensorLabel(sf.label)}</span>
                  <span className="device-sensor-value">
                    {sf.range}
                    <small> {sf.unit}</small>
                  </span>
                  {"rangeNote" in sf && sf.rangeNote && (
                    <span className="device-sensor-note">{sf.rangeNote}</span>
                  )}
                  <span style={{ color: sf.color, display: "inline-flex" }}><SensorIcon size={14} /></span>
                </div>
              );
            })}
          </div>

          <div className="device-disconnect-row">
            <button
              type="button"
              className="btn btn-sm btn-outline btn-danger device-disconnect-btn"
              onClick={() => onDisconnectDevice(device.device_id)}
            >
              <LogOut size={14} />
              <span>{t.disconnect_device ?? "Disconnect device"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
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

  function handleRenameDevice(deviceId: string, nextName: string) {
    setDevices((prev) =>
      prev.map((device) =>
        device.device_id === deviceId ? { ...device, name: nextName } : device
      )
    );
  }

  function handleDisconnectDevice(deviceId: string) {
    setDevices((prev) => prev.filter((d) => d.device_id !== deviceId));
  }

  // Close modal on Escape key
  useEffect(() => {
    if (!connectModalOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") resetConnectModal(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  });

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

      <div className="devices-list figma-devices">
        {devices.map((device) => (
          <div key={device.device_id} className="card device-card-wrapper">
            <DeviceRow
              device={device}
              onRenameDevice={handleRenameDevice}
              onDisconnectDevice={handleDisconnectDevice}
            />
          </div>
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
