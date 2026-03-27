/**
 * Device Routes
 *
 * GET /api/devices      — List all devices
 * GET /api/devices/:id  — Get a single device
 * PATCH /api/devices/:id — Rename a device
 */

import { Router, Request, Response } from "express";
import { getDevicesFromDb, renameDeviceInDb } from "../services/database";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

// GET /api/devices — empty for User2 (usr-4), full for everyone else
router.get("/", (req: Request, res: Response) => {
  // Demo user with no assigned devices — used for testing empty state UX.
  // Returns an empty array so the frontend can exercise its "no data" paths.
  if (req.user?.id === "usr-4") {
    res.json([]);
    return;
  }
  res.json(getDevicesFromDb());
});

// GET /api/devices/:id
router.get("/:id", (req: Request, res: Response) => {
  const devices = getDevicesFromDb();
  const device = devices.find(d => d.device_id === req.params.id);

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  res.json(device);
});

router.patch("/:id", (req: Request, res: Response) => {
  const rawDeviceId = req.params.id;
  const deviceId = Array.isArray(rawDeviceId) ? rawDeviceId[0] : rawDeviceId;
  const rawName = req.body?.name;

  if (typeof deviceId !== "string" || deviceId.trim().length === 0) {
    res.status(400).json({ error: "Device id is required" });
    return;
  }

  if (typeof rawName !== "string" || rawName.trim().length === 0) {
    res.status(400).json({ error: "Device name is required" });
    return;
  }

  const updatedDevice = renameDeviceInDb(deviceId, rawName);
  if (!updatedDevice) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  res.json(updatedDevice);
});

export default router;
