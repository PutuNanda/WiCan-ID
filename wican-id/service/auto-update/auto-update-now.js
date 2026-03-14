/**
 * auto-update-now.js
 * 
 * Service yang berjalan di background untuk memantau perubahan relay.json
 * dan langsung mengirim Update-Now ke ESP secara realtime.
 * 
 * Location: /service/auto-update/auto-update-now.js
 */

const fs = require('fs').promises;
const path = require('path');
const http = require('http');

// ============================================
// KONFIGURASI
// ============================================
const CHECK_INTERVAL = 500; // 500ms untuk realtime monitoring
const NEW_DEVICE_SCAN_INTERVAL = 10000; // 10 detik untuk scan device baru
const UPDATE_TIMEOUT = 20000; // 20 detik timeout untuk Update-Now
const HTTP_TIMEOUT = 19000; // 19 detik timeout HTTP (sedikit kurang dari UPDATE_TIMEOUT)

// Map untuk menyimpan watchers aktif
const relayWatchers = new Map();
// Map untuk menyimpan status file terakhir
const fileContents = new Map();
// Map untuk menyimpan timeout
const nodeTimeouts = new Map();
// Flag untuk status service
let isRunning = false;

// ============================================
// FUNGSI UTAMA: START SERVICE
// ============================================
async function startAutoUpdateNow() {
    if (isRunning) {
        console.log(`[${new Date().toISOString()}] ⚠️ Auto-Update-Now service already running`);
        return;
    }

    console.log(`[${new Date().toISOString()}] 🚀 Starting Auto-Update-Now service...`);
    console.log(`[${new Date().toISOString()}] 📋 Monitoring relay.json files in realtime`);
    
    isRunning = true;
    
    try {
        // Mulai monitoring semua device
        await startMonitoringAllDevices();
        
        console.log(`[${new Date().toISOString()}] ✅ Auto-Update-Now service started successfully`);
        console.log(`[${new Date().toISOString()}] 👁️  Monitoring ${relayWatchers.size} devices`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Failed to start Auto-Update-Now:`, error.message);
        isRunning = false;
    }
}

// ============================================
// FUNGSI: STOP SERVICE
// ============================================
async function stopAutoUpdateNow() {
    console.log(`[${new Date().toISOString()}] 🛑 Stopping Auto-Update-Now service...`);
    
    // Bersihkan semua watchers
    cleanupAll();
    
    isRunning = false;
    console.log(`[${new Date().toISOString()}] ✅ Auto-Update-Now service stopped`);
}

// ============================================
// FUNGSI: MULAI MONITORING SEMUA DEVICE
// ============================================
async function startMonitoringAllDevices() {
    const devicesPath = path.join(__dirname, '..', '..', 'database', 'device');
    
    try {
        // Cek apakah folder device ada
        await fs.access(devicesPath);
        
        // Baca semua folder device
        const devices = await fs.readdir(devicesPath);
        
        for (const deviceId of devices) {
            // Cek apakah ini folder (bukan file)
            const devicePath = path.join(devicesPath, deviceId);
            const stat = await fs.stat(devicePath);
            
            if (stat.isDirectory()) {
                await startWatchingDevice(deviceId);
            }
        }
        
        // Mulai monitoring untuk device baru
        monitorNewDevices(devicesPath);
        
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Failed to access devices folder:`, error.message);
        throw error;
    }
}

// ============================================
// FUNGSI: MONITOR DEVICE BARU
// ============================================
async function monitorNewDevices(devicesPath) {
    // Hanya jalankan jika service masih running
    if (!isRunning) return;
    
    // Scan setiap interval untuk device baru
    setInterval(async () => {
        if (!isRunning) return;
        
        try {
            const devices = await fs.readdir(devicesPath);
            
            for (const deviceId of devices) {
                const devicePath = path.join(devicesPath, deviceId);
                const stat = await fs.stat(devicePath);
                
                if (stat.isDirectory() && !relayWatchers.has(deviceId)) {
                    console.log(`[${new Date().toISOString()}] 🆕 New device detected: ${deviceId}`);
                    await startWatchingDevice(deviceId);
                }
            }
        } catch (error) {
            // Abaikan error, jangan sampai crash
            console.error(`[${new Date().toISOString()}] ⚠️ Error scanning for new devices:`, error.message);
        }
    }, NEW_DEVICE_SCAN_INTERVAL);
}

