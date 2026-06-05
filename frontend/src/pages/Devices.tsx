// Devices page: expandable device list with sensor details

import { useState, useEffect, type MouseEvent } from "react";
import { apiGet, apiPatch } from "../api";
import { useI18n } from "../contexts/I18nContext";
import { useSettingsState } from "../contexts/SettingsStateContext";
import { REAL_BEDROOM_DEVICE_ID, REAL_OFFICE_DEVICE_ID, useDashboard } from "../contexts/DashboardContext";
import type { DeviceInfo, EnvironmentalReading, EnvironmentMode } from "../types";
import { Cpu, Battery, Clock, ChevronDown, Co2Molecule, Thermometer, Droplets, Activity, Sun, Volume2, LogOut, Search, Wifi, Bluetooth, X } from "../components/Icons";
import { sortDevicesByStatus } from "../utils/deviceSorting";
import { timeAgo } from "../utils/dateTime";
import { useExpandedDevices } from "../contexts/ExpandedDevicesContext";
import { DEVICE_SENSOR_FIELDS as sensorFields } from "../constants/chartColors";
import { getDisplayDeviceName } from "../utils/deviceDisplayName";
import { withMockModeSuffix } from "../utils/modeLabels";

const ALL_ENV_MODES: EnvironmentMode[] = [
  "sleep",
  "office",
  "sport",
  "outdoor",
  "school",
  "factory",
  "greenhouse",
];

const LOCKED_MODE_DEVICE_IDS: Partial<Record<EnvironmentMode, string>> = {
  office: REAL_OFFICE_DEVICE_ID,
};

const DEVICE_PAGE_ORDER: Record<string, number> = {
  [REAL_OFFICE_DEVICE_ID]: 0,
  "esp32-002": 10,
  "esp32-004": 11,
  "esp32-005": 12,
};

const sensorIconMap: Record<string, typeof Co2Molecule> = {
  co2_ppm: Co2Molecule,
  temperature_c: Thermometer,
  humidity_pct: Droplets,
  pressure_hpa: Activity,
  light_lux: Sun,
  sound_level_adc: Volume2,
};

type DiscoveryTransport = "usb" | "ble" | "wifi";
type DiscoveryBusyTarget = DiscoveryTransport | "known";

interface DiscoveryCandidate {
  id: string;
  name: string;
  transport: DiscoveryTransport;
  methodLabel: string;
  statusLabel: string;
  detail: string;
  selectable?: boolean;
}

interface SerialPortInfoLike {
  usbVendorId?: number;
  usbProductId?: number;
}

interface SerialPortLike {
  getInfo?: () => SerialPortInfoLike;
}

interface SerialApiLike {
  getPorts: () => Promise<SerialPortLike[]>;
  requestPort: () => Promise<SerialPortLike>;
}

interface BluetoothDeviceLike {
  id?: string;
  name?: string;
}

interface BluetoothApiLike {
  getDevices?: () => Promise<BluetoothDeviceLike[]>;
  requestDevice: (options: { acceptAllDevices: boolean }) => Promise<BluetoothDeviceLike>;
}

type NavigatorWithDeviceDiscovery = Navigator & {
  serial?: SerialApiLike;
  bluetooth?: BluetoothApiLike;
};

function mergeDiscoveryCandidates(
  current: DiscoveryCandidate[],
  incoming: DiscoveryCandidate[],
): DiscoveryCandidate[] {
  const byId = new Map(current.map((candidate) => [candidate.id, candidate]));
  incoming.forEach((candidate) => byId.set(candidate.id, candidate));
  return Array.from(byId.values());
}

function formatUsbId(value: number | undefined): string | null {
  if (typeof value !== "number") return null;
  return `0x${value.toString(16).padStart(4, "0").toUpperCase()}`;
}

function isVisibleDeviceOnDevicesPage(device: DeviceInfo): boolean {
  return device.device_id !== REAL_BEDROOM_DEVICE_ID;
}

function sortDevicesForDevicesPage(devices: DeviceInfo[]): DeviceInfo[] {
  return sortDevicesByStatus(devices)
    .filter(isVisibleDeviceOnDevicesPage)
    .sort((a, b) => {
      const orderDiff = (DEVICE_PAGE_ORDER[a.device_id] ?? 100) - (DEVICE_PAGE_ORDER[b.device_id] ?? 100);
      if (orderDiff !== 0) return orderDiff;
      return a.name.localeCompare(b.name);
    });
}

