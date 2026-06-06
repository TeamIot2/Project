import type {
  DeviceInfo,
  DeviceMeasurementUptime,
  EnvironmentalReading,
  MeasurementUptimeResponse,
  ModeMeasurementStatsResponse,
} from "../../../shared/types";
import {
  getDevicesFromDb,
  getLatestReadingFromDb,
  getStatsFromDb,
  queryReadingTimestamps,
  queryReadings,
} from "./database";
import {
  getDevices as getMockDevices,
  getLatestReading as getMockLatestReading,
  getReadings as getMockReadings,
  getStats as getMockStats,
} from "./mockDataService";

export const REAL_OFFICE_DEVICE_ID = process.env.REAL_OFFICE_DEVICE_ID ?? "esp32-001";
export const REAL_BEDROOM_DEVICE_ID = process.env.REAL_BEDROOM_DEVICE_ID ?? "esp32-003";
export const REAL_SENSOR_DEVICE_NAME = "Unicorn-ESP32";
const HISTORY_GYM_MOCK_DEVICE_ID = "gym-mock-history";

function readBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

const ENABLE_DEMO_MODE_DATA = readBooleanEnv(
  process.env.ENABLE_DEMO_MODE_DATA,
  process.env.NODE_ENV !== "production"
);
const MEASUREMENT_CONTINUITY_GAP_SECONDS = Math.max(
  1,
  Number.parseInt(process.env.MEASUREMENT_CONTINUITY_GAP_SECONDS ?? "20", 10) || 20
);
const MEASUREMENT_LIVE_MAX_AGE_SECONDS = Math.max(
  MEASUREMENT_CONTINUITY_GAP_SECONDS,
  Number.parseInt(process.env.MEASUREMENT_LIVE_MAX_AGE_SECONDS ?? "20", 10) || 20
);
const MEASUREMENT_UPTIME_LOOKBACK_LIMIT = Math.max(
  100,
  Number.parseInt(process.env.MEASUREMENT_UPTIME_LOOKBACK_LIMIT ?? "50000", 10) || 50000
);
const DEFAULT_READING_INTERVAL_SECONDS = Math.max(
  1,
  Number.parseInt(process.env.GATEWAY_SEQUENCE_INTERVAL_SECONDS ?? "5", 10) || 5
);
const MODE_STATS_MAX_CONTINUITY_GAP_SECONDS = Math.max(
  60,
  Number.parseInt(process.env.MODE_STATS_MAX_CONTINUITY_GAP_SECONDS ?? "3600", 10) || 3600
);

const REAL_DEVICE_IDS = new Set([REAL_OFFICE_DEVICE_ID, REAL_BEDROOM_DEVICE_ID]);

const DEVICE_DISPLAY_OVERRIDES: Record<string, Partial<DeviceInfo>> = {
  [REAL_OFFICE_DEVICE_ID]: { name: REAL_SENSOR_DEVICE_NAME, location: "Unicorn-ESP32" },
  [REAL_BEDROOM_DEVICE_ID]: { name: REAL_SENSOR_DEVICE_NAME, location: "Unicorn-ESP32" },
  "esp32-002": { name: "Gym (mock)", location: "Gym placeholder" },
  "esp32-004": { name: "Greenhouse (mock)", location: "Greenhouse placeholder" },
  "esp32-005": { name: "School (mock)", location: "School placeholder" },
};

function isDemoDevice(deviceId: string): boolean {
  if (deviceId === HISTORY_GYM_MOCK_DEVICE_ID) return false;
  return ENABLE_DEMO_MODE_DATA && !REAL_DEVICE_IDS.has(deviceId);
}

function resolveReadingDeviceId(deviceId: string | undefined): string | undefined {
  if (deviceId === REAL_BEDROOM_DEVICE_ID) return REAL_OFFICE_DEVICE_ID;
  return deviceId;
}

function rewriteReadingDeviceId(
  reading: EnvironmentalReading,
  requestedDeviceId: string | undefined
): EnvironmentalReading {
  if (requestedDeviceId !== REAL_BEDROOM_DEVICE_ID) return reading;
  return {
    ...reading,
    device_id: REAL_BEDROOM_DEVICE_ID,
  };
}

