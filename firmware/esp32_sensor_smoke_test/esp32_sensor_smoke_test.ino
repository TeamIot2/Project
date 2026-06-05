#include <Wire.h>
#include <BH1750.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <math.h>

namespace {
constexpr char DEVICE_ID[] = "esp32-001";

constexpr uint8_t SDA_PIN = 21;
constexpr uint8_t SCL_PIN = 22;
constexpr uint8_t MHZ19_RX_PIN = 16;
constexpr uint8_t MHZ19_TX_PIN = 17;
constexpr uint8_t MIC_PIN = 34;

constexpr uint32_t USB_SERIAL_BAUD = 115200;
constexpr uint32_t MHZ19_BAUD = 9600;
constexpr unsigned long READ_INTERVAL_MS = 5000UL;
constexpr unsigned long MHZ19_WARMUP_MS = 180000UL;

constexpr uint8_t BME280_ADDR_PRIMARY = 0x77;
constexpr uint8_t BME280_ADDR_SECONDARY = 0x76;
constexpr uint8_t BH1750_ADDR_PRIMARY = 0x23;
constexpr uint8_t BH1750_ADDR_SECONDARY = 0x5C;
}  // namespace

struct BmeReading {
  bool ok = false;
  float temperatureC = 0.0f;
  float humidityPct = 0.0f;
  float pressureHpa = 0.0f;
};

struct LightReading {
  bool ok = false;
  float lux = 0.0f;
};

struct SoundReading {
  bool ok = false;
  uint16_t average = 0;
  uint16_t peak = 0;
  uint16_t rms = 0;
  bool eventDetected = false;
};

struct Co2Reading {
  bool ok = false;
  bool warmingUp = true;
  unsigned long warmupRemainingMs = MHZ19_WARMUP_MS;
  int ppm = 0;
};

Adafruit_BME280 bme280;
BH1750 lightMeter;
HardwareSerial mhz19Serial(2);

bool bme280Ready = false;
bool bh1750Ready = false;
uint8_t bme280Address = 0;
uint8_t bh1750Address = 0;

unsigned long bootMs = 0;
unsigned long lastReadMs = 0;
bool measurementEnabled = true;
String usbCommandBuffer;

bool beginBme280() {
  if (bme280.begin(BME280_ADDR_PRIMARY, &Wire)) {
    bme280Address = BME280_ADDR_PRIMARY;
    return true;
  }

  if (bme280.begin(BME280_ADDR_SECONDARY, &Wire)) {
    bme280Address = BME280_ADDR_SECONDARY;
    return true;
  }

  return false;
}

bool beginBh1750() {
  if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, BH1750_ADDR_PRIMARY, &Wire)) {
    bh1750Address = BH1750_ADDR_PRIMARY;
    return true;
  }

  if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, BH1750_ADDR_SECONDARY, &Wire)) {
    bh1750Address = BH1750_ADDR_SECONDARY;
    return true;
  }

  return false;
}

void flushMhZ19Input() {
  while (mhz19Serial.available() > 0) {
    mhz19Serial.read();
  }
}

void applyMeasurementControl(bool enabled) {
  if (measurementEnabled == enabled) {
    return;
  }

  measurementEnabled = enabled;
  Serial.printf("# Team2App monitoring %s\n", measurementEnabled ? "resumed" : "paused");
}

void handleUsbCommandLine(String line) {
  line.trim();
  line.toUpperCase();

  if (line == "TEAM2APP:PAUSE" || line == "TEAM2APP:STOP" || line == "PAUSE" || line == "STOP") {
    applyMeasurementControl(false);
    return;
  }

  if (line == "TEAM2APP:RESUME" || line == "TEAM2APP:START" || line == "RESUME" || line == "START") {
    applyMeasurementControl(true);
  }
}

void handleUsbCommands() {
  while (Serial.available() > 0) {
    const char ch = static_cast<char>(Serial.read());
    if (ch == '\r') {
      continue;
    }

    if (ch == '\n') {
      handleUsbCommandLine(usbCommandBuffer);
      usbCommandBuffer = "";
      continue;
    }

    if (usbCommandBuffer.length() < 64) {
      usbCommandBuffer += ch;
    } else {
      usbCommandBuffer = "";
    }
  }
}

