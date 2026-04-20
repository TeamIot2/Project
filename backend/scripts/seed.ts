/**
 * Seed Script
 *
 * Populates the SQLite database with mock sensor data
 * using the same generation logic as mockDataService.
 *
 * Usage: npm run seed
 */

import { initDatabase, insertReadings, upsertDevice, flushDatabase, hasData } from "../src/services/database";
import type { EnvironmentalReading, DeviceInfo, DeviceStatus } from "../../shared/types";

// ============================================================
// Seeded PRNG (same as mockDataService)
// ============================================================

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

// ============================================================
// Device configs
// ============================================================

const NOW = new Date();

interface DeviceConfig {
  info: DeviceInfo;
  seed: number;
  batteryStart: number;
  tempOffset: number;
  co2Scale: number;
}

const DEVICE_CONFIGS: DeviceConfig[] = [
  {
    info: { device_id: "esp32-001", name: "Gym", location: "Gym", last_seen: NOW.toISOString(), status: "online" as DeviceStatus, firmware_version: "1.2.0", battery_v: 3.95 },
    seed: 42, batteryStart: 4.2, tempOffset: 0.5, co2Scale: 1.0,
  },
  {
    info: { device_id: "esp32-002", name: "Office", location: "Office - 2nd Floor", last_seen: NOW.toISOString(), status: "online" as DeviceStatus, firmware_version: "1.2.0", battery_v: 4.02 },
    seed: 137, batteryStart: 4.15, tempOffset: -0.3, co2Scale: 1.2,
  },
  {
    info: { device_id: "esp32-003", name: "Bedroom", location: "Bedroom", last_seen: NOW.toISOString(), status: "online" as DeviceStatus, firmware_version: "1.1.3", battery_v: 3.82 },
    seed: 256, batteryStart: 4.1, tempOffset: -0.8, co2Scale: 0.8,
  },
  {
    info: { device_id: "esp32-004", name: "Greenhouse", location: "Greenhouse", last_seen: NOW.toISOString(), status: "online" as DeviceStatus, firmware_version: "1.0.0", battery_v: 3.88 },
    seed: 999, batteryStart: 4.05, tempOffset: 1.2, co2Scale: 0.9,
  },
  {
    info: { device_id: "esp32-005", name: "School", location: "School", last_seen: NOW.toISOString(), status: "online" as DeviceStatus, firmware_version: "1.2.1", battery_v: 4.01 },
    seed: 512, batteryStart: 4.18, tempOffset: 0.1, co2Scale: 1.1,
  },
];

// ============================================================
// Data generation (same logic as mockDataService)
// ============================================================

const DAYS = 30;
const INTERVAL_MINUTES = 5;
const READINGS_PER_DAY = (24 * 60) / INTERVAL_MINUTES;
const TOTAL_READINGS_PER_DEVICE = DAYS * READINGS_PER_DAY;

