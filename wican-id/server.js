const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const publicDir = path.join(__dirname, 'public');

// Import middleware
const middleware = require('./middleware');

// Import routes
const routes = require('./routes');
const loginAPI = require('./api/login');
const globalConfig = require('./api/global-configuration');

// Import services
const services = require('./services');
const espServer = require('./ESP-Server');

function normalizeRequestPath(req) {
    const requestPath = (req.path || '/').replace(/\\/g, '/');
    if (!requestPath.startsWith('/')) return `/${requestPath}`;
    return requestPath;
}

function isPublicPath(requestPath) {
    if (requestPath === '/login.html') return true;
    if (requestPath === '/favicon.ico') return true;
    if (requestPath === '/WiCan-icon.png') return true;
    if (requestPath.startsWith('/error/')) return true;

    return false;
}

function isDevicePublicApi(req) {
    const requestPath = normalizeRequestPath(req);
    const method = (req.method || 'GET').toUpperCase();

    if (requestPath === '/health' || requestPath === '/api/health') return true;
    if (requestPath.startsWith('/login/') || requestPath.startsWith('/api/login/')) return true;

    // Endpoint yang dipakai perangkat ESP
    if (method === 'POST' && (requestPath.startsWith('/node-wifi/') || requestPath.startsWith('/api/node-wifi/'))) return true;
    if (method === 'GET' && (requestPath.startsWith('/node-relay/') || requestPath.startsWith('/api/node-relay/'))) return true;
    if (method === 'POST' && (requestPath.startsWith('/node-meta/') || requestPath.startsWith('/api/node-meta/'))) return true;

    return false;
}

// Baca konfigurasi server
async function loadServerConfig() {
    try {
        const configPath = path.join(__dirname, 'database', 'server-config', 'server.properties');
        const data = await fs.readFile(configPath, 'utf8');
        const config = {};
        data.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                config[key.trim()] = value.trim();
            }
        });
        return config;
    } catch (error) {
        // Jika file tidak ada, buat default
        const defaultConfig = {
            'server-port': '5050',
            'server-listen': '0.0.0.0'
        };
        
        // Buat folder server-config jika belum ada
        const serverConfigPath = path.join(__dirname, 'database', 'server-config');
        try {
            await fs.mkdir(serverConfigPath, { recursive: true });
            
            // Buat file server.properties dengan default config
            const configContent = `server-port=5050\nserver-listen=0.0.0.0\n`;
            await fs.writeFile(path.join(serverConfigPath, 'server.properties'), configContent);
            
            console.log('✅ Created default server.properties');
        } catch (error) {
            // Folder sudah ada
        }
        
        return defaultConfig;
    }
}

