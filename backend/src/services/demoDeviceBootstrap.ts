import type { DeviceInfo, DeviceStatus, EnvironmentalReading } from "../../../shared/types";
import {
  deleteDeviceFromDb,
  flushDatabase,
  getLatestReadingFromDb,
  insertReadings,
  upsertDevice,
} from "./database";

const DEMO_DEVICE_ROSTER: Array<{
  device_id: string;
  name: string;
  location: string;
  firmware_version: string;
  battery_v?: number;
  status: DeviceStatus;
}> = [
  { device_id: "esp32-001", name: "Unicorn-ESP32", location: "Unicorn-ESP32", firmware_version: "1.2.0", status: "online" },
  { device_id: "esp32-002", name: "Gym (mock)", location: "Gym placeholder", firmware_version: "1.2.0", battery_v: 4.02, status: "online" },
  { device_id: "esp32-004", name: "Greenhouse (mock)", location: "Greenhouse placeholder", firmware_version: "1.0.0", battery_v: 3.88, status: "online" },
  { device_id: "esp32-005", name: "School (mock)", location: "School placeholder", firmware_version: "1.2.1", battery_v: 4.01, status: "online" },
];

function ensureSchoolSeedReading(nowIso: string): void {
  const schoolLatest = getLatestReadingFromDb("esp32-005");
  if (schoolLatest) return;

  const source =
    getLatestReadingFromDb("esp32-002")
    ?? getLatestReadingFromDb("esp32-001")
    ?? getLatestReadingFromDb("esp32-004");

  if (!source) return;

  const schoolReading: EnvironmentalReading = {
    ...source,
    device_id: "esp32-005",
    timestamp: nowIso,
    source: "demo-bootstrap",
  };

  insertReadings([schoolReading]);
  console.log("[DemoBootstrap] Created initial simulated reading for School device (esp32-005).");
}

export function ensureDemoDeviceRoster(): void {
  const nowIso = new Date().toISOString();

  deleteDeviceFromDb("esp32-003");

  for (const entry of DEMO_DEVICE_ROSTER) {
    const device: DeviceInfo = {
      device_id: entry.device_id,
      name: entry.name,
      location: entry.location,
      last_seen: nowIso,
      status: entry.status,
      firmware_version: entry.firmware_version,
      battery_v: entry.battery_v,
    };
    upsertDevice(device);
  }

  ensureSchoolSeedReading(nowIso);
  flushDatabase();
}