function generateDeviceReadings(config: DeviceConfig): EnvironmentalReading[] {
  const rng = new SeededRandom(config.seed);
  const readings: EnvironmentalReading[] = [];
  const endTime = NOW.getTime();
  const startTime = endTime - DAYS * 24 * 60 * 60 * 1000;

  let pressureBase = 1013;
  let pressureDrift = 0;
  const batteryDrainPerReading = (config.batteryStart - 3.3) / TOTAL_READINGS_PER_DEVICE;

  for (let i = 0; i < TOTAL_READINGS_PER_DEVICE; i++) {
    const timestamp = new Date(startTime + i * INTERVAL_MINUTES * 60 * 1000);
    const hour = timestamp.getHours();
    const minuteOfDay = hour * 60 + timestamp.getMinutes();

    const dayFactor = 0.5 + 0.5 * Math.sin(((minuteOfDay - 360) / 1440) * 2 * Math.PI);
    const isNight = hour >= 23 || hour < 6;
    const isDawn = hour >= 6 && hour < 8;
    const isDusk = hour >= 19 && hour < 21;
    const isDay = hour >= 8 && hour < 19;

    const co2Base = isNight ? rng.range(400, 500) : 450 + dayFactor * 550 * config.co2Scale;
    let co2 = co2Base + rng.gaussian(0, 30);
    if (!isNight && rng.next() < 0.02) co2 += rng.range(200, 500);
    co2 = Math.max(380, Math.min(2000, co2));

    const tempBase = 20 + dayFactor * 4 + config.tempOffset + rng.gaussian(0, 0.3);
    const temperature = Math.max(16, Math.min(30, tempBase));

    const humidityBase = 65 - dayFactor * 20 + rng.gaussian(0, 3);
    const humidity = Math.max(25, Math.min(75, humidityBase));

    if (i % READINGS_PER_DAY === 0) {
      pressureDrift += rng.gaussian(0, 1.5);
      pressureDrift = Math.max(-10, Math.min(10, pressureDrift));
      pressureBase = 1013 + pressureDrift;
    }
    const pressure = pressureBase + rng.gaussian(0, 0.5);

    let light: number;
    if (isNight) light = rng.range(0, 2);
    else if (isDawn) { const p = (minuteOfDay - 360) / 120; light = p * rng.range(200, 400) + rng.gaussian(0, 10); }
    else if (isDusk) { const p = (minuteOfDay - 1140) / 120; light = (1 - p) * rng.range(200, 400) + rng.gaussian(0, 10); }
    else if (isDay) light = rng.range(100, 500) + rng.gaussian(0, 20);
    else light = rng.range(0, 5);
    light = Math.max(0, Math.round(light));

    const soundBase = isNight ? rng.range(1800, 1900) : 1950 + dayFactor * 250;
    const soundLevel = Math.round(soundBase + rng.gaussian(0, 40));
    const soundPeak = Math.round(soundLevel + Math.abs(rng.gaussian(0, 150)));
    const soundRms = Math.round((soundLevel + soundPeak) / 2 + rng.gaussian(0, 20));
    const soundEvent = soundPeak > 2700;

    const battery = config.batteryStart - batteryDrainPerReading * i + rng.gaussian(0, 0.01);

    readings.push({
      device_id: config.info.device_id,
      co2_ppm: Math.round(co2),
      temperature_c: parseFloat(temperature.toFixed(1)),
      humidity_pct: parseFloat(humidity.toFixed(1)),
      pressure_hpa: parseFloat(pressure.toFixed(1)),
      light_lux: light,
      sound_level_adc: Math.max(0, soundLevel),
      sound_peak_adc: Math.max(0, soundPeak),
      sound_rms_adc: Math.max(0, soundRms),
      sound_event: soundEvent,
      battery_v: parseFloat(Math.max(3.0, battery).toFixed(2)),
      timestamp: timestamp.toISOString(),
    });
  }

  return readings;
}

// ============================================================
// Main
// ============================================================

async function seed() {
  await initDatabase();

  if (hasData()) {
    console.log("[Seed] Database already has data. Skipping seed.");
    console.log("[Seed] To re-seed, delete data/readings.db and run again.");
    flushDatabase();
    process.exit(0);
  }

  console.log(`[Seed] Generating ${DAYS} days of data for ${DEVICE_CONFIGS.length} devices...`);
  const startGen = Date.now();

  let totalReadings = 0;

  for (const config of DEVICE_CONFIGS) {
    // Insert device
    upsertDevice(config.info);

    // Generate and insert readings in chunks
    const readings = generateDeviceReadings(config);

    // Insert in batches of 2000 for performance
    const BATCH = 2000;
    for (let i = 0; i < readings.length; i += BATCH) {
      const chunk = readings.slice(i, i + BATCH);
      insertReadings(chunk);
    }

    totalReadings += readings.length;
    console.log(`[Seed] ${config.info.name}: ${readings.length} readings`);

    // Update device battery from latest reading
    const latest = readings[readings.length - 1];
    config.info.battery_v = latest.battery_v;
    upsertDevice(config.info);
  }

  flushDatabase();

  const elapsed = Date.now() - startGen;
  console.log(`[Seed] Done — ${totalReadings} readings in ${elapsed}ms`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("[Seed] Error:", err);
  process.exit(1);
});
