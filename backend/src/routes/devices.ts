/**
 * Device Routes
 *
 * GET /api/devices      — List all devices
 * GET /api/devices/:id  — Get a single device
 */

import { Router, Request, Response } from "express";
import { getDevices, getDevice } from "../services/mockDataService";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// All device routes require auth
router.use(authenticateToken);

// GET /api/devices — empty for User2 (usr-4), full for everyone else
router.get("/", (req: Request, res: Response) => {
  if (req.user?.id === "usr-4") {
    res.json([]);
    return;
  }
  res.json(getDevices());
});

// GET /api/devices/:id
router.get("/:id", (req: Request, res: Response) => {
  const device = getDevice(req.params.id as string);

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  res.json(device);
});

export default router;
