const fs = require('fs').promises;
const path = require('path');
const http = require('http');

/**
 * ESP Restart All API
 * Endpoint: POST /api/esp-restart-all
 * 
 * Fungsi:
 * 1. Membaca port ESP dari database/server-config/node.properties
 * 2. Memindai semua folder di database/device/
 * 3. Untuk setiap device, baca ESPID dari meta.json dan ESPIP dari wifi.json
 * 4. Kirim restart command ke setiap ESP yang memiliki IP
 * 5. Kumpulkan hasil restart (sukses/gagal)
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

    console.log('\n' + '='.repeat(80));
    console.log('🔄 ESP RESTART ALL - Starting mass device restart');
    console.log('='.repeat(80));

    try {
        // Step 1: Baca konfigurasi port ESP dari node.properties
        console.log('\n📁 Step 1: Reading ESP port configuration...');
        const espPort = await readESPPort();
        console.log(`   ✅ ESP Port: ${espPort}`);

        // Step 2: Scan semua device folder
        console.log('\n📁 Step 2: Scanning device folders...');
        const devicesPath = path.join(__dirname, '..', 'database', 'device');
        
        let deviceFolders = [];
        try {
            deviceFolders = await fs.readdir(devicesPath);
            console.log(`   📂 Found ${deviceFolders.length} device folder(s)`);
        } catch (error) {
            console.log('   ❌ No device folders found or cannot access directory');
            deviceFolders = [];
        }

        // Step 3: Kumpulkan data setiap device
        console.log('\n📁 Step 3: Collecting device information...');
        const devices = [];
        
        for (const folderName of deviceFolders) {
            const devicePath = path.join(devicesPath, folderName);
            
            // Skip jika bukan folder
            try {
                const stat = await fs.stat(devicePath);
                if (!stat.isDirectory()) continue;
            } catch (error) {
                continue;
            }

            console.log(`\n   🔍 Processing device folder: ${folderName}`);
            
            // Baca meta.json untuk ESPID
            const metaPath = path.join(devicePath, 'meta.json');
            let espId = null;
            
            try {
                const metaData = await fs.readFile(metaPath, 'utf8');
                const metaJson = JSON.parse(metaData);
                espId = metaJson.ESPID || metaJson.nodeId || folderName;
                console.log(`      ✅ ESPID: ${espId}`);
            } catch (error) {
                console.log(`      ❌ Cannot read meta.json: ${error.message}`);
                // Fallback ke folder name sebagai ESPID
                espId = folderName;
                console.log(`      ⚠️  Using folder name as ESPID: ${espId}`);
            }

            // Baca wifi.json untuk ESPIP
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
                console.log(`      ✅ ESPIP: ${espIp || 'Not found'}`);
                console.log(`      📶 WiFi: ${wifiSSID || 'Unknown'} (${rssi || 'N/A'} dBm)`);
            } catch (error) {
                console.log(`      ❌ Cannot read wifi.json: ${error.message}`);
                espIp = null;
            }

            // Tambahkan ke daftar devices
            if (espId && espIp) {
                devices.push({
                    nodeId: folderName,
                    espId: espId,
                    espIp: espIp,
                    espPort: espPort,
                    wifiSSID: wifiSSID,
                    rssi: rssi,
                    folder: folderName
                });
                console.log(`      ✅ Device ready for restart: ${espId} @ ${espIp}:${espPort}`);
            } else {
                console.log(`      ⚠️  Device skipped - missing ESPID or ESPIP`);
                devices.push({
                    nodeId: folderName,
                    espId: espId,
                    espIp: null,
                    espPort: espPort,
                    wifiSSID: wifiSSID,
                    rssi: rssi,
                    folder: folderName,
                    skipped: true,
                    skipReason: !espId ? 'Missing ESPID' : 'Missing ESPIP'
                });
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log(`📊 Device Summary:`);
        console.log(`   Total devices found: ${devices.length}`);
        console.log(`   Devices with IP: ${devices.filter(d => d.espIp).length}`);
        console.log(`   Devices without IP: ${devices.filter(d => !d.espIp).length}`);
        console.log('='.repeat(80));

        // Step 4: Kirim restart command ke setiap device
        console.log('\n📁 Step 4: Sending restart commands...');
        
        const results = {
            total: devices.length,
            attempted: 0,
            success: 0,
            failed: 0,
            skipped: 0,
            devices: []
        };

        // Kirim restart secara berurutan (satu per satu)
        for (let i = 0; i < devices.length; i++) {
            const device = devices[i];
            
            console.log(`\n   [${i + 1}/${devices.length}] Processing: ${device.espId || device.nodeId}`);
            
            if (!device.espIp) {
                console.log(`      ⚠️  Skipped - No IP address`);
                results.skipped++;
                results.devices.push({
                    nodeId: device.nodeId,
                    espId: device.espId,
                    espIp: device.espIp,
                    status: 'skipped',
                    reason: device.skipReason || 'No IP address',
                    timestamp: new Date().toISOString()
                });
                continue;
            }

            // Kirim restart command
            results.attempted++;
            const restartRequestedAt = Date.now();
            const restartResult = await sendRestartCommand(device);
            let runningResult = {
                success: false,
                message: 'Restart command was not accepted',
                timeElapsed: 0
            };

            if (restartResult.success) {
                console.log(`      ⏳ Waiting running confirmation (max 60s)...`);
                const devicePath = path.join(__dirname, '..', 'database', 'device', device.nodeId);
                runningResult = await waitForRunningConfirmation(devicePath, restartRequestedAt, 60000);
            }
             
            if (restartResult.success && runningResult.success) {
                results.success++;
                console.log(`      ✅ Restart confirmed: ${runningResult.message}`);
            } else {
                results.failed++;
                console.log(`      ❌ Failed: ${restartResult.success ? runningResult.message : restartResult.message}`);
            }

            // Tambahkan hasil ke array devices
            const deviceSuccess = restartResult.success && runningResult.success;
            results.devices.push({
                nodeId: device.nodeId,
                espId: device.espId,
                espIp: device.espIp,
                espPort: device.espPort,
                wifiSSID: device.wifiSSID,
                rssi: device.rssi,
                status: deviceSuccess ? 'success' : 'failed',
                message: deviceSuccess ? 'Restart successful and running confirmed' : (restartResult.success ? runningResult.message : restartResult.message),
                restartResponse: restartResult.message,
                runningConfirmed: runningResult.success,
                runningMessage: runningResult.message,
                runningWaitMs: runningResult.timeElapsed || null,
                timestamp: new Date().toISOString()
            });
        }

        // Step 5: Siapkan response
        console.log('\n' + '='.repeat(80));
        console.log('📊 Restart Summary:');
        console.log(`   Total devices: ${results.total}`);
        console.log(`   Attempted: ${results.attempted}`);
        console.log(`   Successful: ${results.success}`);
        console.log(`   Failed: ${results.failed}`);
        console.log(`   Skipped: ${results.skipped}`);
        console.log('='.repeat(80));

        // Kirim response sukses
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            success: true,
            message: 'ESP restart process completed',
            timestamp: new Date().toISOString(),
            summary: {
                total: results.total,
                attempted: results.attempted,
                success: results.success,
                failed: results.failed,
                skipped: results.skipped
            },
            devices: results.devices
        }, null, 2));

        console.log('\n✅ ESP RESTART ALL - Process completed successfully!');
        console.log('='.repeat(80));

    } catch (error) {
        console.error('\n❌ ESP RESTART ALL - Error:', error);
        
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            success: false,
            error: 'Internal server error',
            message: error.message,
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
async function sendRestartCommand(device) {
    const url = `http://${device.espIp}:${device.espPort}/restart-now/${device.espId}`;
    
    console.log(`      📤 Sending POST to: ${url}`);
    
    return new Promise((resolve) => {
        // Parse URL untuk mendapatkan hostname dan port
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: 'POST',
            timeout: 5000, // 5 detik timeout
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': 0
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    // Parse response jika JSON
                    try {
                        const jsonResponse = JSON.parse(data);
                        resolve({
                            success: true,
                            statusCode: res.statusCode,
                            message: jsonResponse.message || 'Restart command accepted',
                            response: jsonResponse
                        });
                    } catch (e) {
                        // Response bukan JSON
                        resolve({
                            success: true,
                            statusCode: res.statusCode,
                            message: data || 'Restart command accepted',
                            response: data
                        });
                    }
                } else {
                    resolve({
                        success: false,
                        statusCode: res.statusCode,
                        message: `HTTP ${res.statusCode}: ${data || 'Unknown error'}`
                    });
                }
            });
        });

        req.on('error', (error) => {
            const isImmediateRestartDisconnect =
                error.code === 'ECONNRESET' ||
                error.code === 'ECONNABORTED' ||
                /socket hang up/i.test(error.message || '');

            if (isImmediateRestartDisconnect) {
                return resolve({
                    success: true,
                    message: 'Connection closed by ESP after restart command (treated as accepted)',
                    code: error.code
                });
            }

            resolve({
                success: false,
                message: `Connection error: ${error.message}`
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: true,
                message: 'No immediate HTTP response from ESP after restart command (treated as accepted)'
            });
        });

        // Kirim request tanpa body
        req.write('');
        req.end();
    });
}

/**
 * Wait for running confirmation from /server-info marker in meta.json
 */
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
