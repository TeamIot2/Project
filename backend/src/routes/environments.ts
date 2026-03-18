/**
 * Environment Routes
 *
 * GET /api/environments — Return all environment presets
 */

import { Router, Request, Response } from "express";
import { getEnvironments } from "../services/environmentService";

const router = Router();

// GET /api/environments
router.get("/", (_req: Request, res: Response) => {
  res.json(getEnvironments());
});

export default router;
