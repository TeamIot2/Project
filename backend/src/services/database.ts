/**
 * SQLite Database Service
 *
 * Provides persistent storage for environmental readings using sql.js.
 * In production (Railway), this will be swapped for PostgreSQL via DATABASE_URL.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const initSqlJs = require("sql.js");
import * as fs from "fs";
import * as path from "path";
import type { EnvironmentalReading, DeviceInfo } from "../../../shared/types";

// ============================================================
// Database initialization
// ============================================================

const DB_PATH = path.join(__dirname, "../../data/readings.db");
let db: any;

/** Save database to disk */
function saveToDisk(): void {
  const data = db.export();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/** Initialize database — call once at startup */
export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs();

  // Load existing DB file or create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log("[DB] Loaded existing database from", DB_PATH);
  } else {
    db = new SQL.Database();
    console.log("[DB] Created new database");
  }

  // Create tables if they don't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      co2_ppm REAL NOT NULL,
      temperature_c REAL NOT NULL,
      humidity_pct REAL NOT NULL,
      pressure_hpa REAL NOT NULL,
      light_lux REAL NOT NULL,
      sound_level_adc REAL NOT NULL,
      sound_peak_adc REAL DEFAULT 0,
      sound_rms_adc REAL DEFAULT 0,
      sound_event INTEGER DEFAULT 0,
      battery_v REAL,
      gateway_id TEXT,
      source TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS devices (
      device_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      last_seen TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'offline',
      firmware_version TEXT,
      battery_v REAL
    )
  `);

  // Indexes for common queries
  db.run(`CREATE INDEX IF NOT EXISTS idx_readings_device_time ON readings (device_id, timestamp)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings (timestamp)`);

  saveToDisk();
  console.log("[DB] Schema ready");
}

// ============================================================
// Auto-save: flush to disk periodically
// ============================================================

let pendingWrites = 0;
const SAVE_THRESHOLD = 100; // save after every N inserts

function maybeSave(): void {
  pendingWrites++;
  if (pendingWrites >= SAVE_THRESHOLD) {
    saveToDisk();
    pendingWrites = 0;
  }
}

/** Force save — call on shutdown or after seed */
export function flushDatabase(): void {
  if (db) {
    saveToDisk();
    pendingWrites = 0;
  }
}

// ============================================================
// Device operations
// ============================================================

export function upsertDevice(device: DeviceInfo): void {
  db.run(
    `INSERT INTO devices (device_id, name, location, last_seen, status, firmware_version, battery_v)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(device_id) DO UPDATE SET
       name = excluded.name,
       location = excluded.location,
       last_seen = excluded.last_seen,
       status = excluded.status,
       firmware_version = excluded.firmware_version,
       battery_v = excluded.battery_v`,
    [device.device_id, device.name, device.location, device.last_seen, device.status, device.firmware_version ?? null, device.battery_v ?? null]
  );
}

export function getDevicesFromDb(): DeviceInfo[] {
  const stmt = db.prepare("SELECT * FROM devices ORDER BY name");
  const result: DeviceInfo[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>;
    result.push({
      device_id: row.device_id as string,
      name: row.name as string,
      location: row.location as string,
      last_seen: row.last_seen as string,
      status: row.status as "online" | "offline" | "error",
      firmware_version: (row.firmware_version as string) || undefined,
      battery_v: row.battery_v as number | undefined,
    });
  }
  stmt.free();
  return result;
}

// ============================================================
// Reading operations
// ============================================================

/** Insert a batch of readings */
export function insertReadings(readings: EnvironmentalReading[]): number {
  const stmt = db.prepare(
    `INSERT INTO readings (device_id, timestamp, co2_ppm, temperature_c, humidity_pct, pressure_hpa, light_lux, sound_level_adc, sound_peak_adc, sound_rms_adc, sound_event, battery_v, gateway_id, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let count = 0;
  db.run("BEGIN TRANSACTION");
  for (const r of readings) {
    stmt.run([
      r.device_id,
      r.timestamp,
      r.co2_ppm,
      r.temperature_c,
      r.humidity_pct,
      r.pressure_hpa,
      r.light_lux,
      r.sound_level_adc,
      r.sound_peak_adc ?? 0,
      r.sound_rms_adc ?? 0,
      r.sound_event ? 1 : 0,
      r.battery_v ?? null,
      r.gateway_id ?? null,
      r.source ?? null,
    ]);
    count++;
  }
  db.run("COMMIT");
  stmt.free();

  maybeSave();
  return count;
}