function normalizeGatewayUrl(rawValue: string): string {
  const trimmed = rawValue.trim();
  if (!trimmed) throw new Error("Gateway URL is required.");

  const hasProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed);
  const parsed = new URL(hasProtocol ? trimmed : `http://${trimmed}`);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS gateway URLs are allowed.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Gateway URLs must not contain embedded usernames or passwords.");
  }

  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

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
  const { modeMetaOverrides } = useSettingsState();
  const {
    deviceModeAssignments,
    setDeviceModeAssignments,
  } = useDashboard();
  const { toggle: toggleExpand, isExpanded } = useExpandedDevices();
  const expanded = isExpanded(device.device_id);
  const deviceDisplayName = getDisplayDeviceName(device, t);
  const [reading, setReading] = useState<EnvironmentalReading | null>(null);
  const [loadingReading, setLoadingReading] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(deviceDisplayName);

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
    setRenameValue(deviceDisplayName);
  }, [deviceDisplayName]);

  // Translate sensor label keys
  function getSensorLabel(label: string): string {
    if (label in t) return (t as unknown as Record<string, string>)[label];
    return label;
  }

  async function handleConfirmRename() {
    const nextName = renameValue.trim();
    if (!nextName || nextName === deviceDisplayName || renaming) return;

    try {
      setRenaming(true);
      await onRenameDevice(device.device_id, nextName);
    } catch (err) {
      console.warn("Failed to rename device:", err);
      setRenameValue(deviceDisplayName);
    } finally {
      setRenaming(false);
    }
  }

  const assignedModes = deviceModeAssignments[device.device_id] ?? [];
  const getModeLabel = (envMode: EnvironmentMode, fallback: string) =>
    withMockModeSuffix(envMode, modeMetaOverrides[envMode]?.name ?? fallback);
  const modeLabels: Record<EnvironmentMode, string> = {
    sleep: getModeLabel("sleep", t.env_sleep),
    office: getModeLabel("office", t.env_office),
    sport: getModeLabel("sport", t.env_sport),
    outdoor: getModeLabel("outdoor", t.env_outdoor),
    school: getModeLabel("school", t.env_school),
    factory: getModeLabel("factory", t.env_factory),
    greenhouse: getModeLabel("greenhouse", t.env_greenhouse),
  };

  function getShortModeLabel(envMode: EnvironmentMode): string {
    const source = modeLabels[envMode] ?? envMode;
    return source.split("/")[0].trim();
  }

  function toggleModeAssignment(targetMode: EnvironmentMode) {
    if (LOCKED_MODE_DEVICE_IDS[targetMode]) return;

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
              disabled={renaming || !renameValue.trim() || renameValue.trim() === deviceDisplayName}
            >
              Confirm
            </button>
          </div>

          <div className="device-mode-row">
            <span className="device-mode-label">This device contributes to these modes:</span>
            <div className="device-mode-chips">
              {ALL_ENV_MODES.map((envMode) => {
                const isActive = assignedModes.includes(envMode);
                const lockedDeviceId = LOCKED_MODE_DEVICE_IDS[envMode];
                const isLockedRealChip = lockedDeviceId === device.device_id;
                const isUnavailableRealChip = !!lockedDeviceId && lockedDeviceId !== device.device_id;
                const isDisabled = isLockedRealChip || isUnavailableRealChip;

                return (
                  <button
                    key={envMode}
                    type="button"
                    className={`device-mode-chip ${isActive ? "active" : ""} ${isDisabled ? "locked" : ""}`}
                    onClick={() => toggleModeAssignment(envMode)}
                    disabled={isDisabled}
                    aria-pressed={isActive}
                    title={
                      isLockedRealChip
                        ? envMode === "office"
                          ? "Unicorn uses the real sensor device"
                          : "Bedroom uses the real sensor device"
                        : isUnavailableRealChip
                          ? envMode === "office"
                            ? "Unicorn is reserved for the real sensor device"
                            : "Bedroom is reserved for the real sensor device"
                          : isActive
                            ? "Click to remove mode"
                            : "Click to add mode"
                    }
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
  const { t, locale } = useI18n();
  const isCs = locale === "cs";
  const { modeMetaOverrides } = useSettingsState();
  const { setDeviceModeAssignments } = useDashboard();
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newDeviceModes, setNewDeviceModes] = useState<EnvironmentMode[]>([]);
  const [selectedDiscoveryCandidateId, setSelectedDiscoveryCandidateId] = useState<string | null>(null);
  const [savingNewDevice, setSavingNewDevice] = useState(false);
  const [connectMessage, setConnectMessage] = useState<string | null>(null);
  const [discoveryCandidates, setDiscoveryCandidates] = useState<DiscoveryCandidate[]>([]);
  const [discoveryBusy, setDiscoveryBusy] = useState<DiscoveryBusyTarget | null>(null);
  const [discoveryMessage, setDiscoveryMessage] = useState<string | null>(null);
  const [wifiGatewayUrl, setWifiGatewayUrl] = useState("");
  const [wifiGatewayName, setWifiGatewayName] = useState("");

  const discoveryText = {
    searchButton: isCs ? "Hledat zařízení" : "Search for devices",
    title: isCs ? "Hledat zařízení" : "Search for devices",
    subtitle: isCs
      ? "Najdi známá zařízení, vyber USB/Bluetooth zařízení přes bezpečný dialog prohlížeče nebo přidej Wi-Fi gateway ručně."
      : "Find known devices, choose a USB/Bluetooth device through the browser permission dialog, or add a Wi-Fi gateway manually.",
    usbTitle: "USB Serial",
    usbDescription: isCs
      ? "Pro ESP32 připojené k laptopu. Prohlížeč umí ukázat jen porty, ke kterým mu uživatel dá výslovný souhlas."
      : "For an ESP32 connected to the laptop. The browser can show only ports explicitly approved by the user.",
    usbAction: isCs ? "Vybrat USB port" : "Choose USB port",
    bleTitle: "Bluetooth LE",
    bleDescription: isCs
      ? "Použitelné pro budoucí firmware, který bude inzerovat BLE službu. Funguje jen po ručním výběru zařízení."
      : "For future firmware advertising a BLE service. It works only after manual device selection.",
    bleAction: isCs ? "Vybrat Bluetooth" : "Choose Bluetooth",
    wifiTitle: "Wi-Fi / Gateway",
    wifiDescription: isCs
      ? "Browser neumí bezpečně skenovat celou lokální síť. Zadej adresu gateway nebo použij zařízení nalezené backendem."
      : "The browser cannot safely scan the whole local network. Enter a gateway address or use a backend-known device.",
    manualGateway: isCs ? "Ruční Wi-Fi gateway" : "Manual Wi-Fi gateway",
    gatewayUrl: isCs ? "Gateway URL nebo IP" : "Gateway URL or IP",
    gatewayName: isCs ? "Název v aplikaci" : "Name in app",
    addGateway: isCs ? "Přidat gateway" : "Add gateway",
    results: isCs ? "Nalezená a známá zařízení" : "Found and known devices",
    noResults: isCs
      ? "Zatím tu nejsou žádná nově vybraná zařízení. Zkus USB, Bluetooth nebo přidej Wi-Fi gateway."
      : "No newly selected devices yet. Try USB, Bluetooth, or add a Wi-Fi gateway.",
    known: isCs ? "Známé" : "Known",
    reloadKnown: isCs ? "Načíst známá zařízení" : "Reload known devices",
    useDevice: isCs ? "Použít" : "Use device",
    close: t.close,
    securityTitle: isCs ? "Bezpečnost:" : "Security:",
    securityBody: isCs
      ? "aplikace nesmí potichu procházet USB, Bluetooth ani LAN. Každý přístup vyžaduje kliknutí, souhlas uživatele nebo adresu důvěryhodné gateway."
      : "the app must not silently enumerate USB, Bluetooth, or LAN devices. Each access requires a click, user permission, or a trusted gateway address.",
    busy: isCs ? "Čekám na prohlížeč..." : "Waiting for browser...",
  };
  const selectedDiscoveryCandidate =
    discoveryCandidates.find((candidate) => candidate.id === selectedDiscoveryCandidateId) ?? null;
  const canSaveNewDevice =
    discoveryCandidates.length > 0 && selectedDiscoveryCandidate !== null && newDeviceName.trim().length > 0;
  const connectModeHelp = selectedDiscoveryCandidate
    ? null
    : (isCs ? "Režimy půjde vybrat po nalezení a označení zařízení." : "Modes can be selected after a device is found and selected.");
  const getConnectModeLabel = (envMode: EnvironmentMode, fallback: string) =>
    withMockModeSuffix(envMode, modeMetaOverrides[envMode]?.name ?? fallback);
  const connectModeLabels: Record<EnvironmentMode, string> = {
    sleep: getConnectModeLabel("sleep", t.env_sleep),
    office: getConnectModeLabel("office", t.env_office),
    sport: getConnectModeLabel("sport", t.env_sport),
    outdoor: getConnectModeLabel("outdoor", t.env_outdoor),
    school: getConnectModeLabel("school", t.env_school),
    factory: getConnectModeLabel("factory", t.env_factory),
    greenhouse: getConnectModeLabel("greenhouse", t.env_greenhouse),
  };

  useEffect(() => {
    apiGet<DeviceInfo[]>("/devices")
      .then((devs) => setDevices(sortDevicesForDevicesPage(devs)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleRenameDevice(deviceId: string, nextName: string): Promise<void> {
    const updated = await apiPatch<DeviceInfo>(`/devices/${deviceId}`, { name: nextName });
    setDevices((prev) =>
      sortDevicesForDevicesPage(
        prev.map((device) =>
          device.device_id === deviceId ? { ...device, ...updated } : device
        )
      )
    );
  }

  function handleDisconnectDevice(deviceId: string) {
    setDevices((prev) => prev.filter((d) => d.device_id !== deviceId));
  }

  // Close modal on Escape key
  useEffect(() => {
    if (!connectModalOpen && !searchModalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (searchModalOpen) resetSearchModal();
      else resetConnectModal();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [connectModalOpen, searchModalOpen]);

  function resetConnectModal() {
    setConnectModalOpen(false);
    setConnectMessage(null);
    setNewDeviceName("");
    setNewDeviceModes([]);
    setSelectedDiscoveryCandidateId(null);
    setSavingNewDevice(false);
  }

  function resetSearchModal() {
    setSearchModalOpen(false);
    setDiscoveryBusy(null);
    setDiscoveryMessage(null);
  }

  function handleConnectOverlayMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) resetConnectModal();
  }

  function handleSearchOverlayMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) resetSearchModal();
  }

  function addDiscoveryCandidates(candidates: DiscoveryCandidate[]) {
    setDiscoveryCandidates((prev) => mergeDiscoveryCandidates(prev, candidates));
  }

  function buildKnownDeviceCandidates(): DiscoveryCandidate[] {
    return devices.map((device) => ({
      id: `backend:${device.device_id}`,
      name: getDisplayDeviceName(device, t),
      transport: "wifi",
      methodLabel: isCs ? "Backend / cloud" : "Backend / cloud",
      statusLabel: device.status === "online"
        ? (isCs ? "Online" : "Online")
        : device.status === "error"
          ? (isCs ? "Chyba" : "Error")
          : (isCs ? "Offline" : "Offline"),
      detail: isCs
        ? `Registrováno v backendu. Umístění: ${device.location || "bez umístění"}. Poslední data: ${timeAgo(device.last_seen)} ${t.ago}.`
        : `Registered in backend. Location: ${device.location || "no location"}. Last data: ${timeAgo(device.last_seen)} ${t.ago}.`,
    }));
  }

  function buildUsbCandidate(port: SerialPortLike, index: number, statusLabel: string): DiscoveryCandidate {
    const info = port.getInfo?.() ?? {};
    const vendor = formatUsbId(info.usbVendorId);
    const product = formatUsbId(info.usbProductId);
    const hardwareLabel = [vendor && `VID ${vendor}`, product && `PID ${product}`].filter(Boolean).join(" / ");
    const displayIndex = index > 100000 ? 1 : index + 1;

    return {
      id: `usb:${vendor ?? "unknown"}:${product ?? "unknown"}:${index}`,
      name: hardwareLabel ? `USB serial ${hardwareLabel}` : `USB serial device ${displayIndex}`,
      transport: "usb",
      methodLabel: "USB Serial",
      statusLabel,
      detail: hardwareLabel
        ? (isCs
          ? `Port má povolení pro tento web. ${hardwareLabel}. Pro ESP32 se následně použije sériový přenos nebo lokální gateway.`
          : `This site has permission for the port. ${hardwareLabel}. For ESP32, the next step is serial transfer or a local gateway.`)
        : (isCs
          ? "Port má povolení pro tento web, ale prohlížeč nevrátil VID/PID. Název ověř podle fyzického zařízení."
          : "This site has permission for the port, but the browser did not return VID/PID. Verify the name against the physical device."),
    };
  }

  async function refreshKnownDiscovery() {
    setDiscoveryBusy("known");
    setDiscoveryMessage(null);
    addDiscoveryCandidates(buildKnownDeviceCandidates());

    const nav = navigator as NavigatorWithDeviceDiscovery;
    const additions: DiscoveryCandidate[] = [];

    if (nav.serial) {
      try {
        const ports = await nav.serial.getPorts();
        additions.push(...ports.map((port, index) =>
          buildUsbCandidate(port, index, isCs ? "Již povoleno" : "Already allowed")
        ));
      } catch (err) {
        console.warn("Failed to read authorized serial ports:", err);
      }
    }

    if (nav.bluetooth?.getDevices) {
      try {
        const bluetoothDevices = await nav.bluetooth.getDevices();
        additions.push(...bluetoothDevices.map((device, index) => ({
          id: `ble:${device.id ?? index}`,
          name: device.name?.trim() || `Bluetooth LE device ${index + 1}`,
          transport: "ble" as const,
          methodLabel: "Bluetooth LE",
          statusLabel: isCs ? "Již povoleno" : "Already allowed",
          detail: isCs
            ? "Bluetooth zařízení už má pro tento web povolení. Připojení bude fungovat jen s firmwarem, který nabízí kompatibilní BLE službu."
            : "This Bluetooth device is already allowed for this site. Pairing works only with firmware exposing a compatible BLE service.",
        })));
      } catch (err) {
        console.warn("Failed to read authorized Bluetooth devices:", err);
      }
    }

    if (additions.length > 0) {
      addDiscoveryCandidates(additions);
      setDiscoveryMessage(isCs
        ? "Načetl jsem známá backendová zařízení a již povolené browser porty."
        : "Loaded backend-known devices and browser-approved ports.");
    } else {
      setDiscoveryMessage(isCs
        ? "Načetl jsem známá backendová zařízení. Nový USB/Bluetooth přístup vyžaduje ruční výběr."
        : "Loaded backend-known devices. New USB/Bluetooth access requires manual selection.");
    }

    setDiscoveryBusy(null);
  }

  async function handleUsbDiscovery() {
    const nav = navigator as NavigatorWithDeviceDiscovery;
    if (!window.isSecureContext) {
      setDiscoveryMessage(isCs
        ? "USB Serial funguje jen v bezpečném kontextu: localhost nebo HTTPS."
        : "USB Serial works only in a secure context: localhost or HTTPS.");
      return;
    }
    if (!nav.serial) {
      setDiscoveryMessage(isCs
        ? "Tento prohlížeč nepodporuje Web Serial. Použij Chrome/Edge nebo lokální Node-RED gateway."
        : "This browser does not support Web Serial. Use Chrome/Edge or the local Node-RED gateway.");
      return;
    }

    try {
      setDiscoveryBusy("usb");
      setDiscoveryMessage(null);
      const port = await nav.serial.requestPort();
      addDiscoveryCandidates([buildUsbCandidate(port, Date.now(), isCs ? "Vybráno nyní" : "Selected now")]);
      setDiscoveryMessage(isCs
        ? "USB port byl vybrán. Teď ho můžeš použít jako profil zařízení nebo ponechat sběr přes Node-RED gateway."
        : "USB port selected. You can use it as a device profile or keep collecting through the Node-RED gateway.");
    } catch (err) {
      setDiscoveryMessage(isCs
        ? "Výběr USB portu byl zrušen nebo zamítnut."
        : "USB port selection was cancelled or denied.");
    } finally {
      setDiscoveryBusy(null);
    }
  }

  async function handleBluetoothDiscovery() {
    const nav = navigator as NavigatorWithDeviceDiscovery;
    if (!window.isSecureContext) {
      setDiscoveryMessage(isCs
        ? "Bluetooth discovery funguje jen v bezpečném kontextu: localhost nebo HTTPS."
        : "Bluetooth discovery works only in a secure context: localhost or HTTPS.");
      return;
    }
    if (!nav.bluetooth) {
      setDiscoveryMessage(isCs
        ? "Tento prohlížeč nepodporuje Web Bluetooth. Pro naše aktuální ESP32 měření používej USB/Node-RED gateway."
        : "This browser does not support Web Bluetooth. For the current ESP32 measurements, use USB/Node-RED gateway.");
      return;
    }

    try {
      setDiscoveryBusy("ble");
      setDiscoveryMessage(null);
      const device = await nav.bluetooth.requestDevice({ acceptAllDevices: true });
      addDiscoveryCandidates([{
        id: `ble:${device.id ?? Date.now()}`,
        name: device.name?.trim() || "Bluetooth LE device",
        transport: "ble",
        methodLabel: "Bluetooth LE",
        statusLabel: isCs ? "Vybráno nyní" : "Selected now",
        detail: isCs
          ? "Prohlížeč má oprávnění k tomuto BLE zařízení. Skutečné čtení dat vyžaduje firmware s kompatibilní GATT službou."
          : "The browser has permission for this BLE device. Real data reading requires firmware with a compatible GATT service.",
      }]);
      setDiscoveryMessage(isCs
        ? "Bluetooth zařízení bylo vybráno. Pro produkci bude potřeba přesně filtrovat naši BLE službu."
        : "Bluetooth device selected. Production pairing should filter for our exact BLE service.");
    } catch (err) {
      setDiscoveryMessage(isCs
        ? "Výběr Bluetooth zařízení byl zrušen nebo zamítnut."
        : "Bluetooth device selection was cancelled or denied.");
    } finally {
      setDiscoveryBusy(null);
    }
  }

  function handleAddWifiGateway() {
    try {
      const url = normalizeGatewayUrl(wifiGatewayUrl);
      const parsed = new URL(url);
      const name = wifiGatewayName.trim() || `Gateway ${parsed.host}`;

      addDiscoveryCandidates([{
        id: `wifi:${url}`,
        name,
        transport: "wifi",
        methodLabel: "Wi-Fi / Gateway",
        statusLabel: isCs ? "Ručně zadáno" : "Manual",
        detail: isCs
          ? `Gateway endpoint: ${url}. Před čtením dat musí backend/Node-RED ověřit, že jde o důvěryhodnou Team2App gateway.`
          : `Gateway endpoint: ${url}. Before reading data, backend/Node-RED must verify that it is a trusted Team2App gateway.`,
      }]);
      setWifiGatewayUrl("");
      setWifiGatewayName("");
      setDiscoveryMessage(isCs
        ? "Wi-Fi gateway byla přidána do seznamu kandidátů."
        : "Wi-Fi gateway added to the candidate list.");
    } catch (err) {
      setDiscoveryMessage(err instanceof Error ? err.message : "Invalid gateway URL.");
    }
  }

  function useDiscoveryCandidate(candidate: DiscoveryCandidate) {
    if (candidate.selectable === false) return;
    setSelectedDiscoveryCandidateId(candidate.id);
    setNewDeviceName(candidate.name);
    setNewDeviceModes([]);
    setConnectMessage(isCs
      ? "Profil byl předvyplněn z vyhledávání. Před uložením ověř, že zařízení skutečně patří k projektu."
      : "Profile prefilled from discovery. Verify that the device really belongs to the project before saving.");
    setSearchModalOpen(false);
    setConnectModalOpen(true);
  }

  function getShortModeLabel(envMode: EnvironmentMode): string {
    const source = connectModeLabels[envMode] ?? envMode;
    return source.split("/")[0].trim();
  }

  function toggleNewDeviceMode(targetMode: EnvironmentMode) {
    if (!selectedDiscoveryCandidate) return;

    setNewDeviceModes((prev) => {
      const current = new Set(prev);
      if (current.has(targetMode)) current.delete(targetMode);
      else current.add(targetMode);
      return ALL_ENV_MODES.filter((mode) => current.has(mode));
    });
  }

  async function handleConnectDevice() {
    if (discoveryCandidates.length === 0 || !selectedDiscoveryCandidate) {
      setConnectMessage(isCs ? "Nejdřív najdi a vyber zařízení." : "Find and select a device first.");
      return;
    }

    if (!newDeviceName.trim()) {
      setConnectMessage(t.device_name_required);
      return;
    }

    try {
      setSavingNewDevice(true);
      const backendDeviceId = selectedDiscoveryCandidate.id.startsWith("backend:")
        ? selectedDiscoveryCandidate.id.slice("backend:".length)
        : null;

      if (backendDeviceId) {
        await handleRenameDevice(backendDeviceId, newDeviceName.trim());

        if (newDeviceModes.length > 0) {
          setDeviceModeAssignments((prev) => ({
            ...prev,
            [backendDeviceId]: newDeviceModes,
          }));
        }
      }

      setConnectMessage(isCs ? "Zařízení bylo uloženo." : "Device saved.");
    } catch (err) {
      setConnectMessage(err instanceof Error ? err.message : t.error);
    } finally {
      setSavingNewDevice(false);
    }
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
        <div className="modal-overlay" onMouseDown={handleConnectOverlayMouseDown}>
          <div
            className="modal-card devices-connect-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="connect-device-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="devices-modal-title-row">
              <div>
                <h3 className="devices-connect-title" id="connect-device-title">
                  {t.connect_new_device}
                </h3>
              </div>
              <button
                type="button"
                className="devices-modal-close"
                onClick={resetConnectModal}
                aria-label={isCs ? "Zavřít" : "Close"}
                title={isCs ? "Zavřít" : "Close"}
              >
                <X size={17} />
              </button>
            </div>

            <button
              type="button"
              className="btn btn-primary devices-connect-search-action"
              onClick={() => void refreshKnownDiscovery()}
              disabled={discoveryBusy !== null}
            >
              <Search size={18} />
              <span>{discoveryBusy === "known" ? discoveryText.busy : discoveryText.searchButton}</span>
            </button>

            {(discoveryCandidates.length > 0 || discoveryMessage) && (
              <section className="devices-connect-discovery">
                {discoveryCandidates.length === 0 ? (
                  <p className="device-discovery-empty">{discoveryText.noResults}</p>
                ) : (
                  <div className="device-discovery-result-list devices-connect-result-list">
                    {discoveryCandidates.map((candidate) => {
                      const isSelected = candidate.id === selectedDiscoveryCandidateId;
                      return (
                        <button
                          key={candidate.id}
                          type="button"
                          className={`device-discovery-result devices-connect-result ${isSelected ? "selected" : ""}`}
                          onClick={() => useDiscoveryCandidate(candidate)}
                          aria-pressed={isSelected}
                        >
                          <div>
                            <div className="device-discovery-result-heading">
                              <span>{candidate.name}</span>
                              <small>{candidate.statusLabel}</small>
                            </div>
                            <p>{candidate.methodLabel}</p>
                            <p>{candidate.detail}</p>
                          </div>
                          <span className="devices-connect-selected-indicator">
                            {isSelected ? (isCs ? "Vybráno" : "Selected") : (isCs ? "Vybrat" : "Select")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

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
            </div>

            <div className="device-mode-row devices-connect-mode-row">
              <span className="device-mode-label">This device contributes to these modes:</span>
              <div className="device-mode-chips">
                {ALL_ENV_MODES.map((envMode) => {
                  const isActive = newDeviceModes.includes(envMode);

                  return (
                    <button
                      key={envMode}
                      type="button"
                      className={`device-mode-chip ${isActive ? "active" : ""}`}
                      onClick={() => toggleNewDeviceMode(envMode)}
                      disabled={!selectedDiscoveryCandidate}
                      aria-pressed={isActive}
                      title={connectModeHelp ?? (isActive ? "Click to remove mode" : "Click to add mode")}
                    >
                      {getShortModeLabel(envMode)}
                    </button>
                  );
                })}
              </div>
              {connectModeHelp && <p className="devices-connect-mode-help">{connectModeHelp}</p>}
            </div>

            {connectMessage && <p className="devices-connect-message">{connectMessage}</p>}

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={resetConnectModal}>
                {t.close}
              </button>
              <button className="btn btn-primary" onClick={() => void handleConnectDevice()} disabled={!canSaveNewDevice || savingNewDevice}>
                {savingNewDevice ? (isCs ? "Ukládám..." : "Saving...") : (isCs ? "Uložit" : "Save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {searchModalOpen && (
        <div className="modal-overlay" onMouseDown={handleSearchOverlayMouseDown}>
          <div
            className="modal-card devices-search-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-devices-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="devices-search-modal-header">
              <div>
                <h3 className="devices-connect-title" id="search-devices-title">{discoveryText.title}</h3>
                <p className="devices-connect-subtitle text-secondary">{discoveryText.subtitle}</p>
              </div>
              <button
                type="button"
                className="devices-modal-close"
                onClick={resetSearchModal}
                aria-label={isCs ? "Zavřít" : "Close"}
                title={isCs ? "Zavřít" : "Close"}
              >
                <X size={17} />
              </button>
            </div>

            <div className="device-discovery-grid">
              <section className="device-discovery-card">
                <div className="device-discovery-card-title">
                  <Cpu size={17} />
                  <h4>{discoveryText.usbTitle}</h4>
                </div>
                <p>{discoveryText.usbDescription}</p>
                <button
                  className="btn btn-outline btn-sm"
                  type="button"
                  onClick={() => void handleUsbDiscovery()}
                  disabled={discoveryBusy !== null}
                >
                  {discoveryBusy === "usb" ? discoveryText.busy : discoveryText.usbAction}
                </button>
              </section>

              <section className="device-discovery-card">
                <div className="device-discovery-card-title">
                  <Bluetooth size={17} />
                  <h4>{discoveryText.bleTitle}</h4>
                </div>
                <p>{discoveryText.bleDescription}</p>
                <button
                  className="btn btn-outline btn-sm"
                  type="button"
                  onClick={() => void handleBluetoothDiscovery()}
                  disabled={discoveryBusy !== null}
                >
                  {discoveryBusy === "ble" ? discoveryText.busy : discoveryText.bleAction}
                </button>
              </section>

              <section className="device-discovery-card">
                <div className="device-discovery-card-title">
                  <Wifi size={17} />
                  <h4>{discoveryText.wifiTitle}</h4>
                </div>
                <p>{discoveryText.wifiDescription}</p>
                <button
                  className="btn btn-outline btn-sm"
                  type="button"
                  onClick={() => void refreshKnownDiscovery()}
                  disabled={discoveryBusy !== null}
                >
                  {discoveryBusy === "known" ? discoveryText.busy : discoveryText.reloadKnown}
                </button>
              </section>
            </div>

            <section className="device-discovery-manual">
              <h4>{discoveryText.manualGateway}</h4>
              <div className="device-discovery-manual-grid">
                <div className="form-group">
                  <label className="form-label">{discoveryText.gatewayUrl}</label>
                  <input
                    className="form-input"
                    value={wifiGatewayUrl}
                    onChange={(e) => setWifiGatewayUrl(e.target.value)}
                    placeholder="192.168.1.20:1881"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{discoveryText.gatewayName}</label>
                  <input
                    className="form-input"
                    value={wifiGatewayName}
                    onChange={(e) => setWifiGatewayName(e.target.value)}
                    placeholder="Unicorn gateway"
                  />
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  type="button"
                  onClick={handleAddWifiGateway}
                  disabled={!wifiGatewayUrl.trim()}
                >
                  {discoveryText.addGateway}
                </button>
              </div>
            </section>

            <div className="device-discovery-security-note">
              <strong>{discoveryText.securityTitle}</strong> {discoveryText.securityBody}
            </div>

            <section className="device-discovery-results">
              <h4>{discoveryText.results}</h4>
              {discoveryCandidates.length === 0 ? (
                <p className="device-discovery-empty">{discoveryText.noResults}</p>
              ) : (
                <div className="device-discovery-result-list">
                  {discoveryCandidates.map((candidate) => (
                    <article key={candidate.id} className="device-discovery-result">
                      <div>
                        <div className="device-discovery-result-heading">
                          <span>{candidate.name}</span>
                          <small>{candidate.statusLabel}</small>
                        </div>
                        <p>{candidate.methodLabel}</p>
                        <p>{candidate.detail}</p>
                      </div>
                      {candidate.selectable === false ? (
                        <span className="device-discovery-known-pill">{discoveryText.known}</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => useDiscoveryCandidate(candidate)}
                        >
                          {discoveryText.useDevice}
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            {discoveryMessage && <p className="devices-connect-message">{discoveryMessage}</p>}

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={resetSearchModal}>
                {discoveryText.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
