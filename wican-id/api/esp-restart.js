const fs = require('fs').promises;
const path = require('path');
const http = require('http');

/**
 * ESP Restart Individual API
 * Endpoint: POST /api/esp-restart/:deviceId
 * 
 * Fungsi:
 * 1. Menerima deviceId dari parameter URL
 * 2. Membaca port ESP dari database/server-config/node.properties
 * 3. Membaca folder device berdasarkan deviceId
 * 4. Baca ESPID dari meta.json dan ESPIP dari wifi.json
 * 5. Kirim restart command ke ESP yang dituju
 * 6. Kembalikan hasil restart (sukses/gagal)
 */

async function handleRequest(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }

    // Hanya menerima POST request
    if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            success: false,
            error: 'Method not allowed',
            message: 'Only POST method is allowed'
        }));
        return;
    }

    // Extract deviceId dari URL
    const urlParts = req.url.split('/');
    const deviceId = urlParts[urlParts.length - 1];

    if (!deviceId || deviceId === 'esp-restart') {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            success: false,
            error: 'Bad Request',
            message: 'Device ID is required. Usage: POST /api/esp-restart/{deviceId}'
        }));
        return;
    }

    console.log('\n' + '='.repeat(80));
    console.log(`🔄 ESP RESTART INDIVIDUAL - Starting restart for device: ${deviceId}`);
    console.log('='.repeat(80));

    try {
        // Step 1: Baca konfigurasi port ESP dari node.properties
        console.log('\n📁 Step 1: Reading ESP port configuration...');
        const espPort = await readESPPort();
        console.log(`   ✅ ESP Port: ${espPort}`);

        // Step 2: Cek apakah folder device exist
        console.log('\n📁 Step 2: Checking device folder...');
        const devicePath = path.join(__dirname, '..', 'database', 'device', deviceId);
        
        try {
            await fs.access(devicePath);
            console.log(`   ✅ Device folder found: ${deviceId}`);
        } catch (error) {
            console.log(`   ❌ Device folder not found: ${deviceId}`);
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                success: false,
                error: 'Device not found',
                message: `Device with ID ${deviceId} does not exist`,
                deviceId: deviceId
            }));
            return;
        }

        // Step 3: Baca meta.json untuk ESPID
        console.log('\n📁 Step 3: Reading device metadata...');
        const metaPath = path.join(devicePath, 'meta.json');
        let espId = null;
        let customName = null;
        
        try {
            const metaData = await fs.readFile(metaPath, 'utf8');
            const metaJson = JSON.parse(metaData);
            espId = metaJson.ESPID || metaJson.nodeId || deviceId;
            customName = metaJson.customName || metaJson.name || null;
            console.log(`   ✅ ESPID: ${espId}`);
            if (customName) console.log(`   📛 Custom Name: ${customName}`);
        } catch (error) {
            console.log(`   ❌ Cannot read meta.json: ${error.message}`);
            console.log(`   ⚠️  Using deviceId as ESPID: ${deviceId}`);
            espId = deviceId;
        }

        // Step 4: Baca wifi.json untuk ESPIP
        console.log('\n📁 Step 4: Reading network information...');
        const wifiPath = path.join(devicePath, 'wifi.json');
        let espIp = null;
        let wifiSSID = null;
        let rssi = null;
        
        try {
            const wifiData = await fs.readFile(wifiPath, 'utf8');
            const wifiJson = JSON.parse(wifiData);
            espIp = wifiJson.ESPIP;
            wifiSSID = wifiJson.WifiSSID || wifiJson.wifiSSID || null;
            rssi = wifiJson.rssi || wifiJson.RSSI || null;
            console.log(`   ✅ ESPIP: ${espIp || 'Not found'}`);
            if (wifiSSID) console.log(`   📶 WiFi: ${wifiSSID}`);
            if (rssi) console.log(`   📊 RSSI: ${rssi} dBm`);
        } catch (error) {
            console.log(`   ❌ Cannot read wifi.json: ${error.message}`);
            espIp = null;
        }

        // Step 5: Validasi IP Address
        if (!espIp) {
            console.log('\n❌ ESP IP address not found');
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                success: false,
                error: 'IP address not found',
                message: `Device ${deviceId} does not have a valid IP address. Device might be offline.`,
                deviceId: deviceId,
                espId: espId
            }));
            return;
        }

        // Step 6: Kirim restart command ke ESP
        console.log('\n📁 Step 5: Sending restart command...');
        const restartRequestedAt = Date.now();
        const restartResult = await sendRestartCommand(espId, espIp, espPort);
        let runningResult = {
            success: false,
            message: 'Restart command was not accepted',
            timeElapsed: 0
        };

        if (restartResult.success) {
            console.log('   ⏳ Waiting for "ESP Is Running" confirmation (max 60s)...');
            runningResult = await waitForRunningConfirmation(devicePath, restartRequestedAt, 60000);
        }
        
        // Step 7: Siapkan response
        console.log('\n' + '='.repeat(80));
        if (restartResult.success && runningResult.success) {
            console.log(`✅ ESP RESTART SUCCESSFUL - Device: ${espId}`);
            console.log(`   IP Address: ${espIp}:${espPort}`);
            console.log(`   Response: ${restartResult.message}`);
            console.log(`   Running confirmation: ${runningResult.message}`);
        } else {
            console.log(`❌ ESP RESTART FAILED - Device: ${espId}`);
            console.log(`   Error: ${restartResult.success ? runningResult.message : restartResult.message}`);
        }
        console.log('='.repeat(80));

        // Kirim response
        const overallSuccess = restartResult.success && runningResult.success;
        res.statusCode = overallSuccess ? 200 : 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            success: overallSuccess,
            message: overallSuccess ? 'Restart successful and ESP is running' : 'Restart confirmation failed',
            deviceId: deviceId,
            espId: espId,
            espIp: espIp,
            espPort: espPort,
            customName: customName,
            timestamp: new Date().toISOString(),
            details: {
                statusCode: restartResult.statusCode,
                response: restartResult.response || restartResult.message,
                timeElapsed: restartResult.timeElapsed || null,
                runningConfirmed: runningResult.success,
                runningMessage: runningResult.message,
                runningWaitMs: runningResult.timeElapsed || null
            }
        }, null, 2));

    } catch (error) {
        console.error('\n❌ ESP RESTART INDIVIDUAL - Error:', error);
        
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            success: false,
            error: 'Internal server error',
            message: error.message,
            deviceId: deviceId,
            timestamp: new Date().toISOString()
        }, null, 2));
    }
}