export function buildIngestDeviceInfo(
  reading: EnvironmentalReading,
  gatewayId: string
): DeviceInfo {
  if (reading.device_id === REAL_OFFICE_DEVICE_ID) {
    return {
      device_id: reading.device_id,
      name: REAL_SENSOR_DEVICE_NAME,
      location: "Unicorn-ESP32",
      last_seen: reading.timestamp,
      status: "online",
      battery_v: reading.battery_v,
    };
  }

  return {
    device_id: reading.device_id,
    name: reading.device_id,
    location: reading.gateway_id ?? gatewayId,
    last_seen: reading.timestamp,
    status: "online",
    battery_v: reading.battery_v,
  };
}

function normalizeAppDevice(device: DeviceInfo): DeviceInfo {
  return {
    ...device,
    ...(DEVICE_DISPLAY_OVERRIDES[device.device_id] ?? {}),
  };
}

export async function getAppDevices(): Promise<DeviceInfo[]> {
  const dbDevices = (await getDevicesFromDb())
    .filter((device) => device.device_id !== HISTORY_GYM_MOCK_DEVICE_ID)
    .filter((device) => device.device_id !== REAL_BEDROOM_DEVICE_ID)
    .map(normalizeAppDevice);

  if (!ENABLE_DEMO_MODE_DATA) return dbDevices;

  const dbDeviceIds = new Set(dbDevices.map((device) => device.device_id));
  const demoDevices = getMockDevices()
    .filter((device) => !REAL_DEVICE_IDS.has(device.device_id))
    .filter((device) => !dbDeviceIds.has(device.device_id))
    .map(normalizeAppDevice);

  return [...dbDevices, ...demoDevices];
}

