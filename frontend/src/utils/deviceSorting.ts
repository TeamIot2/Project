import type { DeviceInfo, DeviceStatus } from "../types";

const DEVICE_STATUS_PRIORITY: Record<DeviceStatus, number> = {
  online: 0,
  error: 1,
  offline: 2,
};

// Keep ordering deterministic: status priority first, original order second.
export function sortDevicesByStatus(devices: DeviceInfo[]): DeviceInfo[] {
  return devices
    .map((device, index) => ({ device, index }))
    .sort((a, b) => {
      const priorityDiff = DEVICE_STATUS_PRIORITY[a.device.status] - DEVICE_STATUS_PRIORITY[b.device.status];
      if (priorityDiff !== 0) return priorityDiff;
      return a.index - b.index;
    })
    .map(({ device }) => device);
}
