// Environment context: manage environment mode (sleep/office/sport) and quality evaluation

import React, { createContext, useContext, useState, useEffect } from "react";
import { apiGet } from "../api";
import type { EnvironmentMode, EnvironmentPreset } from "../types";
import {
  calculatePointMetricScore,
  getPointQuality,
  isPointMetricCritical,
  isPointMetricNotification,
  loadStoredModeThresholdPoints,
  MODE_THRESHOLD_UPDATED_EVENT,
  rangeToPoint,
  resolvePointThreshold,
  type ModeThresholdPoints,
} from "../utils/modeThresholdStorage";

type Quality = "good" | "moderate" | "poor";

interface EnvironmentState {
  mode: EnvironmentMode;
  presets: EnvironmentPreset[];
  loading: boolean;
  error: string | null;
  setEnvironment: (mode: EnvironmentMode) => void;
  getQuality: (metricKey: string, value: number) => Quality;
  getMetricScore: (metricKey: string, value: number) => number;
  isCritical: (metricKey: string, value: number) => boolean;
  isNotificationReached: (metricKey: string, value: number) => boolean;
  currentPreset: EnvironmentPreset | null;
}

const EnvironmentContext = createContext<EnvironmentState | null>(null);

function resolveThreshold(thresholds: EnvironmentPreset["thresholds"], metricKey: string) {
  const aliases: Record<string, string[]> = {
    noise_adc: ["sound_level_adc"],
    sound_level_adc: ["noise_adc"],
  };

  if (thresholds[metricKey]) return thresholds[metricKey];
  for (const alias of aliases[metricKey] ?? []) {
    if (thresholds[alias]) return thresholds[alias];
  }
  return null;
}

function calculateMetricScore(metricKey: string, value: number, thresholds: EnvironmentPreset["thresholds"]): number {
  if (!Number.isFinite(value)) return 0;

  const threshold = resolveThreshold(thresholds, metricKey);
  if (!threshold) return 60;
  return calculatePointMetricScore(value, rangeToPoint(threshold));
}

