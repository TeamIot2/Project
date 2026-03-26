/**
 * Environment Routes
 *
 * GET /api/environments — Return all environment presets
 */

import { Router, Request, Response } from "express";
import { getEnvironments } from "../services/environmentService";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

// GET /api/environments
router.get("/", (_req: Request, res: Response) => {
  res.json(getEnvironments());
});

export default router;
