# HW Documentation Set

This folder contains practical hardware notes for the devices visible in `EXTERNAL/HW/image.png` and `EXTERNAL/HW/image copy.png`.

Sources were checked on `2026-03-17`.

## Files

- [bh1750_light_sensor.md](./bh1750_light_sensor.md) - ambient light sensor
- [bme280_env_sensor.md](./bme280_env_sensor.md) - temperature, humidity, pressure sensor
- [max9814_mic_module.md](./max9814_mic_module.md) - microphone module with analog output
- [mh_z19_co2_sensor.md](./mh_z19_co2_sensor.md) - CO2 sensor
- [lolin32_esp32_board.md](./lolin32_esp32_board.md) - ESP32 development board
- [dupont_mf_wires.md](./dupont_mf_wires.md) - Dupont jumper wires
- [half_proto_breadboard.md](./half_proto_breadboard.md) - prototyping breadboard

## Fast integration map

- `LoLin32 ESP32` is the controller and network endpoint.
- `BH1750` and `BME280` are the easiest sensors to attach over `I2C`.
- `MH-Z19` should be treated as a separate `5V` sensor with `UART` or `PWM` output.
- `MAX9814` gives an `analog` audio envelope/signal and needs careful `ADC` handling on the ESP32.
- `Dupont` wires and the `breadboard` are fine for lab prototyping, but not for the final field version.

## Project-level recommendations

- Prefer `3.3V` logic across the ESP32, `BH1750`, `BME280`, and the `MAX9814` analog path.
- Keep `MH-Z19` power separate and stable. It has higher current demand than the small I2C sensors.
- Use the breadboard only for MVP assembly and validation. For the final deliverable, expect contact instability if the setup is moved or vibrates.
- Confirm the exact delivered board revision of the `LoLin32` before fixing pinout assumptions. The official `WEMOS D32` docs are a strong near-match, but some retail boards differ in USB-UART bridge or silkscreen.

## Source policy

- Product/vendor pages are used for module-level details, pinout context, and what is actually being sold.
- Manufacturer datasheets/manuals are used for electrical and sensing parameters where available.
- Sections explicitly marked as `Inference` are engineering conclusions derived from the source specs and practical integration constraints.