export function useEnvironment(): EnvironmentState {
  const ctx = useContext(EnvironmentContext);
  if (!ctx) throw new Error("useEnvironment must be used within EnvironmentProvider");
  return ctx;
}

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<EnvironmentMode>("office");
  const [presets, setPresets] = useState<EnvironmentPreset[]>([]);
  const [thresholdPointOverrides, setThresholdPointOverrides] = useState<ModeThresholdPoints>(
    loadStoredModeThresholdPoints
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch environment presets from API
  useEffect(() => {
    apiGet<EnvironmentPreset[]>("/environments")
      .then((data) => {
        setPresets(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to fetch environment presets:", err);
        const message = err instanceof Error ? err.message : "Failed to load environment presets";
        setError(message);
        // Use sensible fallback presets if API unavailable
        setPresets(fallbackPresets);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const refreshThresholdOverrides = () => {
      setThresholdPointOverrides(loadStoredModeThresholdPoints());
    };

    refreshThresholdOverrides();
    window.addEventListener(MODE_THRESHOLD_UPDATED_EVENT, refreshThresholdOverrides);
    window.addEventListener("storage", refreshThresholdOverrides);
    return () => {
      window.removeEventListener(MODE_THRESHOLD_UPDATED_EVENT, refreshThresholdOverrides);
      window.removeEventListener("storage", refreshThresholdOverrides);
    };
  }, []);

  const currentPreset = presets.find((p) => p.id === mode) ?? null;
  const currentPointThresholds = thresholdPointOverrides[mode];

  /**
   * Evaluate quality of a metric value against current environment thresholds.
   */
  function getQuality(metricKey: string, value: number): Quality {
    if (!currentPreset) return "moderate"; // No data yet — show neutral state

    const pointThreshold = resolvePointThreshold(currentPointThresholds, metricKey);
    if (pointThreshold) return getPointQuality(value, pointThreshold);

    const threshold = resolveThreshold(currentPreset.thresholds, metricKey);
    if (!threshold) return "moderate"; // Unknown metric — show neutral state

    return getPointQuality(value, rangeToPoint(threshold));
  }

  function getMetricScore(metricKey: string, value: number): number {
    if (!currentPreset) return 60;
    const pointThreshold = resolvePointThreshold(currentPointThresholds, metricKey);
    if (pointThreshold) return calculatePointMetricScore(value, pointThreshold);
    return calculateMetricScore(metricKey, value, currentPreset.thresholds);
  }

  function isCritical(metricKey: string, value: number): boolean {
    if (!currentPreset) return false;
    const pointThreshold = resolvePointThreshold(currentPointThresholds, metricKey);
    if (pointThreshold) return isPointMetricCritical(value, pointThreshold);

    const threshold = resolveThreshold(currentPreset.thresholds, metricKey);
    if (!threshold) return false;
    return isPointMetricCritical(value, rangeToPoint(threshold));
  }

  function isNotificationReached(metricKey: string, value: number): boolean {
    if (!currentPreset) return false;
    const pointThreshold = resolvePointThreshold(currentPointThresholds, metricKey);
    if (pointThreshold) return isPointMetricNotification(value, pointThreshold);

    const threshold = resolveThreshold(currentPreset.thresholds, metricKey);
    if (!threshold) return false;
    return isPointMetricNotification(value, rangeToPoint(threshold));
  }

  return (
    <EnvironmentContext.Provider
      value={{
        mode,
        presets,
        loading,
        error,
        setEnvironment: setMode,
        getQuality,
        getMetricScore,
        isCritical,
        isNotificationReached,
        currentPreset,
      }}
    >
      {children}
    </EnvironmentContext.Provider>
  );
}

// Fallback presets when API is unavailable
const fallbackPresets: EnvironmentPreset[] = [
  {
    id: "sleep",
    name: "Bedroom",
    description: "Bedroom environment monitoring",
    icon: "moon",
    thresholds: {
      co2_ppm: { good: [400, 600], moderate: [600, 1000] },
      temperature_c: { good: [16, 20], moderate: [14, 24] },
      humidity_pct: { good: [40, 60], moderate: [30, 70] },
      pressure_hpa: { good: [980, 1040], moderate: [960, 1060] },
      light_lux: { good: [0, 5], moderate: [5, 50] },
      noise_adc: { good: [0, 200], moderate: [200, 500] },
    },
  },
  {
    id: "office",
    name: "Unicorn",
    description: "Unicorn environment",
    icon: "briefcase",
    thresholds: {
      co2_ppm: { good: [400, 800], moderate: [800, 1200] },
      temperature_c: { good: [20, 24], moderate: [18, 26] },
      humidity_pct: { good: [40, 60], moderate: [30, 70] },
      pressure_hpa: { good: [980, 1040], moderate: [960, 1060] },
      light_lux: { good: [300, 750], moderate: [100, 1000] },
      noise_adc: { good: [0, 400], moderate: [400, 700] },
    },
  },
  {
    id: "sport",
    name: "Gym(M)",
    description: "Gym environment monitoring",
    icon: "activity",
    thresholds: {
      co2_ppm: { good: [400, 1000], moderate: [1000, 1500] },
      temperature_c: { good: [16, 22], moderate: [14, 26] },
      humidity_pct: { good: [30, 50], moderate: [20, 60] },
      pressure_hpa: { good: [980, 1040], moderate: [960, 1060] },
      light_lux: { good: [200, 1000], moderate: [50, 2000] },
      noise_adc: { good: [0, 600], moderate: [600, 900] },
    },
  },
  {
    id: "outdoor",
    name: "Garden(M)",
    description: "Garden environment monitoring",
    icon: "tree",
    thresholds: {
      co2_ppm: { good: [0, 500], moderate: [500, 800] },
      temperature_c: { good: [10, 26], moderate: [5, 32] },
      humidity_pct: { good: [30, 70], moderate: [20, 85] },
      pressure_hpa: { good: [980, 1040], moderate: [960, 1060] },
      light_lux: { good: [200, 10000], moderate: [50, 20000] },
      noise_adc: { good: [0, 500], moderate: [500, 800] },
    },
  },
  {
    id: "school",
    name: "School(M)",
    description: "School environment",
    icon: "sun",
    thresholds: {
      co2_ppm: { good: [400, 800], moderate: [800, 1200] },
      temperature_c: { good: [20, 24], moderate: [18, 26] },
      humidity_pct: { good: [40, 60], moderate: [30, 70] },
      pressure_hpa: { good: [980, 1040], moderate: [960, 1060] },
      light_lux: { good: [300, 750], moderate: [100, 1000] },
      noise_adc: { good: [0, 400], moderate: [400, 700] },
    },
  },
  {
    id: "factory",
    name: "Factory(M)",
    description: "Industrial environment",
    icon: "wind",
    thresholds: {
      co2_ppm: { good: [400, 1000], moderate: [1000, 1500] },
      temperature_c: { good: [16, 22], moderate: [14, 26] },
      humidity_pct: { good: [30, 50], moderate: [20, 60] },
      pressure_hpa: { good: [980, 1040], moderate: [960, 1060] },
      light_lux: { good: [200, 1000], moderate: [50, 2000] },
      noise_adc: { good: [0, 600], moderate: [600, 900] },
    },
  },
  {
    id: "greenhouse",
    name: "Greenhouse",
    description: "Greenhouse environment",
    icon: "droplets",
    thresholds: {
      co2_ppm: { good: [0, 600], moderate: [600, 1000] },
      temperature_c: { good: [18, 30], moderate: [14, 35] },
      humidity_pct: { good: [50, 85], moderate: [40, 95] },
      pressure_hpa: { good: [980, 1040], moderate: [960, 1060] },
      light_lux: { good: [200, 10000], moderate: [50, 20000] },
      noise_adc: { good: [0, 400], moderate: [400, 700] },
    },
  },
];
