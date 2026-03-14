#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>

// ============================================
// KONFIGURASI AWAL - SESUAIKAN DENGAN LINGKUNGAN
// ============================================
const char* WIFI_SSID = "system";
const char* WIFI_PASSWORD = "ESP-8991";

const char* SERVER_IP = "192.168.1.50";
const int SERVER_PORT = 5111;

const char* ESP_ID = "debuging";
const int NODE_PORT = 8181;

// ============================================
// PIN DEFINITION
// ============================================
#define RELAY_PIN 0      // GPIO0 - Output ke Relay (Active LOW)
#define LED_PIN 2        // GPIO2 - LED Internal (Active LOW)
#define STATUS_PIN 3     // GPIO3/RX - Input untuk deteksi status device

// ============================================
// VARIABEL GLOBAL
// ============================================
WiFiServer nodeServer(NODE_PORT);

String deviceStatus = "off";
String lastPostedDeviceStatus = "off";
String relayState = "off";

unsigned long lastWifiCheck = 0;
unsigned long lastPostTime = 0;
unsigned long lastGetTime = 0;
unsigned long connectionStartTime = 0;
unsigned long ledActivityTime = 0;

// GPIO3 dengan deteksi flicker AC
int lastStableGpio3RawState = HIGH;       // Default HIGH (OFF secara fisik)
unsigned long lastGpio3ChangeTime = 0;
const unsigned long GPIO3_DEBOUNCE_TIME = 100; // 100ms untuk atasi flicker AC 40-60Hz

bool wifiConnected = false;
bool ledActivity = false;
bool pendingGpio3Update = false;

// WiFi connection LED timer
bool wifiLedOn = false;
unsigned long wifiLedStartTime = 0;
const unsigned long WIFI_LED_DURATION = 3000;

bool wifiStable = false;
unsigned long wifiConnectTime = 0;
const unsigned long WIFI_STABLE_TIMEOUT = 3000;
unsigned long lastBlinkTime = 0;
const unsigned long BLINK_INTERVAL = 200;

// IP Management
String lastKnownIP = "";
bool needsHandshake = false;
unsigned long lastHandshakeTime = 0;
const unsigned long HANDSHAKE_COOLDOWN = 10000;
bool startupRunningSent = false;
unsigned long lastStartupRunningAttempt = 0;
const unsigned long STARTUP_RUNNING_RETRY_INTERVAL = 5000;

// Feedback LED
unsigned long feedbackBlinkStartTime = 0;
int feedbackBlinkCount = 0;
bool feedbackBlinking = false;
const int FEEDBACK_BLINK_COUNT = 3;
const unsigned long FEEDBACK_BLINK_DURATION = 500;

// Non-blocking boot blink pada STATUS_PIN
bool statusPinReady = false;
int bootBlinkTransitions = 0;
unsigned long bootBlinkLastToggle = 0;
const int BOOT_BLINK_TRANSITIONS = 6;
const unsigned long BOOT_BLINK_INTERVAL = 200;

// ============================================
// FUNGSI UPDATE DEVICE STATUS (LOGIKA YANG SUDAH DIPERBAIKI)
// ============================================
void updateDeviceStatus() {
  // LOGIKA FISIK YANG SUDAH DIPERBAIKI:
  // - Jika pin HIGH (3.3V / tidak terhubung ke GND) → Device OFF
  // - Jika pin LOW (terhubung ke GND) → Device ON
  if (lastStableGpio3RawState == HIGH) {
    deviceStatus = "off";  // HIGH → OFF
  } else {
    deviceStatus = "on";   // LOW → ON
  }
}

// ============================================
// FUNGSI BACA STATUS GPIO3 UNTUK DIKIRIM KE SERVER
// ============================================
String getGpio3Status() {
  // Mengembalikan "high" atau "low" berdasarkan pembacaan langsung dari pin
  // Tidak perlu dibalik, karena server akan mengonversi:
  // - "high" → deviceStatus "off"
  // - "low" → deviceStatus "on"
  int rawState = digitalRead(STATUS_PIN);
  return (rawState == HIGH) ? "high" : "low";
}

