/**
 * Device Routes
 *
 * GET /api/devices      — List all devices
 * GET /api/devices/:id  — Get a single device
 */

import { Router, Request, Response } from "express";
import { getDevicesFromDb } from "../services/database";
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

export default router;
