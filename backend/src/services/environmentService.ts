/**
 * Environment Presets Service
 *
 * Returns predefined environment presets with threshold ranges
 * for evaluating sensor data quality in different contexts.
 */

import { EnvironmentPreset } from "../../../shared/types";

const PRESETS: EnvironmentPreset[] = [
  {
    id: "sleep",
    name: "Bedroom",
    description: "Bedroom environment monitoring",
    icon: "moon",
    thresholds: {
      co2_ppm: { good: [0, 600], moderate: [600, 1000] },
      temperature_c: { good: [16, 19], moderate: [14, 22] },
      humidity_pct: { good: [40, 60], moderate: [30, 70] },
      pressure_hpa: { good: [980, 1050], moderate: [960, 1060] },
      light_lux: { good: [0, 5], moderate: [5, 30] },
      sound_level_adc: { good: [0, 1800], moderate: [1800, 2100] },
    },
  },
  {
    id: "office",
    name: "Unicorn",
    description: "Unicorn environment",
    icon: "briefcase",
    thresholds: {
      co2_ppm: { good: [0, 800], moderate: [800, 1200] },
      temperature_c: { good: [20, 24], moderate: [18, 26] },
      humidity_pct: { good: [40, 60], moderate: [30, 70] },
      pressure_hpa: { good: [980, 1050], moderate: [960, 1060] },
      light_lux: { good: [300, 500], moderate: [150, 700] },
      sound_level_adc: { good: [0, 2100], moderate: [2100, 2400] },
    },
  },
  {
    id: "sport",
    name: "Gym(M)",
    description: "Gym environment",
    icon: "activity",
    thresholds: {
      co2_ppm: { good: [0, 1000], moderate: [1000, 1500] },
      temperature_c: { good: [15, 20], moderate: [12, 24] },
      humidity_pct: { good: [30, 60], moderate: [20, 70] },
      pressure_hpa: { good: [980, 1050], moderate: [960, 1060] },
      light_lux: { good: [100, 500], moderate: [50, 700] },
      sound_level_adc: { good: [0, 2400], moderate: [2400, 2800] },
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
      pressure_hpa: { good: [980, 1050], moderate: [960, 1060] },
      light_lux: { good: [200, 10000], moderate: [50, 20000] },
      sound_level_adc: { good: [0, 2200], moderate: [2200, 2600] },
    },
  },
  {
    id: "school",
    name: "School(M)",
    description: "School classroom environment",
    icon: "sun",
    thresholds: {
      co2_ppm: { good: [0, 800], moderate: [800, 1200] },
      temperature_c: { good: [20, 24], moderate: [18, 26] },
      humidity_pct: { good: [40, 60], moderate: [30, 70] },
      pressure_hpa: { good: [980, 1050], moderate: [960, 1060] },
      light_lux: { good: [300, 500], moderate: [150, 700] },
      sound_level_adc: { good: [0, 2100], moderate: [2100, 2400] },
    },
  },
  {
    id: "factory",
    name: "Factory(M)",
    description: "Industrial and manufacturing environment",
    icon: "wind",
    thresholds: {
      co2_ppm: { good: [0, 1000], moderate: [1000, 1500] },
      temperature_c: { good: [15, 20], moderate: [12, 24] },
      humidity_pct: { good: [30, 60], moderate: [20, 70] },
      pressure_hpa: { good: [980, 1050], moderate: [960, 1060] },
      light_lux: { good: [100, 500], moderate: [50, 700] },
      sound_level_adc: { good: [0, 2400], moderate: [2400, 2800] },
    },
  },
  {
    id: "greenhouse",
    name: "Greenhouse",
    description: "Greenhouse and botanical environment",
    icon: "droplets",
    thresholds: {
      co2_ppm: { good: [0, 600], moderate: [600, 1000] },
      temperature_c: { good: [18, 30], moderate: [14, 35] },
      humidity_pct: { good: [50, 85], moderate: [40, 95] },
      pressure_hpa: { good: [980, 1050], moderate: [960, 1060] },
      light_lux: { good: [200, 10000], moderate: [50, 20000] },
      sound_level_adc: { good: [0, 2000], moderate: [2000, 2400] },
    },
  },
];

/** Return all environment presets */
export function getEnvironments(): EnvironmentPreset[] {
  return PRESETS;
}

/** Return a single preset by id */
export function getEnvironment(id: string): EnvironmentPreset | undefined {
  return PRESETS.find((p) => p.id === id);
}
