# MH-Z19 CO2 Sensor

## What it is

`MH-Z19` is an `NDIR` CO2 sensor module intended for indoor carbon-dioxide measurement.

In your hardware set it is the most directly useful sensor for air-quality or indoor-environment use cases.

## Verified key facts

- Sensor role: `CO2`
- Technology: `NDIR` infrared gas sensing
- Working voltage from manual: `3.6 V - 5.5 V DC`
- Average current from manual: `< 18 mA`
- Interface level from manual: `3.3 V`
- Output options from manual: `UART` and `PWM`
- Measuring range in manual: `0 - 5000 ppm`
- Accuracy table in manual: about `+/- (50 ppm + 5% of reading)`
- Preheat time: `3 min`
- Response time: `T90 < 60 s`
- Working temperature: `0 C to 50 C`
- Working humidity: `0 to 95 %RH`, no condensation
- Module size: `33 x 20 x 9 mm`
- Weight: `21 g`
- Lifespan in manual: `> 5 years`
- The manual states a built-in temperature sensor for compensation

## Why it is interesting for the project

- CO2 is highly understandable to users
- Gives a strong "real-world problem" narrative for an IoT semester project
- Easy to justify in dashboards and alerts
- Much better indoor-air-quality signal than trying to infer occupancy from temperature alone

## What to watch during the project

- Warm-up matters. Do not trust values immediately after power-on.
- CO2 sensors are slower than button or light signals, so UI expectations must match physics.
- Stable power is important.
- Placement matters: avoid exhaust streams, windows, direct breathing line, and enclosed dead-air pockets.
- `MH-Z19` vs `MH-Z19B` variants exist in the market. Confirm the exact unit you physically have before final firmware tuning.

## Practical use in your MVP

- Indoor air-quality dashboard
- Ventilation recommendation logic
- Occupancy approximation
- Threshold alerts like `>1000 ppm` or `>1500 ppm`
- Correlating CO2 with temperature/humidity over time

## ESP32 integration notes

- Treat this as a `5V`-class module with `3.3V` logic-level output
- Prefer `UART` unless you have a specific reason to use `PWM`
- Do not sample aggressively; the sensor response is inherently slow
- Add startup state in firmware: `warming_up`, then `active`

## Practical limits

- Not a substitute for a certified HVAC-grade transmitter
- Needs stable airflow assumptions and sensible placement
- If your enclosure traps heat or stale air, readings will be less representative of the room

## Inference for project use

- This is the strongest single sensing module in the set if the project story is indoor environment, classroom air, office ventilation, or occupancy context.
- Pairing `MH-Z19` with `BME280` gives the best dashboard narrative with minimal extra complexity.

## Sources

- Hadex product page: https://www.hadex.cz/p/m363-detektor-oxidu-uhliciteho-modul-mh-z19
- Manual mirrored by vendor: https://www.hadex.cz/files/documments/product/m363-1745923989-K2AT.pdf