// ============================================
// FUNGSI: MULAI MONITORING SATU DEVICE
// ============================================
async function startWatchingDevice(deviceId) {
    const relayFilePath = path.join(__dirname, '..', '..', 'database', 'device', deviceId, 'relay.json');
    
    try {
        // Cek apakah file relay.json ada
        await fs.access(relayFilePath);
        
        console.log(`[${new Date().toISOString()}] 👁️  Monitoring device: ${deviceId}`);
        
        // Baca konten awal
        try {
            const content = await fs.readFile(relayFilePath, 'utf8');
            fileContents.set(deviceId, content);
        } catch (readError) {
            fileContents.set(deviceId, '');
        }
        
        // Mulai monitoring loop untuk device ini
        const watcherId = setInterval(async () => {
            await checkRelayFile(deviceId, relayFilePath);
        }, CHECK_INTERVAL);
        
        // Simpan watcher
        relayWatchers.set(deviceId, {
            filePath: relayFilePath,
            intervalId: watcherId
        });
        
    } catch (error) {
        // File relay.json belum ada, kita akan coba lagi nanti
        if (error.code === 'ENOENT') {
            console.log(`[${new Date().toISOString()}] ⏳ Waiting for relay.json: ${deviceId}`);
            
            // Tetap catat device untuk monitoring nanti dengan interval lebih lambat
            const watcherId = setInterval(async () => {
                try {
                    await fs.access(relayFilePath);
                    console.log(`[${new Date().toISOString()}] ✅ relay.json created: ${deviceId}`);
                    
                    // Hentikan interval lambat ini
                    clearInterval(watcherId);
                    
                    // Mulai monitoring normal
                    await startWatchingDevice(deviceId);
                    
                } catch (err) {
                    // File masih belum ada, abaikan
                }
            }, 5000); // Cek setiap 5 detik untuk file baru
            
            relayWatchers.set(deviceId, {
                filePath: relayFilePath,
                intervalId: watcherId,
                waiting: true
            });
        } else {
            console.error(`[${new Date().toISOString()}] ❌ Error monitoring ${deviceId}:`, error.message);
        }
    }
}

// ============================================
// FUNGSI: CEK PERUBAHAN RELAY.JSON
// ============================================
async function checkRelayFile(deviceId, filePath) {
    // Skip jika service sudah berhenti
    if (!isRunning) return;
    
    try {
        // Baca file
        const content = await fs.readFile(filePath, 'utf8');
        
        // Dapatkan konten sebelumnya
        const previousContent = fileContents.get(deviceId);
        
        // Jika berubah
        if (content !== previousContent) {
            console.log(`[${new Date().toISOString()}] 🔄 relay.json changed for ${deviceId}`);
            
            // Update konten terakhir
            fileContents.set(deviceId, content);
            
            // Langsung trigger Update-Now
            await triggerUpdateNow(deviceId);
        }
        
    } catch (error) {
        // Jika file tidak ditemukan, hapus dari monitoring
        if (error.code === 'ENOENT') {
            console.log(`[${new Date().toISOString()}] 🗑️ relay.json deleted for ${deviceId}`);
            
            // Hapus dari fileContents
            fileContents.delete(deviceId);
            
            // Hentikan monitoring untuk device ini
            const watcher = relayWatchers.get(deviceId);
            if (watcher) {
                clearInterval(watcher.intervalId);
                relayWatchers.delete(deviceId);
            }
            
            // Batalkan timeout jika ada
            cancelNodeTimeout(deviceId);
        } else {
            // Error lain, log tapi jangan crash
            console.error(`[${new Date().toISOString()}] ⚠️ Error reading ${deviceId}:`, error.message);
        }
    }
}

