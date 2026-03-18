# MAX9814 Microphone Module

## What it is

This module combines the `MAX9814` microphone amplifier with automatic gain control and the `CMA-4544PF-W` electret microphone capsule.

Unlike the I2C sensors, this module gives an `analog` output. It is useful when you want to detect sound level, spikes, or acoustic activity.

## Verified key facts

- Module role: sound sensing
- Module output: `analog`
- Vendor page supply: `2.7 V - 5.5 V`
- Vendor page current: about `3 mA`
- Vendor page module size: `26 x 14 x 8 mm`
- `MAX9814` is a low-noise microphone amplifier with `automatic gain control`
- Official MAX9814 documentation describes selectable gain options `40 dB`, `50 dB`, and `60 dB`
- `CMA-4544PF-W` microphone capsule facts from Same Sky datasheet:
  - Directivity: `omnidirectional`
  - Sensitivity: typ. `-44 dB`
  - Frequency range: `20 Hz to 20,000 Hz`
  - Operating voltage: `3 V to 10 Vdc`
  - Output impedance: `2.2 kohm`
  - Current consumption: about `0.5 mA`
  - Signal-to-noise ratio: `60 dBA`

## Why it is interesting for the project

- Lets you detect "something happened" events without full digital audio processing
- Useful for machine-noise trend, tamper detection, clap/noise threshold, or "too loud" alerts
- Good demo value in dashboards because sound events are intuitive

## What to watch during the project

- This is not a calibrated sound level meter.
- Analog microphone output is noisy by nature. Power cleanliness and grounding matter.
- The ESP32 ADC is usable, but not a precision audio ADC.
- If you sample too slowly, you will miss peaks. If you sample too fast and stream raw data, you will waste bandwidth and CPU.

## Practical use in your MVP

- Detect sudden noise events
- Estimate relative loudness
- Trigger tamper or activity alerts
- Build rolling min/max/average sound metrics at the gateway or device layer

## ESP32 integration notes

- Feed the module output to an `ADC` pin
- Expect to do baseline subtraction and smoothing in software
- Use short analog wiring
- Keep the analog path away from Wi-Fi antenna and noisy power lines
- For cloud telemetry, send derived features, not raw high-rate audio, unless you have a strong reason

## Practical limits

- Automatic gain control is good for general activity detection, but it can hide true absolute amplitude changes
- Not suitable for compliance-grade dB measurement without calibration and a different analog chain
- Strong airflow, vibration, and enclosure resonance can distort readings

## Inference for project use

- If the project goal is "event detection", this module is useful.
- If the project goal is "precise acoustic measurement", it is the wrong sensor class.
- The best compromise is to compute windowed sound metrics locally and upload only aggregates or event counts.

## Sources

- LaskaKit product page: https://www.laskakit.cz/max9814-cma-4544pf-w-modul-mikrofonu-s-zesilovacem-max9814/
- Same Sky microphone capsule datasheet: https://www.sameskydevices.com/product/resource/cma-4544pf-w.pdf
- Analog Devices MAX9814 product page: https://www.analog.com/en/products/max9814.html