bool readMhZ19Ppm(int& ppm) {
  const uint8_t command[9] = {0xFF, 0x01, 0x86, 0x00, 0x00, 0x00, 0x00, 0x00, 0x79};
  uint8_t response[9] = {0};

  flushMhZ19Input();
  mhz19Serial.write(command, sizeof(command));
  mhz19Serial.flush();

  const unsigned long deadline = millis() + 1000UL;
  size_t index = 0;

  while (index < sizeof(response) && millis() < deadline) {
    if (mhz19Serial.available() > 0) {
      response[index++] = static_cast<uint8_t>(mhz19Serial.read());
    }
  }

  if (index != sizeof(response)) {
    return false;
  }

  if (response[0] != 0xFF || response[1] != 0x86) {
    return false;
  }

  uint8_t checksum = 0;
  for (int i = 1; i < 8; ++i) {
    checksum += response[i];
  }
  checksum = static_cast<uint8_t>(0xFF - checksum + 1);

  if (checksum != response[8]) {
    return false;
  }

  ppm = static_cast<int>(response[2]) * 256 + static_cast<int>(response[3]);
  return true;
}

BmeReading readBme280() {
  BmeReading reading;

  if (!bme280Ready) {
    return reading;
  }

  const float temperatureC = bme280.readTemperature();
  const float humidityPct = bme280.readHumidity();
  const float pressureHpa = bme280.readPressure() / 100.0f;

  if (isnan(temperatureC) || isnan(humidityPct) || isnan(pressureHpa)) {
    return reading;
  }

  reading.ok = true;
  reading.temperatureC = temperatureC;
  reading.humidityPct = humidityPct;
  reading.pressureHpa = pressureHpa;
  return reading;
}

LightReading readBh1750() {
  LightReading reading;

  if (!bh1750Ready) {
    return reading;
  }

  const float lux = lightMeter.readLightLevel();
  if (lux < 0.0f || isnan(lux)) {
    return reading;
  }

  reading.ok = true;
  reading.lux = lux;
  return reading;
}

SoundReading readSound() {
  SoundReading reading;

  constexpr size_t sampleCount = 256;
  uint32_t sum = 0;
  uint64_t sumSquares = 0;
  uint16_t peak = 0;

  for (size_t i = 0; i < sampleCount; ++i) {
    const uint16_t sample = static_cast<uint16_t>(analogRead(MIC_PIN));
    sum += sample;
    sumSquares += static_cast<uint64_t>(sample) * static_cast<uint64_t>(sample);
    if (sample > peak) {
      peak = sample;
    }
    delayMicroseconds(250);
  }

  const uint16_t average = static_cast<uint16_t>(sum / sampleCount);
  const float rmsValue = sqrt(static_cast<float>(sumSquares) / static_cast<float>(sampleCount));
  const uint16_t rms = static_cast<uint16_t>(rmsValue);

  reading.ok = true;
  reading.average = average;
  reading.peak = peak;
  reading.rms = rms;
  reading.eventDetected = peak > average + 120;
  return reading;
}

Co2Reading readCo2() {
  Co2Reading reading;

  const unsigned long elapsedMs = millis() - bootMs;
  reading.warmingUp = elapsedMs < MHZ19_WARMUP_MS;
  if (reading.warmupRemainingMs > elapsedMs) {
    reading.warmupRemainingMs -= elapsedMs;
  } else {
    reading.warmupRemainingMs = 0;
  }

  int ppm = 0;
  if (readMhZ19Ppm(ppm)) {
    reading.ok = true;
    reading.ppm = ppm;
  }

  return reading;
}

void printBootBanner() {
  Serial.println();
  Serial.println(F("ESP32 sensor smoke test"));
  Serial.println(F("Connect one sensor at a time and always unplug USB before rewiring."));
  Serial.printf("I2C pins: SDA=%u, SCL=%u\n", SDA_PIN, SCL_PIN);
  Serial.printf("MH-Z19 UART: ESP32 RX2=%u, TX2=%u\n", MHZ19_RX_PIN, MHZ19_TX_PIN);
  Serial.printf("MAX9814 analog pin: GPIO%u\n", MIC_PIN);

  if (bme280Ready) {
    Serial.printf("BME280 detected at 0x%02X\n", bme280Address);
  } else {
    Serial.println(F("BME280 not detected"));
  }

  if (bh1750Ready) {
    Serial.printf("BH1750 detected at 0x%02X\n", bh1750Address);
  } else {
    Serial.println(F("BH1750 not detected"));
  }

  Serial.println(F("MH-Z19 will need about 3 minutes to warm up after power-on."));
  Serial.println(F("Team2App control: send TEAM2APP:PAUSE or TEAM2APP:RESUME over USB serial."));
  Serial.println();
}

