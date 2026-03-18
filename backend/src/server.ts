/**
 * Express.js Backend Server
 *
 * IoT Environmental Monitoring — REST API
 * Serves mock sensor data, device info, environment presets, and auth.
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

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

// CORS — allow frontend dev server
app.use(cors());

// JSON body parsing
app.use(express.json());

// Security headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

// ============================================================
// Routes
// ============================================================

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

// Mount route modules
app.use("/api/auth", authRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/readings", readingRoutes);
app.use("/api/environments", environmentRoutes);

// ============================================================
// Error handling
// ============================================================

// 404 catch-all for unknown routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Error]", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ============================================================
// Start
// ============================================================

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