/** Query readings with optional filters */
export function queryReadings(options: {
  deviceId?: string;
  from?: string;
  to?: string;
  limit?: number;
}): EnvironmentalReading[] {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.deviceId) {
    conditions.push("device_id = ?");
    params.push(options.deviceId);
  }
  if (options.from) {
    conditions.push("timestamp >= ?");
    params.push(options.from);
  }
  if (options.to) {
    conditions.push("timestamp <= ?");
    params.push(options.to);
  }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
  let limit = options.limit ?? 500;
  if (limit > 2000) limit = 2000;

  const sql = `SELECT * FROM readings ${where} ORDER BY timestamp DESC LIMIT ?`;
  params.push(limit);

  const stmt = db.prepare(sql);
  stmt.bind(params as (string | number | null)[]);

  const result: EnvironmentalReading[] = [];
  while (stmt.step()) {
    result.push(rowToReading(stmt.getAsObject() as Record<string, unknown>));
  }
  stmt.free();
  return result;
}

/** Get the latest reading for a device */
export function getLatestReadingFromDb(deviceId: string): EnvironmentalReading | undefined {
  const stmt = db.prepare(
    "SELECT * FROM readings WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1"
  );
  stmt.bind([deviceId]);

  let result: EnvironmentalReading | undefined;
  if (stmt.step()) {
    result = rowToReading(stmt.getAsObject() as Record<string, unknown>);
  }
  stmt.free();
  return result;
}

/** Compute stats for a device */
export function getStatsFromDb(
  deviceId: string,
  from?: string,
  to?: string
): {
  device_id: string;
  from: string;
  to: string;
  metrics: Record<string, { min: number; max: number; avg: number; current: number }>;
} | null {
  const conditions = ["device_id = ?"];
  const params: unknown[] = [deviceId];

  if (from) { conditions.push("timestamp >= ?"); params.push(from); }
  if (to) { conditions.push("timestamp <= ?"); params.push(to); }

  const where = "WHERE " + conditions.join(" AND ");

  const metricKeys = ["co2_ppm", "temperature_c", "humidity_pct", "pressure_hpa", "light_lux", "sound_level_adc"];

  // Aggregate query
  const selectParts = metricKeys.map(k =>
    `MIN(${k}) as ${k}_min, MAX(${k}) as ${k}_max, AVG(${k}) as ${k}_avg`
  ).join(", ");

  const aggSql = `SELECT COUNT(*) as cnt, MIN(timestamp) as ts_min, MAX(timestamp) as ts_max, ${selectParts} FROM readings ${where}`;
  const aggStmt = db.prepare(aggSql);
  aggStmt.bind(params as (string | number | null)[]);

  if (!aggStmt.step()) { aggStmt.free(); return null; }
  const agg = aggStmt.getAsObject() as Record<string, unknown>;
  aggStmt.free();

  if ((agg.cnt as number) === 0) return null;

  // Get current (latest) values
  const latestSql = `SELECT * FROM readings ${where} ORDER BY timestamp DESC LIMIT 1`;
  const latestStmt = db.prepare(latestSql);
  latestStmt.bind(params as (string | number | null)[]);

  if (!latestStmt.step()) { latestStmt.free(); return null; }
  const latest = latestStmt.getAsObject() as Record<string, unknown>;
  latestStmt.free();

  const metrics: Record<string, { min: number; max: number; avg: number; current: number }> = {};
  for (const key of metricKeys) {
    metrics[key] = {
      min: round1(agg[`${key}_min`] as number),
      max: round1(agg[`${key}_max`] as number),
      avg: round1(agg[`${key}_avg`] as number),
      current: round1(latest[key] as number),
    };
  }

  return {
    device_id: deviceId,
    from: agg.ts_min as string,
    to: agg.ts_max as string,
    metrics,
  };
}

/** Check if readings table has data */
export function hasData(): boolean {
  const stmt = db.prepare("SELECT COUNT(*) as cnt FROM readings");
  stmt.step();
  const count = (stmt.getAsObject() as Record<string, unknown>).cnt as number;
  stmt.free();
  return count > 0;
}

// ============================================================
// Helpers
// ============================================================

function round1(n: number): number {
  return parseFloat(n.toFixed(1));
}

function rowToReading(row: Record<string, unknown>): EnvironmentalReading {
  return {
    device_id: row.device_id as string,
    timestamp: row.timestamp as string,
    co2_ppm: row.co2_ppm as number,
    temperature_c: row.temperature_c as number,
    humidity_pct: row.humidity_pct as number,
    pressure_hpa: row.pressure_hpa as number,
    light_lux: row.light_lux as number,
    sound_level_adc: row.sound_level_adc as number,
    sound_peak_adc: row.sound_peak_adc as number,
    sound_rms_adc: row.sound_rms_adc as number,
    sound_event: (row.sound_event as number) === 1,
    battery_v: row.battery_v as number | undefined,
    gateway_id: row.gateway_id as string | undefined,
    source: row.source as string | undefined,
  };
}
