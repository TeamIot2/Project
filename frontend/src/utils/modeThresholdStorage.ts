import type { ThresholdRange } from "../types";

export type ThresholdPoint = {
  ideal: number;
  lowerBad: number | null;
  upperBad: number | null;
  notification: number | null;
  critical: number | null;
};

type LegacyThresholdPoint = {
  ideal: number;
  good: number;
  moderate: number;
  poor: number;
  notification?: number | null;
  critical?: number | null;
};

export type StoredThresholdValue = ThresholdRange | ThresholdPoint | LegacyThresholdPoint;
export type StoredModeThresholds = Record<string, Record<string, StoredThresholdValue>>;
export type ModeThresholdPoints = Record<string, Record<string, ThresholdPoint>>;

export const MODE_THRESHOLD_STORAGE_KEY = "modeThresholdDrafts";
export const MODE_THRESHOLD_UPDATED_EVENT = "team2app:mode-thresholds-updated";

const QUALITY_GOOD_SCORE = 70;
const QUALITY_MODERATE_SCORE = 40;

export function roundThresholdValue(value: number): number {
  return Number.parseFloat(value.toFixed(2));
}

export function parseThresholdNumber(rawValue: string): number | null {
  const normalized = rawValue.trim().replace(/\s+/g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeOptionalThresholdValue(value: unknown): number | null {
  return isFiniteNumber(value) ? value : null;
}

function normalizeRange(range: [number, number]): [number, number] {
  return range[0] <= range[1] ? range : [range[1], range[0]];
}

export function cloneThresholdPoint(point: ThresholdPoint): ThresholdPoint {
  return {
    ideal: isFiniteNumber(point.ideal) ? point.ideal : 0,
    lowerBad: normalizeOptionalThresholdValue(point.lowerBad),
    upperBad: normalizeOptionalThresholdValue(point.upperBad),
    notification: normalizeOptionalThresholdValue(point.notification),
    critical: normalizeOptionalThresholdValue(point.critical),
  };
}

export function clonePointThresholds(thresholds: Record<string, ThresholdPoint>): Record<string, ThresholdPoint> {
  return Object.fromEntries(
    Object.entries(thresholds).map(([metricKey, point]) => [metricKey, cloneThresholdPoint(point)])
  );
}

export function isThresholdPoint(value: unknown): value is ThresholdPoint {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (!isFiniteNumber(candidate.ideal)) return false;
  if (isLegacyThresholdPoint(candidate)) return false;
  return "lowerBad" in candidate || "upperBad" in candidate || "notification" in candidate || "critical" in candidate;
}

function isLegacyThresholdPoint(value: unknown): value is LegacyThresholdPoint {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return ["ideal", "good", "moderate", "poor"].every((key) => isFiniteNumber(candidate[key]));
}

export function isThresholdRange(value: unknown): value is ThresholdRange {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.good) || !Array.isArray(candidate.moderate)) return false;
  return candidate.good.length === 2 && candidate.moderate.length === 2;
}

function deriveRangeCritical(ideal: number, lowerBad: number | null, upperBad: number | null): number | null {
  if (upperBad !== null && upperBad > ideal) {
    return roundThresholdValue(upperBad + Math.max(1, Math.abs(upperBad - ideal) * 0.25));
  }

  if (lowerBad !== null && lowerBad < ideal) {
    return roundThresholdValue(lowerBad - Math.max(1, Math.abs(ideal - lowerBad) * 0.25));
  }

  return null;
}

function deriveRangeNotification(ideal: number, lowerBad: number | null, upperBad: number | null): number | null {
  if (upperBad !== null && upperBad > ideal) return upperBad;
  if (lowerBad !== null && lowerBad < ideal) return lowerBad;
  return null;
}

export function rangeToPoint(range: ThresholdRange): ThresholdPoint {
  const [goodMin, goodMax] = normalizeRange(range.good);
  const [modMin, modMax] = normalizeRange(range.moderate);
  const isLowerBetterScale = goodMin <= 0 && modMin >= goodMax;
  const ideal = roundThresholdValue(isLowerBetterScale ? goodMin : (goodMin + goodMax) / 2);
  const lowerBad = modMin < ideal ? roundThresholdValue(modMin) : null;
  const upperBad = modMax > ideal ? roundThresholdValue(modMax) : null;

  return {
    ideal,
    lowerBad,
    upperBad,
    notification: deriveRangeNotification(ideal, lowerBad, upperBad),
    critical: deriveRangeCritical(ideal, lowerBad, upperBad),
  };
}

