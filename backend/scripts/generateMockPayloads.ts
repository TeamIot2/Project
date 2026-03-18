import fs from "fs";
import path from "path";
import {
  EnvironmentalReading,
  GatewayIngestPayload,
  RawSensorPayload,
  SensorReading,
} from "../../shared/types";

const docsApiDir = path.resolve(__dirname, "../../docs/api");
const mocksDir = path.join(docsApiDir, "mocks");
const baseTimestamp = new Date("2026-03-17T18:45:00.000Z");

function createDeterministicRng(seed: number) {
  let state = seed >>> 0;

  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function createEnvironmentalReading(
  minuteOffset: number,
  sequence: number
): EnvironmentalReading {
  const rng = createDeterministicRng(1234 + sequence);
  const timestamp = new Date(
    baseTimestamp.getTime() + minuteOffset * 60_000
  ).toISOString();

  const co2_ppm = Math.round(760 + rng() * 180);
  const temperature_c = round(22.4 + rng() * 1.8, 1);
  const humidity_pct = round(39 + rng() * 8, 1);
  const pressure_hpa = round(1008.6 + rng() * 2.6, 1);
  const light_lux = round(160 + rng() * 90, 1);
  const sound_level_adc = Math.round(2050 + rng() * 180);
  const sound_peak_adc = sound_level_adc + Math.round(450 + rng() * 250);
  const sound_rms_adc = Math.round(sound_level_adc * 0.93);
  const sound_event = sound_peak_adc >= 2750;
  const battery_v = round(3.96 + rng() * 0.1, 2);

  return {
    device_id: "esp32-node-01",
    gateway_id: "node-red-gw-01",
    timestamp,
    co2_ppm,
    temperature_c,
    humidity_pct,
    pressure_hpa,
    light_lux,
    sound_level_adc,
    sound_peak_adc,
    sound_rms_adc,
    sound_event,
    battery_v,
    source: "mock-generator-v1",
  };
}

function createRawPayload(reading: EnvironmentalReading): RawSensorPayload {
  return {
    captured_at: reading.timestamp,
    device_id: reading.device_id,
    frames: {
      bh1750: {
        bus: "i2c",
        address: "0x23",
        mode: "continuous_high_resolution",
        raw_bytes: [0, 225],
        raw_value: 225,
        lux_formula: "raw / 1.2",
        lux_estimate: 187.5,
      },
      bme280: {
        bus: "i2c",
        address: "0x77",
        register_range: "0xF7-0xFE",
        raw_bytes: [100, 90, 192, 126, 237, 0, 95, 144],
        raw_adc: {
          pressure: 410028,
          temperature: 519888,
          humidity: 24464,
        },
        note: "Compensation requires calibration registers from the sensor.",
      },
      mh_z19: {
        bus: "uart",
        baud: 9600,
        command_hex: "FF 01 86 00 00 00 00 00 79",
        response_hex: "FF 86 03 37 00 00 00 00 40",
        co2_ppm: reading.co2_ppm,
      },
      max9814: {
        bus: "adc",
        adc_pin: "GPIO34",
        sample_rate_hz: 4000,
        samples: [
          2048, 2082, 2121, 2180, 2254, 2310, 2194, 2102, 2056, 2029, 2041,
          2077,
        ],
        note: "Example centered ADC waveform for envelope or RMS processing.",
      },
    },
  };
}

function createMinimalReading(reading: EnvironmentalReading): SensorReading {
  return {
    device_id: reading.device_id,
    co2_ppm: reading.co2_ppm,
    temperature_c: reading.temperature_c,
    timestamp: reading.timestamp,
  };
}

function createGatewayBatch(
  readings: EnvironmentalReading[]
): GatewayIngestPayload {
  return {
    gateway_id: "node-red-gw-01",
    sent_at: new Date(baseTimestamp.getTime() + 5 * 60_000).toISOString(),
    sequence: 17,
    readings,
  };
}

function writeJson(filename: string, value: unknown) {
  fs.writeFileSync(
    path.join(mocksDir, filename),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8"
  );
}

function main() {
  fs.mkdirSync(mocksDir, { recursive: true });

  const latestReading = createEnvironmentalReading(0, 0);
  const timeseries = Array.from({ length: 12 }, (_, index) =>
    createEnvironmentalReading(index * 5, index)
  );

  writeJson("minimal-reading.json", createMinimalReading(latestReading));
  writeJson("environmental-reading.json", latestReading);
  writeJson("gateway-batch.json", createGatewayBatch(timeseries.slice(0, 6)));
  writeJson("raw-device-payload.json", createRawPayload(latestReading));
  writeJson("environmental-timeseries.json", timeseries);

  console.log(`Mock payloads written to ${mocksDir}`);
}

main();
