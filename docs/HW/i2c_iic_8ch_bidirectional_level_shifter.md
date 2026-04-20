# I2C / IIC 8-Channel Bidirectional Level Shifter

## What it is

This is a logic level converter used to translate digital signals between devices that use different voltage levels, typically `3.3V` and `5V`.

It is a support part, not a sensor.

## Verified key facts

- Product type: bidirectional level shifter / logic level converter
- Channel count from invoice: `8`
- Intended use: `I2C` and other low-speed digital signals
- Typical job: connect a `3.3V` MCU to `5V` peripherals safely

## Why it is useful in the project

- Helps when a module expects `5V` logic but the ESP32 uses `3.3V`
- Gives a safe path for mixed-voltage prototyping
- Can reduce the risk of damaging GPIO pins

## What to watch during the project

- It does not convert power, only signal levels
- It is not for analog audio or current-heavy loads
- It only works correctly if both sides share ground
- Do not use it if the peripheral already accepts `3.3V` logic directly

## Best use in this project

- `I2C` buses with a 5V-side device
- Low-speed UART or digital control lines when voltage mismatch exists

## Bad use in this project

- Direct powering of sensors
- Analog microphone paths
- High-speed or high-current applications

## Sources

- Invoice line item: `I2C IIC Osmikanalovy, obousmerny konvertor - Modul Logic Level`