function legacyPointToPoint(point: LegacyThresholdPoint): ThresholdPoint {
  const ascending = point.poor >= point.good;

  return {
    ideal: point.ideal,
    lowerBad: ascending ? null : point.poor,
    upperBad: ascending ? point.poor : null,
    notification: normalizeOptionalThresholdValue(point.notification),
    critical: normalizeOptionalThresholdValue(point.critical),
  };
}

export function storedThresholdToPoint(value: unknown): ThresholdPoint | null {
  if (isThresholdPoint(value)) return cloneThresholdPoint(value);
  if (isLegacyThresholdPoint(value)) return legacyPointToPoint(value);
  if (isThresholdRange(value)) return rangeToPoint(value);
  return null;
}

export function thresholdsToPoints(thresholds: Record<string, ThresholdRange>): Record<string, ThresholdPoint> {
  return Object.fromEntries(
    Object.entries(thresholds).map(([metricKey, range]) => [metricKey, rangeToPoint(range)])
  );
}

export function readStoredModeThresholds(): StoredModeThresholds {
  try {
    const raw = localStorage.getItem(MODE_THRESHOLD_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as StoredModeThresholds;
  } catch {
    return {};
  }
}

export function loadStoredModeThresholdPoints(): ModeThresholdPoints {
  const stored = readStoredModeThresholds();
  const result: ModeThresholdPoints = {};

  for (const [modeId, modeThresholds] of Object.entries(stored)) {
    if (!modeThresholds || typeof modeThresholds !== "object" || Array.isArray(modeThresholds)) continue;

    const normalizedMode: Record<string, ThresholdPoint> = {};
    for (const [metricKey, value] of Object.entries(modeThresholds)) {
      const normalizedPoint = storedThresholdToPoint(value);
      if (normalizedPoint) {
        normalizedMode[metricKey] = normalizedPoint;
      }
    }

    if (Object.keys(normalizedMode).length > 0) {
      result[modeId] = normalizedMode;
    }
  }

  return result;
}

export function notifyModeThresholdsUpdated(): void {
  window.dispatchEvent(new Event(MODE_THRESHOLD_UPDATED_EVENT));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function resolveBadBoundaries(point: ThresholdPoint): { lower: number | null; upper: number | null } {
  const candidates = [point.lowerBad, point.upperBad].filter(isFiniteNumber);
  const lowerCandidates = candidates.filter((value) => value < point.ideal);
  const upperCandidates = candidates.filter((value) => value > point.ideal);

  return {
    lower: lowerCandidates.length > 0 ? Math.max(...lowerCandidates) : null,
    upper: upperCandidates.length > 0 ? Math.min(...upperCandidates) : null,
  };
}

export function calculatePointMetricScore(value: number, point: ThresholdPoint): number {
  if (!Number.isFinite(value)) return 0;

  const { lower, upper } = resolveBadBoundaries(point);

  if (value === point.ideal) return 100;

  if (value < point.ideal) {
    if (lower === null) return 100;
    const position = clamp((value - lower) / Math.max(1, point.ideal - lower), 0, 1);
    return Math.round(position * 100);
  }

  if (upper === null) return 100;
  const position = clamp((upper - value) / Math.max(1, upper - point.ideal), 0, 1);
  return Math.round(position * 100);
}

export function getPointQuality(value: number, point: ThresholdPoint): "good" | "moderate" | "poor" {
  const score = calculatePointMetricScore(value, point);
  if (score >= QUALITY_GOOD_SCORE) return "good";
  if (score >= QUALITY_MODERATE_SCORE) return "moderate";
  return "poor";
}

export function isPointMetricCritical(value: number, point: ThresholdPoint): boolean {
  if (!Number.isFinite(value) || point.critical === null || !Number.isFinite(point.critical)) return false;
  if (point.critical >= point.ideal) return value >= point.critical;
  return value <= point.critical;
}

export function isPointMetricNotification(value: number, point: ThresholdPoint): boolean {
  if (!Number.isFinite(value) || point.notification === null || !Number.isFinite(point.notification)) return false;
  if (point.notification >= point.ideal) return value >= point.notification;
  return value <= point.notification;
}

export function resolvePointThreshold(
  thresholds: Record<string, ThresholdPoint> | undefined,
  metricKey: string
): ThresholdPoint | null {
  if (!thresholds) return null;
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
