# BME280 Environmental Sensor

## What it is

`BME280` is a combined digital sensor for `temperature`, `relative humidity`, and `barometric pressure`.

For an IoT MVP it is one of the highest-value sensors in the set because one module gives you three environmental variables on one `I2C` bus.

## Verified key facts

- Sensor role: temperature, humidity, pressure
- Output: digital, `I2C`
- Chip supply range from datasheet: `1.71 V to 3.6 V`
- Vendor page module supply: `1.8 V to 3.6 V`, typically `3.3 V`
- Interfaces from Bosch datasheet: `I2C` and `SPI`
- Vendor page address options: `0x76` and `0x77`, default `0x77`
- Operating ranges:
  - Temperature: `-40 C to +85 C`
  - Humidity: `0 to 100 %RH`
  - Pressure: `300 to 1100 hPa`
- Vendor page resolution:
  - Temperature: `0.01 C`
  - Humidity: `0.008 %`
  - Pressure: `0.18 Pa`
- Datasheet / vendor accuracy references:
  - Humidity tolerance about `+/-3 %RH`
  - Pressure accuracy about `+/-1 hPa`
- Bosch current consumption reference:
  - `1.8 uA @ 1 Hz` humidity + temperature
  - `2.8 uA @ 1 Hz` pressure + temperature
  - `3.6 uA @ 1 Hz` humidity + pressure + temperature
  - `0.1 uA` in sleep mode

## Why it is interesting for the project

- Three useful variables on a single module
- Very low power
- Strong ecosystem support
- Good fit for weather, room monitoring, HVAC, storage, or machine-environment context

## What to watch during the project

- Humidity sensors dislike condensation and liquid water.
- Temperature can be biased by board self-heating if Wi-Fi bursts happen too close to the sensor.
- Pressure is good for weather and trend analysis, but indoor altitude calculations are still sensitive to drift and calibration assumptions.
- If the board is inside a closed case, airflow and enclosure design will dominate reading quality.

## Practical use in your MVP

- Basic environment dashboard
- Correlation between humidity and CO2 trends
- Weather-station-style logging
- Alerting on temperature or humidity thresholds
- Pressure trend charting for contextual analytics

## ESP32 integration notes

- Put `BME280` and `BH1750` on the same `I2C` bus if you want to save pins
- Check address collision early
- Sample slower than audio or CO2; `2-10 s` is usually enough for a dashboard
- Add offset calibration if the module lives close to a regulator or Wi-Fi antenna

## Practical limits

- It is excellent for MVP sensing, but not a replacement for a certified industrial transmitter
- Humidity numbers are only as good as placement and airflow
- In sealed or hot enclosures the reported temperature can diverge from room temperature

## Inference for project use

- This is probably the best "always-on" baseline sensor in the whole hardware set.
- If you have to cut scope, keep `BME280` and `MH-Z19`; they provide the strongest story for indoor environment monitoring.

## Sources

- LaskaKit product page: https://www.laskakit.cz/arduino-senzor-tlaku--teploty-a-vlhkosti-bme280/
- Bosch Sensortec BME280 product page: https://www.bosch-sensortec.com/en/products/environmental-sensors/humidity-sensors-bme280
- Bosch datasheet mirrored by vendor: https://www.laskakit.cz/user/related_files/bst-bme280.pdf
