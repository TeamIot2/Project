/**
 * Mock Data Service
 *
 * Generates realistic environmental sensor data for demo devices over 30 days
 * at 5-minute intervals using a seeded PRNG for reproducibility.
 */

import {
  EnvironmentalReading,
  DeviceInfo,
  DeviceStatus,
} from "../../../shared/types";

// ============================================================
// Seeded pseudo-random number generator (LCG)
// ============================================================

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /** Returns a float in [0, 1) */
  next(): number {
    // LCG parameters from Numerical Recipes
    this.state = (this.state * 1664525 + 1013904223) & 0xffffffff;
    return (this.state >>> 0) / 0x100000000;
  }

  /** Returns a float in [min, max) */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Returns a float with normal-ish distribution (Box-Muller approximation) */
  gaussian(mean: number, stddev: number): number {
    // Sum of 6 uniforms approximates normal distribution
    let sum = 0;
    for (let i = 0; i < 6; i++) {
      sum += this.next();
    }
    // Center around 0, scale to stddev
    return mean + (sum - 3) * stddev;
  }
}

// ============================================================
// Device Definitions
// ============================================================

interface DeviceConfig {
  info: DeviceInfo;
  seed: number;
  batteryStart: number; // starting battery voltage
  tempOffset: number; // per-device temperature offset
  co2Scale: number; // multiplier for CO2 activity
}

const NOW = new Date();

const DEVICE_CONFIGS: DeviceConfig[] = [
  {
    info: {
      device_id: "esp32-001",
      name: "Gym",
      location: "Gym",
      last_seen: NOW.toISOString(),
      status: "online" as DeviceStatus,
      firmware_version: "1.2.0",
      battery_v: 3.95,
    },
    seed: 42,
    batteryStart: 4.2,
    tempOffset: 0.5,
    co2Scale: 1.0,
  },
  {
    info: {
      device_id: "esp32-002",
      name: "Office",
      location: "Office - 2nd Floor",
      last_seen: NOW.toISOString(),
      status: "online" as DeviceStatus,
      firmware_version: "1.2.0",
      battery_v: 4.02,
    },
    seed: 137,
    batteryStart: 4.15,
    tempOffset: -0.3,
    co2Scale: 1.2,
  },
  {
    info: {
      device_id: "esp32-003",
      name: "Bedroom",
      location: "Bedroom",
      last_seen: NOW.toISOString(),
      status: "online" as DeviceStatus,
      firmware_version: "1.1.3",
      battery_v: 3.82,
    },
    seed: 256,
    batteryStart: 4.1,
    tempOffset: -0.8,
    co2Scale: 0.8,
  },
  {
    info: {
      device_id: "esp32-004",
      name: "Greenhouse",
      location: "Greenhouse",
      last_seen: NOW.toISOString(),
      status: "online" as DeviceStatus,
      firmware_version: "1.0.0",
      battery_v: 3.88,
    },
    seed: 999,
    batteryStart: 4.05,
    tempOffset: 1.2,
    co2Scale: 0.9,
  },
  {
    info: {
      device_id: "esp32-005",
      name: "School",
      location: "School",
      last_seen: NOW.toISOString(),
      status: "online" as DeviceStatus,
      firmware_version: "1.2.1",
      battery_v: 4.01,
    },
    seed: 512,
    batteryStart: 4.18,
    tempOffset: 0.1,
    co2Scale: 1.1,
  },
];

// ============================================================
// Data Generation
// ============================================================

const DAYS = 30;
const INTERVAL_MINUTES = 5;
const READINGS_PER_DAY = (24 * 60) / INTERVAL_MINUTES; // 288
const TOTAL_READINGS_PER_DEVICE = DAYS * READINGS_PER_DAY; // 8640

/**
 * Generate all readings for a single device.
 */
