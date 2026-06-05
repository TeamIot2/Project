import type { EnvironmentalReading } from "../types";

type NoiseEstimateInput = Pick<EnvironmentalReading, "sound_level_adc" | "sound_rms_adc">;

const ADC_FULL_SCALE = 4095;
const ADC_REFERENCE_V = 3.3;
const MIC_SENSITIVITY_V_PER_PA = Math.pow(10, -44 / 20);
const MAX9814_GAIN_LINEAR = Math.pow(10, 60 / 20);
const REFERENCE_PRESSURE_PA = 20e-6;

function isValidAdc(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= ADC_FULL_SCALE;
}

export function isNoiseMetricKey(metricKey: string): boolean {
  return metricKey === "noise_adc" || metricKey === "sound_level_adc";
}

export function estimateNoiseDb(input: NoiseEstimateInput | null | undefined): number | null {
  if (!input) return null;

  const avgAdc = input.sound_level_adc;
  const rmsAdc = input.sound_rms_adc;
  if (!isValidAdc(avgAdc) || !isValidAdc(rmsAdc) || rmsAdc < avgAdc) return null;

  const acRmsAdc = Math.sqrt(Math.max(0, rmsAdc * rmsAdc - avgAdc * avgAdc));
  if (!Number.isFinite(acRmsAdc) || acRmsAdc <= 0) return null;

  const vRms = (acRmsAdc / ADC_FULL_SCALE) * ADC_REFERENCE_V;
  const pressurePa = vRms / (MIC_SENSITIVITY_V_PER_PA * MAX9814_GAIN_LINEAR);
  if (!Number.isFinite(pressurePa) || pressurePa <= 0) return null;

  const estimatedNoiseDb = 20 * Math.log10(pressurePa / REFERENCE_PRESSURE_PA);
  return Number.isFinite(estimatedNoiseDb) ? Math.round(estimatedNoiseDb) : null;
}

export function estimateNoiseDbFromReading(reading: EnvironmentalReading | null | undefined): number | null {
  return estimateNoiseDb(reading);
}

export function formatApproximateNoiseDb(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `~${Math.round(value)}`;
}