// ============================================
// FUNGSI WIFI BLOCKING DENGAN RESTART
// ============================================
void connectWiFiOrRestart() {
  connectToWiFi();

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    if (millis() - start >= 60000) { // 1 menit timeout
      ESP.restart();
    }
  }

  wifiConnected = true;
  wifiConnectTime = millis();
  wifiStable = false;

  String currentIP = WiFi.localIP().toString();
  if (lastKnownIP != "" && currentIP != lastKnownIP) {
    needsHandshake = true;
  }
  lastKnownIP = currentIP;

  startupRunningSent = false;
  lastStartupRunningAttempt = 0;
}

void blinkLedFast3x() {
  const unsigned long interval = 120;
  unsigned long lastToggle = millis();
  int transitions = 0;
  bool ledOn = false;

  digitalWrite(LED_PIN, HIGH);
  while (transitions < 6) {
    unsigned long now = millis();
    if (now - lastToggle >= interval) {
      lastToggle = now;
      ledOn = !ledOn;
      digitalWrite(LED_PIN, ledOn ? LOW : HIGH);
      transitions++;
    }
  }
  digitalWrite(LED_PIN, HIGH);
}

// ============================================
// FUNGSI SETUP AWAL
// ============================================
void setup() {
  connectWiFiOrRestart();
  normalBoot();
}

void normalBoot() {
  // Setup GPIO pins
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(STATUS_PIN, OUTPUT); // Sementara jadi OUTPUT untuk blink

  // Default state
  digitalWrite(RELAY_PIN, HIGH);    // Relay OFF
  digitalWrite(LED_PIN, HIGH);      // LED OFF

  // Mulai boot blink non-blocking pada STATUS_PIN
  digitalWrite(STATUS_PIN, HIGH);
  statusPinReady = false;
  bootBlinkTransitions = 0;
  bootBlinkLastToggle = millis();

  // Start node server
  nodeServer.begin();

  // Inisialisasi timer
  wifiLedStartTime = millis();
  lastBlinkTime = millis();
  lastHandshakeTime = 0;
  feedbackBlinking = false;
  feedbackBlinkCount = 0;

  blinkLedFast3x();
}

// ============================================
// FUNGSI UTAMA LOOP
// ============================================
void loop() {
  unsigned long currentMillis = millis();

  if (!statusPinReady) {
    handleBootBlink(currentMillis);
    handleLEDIndicator(currentMillis);
    return;
  }

  if (wifiConnected && WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    wifiStable = false;
    wifiConnectTime = 0;
    wifiLedOn = false;
    startupRunningSent = false;
    lastStartupRunningAttempt = 0;
    connectToWiFi();
  }

  if (!wifiConnected) {
    handleWiFiConnection();
  } else {
    if (!startupRunningSent) {
      if (lastStartupRunningAttempt == 0 ||
          currentMillis - lastStartupRunningAttempt >= STARTUP_RUNNING_RETRY_INTERVAL) {
        lastStartupRunningAttempt = currentMillis;
        if (sendRunningStatusToServer()) {
          startupRunningSent = true;
          postDataToServer();
          getRelayStateFromServer();
          lastPostTime = currentMillis;
          lastGetTime = currentMillis;
        }
      }
      handleLEDIndicator(currentMillis);
      return;
    }

    if (!wifiStable) {
      if (currentMillis - wifiConnectTime >= WIFI_STABLE_TIMEOUT) {
        wifiStable = true;
      }
    }

    monitorGpio3(currentMillis);

    if (pendingGpio3Update) {
      handleGpio3Update(currentMillis);
    }

    handleNormalOperation(currentMillis);
    handleNodeServer();

    if (wifiStable && needsHandshake) {
      if (currentMillis - lastHandshakeTime >= HANDSHAKE_COOLDOWN) {
        if (sendHandshakeToServer()) {
          needsHandshake = false;
          lastHandshakeTime = currentMillis;
        }
      }
    }

    if (feedbackBlinking) {
      handleFeedbackBlinking(currentMillis);
    }
  }

  handleLEDIndicator(currentMillis);
}

