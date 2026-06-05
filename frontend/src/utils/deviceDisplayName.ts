import type { Translations } from "../i18n/translations";
import type { DeviceInfo } from "../types";

const DEVICE_NAME_BY_ID: Record<string, keyof Translations> = {
  "esp32-001": "device_sim_office",
  "esp32-002": "device_sim_gym",
  "esp32-003": "device_sim_bedroom",
  "esp32-004": "device_sim_greenhouse",
  "esp32-005": "device_sim_school",
};

export function getDisplayDeviceName(
  device: Pick<DeviceInfo, "device_id" | "name">,
  t: Translations
): string {
  const translationKey = DEVICE_NAME_BY_ID[device.device_id];
  if (!translationKey) return device.name;
  return t[translationKey];
}
