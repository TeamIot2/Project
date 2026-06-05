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
import { ensureDemoDeviceRoster } from "./services/demoDeviceBootstrap";
import {
  ensureRealPresentationHistoryData,
  ensurePersistentGymHistoryMockData,
  removeSyntheticOfficeHistory,
} from "./services/historyMockSeed";

function loadLocalEnvFile(): void {
  const candidates = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), "backend/.env.local"),
    path.resolve(__dirname, "../.env.local"),
    path.resolve(__dirname, "../../.env.local"),
  ];
  const envPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!envPath) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (process.env[key] !== undefined) continue;

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

loadLocalEnvFile();

// Route modules
import authRoutes from "./routes/auth";
import deviceRoutes from "./routes/devices";
import readingRoutes from "./routes/readings";
import environmentRoutes from "./routes/environments";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const startTime = Date.now();

function readBooleanEnv(name: string, defaultValue: boolean): boolean {
  const rawValue = process.env[name];
  if (rawValue === undefined) return defaultValue;
  return !["0", "false", "no", "off"].includes(rawValue.trim().toLowerCase());
}

const AUTO_SEED_MOCK_DATA = readBooleanEnv("AUTO_SEED_MOCK_DATA", true);
const BOOTSTRAP_DEMO_DEVICES = readBooleanEnv("BOOTSTRAP_DEMO_DEVICES", true);

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

// Try multiple paths to find frontend/dist — cwd varies between dev, prod, and Railway
const FRONTEND_DIST_CANDIDATES = [
  path.resolve(process.cwd(), "frontend/dist"),        // cwd = PROJECT/
  path.resolve(process.cwd(), "../frontend/dist"),      // cwd = PROJECT/backend/
  path.resolve(__dirname, "../../frontend/dist"),        // dev: __dirname = backend/src
  path.resolve(__dirname, "../../../../frontend/dist"),  // prod: __dirname = backend/dist/backend/src
];
const FRONTEND_DIST = FRONTEND_DIST_CANDIDATES.find((p) => fs.existsSync(p)) ?? FRONTEND_DIST_CANDIDATES[0];

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
  if (AUTO_SEED_MOCK_DATA && !hasData()) {
    console.log("[Start] Empty database detected - running auto-seed...");
    autoSeed();
  } else if (!AUTO_SEED_MOCK_DATA && !hasData()) {
    console.log("[Start] Empty database detected and mock auto-seed is disabled.");
  }

  if (BOOTSTRAP_DEMO_DEVICES) {
    ensureDemoDeviceRoster();
  } else {
    console.log("[Start] Demo device bootstrap is disabled.");
  }

  removeSyntheticOfficeHistory();
  ensureRealPresentationHistoryData();
  ensurePersistentGymHistoryMockData();

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
