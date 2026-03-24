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
  queryReadings,
  getLatestReadingFromDb,
  getStatsFromDb,
} from "../services/database";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// ---- Gateway ingest (no user auth — uses gateway key) ----

const GATEWAY_KEY = process.env.GATEWAY_KEY || "gw-secret-key-change-me";

router.post("/ingest", (req: Request, res: Response) => {
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

  const accepted = insertReadings(readings);

  console.log(
    `[Ingest] gateway=${gateway_id} seq=${sequence} accepted=${accepted} sent_at=${sent_at}`
  );

  res.status(201).json({
    accepted,
    sequence,
    timestamp: new Date().toISOString(),
  });
});

// ---- Authenticated reading routes ----

router.use(authenticateToken);

// GET /api/readings — empty for User2 (usr-4)
router.get("/", (req: Request, res: Response) => {
  if (req.user?.id === "usr-4") { res.json([]); return; }

  const deviceId = req.query.device_id as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const limitParam = req.query.limit
    ? parseInt(req.query.limit as string, 10)
    : undefined;

  const readings = queryReadings({
    deviceId,
    from,
    to,
    limit: limitParam,
  });

  res.json(readings);
});

// GET /api/readings/latest/:deviceId
router.get("/latest/:deviceId", (req: Request, res: Response) => {
  const reading = getLatestReadingFromDb(req.params.deviceId as string);

  if (!reading) {
    res.status(404).json({ error: "Device not found or no readings available" });
    return;
  }

  res.json(reading);
});

// GET /api/readings/stats
router.get("/stats", (req: Request, res: Response) => {
  const deviceId = req.query.device_id as string | undefined;

  if (!deviceId) {
    res.status(400).json({ error: "device_id query parameter is required" });
    return;
  }

  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  const stats = getStatsFromDb(deviceId, from, to);

  if (!stats) {
    res.status(404).json({ error: "No data found for the specified device and range" });
    return;
  }

  res.json(stats);
});

export default router;
