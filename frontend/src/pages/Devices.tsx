// Devices page: expandable device list with sensor details

import { useState, useEffect } from "react";
import { apiGet, apiPatch } from "../api";
import { useI18n } from "../contexts/I18nContext";
import { useDashboard } from "../contexts/DashboardContext";
import type { DeviceInfo, EnvironmentalReading, EnvironmentMode } from "../types";
import { Cpu, Battery, Clock, ChevronDown, Co2Molecule, Thermometer, Droplets, Activity, Sun, Volume2, LogOut } from "../components/Icons";
import { sortDevicesByStatus } from "../utils/deviceSorting";
import { timeAgo } from "../utils/dateTime";
import { useExpandedDevices } from "../contexts/ExpandedDevicesContext";
import { DEVICE_SENSOR_FIELDS as sensorFields } from "../constants/chartColors";
import { getDisplayDeviceName } from "../utils/deviceDisplayName";

const ALL_ENV_MODES: EnvironmentMode[] = [
  "sleep",
  "office",
  "sport",
  "outdoor",
  "school",
  "factory",
  "greenhouse",
];

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
  onRenameDevice: (deviceId: string, nextName: string) => Promise<void>;
  onDisconnectDevice: (deviceId: string) => void;
}) {
  const { t } = useI18n();
  const {
    deviceModeAssignments,
    setDeviceModeAssignments,
  } = useDashboard();
  const { toggle: toggleExpand, isExpanded } = useExpandedDevices();
  const expanded = isExpanded(device.device_id);
  const [reading, setReading] = useState<EnvironmentalReading | null>(null);
  const [loadingReading, setLoadingReading] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(device.name);

  // Fetch latest reading when expanded
  useEffect(() => {
    if (expanded && !reading && !loadingReading) {
      setLoadingReading(true);
      apiGet<EnvironmentalReading>(`/readings/latest/${device.device_id}`)
        .then(setReading)
        .catch((err) => console.warn("Failed to fetch reading:", err))
        .finally(() => setLoadingReading(false));
    }
  }, [expanded, device.device_id]); // reading and loadingReading are guarded inside the effect

  useEffect(() => {
    setRenameValue(device.name);
  }, [device.name]);

  // Translate sensor label keys
  function getSensorLabel(label: string): string {
    if (label in t) return (t as unknown as Record<string, string>)[label];
    return label;
  }

  async function handleConfirmRename() {
    const nextName = renameValue.trim();
    if (!nextName || nextName === device.name || renaming) return;

    try {
      setRenaming(true);
      await onRenameDevice(device.device_id, nextName);
    } catch (err) {
      console.warn("Failed to rename device:", err);
      setRenameValue(device.name);
    } finally {
      setRenaming(false);
    }
  }

  const assignedModes = deviceModeAssignments[device.device_id] ?? [];
  const deviceDisplayName = getDisplayDeviceName(device, t);
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
      const current = new Set(prev[device.device_id] ?? []);
      if (current.has(targetMode)) current.delete(targetMode);
      else current.add(targetMode);

      const nextModes = ALL_ENV_MODES.filter((mode) => current.has(mode));
      const next = { ...prev };

      if (nextModes.length === 0) {
        delete next[device.device_id];
      } else {
        next[device.device_id] = nextModes;
      }
      return next;
    });
  }

  return (
    <div className="figma-device-group">
      <div className="figma-device-row">
        <Cpu size={16} className="figma-device-icon-chip" />
        <span className="figma-device-label">{t.device_label}:</span>
        <span className="figma-device-name">{deviceDisplayName}</span>
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
                if (e.key === "Enter") void handleConfirmRename();
              }}
              aria-label="Rename device"
            />
            <button
              type="button"
              className="btn btn-sm btn-outline device-rename-confirm"
              onClick={() => void handleConfirmRename()}
              disabled={renaming || !renameValue.trim() || renameValue.trim() === device.name}
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
              <span>{t.disconnect_device}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Devices() {
  const { t } = useI18n();
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

  async function handleRenameDevice(deviceId: string, nextName: string): Promise<void> {
    const updated = await apiPatch<DeviceInfo>(`/devices/${deviceId}`, { name: nextName });
    setDevices((prev) =>
      prev.map((device) =>
        device.device_id === deviceId ? { ...device, ...updated } : device
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
  }, [connectModalOpen]);

  function resetConnectModal() {
    setConnectModalOpen(false);
    setConnectMessage(null);
    setNewDeviceName("");
    setNewDeviceLocation("");
    setNewDeviceTransport("wifi");
  }

  function handleConnectDevice() {
    if (!newDeviceName.trim()) {
      setConnectMessage(t.device_name_required);
      return;
    }

    setConnectMessage(t.connect_ready);
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
            <span>{t.connect_new_device}</span>
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
              {t.connect_new_device}
            </h3>
            <p className="devices-connect-subtitle text-secondary">
              {t.connect_new_device_subtitle}
            </p>

            <div className="devices-connect-form">
              <div className="form-group">
                <label className="form-label">{t.device_name_label}</label>
                <input
                  className="form-input"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder={t.device_name_placeholder}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t.location_label}</label>
                <input
                  className="form-input"
                  value={newDeviceLocation}
                  onChange={(e) => setNewDeviceLocation(e.target.value)}
                  placeholder={t.location_placeholder}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t.connection_type_label}</label>
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
                {t.close}
              </button>
              <button className="btn btn-primary" onClick={handleConnectDevice}>
                {t.connect}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
