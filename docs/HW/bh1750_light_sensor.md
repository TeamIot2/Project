# BH1750 Light Sensor

## What it is

`BH1750` is a digital ambient light sensor. In this project it is suitable for room illumination, day/night detection, basic occupancy context, or environmental trend logging.

The module sold by LaskaKit exposes the sensor over `I2C`.

## Verified key facts

- Sensor role: ambient light / illuminance
- Output: digital, `I2C`
- Product page category: light sensor
- Sensor result width: `16-bit` digital output
- Wide measurement range: `1 - 65535 lx`
- Adjustable result window: minimum about `0.11 lx`, maximum about `100000 lx` with measurement-time adjustment
- Two selectable `I2C` slave addresses
- Built-in `50 Hz / 60 Hz` light-noise rejection
- Module typical supply on vendor page: `2.4 V - 3.6 V`
- Vendor page mentions typ. sensor current around `120 uA` at `100 lx`
- Vendor page mentions max. about `1 uA` in power-down mode

## Why it is interesting for the project

- Very easy integration with ESP32
- Much simpler than camera-based light estimation
- Enough for trend and threshold logic
- Low power budget compared with Wi-Fi traffic or CO2 sensing

## What to watch during the project

- It measures illuminance, not color temperature or spectrum.
- Placement matters a lot. Near a display, LED strip, or direct sunlight, readings can become misleading for "room state".
- Housing and diffuser material can shift the result.
- Fast sampling is usually unnecessary. For most dashboard use, `1-10 s` cadence is enough.

## Practical use in your MVP

- Trigger "dark / normal / bright" states
- Correlate occupancy or user activity with light level
- Detect sudden lighting changes
- Build alerting logic for "lights left on"

## ESP32 integration notes

- Use `3.3V` power and the ESP32 `I2C` bus
- Reserve address planning if you place `BME280` on the same bus
- Add software smoothing if you show the value in UI charts

## Practical limits

- Not suitable as a calibrated laboratory lux meter without extra calibration
- Outdoor direct-sun scenarios can need careful positioning and shielding
- If you want absolute building-lighting compliance numbers, validate against a reference meter

## Inference for project use

- For an MVP dashboard, `BH1750` is best treated as a high-signal contextual sensor, not as a compliance-grade measurement instrument.
- It is a good "cheap win" sensor because the hardware and firmware cost are low but the UI value is high.

## Sources

- LaskaKit product page: https://www.laskakit.cz/laskakit-bh1750-snimac-intenzity-osvetleni/
- BH1750 datasheet mirrored by vendor: https://www.laskakit.cz/user/related_files/bh1750fvi-e-186247.pdf
