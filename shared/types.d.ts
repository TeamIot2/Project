export interface SensorReading {
    device_id: string;
    co2_ppm: number;
    temperature_c: number;
    timestamp: string;
}
export interface DeviceInfo {
    device_id: string;
    name: string;
    location: string;
    last_seen: string;
}
export interface EnvironmentalReading extends SensorReading {
    humidity_pct: number;
    pressure_hpa: number;
    light_lux: number;
    sound_level_adc: number;
    sound_peak_adc: number;
    sound_rms_adc: number;
    sound_event: boolean;
    gateway_id?: string;
    battery_v?: number;
    source?: string;
}
export interface GatewayIngestPayload {
    gateway_id: string;
    sent_at: string;
    sequence: number;
    readings: EnvironmentalReading[];
}
export interface Bh1750RawFrame {
    bus: "i2c";
    address: "0x23" | "0x5C";
    mode: "continuous_high_resolution" | "continuous_high_resolution_2" | "continuous_low_resolution" | "one_time_high_resolution" | "one_time_high_resolution_2" | "one_time_low_resolution";
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
