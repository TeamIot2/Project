# Estimating Decibels From MAX9814 ADC Noise Values

This document describes how Team2App should convert raw MAX9814 microphone ADC values into an estimated noise level in decibels. The original ADC values must remain available. Decibel values must be treated and displayed as an estimate unless the sensor is calibrated against a reliable sound level meter.

Note about terminology: if older notes say `ANC`, treat that as the raw microphone ADC values used by this project.

## Goals

- Keep the raw fields `sound_level_adc`, `sound_peak_adc`, and `sound_rms_adc`.
- Add an estimated field, for example `estimated_noise_db`.
- Make it clear in the UI that this is an estimate, not a calibrated sound measurement.
- Support a future calibration method based on a reference measurement.

## Hardware Context

- Microphone module: MAX9814 with automatic gain control.
- ESP32 analog input: currently `GPIO34`.
- ADC resolution: 12 bit, value range `0..4095`.
- Current firmware uses `ADC_11db` attenuation.

Relevant firmware file:

`U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\firmware\esp32_sensor_smoke_test\esp32_sensor_smoke_test.ino`

Current firmware JSON fields:

```json
{
  "sound_level_adc": 1399,
  "sound_peak_adc": 2368,
  "sound_rms_adc": 1438,
  "sound_event": true
}
```

## Meaning of the Existing Fields

`sound_level_adc`

Average value of all ADC samples in one measurement window. The MAX9814 output is biased around a DC midpoint, so this value does not directly represent loudness. It is mainly the signal center value.

`sound_peak_adc`

The highest ADC value found in the sample window. This is useful for short transient detection, but it is not a stable basis for estimating normal loudness in dB.

`sound_rms_adc`

The current firmware computes RMS from raw ADC samples:

```text
sound_rms_adc = sqrt(mean(sample_adc^2))
```

Because this RMS value includes the DC component, the AC audio component must be estimated before converting the value to decibels.

## Why Exact dB Is Not Possible Without Calibration

The MAX9814 includes automatic gain control. When the input sound level changes, the module can change its gain. That makes the conversion from output voltage to acoustic pressure approximate.

Additional sources of error:

- the actual gain setting of the specific module may not be confirmed,
- the ESP32 ADC is not perfectly linear,
- supply voltage and ADC voltage range may not be exactly 3.3 V,
- the microphone sensitivity has tolerance,
- sensor placement and sound direction strongly affect the result.

For these reasons, use the wording `estimated dB`, not `measured dB`, until calibration is completed.

## Reference Constants

MAX9814:

- the datasheet describes automatic gain control,
- selectable gain is typically `40 dB`, `50 dB`, or `60 dB`.

Source: Analog Devices MAX9814 datasheet  
https://www.analog.com/media/en/technical-documentation/data-sheets/MAX9814.pdf

Microphone commonly used on MAX9814 breakout modules:

- typical electret microphone type: CMA-4544PF-W,
- sensitivity is approximately `-44 dB re 1 V/Pa`.

Source: Same Sky / CUI Devices CMA-4544PF-W datasheet  
https://www.sameskydevices.com/product/resource/cma-4544pf-w.pdf

SPL decibels:

- `0 dB SPL` corresponds to a sound pressure of `20 uPa`,
- conversion formula: `dB SPL = 20 * log10(p / 20e-6)`.

Source: AIHA Sound Pressure Level calculator  
https://www.aiha.org/ih-calculator-app/calcs/sound-pressue-level.html

## Uncalibrated Conversion Method

Use this method as the default estimate until a calibration point exists.

### Input Values

From one JSON measurement:

```text
avg_adc = sound_level_adc
peak_adc = sound_peak_adc
rms_adc = sound_rms_adc
```

The dB estimate mainly uses `avg_adc` and `rms_adc`.

### Step 1: Remove the DC Component

Because `sound_rms_adc` contains the DC center value, estimate the RMS of the AC audio component:

```text
ac_rms_adc = sqrt(max(0, rms_adc^2 - avg_adc^2))
```

If the result is `0`, the signal is too small or invalid for this conversion.

### Step 2: Convert ADC to Module Output Voltage

Simplified conversion:

```text
adc_full_scale = 4095
adc_reference_v = 3.3

v_rms = ac_rms_adc / adc_full_scale * adc_reference_v
```