void printReadings(
  const BmeReading& bmeReading,
  const LightReading& lightReading,
  const SoundReading& soundReading,
  const Co2Reading& co2Reading
) {
  Serial.println(F("--- Cycle ---"));

  if (bmeReading.ok) {
    Serial.printf(
      "BME280: T=%.2f C, H=%.2f %%, P=%.2f hPa\n",
      bmeReading.temperatureC,
      bmeReading.humidityPct,
      bmeReading.pressureHpa
    );
  } else {
    Serial.println(F("BME280: missing or unreadable"));
  }

  if (lightReading.ok) {
    Serial.printf("BH1750: %.2f lx\n", lightReading.lux);
  } else {
    Serial.println(F("BH1750: missing or unreadable"));
  }

  if (soundReading.ok) {
    Serial.printf(
      "MAX9814: avg=%u, peak=%u, rms=%u, event=%s\n",
      soundReading.average,
      soundReading.peak,
      soundReading.rms,
      soundReading.eventDetected ? "yes" : "no"
    );
  } else {
    Serial.println(F("MAX9814: missing or unreadable"));
  }

  if (co2Reading.ok) {
    if (co2Reading.warmingUp) {
      Serial.printf(
        "MH-Z19: %d ppm (warming up, %lu s left)\n",
        co2Reading.ppm,
        co2Reading.warmupRemainingMs / 1000UL
      );
    } else {
      Serial.printf("MH-Z19: %d ppm\n", co2Reading.ppm);
    }
  } else if (co2Reading.warmingUp) {
    Serial.printf("MH-Z19: no valid response yet, warm-up time left %lu s\n", co2Reading.warmupRemainingMs / 1000UL);
  } else {
    Serial.println(F("MH-Z19: missing or unreadable"));
  }
}

bool readyForJson(
  const BmeReading& bmeReading,
  const LightReading& lightReading,
  const SoundReading& soundReading,
  const Co2Reading& co2Reading
) {
  return bmeReading.ok && lightReading.ok && soundReading.ok && co2Reading.ok;
}

void printJsonLine(
  const BmeReading& bmeReading,
  const LightReading& lightReading,
  const SoundReading& soundReading,
  const Co2Reading& co2Reading
) {
  Serial.print('{');
  Serial.printf("\"device_id\":\"%s\",", DEVICE_ID);
  Serial.printf("\"co2_ppm\":%d,", co2Reading.ppm);
  Serial.printf("\"temperature_c\":%.2f,", bmeReading.temperatureC);
  Serial.printf("\"humidity_pct\":%.2f,", bmeReading.humidityPct);
  Serial.printf("\"pressure_hpa\":%.2f,", bmeReading.pressureHpa);
  Serial.printf("\"light_lux\":%.2f,", lightReading.lux);
  Serial.printf("\"sound_level_adc\":%u,", soundReading.average);
  Serial.printf("\"sound_peak_adc\":%u,", soundReading.peak);
  Serial.printf("\"sound_rms_adc\":%u,", soundReading.rms);
  Serial.printf("\"sound_event\":%s,", soundReading.eventDetected ? "true" : "false");
  Serial.print("\"battery_v\":null");
  Serial.println('}');
}

void setup() {
  Serial.begin(USB_SERIAL_BAUD);
  delay(1200);

  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(100000UL);

  analogReadResolution(12);
  analogSetPinAttenuation(MIC_PIN, ADC_11db);

  mhz19Serial.begin(MHZ19_BAUD, SERIAL_8N1, MHZ19_RX_PIN, MHZ19_TX_PIN);

  bme280Ready = beginBme280();
  bh1750Ready = beginBh1750();

  bootMs = millis();
  printBootBanner();
}

void loop() {
  handleUsbCommands();

  if (!measurementEnabled) {
    delay(50);
    return;
  }

  if (millis() - lastReadMs < READ_INTERVAL_MS) {
    delay(50);
    return;
  }

  lastReadMs = millis();

  const BmeReading bmeReading = readBme280();
  const LightReading lightReading = readBh1750();
  const SoundReading soundReading = readSound();
  const Co2Reading co2Reading = readCo2();

  printReadings(bmeReading, lightReading, soundReading, co2Reading);

  if (readyForJson(bmeReading, lightReading, soundReading, co2Reading)) {
    printJsonLine(bmeReading, lightReading, soundReading, co2Reading);
  } else {
    Serial.println(F("JSON skipped: wait until all connected sensors return valid values."));
  }

  Serial.println();
}
