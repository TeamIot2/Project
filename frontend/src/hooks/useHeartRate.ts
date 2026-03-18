import { useState, useCallback, useRef } from "react";

interface HeartRateState {
  bpm: number | null;
  rmssd: number | null;
  connected: boolean;
  connecting: boolean;
  deviceName: string | null;
  error: string | null;
}

/**
 * Calculate RMSSD (Root Mean Square of Successive Differences) from R-R intervals.
 * This is the standard short-term HRV metric.
 */
function calculateRMSSD(rrIntervals: number[]): number | null {
  if (rrIntervals.length < 2) return null;
  let sumSquaredDiffs = 0;
  for (let i = 1; i < rrIntervals.length; i++) {
    const diff = rrIntervals[i] - rrIntervals[i - 1];
    sumSquaredDiffs += diff * diff;
  }
  return Math.round(Math.sqrt(sumSquaredDiffs / (rrIntervals.length - 1)));
}

/**
 * Parse the Heart Rate Measurement characteristic value per Bluetooth SIG spec.
 * Byte 0: Flags (bit 0 = HR format, bit 4 = RR interval present)
 * Byte 1 (or 1-2): Heart Rate Value
 * Remaining bytes: RR intervals (1/1024 sec resolution)
 */
function parseHeartRate(value: DataView): { bpm: number; rrIntervals: number[] } {
  const flags = value.getUint8(0);
  const is16Bit = (flags & 0x01) !== 0;
  const hasRR = (flags & 0x10) !== 0;

  let offset = 1;
  let bpm: number;

  if (is16Bit) {
    bpm = value.getUint16(offset, true);
    offset += 2;
  } else {
    bpm = value.getUint8(offset);
    offset += 1;
  }

  // Skip Energy Expended if present (bit 3)
  if ((flags & 0x08) !== 0) {
    offset += 2;
  }

  const rrIntervals: number[] = [];
  if (hasRR) {
    while (offset + 1 < value.byteLength) {
      // RR intervals are in 1/1024 second units, convert to ms
      const rr = value.getUint16(offset, true);
      rrIntervals.push(Math.round((rr / 1024) * 1000));
      offset += 2;
    }
  }

  return { bpm, rrIntervals };
}

export function useHeartRate() {
  const [state, setState] = useState<HeartRateState>({
    bpm: null,
    rmssd: null,
    connected: false,
    connecting: false,
    deviceName: null,
    error: null,
  });

  const deviceRef = useRef<BluetoothDevice | null>(null);
  const rrBufferRef = useRef<number[]>([]);

  const isSupported = typeof navigator !== "undefined" && "bluetooth" in navigator;

  const connect = useCallback(async () => {
    if (!isSupported) {
      setState((s) => ({ ...s, error: "Web Bluetooth not supported" }));
      return;
    }

    setState((s) => ({ ...s, connecting: true, error: null }));

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ["heart_rate"] }],
        optionalServices: ["heart_rate"],
      });

      deviceRef.current = device;

      device.addEventListener("gattserverdisconnected", () => {
        setState({
          bpm: null,
          rmssd: null,
          connected: false,
          connecting: false,
          deviceName: device.name ?? null,
          error: null,
        });
        rrBufferRef.current = [];
      });

      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService("heart_rate");
      const characteristic = await service.getCharacteristic("heart_rate_measurement");

      characteristic.addEventListener("characteristicvaluechanged", (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const { bpm, rrIntervals } = parseHeartRate(target.value!);

        // Keep last 30 RR intervals for RMSSD calculation
        const buffer = rrBufferRef.current;
        buffer.push(...rrIntervals);
        if (buffer.length > 30) {
          buffer.splice(0, buffer.length - 30);
        }

        const rmssd = calculateRMSSD(buffer);

        setState((s) => ({
          ...s,
          bpm,
          rmssd,
          connected: true,
          connecting: false,
          deviceName: device.name ?? null,
        }));
      });

      await characteristic.startNotifications();

      setState((s) => ({
        ...s,
        connected: true,
        connecting: false,
        deviceName: device.name ?? null,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        connecting: false,
        error: err instanceof Error ? err.message : "Connection failed",
      }));
    }
  }, [isSupported]);

  const disconnect = useCallback(() => {
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    deviceRef.current = null;
    rrBufferRef.current = [];
    setState({
      bpm: null,
      rmssd: null,
      connected: false,
      connecting: false,
      deviceName: null,
      error: null,
    });
  }, []);

  return { ...state, isSupported, connect, disconnect };
}