Warning: ESP32 with `ADC_11db` may have a practical input range that differs from exactly 3.3 V. For an application-level estimate, `3.3 V` is a reasonable starting constant. If the actual ADC range is measured later, update this constant.

### Step 3: Convert Microphone Sensitivity

Sensitivity `-44 dB re 1 V/Pa` means:

```text
mic_sensitivity_v_per_pa = 10 ^ (-44 / 20)
mic_sensitivity_v_per_pa ~= 0.00631 V/Pa
```

### Step 4: Convert MAX9814 Gain

If the gain pin wiring is not confirmed, use `60 dB` as the initial project estimate:

```text
max9814_gain_db = 60
max9814_gain_linear = 10 ^ (max9814_gain_db / 20)
max9814_gain_linear = 1000
```

Important: if the module is actually running at `50 dB`, the estimate can be about `+10 dB` higher than the result calculated with a `60 dB` assumption. If it runs at `40 dB`, the estimate can be about `+20 dB` higher.

### Step 5: Convert Output Voltage to Acoustic Pressure

```text
pressure_pa = v_rms / (mic_sensitivity_v_per_pa * max9814_gain_linear)
```

### Step 6: Convert Acoustic Pressure to dB SPL

```text
reference_pressure_pa = 20e-6
estimated_noise_db = 20 * log10(pressure_pa / reference_pressure_pa)
```

Round the final value to whole dB.

## Recommended Application Algorithm

```ts
type NoiseEstimateInput = {
  sound_level_adc: number;
  sound_rms_adc: number;
  adc_reference_v?: number;
  max9814_gain_db?: number;
};

type NoiseEstimateResult = {
  estimated_noise_db: number | null;
  ac_rms_adc: number;
  method: "uncalibrated_max9814_estimate";
  calibrated: false;
};

export function estimateNoiseDb(input: NoiseEstimateInput): NoiseEstimateResult {
  const avgAdc = input.sound_level_adc;
  const rmsAdc = input.sound_rms_adc;
  const adcReferenceV = input.adc_reference_v ?? 3.3;
  const gainDb = input.max9814_gain_db ?? 60;

  const acRmsAdcSquared = Math.max(0, rmsAdc * rmsAdc - avgAdc * avgAdc);
  const acRmsAdc = Math.sqrt(acRmsAdcSquared);

  if (!Number.isFinite(acRmsAdc) || acRmsAdc <= 0) {
    return {
      estimated_noise_db: null,
      ac_rms_adc: 0,
      method: "uncalibrated_max9814_estimate",
      calibrated: false,
    };
  }

  const adcFullScale = 4095;
  const micSensitivityVPerPa = Math.pow(10, -44 / 20);
  const gainLinear = Math.pow(10, gainDb / 20);
  const referencePressurePa = 20e-6;

  const vRms = (acRmsAdc / adcFullScale) * adcReferenceV;
  const pressurePa = vRms / (micSensitivityVPerPa * gainLinear);

  if (!Number.isFinite(pressurePa) || pressurePa <= 0) {
    return {
      estimated_noise_db: null,
      ac_rms_adc: acRmsAdc,
      method: "uncalibrated_max9814_estimate",
      calibrated: false,
    };
  }

  const estimatedNoiseDb = 20 * Math.log10(pressurePa / referencePressurePa);

  return {
    estimated_noise_db: Math.round(estimatedNoiseDb),
    ac_rms_adc: acRmsAdc,
    method: "uncalibrated_max9814_estimate",
    calibrated: false,
  };
}
```

## Example From the Current Prototype

Recent sensor test values:

```text
sound_level_adc = 1399
sound_peak_adc = 2368
sound_rms_adc = 1438
```

### Calculation

Remove the DC component:

```text
ac_rms_adc = sqrt(1438^2 - 1399^2)
ac_rms_adc ~= 332.6
```

Convert to voltage:

```text
v_rms = 332.6 / 4095 * 3.3
v_rms ~= 0.268 V
```

Convert to pressure with the `60 dB` gain assumption:

```text
pressure_pa = 0.268 / (0.00631 * 1000)
pressure_pa ~= 0.0425 Pa
```

Convert to dB SPL:

```text
estimated_noise_db = 20 * log10(0.0425 / 0.000020)
estimated_noise_db ~= 66.5 dB SPL
```

Rounded result:

```text
estimated_noise_db = 67
```

Human-readable interpretation:

```text
normal louder room / normal conversation near the sensor
```

## Check Values From the Last Prototype Test

