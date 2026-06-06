/**
 * Database Service
 *
 * Uses PostgreSQL when DATABASE_URL is set, otherwise falls back to the local
 * sql.js SQLite file for development and recovery.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const initSqlJs = require("sql.js");
import * as fs from "fs";
import * as path from "path";
import { createHash } from "crypto";
import { Pool } from "pg";
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
const DATABASE_URL = process.env.DATABASE_URL?.trim();
const USE_POSTGRES = Boolean(DATABASE_URL);
export const DEFAULT_PROFILE_AVATAR_URL =
  process.env.DEFAULT_PROFILE_AVATAR_URL?.trim() || "/api/assets/profile/default-profile.png";
let db: any;
let pgPool: Pool | null = null;

type SqlParameter = string | number | boolean | null | undefined;

interface StoredUser extends User {
  password: string;
}

export interface GoogleUserProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface UserProfileUpdate {
  name?: string;
  avatarUrl?: string | null;
  timezone?: string;
}

const BUILTIN_USERS: StoredUser[] = [
  {
    id: "usr-admin",
    email: "admin@email.com",
    name: "Admin",
    role: "admin",
    password: "admin",
    timezone: "Europe/Prague",
  },
  {
    id: "usr-uzivatel1",
    email: "uzivatel1@email.com",
    name: "uzivatel1",
    role: "viewer",
    password: "uzivatel1",
    timezone: "Europe/Prague",
  },
];

/** Save database to disk */
function saveToDisk(): void {
  if (USE_POSTGRES) return;
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
  if (USE_POSTGRES) return;
  if (!tableHasColumn(tableName, columnName)) {
    db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function toPostgresSql(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

async function runSql(sql: string, params: SqlParameter[] = []): Promise<void> {
  if (pgPool) {
    await pgPool.query(toPostgresSql(sql), params);
    return;
  }

  db.run(sql, params);
}

async function queryRows(sql: string, params: SqlParameter[] = []): Promise<Record<string, unknown>[]> {
  if (pgPool) {
    const result = await pgPool.query(toPostgresSql(sql), params);
    return result.rows as Record<string, unknown>[];
  }

  const stmt = db.prepare(sql);
  stmt.bind(params as (string | number | null)[]);
  const rows: Record<string, unknown>[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as Record<string, unknown>);
  }
  stmt.free();
  return rows;
}

async function queryOne(sql: string, params: SqlParameter[] = []): Promise<Record<string, unknown> | null> {
  const rows = await queryRows(sql, params);
  return rows[0] ?? null;
}

async function runInTransaction(callback: () => Promise<void>): Promise<void> {
  if (pgPool) {
    await callback();
    return;
  }

  await runSql("BEGIN");
  try {
    await callback();
    await runSql("COMMIT");
  } catch (error) {
    await runSql("ROLLBACK");
    throw error;
  }
}

function normalizeBatteryVoltage(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  return value;
}

function deviceFromRow(row: Record<string, unknown>): DeviceInfo {
  return {
    device_id: row.device_id as string,
    name: row.name as string,
    location: row.location as string,
    last_seen: row.last_seen as string,
    status: row.status as "online" | "offline" | "error",
    firmware_version: (row.firmware_version as string) || undefined,
    battery_v: normalizeBatteryVoltage(row.battery_v),
    monitoring_enabled: row.monitoring_enabled === undefined ? true : Number(row.monitoring_enabled) !== 0,
    monitoring_command_seq: Number(row.monitoring_command_seq ?? 0),
    monitoring_updated_at: (row.monitoring_updated_at as string) || undefined,
    measurement_started_at: (row.measurement_started_at as string) || undefined,
  };
}

/** Initialize database — call once at startup */
export async function initDatabase(): Promise<void> {
  if (USE_POSTGRES) {
    pgPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
    });
    await initializePostgresDatabase();
    console.log("[DB] Connected to PostgreSQL through DATABASE_URL");
    return;
  }

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
      timezone TEXT NOT NULL DEFAULT 'Europe/Prague',
      auth_provider TEXT NOT NULL DEFAULT 'password'
    )
  `);

  addColumnIfMissing("devices", "monitoring_enabled", "INTEGER NOT NULL DEFAULT 1");
  addColumnIfMissing("devices", "monitoring_command_seq", "INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing("devices", "monitoring_updated_at", "TEXT");
  addColumnIfMissing("devices", "measurement_started_at", "TEXT");
  addColumnIfMissing("users", "google_id", "TEXT");
  addColumnIfMissing("users", "avatar_url", "TEXT");
  addColumnIfMissing("users", "timezone", "TEXT NOT NULL DEFAULT 'Europe/Prague'");
  addColumnIfMissing("users", "auth_provider", "TEXT NOT NULL DEFAULT 'password'");
  await seedBuiltinUsers();
  await ensureDefaultProfileAvatars();

  // Indexes for common queries
  db.run(`CREATE INDEX IF NOT EXISTS idx_readings_device_time ON readings (device_id, timestamp)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings (timestamp)`);

  saveToDisk();
  console.log("[DB] Schema ready");
}

async function initializePostgresDatabase(): Promise<void> {
  await runSql(`
    CREATE TABLE IF NOT EXISTS readings (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
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

  await runSql(`
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

  await runSql(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      password TEXT NOT NULL,
      google_id TEXT,
      avatar_url TEXT,
      timezone TEXT NOT NULL DEFAULT 'Europe/Prague',
      auth_provider TEXT NOT NULL DEFAULT 'password'
    )
  `);

  await seedBuiltinUsers();
  await ensureDefaultProfileAvatars();
  await runSql("CREATE INDEX IF NOT EXISTS idx_readings_device_time ON readings (device_id, timestamp)");
  await runSql("CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings (timestamp)");
  console.log("[DB] PostgreSQL schema ready");
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
  if (!USE_POSTGRES && db) {
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
    avatar_url: (row.avatar_url as string) || DEFAULT_PROFILE_AVATAR_URL,
    timezone: (row.timezone as string) || "Europe/Prague",
  };
}

