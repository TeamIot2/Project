import type { DeviceInfo, EnvironmentalReading } from "../../../shared/types";
import {
  countReadingsForDevice,
  countReadingsForDeviceSource,
  deleteReadingsForDevice,
  deleteReadingsForDeviceSource,
  deleteSyntheticReadingsForDevice,
  flushDatabase,
  getLatestReadingFromDb,
  insertReadings,
  upsertDevice,
} from "./database";
import { REAL_BEDROOM_DEVICE_ID, REAL_OFFICE_DEVICE_ID } from "./appDataService";

export const HISTORY_GYM_MOCK_DEVICE_ID = "gym-mock-history";

const HISTORY_DAYS = 365;
const INTERVAL_MINUTES = 30;
const EXPECTED_READING_COUNT = HISTORY_DAYS * ((24 * 60) / INTERVAL_MINUTES);
const MAX_LATEST_AGE_MS = 36 * 60 * 60 * 1000;
const REAL_PRESENTATION_HISTORY_SOURCE = "real-presentation-history";
const REAL_PRESENTATION_HISTORY_START_MS = Date.UTC(2025, 4, 1, 0, 0, 0);
const REAL_PRESENTATION_HISTORY_END_MS = Date.UTC(2026, 4, 1, 0, 0, 0);
const REAL_PRESENTATION_EXPECTED_READING_COUNT =
  Math.floor((REAL_PRESENTATION_HISTORY_END_MS - REAL_PRESENTATION_HISTORY_START_MS) / (INTERVAL_MINUTES * 60 * 1000));

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  gaussian(mean: number, stddev: number): number {
    let sum = 0;
    for (let i = 0; i < 6; i += 1) sum += this.next();
    return mean + (sum - 3) * stddev;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 1): number {
  return Number(value.toFixed(decimals));
}

function dailyActivity(hour: number): number {
  const morning = Math.exp(-Math.pow((hour - 8.0) / 1.7, 2));
  const afternoon = Math.exp(-Math.pow((hour - 17.7) / 2.1, 2));
  const midday = 0.35 * Math.exp(-Math.pow((hour - 12.5) / 3.5, 2));
  return clamp(morning * 0.75 + afternoon + midday, 0, 1);
}

function daylight(hour: number, dayOfYear: number): number {
  const seasonalShift = Math.sin(((dayOfYear - 80) / 365) * 2 * Math.PI);
  const sunrise = 7.0 - seasonalShift * 1.5;
  const sunset = 18.0 + seasonalShift * 1.7;
  if (hour < sunrise || hour > sunset) return 0;
  const phase = (hour - sunrise) / (sunset - sunrise);
  return Math.sin(phase * Math.PI);
}

function generateGymHistoryReadings(now: Date): EnvironmentalReading[] {
  const rng = new SeededRandom(20260604);
  const readings: EnvironmentalReading[] = [];
  const startMs = now.getTime() - HISTORY_DAYS * 24 * 60 * 60 * 1000;
  const stepMs = INTERVAL_MINUTES * 60 * 1000;
  const totalPoints = EXPECTED_READING_COUNT + 1;

  for (let i = 0; i < totalPoints; i += 1) {
    const timestamp = new Date(startMs + i * stepMs);
    const hour = timestamp.getHours() + timestamp.getMinutes() / 60;
    const dayOfYear = Math.floor(
      (Date.UTC(timestamp.getUTCFullYear(), timestamp.getUTCMonth(), timestamp.getUTCDate()) -
        Date.UTC(timestamp.getUTCFullYear(), 0, 0)) /
        86400000
    );
    const weekend = timestamp.getDay() === 0 || timestamp.getDay() === 6;
    const activity = dailyActivity(hour) * (weekend ? 0.55 : 1);
    const sun = daylight(hour, dayOfYear);
    const weatherWave = Math.sin((i / 48 / 5.7) * 2 * Math.PI);
    const seasonalTemperature = Math.sin(((dayOfYear - 172) / 365) * 2 * Math.PI);

    const co2 = clamp(430 + activity * 760 + weatherWave * 35 + rng.gaussian(0, 24), 390, 1800);
    const temperature = clamp(19.5 + activity * 2.4 + seasonalTemperature * 1.2 + rng.gaussian(0, 0.25), 17, 28);
    const humidity = clamp(48 - activity * 8 - seasonalTemperature * 5 + rng.gaussian(0, 2.2), 28, 72);
    const pressure = clamp(1013 + weatherWave * 7 + Math.sin((i / 48 / 13) * 2 * Math.PI) * 4 + rng.gaussian(0, 0.4), 985, 1045);
    const light = clamp(sun * (180 + activity * 520) + rng.gaussian(0, 22), 0, 900);
    const soundLevel = clamp(950 + activity * 1300 + rng.gaussian(0, 75), 650, 3200);
    const soundPeak = clamp(soundLevel + activity * 420 + Math.abs(rng.gaussian(0, 130)), soundLevel, 4095);
    const soundRms = clamp((soundLevel + soundPeak) / 2 + rng.gaussian(0, 30), 650, 4095);

    readings.push({
      device_id: HISTORY_GYM_MOCK_DEVICE_ID,
      timestamp: timestamp.toISOString(),
      co2_ppm: Math.round(co2),
      temperature_c: round(temperature),
      humidity_pct: round(humidity),
      pressure_hpa: round(pressure),
      light_lux: Math.round(light),
      sound_level_adc: Math.round(soundLevel),
      sound_peak_adc: Math.round(soundPeak),
      sound_rms_adc: Math.round(soundRms),
      sound_event: soundPeak > 2850,
      battery_v: 0,
      gateway_id: "history-mock-gateway",
      source: "history-mock-persistent",
    });
  }

  return readings;
}

