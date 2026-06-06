/**
 * Reading Routes
 *
 * GET  /api/readings                  — Query readings with filters
 * GET  /api/readings/latest/:deviceId — Get latest reading for a device
 * GET  /api/readings/stats            — Get aggregated stats for a device
 * POST /api/readings/ingest           — Accept batch from Node-RED gateway
 */

import { Router, Request, Response } from "express";
import {
  insertReadings,
  isDeviceMonitoringEnabled,
  recordDeviceMeasurementStartFromGateway,
  upsertDevice,
} from "../services/database";
import {
  buildIngestDeviceInfo,
  getAppLatestReading,
  getAppMeasurementUptime,
  getAppModeMeasurementStats,
  getAppReadings,
  getAppStats,
} from "../services/appDataService";
import { authenticateToken } from "../middleware/auth";
import type { EnvironmentalReading } from "../../../shared/types";

const router = Router();

// ---- Gateway ingest (no user auth — uses gateway key) ----

const GATEWAY_KEY = process.env.GATEWAY_KEY || "gw-secret-key-change-me";
const GATEWAY_SEQUENCE_INTERVAL_SECONDS = Math.max(
  1,
  Number.parseInt(process.env.GATEWAY_SEQUENCE_INTERVAL_SECONDS ?? "5", 10) || 5
);

function parsePositiveSequence(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return Math.floor(parsed);
}

function parseTimestampMs(value: unknown): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function inferGatewayMeasurementStart(
  sentAt: unknown,
  sequence: unknown,
  readings: EnvironmentalReading[]
): string | null {
  const sequenceNumber = parsePositiveSequence(sequence);
  if (sequenceNumber === null) return null;

  const sentAtMs = parseTimestampMs(sentAt) ?? Math.max(
    ...readings
      .map((reading) => parseTimestampMs(reading.timestamp))
      .filter((time): time is number => time !== null),
    Date.now()
  );
  const elapsedMs = Math.max(0, sequenceNumber - 1) * GATEWAY_SEQUENCE_INTERVAL_SECONDS * 1000;
  return new Date(sentAtMs - elapsedMs).toISOString();
}

router.post("/ingest", async (req: Request, res: Response) => {
  const key = req.headers["x-gateway-key"] as string | undefined;
  if (key !== GATEWAY_KEY) {
    res.status(401).json({ error: "Invalid gateway key" });
    return;
  }

  const { gateway_id, sent_at, sequence, readings } = req.body;

  if (!gateway_id || !Array.isArray(readings) || readings.length === 0) {
    res.status(400).json({ error: "Invalid payload: need gateway_id and readings[]" });
    return;
  }

  // Field-level validation: each reading must have required fields with correct types
  const requiredFields: { key: string; type: string }[] = [
    { key: "device_id", type: "string" },
    { key: "timestamp", type: "string" },
    { key: "co2_ppm", type: "number" },
    { key: "temperature_c", type: "number" },
    { key: "humidity_pct", type: "number" },
    { key: "pressure_hpa", type: "number" },
    { key: "light_lux", type: "number" },
    { key: "sound_level_adc", type: "number" },
  ];

  const validReadings = readings.filter((r: Record<string, unknown>) => {
    if (typeof r !== "object" || r === null) return false;
    return requiredFields.every(
      ({ key, type }) => key in r && typeof r[key] === type
    );
  });

  const rejected = readings.length - validReadings.length;

  const normalizedReadings = validReadings.map((reading) => ({
    ...reading,
    gateway_id: typeof reading.gateway_id === "string" ? reading.gateway_id : gateway_id,
    source: typeof reading.source === "string" ? reading.source : "gateway-ingest",
  })) as EnvironmentalReading[];

  const enabledReadings: EnvironmentalReading[] = [];
  for (const reading of normalizedReadings) {
    if (await isDeviceMonitoringEnabled(reading.device_id)) {
      enabledReadings.push(reading);
    }
  }
  const droppedDisabled = normalizedReadings.length - enabledReadings.length;
  const accepted = enabledReadings.length > 0 ? await insertReadings(enabledReadings) : 0;
  const measurementStartedAt = inferGatewayMeasurementStart(sent_at, sequence, normalizedReadings);

  for (const reading of enabledReadings) {
    await upsertDevice(buildIngestDeviceInfo(reading, gateway_id));
    if (measurementStartedAt) {
      await recordDeviceMeasurementStartFromGateway(reading.device_id, measurementStartedAt);
    }
  }

  console.log(
    `[Ingest] gateway=${gateway_id} seq=${sequence} accepted=${accepted} rejected=${rejected} dropped_disabled=${droppedDisabled} sent_at=${sent_at}`
  );

  res.status(201).json({
    accepted,
    rejected,
    dropped_disabled: droppedDisabled,
    sequence,
    timestamp: new Date().toISOString(),
  });
});

// ---- Authenticated reading routes ----

router.use(authenticateToken);

function getDeviceIdsFromQuery(value: unknown): string[] {
  const rawValues = Array.isArray(value) ? value : [value];
  return rawValues
    .filter((item): item is string => typeof item === "string")
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

router.get("/uptime", async (req: Request, res: Response) => {
  const deviceIds = getDeviceIdsFromQuery(req.query.device_ids ?? req.query.device_id);
  if (deviceIds.length === 0) {
    res.status(400).json({ error: "device_ids query parameter is required" });
    return;
  }

  res.json(await getAppMeasurementUptime(deviceIds));
});

router.get("/mode-stats", async (req: Request, res: Response) => {
  const mode = typeof req.query.mode === "string" && req.query.mode.trim()
    ? req.query.mode.trim()
    : "unknown";
  const deviceIds = getDeviceIdsFromQuery(req.query.device_ids ?? req.query.device_id);
  if (deviceIds.length === 0) {
    res.status(400).json({ error: "device_ids query parameter is required" });
    return;
  }

  const intervalSeconds = req.query.interval_seconds
    ? Number.parseInt(req.query.interval_seconds as string, 10)
    : undefined;

  res.json(await getAppModeMeasurementStats(mode, deviceIds, intervalSeconds));
});

router.get("/", async (req: Request, res: Response) => {
  const deviceId = req.query.device_id as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const limitParam = req.query.limit
    ? parseInt(req.query.limit as string, 10)
    : undefined;

  // Validate from/to are valid ISO date strings if provided
  if (from && isNaN(new Date(from).getTime())) {
    res.status(400).json({ error: "Invalid 'from' date format. Expected ISO 8601 string." });
    return;
  }
  if (to && isNaN(new Date(to).getTime())) {
    res.status(400).json({ error: "Invalid 'to' date format. Expected ISO 8601 string." });
    return;
  }

  const readings = await getAppReadings({
    deviceId,
    from,
    to,
    limit: limitParam,
  });

  res.json(readings);
});

// GET /api/readings/latest/:deviceId
router.get("/latest/:deviceId", async (req: Request, res: Response) => {
  const reading = await getAppLatestReading(req.params.deviceId as string);

  if (!reading) {
    res.status(404).json({ error: "Device not found or no readings available" });
    return;
  }

  res.json(reading);
});

// GET /api/readings/stats
router.get("/stats", async (req: Request, res: Response) => {
  const deviceId = req.query.device_id as string | undefined;

  if (!deviceId) {
    res.status(400).json({ error: "device_id query parameter is required" });
    return;
  }

  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  const stats = await getAppStats(deviceId, from, to);

  if (!stats) {
    res.status(404).json({ error: "No data found for the specified device and range" });
    return;
  }

  res.json(stats);
});

export default router;
