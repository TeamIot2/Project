# Project Status

Last updated: 2026-06-05

## Current Summary

Team2App is an IoT environmental monitoring application. The physical ESP32 sensor node sends real environmental readings over USB serial to a local Node-RED gateway running on this laptop. Node-RED forwards readings to the deployed Railway backend, and the deployed React frontend reads them from the same Railway app.

Current live path:

```text
ESP32 LoLin32 + sensors
  -> USB serial COM3 at 115200 baud
  -> local Node-RED gateway on this laptop
  -> Railway backend at https://team2.up.railway.app/api
  -> Railway frontend at https://team2.up.railway.app
  -> browser users
```

## Deployment

- Railway public URL: `https://team2.up.railway.app`
- Railway project: `Team2App_RailwayProject`
- Railway service: `Team2App`
- Railway environment: `production`
- Railway region: `EU West`
- Current deployment ID: `006665c8-7409-4a5e-9c65-17a71aaebaf4`
- Health endpoint: `https://team2.up.railway.app/api/health`
- Last verified production health status: `ok` at `2026-06-05T10:18:40.131Z`

The deployed frontend and backend are hosted together. In production, frontend API calls use relative `/api` paths on the same origin.

## Real Sensor Device

- Physical device ID: `esp32-001`
- Display device name in the app: `Unicorn-ESP32`
- Real sensor board: `ESP32 LoLin32`
- Local serial port: `COM3`
- Serial speed: `115200`
- Gateway ID: `node-red-gw-01`
- Current source field for real readings: `uart`

Connected sensors:

- `BME280`: temperature, humidity, pressure
- `BH1750`: ambient light
- `MAX9814`: microphone/noise ADC estimate
- `MH-Z19`: CO2 ppm through UART and level shifter

The ESP32 firmware emits JSON readings roughly every `5 seconds`. Node-RED forwards each valid reading immediately as a one-reading ingest payload.

## Active Gateway State

Node-RED is the active gateway layer.

Important files:

- `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\gateway\.node-red\flows.json`
- `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\gateway\.node-red\settings.js`
- `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\firmware\esp32_sensor_smoke_test\esp32_sensor_smoke_test.ino`

Current Node-RED production targets:

- Ingest: `https://team2.up.railway.app/api/readings/ingest`
- Monitoring control: `https://team2.up.railway.app/api/devices/esp32-001/monitoring-control`

Node-RED polls the backend monitoring-control endpoint and sends serial commands to ESP32:

- `TEAM2APP:PAUSE`
- `TEAM2APP:RESUME`

When monitoring is paused:

- Node-RED stops forwarding readings for `esp32-001`.
- The backend stops receiving new stored readings from the gateway.
- ESP32 can stop its measurement loop after receiving the pause command.
- Sensors remain physically powered by USB, which is acceptable for the current project.

## Frontend State

The frontend keeps the existing visual design and now uses real data only for the real ESP32-backed modes.

Current important behavior:

- `Unicorn` and `Bedroom` can use the real `Unicorn-ESP32` device.
- `Greenhouse` has no assigned real device and should not show real measurement history.
- Mock/demo modes are marked with `(M)` in the environment names.
- Mock devices are marked with `(mock)`.
- The Devices page contains one real device, `Unicorn-ESP32`, followed by mock placeholders.
- The Devices page top panel shows only `Connect new device` / `Připojit nové zařízení`; device search remains inside the connect-device modal.
- The History page shows history for the currently selected environment from the carousel.
- History shows only one active device at a time.
- History supports `Individual` and `Combined` chart views.
- The old `Deviation` chart view has been removed.
- Chart titles include units in brackets, for example `CO2  [PPM]`.
- Time preset buttons are relative to the click time. For example, `8h` means the last 8 hours from the moment the button is clicked.
- Missing historical periods are represented as gaps, not fake continuous data.
- The Monitoring page `Live:` label shows continuous measurement time since the last start/interruption.
- The gear statistics show cumulative mode measurement uptime, current measurement interval, and reliability from stored samples versus expected samples.
- Environment threshold editing uses four values per metric: ideal, lower poor limit, upper poor limit, and critical value. Critical values are notification-only and do not affect quality percentages.
- Czech notification settings use the label `Notifikace`, and Czech quality labels use `Dobré`.

The main Monitoring page polls live values every `5 seconds` only while frontend monitoring is active. If the user presses `Stop`, the frontend avoids unnecessary refresh polling.

## Backend And Database

The backend is Express.js with TypeScript.

Important files:

- `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\backend\src\server.ts`
- `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\backend\src\routes\readings.ts`
- `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\backend\src\routes\devices.ts`
- `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\backend\src\services\database.ts`
- `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\backend\src\services\appDataService.ts`
- `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\backend\src\services\historyMockSeed.ts`

Current database implementation:

- The backend currently uses SQLite through `sql.js`.
- Local database file: `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\backend\data\readings.db`
- Railway uses a persistent volume mounted at `/data`.
- Production database path is configured as `READINGS_DB_PATH=/data/readings.db`.

Production storage state:

The Railway volume keeps the current SQLite database across deploys. PostgreSQL remains a possible future upgrade if concurrent writes, richer relational queries, or larger production data volumes become important.

Important reading/stat endpoints:

- `/api/readings/uptime`: current uninterrupted measurement uptime for selected devices.
- `/api/readings/mode-stats`: cumulative mode measurement uptime, expected/current interval, and reliability from stored reading timestamps.

## Historical Data State

Real devices:

- Presentation/demo history for real modes is seeded from `2025-05-01` to `2026-05-01`.
- May 2026 until the start of real measurements is intentionally left without data.
- Fresh real measured data is stored from the active sensor ingest sessions.
- Missing periods must remain visible as empty gaps in charts.

Mock modes:

- Mock modes keep generated demo history for presentation and UI testing.
- Mock data should stay clearly marked as mock/demo and must not be confused with the physical ESP32 data.

## Local Development

Local development remains separate from production deployment unless explicitly deployed.

Typical local services:

- Local frontend: `http://127.0.0.1:5173`
- Local backend: `http://127.0.0.1:3002`
- Local Node-RED UI: `http://127.0.0.1:1881`

Current gateway target is Railway, not local backend. If local-only development is needed, Node-RED can be switched back to:

```text
http://127.0.0.1:3002/api/readings/ingest
http://127.0.0.1:3002/api/devices/esp32-001/monitoring-control
```

Only one target is active in the current flow. If Node-RED points to Railway, local backend history will not receive the same live readings unless the flow is extended to forward to both targets.

## Local Backups

- Latest verified local backup mode: `PROJECT-only`
- Source: `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT`
- Backup target: `U:\ide_workspaces\Team2App\Team2App_local_backup`
- Latest verified snapshot: `project-backup-1214-05-06-2026`
- Verification result: source and snapshot both contained `39033` items after excluding `.git` and junction points; `.git` directory count in the snapshot was `0`.

## Open Work

- Decide later whether to migrate from Railway-volume SQLite to PostgreSQL for larger or more concurrent production use.
- Replace the development gateway key fallback with a real production secret stored outside git.
- Keep improving the mechanical reliability of the physical wiring.
- Consider dual-forwarding in Node-RED if simultaneous local and Railway ingest is useful.
- Add production-grade observability for gateway online/offline state and ingest failures.
- Add clearer UI feedback when a selected real environment has no assigned real device or no data for the chosen time range.
