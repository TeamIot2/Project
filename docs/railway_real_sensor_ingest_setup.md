# Railway Real Sensor Ingest Setup

Last updated: 2026-06-05

This document records how real sensor data is currently sent from the physical ESP32 device to the deployed Railway application.

For the broader current project state, also see:

```text
U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\docs\project_status.md
```

## Current Deployment State

The application is deployed and online on Railway.

- Railway public URL: `https://team2.up.railway.app`
- Railway project: `Team2App_RailwayProject`
- Railway project ID: `43e7a091-ba42-4db1-b13d-ed4f02009116`
- Railway service: `Team2App`
- Railway service ID: `b36d1b7d-0182-49d2-bca2-ab0affa9aec8`
- Railway environment: `production`
- Railway region: `EU West`
- Current deployment ID: `028ea3f1-0ce3-4673-968f-ac36ef609b88`
- Railway health endpoint: `https://team2.up.railway.app/api/health`

The health endpoint returned `status: ok` after the latest deploy.

The deployed frontend and backend are hosted together on Railway. In production, the frontend API client uses relative API paths through the same origin:

- Frontend API client: `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\frontend\src\api.ts`
- Production API base: `/api`
- Deployed backend API example: `https://team2.up.railway.app/api/readings/ingest`

## Current Live Data Path

Real sensor data is currently forwarded to Railway.

```text
ESP32 LoLin32 + sensors
  -> USB serial COM3 at 115200 baud
  -> local Node-RED gateway on this laptop
  -> Railway backend at https://team2.up.railway.app/api/readings/ingest
  -> Railway frontend at https://team2.up.railway.app
  -> remote users viewing live values in the browser
```

Last verified production reading:

```text
device_id: esp32-001
timestamp: 2026-06-04T22:11:37.748Z
source: uart
co2_ppm: 410
temperature_c: 26.15
humidity_pct: 39.58
pressure_hpa: 986
light_lux: 6.67
sound_level_adc: 1383
```

These values are only a verification snapshot. They should not be treated as a fixed expected result.

## Important Files

- Node-RED flow: `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\gateway\.node-red\flows.json`
- Node-RED settings: `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\gateway\.node-red\settings.js`
- Local serial bridge helper: `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\gateway\src\serial-to-backend.js`
- ESP32 firmware: `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\firmware\esp32_sensor_smoke_test\esp32_sensor_smoke_test.ino`
- Backend ingest route: `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\backend\src\routes\readings.ts`
- Backend device route and monitoring control: `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\backend\src\routes\devices.ts`
- Backend application data layer: `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\backend\src\services\appDataService.ts`
- Backend database service: `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\backend\src\services\database.ts`

## Current Node-RED Details

- Serial input node ID: `serial-in-com3`
- Serial config node ID: `serial-com3`
- Serial port: `COM3`
- Baud rate: `115200`
- Validation node ID: `validate-fn`
- Payload wrapper node ID: `buffer-fn`
- HTTP request node ID for ingest: `http-post`
- Current HTTP URL in `http-post`: `https://team2.up.railway.app/api/readings/ingest`
- Current monitoring control URL: `https://team2.up.railway.app/api/devices/esp32-001/monitoring-control`
- Current gateway ID: `node-red-gw-01`

Node-RED forwards each valid ESP32 JSON line immediately. It does not wait for a six-reading batch anymore.

The current flow uses an `x-gateway-key` header. Keep the real production gateway key out of git. The development fallback key is acceptable only for local/demo use and should be replaced before treating the deployment as production-secure.

## Backend Ingest Contract

The backend accepts gateway data at:

```text
POST /api/readings/ingest
```

For Railway, the full URL is:

```text
https://team2.up.railway.app/api/readings/ingest
```

The request must include:

```text
x-gateway-key: <same value as Railway GATEWAY_KEY>
```

Accepted payload shape:

```json
{
  "gateway_id": "node-red-gw-01",
  "sent_at": "2026-06-04T00:00:00.000Z",
  "sequence": 1,
  "readings": [
    {
      "device_id": "esp32-001",
      "timestamp": "2026-06-04T00:00:00.000Z",
      "co2_ppm": 797,
      "temperature_c": 28.0,
      "humidity_pct": 32.5,
      "pressure_hpa": 988,
      "light_lux": 11,
      "sound_level_adc": 1384,
      "sound_peak_adc": 1384,
      "sound_rms_adc": 1384,
      "sound_event": false,
      "battery_v": 0,
      "gateway_id": "node-red-gw-01",
      "source": "uart"
    }
  ]
}
```

Required reading fields:

- `device_id`
- `timestamp`
- `co2_ppm`
- `temperature_c`
- `humidity_pct`
- `pressure_hpa`
- `light_lux`
- `sound_level_adc`

The real physical device currently uses:

```text
device_id = esp32-001
```

The app displays this physical device as:

```text
Unicorn-ESP32
```

## Monitoring Stop And Start

The deployed frontend can stop and start monitoring for the real device through the backend.

Current control chain:

```text
Frontend Stop/Start button
  -> PATCH /api/devices/esp32-001/monitoring
  -> backend stores monitoring_enabled and command_seq
  -> Node-RED polls /api/devices/esp32-001/monitoring-control
  -> Node-RED sends TEAM2APP:PAUSE or TEAM2APP:RESUME over COM3
  -> ESP32 firmware pauses or resumes measurement reads
```

