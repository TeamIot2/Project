/**
 * Express.js Backend Server
 *
 * IoT Environmental Monitoring — REST API
 * Serves sensor data, device info, environment presets, and auth.
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import * as path from "path";
import * as fs from "fs";
import { initDatabase, flushDatabase, hasData } from "./services/database";
import { autoSeed } from "./services/autoSeed";

// Route modules
import authRoutes from "./routes/auth";
import deviceRoutes from "./routes/devices";
import readingRoutes from "./routes/readings";
import environmentRoutes from "./routes/environments";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const startTime = Date.now();

// ============================================================
// Middleware
// ============================================================

app.use(cors());
app.use(express.json());

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

// ============================================================
// Routes
// ============================================================

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/readings", readingRoutes);
app.use("/api/environments", environmentRoutes);

// ============================================================
// Serve frontend (production build)
// ============================================================

// In dev: __dirname = backend/src → ../../frontend/dist
// In prod: __dirname = backend/dist/backend/src → ../../../../frontend/dist
// Use process.cwd() as reliable anchor (always PROJECT/backend/)
const FRONTEND_DIST = path.resolve(process.cwd(), "../frontend/dist");

if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));

  // SPA fallback — any non-API route serves index.html so React Router works
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });

  console.log("[Static] Serving frontend from", FRONTEND_DIST);
} else {
  console.log("[Static] No frontend build found — API-only mode");
}

// ============================================================
// Error handling
// ============================================================

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Error]", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ============================================================
// Start (async — database must init first)
// ============================================================

async function start() {
  await initDatabase();

  // Auto-seed with mock data if database is empty (e.g. fresh Railway deploy)
  if (!hasData()) {
    console.log("[Start] Empty database detected — running auto-seed...");
    autoSeed();
  }

  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });

  // Save database on shutdown
  process.on("SIGINT", () => { flushDatabase(); process.exit(0); });
  process.on("SIGTERM", () => { flushDatabase(); process.exit(0); });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