/**
 * Membaca port ESP dari node.properties
 */
async function readESPPort() {
    try {
        const nodePropsPath = path.join(__dirname, '..', 'database', 'server-config', 'node.properties');
        const data = await fs.readFile(nodePropsPath, 'utf8');
        
        // Parse file properties
        const lines = data.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const [key, value] = trimmedLine.split('=');
                if (key && key.trim() === 'node-port') {
                    return value.trim();
                }
            }
        }
        
        // Default port jika tidak ditemukan
        console.log('   ⚠️  node-port not found in node.properties, using default 8080');
        return '8080';
    } catch (error) {
        console.log('   ⚠️  Cannot read node.properties, using default port 8080');
        return '8080';
    }
}

/**
 * Mengirim restart command ke ESP
 */
async function sendRestartCommand(espId, espIp, espPort) {
    const url = `http://${espIp}:${espPort}/restart-now/${espId}`;
    const startTime = Date.now();
    
    console.log(`      📤 Sending POST to: ${url}`);
    
    return new Promise((resolve) => {
        // Parse URL untuk mendapatkan hostname dan port
        let urlObj;
        try {
            urlObj = new URL(url);
        } catch (error) {
            return resolve({
                success: false,
                message: `Invalid URL: ${error.message}`,
                timeElapsed: Date.now() - startTime
            });
        }
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: 'POST',
            timeout: 8000, // 8 detik timeout (lebih lama untuk single device)
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': 0,
                'User-Agent': 'ESP-Server-Restart/1.0'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                const timeElapsed = Date.now() - startTime;
                
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    // Parse response jika JSON
                    try {
                        const jsonResponse = JSON.parse(data);
                        resolve({
                            success: true,
                            statusCode: res.statusCode,
                            message: jsonResponse.message || 'Restart command accepted',
                            response: jsonResponse,
                            timeElapsed: timeElapsed
                        });
                    } catch (e) {
                        // Response bukan JSON
                        resolve({
                            success: true,
                            statusCode: res.statusCode,
                            message: data || 'Restart command accepted',
                            response: data,
                            timeElapsed: timeElapsed
                        });
                    }
                } else {
                    resolve({
                        success: false,
                        statusCode: res.statusCode,
                        message: `HTTP ${res.statusCode}: ${data || 'Unknown error'}`,
                        timeElapsed: timeElapsed
                    });
                }
            });
        });

        req.on('error', (error) => {
            const timeElapsed = Date.now() - startTime;
            const isImmediateRestartDisconnect =
                error.code === 'ECONNRESET' ||
                error.code === 'ECONNABORTED' ||
                /socket hang up/i.test(error.message || '');

            if (isImmediateRestartDisconnect) {
                return resolve({
                    success: true,
                    message: 'Connection closed by ESP after restart command (treated as accepted)',
                    code: error.code,
                    timeElapsed: timeElapsed
                });
            }
            
            let errorMessage = error.message;
            if (error.code === 'ECONNREFUSED') {
                errorMessage = 'Connection refused - ESP is offline or port is closed';
            } else if (error.code === 'ETIMEDOUT') {
                errorMessage = 'Connection timed out - ESP not responding';
            } else if (error.code === 'ENOTFOUND') {
                errorMessage = 'Host not found - Invalid IP address';
            }
            
            resolve({
                success: false,
                message: `Connection error: ${errorMessage}`,
                code: error.code,
                timeElapsed: timeElapsed
            });
        });

        req.on('timeout', () => {
            req.destroy();
            const timeElapsed = Date.now() - startTime;
            resolve({
                success: true,
                message: 'No immediate HTTP response from ESP after restart command (treated as accepted)',
                timeElapsed: timeElapsed
            });
        });

        // Kirim request tanpa body
        req.write('');
        req.end();
    });
}

async function waitForRunningConfirmation(devicePath, restartRequestedAt, timeoutMs) {
    const startTime = Date.now();
    const deadline = startTime + timeoutMs;
    const metaPath = path.join(devicePath, 'meta.json');

    while (Date.now() < deadline) {
        try {
            const raw = await fs.readFile(metaPath, 'utf8');
            const meta = JSON.parse(raw);
            const runningMessage = meta.lastRunningMessage;
            const runningAtRaw = meta.lastRunningMessageAt;
            const runningAt = runningAtRaw ? Date.parse(runningAtRaw) : NaN;
            const isFresh = Number.isFinite(runningAt) && runningAt >= restartRequestedAt;

            if (runningMessage === 'ESP Is Running' && isFresh) {
                return {
                    success: true,
                    message: 'ESP Is Running confirmed from server-info',
                    timeElapsed: Date.now() - startTime
                };
            }
        } catch (_) {
            // Keep polling until timeout
        }

        await sleep(1000);
    }

    return {
        success: false,
        message: 'Timeout waiting ESP Is Running confirmation (60s)',
        timeElapsed: Date.now() - startTime
    };
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    handleRequest
};
