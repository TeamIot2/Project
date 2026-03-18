# Mock Payloads

This document describes two useful mock layers for the project:

- `raw device output` for firmware, gateway parser, and low-level integration tests
- `normalized payloads` for backend, frontend, and end-to-end tests

The current backend already accepts a minimal reading with:

```json
{
  "device_id": "esp32-001",
  "co2_ppm": 823,
  "temperature_c": 23.5,
  "timestamp": "2026-03-17T18:45:00.000Z"
}
```

For the full hardware set, the more useful normalized shape is the extended `EnvironmentalReading` in [types.ts](/d:/WORK/WORKSPACES/ProjectIoT_Workspace/PROJECT/shared/types.ts).

## Device output forms

### BH1750

- Interface: `I2C`
- Typical address: `0x23` or `0x5C`
- Output shape: `2 bytes`
- Meaning:
  - first byte = high byte of illuminance result
  - second byte = low byte of illuminance result
- Lux conversion: approximately `raw / 1.2`

Example raw frame:

```json
{
  "bus": "i2c",
  "address": "0x23",
  "mode": "continuous_high_resolution",
  "raw_bytes": [0, 225],
  "raw_value": 225,
  "lux_formula": "raw / 1.2",
  "lux_estimate": 187.5
}
```

### BME280

- Interface: `I2C` or `SPI`
- Typical addresses on `I2C`: `0x76`, `0x77`
- Output shape: burst read of registers `0xF7-0xFE`
- Returned bytes:
  - `press_msb`, `press_lsb`, `press_xlsb`
  - `temp_msb`, `temp_lsb`, `temp_xlsb`
  - `hum_msb`, `hum_lsb`
- Important:
  - these are raw ADC values
  - they must be compensated using sensor calibration registers

Example raw frame:

```json
{
  "bus": "i2c",
  "address": "0x77",
  "register_range": "0xF7-0xFE",
  "raw_bytes": [100, 90, 192, 126, 237, 0, 95, 144],
  "raw_adc": {
    "pressure": 410028,
    "temperature": 519888,
    "humidity": 24464
  },
  "note": "Compensation requires calibration registers from the sensor."
}
```

### MH-Z19

- Interface: `UART` or `PWM`
- Most practical for this project: `UART`
- UART line settings: `9600 8N1`
- Typical request frame:
  - `FF 01 86 00 00 00 00 00 79`
- Typical response frame:
  - `FF 86 HIGH LOW ... CHECKSUM`
- CO2 formula:
  - `co2_ppm = HIGH * 256 + LOW`

Example raw frame:

```json
{
  "bus": "uart",
  "baud": 9600,
  "command_hex": "FF 01 86 00 00 00 00 00 79",
  "response_hex": "FF 86 03 37 00 00 00 00 40",
  "co2_ppm": 823
}
```

### MAX9814

- Interface from module perspective: `analog`
- MCU-visible form: `ADC samples`
- There is no sensor-defined byte frame like with `I2C` or `UART`
- Best practice for cloud upload:
  - do not upload raw waveform by default
  - derive sound metrics such as `level`, `peak`, `rms`, or `event_detected`

Example raw sampling payload:

```json
{
  "bus": "adc",
  "adc_pin": "GPIO34",
  "sample_rate_hz": 4000,
  "samples": [2048, 2082, 2121, 2180, 2254, 2310, 2194, 2102, 2056, 2029, 2041, 2077],
  "note": "Example centered ADC waveform for envelope or RMS processing."
}
```

## Recommended normalized payload

This is the best default payload shape for gateway-to-cloud communication in this project:

```json
{
  "device_id": "esp32-node-01",
  "gateway_id": "node-red-gw-01",
  "timestamp": "2026-03-17T18:45:00.000Z",
  "co2_ppm": 823,
  "temperature_c": 23.5,
  "humidity_pct": 41.2,
  "pressure_hpa": 1009.8,
  "light_lux": 187.5,
  "sound_level_adc": 2140,
  "sound_peak_adc": 2784,
  "sound_rms_adc": 1986,
  "sound_event": false,
  "battery_v": 4.02,
  "source": "mock-generator-v1"
}
```

## Recommended gateway batch payload

The gateway should usually send batches, not single samples:

```json
{
  "gateway_id": "node-red-gw-01",
  "sent_at": "2026-03-17T18:50:00.000Z",
  "sequence": 17,
  "readings": []
}
```

Batching is better for:

- lower HTTP overhead
- easier retries
- simpler local buffering in Node-RED
- better alignment with downsampling and delayed upload

## Files generated for this project

Generated mock samples are stored in:

- [minimal-reading.json](/d:/WORK/WORKSPACES/ProjectIoT_Workspace/PROJECT/docs/api/mocks/minimal-reading.json)
- [environmental-reading.json](/d:/WORK/WORKSPACES/ProjectIoT_Workspace/PROJECT/docs/api/mocks/environmental-reading.json)
- [gateway-batch.json](/d:/WORK/WORKSPACES/ProjectIoT_Workspace/PROJECT/docs/api/mocks/gateway-batch.json)
- [raw-device-payload.json](/d:/WORK/WORKSPACES/ProjectIoT_Workspace/PROJECT/docs/api/mocks/raw-device-payload.json)
- [environmental-timeseries.json](/d:/WORK/WORKSPACES/ProjectIoT_Workspace/PROJECT/docs/api/mocks/environmental-timeseries.json)

## Generator

The generator script is:

- [generateMockPayloads.ts](/d:/WORK/WORKSPACES/ProjectIoT_Workspace/PROJECT/backend/scripts/generateMockPayloads.ts)

Run it from `PROJECT/backend` with:

```bash
npm run mock:generate
```

## Sources

- BH1750 datasheet: https://www.laskakit.cz/user/related_files/bh1750fvi-e-186247.pdf
- BME280 datasheet: https://www.laskakit.cz/user/related_files/bst-bme280.pdf
- MH-Z19 manual: https://www.hadex.cz/files/documments/product/m363-1745923989-K2AT.pdf
- MAX9814 product page: https://www.analog.com/en/products/max9814.html
- CMA-4544PF-W datasheet: https://www.sameskydevices.com/product/resource/cma-4544pf-w.pdf
