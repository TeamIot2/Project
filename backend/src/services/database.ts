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
import { createHash } from "crypto";
import type {
  EnvironmentalReading,
  DeviceInfo,
  DeviceMonitoringControl,
  User,
  UserRole,
} from "../../../shared/types";

// ============================================================
// Database initialization
// ============================================================

const DB_PATH = process.env.READINGS_DB_PATH
  ? path.resolve(process.env.READINGS_DB_PATH)
  : path.join(__dirname, "../../data/readings.db");
let db: any;

interface StoredUser extends User {
  password: string;
}

export interface GoogleUserProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

const BUILTIN_USERS: StoredUser[] = [
  {
    id: "usr-admin",
    email: "admin@email.com",
    name: "Admin",
    role: "admin",
    password: "admin",
  },
  {
    id: "usr-uzivatel1",
    email: "uzivatel1@email.com",
    name: "uzivatel1",
    role: "viewer",
    password: "uzivatel1",
  },
];

/** Save database to disk */
function saveToDisk(): void {
  const data = db.export();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function tableHasColumn(tableName: string, columnName: string): boolean {
  const stmt = db.prepare(`PRAGMA table_info(${tableName})`);
  try {
    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      if (row.name === columnName) return true;
    }
    return false;
  } finally {
    stmt.free();
  }
}