Assuming `60 dB` gain:

| sound_level_adc | sound_rms_adc | ac_rms_adc | estimated dB SPL |
|---:|---:|---:|---:|
| 1363 | 1368 | 116.9 | 57 |
| 1388 | 1399 | 175.1 | 61 |
| 1390 | 1437 | 364.5 | 67 |
| 1399 | 1438 | 332.6 | 67 |

Practical conclusion from this test:

```text
The current estimated noise level was around 65 dB SPL.
```

## Recommended API Output

The API and UI should keep raw values and include the estimate:

```json
{
  "sound_level_adc": 1399,
  "sound_peak_adc": 2368,
  "sound_rms_adc": 1438,
  "sound_event": true,
  "estimated_noise_db": 67,
  "estimated_noise_label": "normal louder room",
  "estimated_noise_method": "uncalibrated_max9814_estimate",
  "estimated_noise_calibrated": false
}
```

## Suggested UI Labels

Approximate thresholds:

| Estimated dB SPL | UI label |
|---:|---|
| < 30 | very quiet environment |
| 30-45 | quiet environment |
| 45-60 | normal room |
| 60-70 | normal louder room |
| 70-85 | noisy environment |
| > 85 | very noisy environment |

Preferred UI wording:

```text
Estimated noise level: 67 dB
```

Avoid:

```text
Measured noise level: 67 dB
```

## Better Method: Calibration With a Reference Point

For practical application behavior, a calibration point is better than the absolute estimate based on microphone sensitivity and module gain.

Procedure:

1. Place the sensor where it will normally operate.
2. Use stable ambient noise or a stable test sound.
3. Measure the reference dB value near the sensor. For a school prototype, a phone app may be acceptable. For accurate measurement, use a real sound level meter or calibrator.
4. Store `ac_rms_adc` from the sensor at the same time.
5. Save a configuration object:

```json
{
  "reference_db": 65,
  "reference_ac_rms_adc": 332.6
}
```

Then calculate:

```text
estimated_noise_db = reference_db + 20 * log10(current_ac_rms_adc / reference_ac_rms_adc)
```

This method is more useful for this project because it avoids the unknown real module gain and reduces the impact of ESP32 ADC inaccuracies.

## Recommended Calibrated Algorithm

```ts
type CalibratedNoiseInput = {
  sound_level_adc: number;
  sound_rms_adc: number;
  reference_db: number;
  reference_ac_rms_adc: number;
};

export function estimateCalibratedNoiseDb(input: CalibratedNoiseInput): number | null {
  const acRmsAdc = Math.sqrt(
    Math.max(0, input.sound_rms_adc * input.sound_rms_adc - input.sound_level_adc * input.sound_level_adc),
  );

  if (acRmsAdc <= 0 || input.reference_ac_rms_adc <= 0) {
    return null;
  }

  return Math.round(input.reference_db + 20 * Math.log10(acRmsAdc / input.reference_ac_rms_adc));
}
```

## Implementation Notes

- Firmware can keep sending the original ADC fields.
- dB conversion can happen in the backend or frontend.
- If the estimate is stored with historical records, prefer doing the calculation in the backend and storing the method.
- If the estimate is only for dashboard display, frontend calculation is acceptable.
- Store both `estimated_noise_db` and `estimated_noise_method` if the value is persisted.
- After calibration, set `estimated_noise_calibrated` to `true`.

## Minimum Validation Rules

The agent or application should check:

- `sound_rms_adc >= sound_level_adc`; otherwise return `null`,
- `sound_level_adc` and `sound_rms_adc` are in the range `0..4095`,
- `ac_rms_adc > 0`,
- values outside a reasonable range, for example `< 20 dB` or `> 120 dB`, should be marked as suspicious,
- on calculation errors, return `null` instead of inventing a dB value.

## Summary for Future AI Agents

1. Do not replace or remove the original ADC values.
2. Use `sound_level_adc` and `sound_rms_adc` to estimate noise.
3. First compute `ac_rms_adc = sqrt(rms^2 - avg^2)`.
4. If no calibration exists, use the uncalibrated MAX9814 estimate with the `60 dB` gain assumption.
5. If a calibration point exists, use the relative formula `reference_db + 20 * log10(current_ac_rms_adc / reference_ac_rms_adc)`.
6. Always label the result as an estimate unless the sensor has been calibrated against a reliable sound level meter.
