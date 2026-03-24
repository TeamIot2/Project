// Shared dashboard state for dual-view synchronization

import React, { createContext, useContext, useState } from "react";

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
  const [showConfirmModal, setShowConfirmModal] = useState<"start" | "stop" | null>(null);

  return (
    <DashboardContext.Provider
      value={{
        isMeasuring, setIsMeasuring,
        devicesExpanded, setDevicesExpanded,
        selectedDevices, setSelectedDevices,
        expandedDevice, setExpandedDevice,
        selectedDevice, setSelectedDevice,
        showConfirmModal, setShowConfirmModal,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
