
import { useState, useEffect, type MouseEvent } from "react";
import { apiDelete, apiGet, apiPatch } from "../api";
import { useI18n } from "../contexts/I18nContext";
import { useSettingsState } from "../contexts/SettingsStateContext";
import { REAL_BEDROOM_DEVICE_ID, REAL_OFFICE_DEVICE_ID, useDashboard } from "../contexts/DashboardContext";
import type { DeviceInfo, EnvironmentalReading, EnvironmentMode } from "../types";
import { Cpu, Battery, Clock, ChevronDown, Co2Molecule, Thermometer, Droplets, Activity, Sun, Volume2, LogOut, Search, Wifi, X } from "../components/Icons";
import { sortDevicesByStatus } from "../utils/deviceSorting";
import { timeAgo } from "../utils/dateTime";
import { useExpandedDevices } from "../contexts/ExpandedDevicesContext";
import { DEVICE_SENSOR_FIELDS as sensorFields } from "../constants/chartColors";
import { getDisplayDeviceName } from "../utils/deviceDisplayName";
import { withMockModeSuffix } from "../utils/modeLabels";
import { ModalPortal } from "../components/ModalPortal";

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

function hasMeasuredBatteryVoltage(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

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

type DiscoveryTransport = "usb" | "wifi";
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

type NavigatorWithDeviceDiscovery = Navigator & {
  serial?: SerialApiLike;
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

function filterDisconnectedDevices(devices: DeviceInfo[], disconnectedDeviceIds: Set<string>): DeviceInfo[] {
  return devices.filter((device) => !disconnectedDeviceIds.has(device.device_id));
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
  const { t, locale } = useI18n();
  const isCs = locale === "cs";
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
            <b>LOLIN32 ESP32</b> â€” main board, 240 MHz, WiFi/Bluetooth
            {" Â· "}
            <b>MH-Z19B</b> â€” CO2 sensor, 0â€“5000 ppm
            {" Â· "}
            <b>BME280</b> â€” temperature, humidity &amp; pressure sensor
            {" Â· "}
            <b>BH1750</b> â€” ambient light sensor, 1â€“65535 lux
            {" Â· "}
            <b>MAX9814</b> â€” microphone module for noise detection
          </div>

          <div className="device-meta-group device-meta-group--left">
            <div className="device-meta">
              <Clock size={12} />
              <span>Last data: {timeAgo(device.last_seen)} {t.ago}</span>
            </div>
            {hasMeasuredBatteryVoltage(device.battery_v) && (
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
            >
              Confirm
            </button>
          </div>

          <div className="device-mode-row">
            <span className="device-mode-label">
              {isCs ? "Toto zaĹ™Ă­zenĂ­ poskytuje data pro tyto reĹľimy:" : "This device contributes to these modes:"}
            </span>
            <div className="device-mode-chips">
              {ALL_ENV_MODES.map((envMode) => {
                const isActive = assignedModes.includes(envMode);
                const lockedDeviceId = LOCKED_MODE_DEVICE_IDS[envMode];
                const isLockedRealChip = lockedDeviceId === device.device_id;
                const isUnavailableRealChip = !!lockedDeviceId && lockedDeviceId !== device.device_id;

                return (
                  <button
                    key={envMode}
                    type="button"
                    onClick={() => toggleModeAssignment(envMode)}
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

          <h4 className="device-measures-heading">{isCs ? "Toto zaĹ™Ă­zenĂ­ mÄ›Ĺ™Ă­:" : "This device measures:"}</h4>
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
  const { disconnectedDeviceIds, setDisconnectedDeviceIds, setDeviceModeAssignments } = useDashboard();
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
  const [disconnectTarget, setDisconnectTarget] = useState<DeviceInfo | null>(null);
  const [disconnectingDevice, setDisconnectingDevice] = useState(false);
  const [disconnectMessage, setDisconnectMessage] = useState<string | null>(null);

  const discoveryText = {
    searchButton: isCs ? "Hledat zaĹ™Ă­zenĂ­" : "Search for devices",
    title: isCs ? "Hledat zaĹ™Ă­zenĂ­" : "Search for devices",
    subtitle: isCs
      ? "Najdi znĂˇmĂˇ zaĹ™Ă­zenĂ­, vyber USB zaĹ™Ă­zenĂ­ pĹ™es bezpeÄŤnĂ˝ dialog prohlĂ­ĹľeÄŤe nebo pĹ™idej Wi-Fi gateway ruÄŤnÄ›."
      : "Find known devices, choose a USB device through the browser permission dialog, or add a Wi-Fi gateway manually.",
    usbTitle: "USB Serial",
    usbDescription: isCs
      ? "Pro ESP32 pĹ™ipojenĂ© k laptopu. ProhlĂ­ĹľeÄŤ umĂ­ ukĂˇzat jen porty, ke kterĂ˝m mu uĹľivatel dĂˇ vĂ˝slovnĂ˝ souhlas."
      : "For an ESP32 connected to the laptop. The browser can show only ports explicitly approved by the user.",
    usbAction: isCs ? "Vybrat USB port" : "Choose USB port",
    wifiTitle: "Wi-Fi / Gateway",
    wifiDescription: isCs
      ? "Browser neumĂ­ bezpeÄŤnÄ› skenovat celou lokĂˇlnĂ­ sĂ­ĹĄ. Zadej adresu gateway nebo pouĹľij zaĹ™Ă­zenĂ­ nalezenĂ© backendem."
      : "The browser cannot safely scan the whole local network. Enter a gateway address or use a backend-known device.",
    manualGateway: isCs ? "RuÄŤnĂ­ Wi-Fi gateway" : "Manual Wi-Fi gateway",
    gatewayUrl: isCs ? "Gateway URL nebo IP" : "Gateway URL or IP",
    gatewayName: isCs ? "NĂˇzev v aplikaci" : "Name in app",
    addGateway: isCs ? "PĹ™idat gateway" : "Add gateway",
    results: isCs ? "NalezenĂˇ a znĂˇmĂˇ zaĹ™Ă­zenĂ­" : "Found and known devices",
    noResults: isCs
      ? "ZatĂ­m tu nejsou ĹľĂˇdnĂˇ novÄ› vybranĂˇ zaĹ™Ă­zenĂ­. Zkus USB nebo pĹ™idej Wi-Fi gateway."
      : "No newly selected devices yet. Try USB or add a Wi-Fi gateway.",
    known: isCs ? "ZnĂˇmĂ©" : "Known",
    reloadKnown: isCs ? "NaÄŤĂ­st znĂˇmĂˇ zaĹ™Ă­zenĂ­" : "Reload known devices",
    useDevice: isCs ? "PouĹľĂ­t" : "Use device",
    close: t.close,
    securityTitle: isCs ? "BezpeÄŤnost:" : "Security:",
    securityBody: isCs
      ? "aplikace nesmĂ­ potichu prochĂˇzet USB, Bluetooth ani LAN. KaĹľdĂ˝ pĹ™Ă­stup vyĹľaduje kliknutĂ­, souhlas uĹľivatele nebo adresu dĹŻvÄ›ryhodnĂ© gateway."
      : "the app must not silently enumerate USB or LAN devices. Each access requires a click, user permission, or a trusted gateway address.",
    busy: isCs ? "ÄŚekĂˇm na prohlĂ­ĹľeÄŤ..." : "Waiting for browser...",
  };
  const selectedDiscoveryCandidate =
    discoveryCandidates.find((candidate) => candidate.id === selectedDiscoveryCandidateId) ?? null;
  const canSaveNewDevice =
    discoveryCandidates.length > 0 && selectedDiscoveryCandidate !== null && newDeviceName.trim().length > 0;
  const connectSearchButtonLabel = isCs ? "Hledat zaĹ™Ă­zenĂ­" : "Search for devices";
  const connectBusyLabel = isCs ? "ÄŚekĂˇm na prohlĂ­ĹľeÄŤ..." : "Waiting for browser...";
  const connectModeSectionLabel = isCs
    ? "Toto zaĹ™Ă­zenĂ­ bude poskytovat data pro tyto reĹľimy:"
    : "This device contributes to these modes:";
  const connectSelectedLabel = isCs ? "VybrĂˇno" : "Selected";
  const connectSelectLabel = isCs ? "Vybrat" : "Select";
  const connectSaveLabel = isCs ? "UloĹľit" : "Save";
  const connectSavingLabel = isCs ? "UklĂˇdĂˇm..." : "Saving...";
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
      .then((devs) => setDevices(filterDisconnectedDevices(sortDevicesForDevicesPage(devs), disconnectedDeviceIds)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [disconnectedDeviceIds]);

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
    const device = devices.find((candidate) => candidate.device_id === deviceId);
    if (!device) return;
    setDisconnectMessage(null);
    setDisconnectTarget(device);
  }

  // Close modal on Escape key
  useEffect(() => {
    if (!connectModalOpen && !searchModalOpen && !disconnectTarget) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (disconnectTarget) resetDisconnectModal();
      else if (searchModalOpen) resetSearchModal();
      else resetConnectModal();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [connectModalOpen, disconnectTarget, searchModalOpen]);

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

  function resetDisconnectModal() {
    if (disconnectingDevice) return;
    setDisconnectTarget(null);
    setDisconnectMessage(null);
  }

  function handleConnectOverlayMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) resetConnectModal();
  }

  function handleSearchOverlayMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) resetSearchModal();
  }

  function handleDisconnectOverlayMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) resetDisconnectModal();
  }

  async function confirmDisconnectDevice() {
    if (!disconnectTarget || disconnectingDevice) return;

    try {
      setDisconnectingDevice(true);
      setDisconnectMessage(null);
      await apiDelete<{ ok: boolean; device_id: string }>(`/devices/${encodeURIComponent(disconnectTarget.device_id)}`);

      setDisconnectedDeviceIds((prev) => {
        const next = new Set(prev);
        next.add(disconnectTarget.device_id);
        return next;
      });
      setDeviceModeAssignments((prev) => {
        const next = { ...prev };
        delete next[disconnectTarget.device_id];
        return next;
      });
      setDevices((prev) => prev.filter((device) => device.device_id !== disconnectTarget.device_id));
      setDisconnectTarget(null);
    } catch (err) {
      setDisconnectMessage(err instanceof Error ? err.message : t.error);
    } finally {
      setDisconnectingDevice(false);
    }
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
        ? `RegistrovĂˇno v backendu. UmĂ­stÄ›nĂ­: ${device.location || "bez umĂ­stÄ›nĂ­"}. PoslednĂ­ data: ${timeAgo(device.last_seen)} ${t.ago}.`
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
          ? `Port mĂˇ povolenĂ­ pro tento web. ${hardwareLabel}. Pro ESP32 se nĂˇslednÄ› pouĹľije sĂ©riovĂ˝ pĹ™enos nebo lokĂˇlnĂ­ gateway.`
          : `This site has permission for the port. ${hardwareLabel}. For ESP32, the next step is serial transfer or a local gateway.`)
        : (isCs
          ? "Port mĂˇ povolenĂ­ pro tento web, ale prohlĂ­ĹľeÄŤ nevrĂˇtil VID/PID. NĂˇzev ovÄ›Ĺ™ podle fyzickĂ©ho zaĹ™Ă­zenĂ­."
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
          buildUsbCandidate(port, index, isCs ? "JiĹľ povoleno" : "Already allowed")
        ));
      } catch (err) {
        console.warn("Failed to read authorized serial ports:", err);
      }
    }

    if (additions.length > 0) {
      addDiscoveryCandidates(additions);
      setDiscoveryMessage(isCs
        ? "NaÄŤetl jsem znĂˇmĂˇ backendovĂˇ zaĹ™Ă­zenĂ­ a jiĹľ povolenĂ© browser porty."
        : "Loaded backend-known devices and browser-approved ports.");
    } else {
      setDiscoveryMessage(isCs
        ? "NaÄŤetl jsem znĂˇmĂˇ backendovĂˇ zaĹ™Ă­zenĂ­. NovĂ˝ USB pĹ™Ă­stup vyĹľaduje ruÄŤnĂ­ vĂ˝bÄ›r."
        : "Loaded backend-known devices. New USB access requires manual selection.");
    }

    setDiscoveryBusy(null);
  }

  async function handleUsbDiscovery() {
    const nav = navigator as NavigatorWithDeviceDiscovery;
    if (!window.isSecureContext) {
      setDiscoveryMessage(isCs
        ? "USB Serial funguje jen v bezpeÄŤnĂ©m kontextu: localhost nebo HTTPS."
        : "USB Serial works only in a secure context: localhost or HTTPS.");
      return;
    }
    if (!nav.serial) {
      setDiscoveryMessage(isCs
        ? "Tento prohlĂ­ĹľeÄŤ nepodporuje Web Serial. PouĹľij Chrome/Edge nebo lokĂˇlnĂ­ Node-RED gateway."
        : "This browser does not support Web Serial. Use Chrome/Edge or the local Node-RED gateway.");
      return;
    }

    try {
      setDiscoveryBusy("usb");
      setDiscoveryMessage(null);
      const port = await nav.serial.requestPort();
      addDiscoveryCandidates([buildUsbCandidate(port, Date.now(), isCs ? "VybrĂˇno nynĂ­" : "Selected now")]);
      setDiscoveryMessage(isCs
        ? "USB port byl vybrĂˇn. TeÄŹ ho mĹŻĹľeĹˇ pouĹľĂ­t jako profil zaĹ™Ă­zenĂ­ nebo ponechat sbÄ›r pĹ™es Node-RED gateway."
        : "USB port selected. You can use it as a device profile or keep collecting through the Node-RED gateway.");
    } catch (err) {
      setDiscoveryMessage(isCs
        ? "VĂ˝bÄ›r USB portu byl zruĹˇen nebo zamĂ­tnut."
        : "USB port selection was cancelled or denied.");
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
        statusLabel: isCs ? "RuÄŤnÄ› zadĂˇno" : "Manual",
        detail: isCs
          ? `Gateway endpoint: ${url}. PĹ™ed ÄŤtenĂ­m dat musĂ­ backend/Node-RED ovÄ›Ĺ™it, Ĺľe jde o dĹŻvÄ›ryhodnou Team2App gateway.`
          : `Gateway endpoint: ${url}. Before reading data, backend/Node-RED must verify that it is a trusted Team2App gateway.`,
      }]);
      setWifiGatewayUrl("");
      setWifiGatewayName("");
      setDiscoveryMessage(isCs
        ? "Wi-Fi gateway byla pĹ™idĂˇna do seznamu kandidĂˇtĹŻ."
        : "Wi-Fi gateway added to the candidate list.");
    } catch (err) {
      setDiscoveryMessage(err instanceof Error ? err.message : "Invalid gateway URL.");
    }
  }

  function useDiscoveryCandidate(candidate: DiscoveryCandidate) {
    setSelectedDiscoveryCandidateId(candidate.id);
    setNewDeviceName(candidate.name);
    setNewDeviceModes([]);
    setConnectMessage(isCs
      ? "Profil byl pĹ™edvyplnÄ›n z vyhledĂˇvĂˇnĂ­. PĹ™ed uloĹľenĂ­m ovÄ›Ĺ™, Ĺľe zaĹ™Ă­zenĂ­ skuteÄŤnÄ› patĹ™Ă­ k projektu."
      : "Profile prefilled from discovery. Verify that the device really belongs to the project before saving.");
    setSearchModalOpen(false);
    setConnectModalOpen(true);
  }

  function getShortModeLabel(envMode: EnvironmentMode): string {
    const source = connectModeLabels[envMode] ?? envMode;
    return source.split("/")[0].trim();
  }

  function getConnectModeChipTitle(isActive: boolean): string {
    if (!selectedDiscoveryCandidate) return isCs ? "NejdĹ™Ă­v vyber zaĹ™Ă­zenĂ­." : "Select a device first.";
    return isActive
      ? (isCs ? "KliknutĂ­m odebrat reĹľim" : "Click to remove mode")
      : (isCs ? "KliknutĂ­m pĹ™idat reĹľim" : "Click to add mode");
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
      setConnectMessage(isCs ? "NejdĹ™Ă­v najdi a vyber zaĹ™Ă­zenĂ­." : "Find and select a device first.");
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

      setConnectMessage(isCs ? "ZaĹ™Ă­zenĂ­ bylo uloĹľeno." : "Device saved.");
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

      {disconnectTarget && (
        <ModalPortal>
        <div className="modal-overlay" onMouseDown={handleDisconnectOverlayMouseDown}>
          <div
            className="modal-card settings-alert-confirm-modal devices-disconnect-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="disconnect-device-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="devices-connect-title" id="disconnect-device-title">
              {isCs ? "Odpojit zaĹ™Ă­zenĂ­" : "Disconnect device"}
            </h3>
            <p className="modal-text">
              {isCs
                ? `Opravdu chcete odpojit zaĹ™Ă­zenĂ­ â€ž${getDisplayDeviceName(disconnectTarget, t)}â€ś?`
                : `Are you sure you want to disconnect "${getDisplayDeviceName(disconnectTarget, t)}"?`}
            </p>
            <p className="settings-preference-desc">
              {isCs
                ? "HistorickĂˇ mÄ›Ĺ™enĂ­ zĹŻstanou uloĹľenĂˇ. Pokud zaĹ™Ă­zenĂ­ dĂˇl posĂ­lĂˇ data pĹ™es gateway, mĹŻĹľe se znovu zaregistrovat."
                : "Historical readings will remain stored. If the device keeps sending data through the gateway, it can register again."}
            </p>
            {disconnectMessage && <p className="devices-connect-message">{disconnectMessage}</p>}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={resetDisconnectModal}
              >
                {t.confirm_cancel}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void confirmDisconnectDevice()}
              >
                {disconnectingDevice
                  ? (isCs ? "Odpojuji..." : "Disconnecting...")
                  : (isCs ? "Odpojit" : "Disconnect")}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {connectModalOpen && (
        <ModalPortal>
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
                aria-label={isCs ? "ZavĹ™Ă­t" : "Close"}
                title={isCs ? "ZavĹ™Ă­t" : "Close"}
              >
                <X size={17} />
              </button>
            </div>

            <button
              type="button"
              className="btn btn-primary devices-connect-search-action"
              onClick={() => void refreshKnownDiscovery()}
            >
              <Search size={18} />
              <span>{discoveryBusy === "known" ? connectBusyLabel : connectSearchButtonLabel}</span>
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
                          <span
                            className="devices-connect-selected-indicator"
                            aria-label={isSelected ? connectSelectedLabel : connectSelectLabel}
                          >
                            {isSelected ? connectSelectedLabel : connectSelectLabel}
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
              <span className="device-mode-label">{connectModeSectionLabel}</span>
              <div className="device-mode-chips">
                {ALL_ENV_MODES.map((envMode) => {
                  const isActive = newDeviceModes.includes(envMode);

                  return (
                    <button
                      key={envMode}
                      type="button"
                      className={`device-mode-chip ${isActive ? "active" : ""}`}
                      onClick={() => toggleNewDeviceMode(envMode)}
                      aria-pressed={isActive}
                      title={getConnectModeChipTitle(isActive)}
                    >
                      {getShortModeLabel(envMode)}
                    </button>
                  );
                })}
              </div>
            </div>

            {connectMessage && <p className="devices-connect-message">{connectMessage}</p>}

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={resetConnectModal}>
                {t.close}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => void handleConnectDevice()}
                disabled={!canSaveNewDevice || savingNewDevice}
                aria-label={savingNewDevice ? connectSavingLabel : connectSaveLabel}
              >
                {savingNewDevice ? connectSavingLabel : connectSaveLabel}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {searchModalOpen && (
        <ModalPortal>
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
                aria-label={isCs ? "ZavĹ™Ă­t" : "Close"}
                title={isCs ? "ZavĹ™Ă­t" : "Close"}
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
                >
                  {discoveryBusy === "usb" ? discoveryText.busy : discoveryText.usbAction}
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
        </ModalPortal>
      )}
    </div>
  );
}