// Buat folder struktur jika belum ada
async function createInitialStructure() {
    try {
        // Buat folder public jika belum ada
        const publicPath = path.join(__dirname, 'public');
        try {
            await fs.mkdir(publicPath, { recursive: true });
            console.log('✅ Created public folder');
        } catch (error) {
            // Folder sudah ada
        }
        
        // Buat folder database/device jika belum ada
        const databasePath = path.join(__dirname, 'database', 'device');
        try {
            await fs.mkdir(databasePath, { recursive: true });
            console.log('✅ Created database/device folder');
        } catch (error) {
            // Folder sudah ada
        }
        
        // Buat folder database/template jika belum ada
        const templatePath = path.join(__dirname, 'database', 'template');
        try {
            await fs.mkdir(templatePath, { recursive: true });
            console.log('✅ Created database/template folder');
            
            // Buat file template default jika belum ada
            const templateCodePath = path.join(templatePath, 'ESP-01S.ino');
            try {
                await fs.access(templateCodePath);
            } catch (error) {
                // Template tidak ada, buat default
                const defaultTemplate = `/*
 * ESP-01S IoT Node Controller Template
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>

// ============================================
// KONFIGURASI AWAL - AKAN DIGANTI OTOMATIS
// ============================================
const char* WIFI_SSID = "";
const char* WIFI_PASSWORD = "";

const char* SERVER_IP = "";
const int SERVER_PORT = 5050;

const char* ESP_ID = "";
const int NODE_PORT = 8080;

// ============================================
// PIN DEFINITION
// ============================================
#define RELAY_PIN 0      // GPIO0 - Output ke Relay (Active HIGH)
#define LED_PIN 2        // GPIO2 - LED Internal (Active LOW)
#define STATUS_PIN 3     // GPIO3/RX - Input dengan PULL-DOWN

// ============================================
// VARIABEL GLOBAL
// ============================================
WiFiServer nodeServer(NODE_PORT);
String lastGpio3State = "";
unsigned long lastUpdateTime = 0;
const unsigned long UPDATE_INTERVAL = 60000;
bool wifiConnected = false;
unsigned long wifiReconnectAttempt = 0;
const unsigned long WIFI_RECONNECT_INTERVAL = 5000;

void setup() {
    Serial.begin(115200);
    Serial.println("\\n\\n=================================");
    Serial.println("ESP-01S IoT Node Starting...");
    Serial.println("=================================");

    pinMode(RELAY_PIN, OUTPUT);
    pinMode(LED_PIN, OUTPUT);
    pinMode(STATUS_PIN, INPUT_PULLDOWN_16);
    
    digitalWrite(RELAY_PIN, LOW);
    digitalWrite(LED_PIN, HIGH);

    connectToWiFi();
    nodeServer.begin();
    Serial.print("Node server started on port ");
    Serial.println(NODE_PORT);
    
    sendInitialDataToServer();
    
    Serial.println("=================================");
    Serial.println("Setup complete!");
    Serial.println("=================================");
}

void loop() {
    if (WiFi.status() != WL_CONNECTED) {
        handleWiFiDisconnection();
        return;
    }
    
    handleNodeServerClients();
    checkGpio3Status();
    
    if (millis() - lastUpdateTime > UPDATE_INTERVAL) {
        sendDataToServer();
        getRelayStatusFromServer();
        lastUpdateTime = millis();
    }
    
    updateLEDStatus();
    delay(100);
}

void connectToWiFi() {
    Serial.println("Connecting to WiFi...");
    Serial.print("SSID: ");
    Serial.println(WIFI_SSID);
    
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    unsigned long startTime = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startTime < 10000) {
        digitalWrite(LED_PIN, LOW);
        delay(100);
        digitalWrite(LED_PIN, HIGH);
        delay(100);
        Serial.print(".");
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\\nWiFi connected!");
        Serial.print("IP Address: ");
        Serial.println(WiFi.localIP());
        Serial.print("RSSI: ");
        Serial.println(WiFi.RSSI());
        
        digitalWrite(LED_PIN, LOW);
        delay(5000);
        digitalWrite(LED_PIN, HIGH);
        
        wifiConnected = true;
        wifiReconnectAttempt = 0;
    } else {
        Serial.println("\\nFailed to connect to WiFi!");
        wifiConnected = false;
    }
}

void handleWiFiDisconnection() {
    if (wifiConnected) {
        Serial.println("WiFi disconnected!");
        wifiConnected = false;
    }
    
    digitalWrite(LED_PIN, LOW);
    delay(100);
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    
    if (millis() - wifiReconnectAttempt > WIFI_RECONNECT_INTERVAL) {
        Serial.println("Attempting to reconnect to WiFi...");
        WiFi.disconnect();
        delay(100);
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
        wifiReconnectAttempt = millis();
    }
}

void sendInitialDataToServer() {
    if (WiFi.status() == WL_CONNECTED) {
        sendDataToServer();
        getRelayStatusFromServer();
    }
}

void sendDataToServer() {
    if (WiFi.status() != WL_CONNECTED) {
        return;
    }
    
    WiFiClient client;
    HTTPClient http;
    
    String serverURL = "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) + "/api/node-wifi/" + String(ESP_ID);
    
    http.begin(client, serverURL);
    http.addHeader("Content-Type", "application/json");
    
    String gpio3State = (digitalRead(STATUS_PIN) == HIGH) ? "high" : "low";
    
    StaticJsonDocument<200> doc;
    doc["wifiSSID"] = WiFi.SSID();
    doc["nodeIP"] = WiFi.localIP().toString();
    doc["wifiRSSI"] = WiFi.RSSI();
    doc["nodePort"] = NODE_PORT;
    doc["gpio3Status"] = gpio3State;
    
    String requestBody;
    serializeJson(doc, requestBody);
    
    Serial.print("Sending data to server: ");
    Serial.println(serverURL);
    Serial.print("Data: ");
    Serial.println(requestBody);
    
    digitalWrite(LED_PIN, LOW);
    
    int httpResponseCode = http.POST(requestBody);
    
    digitalWrite(LED_PIN, HIGH);
    
    if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.print("Server response code: ");
        Serial.println(httpResponseCode);
        Serial.print("Response: ");
        Serial.println(response);
    } else {
        Serial.print("Error sending data: ");
        Serial.println(httpResponseCode);
    }
    
    http.end();
}

void getRelayStatusFromServer() {
    if (WiFi.status() != WL_CONNECTED) {
        return;
    }
    
    WiFiClient client;
    HTTPClient http;
    
    String serverURL = "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) + "/api/node-relay/" + String(ESP_ID);
    
    http.begin(client, serverURL);
    
    digitalWrite(LED_PIN, LOW);
    
    int httpResponseCode = http.GET();
    
    digitalWrite(LED_PIN, HIGH);
    
    if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.print("Relay status response code: ");
        Serial.println(httpResponseCode);
        Serial.print("Response: ");
        Serial.println(response);
        
        StaticJsonDocument<100> doc;
        DeserializationError error = deserializeJson(doc, response);
        
        if (!error) {
            String relayState = doc["relayState"];
            
            if (relayState == "on") {
                digitalWrite(RELAY_PIN, HIGH);
                Serial.println("Relay turned ON");
            } else {
                digitalWrite(RELAY_PIN, LOW);
                Serial.println("Relay turned OFF");
            }
        } else {
            Serial.print("Failed to parse relay status: ");
            Serial.println(error.c_str());
        }
    } else {
        Serial.print("Error getting relay status: ");
        Serial.println(httpResponseCode);
    }
    
    http.end();
}

void handleNodeServerClients() {
    WiFiClient client = nodeServer.available();
    
    if (client) {
        Serial.println("New client connected to node server");
        
        String request = client.readStringUntil('\\r');
        Serial.print("Request: ");
        Serial.println(request);
        
        if (request.indexOf("POST /Update-Now") != -1) {
            client.println("HTTP/1.1 200 OK");
            client.println("Content-Type: application/json");
            client.println();
            client.println("{\\"status\\":\\"ok\\",\\"message\\":\\"Update triggered\\"}");
            
            Serial.println("Update-Now endpoint called, triggering server update...");
            sendDataToServer();
            getRelayStatusFromServer();
        }
        
        client.stop();
        Serial.println("Client disconnected");
    }
}

void checkGpio3Status() {
    String currentState = (digitalRead(STATUS_PIN) == HIGH) ? "high" : "low";
    
    if (currentState != lastGpio3State) {
        Serial.print("GPIO3 status changed: ");
        Serial.print(lastGpio3State);
        Serial.print(" -> ");
        Serial.println(currentState);
        
        lastGpio3State = currentState;
        sendDataToServer();
    }
}

void updateLEDStatus() {
    if (WiFi.status() == WL_CONNECTED) {
        // Normal: LED mati (kecuali saat ada aktivitas)
    } else {
        unsigned long currentMillis = millis();
        if (currentMillis % 1000 < 100) {
            digitalWrite(LED_PIN, LOW);
        } else {
            digitalWrite(LED_PIN, HIGH);
        }
    }
}`;
                
                await fs.writeFile(templateCodePath, defaultTemplate);
                console.log('✅ Created default ESP template');
            }
            
            // Buat file config default jika belum ada
            const defaultConfigPath = path.join(templatePath, 'ESP-default-config.properties');
            try {
                await fs.access(defaultConfigPath);
            } catch (error) {
                const defaultConfig = `# Default Configuration for ESP-01S Devices
# File: database/template/ESP-default-config.properties

# Server Configuration
server-ip=192.168.1.50
server-port=5050

# Node Configuration
node-port=8080

# WiFi Configuration
# Note: WiFi SSID and Password are set per device

# ESP Configuration
# Note: Device ID and custom name are set per device

# Default values are used when adding new devices
# These values can be overridden in the add-device form
`;
                
                await fs.writeFile(defaultConfigPath, defaultConfig);
                console.log('✅ Created default configuration');
            }
            
        } catch (error) {
            // Folder sudah ada
        }
        
        // Buat folder api jika belum ada
        const apiPath = path.join(__dirname, 'api');
        try {
            await fs.mkdir(apiPath, { recursive: true });
            console.log('✅ Created api folder');
        } catch (error) {
            // Folder sudah ada
        }
        
        // Buat folder mcu-tools jika belum ada
        const mcuToolsPath = path.join(__dirname, 'mcu-tools');
        try {
            await fs.mkdir(mcuToolsPath, { recursive: true });
            console.log('✅ Created mcu-tools folder');
            
            const mcuSubfolders = [
                'arduino-cli/sketch',
                'sketch-compiler',
                'bin'
            ];
            
            for (const folder of mcuSubfolders) {
                const folderPath = path.join(mcuToolsPath, folder);
                try {
                    await fs.mkdir(folderPath, { recursive: true });
                    console.log(`✅ Created mcu-tools/${folder}`);
                } catch (error) {
                    // Folder sudah ada
                }
            }
            
        } catch (error) {
            // Folder sudah ada
        }
        
        // Buat folder server-config jika belum ada
        const serverConfigPath = path.join(__dirname, 'database', 'server-config');
        try {
            await fs.mkdir(serverConfigPath, { recursive: true });
            console.log('✅ Created server-config folder');
            
            const nodePropsPath = path.join(serverConfigPath, 'node.properties');
            try {
                await fs.access(nodePropsPath);
            } catch (error) {
                const nodeProps = 'node-port=8080\n';
                await fs.writeFile(nodePropsPath, nodeProps);
                console.log('✅ Created node.properties');
            }

            const espServerPropsPath = path.join(serverConfigPath, 'ESP-Server.properties');
            try {
                await fs.access(espServerPropsPath);
            } catch (error) {
                const espServerProps = 'ESP-Port=5150\nESP-Listen=0.0.0.0\n';
                await fs.writeFile(espServerPropsPath, espServerProps);
                console.log('✅ Created ESP-Server.properties');
            }
            
        } catch (error) {
            // Folder sudah ada
        }
        
        console.log('✅ Folder structure initialized');
        
    } catch (error) {
        console.error('Error creating initial structure:', error);
    }
}

