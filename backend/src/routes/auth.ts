/**
 * Auth Routes
 *
 * POST /api/auth/login   — Login with email + password
 * GET  /api/auth/me      — Get current user from token
 * POST /api/auth/logout   — Logout (no-op for mock)
 */

import { Router, Request, Response } from "express";
import { authenticateToken, validateLogin } from "../middleware/auth";
import { LoginRequest } from "../../../shared/types";

const router = Router();

// POST /api/auth/login
router.post("/login", (req: Request, res: Response) => {
  const { email, password } = req.body as LoginRequest;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const result = validateLogin({ email, password });

  if (!result) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  res.json(result);
});

// GET /api/auth/me
router.get("/me", authenticateToken, (req: Request, res: Response) => {
  res.json(req.user);
});

// POST /api/auth/logout
router.post("/logout", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

export default router;
