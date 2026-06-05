// Frontend type definitions for IoT Environmental Monitoring

export type DeviceStatus = "online" | "offline" | "error";
export type EnvironmentMode = "sleep" | "office" | "sport" | "outdoor" | "school" | "factory" | "greenhouse";
export type UserRole = "admin" | "operator" | "viewer";

export interface EnvironmentalReading {
  device_id: string;
  co2_ppm: number;
  temperature_c: number;
  humidity_pct: number;
  pressure_hpa: number;
  light_lux: number;
  sound_level_adc: number;
  sound_peak_adc: number;
  sound_rms_adc: number;
  sound_event: boolean;
  timestamp: string;
  gateway_id?: string;
  battery_v?: number;
  source?: string;
  heart_rate_bpm?: number;
  hrv_rmssd_ms?: number;
}

export interface DeviceInfo {
  device_id: string;
  name: string;
  location: string;
  last_seen: string;
  status: DeviceStatus;
  firmware_version?: string;
  battery_v?: number;
  monitoring_enabled?: boolean;
  monitoring_command_seq?: number;
  monitoring_updated_at?: string;
  measurement_started_at?: string;
}

export interface DeviceMeasurementUptime {
  device_id: string;
  measuring: boolean;
  started_at: string | null;
  latest_at: string | null;
  uptime_seconds: number;
  sample_count: number;
}

export interface MeasurementUptimeResponse {
  device_ids: string[];
  measuring: boolean;
  started_at: string | null;
  latest_at: string | null;
  uptime_seconds: number;
  devices: DeviceMeasurementUptime[];
}

export interface ModeMeasurementStatsResponse {
  mode: string;
  device_ids: string[];
  from: string | null;
  to: string | null;
  uptime_seconds: number;
  interval_seconds: number;
  reliability_pct: number;
  stored_samples: number;
  expected_samples: number;
  segments: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  timezone?: string;
}

export interface ThresholdRange {
  good: [number, number];
  moderate: [number, number];
}

export interface EnvironmentPreset {
  id: EnvironmentMode;
  name: string;
  description: string;
  icon: string;
  thresholds: Record<string, ThresholdRange>;
}

export interface SensorStats {
  device_id: string;
  from: string;
  to: string;
  metrics: Record<string, { min: number; max: number; avg: number; current: number }>;
}

export interface MetricConfig {
  key: string;
  label: string;
  unit: string;
  color: string;
  icon: string;
  decimals: number;
  chartDomain?: [number, number];
}
