// Environment context: manage environment mode (sleep/office/sport) and quality evaluation

import React, { createContext, useContext, useState, useEffect } from "react";
import { apiGet } from "../api";
import type { EnvironmentMode, EnvironmentPreset } from "../types";

type Quality = "good" | "moderate" | "poor";

interface EnvironmentState {
  mode: EnvironmentMode;
  presets: EnvironmentPreset[];
  loading: boolean;
  setEnvironment: (mode: EnvironmentMode) => void;
  getQuality: (metricKey: string, value: number) => Quality;
  currentPreset: EnvironmentPreset | null;
}

const EnvironmentContext = createContext<EnvironmentState | null>(null);

export function useEnvironment(): EnvironmentState {
  const ctx = useContext(EnvironmentContext);
  if (!ctx) throw new Error("useEnvironment must be used within EnvironmentProvider");
  return ctx;
}

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<EnvironmentMode>("office");
  const [presets, setPresets] = useState<EnvironmentPreset[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch environment presets from API
  useEffect(() => {
    apiGet<EnvironmentPreset[]>("/environments")
      .then(setPresets)
      .catch((err) => {
        console.error("Failed to fetch environment presets:", err);
        // Use sensible fallback presets if API unavailable
        setPresets(fallbackPresets);
      })
      .finally(() => setLoading(false));
  }, []);

  const currentPreset = presets.find((p) => p.id === mode) ?? null;

  /**
   * Evaluate quality of a metric value against current environment thresholds.
   */
  function getQuality(metricKey: string, value: number): Quality {
    if (!currentPreset) return "moderate"; // No data yet — show neutral state

    const threshold = currentPreset.thresholds[metricKey];
    if (!threshold) return "moderate"; // Unknown metric — show neutral state

    const [goodMin, goodMax] = threshold.good;
    const [modMin, modMax] = threshold.moderate;

    if (value >= goodMin && value <= goodMax) return "good";
    if (value >= modMin && value <= modMax) return "moderate";
    return "poor";
  }

  return (
    <EnvironmentContext.Provider
      value={{
        mode,
        presets,
        loading,
        setEnvironment: setMode,
        getQuality,
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
    name: "Sleep",
    description: "Optimized for sleeping",
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
    name: "Office",
    description: "Optimized for productivity",
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
    name: "Sport",
    description: "Optimized for physical activity",
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
    name: "Outdoor",
    description: "Outdoor monitoring",
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
    name: "School",
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
    name: "Factory",
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
