import type { ThresholdRange } from "../types";

export type ThresholdPoint = {
  ideal: number;
  tolerancePct: number;
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
export const OFFICE_FROM_BEDROOM_MIGRATION_KEY = "modeThresholdDrafts:office-from-bedroom:2026-06-05";
export const BEDROOM_MODE_ID = "sleep";
export const UNICORN_MODE_ID = "office";

const QUALITY_GOOD_SCORE = 70;
const QUALITY_MODERATE_SCORE = 40;
const DEFAULT_NOISE_DB_THRESHOLD_POINT: ThresholdPoint = {
  ideal: 30,
  tolerancePct: 0,
  lowerBad: null,
  upperBad: 75,
  notification: 70,
  critical: 85,
};

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

function normalizeTolerancePct(value: unknown): number {
  return isFiniteNumber(value) ? Math.round(clamp(value, 0, 99)) : 0;
}

function isNoiseMetricKey(metricKey: string): boolean {
  return metricKey === "noise_adc" || metricKey === "sound_level_adc";
}

function canonicalMetricKey(metricKey: string): string {
  return metricKey === "sound_level_adc" ? "noise_adc" : metricKey;
}

function looksLikeLegacyNoiseAdcThreshold(point: ThresholdPoint): boolean {
  return [point.ideal, point.lowerBad, point.upperBad, point.notification, point.critical]
    .some((value) => value !== null && Math.abs(value) > 140);
}

export function normalizeThresholdPointForMetric(metricKey: string, point: ThresholdPoint): ThresholdPoint {
  if (isNoiseMetricKey(metricKey) && looksLikeLegacyNoiseAdcThreshold(point)) {
    return cloneThresholdPoint(DEFAULT_NOISE_DB_THRESHOLD_POINT);
  }
  return cloneThresholdPoint(point);
}

function normalizeRange(range: [number, number]): [number, number] {
  return range[0] <= range[1] ? range : [range[1], range[0]];
}

export function cloneThresholdPoint(point: ThresholdPoint): ThresholdPoint {
  return {
    ideal: isFiniteNumber(point.ideal) ? point.ideal : 0,
    tolerancePct: normalizeTolerancePct(point.tolerancePct),
    lowerBad: normalizeOptionalThresholdValue(point.lowerBad),
    upperBad: normalizeOptionalThresholdValue(point.upperBad),
    notification: normalizeOptionalThresholdValue(point.notification),
    critical: normalizeOptionalThresholdValue(point.critical),
  };
}

export function clonePointThresholds(thresholds: Record<string, ThresholdPoint>): Record<string, ThresholdPoint> {
  const result: Record<string, ThresholdPoint> = {};

  for (const [metricKey, point] of Object.entries(thresholds)) {
    const canonicalKey = canonicalMetricKey(metricKey);
    if (metricKey !== canonicalKey && result[canonicalKey]) continue;
    result[canonicalKey] = cloneThresholdPoint(point);
  }

  return result;
}

export function isThresholdPoint(value: unknown): value is ThresholdPoint {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (!isFiniteNumber(candidate.ideal)) return false;
  if (isLegacyThresholdPoint(candidate)) return false;
  return "lowerBad" in candidate || "upperBad" in candidate || "notification" in candidate || "critical" in candidate || "tolerancePct" in candidate;
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
    tolerancePct: 0,
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
    tolerancePct: 0,
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
  return clonePointThresholds(
    Object.fromEntries(
      Object.entries(thresholds).map(([metricKey, range]) => [metricKey, rangeToPoint(range)])
    )
  );
}

function isStoredModeThresholdMap(value: unknown): value is Record<string, StoredThresholdValue> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneStoredModeThresholds(thresholds: Record<string, StoredThresholdValue>): Record<string, StoredThresholdValue> {
  return JSON.parse(JSON.stringify(thresholds)) as Record<string, StoredThresholdValue>;
}

function copyBedroomThresholdsToUnicornOnce(stored: StoredModeThresholds): StoredModeThresholds {
  try {
    if (localStorage.getItem(OFFICE_FROM_BEDROOM_MIGRATION_KEY) === "done") return stored;

    const bedroomThresholds = stored[BEDROOM_MODE_ID];
    if (!isStoredModeThresholdMap(bedroomThresholds)) return stored;

    const nextStored: StoredModeThresholds = {
      ...stored,
      [UNICORN_MODE_ID]: cloneStoredModeThresholds(bedroomThresholds),
    };

    localStorage.setItem(MODE_THRESHOLD_STORAGE_KEY, JSON.stringify(nextStored));
    localStorage.setItem(OFFICE_FROM_BEDROOM_MIGRATION_KEY, "done");
    return nextStored;
  } catch {
    return stored;
  }
}

export function readStoredModeThresholds(): StoredModeThresholds {
  try {
    const raw = localStorage.getItem(MODE_THRESHOLD_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return copyBedroomThresholdsToUnicornOnce(parsed as StoredModeThresholds);
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
        normalizedMode[metricKey] = normalizeThresholdPointForMetric(metricKey, normalizedPoint);
      }
    }

    if (Object.keys(normalizedMode).length > 0) {
      result[modeId] = clonePointThresholds(normalizedMode);
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

function applyToleranceToBoundaryPosition(position: number, tolerancePct: number): number {
  const clampedPosition = clamp(position, 0, 1);
  const toleranceRatio = normalizeTolerancePct(tolerancePct) / 99;
  if (toleranceRatio <= 0 || clampedPosition <= 0 || clampedPosition >= 1) return clampedPosition;

  const distanceFromIdeal = 1 - clampedPosition;
  const toleranceExponent = 1 + toleranceRatio * 23;
  return clamp(1 - Math.pow(distanceFromIdeal, toleranceExponent), 0, 1);
}

export function calculatePointMetricScore(value: number, point: ThresholdPoint): number {
  if (!Number.isFinite(value)) return 0;

  const { lower, upper } = resolveBadBoundaries(point);

  if (value === point.ideal) return 100;

  if (value < point.ideal) {
    if (lower === null) return 100;
    const position = clamp((value - lower) / Math.max(1, point.ideal - lower), 0, 1);
    return Math.round(applyToleranceToBoundaryPosition(position, point.tolerancePct) * 100);
  }

  if (upper === null) return 100;
  const position = clamp((upper - value) / Math.max(1, upper - point.ideal), 0, 1);
  return Math.round(applyToleranceToBoundaryPosition(position, point.tolerancePct) * 100);
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
