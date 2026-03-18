# LoLin32 ESP32 Development Board

## What it is

This is the main controller board of the project. It provides the CPU, connectivity, GPIO, ADC, DAC, and the firmware runtime for the whole sensing node.

The retail page says `LoLin32 ESP32 vyvojova deska 2.4GHz WiFi+Bluetooth`. The closest official family documentation available during lookup was `WEMOS D32`, which appears to describe the same board class. Some retail revisions can differ, so pin budget and silkscreen should be verified on the delivered board.

## Verified key facts

- Microcontroller family: `ESP32`
- Connectivity: `2.4 GHz Wi-Fi` and `Bluetooth`
- Max clock speed from retail page / official docs: `240 MHz`
- Board operating voltage: `3.3V`
- Flash listed by retail page / official docs: `4 MB`
- Retail page mentions integrated Li-Ion charging capability
- Official WEMOS D32 docs mention:
  - `Lipo 3.7V` support
  - battery connector `PH-2 2.0mm`
  - built-in LED on `GPIO5`
  - size about `57 x 25.4 mm`
  - weight about `6.1 g`
- Espressif official module family page confirms:
  - ESP32 module line supports `802.11 b/g/n Wi-Fi`
  - `Bluetooth / Bluetooth LE`
  - dual-core `240 MHz` class operation
  - multiple interface options including `UART`, `SPI`, `I2C`, touch, Hall sensor support, and ADC/DAC capabilities

## Why it is interesting for the project

- Enough compute power for a semester MVP
- Strong library support
- Native Wi-Fi is ideal for a cloud-connected node
- Can handle a mixed set of `I2C`, `UART`, and `analog` peripherals

## What to watch during the project

- ESP32 is powerful, but Wi-Fi bursts can inject noise into analog sensing.
- ADC quality is good enough for control and monitoring, but not a precision instrumentation ADC.
- Boot strapping pins and shared peripheral pins need early planning.
- If you use battery plus USB, power-path behavior and charging assumptions must be confirmed on the exact board revision.

## Practical use in your MVP

- Sensor polling and local preprocessing
- Local buffering before upload
- Wi-Fi uplink to gateway or directly to backend, depending on architecture
- Device-level threshold logic and status LEDs
- OTA or serial firmware iteration during development

## Recommended interface mapping

- `BH1750` -> `I2C`
- `BME280` -> `I2C` on the same bus as `BH1750`
- `MH-Z19` -> dedicated `UART`
- `MAX9814` -> one `ADC` pin
- optional button -> regular digital GPIO with debounce

## Practical limits

- Do not trust pin-count marketing alone; the exact usable pins depend on board routing, boot pins, and what else is attached.
- Continuous Wi-Fi plus sensitive analog capture is possible, but needs care in sampling strategy.
- This board is excellent for MVP and demos; for hardened production hardware you would usually redesign around the ESP32 module, not ship the dev board as-is.

## Inference for project use

- This board is the right center of gravity for your semester project: low friction, good ecosystem, enough interfaces, and easy cloud story.
- The one thing to lock down early is the real delivered board revision and final pin map.

## Sources

- Hadex product page: https://www.hadex.cz/p/m432d-lolin32-esp32-vyvojova-deska-2-4ghz-wifi-bluetooth-1773748474
- WEMOS D32 official documentation: https://www.wemos.cc/en/latest/d32/d32.html
- Espressif ESP32 module family page: https://www.espressif.com/en/products/modules/esp32
