/**
 * Safely migrates the local sql.js SQLite database into PostgreSQL.
 *
 * Required:
 *   DATABASE_URL=postgresql://...
 *
 * Optional:
 *   SQLITE_DB_PATH=backend/data/readings.db
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const initSqlJs = require("sql.js");

import * as fs from "fs";
import * as path from "path";
import { Pool } from "pg";
import { initDatabase } from "../src/services/database";

type Row = Record<string, unknown>;

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for SQLite to PostgreSQL migration.");
}

const sqlitePath = path.resolve(
  process.env.SQLITE_DB_PATH?.trim()
    || path.join(__dirname, "../data/readings.db")
);

if (!fs.existsSync(sqlitePath)) {
  throw new Error(`SQLite source database not found: ${sqlitePath}`);
}

function allRows(db: any, sql: string): Row[] {
  const stmt = db.prepare(sql);
  const rows: Row[] = [];
  try {
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as Row);
    }
  } finally {
    stmt.free();
  }
  return rows;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function migrateUsers(pool: Pool, users: Row[]): Promise<number> {
  let migrated = 0;
  for (const user of users) {
    await pool.query(
      `INSERT INTO users (id, email, name, role, password, google_id, avatar_url, timezone, auth_provider)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         name = excluded.name,
         role = excluded.role,
         password = excluded.password,
         google_id = excluded.google_id,
         avatar_url = excluded.avatar_url,
         timezone = excluded.timezone,
         auth_provider = excluded.auth_provider`,
      [
        user.id,
        user.email,
        user.name,
        user.role,
        user.password,
        user.google_id ?? null,
        user.avatar_url ?? null,
        user.timezone ?? "Europe/Prague",
        user.auth_provider ?? "password",
      ]
    );
    migrated += 1;
  }
  return migrated;
}

async function migrateDevices(pool: Pool, devices: Row[]): Promise<number> {
  let migrated = 0;
  for (const device of devices) {
    await pool.query(
      `INSERT INTO devices (
         device_id, name, location, last_seen, status, firmware_version, battery_v,
         monitoring_enabled, monitoring_command_seq, monitoring_updated_at, measurement_started_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT(device_id) DO UPDATE SET
         name = excluded.name,
         location = excluded.location,
         last_seen = excluded.last_seen,
         status = excluded.status,
         firmware_version = excluded.firmware_version,
         battery_v = excluded.battery_v,
         monitoring_enabled = excluded.monitoring_enabled,
         monitoring_command_seq = excluded.monitoring_command_seq,
         monitoring_updated_at = excluded.monitoring_updated_at,
         measurement_started_at = excluded.measurement_started_at`,
      [
        device.device_id,
        device.name,
        device.location,
        device.last_seen,
        device.status,
        device.firmware_version ?? null,
        nullableNumber(device.battery_v),
        Number(device.monitoring_enabled ?? 1),
        Number(device.monitoring_command_seq ?? 0),
        device.monitoring_updated_at ?? null,
        device.measurement_started_at ?? null,
      ]
    );
    migrated += 1;
  }
  return migrated;
}

async function migrateReadings(pool: Pool, readings: Row[]): Promise<number> {
  let inserted = 0;
  const batchSize = 1000;

  for (let offset = 0; offset < readings.length; offset += batchSize) {
    const batch = readings.slice(offset, offset + batchSize);
    await pool.query("BEGIN");
    try {
      for (const reading of batch) {
        const result = await pool.query(
          `INSERT INTO readings (
             device_id, timestamp, co2_ppm, temperature_c, humidity_pct, pressure_hpa,
             light_lux, sound_level_adc, sound_peak_adc, sound_rms_adc, sound_event,
             battery_v, gateway_id, source
           )
           SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
           WHERE NOT EXISTS (
             SELECT 1 FROM readings
             WHERE device_id = $1
               AND timestamp = $2
               AND COALESCE(source, '') = COALESCE($14, '')
           )`,
          [
            reading.device_id,
            reading.timestamp,
            Number(reading.co2_ppm),
            Number(reading.temperature_c),
            Number(reading.humidity_pct),
            Number(reading.pressure_hpa),
            Number(reading.light_lux),
            Number(reading.sound_level_adc),
            Number(reading.sound_peak_adc ?? 0),
            Number(reading.sound_rms_adc ?? 0),
            Number(reading.sound_event ?? 0),
            nullableNumber(reading.battery_v),
            reading.gateway_id ?? null,
            reading.source ?? null,
          ]
        );
        inserted += result.rowCount ?? 0;
      }
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }

  return inserted;
}

async function countRows(pool: Pool, tableName: string): Promise<number> {
  const result = await pool.query(`SELECT COUNT(*) AS count FROM ${tableName}`);
  return Number(result.rows[0]?.count ?? 0);
}

async function main(): Promise<void> {
  console.log(`[Migrate] SQLite source: ${sqlitePath}`);
  await initDatabase();

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
  });

  const SQL = await initSqlJs();
  const sqlite = new SQL.Database(fs.readFileSync(sqlitePath));

  try {
    const users = allRows(sqlite, "SELECT * FROM users");
    const devices = allRows(sqlite, "SELECT * FROM devices");
    const readings = allRows(sqlite, "SELECT * FROM readings ORDER BY timestamp ASC, id ASC");

    const before = {
      users: await countRows(pool, "users"),
      devices: await countRows(pool, "devices"),
      readings: await countRows(pool, "readings"),
    };

    const migratedUsers = await migrateUsers(pool, users);
    const migratedDevices = await migrateDevices(pool, devices);
    const insertedReadings = await migrateReadings(pool, readings);

    const after = {
      users: await countRows(pool, "users"),
      devices: await countRows(pool, "devices"),
      readings: await countRows(pool, "readings"),
    };

    console.log("[Migrate] Source counts:", { users: users.length, devices: devices.length, readings: readings.length });
    console.log("[Migrate] Target before:", before);
    console.log("[Migrate] Migrated users/devices:", { users: migratedUsers, devices: migratedDevices });
    console.log("[Migrate] Inserted new readings:", insertedReadings);
    console.log("[Migrate] Target after:", after);
  } finally {
    sqlite.close();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[Migrate] Failed:", error);
  process.exit(1);
});