// ============================================
// FUNGSI MONITOR GPIO3 DENGAN ANTI FLICKER AC
// ============================================
void monitorGpio3(unsigned long currentMillis) {
  int rawState = digitalRead(STATUS_PIN);

  if (rawState != lastStableGpio3RawState) {
    if (currentMillis - lastGpio3ChangeTime > GPIO3_DEBOUNCE_TIME) {
      lastStableGpio3RawState = rawState;
      updateDeviceStatus();

      if (deviceStatus != lastPostedDeviceStatus) {
        pendingGpio3Update = true;
        lastPostedDeviceStatus = deviceStatus;
      }
    }
  } else {
    lastGpio3ChangeTime = currentMillis;
  }
}

// ============================================
// HANDLE GPIO3 UPDATE
// ============================================
void handleGpio3Update(unsigned long currentMillis) {
  if (!pendingGpio3Update) return;

  ledActivity = true;
  ledActivityTime = currentMillis;
  digitalWrite(LED_PIN, LOW);

  bool postSuccess = postDataToServer();

  if (postSuccess) {
    getRelayStateFromServer();
    updateMetaDataOnServer();
  }

  pendingGpio3Update = false;
  lastPostTime = currentMillis;
  lastGetTime = currentMillis;
}

// ============================================
// FUNGSI KONEKSI WiFi
// ============================================
void connectToWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  connectionStartTime = millis();
  wifiConnectTime = 0;
  wifiStable = false;
  lastKnownIP = "";
  needsHandshake = true;
  feedbackBlinking = false;
  feedbackBlinkCount = 0;
  startupRunningSent = false;
  lastStartupRunningAttempt = 0;
  digitalWrite(LED_PIN, HIGH);
  lastBlinkTime = millis();
}

void handleWiFiConnection() {
  unsigned long currentMillis = millis();

  if (currentMillis - connectionStartTime >= 30000) { // 30 detik timeout reconnect
    ESP.restart();
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    wifiConnectTime = currentMillis;
    wifiStable = false;

    String currentIP = WiFi.localIP().toString();
    if (lastKnownIP != "" && currentIP != lastKnownIP) {
      needsHandshake = true;
    }
    lastKnownIP = currentIP;

    lastStableGpio3RawState = digitalRead(STATUS_PIN);
    updateDeviceStatus();
    lastPostedDeviceStatus = deviceStatus;
    startupRunningSent = false;
    lastStartupRunningAttempt = 0;
  }
}

void handleNormalOperation(unsigned long currentMillis) {
  if (currentMillis - lastWifiCheck > 30000) {
    lastWifiCheck = currentMillis;

    if (WiFi.status() != WL_CONNECTED) {
      wifiConnected = false;
      wifiStable = false;
      wifiConnectTime = 0;
      wifiLedOn = false;
      feedbackBlinking = false;
      feedbackBlinkCount = 0;
      startupRunningSent = false;
      lastStartupRunningAttempt = 0;
    }
  }
}

// ============================================
// FUNGSI KOMUNIKASI DENGAN SERVER
// ============================================
bool sendHandshakeToServer() {
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    wifiStable = false;
    wifiConnectTime = 0;
    wifiLedOn = false;
    return false;
  }

  WiFiClient client;
  HTTPClient http;

  String serverURL = "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) + "/server-info";

  http.begin(client, serverURL);
  http.addHeader("Content-Type", "application/json");

  DynamicJsonDocument doc(512);
  doc["nodeID"] = ESP_ID;
  doc["nodeIP"] = WiFi.localIP().toString();
  doc["wifiSSID"] = WiFi.SSID();
  doc["wifiRSSI"] = String(WiFi.RSSI());
  doc["gpio3Status"] = getGpio3Status();
  doc["timestamp"] = String(millis());
  doc["handshakeType"] = "initial";

  String requestBody;
  serializeJson(doc, requestBody);

  ledActivity = true;
  ledActivityTime = millis();
  digitalWrite(LED_PIN, LOW);

  int httpResponseCode = http.POST(requestBody);
  bool success = (httpResponseCode > 0);

  http.end();
  return success;
}