function generateDeviceReadings(config: DeviceConfig): EnvironmentalReading[] {
  const rng = new SeededRandom(config.seed);
  const readings: EnvironmentalReading[] = [];

  const endTime = NOW.getTime();
  const startTime = endTime - DAYS * 24 * 60 * 60 * 1000;

  // Slow-drifting pressure base (changes over days)
  let pressureBase = 1013;
  let pressureDrift = 0;

  // Battery decreases linearly over 30 days
  const batteryDrainPerReading =
    (config.batteryStart - 3.3) / TOTAL_READINGS_PER_DEVICE;

  for (let i = 0; i < TOTAL_READINGS_PER_DEVICE; i++) {
    const timestamp = new Date(
      startTime + i * INTERVAL_MINUTES * 60 * 1000
    );
    const hour = timestamp.getHours();
    const minuteOfDay = hour * 60 + timestamp.getMinutes();
    const dayOfDataset = Math.floor(i / READINGS_PER_DAY);

    // --- Time-of-day factor (0=midnight, 1=noon peak) ---
    // Sine wave peaking around 14:00
    const dayFactor =
      0.5 + 0.5 * Math.sin(((minuteOfDay - 360) / 1440) * 2 * Math.PI);
    const isNight = hour >= 23 || hour < 6;
    const isDawn = hour >= 6 && hour < 8;
    const isDusk = hour >= 19 && hour < 21;
    const isDay = hour >= 8 && hour < 19;

    // --- CO2 (ppm) ---
    // Night: 400-500, Day: 600-1000, occasional spikes
    const co2Base = isNight
      ? rng.range(400, 500)
      : 450 + dayFactor * 550 * config.co2Scale;
    let co2 = co2Base + rng.gaussian(0, 30);
    // Occasional spike (about 2% chance during daytime)
    if (!isNight && rng.next() < 0.02) {
      co2 += rng.range(200, 500);
    }
    co2 = Math.max(380, Math.min(2000, co2));

    // --- Temperature (C) ---
    // Night: 19-21, Day: 22-25 with sine wave
    const tempBase =
      20 + dayFactor * 4 + config.tempOffset + rng.gaussian(0, 0.3);
    const temperature = Math.max(
      16,
      Math.min(30, tempBase)
    );

    // --- Humidity (%) ---
    // Inversely correlated with temperature
    const humidityBase = 65 - dayFactor * 20 + rng.gaussian(0, 3);
    const humidity = Math.max(25, Math.min(75, humidityBase));

    // --- Pressure (hPa) ---
    // Slow multi-day drift
    if (i % READINGS_PER_DAY === 0) {
      pressureDrift += rng.gaussian(0, 1.5);
      pressureDrift = Math.max(-10, Math.min(10, pressureDrift));
      pressureBase = 1013 + pressureDrift;
    }
    const pressure = pressureBase + rng.gaussian(0, 0.5);

    // --- Light (lux) ---
    let light: number;
    if (isNight) {
      light = rng.range(0, 2);
    } else if (isDawn) {
      // Quick rise at dawn
      const dawnProgress = (minuteOfDay - 360) / 120; // 0 to 1 over 2 hours
      light = dawnProgress * rng.range(200, 400) + rng.gaussian(0, 10);
    } else if (isDusk) {
      // Quick fall at dusk
      const duskProgress = (minuteOfDay - 1140) / 120; // 0 to 1 over 2 hours
      light = (1 - duskProgress) * rng.range(200, 400) + rng.gaussian(0, 10);
    } else if (isDay) {
      light = rng.range(100, 500) + rng.gaussian(0, 20);
    } else {
      light = rng.range(0, 5);
    }
    light = Math.max(0, Math.round(light));

    // --- Sound (ADC) ---
    // Night: 1800-1900, Day: 2000-2200, occasional spikes
    const soundBase = isNight
      ? rng.range(1800, 1900)
      : 1950 + dayFactor * 250;
    const soundLevel = Math.round(soundBase + rng.gaussian(0, 40));
    const soundPeak = Math.round(
      soundLevel + Math.abs(rng.gaussian(0, 150))
    );
    // RMS is between level and peak
    const soundRms = Math.round((soundLevel + soundPeak) / 2 + rng.gaussian(0, 20));
    const soundEvent = soundPeak > 2700;

    // --- Battery ---
    const battery =
      config.batteryStart - batteryDrainPerReading * i + rng.gaussian(0, 0.01);

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
// In-Memory Data Store (generated at startup)
// ============================================================

console.log(`[MockData] Generating 30 days of sensor data for ${DEVICE_CONFIGS.length} devices...`);
const startGen = Date.now();

/** All devices indexed by device_id */
const devicesMap: Map<string, DeviceInfo> = new Map();

/** All readings indexed by device_id, sorted by timestamp ascending */
const readingsMap: Map<string, EnvironmentalReading[]> = new Map();

/** All readings in a flat list, sorted by timestamp descending */
let allReadingsSorted: EnvironmentalReading[] = [];

for (const config of DEVICE_CONFIGS) {
  devicesMap.set(config.info.device_id, config.info);
  const readings = generateDeviceReadings(config);
  readingsMap.set(config.info.device_id, readings);
  allReadingsSorted = allReadingsSorted.concat(readings);
}

// Sort descending by timestamp for query convenience
allReadingsSorted.sort(
  (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
);

const elapsed = Date.now() - startGen;
console.log(
  `[MockData] Generated ${allReadingsSorted.length} readings in ${elapsed}ms`
);

// Update device battery_v from latest reading
for (const config of DEVICE_CONFIGS) {
  const deviceReadings = readingsMap.get(config.info.device_id);
  if (deviceReadings && deviceReadings.length > 0) {
    const latest = deviceReadings[deviceReadings.length - 1];
    const device = devicesMap.get(config.info.device_id)!;
    device.battery_v = latest.battery_v;
  }
}

// ============================================================
// Public API
// ============================================================

/** Get all devices */
export function getDevices(): DeviceInfo[] {
  return Array.from(devicesMap.values());
}

/** Get a single device by ID */
export function getDevice(deviceId: string): DeviceInfo | undefined {
  return devicesMap.get(deviceId);
}

/** Get the latest reading for a device */
export function getLatestReading(
  deviceId: string
): EnvironmentalReading | undefined {
  const readings = readingsMap.get(deviceId);
  if (!readings || readings.length === 0) return undefined;
  return readings[readings.length - 1]; // Last element is newest (ascending order)
}

/**
 * Query readings with optional filters.
 */
export function getReadings(options: {
  deviceId?: string;
  from?: string;
  to?: string;
  limit?: number;
}): EnvironmentalReading[] {
  const { deviceId, from, to } = options;
  let limit = options.limit ?? 500;
  if (limit > 2000) limit = 2000;

  let result: EnvironmentalReading[];

  if (deviceId) {
    // Use device-specific index (ascending) then reverse
    const deviceReadings = readingsMap.get(deviceId);
    if (!deviceReadings) return [];
    result = [...deviceReadings].reverse(); // Now descending
  } else {
    result = allReadingsSorted;
  }

  // Apply time filters
  if (from) {
    const fromTime = new Date(from).getTime();
    result = result.filter(
      (r) => new Date(r.timestamp).getTime() >= fromTime
    );
  }
  if (to) {
    const toTime = new Date(to).getTime();
    result = result.filter(
      (r) => new Date(r.timestamp).getTime() <= toTime
    );
  }

  // Apply limit
  return result.slice(0, limit);
}

/**
 * Compute stats (min, max, avg, current) for a device in a time range.
 */
export function getStats(
  deviceId: string,
  from?: string,
  to?: string
): {
  device_id: string;
  from: string;
  to: string;
  metrics: Record<string, { min: number; max: number; avg: number; current: number }>;
} | null {
  const deviceReadings = readingsMap.get(deviceId);
  if (!deviceReadings || deviceReadings.length === 0) return null;

  let filtered = deviceReadings;

  if (from) {
    const fromTime = new Date(from).getTime();
    filtered = filtered.filter(
      (r) => new Date(r.timestamp).getTime() >= fromTime
    );
  }
  if (to) {
    const toTime = new Date(to).getTime();
    filtered = filtered.filter(
      (r) => new Date(r.timestamp).getTime() <= toTime
    );
  }

  if (filtered.length === 0) return null;

  const latest = filtered[filtered.length - 1];
  const metricKeys = [
    "co2_ppm",
    "temperature_c",
    "humidity_pct",
    "pressure_hpa",
    "light_lux",
    "sound_level_adc",
  ] as const;

  const metrics: Record<
    string,
    { min: number; max: number; avg: number; current: number }
  > = {};

  for (const key of metricKeys) {
    const values = filtered.map((r) => r[key] as number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const current = latest[key] as number;

    metrics[key] = {
      min: parseFloat(min.toFixed(1)),
      max: parseFloat(max.toFixed(1)),
      avg: parseFloat(avg.toFixed(1)),
      current: parseFloat(current.toFixed(1)),
    };
  }

  return {
    device_id: deviceId,
    from: filtered[0].timestamp,
    to: filtered[filtered.length - 1].timestamp,
    metrics,
  };
}