function generateRealPresentationHistoryReadings(deviceId: string): EnvironmentalReading[] {
  const rng = new SeededRandom(20250501);
  const readings: EnvironmentalReading[] = [];
  const stepMs = INTERVAL_MINUTES * 60 * 1000;
  const totalPoints = REAL_PRESENTATION_EXPECTED_READING_COUNT;

  for (let i = 0; i < totalPoints; i += 1) {
    const timestamp = new Date(REAL_PRESENTATION_HISTORY_START_MS + i * stepMs);
    const hour = timestamp.getUTCHours() + timestamp.getUTCMinutes() / 60;
    const dayOfYear = Math.floor(
      (Date.UTC(timestamp.getUTCFullYear(), timestamp.getUTCMonth(), timestamp.getUTCDate()) -
        Date.UTC(timestamp.getUTCFullYear(), 0, 0)) /
        86400000
    );
    const weekend = timestamp.getUTCDay() === 0 || timestamp.getUTCDay() === 6;
    const occupancy = dailyActivity(hour) * (weekend ? 0.45 : 0.9);
    const sun = daylight(hour, dayOfYear);
    const pressureWave = Math.sin((i / 48 / 8.5) * 2 * Math.PI);
    const seasonalTemperature = Math.sin(((dayOfYear - 172) / 365) * 2 * Math.PI);

    const co2 = clamp(455 + occupancy * 620 + rng.gaussian(0, 22), 390, 1450);
    const temperature = clamp(22.2 + seasonalTemperature * 3.2 + occupancy * 1.4 + rng.gaussian(0, 0.25), 17, 31);
    const humidity = clamp(45 - seasonalTemperature * 7 + rng.gaussian(0, 2.1), 28, 72);
    const pressure = clamp(1012 + pressureWave * 8 + rng.gaussian(0, 0.45), 984, 1046);
    const light = clamp(sun * (60 + occupancy * 360) + rng.gaussian(0, 18), 0, 760);
    const soundLevel = clamp(880 + occupancy * 740 + rng.gaussian(0, 55), 680, 2600);
    const soundPeak = clamp(soundLevel + occupancy * 260 + Math.abs(rng.gaussian(0, 95)), soundLevel, 4095);
    const soundRms = clamp((soundLevel + soundPeak) / 2 + rng.gaussian(0, 20), 650, 4095);

    readings.push({
      device_id: deviceId,
      timestamp: timestamp.toISOString(),
      co2_ppm: Math.round(co2),
      temperature_c: round(temperature),
      humidity_pct: round(humidity),
      pressure_hpa: round(pressure),
      light_lux: Math.round(light),
      sound_level_adc: Math.round(soundLevel),
      sound_peak_adc: Math.round(soundPeak),
      sound_rms_adc: Math.round(soundRms),
      sound_event: soundPeak > 2350,
      battery_v: 0,
      gateway_id: "real-presentation-history",
      source: REAL_PRESENTATION_HISTORY_SOURCE,
    });
  }

  return readings;
}

export function removeSyntheticOfficeHistory(): void {
  deleteSyntheticReadingsForDevice(REAL_OFFICE_DEVICE_ID);
  deleteSyntheticReadingsForDevice(REAL_BEDROOM_DEVICE_ID);
}

export function ensureRealPresentationHistoryData(): void {
  const existingCount = countReadingsForDeviceSource(REAL_OFFICE_DEVICE_ID, REAL_PRESENTATION_HISTORY_SOURCE);
  if (existingCount === REAL_PRESENTATION_EXPECTED_READING_COUNT) {
    return;
  }

  deleteReadingsForDeviceSource(REAL_OFFICE_DEVICE_ID, REAL_PRESENTATION_HISTORY_SOURCE);
  const readings = generateRealPresentationHistoryReadings(REAL_OFFICE_DEVICE_ID);
  for (let i = 0; i < readings.length; i += 1000) {
    insertReadings(readings.slice(i, i + 1000));
  }
  flushDatabase();
  console.log(
    `[HistoryMockSeed] Seeded ${readings.length} real-mode presentation history readings from 2025-05-01 to before 2026-05-01.`
  );
}

export function ensurePersistentGymHistoryMockData(): void {
  const now = new Date();
  const latest = getLatestReadingFromDb(HISTORY_GYM_MOCK_DEVICE_ID);
  const existingCount = countReadingsForDevice(HISTORY_GYM_MOCK_DEVICE_ID);
  const latestAgeMs = latest ? now.getTime() - new Date(latest.timestamp).getTime() : Number.POSITIVE_INFINITY;

  const device: DeviceInfo = {
    device_id: HISTORY_GYM_MOCK_DEVICE_ID,
    name: "Gym (mock data)",
    location: "History test data",
    last_seen: now.toISOString(),
    status: "online",
    firmware_version: "history-mock-1.0",
    battery_v: 0,
  };
  upsertDevice(device);

  if (existingCount >= EXPECTED_READING_COUNT && latestAgeMs >= 0 && latestAgeMs <= MAX_LATEST_AGE_MS) {
    return;
  }

  deleteReadingsForDevice(HISTORY_GYM_MOCK_DEVICE_ID);
  const readings = generateGymHistoryReadings(now);
  for (let i = 0; i < readings.length; i += 1000) {
    insertReadings(readings.slice(i, i + 1000));
  }
  flushDatabase();
  console.log(`[HistoryMockSeed] Seeded ${readings.length} persistent Gym history readings.`);
}