bool sendRunningStatusToServer() {
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    wifiStable = false;
    wifiConnectTime = 0;
    wifiLedOn = false;
    return false;
  }

  WiFiClient client;
  HTTPClient http;

  String serverURL = "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) + "/server-info";
  http.begin(client, serverURL);
  http.addHeader("Content-Type", "application/json");

  DynamicJsonDocument doc(384);
  doc["nodeID"] = ESP_ID;
  doc["nodeIP"] = WiFi.localIP().toString();
  doc["handshakeType"] = "restart_running";
  doc["message"] = "ESP Is Running";
  doc["timestamp"] = String(millis());

  String requestBody;
  serializeJson(doc, requestBody);

  ledActivity = true;
  ledActivityTime = millis();
  digitalWrite(LED_PIN, LOW);

  int httpResponseCode = http.POST(requestBody);
  bool success = (httpResponseCode > 0 && httpResponseCode < 300);
  http.end();
  return success;
}

bool postDataToServer() {
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    wifiStable = false;
    wifiConnectTime = 0;
    wifiLedOn = false;
    return false;
  }

  WiFiClient client;
  HTTPClient http;

  String serverURL = "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) + "/api/node-wifi/" + String(ESP_ID);

  http.begin(client, serverURL);
  http.addHeader("Content-Type", "application/json");

  updateDeviceStatus();

  DynamicJsonDocument doc(512);
  doc["wifiSSID"] = WiFi.SSID();
  doc["nodeIP"] = WiFi.localIP().toString();
  doc["nodeID"] = ESP_ID;
  doc["gpio3Status"] = getGpio3Status();
  doc["wifiRSSI"] = String(WiFi.RSSI());
  doc["nodePort"] = String(NODE_PORT);

  String requestBody;
  serializeJson(doc, requestBody);

  ledActivity = true;
  ledActivityTime = millis();
  digitalWrite(LED_PIN, LOW);

  int httpResponseCode = http.POST(requestBody);
  bool success = (httpResponseCode > 0);

  http.end();
  return success;
}

void updateMetaDataOnServer() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClient client;
  HTTPClient http;

  String serverURL = "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) + "/api/node-meta/" + String(ESP_ID);

  http.begin(client, serverURL);
  http.addHeader("Content-Type", "application/json");

  DynamicJsonDocument doc(256);
  doc["customName"] = "";
  doc["nodeStatus"] = "online";
  doc["gpio3Status"] = getGpio3Status();

  String requestBody;
  serializeJson(doc, requestBody);

  int httpResponseCode = http.POST(requestBody);
  http.end();
}

void getRelayStateFromServer() {
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    wifiStable = false;
    wifiConnectTime = 0;
    wifiLedOn = false;
    return;
  }

  WiFiClient client;
  HTTPClient http;

  String serverURL = "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) + "/api/node-relay/" + String(ESP_ID);

  http.begin(client, serverURL);

  ledActivity = true;
  ledActivityTime = millis();
  digitalWrite(LED_PIN, LOW);

  int httpResponseCode = http.GET();

  if (httpResponseCode > 0) {
    String response = http.getString();
    DynamicJsonDocument doc(256);
    DeserializationError error = deserializeJson(doc, response);

    if (!error) {
      String newRelayState = doc["relayState"];
      if (newRelayState != relayState) {
        relayState = newRelayState;
        controlRelay(relayState);
      }
    }
  }

  http.end();
}

// ============================================
// FUNGSI CONTROL RELAY
// ============================================
void controlRelay(String state) {
  if (state == "on") {
    digitalWrite(RELAY_PIN, LOW);
  } else {
    digitalWrite(RELAY_PIN, HIGH);
  }
}

