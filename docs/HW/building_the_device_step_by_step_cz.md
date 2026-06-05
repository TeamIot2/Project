# Stavba zarizeni krok za krokem

Tento navod je pro uplne prvni oziveni hardwaru.

Vychazi hlavne z:

- `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\docs\HW\schema_zapojeni_esp32_env_monitor.md`
- `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\docs\project_status.md`

Dulezity stav projektu:

- pro prvni oziveni i soucasne lokalni testovani je pripraven testovaci sketch:
  `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\firmware\esp32_sensor_smoke_test\esp32_sensor_smoke_test.ino`
- tento sketch uz umi precist vsechny aktualne pouzite senzory a vypsat JSON pro gateway

Tento sketch umi:

- overit USB spojeni s ESP32
- cist `BME280`
- cist `BH1750`
- cist `MAX9814`
- cist `MH-Z19` pres `UART`
- po uspesnem precteni vsech senzoru vypsat i jeden radek JSON v projektu ocekavanem tvaru
- ve zdrojovem kodu je aktualne nastaveny interval mereni `5000 ms`

## Aktualni stav prace

Hotovo:

- `Arduino IDE 2.x` je nainstalovane
- `esp32 by Espressif Systems` je nainstalovany
- knihovny `Adafruit BME280 Library`, `Adafruit Unified Sensor` a `BH1750` jsou nainstalovane
- `ESP32 LoLin32` se hlasi pres USB jako `COM3`
- testovaci sketch se zkompiluje pro `WEMOS LOLIN32` / `esp32:esp32:lolin32`
- starsi verze testovaciho sketchu uz byla nahrana do `ESP32`
- `Serial Monitor` funguje
- `BME280` byl fyzicky oziven
- `BH1750` byl pridan a cten pres stejnou `I2C` sbernici
- `MAX9814` byl pridan a cten pres `GPIO34`
- `level shifter` byl zapojen pro komunikaci `MH-Z19`
- `MH-Z19` byl pridan a po zahrati vracel hodnoty `ppm`
- `Node-RED` cte realna data z `COM3` a aktualne je posila na Railway backend
- lokalni frontend v rezimu `Unicorn` pouziva realne zarizeni `esp32-001`
- ostatni rezimy v aplikaci zustavaji mock/demo
- frontend polling realnych hodnot je nastaven na `5 sekund`
- Node-RED uz neposila davku po 6 merenich, ale posila kazde validni mereni hned

Zatim nedodelano / pozor:

- pokud bude potreba znovu nahravat firmware, pri chybe `Wrong boot mode detected (0x13)` podrz tlacitko `BOOT`, dokud nezacne nahravani
- JSON realne prichazi zhruba kazdych `5 sekund`
- `Node-RED` posila kazde validni mereni hned na aktivni backend, aktualne na Railway
- ve frontendu se hodnoty v rezimu `Unicorn` obnovuji v 5s rytmu
- stale je vhodne zlepsit mechanickou spolehlivost zapojeni pomoci kvalitnich `Dupont vodicu`

## 1. Nez zacnes

Ted budes pouzivat jen tyto soucastky:

- `ESP32 LoLin32`
- `BME280`
- `BH1750`
- `MAX9814`
- `MH-Z19`
- `8-channel level shifter 5V <-> 3.3V`
- `micro USB datovy kabel`
- `Dupont vodice`
- `nepajive pole`

Pevna pravidla pro cely postup:

1. Kdykoliv budes menit draty, nejdriv odpoj `USB` od ESP32.
2. Nikdy neposilej `5V` do pinu `3V3`, `GPIO21`, `GPIO22`, `GPIO16`, `GPIO17` nebo `GPIO34`.
3. `MH-Z19` napajej `5V`, ale jeho komunikaci ved pres `level shifter`, presne podle projektu.
4. `BME280` a `BH1750` napajej jen `3V3`.
5. `MAX9814 OUT` patri jen do `GPIO34`. Nepatri do `3V3`, `5V` ani `GND`.
6. Kdyz si nebudes jisty, zastav se pred zapojenim dalsiho dratu.

## 2. Co budes instalovat do PC

Nainstaluj:

1. `Arduino IDE 2.x`
2. v `Boards Manager` balicek `esp32 by Espressif Systems`
3. v `Library Manager` knihovny:
   - `Adafruit BME280 Library`
   - `Adafruit Unified Sensor`
   - `BH1750`

Poznamka:

- v projektu neni hotovy produkcni firmware
- proto budes nahravat testovaci sketch

## 3. Krok 1 - jen ESP32 a USB

### Co ma byt fyzicky zapojeno

Jen toto:

- `micro USB kabel` mezi PC a `ESP32 LoLin32`

Zatim nepripojuj:

- `BME280`
- `BH1750`
- `MAX9814`
- `MH-Z19`
- `level shifter`
- `breadboard`

### Co mas udelat

1. Pripoj `ESP32` k PC pres `micro USB datovy kabel`.
2. Podivej se, jestli se na desce rozsviti napajeci LED.
3. V `Arduino IDE` otevri:
   `U:\ide_workspaces\Team2App\Team2App_ROOT\PROJECT\firmware\esp32_sensor_smoke_test\esp32_sensor_smoke_test.ino`