Verified behavior after deployment:

- Stop prevents new readings from being stored.
- Resume allows new readings to be stored again.
- The sensors remain physically powered from USB.
- Node-RED also suppresses forwarding while monitoring is paused.

## Railway Variables

Required for a secure production setup:

- `GATEWAY_KEY`: production secret that the local gateway sends in `x-gateway-key`

Useful deployment variables:

- `REAL_OFFICE_DEVICE_ID=esp32-001`
- `ENABLE_DEMO_MODE_DATA=true` if mock/demo modes should remain available
- `AUTO_SEED_MOCK_DATA=true` if the app should seed demo data when the database is empty
- `BOOTSTRAP_DEMO_DEVICES=true` if demo devices should exist alongside the real device

## Database Persistence

The backend now supports PostgreSQL through the `DATABASE_URL` environment variable.

Production target:

```text
Railway PostgreSQL -> app service variable DATABASE_URL
```

When `DATABASE_URL` is set, the backend stores users, devices, monitoring state, and readings in PostgreSQL. When `DATABASE_URL` is not set, the backend falls back to the local `sql.js` SQLite-style database file for local development and emergency recovery.

Local fallback database file:

```text
U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\backend\data\readings.db
```

Local SQLite safety backup created before the PostgreSQL work:

```text
C:\WORKSPACES\Team2App\Team2App_local_backup\database-migration-safety\readings-before-postgres-1101_06-06-2026.db
```

Preferred production migration after the Railway PostgreSQL `DATABASE_URL` is available:

```powershell
cd C:\WORKSPACES\Team2App\Team2App_ROOT\PROJECT\backend
$env:DATABASE_URL="<railway-postgres-url>"
$env:SOURCE_API_BASE="https://team2.up.railway.app/api"
$env:SOURCE_ADMIN_EMAIL="admin@email.com"
$env:SOURCE_ADMIN_PASSWORD="<current-admin-password>"
npm run migrate:railway-api-to-postgres
```

This pulls devices and readings from the currently deployed Railway API before the app service is switched to PostgreSQL. It inserts only readings that do not already exist by `device_id + timestamp + source`, so it can be rerun during the cutover window.

Local fallback migration command, useful only when the local SQLite file is the desired source:

```powershell
cd C:\WORKSPACES\Team2App\Team2App_ROOT\PROJECT\backend
$env:DATABASE_URL="<railway-postgres-url>"
npm run migrate:sqlite-to-postgres
```

Both migration commands are additive: they create the PostgreSQL schema if needed, upsert users/devices where applicable, insert only missing readings, and do not delete or modify the original SQLite database file.

## Verification Checklist

1. Verify Railway backend is alive:

```powershell
Invoke-RestMethod -Uri "https://team2.up.railway.app/api/health"
```

Expected result:

```json
{
  "status": "ok"
}
```

2. Verify Node-RED receives serial data from ESP32:

- Open the local Node-RED UI at `http://127.0.0.1:1881`.
- Check the debug panel.
- Confirm `Debug: reading`, `Debug: batch`, and `Debug: response` show new records and HTTP success responses.

3. Verify the gateway posts to Railway:

- The `Debug: response` node should show HTTP success responses from `/api/readings/ingest`.
- The response should contain an accepted count greater than `0`.

4. Verify the deployed frontend:

- Open `https://team2.up.railway.app`.
- Sign in.
- Select `Unicorn` or another real-device-enabled mode.
- Confirm live values update close to the `5 second` sensor cadence.

5. Verify monitoring stop/start:

- Press `Stop` in the frontend.
- Confirm new readings stop being stored.
- Press start/resume again.
- Confirm fresh readings appear again.

## Expected Runtime Requirements

For live remote measurements, all of these must be true at the same time:

- The ESP32 board is powered and connected to the laptop over USB.
- The sensors are physically connected and producing valid values.
- The laptop is online.
- Node-RED is running locally.
- Node-RED can read `COM3`.
- Node-RED posts to the Railway ingest URL.
- The Node-RED `x-gateway-key` matches Railway `GATEWAY_KEY`.
- Railway service `Team2App` is online.
- The deployed frontend uses the same Railway backend through `/api`.

If any one of these is missing, the online frontend may still load, but it will not receive fresh live sensor measurements.

## Local Development Versus Remote Measurement

Local-only development target:

```text
Node-RED -> http://127.0.0.1:3002/api/readings/ingest
Frontend -> http://127.0.0.1:5173
Backend -> http://127.0.0.1:3002
```

Remote Railway measurement target:

```text
Node-RED -> https://team2.up.railway.app/api/readings/ingest
Frontend -> https://team2.up.railway.app
Backend -> https://team2.up.railway.app/api
```

Only one target is active in the current flow. If Node-RED points to Railway, the local backend will not receive those same readings unless the flow is extended to post to both targets.

## Next Work

Recommended next production-hardening tasks:

1. Move production history storage to Railway PostgreSQL or a persistent Railway volume.
2. Replace the development gateway key fallback with a secure production secret.
3. Add gateway status visibility in the frontend.
4. Add clearer UI states for real environments with no assigned device or no data in the selected time range.
5. Decide whether Node-RED should support dual forwarding to local and Railway backends during development.
