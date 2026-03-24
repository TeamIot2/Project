# Schéma zapojení – ESP32 LoLin32 + MH-Z19 + BME280 + BH1750 + MAX9814 + level shifter

Tento návod je připravený pro:
- **ESP32 LoLin32**
- **MH-Z19** (CO₂)
- **BME280** (teplota, vlhkost, tlak)
- **BH1750** (světlo / tma)
- **MAX9814** (hluk / mikrofon)
- **8kanálový level shifter 5V ↔ 3.3V**

---

## 1. Co znamenají sběrnice

- **I2C** = dva datové vodiče: `SDA` a `SCL`
- **UART** = dva datové vodiče: `TX` a `RX`
- **ADC** = analogový vstup, sem půjde mikrofon

---

## 2. Doporučené piny na ESP32

Použij tyto piny:

- **GPIO21** → SDA (I2C)
- **GPIO22** → SCL (I2C)
- **GPIO16** → RX2 (pro MH-Z19)
- **GPIO17** → TX2 (pro MH-Z19)
- **GPIO34** → ADC vstup pro MAX9814

Napájení:
- **3V3** → pro BME280, BH1750, nízkonapěťovou stranu level shifteru
- **5V / VIN** → pro MH-Z19, případně MAX9814
- **GND** → společná zem všude

---

## 3. Zapojení krok za krokem

### Krok 1 – připrav napájení
Propoj země všech zařízení dohromady:

- ESP32 `GND` → breadboard GND lišta
- MH-Z19 `GND` → breadboard GND
- BME280 `GND` → breadboard GND
- BH1750 `GND` → breadboard GND
- MAX9814 `GND` → breadboard GND
- level shifter `GND` → breadboard GND

Napájení:
- ESP32 `3V3` → breadboard 3.3V lišta
- ESP32 `5V` nebo `VIN` → breadboard 5V lišta

---

### Krok 2 – BME280
Připoj BME280:

- BME280 `VCC` → ESP32 `3V3`
- BME280 `GND` → `GND`
- BME280 `SDA` → ESP32 `GPIO21`
- BME280 `SCL` → ESP32 `GPIO22`

Poznámka: pokud má modul pin `CSB` a `SDO`, nech je podle výchozího nastavení modulu.

---

### Krok 3 – BH1750
Připoj BH1750 na stejnou I2C sběrnici:

- BH1750 `VCC` → ESP32 `3V3`
- BH1750 `GND` → `GND`
- BH1750 `SDA` → ESP32 `GPIO21`
- BH1750 `SCL` → ESP32 `GPIO22`

To je správně – **BME280 i BH1750 sdílí stejné piny SDA/SCL**.

---

### Krok 4 – MAX9814 mikrofon
Připoj MAX9814:

- MAX9814 `VDD` → `3V3` nebo `5V`
- MAX9814 `GND` → `GND`
- MAX9814 `OUT` → ESP32 `GPIO34`

Doporučení:
- pro jistotu začni s napájením **3V3**, pokud modul funguje stabilně
- pokud by byl signál slabý, můžeš zkusit 5V, ale výstup raději ověř

Pin `GPIO34` je vhodný jako analogový vstup.

---

### Krok 5 – level shifter
Připoj převodník logických úrovní:

#### Napájení shifteru
- level shifter `LV` → ESP32 `3V3`
- level shifter `HV` → `5V`
- level shifter `GND` → `GND`

#### Datová komunikace pro MH-Z19
Použij dva kanály převodníku:

**Směr MH-Z19 TX → ESP32 RX**
- MH-Z19 `TX` → shifter `HV1`
- shifter `LV1` → ESP32 `GPIO16`

**Směr ESP32 TX → MH-Z19 RX**
- ESP32 `GPIO17` → shifter `LV2`
- shifter `HV2` → MH-Z19 `RX`

---

### Krok 6 – MH-Z19
Napájení senzoru:

- MH-Z19 `Vin` / `VCC` → `5V`
- MH-Z19 `GND` → `GND`

Datové piny už jsou připojené přes level shifter:
- MH-Z19 `TX` → shifter `HV1`
- MH-Z19 `RX` → shifter `HV2`

---

## 4. Celkové zapojení – přehled

### I2C sběrnice
- ESP32 `GPIO21` ↔ BME280 `SDA`
- ESP32 `GPIO21` ↔ BH1750 `SDA`
- ESP32 `GPIO22` ↔ BME280 `SCL`
- ESP32 `GPIO22` ↔ BH1750 `SCL`

### Mikrofon
- ESP32 `GPIO34` ↔ MAX9814 `OUT`

### UART přes level shifter
- ESP32 `GPIO16` ← shifter `LV1` ← shifter `HV1` ← MH-Z19 `TX`
- ESP32 `GPIO17` → shifter `LV2` → shifter `HV2` → MH-Z19 `RX`

### Napájení
- `3V3` → BME280, BH1750, LV strana shifteru
- `5V` → MH-Z19, HV strana shifteru
- `GND` → všude společně

---

## 5. ASCII schéma

```text
                +-------------------+
                |    ESP32 LoLin32  |
                |                   |
3V3 -----------+------------------+--------------------+
               |                  |                    |
               |                  |                    |
               v                  v                    v
           BME280 VCC        BH1750 VCC          Shifter LV

5V ------------+------------------------------------------+---------+
               |                                          |         |
               v                                          v         v
          MH-Z19 VCC                                 Shifter HV   MAX9814 VDD

GND -----------+-------------+-------------+-------------+---------+--------+
               |             |             |             |         |        |
               v             v             v             v         v        v
           BME280 GND   BH1750 GND    MH-Z19 GND   Shifter GND  MAX9814 GND

GPIO21 ---------------- BME280 SDA
      \--------------- BH1750 SDA

GPIO22 ---------------- BME280 SCL
      \--------------- BH1750 SCL

GPIO34 ---------------- MAX9814 OUT

MH-Z19 TX ---- HV1 [LEVEL SHIFTER] LV1 ---- GPIO16
GPIO17   ---- LV2 [LEVEL SHIFTER] HV2 ---- MH-Z19 RX
```

---

## 6. Pořadí zprovoznění

Doporučený postup:
1. rozběhni samotné ESP32
2. připoj a otestuj **BME280**
3. přidej **BH1750**
4. přidej **MAX9814**
5. nakonec připoj **MH-Z19 přes level shifter**

Nedělej všechno naráz.

---

## 7. Důležité poznámky

- **MH-Z19 napájej 5V**
- **ESP32 piny jsou 3.3V**, proto je pro MH-Z19 použitý **level shifter**
- I2C senzory BME280 a BH1750 mohou běžet současně na stejných pinech
- GPIO34 je pouze vstup, což je pro mikrofon v pořádku

---

## 8. Co ještě zkontrolovat před zapnutím

- všechny země (`GND`) propojené
- nepoplést `TX` a `RX`
- nepoplést `3V3` a `5V`
- level shifter má správně `HV = 5V`, `LV = 3.3V`

---

## 9. Krátká verze zapojení

### BME280
- VCC → 3V3
- GND → GND
- SDA → GPIO21
- SCL → GPIO22

### BH1750
- VCC → 3V3
- GND → GND
- SDA → GPIO21
- SCL → GPIO22

### MAX9814
- VDD → 3V3
- GND → GND
- OUT → GPIO34

### Level shifter
- LV → 3V3
- HV → 5V
- GND → GND

### MH-Z19
- VCC → 5V
- GND → GND
- TX → HV1 → LV1 → GPIO16
- RX ← HV2 ← LV2 ← GPIO17