export function getAppReadings(options: {
  deviceId?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<EnvironmentalReading[]> {
  if (options.deviceId && isDemoDevice(options.deviceId)) {
    return Promise.resolve(getMockReadings(options));
  }

  const dataDeviceId = resolveReadingDeviceId(options.deviceId);
  return queryReadings({
    ...options,
    deviceId: dataDeviceId,
  }).then((readings) => readings.map((reading) => rewriteReadingDeviceId(reading, options.deviceId)));
}

export async function getAppLatestReading(deviceId: string): Promise<EnvironmentalReading | undefined> {
  if (isDemoDevice(deviceId)) {
    return getMockLatestReading(deviceId);
  }

  const reading = await getLatestReadingFromDb(resolveReadingDeviceId(deviceId) ?? deviceId);
  return reading ? rewriteReadingDeviceId(reading, deviceId) : undefined;
}

export function getAppStats(
  deviceId: string,
  from?: string,
  to?: string
): Promise<{
  device_id: string;
  from: string;
  to: string;
  metrics: Record<string, { min: number; max: number; avg: number; current: number }>;
} | null> {
  if (isDemoDevice(deviceId)) {
    return Promise.resolve(getMockStats(deviceId, from, to));
  }

  return getStatsFromDb(resolveReadingDeviceId(deviceId) ?? deviceId, from, to).then((stats) => stats && deviceId === REAL_BEDROOM_DEVICE_ID
    ? { ...stats, device_id: REAL_BEDROOM_DEVICE_ID }
    : stats);
}

function parseTimestamp(value: string | undefined | null): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function isoOrNull(time: number | null): string | null {
  return time === null ? null : new Date(time).toISOString();
}

function emptyDeviceUptime(deviceId: string, latestAt: string | null = null): DeviceMeasurementUptime {
  return {
    device_id: deviceId,
    measuring: false,
    started_at: null,
    latest_at: latestAt,
    uptime_seconds: 0,
    sample_count: 0,
  };
}

function resolveLiveStartedAtMs(
  monitoringStartedMs: number | null,
  measurementStartedMs: number | null
): number | null {
  const starts = [monitoringStartedMs, measurementStartedMs].filter((time): time is number => time !== null);
  if (starts.length === 0) return null;
  return Math.max(...starts);
}

async function getDeviceMeasurementUptime(deviceId: string, nowMs: number): Promise<DeviceMeasurementUptime> {
  const dataDeviceId = resolveReadingDeviceId(deviceId) ?? deviceId;
  const appDevices = await getAppDevices();
  const device =
    appDevices.find((candidate) => candidate.device_id === deviceId) ??
    appDevices.find((candidate) => candidate.device_id === dataDeviceId);
  if (device?.monitoring_enabled === false) {
    return emptyDeviceUptime(deviceId);
  }

  const monitoringStartedMs = parseTimestamp(device?.monitoring_updated_at);
  const measurementStartedMs = parseTimestamp(device?.measurement_started_at);
  const readings = (await getAppReadings({
    deviceId,
    limit: MEASUREMENT_UPTIME_LOOKBACK_LIMIT,
  }))
    .map((reading) => ({
      timestamp: reading.timestamp,
      time: parseTimestamp(reading.timestamp),
    }))
    .filter((reading): reading is { timestamp: string; time: number } => reading.time !== null)
    .sort((a, b) => b.time - a.time);

  const latestReading = readings.find((reading) =>
    monitoringStartedMs === null || reading.time >= monitoringStartedMs
  );
  const liveStartedAtMs = resolveLiveStartedAtMs(monitoringStartedMs, measurementStartedMs);

  if (!latestReading) {
    if (device?.status === "online" && liveStartedAtMs !== null) {
      return {
        device_id: deviceId,
        measuring: true,
        started_at: isoOrNull(liveStartedAtMs),
        latest_at: null,
        uptime_seconds: Math.max(0, Math.floor((nowMs - liveStartedAtMs) / 1000)),
        sample_count: 0,
      };
    }
    return emptyDeviceUptime(deviceId);
  }

  const liveMaxAgeMs = MEASUREMENT_LIVE_MAX_AGE_SECONDS * 1000;
  if (nowMs - latestReading.time > liveMaxAgeMs) {
    if (device?.status === "online" && liveStartedAtMs !== null) {
      return {
        device_id: deviceId,
        measuring: true,
        started_at: isoOrNull(liveStartedAtMs),
        latest_at: latestReading.timestamp,
        uptime_seconds: Math.max(0, Math.floor((nowMs - liveStartedAtMs) / 1000)),
        sample_count: 0,
      };
    }
    return emptyDeviceUptime(deviceId, latestReading.timestamp);
  }

  const maxGapMs = MEASUREMENT_CONTINUITY_GAP_SECONDS * 1000;
  let streakStartMs = latestReading.time;
  let previousMs = latestReading.time;
  let sampleCount = 1;

  for (const reading of readings) {
    if (reading.time >= latestReading.time) continue;
    if (monitoringStartedMs !== null && reading.time < monitoringStartedMs) break;

    const gapMs = previousMs - reading.time;
    if (gapMs > maxGapMs) break;
    if (gapMs < 0) continue;

    streakStartMs = reading.time;
    previousMs = reading.time;
    sampleCount += 1;
  }

  const sequenceStartedMs =
    measurementStartedMs !== null && measurementStartedMs <= latestReading.time
      ? measurementStartedMs
      : null;
  const continuousStartedMs = sequenceStartedMs !== null
    ? Math.min(streakStartMs, sequenceStartedMs)
    : streakStartMs;
  const startedMs = monitoringStartedMs !== null && monitoringStartedMs > continuousStartedMs
    ? monitoringStartedMs
    : continuousStartedMs;

  return {
    device_id: deviceId,
    measuring: true,
    started_at: isoOrNull(startedMs),
    latest_at: latestReading.timestamp,
    uptime_seconds: Math.max(0, Math.floor((nowMs - startedMs) / 1000)),
    sample_count: sampleCount,
  };
}

export async function getAppMeasurementUptime(deviceIds: string[]): Promise<MeasurementUptimeResponse> {
  const uniqueDeviceIds = Array.from(new Set(deviceIds.map((id) => id.trim()).filter(Boolean)));
  const nowMs = Date.now();
  const devices = await Promise.all(uniqueDeviceIds.map((deviceId) => getDeviceMeasurementUptime(deviceId, nowMs)));
  const activeDevices = devices.filter((device) => device.measuring && device.started_at !== null);

  if (activeDevices.length === 0) {
    return {
      device_ids: uniqueDeviceIds,
      measuring: false,
      started_at: null,
      latest_at: null,
      uptime_seconds: 0,
      devices,
    };
  }

  const startedMs = Math.max(
    ...activeDevices.map((device) => parseTimestamp(device.started_at) ?? nowMs)
  );
  const latestTimes = activeDevices
    .map((device) => parseTimestamp(device.latest_at))
    .filter((time): time is number => time !== null);
  const latestMs = latestTimes.length > 0 ? Math.min(...latestTimes) : null;

  return {
    device_ids: uniqueDeviceIds,
    measuring: true,
    started_at: isoOrNull(startedMs),
    latest_at: isoOrNull(latestMs),
    uptime_seconds: Math.max(0, Math.floor((nowMs - startedMs) / 1000)),
    devices,
  };
}

async function getAppReadingTimestampMillis(deviceId: string): Promise<number[]> {
  if (isDemoDevice(deviceId)) {
    return getMockReadings({ deviceId, limit: 100000 })
      .map((reading) => parseTimestamp(reading.timestamp))
      .filter((time): time is number => time !== null);
  }

  const dataDeviceId = resolveReadingDeviceId(deviceId) ?? deviceId;
  return (await queryReadingTimestamps(dataDeviceId))
    .map(parseTimestamp)
    .filter((time): time is number => time !== null);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

export async function getAppModeMeasurementStats(
  mode: string,
  deviceIds: string[],
  requestedIntervalSeconds?: number
): Promise<ModeMeasurementStatsResponse> {
  const uniqueDeviceIds = Array.from(new Set(deviceIds.map((id) => id.trim()).filter(Boolean)));
  const uniqueDataDeviceIds = Array.from(new Set(uniqueDeviceIds.map((deviceId) => resolveReadingDeviceId(deviceId) ?? deviceId)));
  const intervalSeconds = Math.max(1, Math.floor(requestedIntervalSeconds ?? DEFAULT_READING_INTERVAL_SECONDS));
  const intervalMs = intervalSeconds * 1000;
  const maxGapMs = Math.max(MODE_STATS_MAX_CONTINUITY_GAP_SECONDS * 1000, intervalMs * 3);

  const allTimes = (await Promise.all(uniqueDataDeviceIds.map((deviceId) => getAppReadingTimestampMillis(deviceId))))
    .flat()
    .filter((time) => Number.isFinite(time))
    .sort((a, b) => a - b);

  if (allTimes.length === 0) {
    return {
      mode,
      device_ids: uniqueDeviceIds,
      from: null,
      to: null,
      uptime_seconds: 0,
      interval_seconds: intervalSeconds,
      reliability_pct: 0,
      stored_samples: 0,
      expected_samples: 0,
      segments: 0,
    };
  }

  const uniqueTimes: number[] = [];
  for (const time of allTimes) {
    const previous = uniqueTimes[uniqueTimes.length - 1];
    if (previous === undefined || Math.abs(time - previous) >= Math.max(1, intervalMs * 0.5)) {
      uniqueTimes.push(time);
    }
  }

  let totalDurationMs = 0;
  let expectedSamples = 0;
  let storedSamples = 0;
  let segments = 0;
  let segmentStart = uniqueTimes[0];
  let segmentEnd = uniqueTimes[0];
  let segmentSamples = 1;
  let segmentGaps: number[] = [];

  const closeSegment = () => {
    const observedIntervalMs = median(segmentGaps);
    const expectedIntervalMs = Math.max(intervalMs, Math.round(observedIntervalMs ?? intervalMs));
    segments += 1;
    totalDurationMs += Math.max(expectedIntervalMs, segmentEnd - segmentStart + expectedIntervalMs);
    expectedSamples += Math.max(1, Math.round((segmentEnd - segmentStart) / expectedIntervalMs) + 1);
    storedSamples += segmentSamples;
  };

  for (let index = 1; index < uniqueTimes.length; index += 1) {
    const time = uniqueTimes[index];
    const gapMs = time - segmentEnd;

    if (gapMs <= maxGapMs) {
      segmentEnd = time;
      segmentSamples += 1;
      segmentGaps.push(gapMs);
      continue;
    }

    closeSegment();
    segmentStart = time;
    segmentEnd = time;
    segmentSamples = 1;
    segmentGaps = [];
  }

  closeSegment();

  return {
    mode,
    device_ids: uniqueDeviceIds,
    from: isoOrNull(uniqueTimes[0]),
    to: isoOrNull(uniqueTimes[uniqueTimes.length - 1]),
    uptime_seconds: Math.max(0, Math.floor(totalDurationMs / 1000)),
    interval_seconds: intervalSeconds,
    reliability_pct: expectedSamples > 0
      ? Math.max(0, Math.min(100, Math.round((storedSamples / expectedSamples) * 100)))
      : 0,
    stored_samples: storedSamples,
    expected_samples: expectedSamples,
    segments,
  };
}
