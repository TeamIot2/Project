// Shared dashboard state for dual-view synchronization

import React, { createContext, useContext, useEffect, useState } from "react";
import type { EnvironmentMode } from "../types";

type DeviceModeAssignments = Record<string, EnvironmentMode[]>;

const DEVICE_ASSIGNMENTS_VERSION = "2026-04-19-v2";
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
  "esp32-001": ["sport", "school"],
  "esp32-002": ["office"],
  "esp32-003": ["sleep"],
  "esp32-004": ["greenhouse"],
  "esp32-005": ["school"],
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
  const [deviceModeAssignments, setDeviceModeAssignments] = useState<DeviceModeAssignments>(() => {
    try {
      const storedVersion = localStorage.getItem("deviceModeAssignmentsVersion");
      const raw = localStorage.getItem("deviceModeAssignments");
      if (storedVersion !== DEVICE_ASSIGNMENTS_VERSION || !raw) {
        return cloneDefaultAssignments();
      }

      const parsed = sanitizeAssignments(JSON.parse(raw));
      if (Object.keys(parsed).length === 0) {
        return cloneDefaultAssignments();
      }

      return parsed;
    } catch {
      return cloneDefaultAssignments();
    }
  });
  const [showConfirmModal, setShowConfirmModal] = useState<"start" | "stop" | null>(null);

  useEffect(() => {
    localStorage.setItem("deviceModeAssignments", JSON.stringify(deviceModeAssignments));
    localStorage.setItem("deviceModeAssignmentsVersion", DEVICE_ASSIGNMENTS_VERSION);
  }, [deviceModeAssignments]);

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
        showConfirmModal, setShowConfirmModal,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