// ============================================
// FUNGSI: TRIGGER UPDATE-NOW KE ESP
// ============================================
async function triggerUpdateNow(deviceId) {
    console.log(`[${new Date().toISOString()}] 🚀 Triggering Update-Now for: ${deviceId}`);
    
    // Batalkan timeout sebelumnya jika ada
    cancelNodeTimeout(deviceId);
    
    // Set timeout baru untuk offline detection
    const offlineTimeout = setTimeout(async () => {
        console.log(`[${new Date().toISOString()}] ⏰ TIMEOUT ${UPDATE_TIMEOUT/1000}s: ${deviceId} -> No response`);
        nodeTimeouts.delete(deviceId);
    }, UPDATE_TIMEOUT);
    
    nodeTimeouts.set(deviceId, offlineTimeout);
    
    try {
        // Baca node-port dari node.properties
        const nodePort = await getNodePort();
        
        // Baca wifi.json untuk mendapatkan IP
        const wifiFilePath = path.join(__dirname, '..', '..', 'database', 'device', deviceId, 'wifi.json');
        
        try {
            const wifiContent = await fs.readFile(wifiFilePath, 'utf8');
            const wifiData = JSON.parse(wifiContent);
            
            // Validasi IP
            if (!wifiData.ESPIP || wifiData.ESPIP.trim() === '') {
                console.log(`[${new Date().toISOString()}] ⚠️ Cannot trigger Update-Now for ${deviceId}: ESPIP not set`);
                cancelNodeTimeout(deviceId);
                return;
            }
            
            // Validasi format IP sederhana
            if (!isValidIP(wifiData.ESPIP)) {
                console.log(`[${new Date().toISOString()}] ⚠️ Invalid ESPIP for ${deviceId}: ${wifiData.ESPIP}`);
                cancelNodeTimeout(deviceId);
                return;
            }
            
            // Kirim request ke ESP
            await sendUpdateRequest(deviceId, wifiData.ESPIP, nodePort);
            
        } catch (error) {
            console.error(`[${new Date().toISOString()}] ❌ Failed to read wifi.json for ${deviceId}:`, error.message);
            cancelNodeTimeout(deviceId);
        }
        
    } catch (error) {
        console.error(`[${new Date().toISOString()}] 💥 Error in triggerUpdateNow for ${deviceId}:`, error.message);
        cancelNodeTimeout(deviceId);
    }
}

// ============================================
// FUNGSI: DAPATKAN NODE PORT
// ============================================
async function getNodePort() {
    const nodePropsPath = path.join(__dirname, '..', '..', 'database', 'server-config', 'node.properties');
    let nodePort = 8080; // Default
    
    try {
        const propsContent = await fs.readFile(nodePropsPath, 'utf8');
        const lines = propsContent.split('\n');
        
        for (const line of lines) {
            const [key, value] = line.split('=');
            if (key && key.trim() === 'node-port') {
                nodePort = parseInt(value.trim());
                break;
            }
        }
    } catch (error) {
        // File tidak ada, buat default
        try {
            const dir = path.dirname(nodePropsPath);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(nodePropsPath, 'node-port=8080\n');
            console.log(`[${new Date().toISOString()}] 📝 Created default node.properties`);
        } catch (writeError) {
            // Abaikan error
        }
    }
    
    return nodePort;
}

// ============================================
// FUNGSI: KIRIM REQUEST KE ESP
// ============================================
function sendUpdateRequest(deviceId, espIP, port) {
    return new Promise((resolve) => {
        const postData = JSON.stringify({
            command: 'update',
            timestamp: new Date().toISOString(),
            nodeId: deviceId,
            source: 'auto-update-now'
        });

        const options = {
            hostname: espIP,
            port: port,
            path: '/Update-Now',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: HTTP_TIMEOUT
        };

        console.log(`[${new Date().toISOString()}] 📤 Sending Update-Now to ${espIP}:${port} for ${deviceId}`);

        const req = http.request(options, (response) => {
            // ESP merespons, batalkan timeout
            cancelNodeTimeout(deviceId);
            
            let responseData = '';
            
            response.on('data', (chunk) => {
                responseData += chunk;
            });
            
            response.on('end', () => {
                console.log(`[${new Date().toISOString()}] ✅ Update-Now SUCCESS for ${deviceId}: HTTP ${response.statusCode}`);
                resolve({
                    success: true,
                    deviceId,
                    statusCode: response.statusCode,
                    response: responseData
                });
            });
        });

        req.on('error', (error) => {
            console.error(`[${new Date().toISOString()}] ❌ Update-Now FAILED for ${deviceId}:`, error.message);
            // Biarkan timeout yang handle
            resolve({
                success: false,
                deviceId,
                error: error.message
            });
        });

        req.on('timeout', () => {
            console.error(`[${new Date().toISOString()}] ⏱️ Update-Now TIMEOUT for ${deviceId} (${HTTP_TIMEOUT/1000}s)`);
            req.destroy();
            resolve({
                success: false,
                deviceId,
                error: 'timeout'
            });
        });

        req.write(postData);
        req.end();
    });
}

