# Project Status — IoT Environmental Monitoring

**Last updated:** 2026-03-24

---

## Architecture Overview

```
ESP32 + Sensors  --UART-->  Node-RED Gateway  --HTTP POST-->  Express.js Backend  <--REST-->  React Dashboard
(firmware)                  (local PC / RPi)                  (localhost / Railway)            (browser)
```

---

## What Is Done

### Frontend (React + TypeScript)
- **Dashboard page** — real-time sensor gauges, environment mode selector, device overview cards
- **History page** — time-series area charts with 3 modes (individual, combined, deviation), time range selector, device/sensor filter
- **Devices page** — expandable device list with live sensor readings, status badges, connect-new-device modal
- **Settings page** — profile editing with avatar, preferences (theme, language, notifications, push, digest, refresh interval), custom monitoring modes, environment threshold table, security section (2FA, session timeout), logout
- **Login page** — mock authentication flow
- **Responsive layout** — mobile (<960px), desktop single panel (960–1299px), dual-view shell (≥1300px)
- **i18n** — Czech/English bilingual UI
- **Theme** — light/dark mode with full CSS variable system
- **Environment presets** — sleep, office, sport, outdoor, school, factory, greenhouse — each with quality thresholds

### Backend (Express.js + TypeScript)
- **REST API** with the following endpoints:
  - `GET /api/health` — health check
  - `POST /api/auth/login` / `GET /api/auth/me` / `POST /api/auth/logout` — mock auth with JWT-like tokens
  - `GET /api/devices` / `GET /api/devices/:id` — device listing
  - `GET /api/readings` — query readings with device_id, from, to, limit filters
  - `GET /api/readings/latest/:deviceId` — latest reading for a device
  - `GET /api/readings/stats` — min/max/avg/current aggregations
  - `POST /api/readings/ingest` — gateway data ingestion (gateway key auth)
  - `GET /api/environments` / `GET /api/environments/:mode` — environment presets and thresholds
- **SQLite database** (sql.js) — persistent storage for readings and devices
- **Auto-seed** — on startup, if DB is empty, generates 30 days of realistic mock data (34,560 readings for 4 devices)
- **Mock auth middleware** — 4 mock users (admin, operator, viewers) with role-based access
- **CORS** and security headers

### Gateway (Node-RED)
- **Installed** locally in `PROJECT/gateway/` with npm
- **Flow configured** — "IoT Env Monitor" tab with:
  - Simulated ESP32 inject node (10s interval, test JSON)
  - JSON parser
  - Validate & Enrich function (field checks, range validation, timestamp/gateway_id injection)
  - Buffer node (batches 6 readings ≈ 60s)
  - HTTP POST to backend `/api/readings/ingest`
  - Response checker with status indicators
  - Debug nodes for monitoring
- **Ready for real hardware** — swap simulate node with serial-in node when ESP32 is connected

### Hardware Documentation
- Component specs documented for all sensors: MH-Z19 (CO2), BME280 (temp/humidity/pressure), BH1750 (light), MAX9814 (microphone)
- ESP32 LoLin32 board documented with pin mapping
- Complete wiring schema with level shifter for MH-Z19
- Step-by-step assembly guide with recommended bring-up order

### Shared Types
- Full TypeScript type definitions for all data structures (readings, devices, environments, auth, stats, raw sensor frames)
- Shared between frontend and backend

---

## What Remains To Do

### High Priority (needed for MVP)

1. **ESP32 Firmware**
   - Arduino sketch for reading all 4 sensors (I2C + UART + ADC)
   - JSON serialization and UART output to gateway
   - 10s main loop with 30s CO2 reads, 100ms audio sampling with aggregation
   - MH-Z19 preheat handling (3 min warm-up)
   - Status: not started

2. **Railway Deployment (single service)**
   - **Decision made:** frontend and backend will be deployed as a single Railway service — Express.js serves both the API and the React build output as static files. This avoids CORS configuration, simplifies deployment, and has no meaningful performance difference for our scale (academic project, tens of users).
   - Build step: `tsc` for backend, `npm run build` for frontend, then Express serves `frontend/dist/` as static files
   - PostgreSQL addon for persistent production data (SQLite is dev-only)
   - Environment variables: `DATABASE_URL`, `GATEWAY_KEY`, `PORT`
   - Status: Procfile created, auto-seed ready, static serving not yet wired

### Medium Priority (polish & completeness)

4. **Real serial port integration in Node-RED**
   - Install `node-red-node-serialport`
   - Configure serial-in node with correct USB port and baud rate (115200)
   - Test end-to-end with physical ESP32

5. **Database migration to PostgreSQL for Railway**
   - Add `pg` driver
   - Switching logic: `if (DATABASE_URL) → PostgreSQL else → SQLite`
   - Same schema, same queries — only the driver changes

6. **Tab content unification**
   - History, Devices, and Settings pages have inconsistent layout structures
   - Should follow a common pattern (page-header, content sections)

7. **Light theme CSS fix**
   - Dark gradient strip appears at bottom of desktop view in light mode
   - Identified but not yet fixed

### Low Priority (nice-to-have)

8. **Polar H10 heart rate integration** (Web Bluetooth)
   - Types already defined in shared types
   - Backend fields ready (heart_rate_bpm, hrv_rmssd_ms)

9. **OTA firmware updates** for ESP32

10. **Data downsampling** at gateway level for long-term storage efficiency

11. **Real user authentication** — replace mock auth with proper JWT + hashed passwords

---

## Tech Stack Summary

| Layer | Technology | Status |
|---|---|---|
| Firmware | Arduino (ESP32) | Not started |
| Gateway | Node-RED 4.1.8 (local npm) | Flow configured |
| Backend | Express.js 5 + TypeScript + sql.js | Working |
| Frontend | React 18 + TypeScript + Vite + Recharts | Working |
| Database (dev) | SQLite via sql.js | Working |
| Database (prod) | PostgreSQL (Railway addon) | Planned |
| Deployment | Railway | Planned |

---

## How to Run Locally

```bash
# Backend
cd PROJECT/backend
npm run seed          # populate DB with mock data (once)
npm run dev           # starts on :3001 (auto-seeds if DB empty)

# Frontend
cd PROJECT/frontend
npm run dev           # starts on :5173

# Gateway
cd PROJECT/gateway
npx node-red --userDir ./.node-red    # starts on :1880
```

---

## Key Files

| File | Purpose |
|---|---|
| `backend/src/server.ts` | Express server entry point with auto-seed |
| `backend/src/services/database.ts` | SQLite database layer |
| `backend/src/services/autoSeed.ts` | Mock data generation at startup |
| `backend/src/routes/readings.ts` | Reading CRUD + gateway ingest |
| `frontend/src/App.tsx` | React router, desktop/mobile detection |
| `frontend/src/pages/Dashboard.tsx` | Main monitoring dashboard |
| `frontend/src/index.css` | Complete design system |
| `shared/types.ts` | All TypeScript interfaces |
| `gateway/.node-red/flows.json` | Node-RED flow definition |
| `docs/HW/schema_zapojeni_esp32_env_monitor.md` | Wiring diagram |