4. V `Tools -> Board` vyber nejdriv `ESP32 Dev Module`.
5. V `Tools -> Port` vyber novy `COM` port, ktery se objevil po pripojeni desky.
6. Klikni na `Upload`.

### Kdyz upload neprojde

Zkus toto v presnem poradi:

1. odpoj a znovu pripoj USB kabel
2. zkontroluj, ze je to datovy kabel, ne jen nabijeci
3. vyber znovu spravny `COM` port
4. pri hlaskach o pripojeni podrz tlacitko `BOOT`, klikni na `Upload`, a tlacitko pust az kdyz zacne nahravani

### Jak poznas, ze je krok hotovy spravne

Po otevreni `Serial Monitor` na `115200 baud` uvidis text podobny tomuto:

```text
ESP32 sensor smoke test
BME280 not detected
BH1750 not detected
MH-Z19 will need about 3 minutes to warm up after power-on.
```

Je v poradku, ze senzory zatim chybi.

### Co je chyba

- zadny `COM` port se neobjevi
- upload stale pada
- `Serial Monitor` je prazdny i po resetu desky

Dokud tohle nefunguje, nechod dal.

## 4. Krok 2 - BME280 samotny

Pred timto krokem:

- odpoj `USB` od ESP32

### Presne zapoj tyto 4 draty

1. `ESP32 3V3` -> `BME280 VCC`
2. `ESP32 GND` -> `BME280 GND`
3. `ESP32 GPIO21` -> `BME280 SDA`
4. `ESP32 GPIO22` -> `BME280 SCL`

### Co tam nepatri

- `BME280 VCC` nesmi na `5V`
- `BME280 SDA` nesmi na `GPIO22`
- `BME280 SCL` nesmi na `GPIO21`
- pokud modul ma `CSB` a `SDO`, zatim je nech podle vychoziho osazeni modulu a nic na ne nepripojuj

### Co mas udelat po zapojeni

1. znovu pripoj `USB`
2. pockej asi `5-10 sekund`
3. otevri `Serial Monitor`

### Jak poznas, ze je krok hotovy spravne

Na startu uvidis:

```text
BME280 detected at 0x77
```

Nektere moduly budou misto toho na adrese `0x76`. Oboji je v poradku.

V dalsich cyklech uvidis radek podobny tomuto:

```text
BME280: T=23.10 C, H=41.80 %, P=1008.90 hPa
```

### Co je chyba

- porad vidis `BME280 not detected`
- hodnoty jsou `nan`
- po pripojeni BME280 prestane deska bootovat

Kdyz je chyba, zkontroluj jen tyto 4 veci:

1. `VCC` opravdu na `3V3`
2. `GND` opravdu na `GND`
3. `SDA` opravdu na `GPIO21`
4. `SCL` opravdu na `GPIO22`

## 5. Krok 3 - pridej BH1750

Pred timto krokem:

- odpoj `USB`
- `BME280` nech zapojeny

### Presne zapoj tyto 4 draty

1. `ESP32 3V3` -> `BH1750 VCC`
2. `ESP32 GND` -> `BH1750 GND`
3. `ESP32 GPIO21` -> `BH1750 SDA`
4. `ESP32 GPIO22` -> `BH1750 SCL`

Ano, tady je to schvalne:

- `BME280 SDA` a `BH1750 SDA` jsou oba na `GPIO21`
- `BME280 SCL` a `BH1750 SCL` jsou oba na `GPIO22`

To je normalni `I2C` sbernice.

### Co tam nepatri

- `BH1750 VCC` nesmi na `5V`
- `BH1750 SDA` nesmi na `GPIO22`
- `BH1750 SCL` nesmi na `GPIO21`
- nepripojuj `level shifter`, tady jeste neni potreba

### Co mas udelat po zapojeni

1. pripoj `USB`
2. otevri `Serial Monitor`
3. zakryj senzor prstem nebo kusem papiru a pak ho znovu odkryj

### Jak poznas, ze je krok hotovy spravne

Na startu uvidis:

```text
BH1750 detected at 0x23
```

Nektere moduly mohou byt na `0x5C`. Oboji je v poradku.

V cyklech uvidis treba:

```text
BH1750: 187.50 lx
```

Kdyz senzor zakryjes a odkryjes, cislo by se melo zmenit.

## 6. Krok 4 - pridej MAX9814

Pred timto krokem:

- odpoj `USB`
- `BME280` i `BH1750` nech zapojene

### Presne zapoj tyto 3 draty

1. `ESP32 3V3` -> `MAX9814 VDD`
2. `ESP32 GND` -> `MAX9814 GND`
3. `ESP32 GPIO34` -> `MAX9814 OUT`

### Co tam nepatri

- `MAX9814 OUT` nesmi na `5V`
- `MAX9814 OUT` nesmi na `3V3`
- `MAX9814 OUT` nesmi na `GPIO21`, `GPIO22`, `GPIO16` ani `GPIO17`
- nepouzivej `level shifter` pro `MAX9814`, je to analogovy signal

