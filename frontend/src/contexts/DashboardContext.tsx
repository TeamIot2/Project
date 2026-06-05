// Shared dashboard state for dual-view synchronization

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { EnvironmentMode } from "../types";

type DeviceModeAssignments = Record<string, EnvironmentMode[]>;

export const REAL_OFFICE_DEVICE_ID = "esp32-001";
export const REAL_BEDROOM_DEVICE_ID = "esp32-003";

const DEVICE_ASSIGNMENTS_VERSION = "2026-06-04-greenhouse-unassigned-v3";
const DISCONNECTED_DEVICES_STORAGE_KEY = "disconnectedDeviceIds";
const ALL_ENV_MODES: EnvironmentMode[] = [
  "sleep",
  "office",
  "sport",
  "outdoor",
  "school",
  "factory",
  "greenhouse",
];
const DEFAULT_DEVICE_MODE_ASSIGNMENTS: DeviceModeAssignments = {
  "esp32-001": ["sleep", "office"],
  "esp32-002": ["sport"],
  "esp32-005": ["school"],
};

const LOCKED_MODE_DEVICE_IDS: Partial<Record<EnvironmentMode, string>> = {
  office: REAL_OFFICE_DEVICE_ID,
};

function cloneDefaultAssignments(): DeviceModeAssignments {
  return Object.fromEntries(
    Object.entries(DEFAULT_DEVICE_MODE_ASSIGNMENTS).map(([deviceId, modes]) => [deviceId, [...modes]])
  );
}

function sanitizeAssignments(candidate: unknown): DeviceModeAssignments {
  if (typeof candidate !== "object" || candidate === null) return {};
  const validModes = new Set<EnvironmentMode>(ALL_ENV_MODES);
  const parsed = candidate as Record<string, unknown>;
  const normalized: DeviceModeAssignments = {};

  for (const [deviceId, modes] of Object.entries(parsed)) {
    if (!Array.isArray(modes)) continue;
    const filtered = modes.filter(
      (mode): mode is EnvironmentMode => typeof mode === "string" && validModes.has(mode as EnvironmentMode)
    );
    if (filtered.length > 0) {
      normalized[deviceId] = filtered;
    }
  }

  return normalized;
}

function normalizeAssignments(candidate: DeviceModeAssignments): DeviceModeAssignments {
  const validModes = new Set<EnvironmentMode>(ALL_ENV_MODES);
  const normalized: DeviceModeAssignments = {};

  for (const [deviceId, modes] of Object.entries(candidate)) {
    const uniqueModes = new Set<EnvironmentMode>();
    for (const mode of modes) {
      if (!validModes.has(mode)) continue;
      const lockedDeviceId = LOCKED_MODE_DEVICE_IDS[mode];
      if (lockedDeviceId && deviceId !== lockedDeviceId) continue;
      uniqueModes.add(mode);
    }

    const sortedModes = ALL_ENV_MODES.filter((mode) => uniqueModes.has(mode));
    if (sortedModes.length > 0) {
      normalized[deviceId] = sortedModes;
    }
  }

  const officeModes = new Set(normalized[REAL_OFFICE_DEVICE_ID] ?? []);
  officeModes.add("office");
  normalized[REAL_OFFICE_DEVICE_ID] = ALL_ENV_MODES.filter((mode) => officeModes.has(mode));

  return normalized;
}

function loadDisconnectedDeviceIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISCONNECTED_DEVICES_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((deviceId): deviceId is string => typeof deviceId === "string" && deviceId.trim().length > 0));
  } catch {
    return new Set();
  }
}

interface DashboardState {
  isMeasuring: boolean;
  setIsMeasuring: React.Dispatch<React.SetStateAction<boolean>>;
  manuallyStopped: boolean;
  setManuallyStopped: React.Dispatch<React.SetStateAction<boolean>>;
  devicesExpanded: boolean;
  setDevicesExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  selectedDevices: Set<string>;
  setSelectedDevices: React.Dispatch<React.SetStateAction<Set<string>>>;
  expandedDevice: string | null;
  setExpandedDevice: React.Dispatch<React.SetStateAction<string | null>>;
  selectedDevice: string;
  setSelectedDevice: React.Dispatch<React.SetStateAction<string>>;
  deviceModeAssignments: DeviceModeAssignments;
  setDeviceModeAssignments: React.Dispatch<React.SetStateAction<DeviceModeAssignments>>;
  disconnectedDeviceIds: Set<string>;
  setDisconnectedDeviceIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  showConfirmModal: "start" | "stop" | null;
  setShowConfirmModal: React.Dispatch<React.SetStateAction<"start" | "stop" | null>>;
}

const DashboardContext = createContext<DashboardState | null>(null);

export function useDashboard(): DashboardState {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [isMeasuring, setIsMeasuring] = useState(true);
  const [manuallyStopped, setManuallyStopped] = useState(false);
  const [devicesExpanded, setDevicesExpanded] = useState(true);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [disconnectedDeviceIds, setDisconnectedDeviceIds] = useState<Set<string>>(loadDisconnectedDeviceIds);
  const [deviceModeAssignments, setDeviceModeAssignmentsState] = useState<DeviceModeAssignments>(() => {
    try {
      const storedVersion = localStorage.getItem("deviceModeAssignmentsVersion");
      const raw = localStorage.getItem("deviceModeAssignments");
      if (storedVersion !== DEVICE_ASSIGNMENTS_VERSION || !raw) {
        return normalizeAssignments(cloneDefaultAssignments());
      }

      const parsed = sanitizeAssignments(JSON.parse(raw));
      if (Object.keys(parsed).length === 0) {
        return normalizeAssignments(cloneDefaultAssignments());
      }

      return normalizeAssignments(parsed);
    } catch {
      return normalizeAssignments(cloneDefaultAssignments());
    }
  });
  const [showConfirmModal, setShowConfirmModal] = useState<"start" | "stop" | null>(null);

  const setDeviceModeAssignments = useCallback<React.Dispatch<React.SetStateAction<DeviceModeAssignments>>>((action) => {
    setDeviceModeAssignmentsState((prev) => {
      const next = typeof action === "function"
        ? (action as (current: DeviceModeAssignments) => DeviceModeAssignments)(prev)
        : action;
      return normalizeAssignments(next);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem("deviceModeAssignments", JSON.stringify(deviceModeAssignments));
    localStorage.setItem("deviceModeAssignmentsVersion", DEVICE_ASSIGNMENTS_VERSION);
  }, [deviceModeAssignments]);

  useEffect(() => {
    localStorage.setItem(DISCONNECTED_DEVICES_STORAGE_KEY, JSON.stringify(Array.from(disconnectedDeviceIds)));
  }, [disconnectedDeviceIds]);

  return (
    <DashboardContext.Provider
      value={{
        isMeasuring, setIsMeasuring,
        manuallyStopped, setManuallyStopped,
        devicesExpanded, setDevicesExpanded,
        selectedDevices, setSelectedDevices,
        expandedDevice, setExpandedDevice,
        selectedDevice, setSelectedDevice,
        deviceModeAssignments, setDeviceModeAssignments,
        disconnectedDeviceIds, setDisconnectedDeviceIds,
        showConfirmModal, setShowConfirmModal,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
