const { SerialPort, ReadlineParser } = require("serialport");

const serialPath = process.env.SERIAL_PORT || "COM3";
const baudRate = Number.parseInt(process.env.SERIAL_BAUD || "115200", 10);
const ingestUrl = process.env.INGEST_URL || "http://127.0.0.1:3002/api/readings/ingest";
const gatewayKey = process.env.GATEWAY_KEY || "gw-secret-key-change-me";
const gatewayId = process.env.GATEWAY_ID || "local-laptop-gateway";
const batchSize = Math.max(1, Number.parseInt(process.env.BATCH_SIZE || "1", 10));
const controlledDeviceId = process.env.DEVICE_ID || "esp32-001";
const controlPollMs = Math.max(1000, Number.parseInt(process.env.CONTROL_POLL_MS || "3000", 10));
const controlUrl = process.env.CONTROL_URL || ingestUrl.replace(
  /\/api\/readings\/ingest$/,
  `/api/devices/${encodeURIComponent(controlledDeviceId)}/monitoring-control`
);

const requiredFields = [
  "device_id",
  "co2_ppm",
  "temperature_c",
  "humidity_pct",
  "pressure_hpa",
  "light_lux",
  "sound_level_adc",
];

let sequence = 0;
let buffer = [];
let sending = false;
let monitoringEnabled = true;
let lastControlSeq = null;
let portReady = false;
let pendingControlCommand = null;

function buildControlCommand(enabled) {
  return `TEAM2APP:${enabled ? "RESUME" : "PAUSE"}\n`;
}

function sendControlCommand(enabled) {
  pendingControlCommand = enabled;
  if (!portReady) return;

  const command = buildControlCommand(enabled);
  port.write(command, (error) => {
    if (error) {
      console.error(`[Bridge] Failed to send ESP32 control command: ${error.message}`);
      return;
    }
    pendingControlCommand = null;
    console.log(`[Bridge] Sent ESP32 control command: ${command.trim()}`);
  });
}

async function pollControlState() {
  try {
    const response = await fetch(controlUrl, {
      method: "GET",
      headers: {
        "x-gateway-key": gatewayKey,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[Bridge] Control poll failed: ${response.status} ${body}`);
      return;
    }

    const control = await response.json();
    const nextEnabled = control.monitoring_enabled !== false;
    const nextSeq = Number(control.command_seq || 0);
    if (lastControlSeq !== nextSeq || monitoringEnabled !== nextEnabled) {
      lastControlSeq = nextSeq;
      monitoringEnabled = nextEnabled;
      buffer = buffer.filter((reading) => reading.device_id !== controlledDeviceId || monitoringEnabled);
      sendControlCommand(monitoringEnabled);
      console.log(`[Bridge] Monitoring ${monitoringEnabled ? "enabled" : "paused"} for ${controlledDeviceId} (seq ${nextSeq})`);
    }
  } catch (error) {
    console.error(`[Bridge] Control poll error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
}

function normalizeReading(input) {
  const reading = { ...input };

  for (const key of [
    "co2_ppm",
    "temperature_c",
    "humidity_pct",
    "pressure_hpa",
    "light_lux",
    "sound_level_adc",
    "sound_peak_adc",
    "sound_rms_adc",
    "battery_v",
  ]) {
    if (key in reading) reading[key] = toNumber(reading[key]);
  }

  if (!reading.timestamp) reading.timestamp = new Date().toISOString();
  if (!reading.gateway_id) reading.gateway_id = gatewayId;
  if (!reading.source) reading.source = "usb-serial";
  if (reading.sound_peak_adc === undefined) reading.sound_peak_adc = reading.sound_level_adc;
  if (reading.sound_rms_adc === undefined) reading.sound_rms_adc = reading.sound_level_adc;
  if (reading.sound_event === undefined) reading.sound_event = false;

  return reading;
}

function validateReading(reading) {
  for (const field of requiredFields) {
    if (!(field in reading)) return `missing ${field}`;
  }

  for (const field of requiredFields.filter((field) => field !== "device_id")) {
    if (typeof reading[field] !== "number" || Number.isNaN(reading[field])) {
      return `${field} must be a number`;
    }
  }

  if (typeof reading.device_id !== "string" || reading.device_id.trim() === "") {
    return "device_id must be a non-empty string";
  }

  return null;
}

async function sendBatch() {
  if (sending || buffer.length < batchSize) return;
  sending = true;

  const readings = buffer.splice(0, batchSize);
  const payload = {
    gateway_id: gatewayId,
    sent_at: new Date().toISOString(),
    sequence: ++sequence,
    readings,
  };

  try {
    const response = await fetch(ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gateway-key": gatewayKey,
      },
      body: JSON.stringify(payload),
    });

    const body = await response.text();
    if (!response.ok) {
      buffer = readings.concat(buffer);
      console.error(`[Bridge] Ingest failed: ${response.status} ${body}`);
      return;
    }

    console.log(`[Bridge] Sent ${readings.length} reading(s), sequence ${sequence}: ${body}`);
  } catch (error) {
    buffer = readings.concat(buffer);
    console.error(`[Bridge] Ingest error: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    sending = false;
  }
}

function tryParseJsonLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    console.warn(`[Bridge] Ignoring invalid JSON line: ${trimmed}`);
    return null;
  }
}

const port = new SerialPort({ path: serialPath, baudRate });
const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

port.on("open", () => {
  console.log(`[Bridge] Reading ${serialPath} at ${baudRate} baud`);
  console.log(`[Bridge] Posting to ${ingestUrl} as ${gatewayId}`);
});

port.on("error", (error) => {
  console.error(`[Bridge] Serial error: ${error.message}`);
});

parser.on("data", (line) => {
  const parsed = tryParseJsonLine(line);
  if (!parsed) return;

  const reading = normalizeReading(parsed);
  const validationError = validateReading(reading);
  if (validationError) {
    console.warn(`[Bridge] Dropping reading: ${validationError}`);
    return;
  }

  if (reading.device_id === controlledDeviceId && !monitoringEnabled) {
    console.log(`[Bridge] Dropping paused reading from ${reading.device_id}`);
    return;
  }

  buffer.push(reading);
  void sendBatch();
});

port.on("open", () => {
  portReady = true;
  if (pendingControlCommand !== null) {
    sendControlCommand(pendingControlCommand);
  }
  void pollControlState();
});

setInterval(() => {
  void pollControlState();
}, controlPollMs);

process.on("SIGINT", () => {
  console.log("[Bridge] Shutting down");
  port.close(() => process.exit(0));
});