// Gunakan middleware
app.use(middleware);

// Proteksi API browser-facing
app.use('/api', async (req, res, next) => {
    try {
        if (isDevicePublicApi(req)) return next();

        const authenticated = await loginAPI.isAuthenticated(req);
        if (authenticated) return next();

        return res.status(401).json({
            success: false,
            error: 'Unauthorized'
        });
    } catch (error) {
        console.error('API auth middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Proteksi akses file dan halaman
app.use(async (req, res, next) => {
    try {
        const requestPath = normalizeRequestPath(req);

        if (requestPath.startsWith('/api/')) return next();
        if (isPublicPath(requestPath)) return next();

        const authenticated = await loginAPI.isAuthenticated(req);
        if (authenticated) return next();

        return res.redirect('/login.html');
    } catch (error) {
        console.error('Page auth middleware error:', error);
        const errorPage = path.join(publicDir, 'error', '500.html');
        return res.status(500).sendFile(errorPage);
    }
});

// Static files setelah auth middleware
app.use(express.static(publicDir, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        } else {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    }
}));

app.get('/favicon.ico', (req, res) => {
    res.redirect('/WiCan-icon.png');
});

// Gunakan routes
app.use('/', routes);

// Start server
async function startServer() {
    try {
        // Buat struktur folder
        await createInitialStructure();
        await globalConfig.syncGlobalConfig();
        await loginAPI.ensureStorage();
        
        const config = await loadServerConfig();
        const port = parseInt(config['server-port']) || 5050;
        const host = config['server-listen'] || '0.0.0.0';
        
        app.listen(port, host, () => {
            console.log('='.repeat(80));
            console.log('🚀 ESP-01S IoT Dashboard Server');
            console.log('='.repeat(80));
            console.log(`🌐 Server running at: http://${host}:${port}`);
            console.log(`📊 Dashboard available at: http://${host}:${port}/`);
            console.log(`➕ Add Device: http://${host}:${port}/add-device.html`);
            console.log(`📁 Serving static files from: ${path.join(__dirname, 'public')}`);
            console.log('='.repeat(80));
            
            console.log('\n📡 API Endpoints Groups:');
            
            console.log('\n🔧 DEVICE MANAGEMENT:');
            console.log('  GET  /api/dashboard                 - Get all device data');
            console.log('  POST /api/node-wifi/:nodeId         - Update WiFi data from ESP');
            console.log('  GET  /api/node-relay/:nodeId        - Get relay status for node');
            console.log('  POST /api/node-relay/:nodeId        - Update relay status for node');
            console.log('  POST /api/node-meta/:nodeId         - Update device metadata');
            
            console.log('\n🆕 ADD DEVICE SYSTEM:');
            console.log('  POST /api/add-device                - Add new device (Auto-Compile)');
            console.log('  GET  /api/default-config            - Get default configuration');
            console.log('  GET  /api/download-code/:deviceId   - Download ESP code');
            console.log('  GET  /api/code-preview/:deviceId    - Preview ESP code');
            console.log('  GET  /api/device-info/:deviceId     - Get device information');
            
            console.log('\n⚙️  MCU TOOLS SYSTEM (NEW):');
            console.log('  POST /api/sketch-mover              - Auto-compile ESP code');
            console.log('  GET  /api/download-binary/:deviceId - Download compiled binary');
            console.log('  GET  /api/check-compilation/:deviceId - Check compilation status');
            console.log('  POST /api/manual-compile/:deviceId  - Manual compilation trigger');
            console.log('  GET  /api/mcu-tools-status          - Check MCU tools status');
            
            console.log('\n🔍 CONTROL & MONITORING:');
            console.log('  GET  /api/scan-devices              - Scan for devices');
            console.log('  GET  /api/check-device-status/:nodeId - Check device status');
            console.log('  POST /api/control-device/:nodeId    - Control device');
            
            console.log('\n🛠️  UTILITY:');
            console.log('  GET  /api/time-date                 - Get current time and date');
            console.log('  GET  /api/server-info               - Get server information');
            console.log('  GET  /api/health                    - Health check');
            
            console.log('\n' + '='.repeat(80));
            console.log('\n⚙️  Server configuration:');
            console.log(`  Port: ${port}`);
            console.log(`  Listen: ${host}`);
            console.log('='.repeat(80));
            
            console.log('\n✨ New Features:');
            console.log('  ✅ Auto-compilation system with Arduino CLI');
            console.log('  ✅ Binary file generation (.bin)');
            console.log('  ✅ MCU Tools integration');
            console.log('  ✅ Health monitoring endpoints');
            
            console.log('\n🎯 Quick Links:');
            console.log(`  Dashboard: http://${host}:${port}/`);
            console.log(`  Add Device: http://${host}:${port}/add-device.html`);
            console.log(`  Health Check: http://${host}:${port}/api/health`);
            console.log(`  Test API: http://${host}:${port}/api/dashboard`);
            console.log('='.repeat(80));
            
            console.log('\n✅ Server started successfully!');
            console.log('📝 Place your HTML/CSS/JS files in the "public" folder');
            console.log('💾 Binary files will be generated in "database/device/{deviceId}/"');
            console.log('🛠️  MCU Tools folder: "mcu-tools/"');
        });

        // Start ESP-only server (separate port)
        try {
            espServer.startESPServer();
        } catch (error) {
            console.error('❌ Failed to start ESP-Server:', error.message);
        }
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