### Co mas udelat po zapojeni

1. pripoj `USB`
2. otevri `Serial Monitor`
3. mluv blizko mikrofonu nebo tleskni

### Jak poznas, ze je krok hotovy spravne

Uvidis radek podobny tomuto:

```text
MAX9814: avg=2048, peak=2330, rms=2055, event=yes
```

Kdyz je okoli tiche, `peak` bude nizsi.
Kdyz promluvis nebo tlesknes, `peak` typicky skoci nahoru.

## 7. Krok 5 - priprav level shifter

Pred timto krokem:

- odpoj `USB`

`Level shifter` je jen pro logicke urovne.
Neni pro napajeni senzoru a neni pro mikrofon.

### Presne zapoj jen napajeni level shifteru

1. `ESP32 3V3` -> `level shifter LV`
2. `ESP32 5V` nebo `VIN` -> `level shifter HV`
3. `ESP32 GND` -> `level shifter GND`

### Co tam nepatri

- `LV` nesmi na `5V`
- `HV` nesmi na `3V3`
- `MAX9814 OUT` nesmi pres `level shifter`
- `BME280` ani `BH1750` sem ted nepripojuj

### Jak poznas, ze je krok hotovy spravne

Na `Serial Monitoru` se zatim nic noveho neobjevi.
To je v poradku.
Tenhle krok je jen priprava na `MH-Z19`.

## 8. Krok 6 - pridej MH-Z19 pres level shifter

Pred timto krokem:

- odpoj `USB`

### Presne zapoj napajeni MH-Z19

1. `ESP32 5V` nebo `VIN` -> `MH-Z19 Vin` nebo `VCC`
2. `ESP32 GND` -> `MH-Z19 GND`

### Presne zapoj komunikaci pres level shifter

Pouzij dva kanaly.
Budeme jim rikat `kanal 1` a `kanal 2`.

#### Kanal 1 - data z MH-Z19 do ESP32

1. `MH-Z19 TX` -> `level shifter HV1`
2. `level shifter LV1` -> `ESP32 GPIO16`

#### Kanal 2 - data z ESP32 do MH-Z19

1. `ESP32 GPIO17` -> `level shifter LV2`
2. `level shifter HV2` -> `MH-Z19 RX`

### Co tam nepatri

- `MH-Z19 TX` nepatri primo do `ESP32 GPIO16`
- `ESP32 GPIO17` nepatri primo do `MH-Z19 RX`
- `MH-Z19 VCC` nepatri na `3V3`
- `MH-Z19` nepripojuj na `GPIO21`, `GPIO22` ani `GPIO34`

### Co mas udelat po zapojeni

1. pripoj `USB`
2. otevri `Serial Monitor`
3. pockej az `3 minuty`, protoze `MH-Z19` se po zapnuti zahriva

### Jak poznas, ze je krok hotovy spravne

Nejdriv uvidis neco jako:

```text
MH-Z19: 812 ppm (warming up, 170 s left)
```

Po zahrati uz typicky:

```text
MH-Z19: 823 ppm
```

Kdyz jsou vsechny senzory v poradku, sketch zacne navic vypisovat i cisty JSON radek:

```json
{"device_id":"esp32-001","co2_ppm":823,"temperature_c":23.50,"humidity_pct":41.20,"pressure_hpa":1009.80,"light_lux":187.50,"sound_level_adc":2052,"sound_peak_adc":2330,"sound_rms_adc":2061,"sound_event":false,"battery_v":0.0}
```

Tenhle radek je dulezity.
To je prvni funkcni test cele sestavy.

## 9. Kdy mas pokracovat dal

Na dalsi krok chod teprve kdyz plati vsechno:

1. `ESP32` se spolehlive pripoji pres USB
2. `BME280` se detekuje a vypisuje tri hodnoty
3. `BH1750` reaguje na zakryti a odkryti
4. `MAX9814` meni `peak` pri hluku
5. `MH-Z19` po zahrati vraci `ppm`
6. sketch vypisuje jeden radek JSON

Pokud neplati cokoli z toho, nepredelavej dalsi cast a oprav nejdriv posledni rozbity krok.

## 10. Nejcastejsi chyby

### Deska se nepripoji k PC

- kabel je jen nabijeci
- neni vybrany spravny `COM` port
- pri uploadu bylo potreba podrzet `BOOT`

### I2C senzor se nenajde

- prohozene `SDA` a `SCL`
- `VCC` omylem na `5V`
- chybi `GND`

### Mikrofon ukazuje nesmysly

- `OUT` neni na `GPIO34`
- je pouzity moc dlouhy nebo volny drat
- `OUT` byl omylem veden pres `level shifter`

### MH-Z19 nekomunikuje

- prohozene `TX` a `RX`
- chybi spolecna `GND`
- `HV` a `LV` jsou na `level shifteru` obracene
- cekas vysledek driv nez po zahrati

## 11. Co zatim neres

Zatim neres:

- `Polar H10`
- finalni krabicku
- produkcni firmware
- OTA update
- cloud upload

Nejdriv musi byt stabilni tento zakladni test.
