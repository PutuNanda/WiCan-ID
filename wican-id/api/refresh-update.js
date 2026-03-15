// File: api/refresh-update.js
const fs = require('fs').promises;
const path = require('path');
const http = require('http');

// Track active requests
const activeRequests = new Map();
const requestTimeouts = new Map();

async function handleRequest(req, res) {
    console.log(`[${new Date().toISOString()}] 🔄 REFRESH-UPDATE API called`);
    
    try {
        // Hanya menerima method POST
        if (req.method !== 'POST') {
            return res.status(405).json({ 
                success: false, 
                error: 'Method not allowed. Use POST.' 
            });
        }

        // Baca konfigurasi untuk mendapatkan port node
        const nodePort = await getNodePort();
        
        // Dapatkan semua device ID dari folder database/device
        const devices = await getAllDevices();
        
        if (devices.length === 0) {
            return res.json({
                success: true,
                message: 'No devices found',
                totalDevices: 0,
                results: []
            });
        }

        console.log(`[${new Date().toISOString()}] 📋 Found ${devices.length} devices to refresh`);

        // Kirim Update-Now ke semua device secara paralel
        const results = await Promise.allSettled(
            devices.map(device => sendUpdateNowBurst(device, nodePort))
        );

        // Format hasil
        const refreshResults = [];
        const successful = [];
        const failed = [];

        devices.forEach((device, index) => {
            const result = results[index];
            const status = result.status === 'fulfilled' ? result.value : { 
                success: false, 
                error: result.reason?.message || 'Unknown error' 
            };
            
            refreshResults.push({
                deviceId: device.deviceId,
                ipAddress: device.ipAddress,
                status: status.success ? 'success' : 'failed',
                message: status.message || status.error,
                responseTime: status.responseTime
            });

            if (status.success) {
                successful.push(device.deviceId);
            } else {
                failed.push(device.deviceId);
            }
        });

        // Bersihkan timeout yang masih ada
        cleanupTimeouts();

        const response = {
            success: true,
            timestamp: new Date().toISOString(),
            summary: {
                total: devices.length,
                successful: successful.length,
                failed: failed.length
            },
            results: refreshResults,
            successful,
            failed
        };

        console.log(`[${new Date().toISOString()}] ✅ Refresh update completed: ${successful.length} success, ${failed.length} failed`);
        
        res.json(response);

    } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Error in refresh-update:`, error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            message: error.message 
        });
    }
}

// Fungsi untuk mendapatkan semua device dan IP mereka
async function getAllDevices() {
    const devicesPath = path.join(__dirname, '..', 'database', 'device');
    const devices = [];

    try {
        // Baca semua folder di database/device
        const deviceFolders = await fs.readdir(devicesPath);
        
        for (const folder of deviceFolders) {
            const devicePath = path.join(devicesPath, folder);
            
            // Cek apakah ini folder (bukan file)
            try {
                const stat = await fs.stat(devicePath);
                if (!stat.isDirectory()) continue;
            } catch (error) {
                continue;
            }

            // Baca wifi.json untuk mendapatkan IP
            const wifiPath = path.join(devicePath, 'wifi.json');
            
            try {
                const wifiContent = await fs.readFile(wifiPath, 'utf8');
                const wifiData = JSON.parse(wifiContent);
                
                // Validasi ESPIP
                if (wifiData.ESPIP && wifiData.ESPIP.trim() !== '') {
                    devices.push({
                        deviceId: folder,
                        ipAddress: wifiData.ESPIP.trim()
                    });
                } else {
                    console.log(`[${new Date().toISOString()}] ⚠️ Device ${folder} has no IP address`);
                }
            } catch (error) {
                console.log(`[${new Date().toISOString()}] ⚠️ Could not read wifi.json for ${folder}:`, error.message);
            }
        }

        return devices;

    } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Error reading devices:`, error);
        return [];
    }
}

// Fungsi untuk mendapatkan port node dari konfigurasi
async function getNodePort() {
    const nodePropsPath = path.join(__dirname, '..', 'database', 'server-config', 'node.properties');
    
    try {
        const content = await fs.readFile(nodePropsPath, 'utf8');
        const lines = content.split('\n');
        
        for (const line of lines) {
            const [key, value] = line.split('=');
            if (key && key.trim() === 'node-port') {
                return parseInt(value.trim()) || 8080;
            }
        }
        
        return 8080; // Default port
    } catch (error) {
        console.log(`[${new Date().toISOString()}] ⚠️ Could not read node.properties, using default port 8080`);
        return 8080;
    }
}

