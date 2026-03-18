# Polar H10+ Heart Rate Monitor — Technical Specification

## Hardware

| Parameter | Value |
|---|---|
| Sensor type | ECG (single-lead) |
| Connector dimensions | 34 x 65 x 10 mm |
| Total weight | ~60 g (connector 21 g + strap 39 g) |
| Battery | CR2025 coin cell |
| Battery life | ~400 hours |
| Water resistance | WR30 (3 ATM) |
| Operating temp | -10 °C to +50 °C |
| Internal memory | 1 training session |
| Strap sizes | XS-S (51-66 cm), M-XXL (65-93 cm) |

## Connectivity

| Protocol | Details |
|---|---|
| Bluetooth Low Energy (BLE) | Dual simultaneous connections |
| ANT+ | Standard heart rate profile |
| 5 kHz (GymLink) | Analog; works underwater |

## BLE Heart Rate Service

| Item | UUID |
|---|---|
| Service | `0x180D` |
| HR Measurement Characteristic | `0x2A37` (Notify) |
| Body Sensor Location | `0x2A38` (Read) |

### HR Measurement Byte Format

```
Byte 0: Flags (uint8)
  Bit 0:   HR format       0 = uint8, 1 = uint16
  Bit 1-2: Contact status  0b11 = contact detected
  Bit 3:   Energy Expended 1 = present (uint16, kJ)
  Bit 4:   RR-Interval     1 = one or more RR values present

[Flags: 1B] [HR: 1-2B] [Energy: 0 or 2B] [RR0: 2B] [RR1: 2B] ...
```

RR-Interval resolution: **1/1024 seconds**. Convert: `RR_ms = raw / 1024 * 1000`

## HRV Calculation

### RMSSD (Root Mean Square of Successive Differences)

Short-term HRV metric, reflects parasympathetic (vagal) activity.

```
RMSSD = sqrt( (1/(N-1)) * SUM( (RR[i+1] - RR[i])^2 ) )
```

### SDNN (Standard Deviation of NN Intervals)

Overall HRV metric. Depends on recording duration (5-min standard).

```
SDNN = sqrt( (1/(N-1)) * SUM( (RR[i] - RR_mean)^2 ) )
```

## Typical Value Ranges

### Heart Rate

| Context | Range (bpm) |
|---|---|
| Sleep | 40–60 |
| Resting | 60–100 |
| Office/sedentary | 60–80 |
| Light exercise | 100–130 |
| Moderate exercise | 130–160 |
| Vigorous exercise | 160–185 |

### RMSSD (5-minute)

| Population | Range (ms) |
|---|---|
| Healthy adults | 20–75 |
| Young athletes | 50–200+ |
| During exercise | 5–20 |
| Chronic stress | < 20 |

## Environment Thresholds

| Environment | Expected HR | Expected RMSSD |
|---|---|---|
| Sleep | 40–60 bpm | 40–100+ ms |
| Office | 60–85 bpm | 20–60 ms |
| Sport (intense) | 140–190 bpm | 3–15 ms |
| Outdoor (walking) | 80–120 bpm | 15–40 ms |

## Web Bluetooth Compatibility

| Browser | Support |
|---|---|
| Chrome (desktop + Android) | 56+ |
| Edge (Chromium) | 79+ |
| Samsung Internet | Android |
| Firefox | Not supported |
| Safari / iOS | Not supported |

**Limitation:** iOS users need a native app wrapper (Capacitor BLE plugin).

## Integration in PLACEHOLDERname

- Connected via Web Bluetooth API in the browser
- Standard Heart Rate Service (`0x180D`), no proprietary SDK needed
- Two metrics displayed: **Heart Rate (BPM)** and **HRV RMSSD (ms)**
- RMSSD calculated from rolling buffer of 30 R-R intervals
- Optional — shows connect button when no device paired

## Sources

- [Polar H10 Product Page](https://www.polar.com/us-en/sensors/h10-heart-rate-sensor/)
- [Polar BLE SDK](https://github.com/polarofficial/polar-ble-sdk)
- [Bluetooth HR Service Spec](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/HRS_v1.0/out/en/index-en.html)
- [HRV Normal Ranges — Kubios](https://www.kubios.com/blog/heart-rate-variability-normal-range/)
- [Web Bluetooth — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