// ============================================
// FUNGSI: VALIDASI IP SEDERHANA
// ============================================
function isValidIP(ip) {
    // Pattern IP sederhana
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(ip)) return false;
    
    // Validasi angka
    const parts = ip.split('.');
    for (const part of parts) {
        const num = parseInt(part, 10);
        if (num < 0 || num > 255) return false;
    }
    
    return true;
}

// ============================================
// FUNGSI: BATALKAN TIMEOUT
// ============================================
function cancelNodeTimeout(deviceId) {
    const timeout = nodeTimeouts.get(deviceId);
    if (timeout) {
        clearTimeout(timeout);
        nodeTimeouts.delete(deviceId);
        console.log(`[${new Date().toISOString()}] ⏹️ Cancelled timeout for ${deviceId}`);
    }
}

// ============================================
// FUNGSI: CLEANUP SEMUA RESOURCE
// ============================================
function cleanupAll() {
    console.log(`[${new Date().toISOString()}] 🧹 Cleaning up all resources...`);
    
    // Hentikan semua interval
    for (const [deviceId, watcher] of relayWatchers.entries()) {
        if (watcher.intervalId) {
            clearInterval(watcher.intervalId);
        }
    }
    relayWatchers.clear();
    
    // Bersihkan semua timeout
    for (const [deviceId, timeout] of nodeTimeouts.entries()) {
        clearTimeout(timeout);
    }
    nodeTimeouts.clear();
    
    // Bersihkan file contents
    fileContents.clear();
    
    console.log(`[${new Date().toISOString()}] ✅ Cleanup complete`);
}

// ============================================
// FUNGSI: DAPATKAN STATUS SERVICE
// ============================================
function getServiceStatus() {
    return {
        isRunning,
        monitoredDevices: Array.from(relayWatchers.keys()),
        deviceCount: relayWatchers.size,
        pendingTimeouts: Array.from(nodeTimeouts.keys()),
        timeoutCount: nodeTimeouts.size,
        timestamp: new Date().toISOString()
    };
}

// ============================================
// FUNGSI: MANUAL TRIGGER UNTUK TESTING
// ============================================
async function manualTrigger(deviceId) {
    if (!deviceId) {
        return {
            success: false,
            error: 'Device ID required'
        };
    }
    
    if (!relayWatchers.has(deviceId)) {
        return {
            success: false,
            error: 'Device not monitored'
        };
    }
    
    console.log(`[${new Date().toISOString()}] 👆 Manual trigger for ${deviceId}`);
    await triggerUpdateNow(deviceId);
    
    return {
        success: true,
        message: 'Manual trigger sent',
        deviceId
    };
}

// ============================================
// HANDLE UNCAUGHT EXCEPTIONS
// ============================================
process.on('uncaughtException', (error) => {
    console.error(`[${new Date().toISOString()}] 💥 Uncaught Exception in auto-update-now:`, error);
    // Jangan crash, tetap jalan
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`[${new Date().toISOString()}] 💥 Unhandled Rejection in auto-update-now:`, reason);
    // Jangan crash, tetap jalan
});

// ============================================
// MULAI SERVICE SAAT MODULE DI-LOAD
// ============================================
// Auto-start ketika module di-load
startAutoUpdateNow().catch(error => {
    console.error(`[${new Date().toISOString()}] ❌ Failed to auto-start:`, error);
});

// ============================================
// EKSPOR MODULE
// ============================================
module.exports = {
    start: startAutoUpdateNow,
    stop: stopAutoUpdateNow,
    getStatus: getServiceStatus,
    manualTrigger,
    cleanup: cleanupAll
};