// Fungsi untuk mengirim Update-Now ke satu device
function sendUpdateNow(device, nodePort) {
    return new Promise((resolve, reject) => {
        const deviceId = device.deviceId;
        const ipAddress = device.ipAddress;
        const startTime = Date.now();

        // Cek apakah sudah ada request aktif untuk device ini
        if (activeRequests.has(deviceId)) {
            return reject(new Error(`Request already in progress for ${deviceId}`));
        }

        const postData = JSON.stringify({
            command: 'refresh-update',
            timestamp: new Date().toISOString(),
            deviceId: deviceId,
            source: 'global-refresh'
        });

        const options = {
            hostname: ipAddress,
            port: nodePort,
            path: '/Update-Now',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'X-Refresh-Source': 'global-update'
            },
            timeout: 10000 // 10 detik timeout per device
        };

        console.log(`[${new Date().toISOString()}] 📤 Sending Update-Now to ${deviceId} (${ipAddress}:${nodePort})`);

        const req = http.request(options, (response) => {
            let responseData = '';

            response.on('data', (chunk) => {
                responseData += chunk;
            });

            response.on('end', () => {
                const responseTime = Date.now() - startTime;
                
                // Hapus dari active requests
                activeRequests.delete(deviceId);
                
                // Clear timeout
                const timeout = requestTimeouts.get(deviceId);
                if (timeout) {
                    clearTimeout(timeout);
                    requestTimeouts.delete(deviceId);
                }

                const result = {
                    success: response.statusCode >= 200 && response.statusCode < 300,
                    deviceId: deviceId,
                    ipAddress: ipAddress,
                    statusCode: response.statusCode,
                    responseTime: responseTime,
                    message: `HTTP ${response.statusCode}`
                };

                if (result.success) {
                    console.log(`[${new Date().toISOString()}] ✅ ${deviceId} responded in ${responseTime}ms`);
                    
                    // Coba parse response jika ada
                    try {
                        if (responseData) {
                            const parsed = JSON.parse(responseData);
                            result.response = parsed;
                        }
                    } catch (e) {
                        // Ignore parsing errors
                    }
                } else {
                    console.log(`[${new Date().toISOString()}] ❌ ${deviceId} failed with status ${response.statusCode}`);
                }

                resolve(result);
            });
        });

        req.on('error', (error) => {
            const responseTime = Date.now() - startTime;
            
            // Hapus dari active requests
            activeRequests.delete(deviceId);
            
            // Clear timeout
            const timeout = requestTimeouts.get(deviceId);
            if (timeout) {
                clearTimeout(timeout);
                requestTimeouts.delete(deviceId);
            }

            console.error(`[${new Date().toISOString()}] ❌ Error sending to ${deviceId}:`, error.message);

            reject({
                success: false,
                deviceId: deviceId,
                ipAddress: ipAddress,
                error: error.message,
                responseTime: responseTime
            });
        });

        req.on('timeout', () => {
            const responseTime = Date.now() - startTime;
            
            console.error(`[${new Date().toISOString()}] ⏱️ Timeout for ${deviceId} after ${responseTime}ms`);
            
            req.destroy();
            
            // Hapus dari active requests
            activeRequests.delete(deviceId);
            
            // Clear timeout
            const timeout = requestTimeouts.get(deviceId);
            if (timeout) {
                clearTimeout(timeout);
                requestTimeouts.delete(deviceId);
            }

            reject({
                success: false,
                deviceId: deviceId,
                ipAddress: ipAddress,
                error: 'Request timeout after 10 seconds',
                responseTime: responseTime
            });
        });

        // Track active request
        activeRequests.set(deviceId, req);
        
        // Set timeout tracking
        const timeoutId = setTimeout(() => {
            if (activeRequests.has(deviceId)) {
                console.log(`[${new Date().toISOString()}] ⚠️ Force timeout for ${deviceId}`);
                req.destroy();
            }
        }, 15000); // 15 detik maksimal total
        
        requestTimeouts.set(deviceId, timeoutId);

        req.write(postData);
        req.end();
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Kirim Update-Now burst: 10x cepat, jeda 500ms sebelum attempt ke-10
async function sendUpdateNowBurst(device, nodePort) {
    const attempts = 10;
    const slowBeforeLastMs = 500;
    const attemptResults = [];
    const startTime = Date.now();

    for (let i = 1; i <= attempts; i++) {
        if (i === attempts) {
            await sleep(slowBeforeLastMs);
        }
        try {
            const result = await sendUpdateNow(device, nodePort);
            attemptResults.push(result);
        } catch (error) {
            attemptResults.push({
                success: false,
                error: error.message || 'Unknown error',
                statusCode: 0
            });
        }
    }

    const totalTime = Date.now() - startTime;
    const successCount = attemptResults.filter(r => r && r.success).length;
    const lastResult = attemptResults[attemptResults.length - 1] || {};

    return {
        success: successCount > 0,
        deviceId: device.deviceId,
        ipAddress: device.ipAddress,
        statusCode: lastResult.statusCode || 0,
        responseTime: totalTime,
        message: `Burst done: ${successCount}/${attempts} ok`
    };
}

// Fungsi untuk membersihkan semua timeout
function cleanupTimeouts() {
    for (const [deviceId, timeout] of requestTimeouts.entries()) {
        clearTimeout(timeout);
    }
    requestTimeouts.clear();
    
    for (const [deviceId, req] of activeRequests.entries()) {
        req.destroy();
    }
    activeRequests.clear();
}

// Fungsi untuk mendapatkan status refresh
async function getRefreshStatus(deviceId) {
    if (deviceId) {
        return {
            deviceId: deviceId,
            active: activeRequests.has(deviceId)
        };
    }
    
    const status = {};
    for (const [deviceId, req] of activeRequests.entries()) {
        status[deviceId] = {
            active: true,
            timestamp: new Date().toISOString()
        };
    }
    
    return {
        activeRequests: activeRequests.size,
        devices: status
    };
}

module.exports = {
    handleRequest,
    getRefreshStatus,
    cleanupTimeouts
};