async function seedBuiltinUsers(): Promise<void> {
  for (const user of BUILTIN_USERS) {
    await runSql(
      `INSERT INTO users (id, email, name, role, password, avatar_url, timezone)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         role = excluded.role,
         password = excluded.password,
         avatar_url = COALESCE(NULLIF(users.avatar_url, ''), excluded.avatar_url)`,
      [
      user.id,
      user.email.toLowerCase(),
      user.name,
      user.role,
      user.password,
      DEFAULT_PROFILE_AVATAR_URL,
      user.timezone ?? "Europe/Prague",
      ]
    );
  }
}

async function ensureDefaultProfileAvatars(): Promise<void> {
  await runSql(
    "UPDATE users SET avatar_url = ? WHERE avatar_url IS NULL OR TRIM(avatar_url) = ''",
    [DEFAULT_PROFILE_AVATAR_URL]
  );
}

export async function validateUserCredentialsInDb(email: string, password: string): Promise<User | null> {
  const row = await queryOne(
    "SELECT * FROM users WHERE lower(email) = lower(?) AND password = ? LIMIT 1",
    [email.trim().toLowerCase(), password]
  );
  return row ? userFromRow(row) : null;
}

export async function getUserByIdFromDb(userId: string): Promise<User | null> {
  const row = await queryOne("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);
  return row ? userFromRow(row) : null;
}

export async function updateUserProfileInDb(userId: string, update: UserProfileUpdate): Promise<User | null> {
  const existing = await getUserByIdFromDb(userId);
  if (!existing) return null;

  const nextName = update.name?.trim() || existing.name;
  const hasAvatarUpdate = Object.prototype.hasOwnProperty.call(update, "avatarUrl");
  const nextTimezone = update.timezone?.trim() || existing.timezone || "Europe/Prague";

  if (hasAvatarUpdate) {
    await runSql(
      "UPDATE users SET name = ?, avatar_url = ?, timezone = ? WHERE id = ?",
      [nextName, update.avatarUrl ?? DEFAULT_PROFILE_AVATAR_URL, nextTimezone, userId]
    );
  } else {
    await runSql(
      "UPDATE users SET name = ?, timezone = ? WHERE id = ?",
      [nextName, nextTimezone, userId]
    );
  }

  saveToDisk();
  return getUserByIdFromDb(userId);
}

export async function upsertGoogleUserInDb(profile: GoogleUserProfile): Promise<User> {
  const normalizedEmail = profile.email.trim().toLowerCase();
  const displayName = profile.name.trim() || normalizedEmail;
  const avatarUrl = profile.avatarUrl?.trim() || DEFAULT_PROFILE_AVATAR_URL;

  const existingByGoogleId = await queryOne("SELECT * FROM users WHERE google_id = ? LIMIT 1", [profile.googleId]);
  if (existingByGoogleId) {
    const existing = userFromRow(existingByGoogleId);
    await runSql(
      `UPDATE users
       SET email = ?,
           name = COALESCE(NULLIF(name, ''), ?),
           auth_provider = 'google'
       WHERE id = ?`,
      [normalizedEmail, displayName, existing.id]
    );
    saveToDisk();
    return (await getUserByIdFromDb(existing.id)) ?? existing;
  }

  const existingByEmail = await queryOne("SELECT * FROM users WHERE lower(email) = lower(?) LIMIT 1", [normalizedEmail]);
  if (existingByEmail) {
    const existing = userFromRow(existingByEmail);
    await runSql(
      `UPDATE users
       SET google_id = ?,
           name = COALESCE(NULLIF(name, ''), ?),
           auth_provider = 'google'
       WHERE id = ?`,
      [profile.googleId, displayName, existing.id]
    );
    saveToDisk();
    return (await getUserByIdFromDb(existing.id)) ?? existing;
  }

  const userId = `usr-google-${createHash("sha256").update(profile.googleId).digest("hex").slice(0, 16)}`;
  await runSql(
    `INSERT INTO users (id, email, name, role, password, google_id, avatar_url, auth_provider)
     VALUES (?, ?, ?, 'viewer', ?, ?, ?, 'google')`,
    [userId, normalizedEmail, displayName, "google-oauth-disabled", profile.googleId, avatarUrl]
  );
  saveToDisk();

  return (await getUserByIdFromDb(userId)) ?? {
    id: userId,
    email: normalizedEmail,
    name: displayName,
    role: "viewer",
    avatar_url: avatarUrl || DEFAULT_PROFILE_AVATAR_URL,
  };
}

// ============================================================
// Device operations
// ============================================================

export async function upsertDevice(device: DeviceInfo): Promise<void> {
  await runSql(
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

export async function recordDeviceMeasurementStartFromGateway(deviceId: string, startedAtIso: string): Promise<void> {
  const nextStartedMs = parseIsoMillis(startedAtIso);
  if (nextStartedMs === null) return;

  const row = await queryOne("SELECT measurement_started_at FROM devices WHERE device_id = ? LIMIT 1", [deviceId]);
  if (!row) return;

  const existingStartedMs = parseIsoMillis((row.measurement_started_at as string) || undefined);
  const shouldUpdate =
    existingStartedMs === null ||
    Math.abs(nextStartedMs - existingStartedMs) > MEASUREMENT_START_UPDATE_TOLERANCE_MS;

  if (!shouldUpdate) return;

  await runSql(
    "UPDATE devices SET measurement_started_at = ? WHERE device_id = ?",
    [new Date(nextStartedMs).toISOString(), deviceId]
  );
  saveToDisk();
}

export async function getDevicesFromDb(): Promise<DeviceInfo[]> {
  const rows = await queryRows("SELECT * FROM devices ORDER BY name");
  return rows.map(deviceFromRow);
}

export async function renameDeviceInDb(deviceId: string, nextName: string): Promise<DeviceInfo | null> {
  const trimmedName = nextName.trim();
  if (!trimmedName) return null;

  await runSql("UPDATE devices SET name = ? WHERE device_id = ?", [trimmedName, deviceId]);
  const row = await queryOne("SELECT * FROM devices WHERE device_id = ? LIMIT 1", [deviceId]);
  if (!row) return null;

  saveToDisk();

  return deviceFromRow(row);
}

export async function countReadingsForDevice(deviceId: string): Promise<number> {
  const row = await queryOne("SELECT COUNT(*) as cnt FROM readings WHERE device_id = ?", [deviceId]);
  return Number(row?.cnt ?? 0);
}

export async function countReadingsForDeviceSource(deviceId: string, source: string): Promise<number> {
  const row = await queryOne("SELECT COUNT(*) as cnt FROM readings WHERE device_id = ? AND source = ?", [deviceId, source]);
  return Number(row?.cnt ?? 0);
}

export async function deleteReadingsForDevice(deviceId: string): Promise<void> {
  await runSql("DELETE FROM readings WHERE device_id = ?", [deviceId]);
  saveToDisk();
}

export async function deleteReadingsForDeviceSource(deviceId: string, source: string): Promise<void> {
  await runSql("DELETE FROM readings WHERE device_id = ? AND source = ?", [deviceId, source]);
  saveToDisk();
}

export async function deleteReadingsForDeviceRange(deviceId: string, fromIso: string, toIso: string): Promise<void> {
  await runSql(
    "DELETE FROM readings WHERE device_id = ? AND timestamp >= ? AND timestamp < ?",
    [deviceId, fromIso, toIso]
  );
  saveToDisk();
}

export async function deleteDeviceFromDb(deviceId: string): Promise<void> {
  await runSql("DELETE FROM devices WHERE device_id = ?", [deviceId]);
  saveToDisk();
}

export async function deleteSyntheticReadingsForDevice(deviceId: string): Promise<void> {
  await runSql(
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

export async function isDeviceMonitoringEnabled(deviceId: string): Promise<boolean> {
  const row = await queryOne("SELECT monitoring_enabled FROM devices WHERE device_id = ? LIMIT 1", [deviceId]);
  if (!row) return true;
  return Number(row.monitoring_enabled ?? 1) !== 0;
}

export async function getDeviceMonitoringControl(deviceId: string): Promise<DeviceMonitoringControl> {
  const row = await queryOne(
    "SELECT device_id, monitoring_enabled, monitoring_command_seq, monitoring_updated_at FROM devices WHERE device_id = ? LIMIT 1",
    [deviceId]
  );

  if (!row) {
    return {
      device_id: deviceId,
      monitoring_enabled: true,
      command_seq: 0,
      updated_at: new Date(0).toISOString(),
    };
  }

  return {
    device_id: row.device_id as string,
    monitoring_enabled: Number(row.monitoring_enabled ?? 1) !== 0,
    command_seq: Number(row.monitoring_command_seq ?? 0),
    updated_at: (row.monitoring_updated_at as string) || new Date(0).toISOString(),
  };
}

export async function setDeviceMonitoringInDb(deviceId: string, enabled: boolean): Promise<DeviceInfo | null> {
  const existing = await queryOne("SELECT * FROM devices WHERE device_id = ? LIMIT 1", [deviceId]);
  if (!existing) return null;

  const updatedAt = new Date().toISOString();
  await runSql(
    `UPDATE devices
     SET monitoring_enabled = ?,
         monitoring_command_seq = COALESCE(monitoring_command_seq, 0) + 1,
         monitoring_updated_at = ?,
         measurement_started_at = ?
      WHERE device_id = ?`,
    [enabled ? 1 : 0, updatedAt, enabled ? updatedAt : null, deviceId]
  );

  const row = await queryOne("SELECT * FROM devices WHERE device_id = ? LIMIT 1", [deviceId]);
  if (!row) return null;
  saveToDisk();
  return deviceFromRow(row);
}

// ============================================================
// Reading operations
// ============================================================

/** Insert a batch of readings */
export async function insertReadings(readings: EnvironmentalReading[]): Promise<number> {
  const enabledReadings: EnvironmentalReading[] = [];
  for (const reading of readings) {
    if (await isDeviceMonitoringEnabled(reading.device_id)) {
      enabledReadings.push(reading);
    }
  }
  if (enabledReadings.length === 0) {
    return 0;
  }

  let count = 0;
  await runInTransaction(async () => {
    for (const r of enabledReadings) {
      const existing = await queryOne(
        "SELECT 1 FROM readings WHERE device_id = ? AND timestamp = ? AND COALESCE(source, '') = COALESCE(?, '') LIMIT 1",
        [r.device_id, r.timestamp, r.source ?? null]
      );
      if (existing) continue;

      await runSql(
        `INSERT INTO readings (device_id, timestamp, co2_ppm, temperature_c, humidity_pct, pressure_hpa, light_lux, sound_level_adc, sound_peak_adc, sound_rms_adc, sound_event, battery_v, gateway_id, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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
          normalizeBatteryVoltage(r.battery_v) ?? null,
          r.gateway_id ?? null,
          r.source ?? null,
        ]
      );
      count++;
    }
  });

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
}): Promise<EnvironmentalReading[]> {
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

  return queryRows(sql, params as SqlParameter[]).then((rows) => rows.map(rowToReading));
}

export async function queryReadingTimestamps(deviceId: string): Promise<string[]> {
  const rows = await queryRows(
    "SELECT timestamp FROM readings WHERE device_id = ? ORDER BY timestamp ASC",
    [deviceId]
  );
  return rows
    .map((row) => row.timestamp)
    .filter((timestamp): timestamp is string => typeof timestamp === "string");
}

/** Get the latest reading for a device */
export async function getLatestReadingFromDb(deviceId: string): Promise<EnvironmentalReading | undefined> {
  const row = await queryOne(
    "SELECT * FROM readings WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1",
    [deviceId]
  );
  return row ? rowToReading(row) : undefined;
}

/** Compute stats for a device */
export async function getStatsFromDb(
  deviceId: string,
  from?: string,
  to?: string
): Promise<{
  device_id: string;
  from: string;
  to: string;
  metrics: Record<string, { min: number; max: number; avg: number; current: number }>;
} | null> {
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
  const agg = await queryOne(aggSql, params as SqlParameter[]);
  if (!agg || Number(agg.cnt ?? 0) === 0) return null;

  // Get current (latest) values
  const latestSql = `SELECT * FROM readings ${where} ORDER BY timestamp DESC LIMIT 1`;
  const latest = await queryOne(latestSql, params as SqlParameter[]);
  if (!latest) return null;

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
export async function hasData(): Promise<boolean> {
  const row = await queryOne("SELECT COUNT(*) as cnt FROM readings");
  return Number(row?.cnt ?? 0) > 0;
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
    sound_event: Number(row.sound_event ?? 0) === 1,
    battery_v: normalizeBatteryVoltage(row.battery_v),
    gateway_id: row.gateway_id as string | undefined,
    source: row.source as string | undefined,
  };
}
