// Single source of truth for sensor metric colors, labels, units, and chart config.
// All pages (Dashboard, History, Devices) should import from here
// instead of defining their own duplicate color maps.

import type { MetricConfig } from "../types";
import type { Translations } from "../i18n/translations";

/**
 * Canonical hex color for each environmental metric.
 * Used for chart strokes, sensor card borders, and icon tinting.
 */
export const METRIC_COLORS: Record<string, string> = {
  co2_ppm: "#22C55E",
  temperature_c: "#3B82F6",
  humidity_pct: "#06B6D4",
  pressure_hpa: "#8B5CF6",
  light_lux: "#F59E0B",
  noise_adc: "#EF4444",
  // Wearable-only metrics (not on the IoT node)
  heart_rate_bpm: "#E11D48",
  hrv_rmssd_ms: "#EC4899",
};

/**
 * CSS custom-property name for each metric.
 * Defined in the app stylesheet and referenced in Recharts config.
 */
export const METRIC_CSS_VARS: Record<string, string> = {
  co2_ppm: "var(--chart-co2)",
  temperature_c: "var(--chart-temp)",
  humidity_pct: "var(--chart-humidity)",
  pressure_hpa: "var(--chart-pressure)",
  light_lux: "var(--chart-light)",
  noise_adc: "var(--chart-noise)",
};

/**
 * Mapping from CSS variable references to their resolved hex values.
 * Recharts needs real hex colors, not CSS vars.
 */
const cssVarToHex: Record<string, string> = {
  "var(--chart-co2)": METRIC_COLORS.co2_ppm,
  "var(--chart-temp)": METRIC_COLORS.temperature_c,
  "var(--chart-humidity)": METRIC_COLORS.humidity_pct,
  "var(--chart-pressure)": METRIC_COLORS.pressure_hpa,
  "var(--chart-light)": METRIC_COLORS.light_lux,
  "var(--chart-noise)": METRIC_COLORS.noise_adc,
};

/**
 * Resolve a CSS variable string (e.g. "var(--chart-co2)") to its hex value.
 * If the input is already a hex string or unknown, it is returned as-is.
 */
export function resolveColor(cssVar: string): string {
  return cssVarToHex[cssVar] ?? cssVar;
}

/**
 * Translation keys that map each metric key to its i18n label.
 */
export const SENSOR_LABEL_KEYS: Record<string, keyof Translations> = {
  co2_ppm: "sensor_co2",
  temperature_c: "sensor_temperature",
  humidity_pct: "sensor_humidity",
  pressure_hpa: "sensor_pressure",
  light_lux: "sensor_light",
  noise_adc: "sensor_noise",
  heart_rate_bpm: "sensor_heart_rate",
  hrv_rmssd_ms: "sensor_hrv",
};

/**
 * Canonical metric configurations shared by Dashboard, History, and Devices.
 * Each entry holds the key, English fallback label, unit, CSS color var,
 * icon identifier, decimal precision, and optional Y-axis domain.
 */
export const METRICS: MetricConfig[] = [
  { key: "co2_ppm",       label: "CO2",         unit: "ppm",  color: METRIC_CSS_VARS.co2_ppm,       icon: "co2molecule",  decimals: 0, chartDomain: [300, 1500] },
  { key: "temperature_c", label: "Temperature",  unit: "\u00B0C", color: METRIC_CSS_VARS.temperature_c, icon: "thermometer",  decimals: 1, chartDomain: [15, 35] },
  { key: "humidity_pct",  label: "Humidity",     unit: "%",    color: METRIC_CSS_VARS.humidity_pct,  icon: "droplets",     decimals: 1, chartDomain: [20, 80] },
  { key: "pressure_hpa",  label: "Pressure",     unit: "hPa",  color: METRIC_CSS_VARS.pressure_hpa,  icon: "gauge",        decimals: 0, chartDomain: [960, 1060] },
  { key: "light_lux",     label: "Light",        unit: "lux",  color: METRIC_CSS_VARS.light_lux,     icon: "sun",          decimals: 0, chartDomain: [0, 1000] },
  { key: "noise_adc",     label: "Noise",        unit: "dB",   color: METRIC_CSS_VARS.noise_adc,     icon: "volume",       decimals: 0, chartDomain: [30, 100] },
];

/**
 * Sensor display config for the Devices page expanded view.
 * Includes hardware range info alongside the standard color.
 */
export const DEVICE_SENSOR_FIELDS = [
  { key: "co2_ppm",        label: "sensor_co2",         unit: "ppm",  color: METRIC_COLORS.co2_ppm,       range: "0 \u2013 5000" },
  { key: "temperature_c",  label: "sensor_temperature",  unit: "\u00B0C", color: METRIC_COLORS.temperature_c, range: "\u201340 \u2013 +85" },
  { key: "humidity_pct",   label: "sensor_humidity",     unit: "%",    color: METRIC_COLORS.humidity_pct,  range: "0 \u2013 100" },
  { key: "pressure_hpa",   label: "sensor_pressure",     unit: "hPa",  color: METRIC_COLORS.pressure_hpa,  range: "300 \u2013 1100" },
  { key: "light_lux",      label: "sensor_light",        unit: "lux",  color: METRIC_COLORS.light_lux,     range: "1 \u2013 65535" },
  { key: "sound_level_adc", label: "sensor_noise",       unit: "ADC",  color: METRIC_COLORS.noise_adc,     range: "0 \u2013 4095", rangeNote: "\u2248 30 \u2013 100 dB est." },
] as const;
