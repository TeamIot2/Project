# Project Status - IoT Environmental Monitoring

**Last updated:** 2026-03-26

---

## Current Product State

The project currently works as a full web MVP stack:

- IoT-oriented frontend dashboard in React + TypeScript
- Express.js backend API with persistent local storage
- Node-RED gateway flow prepared for ingest and forwarding
- Shared state architecture for synchronized dual-view UI

This file describes the current state only (not a changelog).

---

## Frontend - Current State

### Monitoring (Dashboard)

- Environment carousel and mode-driven monitoring UI are implemented.
- Start/stop monitoring controls and device list behavior are implemented.
- UI handles mode/device availability states (including disabled start state when needed).
- Confirmation/warning modal patterns are integrated for critical monitoring actions.

### History

- Time-series visualization is implemented with 3 chart modes:
  - individual
  - combined
  - deviation
- Preset and custom time ranges are implemented.
- Device and sensor filtering is available in the selector panel.

### Devices

- Devices are rendered as individual expandable cards.
- Each card supports rename flow, mode assignment chips, and disconnect action.
- "Connect new device" flow is available through modal UI.

### Settings

Settings is split into major functional blocks:

- **Evaluation modes**
  - Expandable mode cards with per-mode threshold editing
  - Built-in modes + "Create new mode" card
  - Custom mode creation/editing in the same unified section

- **User profile**
  - Profile identity fields + avatar controls

- **Preferences**
  - Theme preference (light/dark)
  - Language preference (CZ/EN)
  - Notification channel selection (none / in-app / email)
  - Dangerous-value alerts toggle with confirmation modal

- **Sign out**
  - Dedicated sign-out button without extra panel frame

### UI / Theming / Responsiveness

- Light and dark theme support is active.
- Style-16-specific desktop skin is integrated.
- Mobile, desktop, and dual-view layouts are active via container-query driven styling.

### Shared Frontend State

- `ExpandedDevicesContext` keeps device expansion synced across dual-view panels.
- `SettingsStateContext` keeps Settings state synchronized across dual-view panels.

---

## Backend - Current State

- Express.js + TypeScript backend is operational.
- Core REST endpoints for auth, devices, environments, and readings are implemented.
- Reading ingest endpoint is available for gateway integration.
- Local persistence is implemented (SQLite/sql.js setup).

---

## Gateway - Current State

- Node-RED flow is configured for ingest pipeline behavior.
- Simulated source path is available for development/testing.
- Architecture is prepared for real serial data path swap.

---

## Important Open Items

- ESP32 firmware implementation is still pending.
- Production deployment (Railway) remains pending.
- Frontend build currently contains existing TypeScript issues outside this status file scope:
  - unused variables in `Dashboard.tsx` and `Devices.tsx`
  - missing translation key usage in `Devices.tsx`

---

## Key Files

- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/pages/History.tsx`
- `frontend/src/pages/Devices.tsx`
- `frontend/src/pages/Settings.tsx`
- `frontend/src/index.css`
- `frontend/src/components/DualViewShell.tsx`
- `frontend/src/components/EnvironmentCarousel.tsx`
- `frontend/src/contexts/ExpandedDevicesContext.tsx`
- `frontend/src/contexts/SettingsStateContext.tsx`
- `backend/src/server.ts`
- `backend/src/routes/readings.ts`
- `gateway/.node-red/flows.json`
