// Shared dashboard state for dual-view synchronization

import React, { createContext, useContext, useEffect, useState } from "react";
import type { EnvironmentMode } from "../types";

type DeviceModeAssignments = Record<string, EnvironmentMode[]>;

interface DashboardState {
  isMeasuring: boolean;
  setIsMeasuring: React.Dispatch<React.SetStateAction<boolean>>;
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
  const [devicesExpanded, setDevicesExpanded] = useState(true);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [deviceModeAssignments, setDeviceModeAssignments] = useState<DeviceModeAssignments>(() => {
    try {
      const raw = localStorage.getItem("deviceModeAssignments");
      if (!raw) return {};
      const parsed = JSON.parse(raw) as DeviceModeAssignments;
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  });
  const [showConfirmModal, setShowConfirmModal] = useState<"start" | "stop" | null>(null);

  useEffect(() => {
    localStorage.setItem("deviceModeAssignments", JSON.stringify(deviceModeAssignments));
  }, [deviceModeAssignments]);

  return (
    <DashboardContext.Provider
      value={{
        isMeasuring, setIsMeasuring,
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