// ============================================
// FUNGSI NODE SERVER
// ============================================
void handleNodeServer() {
  WiFiClient client = nodeServer.available();

  if (client) {
    ledActivity = true;
    ledActivityTime = millis();
    digitalWrite(LED_PIN, LOW);

    if (!client.available()) {
      client.stop();
      return;
    }

    if (client.available()) {
      String request = client.readStringUntil('\r');

      if (request.indexOf("POST /restart-now/") != -1) {
        int startPos = request.indexOf("/restart-now/") + 13;
        int endPos = request.indexOf(" ", startPos);
        String requestedID = request.substring(startPos, endPos);

        if (requestedID == String(ESP_ID)) {
          client.stop();
          ESP.restart();

        } else {
          String response = "HTTP/1.1 403 Forbidden\r\n";
          response += "Content-Type: application/json\r\n\r\n";
          response += "{\"status\":\"error\",\"message\":\"Invalid node ID\",\"requestedID\":\"" + requestedID + "\",\"actualID\":\"" + String(ESP_ID) + "\"}";

          client.print(response);
        }
      } else if (request.indexOf("POST /Update-Now") != -1) {
        String response = "HTTP/1.1 200 OK\r\n";
        response += "Content-Type: application/json\r\n\r\n";
        response += "{\"status\":\"ok\",\"message\":\"Update triggered\"}";

        client.print(response);

        if (wifiConnected) {
          postDataToServer();
          getRelayStateFromServer();
        }
      } else if (request.indexOf("POST /server-feedback") != -1) {
        if (request.indexOf("server-side-good") != -1) {
          ledActivity = true;
          ledActivityTime = millis();
          digitalWrite(LED_PIN, LOW);
        }

        String response = "HTTP/1.1 200 OK\r\n";
        response += "Content-Type: application/json\r\n\r\n";
        response += "{\"status\":\"received\",\"nodeID\":\"" + String(ESP_ID) + "\"}";

        client.print(response);
        client.stop();
        return;
      } else {
        client.print("HTTP/1.1 404 Not Found\r\n\r\n");
      }
    }

    client.stop();
  }
}

void handleBootBlink(unsigned long currentMillis) {
  if (bootBlinkTransitions < BOOT_BLINK_TRANSITIONS) {
    if (currentMillis - bootBlinkLastToggle >= BOOT_BLINK_INTERVAL) {
      bootBlinkLastToggle = currentMillis;
      digitalWrite(STATUS_PIN, !digitalRead(STATUS_PIN));
      bootBlinkTransitions++;
    }
    return;
  }

  digitalWrite(STATUS_PIN, HIGH);
  pinMode(STATUS_PIN, INPUT);

  lastStableGpio3RawState = digitalRead(STATUS_PIN);
  updateDeviceStatus();
  lastPostedDeviceStatus = deviceStatus;
  statusPinReady = true;
}

// ============================================
// FUNGSI FEEDBACK BLINKING
// ============================================
void handleFeedbackBlinking(unsigned long currentMillis) {
  static unsigned long lastBlinkToggle = 0;
  static bool ledState = false;

  if (feedbackBlinkCount >= FEEDBACK_BLINK_COUNT * 2) {
    feedbackBlinking = false;
    feedbackBlinkCount = 0;
    if (!wifiLedOn && !ledActivity) {
      digitalWrite(LED_PIN, HIGH);
    }
    return;
  }

  if (currentMillis - lastBlinkToggle >= FEEDBACK_BLINK_DURATION) {
    lastBlinkToggle = currentMillis;
    ledState = !ledState;
    digitalWrite(LED_PIN, ledState ? LOW : HIGH);
    feedbackBlinkCount++;
  }
}

// ============================================
// FUNGSI LED INDICATOR
// ============================================
void handleLEDIndicator(unsigned long currentMillis) {
  if (!wifiConnected) {
    if (currentMillis - connectionStartTime < 3000) {
      digitalWrite(LED_PIN, LOW);
      return;
    }

    if (currentMillis - lastBlinkTime >= 120) {
      lastBlinkTime = currentMillis;
      digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    }
    return;
  }

  if (ledActivity) {
    if (currentMillis - ledActivityTime > 100) {
      ledActivity = false;
      digitalWrite(LED_PIN, HIGH);
    } else {
      digitalWrite(LED_PIN, LOW);
    }
    return;
  }

  digitalWrite(LED_PIN, HIGH);
}
