/**
 * Device routes.
 */

import { Router, Request, Response } from "express";
import {
  getDeviceMonitoringControl,
  renameDeviceInDb,
  setDeviceMonitoringInDb,
} from "../services/database";
import { getAppDevices, REAL_OFFICE_DEVICE_ID, REAL_SENSOR_DEVICE_NAME } from "../services/appDataService";
import { authenticateToken } from "../middleware/auth";

const router = Router();
const GATEWAY_KEY = process.env.GATEWAY_KEY || "gw-secret-key-change-me";

router.get("/:id/monitoring-control", (req: Request, res: Response) => {
  const key = req.headers["x-gateway-key"] as string | undefined;
  if (key !== GATEWAY_KEY) {
    res.status(401).json({ error: "Invalid gateway key" });
    return;
  }

  const rawDeviceId = req.params.id;
  const deviceId = Array.isArray(rawDeviceId) ? rawDeviceId[0] : rawDeviceId;
  if (typeof deviceId !== "string" || deviceId.trim().length === 0) {
    res.status(400).json({ error: "Device id is required" });
    return;
  }

  res.json(getDeviceMonitoringControl(deviceId));
});

router.use(authenticateToken);

router.get("/", (_req: Request, res: Response) => {
  res.json(getAppDevices());
});

router.get("/:id", (req: Request, res: Response) => {
  const devices = getAppDevices();
  const device = devices.find((candidate) => candidate.device_id === req.params.id);

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

  const nextName = deviceId === REAL_OFFICE_DEVICE_ID ? REAL_SENSOR_DEVICE_NAME : rawName;
  const updatedDevice = renameDeviceInDb(deviceId, nextName);
  if (!updatedDevice) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  res.json(getAppDevices().find((device) => device.device_id === deviceId) ?? updatedDevice);
});

router.patch("/:id/monitoring", (req: Request, res: Response) => {
  const rawDeviceId = req.params.id;
  const deviceId = Array.isArray(rawDeviceId) ? rawDeviceId[0] : rawDeviceId;
  const enabled = req.body?.enabled;

  if (typeof deviceId !== "string" || deviceId.trim().length === 0) {
    res.status(400).json({ error: "Device id is required" });
    return;
  }

  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "enabled must be a boolean" });
    return;
  }

  const updatedDevice = setDeviceMonitoringInDb(deviceId, enabled);
  if (!updatedDevice) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  res.json(getAppDevices().find((device) => device.device_id === deviceId) ?? updatedDevice);
});

export default router;
