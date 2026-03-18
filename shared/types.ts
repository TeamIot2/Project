// ============================================================
// Sensor & Reading Types
// ============================================================

export interface SensorReading {
  device_id: string;
  co2_ppm: number;
  temperature_c: number;
  timestamp: string;
}

export interface EnvironmentalReading extends SensorReading {
  humidity_pct: number;
  pressure_hpa: number;
  light_lux: number;
  sound_level_adc: number;
  sound_peak_adc: number;
  sound_rms_adc: number;
  sound_event: boolean;
  heart_rate_bpm?: number;
  hrv_rmssd_ms?: number;
  gateway_id?: string;
  battery_v?: number;
  source?: string;
}

// ============================================================
// Heart Rate Monitor Types (Polar H10 via Web Bluetooth)
// ============================================================

export interface HeartRateData {
  bpm: number;
  rr_intervals_ms: number[];
  contact_detected: boolean;
  energy_expended_kj?: number;
  timestamp: string;
}

export interface HrvData {
  rmssd_ms: number;  // Root Mean Square of Successive Differences
  sdnn_ms: number;   // Standard Deviation of NN intervals
  timestamp: string;
}

export interface GatewayIngestPayload {
  gateway_id: string;
  sent_at: string;
  sequence: number;
  readings: EnvironmentalReading[];
}

// ============================================================
// Device Types
// ============================================================

export type DeviceStatus = "online" | "offline" | "error";

export interface DeviceInfo {
  device_id: string;
  name: string;
  location: string;
  last_seen: string;
  status: DeviceStatus;
  firmware_version?: string;
  battery_v?: number;
}

// ============================================================
// Environment Types
// ============================================================

export type EnvironmentMode = "sleep" | "office" | "sport" | "outdoor";

export interface ThresholdRange {
  good: [number, number]; // [min, max] — values in this range are "good"
  moderate: [number, number];
  // anything outside both ranges is "poor"
}

export interface EnvironmentPreset {
  id: EnvironmentMode;
  name: string;
  description: string;
  icon: string; // icon identifier
  thresholds: Record<string, ThresholdRange>;
}

// ============================================================
// Auth / User Types
// ============================================================

export type UserRole = "admin" | "operator" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ============================================================
// Stats / Aggregation Types
// ============================================================

export interface SensorStats {
  device_id: string;
  from: string;
  to: string;
  metrics: {
    co2_ppm: MetricSummary;
    temperature_c: MetricSummary;
    humidity_pct: MetricSummary;
    pressure_hpa: MetricSummary;
    light_lux: MetricSummary;
    sound_level_adc: MetricSummary;
  };
}

export interface MetricSummary {
  min: number;
  max: number;
  avg: number;
  current: number;
}

// ============================================================
// API Response Wrappers
// ============================================================

export interface ApiError {
  error: string;
  details?: string;
}

// ============================================================
// Raw Sensor Frames (HW-level, for reference)
// ============================================================

export interface Bh1750RawFrame {
  bus: "i2c";
  address: "0x23" | "0x5C";
  mode:
    | "continuous_high_resolution"
    | "continuous_high_resolution_2"
    | "continuous_low_resolution"
    | "one_time_high_resolution"
    | "one_time_high_resolution_2"
    | "one_time_low_resolution";
  raw_bytes: [number, number];
  raw_value: number;
  lux_formula: string;
  lux_estimate: number;
}

export interface Bme280RawFrame {
  bus: "i2c" | "spi";
  address: "0x76" | "0x77";
  register_range: "0xF7-0xFE";
  raw_bytes: [number, number, number, number, number, number, number, number];
  raw_adc: {
    pressure: number;
    temperature: number;
    humidity: number;
  };
  note: string;
}

export interface MhZ19RawFrame {
  bus: "uart";
  baud: 9600;
  command_hex: string;
  response_hex: string;
  co2_ppm: number;
}

export interface Max9814RawFrame {
  bus: "adc";
  adc_pin: string;
  sample_rate_hz: number;
  samples: number[];
  note: string;
}

export interface RawSensorPayload {
  captured_at: string;
  device_id: string;
  frames: {
    bh1750: Bh1750RawFrame;
    bme280: Bme280RawFrame;
    mh_z19: MhZ19RawFrame;
    max9814: Max9814RawFrame;
  };
}