function addColumnIfMissing(tableName: string, columnName: string, definition: string): void {
  if (!tableHasColumn(tableName, columnName)) {
    db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function deviceFromRow(row: Record<string, unknown>): DeviceInfo {
  return {
    device_id: row.device_id as string,
    name: row.name as string,
    location: row.location as string,
    last_seen: row.last_seen as string,
    status: row.status as "online" | "offline" | "error",
    firmware_version: (row.firmware_version as string) || undefined,
    battery_v: row.battery_v as number | undefined,
    monitoring_enabled: row.monitoring_enabled === undefined ? true : Number(row.monitoring_enabled) !== 0,
    monitoring_command_seq: Number(row.monitoring_command_seq ?? 0),
    monitoring_updated_at: (row.monitoring_updated_at as string) || undefined,
    measurement_started_at: (row.measurement_started_at as string) || undefined,
  };
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
      battery_v REAL,
      monitoring_enabled INTEGER NOT NULL DEFAULT 1,
      monitoring_command_seq INTEGER NOT NULL DEFAULT 0,
      monitoring_updated_at TEXT,
      measurement_started_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      password TEXT NOT NULL,
      google_id TEXT,
      avatar_url TEXT,
      auth_provider TEXT NOT NULL DEFAULT 'password'
    )
  `);

  addColumnIfMissing("devices", "monitoring_enabled", "INTEGER NOT NULL DEFAULT 1");
  addColumnIfMissing("devices", "monitoring_command_seq", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing("devices", "monitoring_updated_at", "TEXT");
  addColumnIfMissing("devices", "measurement_started_at", "TEXT");
  addColumnIfMissing("users", "google_id", "TEXT");
  addColumnIfMissing("users", "avatar_url", "TEXT");
  addColumnIfMissing("users", "auth_provider", "TEXT NOT NULL DEFAULT 'password'");
  seedBuiltinUsers();

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
const SAVE_THRESHOLD = Math.max(
  1,
  Number.parseInt(process.env.READINGS_DB_SAVE_THRESHOLD ?? "1", 10) || 1
); // save after every N insert batches

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
// User operations
// ============================================================

function userFromRow(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    role: row.role as UserRole,
    avatar_url: (row.avatar_url as string) || undefined,
  };
}

function seedBuiltinUsers(): void {
  const stmt = db.prepare(
    `INSERT INTO users (id, email, name, role, password)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       name = excluded.name,
       role = excluded.role,
       password = excluded.password`
  );

  for (const user of BUILTIN_USERS) {
    stmt.run([
      user.id,
      user.email.toLowerCase(),
      user.name,
      user.role,
      user.password,
    ]);
  }

  stmt.free();
}

export function validateUserCredentialsInDb(email: string, password: string): User | null {
  const stmt = db.prepare("SELECT * FROM users WHERE lower(email) = lower(?) AND password = ? LIMIT 1");
  stmt.bind([email.trim().toLowerCase(), password]);

  if (!stmt.step()) {
    stmt.free();
    return null;
  }

  const user = userFromRow(stmt.getAsObject() as Record<string, unknown>);
  stmt.free();
  return user;
}

export function getUserByIdFromDb(userId: string): User | null {
  const stmt = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
  stmt.bind([userId]);

  if (!stmt.step()) {
    stmt.free();
    return null;
  }

  const user = userFromRow(stmt.getAsObject() as Record<string, unknown>);
  stmt.free();
  return user;
}

export function upsertGoogleUserInDb(profile: GoogleUserProfile): User {
  const normalizedEmail = profile.email.trim().toLowerCase();
  const displayName = profile.name.trim() || normalizedEmail;
  const avatarUrl = profile.avatarUrl?.trim() || null;

  const existingByGoogleId = db.prepare("SELECT * FROM users WHERE google_id = ? LIMIT 1");
  existingByGoogleId.bind([profile.googleId]);
  if (existingByGoogleId.step()) {
    const existing = userFromRow(existingByGoogleId.getAsObject() as Record<string, unknown>);
    existingByGoogleId.free();
    db.run(
      `UPDATE users
       SET email = ?, name = ?, avatar_url = ?, auth_provider = 'google'
       WHERE id = ?`,
      [normalizedEmail, displayName, avatarUrl, existing.id]
    );
    saveToDisk();
    return getUserByIdFromDb(existing.id) ?? existing;
  }
  existingByGoogleId.free();

  const existingByEmail = db.prepare("SELECT * FROM users WHERE lower(email) = lower(?) LIMIT 1");
  existingByEmail.bind([normalizedEmail]);
  if (existingByEmail.step()) {
    const existing = userFromRow(existingByEmail.getAsObject() as Record<string, unknown>);
    existingByEmail.free();
    db.run(
      `UPDATE users
       SET google_id = ?, name = ?, avatar_url = ?, auth_provider = 'google'
       WHERE id = ?`,
      [profile.googleId, displayName, avatarUrl, existing.id]
    );
    saveToDisk();
    return getUserByIdFromDb(existing.id) ?? existing;
  }
  existingByEmail.free();

  const userId = `usr-google-${createHash("sha256").update(profile.googleId).digest("hex").slice(0, 16)}`;
  db.run(
    `INSERT INTO users (id, email, name, role, password, google_id, avatar_url, auth_provider)
     VALUES (?, ?, ?, 'viewer', ?, ?, ?, 'google')`,
    [userId, normalizedEmail, displayName, "google-oauth-disabled", profile.googleId, avatarUrl]
  );
  saveToDisk();

  return getUserByIdFromDb(userId) ?? {
    id: userId,
    email: normalizedEmail,
    name: displayName,
    role: "viewer",
    avatar_url: avatarUrl || undefined,
  };
}

// ============================================================
// Device operations
// ============================================================

export function upsertDevice(device: DeviceInfo): void {
  db.run(
    `INSERT INTO devices (device_id, name, location, last_seen, status, firmware_version, battery_v, monitoring_enabled, monitoring_command_seq, monitoring_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, NULL)
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

const MEASUREMENT_START_UPDATE_TOLERANCE_MS = Math.max(
  5,
  Number.parseInt(process.env.MEASUREMENT_START_UPDATE_TOLERANCE_SECONDS ?? "120", 10) || 120
) * 1000;

function parseIsoMillis(value: string | undefined | null): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export function recordDeviceMeasurementStartFromGateway(deviceId: string, startedAtIso: string): void {
  const nextStartedMs = parseIsoMillis(startedAtIso);
  if (nextStartedMs === null) return;

  const selectStmt = db.prepare("SELECT measurement_started_at FROM devices WHERE device_id = ? LIMIT 1");
  selectStmt.bind([deviceId]);
  if (!selectStmt.step()) {
    selectStmt.free();
    return;
  }

  const row = selectStmt.getAsObject() as Record<string, unknown>;
  selectStmt.free();

  const existingStartedMs = parseIsoMillis((row.measurement_started_at as string) || undefined);
  const shouldUpdate =
    existingStartedMs === null ||
    Math.abs(nextStartedMs - existingStartedMs) > MEASUREMENT_START_UPDATE_TOLERANCE_MS;

  if (!shouldUpdate) return;

  db.run(
    "UPDATE devices SET measurement_started_at = ? WHERE device_id = ?",
    [new Date(nextStartedMs).toISOString(), deviceId]
  );
  saveToDisk();
}

export function getDevicesFromDb(): DeviceInfo[] {
  const stmt = db.prepare("SELECT * FROM devices ORDER BY name");
  const result: DeviceInfo[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>;
    result.push(deviceFromRow(row));
  }
  stmt.free();
  return result;
}

export function renameDeviceInDb(deviceId: string, nextName: string): DeviceInfo | null {
  const trimmedName = nextName.trim();
  if (!trimmedName) return null;

  const updateStmt = db.prepare("UPDATE devices SET name = ? WHERE device_id = ?");
  updateStmt.run([trimmedName, deviceId]);
  updateStmt.free();

  const selectStmt = db.prepare("SELECT * FROM devices WHERE device_id = ? LIMIT 1");
  selectStmt.bind([deviceId]);

  if (!selectStmt.step()) {
    selectStmt.free();
    return null;
  }

  const row = selectStmt.getAsObject() as Record<string, unknown>;
  selectStmt.free();

  saveToDisk();

  return deviceFromRow(row);
}

export function countReadingsForDevice(deviceId: string): number {
  const stmt = db.prepare("SELECT COUNT(*) as cnt FROM readings WHERE device_id = ?");
  stmt.bind([deviceId]);
  stmt.step();
  const count = Number((stmt.getAsObject() as Record<string, unknown>).cnt ?? 0);
  stmt.free();
  return count;
}

export function countReadingsForDeviceSource(deviceId: string, source: string): number {
  const stmt = db.prepare("SELECT COUNT(*) as cnt FROM readings WHERE device_id = ? AND source = ?");
  stmt.bind([deviceId, source]);
  stmt.step();
  const count = Number((stmt.getAsObject() as Record<string, unknown>).cnt ?? 0);
  stmt.free();
  return count;
}

export function deleteReadingsForDevice(deviceId: string): void {
  db.run("DELETE FROM readings WHERE device_id = ?", [deviceId]);
  saveToDisk();
}

export function deleteReadingsForDeviceSource(deviceId: string, source: string): void {
  db.run("DELETE FROM readings WHERE device_id = ? AND source = ?", [deviceId, source]);
  saveToDisk();
}

export function deleteReadingsForDeviceRange(deviceId: string, fromIso: string, toIso: string): void {
  db.run(
    "DELETE FROM readings WHERE device_id = ? AND timestamp >= ? AND timestamp < ?",
    [deviceId, fromIso, toIso]
  );
  saveToDisk();
}

export function deleteDeviceFromDb(deviceId: string): void {
  db.run("DELETE FROM devices WHERE device_id = ?", [deviceId]);
  saveToDisk();
}

export function deleteSyntheticReadingsForDevice(deviceId: string): void {
  db.run(
    `DELETE FROM readings
     WHERE device_id = ?
       AND (
         source IS NULL
         OR source IN ('auto-seed', 'demo-auto-seed', 'mock-auto-seed', 'demo-bootstrap')
       )`,
    [deviceId]
  );
  saveToDisk();
}

export function isDeviceMonitoringEnabled(deviceId: string): boolean {
  const stmt = db.prepare("SELECT monitoring_enabled FROM devices WHERE device_id = ? LIMIT 1");
  stmt.bind([deviceId]);

  if (!stmt.step()) {
    stmt.free();
    return true;
  }

  const row = stmt.getAsObject() as Record<string, unknown>;
  stmt.free();
  return Number(row.monitoring_enabled ?? 1) !== 0;
}

export function getDeviceMonitoringControl(deviceId: string): DeviceMonitoringControl {
  const stmt = db.prepare(
    "SELECT device_id, monitoring_enabled, monitoring_command_seq, monitoring_updated_at FROM devices WHERE device_id = ? LIMIT 1"
  );
  stmt.bind([deviceId]);

  if (!stmt.step()) {
    stmt.free();
    return {
      device_id: deviceId,
      monitoring_enabled: true,
      command_seq: 0,
      updated_at: new Date(0).toISOString(),
    };
  }

  const row = stmt.getAsObject() as Record<string, unknown>;
  stmt.free();

  return {
    device_id: row.device_id as string,
    monitoring_enabled: Number(row.monitoring_enabled ?? 1) !== 0,
    command_seq: Number(row.monitoring_command_seq ?? 0),
    updated_at: (row.monitoring_updated_at as string) || new Date(0).toISOString(),
  };
}

export function setDeviceMonitoringInDb(deviceId: string, enabled: boolean): DeviceInfo | null {
  const existingStmt = db.prepare("SELECT * FROM devices WHERE device_id = ? LIMIT 1");
  existingStmt.bind([deviceId]);

  if (!existingStmt.step()) {
    existingStmt.free();
    return null;
  }
  existingStmt.free();

  const updatedAt = new Date().toISOString();
  const updateStmt = db.prepare(
    `UPDATE devices
     SET monitoring_enabled = ?,
         monitoring_command_seq = COALESCE(monitoring_command_seq, 0) + 1,
         monitoring_updated_at = ?,
         measurement_started_at = ?
      WHERE device_id = ?`
  );
  updateStmt.run([enabled ? 1 : 0, updatedAt, enabled ? updatedAt : null, deviceId]);
  updateStmt.free();

  const selectStmt = db.prepare("SELECT * FROM devices WHERE device_id = ? LIMIT 1");
  selectStmt.bind([deviceId]);
  if (!selectStmt.step()) {
    selectStmt.free();
    return null;
  }

  const row = selectStmt.getAsObject() as Record<string, unknown>;
  selectStmt.free();
  saveToDisk();
  return deviceFromRow(row);
}

// ============================================================
// Reading operations
// ============================================================

/** Insert a batch of readings */
export function insertReadings(readings: EnvironmentalReading[]): number {
  const enabledReadings = readings.filter((reading) => isDeviceMonitoringEnabled(reading.device_id));
  if (enabledReadings.length === 0) {
    return 0;
  }

  const existsStmt = db.prepare(
    "SELECT 1 FROM readings WHERE device_id = ? AND timestamp = ? AND COALESCE(source, '') = COALESCE(?, '') LIMIT 1"
  );
  const stmt = db.prepare(
    `INSERT INTO readings (device_id, timestamp, co2_ppm, temperature_c, humidity_pct, pressure_hpa, light_lux, sound_level_adc, sound_peak_adc, sound_rms_adc, sound_event, battery_v, gateway_id, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let count = 0;
  db.run("BEGIN TRANSACTION");
  for (const r of enabledReadings) {
    existsStmt.bind([r.device_id, r.timestamp, r.source ?? null]);
    const exists = existsStmt.step();
    existsStmt.reset();
    if (exists) continue;

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
  existsStmt.free();
  stmt.free();

  if (count > 0) {
    maybeSave();
  }
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
  if (limit < 1) limit = 1;
  if (limit > 100000) limit = 100000;

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

export function queryReadingTimestamps(deviceId: string): string[] {
  const stmt = db.prepare(
    "SELECT timestamp FROM readings WHERE device_id = ? ORDER BY timestamp ASC"
  );
  stmt.bind([deviceId]);

  const result: string[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>;
    if (typeof row.timestamp === "string") {
      result.push(row.timestamp);
    }
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

/** Safely coerce a database value to a number, defaulting to 0 with a warning. */
function safeNumber(value: unknown, fieldName: string): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  console.warn(`[DB] rowToReading: field "${fieldName}" is not a valid number (got ${typeof value}: ${value}), defaulting to 0`);
  return 0;
}

function rowToReading(row: Record<string, unknown>): EnvironmentalReading {
  return {
    device_id: row.device_id as string,
    timestamp: row.timestamp as string,
    co2_ppm: safeNumber(row.co2_ppm, "co2_ppm"),
    temperature_c: safeNumber(row.temperature_c, "temperature_c"),
    humidity_pct: safeNumber(row.humidity_pct, "humidity_pct"),
    pressure_hpa: safeNumber(row.pressure_hpa, "pressure_hpa"),
    light_lux: safeNumber(row.light_lux, "light_lux"),
    sound_level_adc: safeNumber(row.sound_level_adc, "sound_level_adc"),
    sound_peak_adc: safeNumber(row.sound_peak_adc, "sound_peak_adc"),
    sound_rms_adc: safeNumber(row.sound_rms_adc, "sound_rms_adc"),
    sound_event: (row.sound_event as number) === 1,
    battery_v: row.battery_v as number | undefined,
    gateway_id: row.gateway_id as string | undefined,
    source: row.source as string | undefined,
  };
}
