/**
 * Auto-Seed Service
 *
 * Lightweight version of scripts/seed.ts that can be called at server startup.
 * Populates the database with mock data when it's empty.
 */

import { insertReadings, upsertDevice, flushDatabase } from "./database";
import type { EnvironmentalReading, DeviceInfo, DeviceStatus } from "../../../shared/types";

// Seeded PRNG
class SeededRandom {
  private state: number;
  constructor(seed: number) { this.state = seed; }
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) & 0xffffffff;
    return (this.state >>> 0) / 0x100000000;
  }
  range(min: number, max: number): number { return min + this.next() * (max - min); }
  gaussian(mean: number, stddev: number): number {
    let sum = 0;
    for (let i = 0; i < 6; i++) sum += this.next();
    return mean + (sum - 3) * stddev;
  }
}

interface DeviceConfig {
  info: DeviceInfo;
  seed: number;
  batteryStart: number;
  tempOffset: number;
  co2Scale: number;
}

const NOW = new Date();

const DEVICE_CONFIGS: DeviceConfig[] = [
  { info: { device_id: "esp32-001", name: "Gym", location: "Gym", last_seen: NOW.toISOString(), status: "online" as DeviceStatus, firmware_version: "1.2.0", battery_v: 3.95 }, seed: 42, batteryStart: 4.2, tempOffset: 0.5, co2Scale: 1.0 },
  { info: { device_id: "esp32-002", name: "Office", location: "Office - 2nd Floor", last_seen: NOW.toISOString(), status: "online" as DeviceStatus, firmware_version: "1.2.0", battery_v: 4.02 }, seed: 137, batteryStart: 4.15, tempOffset: -0.3, co2Scale: 1.2 },
  { info: { device_id: "esp32-003", name: "Bedroom", location: "Bedroom", last_seen: NOW.toISOString(), status: "online" as DeviceStatus, firmware_version: "1.1.3", battery_v: 3.82 }, seed: 256, batteryStart: 4.1, tempOffset: -0.8, co2Scale: 0.8 },
  { info: { device_id: "esp32-004", name: "Greenhouse", location: "Greenhouse", last_seen: NOW.toISOString(), status: "online" as DeviceStatus, firmware_version: "1.0.0", battery_v: 3.88 }, seed: 999, batteryStart: 4.05, tempOffset: 1.2, co2Scale: 0.9 },
  { info: { device_id: "esp32-005", name: "School", location: "School", last_seen: NOW.toISOString(), status: "online" as DeviceStatus, firmware_version: "1.2.1", battery_v: 4.01 }, seed: 512, batteryStart: 4.18, tempOffset: 0.1, co2Scale: 1.1 },
];

const DAYS = 30;
const INTERVAL_MINUTES = 5;
const READINGS_PER_DAY = (24 * 60) / INTERVAL_MINUTES;
const TOTAL = DAYS * READINGS_PER_DAY;

function generateReadings(config: DeviceConfig): EnvironmentalReading[] {
  const rng = new SeededRandom(config.seed);
  const readings: EnvironmentalReading[] = [];
  const endTime = NOW.getTime();
  const startTime = endTime - DAYS * 24 * 60 * 60 * 1000;
  let pressureBase = 1013, pressureDrift = 0;
  const drain = (config.batteryStart - 3.3) / TOTAL;

  for (let i = 0; i < TOTAL; i++) {
    const ts = new Date(startTime + i * INTERVAL_MINUTES * 60 * 1000);
    const hour = ts.getHours();
    const mod = hour * 60 + ts.getMinutes();
    const df = 0.5 + 0.5 * Math.sin(((mod - 360) / 1440) * 2 * Math.PI);
    const night = hour >= 23 || hour < 6;

    let co2 = (night ? rng.range(400, 500) : 450 + df * 550 * config.co2Scale) + rng.gaussian(0, 30);
    if (!night && rng.next() < 0.02) co2 += rng.range(200, 500);
    co2 = Math.max(380, Math.min(2000, co2));

    const temp = Math.max(16, Math.min(30, 20 + df * 4 + config.tempOffset + rng.gaussian(0, 0.3)));
    const hum = Math.max(25, Math.min(75, 65 - df * 20 + rng.gaussian(0, 3)));

    if (i % READINGS_PER_DAY === 0) { pressureDrift += rng.gaussian(0, 1.5); pressureDrift = Math.max(-10, Math.min(10, pressureDrift)); pressureBase = 1013 + pressureDrift; }
    const pres = pressureBase + rng.gaussian(0, 0.5);

    let light: number;
    if (night) light = rng.range(0, 2);
    else if (hour >= 6 && hour < 8) light = ((mod - 360) / 120) * rng.range(200, 400) + rng.gaussian(0, 10);
    else if (hour >= 19 && hour < 21) light = (1 - (mod - 1140) / 120) * rng.range(200, 400) + rng.gaussian(0, 10);
    else if (hour >= 8 && hour < 19) light = rng.range(100, 500) + rng.gaussian(0, 20);
    else light = rng.range(0, 5);
    light = Math.max(0, Math.round(light));

    const sBase = night ? rng.range(1800, 1900) : 1950 + df * 250;
    const sLvl = Math.round(sBase + rng.gaussian(0, 40));
    const sPeak = Math.round(sLvl + Math.abs(rng.gaussian(0, 150)));
    const sRms = Math.round((sLvl + sPeak) / 2 + rng.gaussian(0, 20));
    const bat = config.batteryStart - drain * i + rng.gaussian(0, 0.01);

    readings.push({
      device_id: config.info.device_id,
      co2_ppm: Math.round(co2), temperature_c: parseFloat(temp.toFixed(1)),
      humidity_pct: parseFloat(hum.toFixed(1)), pressure_hpa: parseFloat(pres.toFixed(1)),
      light_lux: light, sound_level_adc: Math.max(0, sLvl),
      sound_peak_adc: Math.max(0, sPeak), sound_rms_adc: Math.max(0, sRms),
      sound_event: sPeak > 2700, battery_v: parseFloat(Math.max(3.0, bat).toFixed(2)),
      timestamp: ts.toISOString(),
    });
  }
  return readings;
}

/** Seed the database with mock data. Call only when DB is empty. */
export function autoSeed(): void {
  const t0 = Date.now();
  let total = 0;

  for (const config of DEVICE_CONFIGS) {
    upsertDevice(config.info);
    const readings = generateReadings(config);
    for (let i = 0; i < readings.length; i += 2000) {
      insertReadings(readings.slice(i, i + 2000));
    }
    total += readings.length;
    const latest = readings[readings.length - 1];
    config.info.battery_v = latest.battery_v;
    upsertDevice(config.info);
  }

  flushDatabase();
  console.log(`[AutoSeed] ${total} readings in ${Date.now() - t0}ms`);
}
