/**
 * Reading Routes
 *
 * GET /api/readings                  — Query readings with filters
 * GET /api/readings/latest/:deviceId — Get latest reading for a device
 * GET /api/readings/stats            — Get aggregated stats for a device
 */

import { Router, Request, Response } from "express";
import {
  getReadings,
  getLatestReading,
  getStats,
} from "../services/mockDataService";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// All reading routes require auth
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

  const readings = getReadings({
    deviceId,
    from,
    to,
    limit: limitParam,
  });

  res.json(readings);
});

// GET /api/readings/latest/:deviceId
router.get("/latest/:deviceId", (req: Request, res: Response) => {
  const reading = getLatestReading(req.params.deviceId as string);

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

  const stats = getStats(deviceId, from, to);

  if (!stats) {
    res.status(404).json({ error: "No data found for the specified device and range" });
    return;
  }

  res.json(stats);
});

export default router;
