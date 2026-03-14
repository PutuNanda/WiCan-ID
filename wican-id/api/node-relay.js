const fs = require('fs').promises;
const path = require('path');
const http = require('http');

// Import fungsi dari node-wifi
const nodeWifiAPI = require('./node-wifi.js');

// Variabel untuk memantau perubahan
const relayWatchers = new Map();
// Track waktu timeout untuk setiap node
const nodeTimeouts = new Map();
// Map untuk memantau semua file relay.json
const allRelayWatchers = new Map();

// ============================================
// FUNGSI BARU: Baca node-config.properties
// ============================================
async function getNodeConfig(nodeId) {
    const configPath = path.join(__dirname, '..', 'database', 'device', nodeId, 'node-config.properties');
    const defaultConfig = {
        'reverse-logic-relay': 'false'
    };
    
    try {
        // Cek apakah file ada
        await fs.access(configPath);
        
        // Baca file
        const content = await fs.readFile(configPath, 'utf8');
        const config = { ...defaultConfig };
        
        // Parse properties file
        content.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, value] = line.split('=');
                if (key && value) {
                    config[key.trim()] = value.trim();
                }
            }
        });
        
        console.log(`[${new Date().toISOString()}] ⚙️ Config for ${nodeId}: reverse-logic-relay = ${config['reverse-logic-relay']}`);
        return config;
        
    } catch (error) {
        // File tidak ada, buat file dengan default
        if (error.code === 'ENOENT') {
            console.log(`[${new Date().toISOString()}] 📝 Creating node-config.properties for ${nodeId} with defaults`);
            
            const defaultContent = `# Node Configuration for ${nodeId}
# Created: ${new Date().toISOString()}
# ========================================

# Reverse Logic Relay
# Jika true: relay.json "on" -> kirim "off" ke ESP, dan sebaliknya
# Default: false
reverse-logic-relay = false
`;
            
            try {
                await fs.writeFile(configPath, defaultContent);
                console.log(`[${new Date().toISOString()}] ✅ Created node-config.properties for ${nodeId}`);
            } catch (writeError) {
                console.error(`[${new Date().toISOString()}] ❌ Failed to create config for ${nodeId}:`, writeError.message);
            }
        } else {
            console.error(`[${new Date().toISOString()}] ❌ Error reading config for ${nodeId}:`, error.message);
        }
        
        return defaultConfig;
    }
}

// ============================================
// FUNGSI BARU: Apply reverse logic
// ============================================
function applyReverseLogic(relayState, config) {
    const reverseLogic = config['reverse-logic-relay'] === 'true';
    
    if (reverseLogic) {
        // Jika true: on -> off, off -> on
        const result = relayState === 'on' ? 'off' : 'on';
        console.log(`[${new Date().toISOString()}] 🔄 Reverse logic applied: ${relayState} -> ${result}`);
        return result;
    }
    
    // Jika false: kirim sesuai aslinya
    return relayState;
}

// ============================================
// FUNGSI BARU: Memantau semua folder device
// ============================================
async function startMonitoringAllDevices() {
    console.log(`[${new Date().toISOString()}] 🚀 Starting realtime monitoring for all relay.json files...`);
    
    const devicesPath = path.join(__dirname, '..', 'database', 'device');
    
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
                startWatchingDeviceRelay(deviceId);
            }
        }
        
        console.log(`[${new Date().toISOString()}] ✅ Monitoring started for ${allRelayWatchers.size} devices`);
        
        // Mulai monitoring untuk device baru yang mungkin ditambahkan kemudian
        monitorNewDevices(devicesPath);
        
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Failed to start monitoring:`, error.message);
    }
}

// ============================================
// FUNGSI BARU: Memantau device baru
// ============================================
async function monitorNewDevices(devicesPath) {
    // Scan setiap 10 detik untuk device baru
    setInterval(async () => {
        try {
            const devices = await fs.readdir(devicesPath);
            
            for (const deviceId of devices) {
                const devicePath = path.join(devicesPath, deviceId);
                const stat = await fs.stat(devicePath);
                
                if (stat.isDirectory() && !allRelayWatchers.has(deviceId)) {
                    console.log(`[${new Date().toISOString()}] 🆕 New device detected: ${deviceId}`);
                    startWatchingDeviceRelay(deviceId);
                }
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] ❌ Error scanning for new devices:`, error.message);
        }
    }, 10000);
}

// ============================================
// FUNGSI BARU: Memantau relay.json untuk satu device
// ============================================
async function startWatchingDeviceRelay(deviceId) {
    const relayFilePath = path.join(__dirname, '..', 'database', 'device', deviceId, 'relay.json');
    
    try {
        // Cek apakah file relay.json ada
        await fs.access(relayFilePath);
        
        console.log(`[${new Date().toISOString()}] 👁️ Starting realtime monitoring for device: ${deviceId}`);
        
        let lastContent = '';
        let isFirstCheck = true;
        
        const checkForChanges = async () => {
            try {
                const content = await fs.readFile(relayFilePath, 'utf8');
                
                // Skip first check untuk menghindari trigger awal
                if (!isFirstCheck && content !== lastContent) {
                    console.log(`[${new Date().toISOString()}] 🔄 Relay file changed for ${deviceId}: ${content}`);
                    
                    // Baca konfigurasi untuk logging
                    const config = await getNodeConfig(deviceId);
                    const reverseLogic = config['reverse-logic-relay'] === 'true';
                    
                    try {
                        const relayData = JSON.parse(content);
                        console.log(`[${new Date().toISOString()}] 📊 New relay state for ${deviceId}: ${relayData.relayState} (reverse logic: ${reverseLogic ? 'enabled' : 'disabled'})`);
                    } catch (parseError) {
                        console.log(`[${new Date().toISOString()}] 📊 New relay content for ${deviceId} (not valid JSON)`);
                    }
                    
                    // Trigger update ke node secara REAL TIME!
                    triggerNodeUpdate(deviceId);
                }
                
                lastContent = content;
                isFirstCheck = false;
                
            } catch (error) {
                // Jika file tidak ditemukan, stop watching untuk device ini
                if (error.code === 'ENOENT') {
                    console.log(`[${new Date().toISOString()}] ⏹️ Stopping realtime monitoring for ${deviceId} (relay.json deleted)`);
                    allRelayWatchers.delete(deviceId);
                    return;
                }
            }
            
            // Check every 500ms for REAL-TIME monitoring!
            if (allRelayWatchers.has(deviceId)) {
                setTimeout(checkForChanges, 500);
            }
        };
        
        // Mulai monitoring
        checkForChanges();
        allRelayWatchers.set(deviceId, { 
            filePath: relayFilePath,
            isWatching: true 
        });
        
    } catch (error) {
        // File relay.json belum ada, tapi kita tetap catat device ini untuk monitoring nanti
        if (error.code === 'ENOENT') {
            console.log(`[${new Date().toISOString()}] ⏳ Waiting for relay.json to be created for device: ${deviceId}`);
            
            // Tetap catat device untuk monitoring file creation
            allRelayWatchers.set(deviceId, { 
                filePath: relayFilePath,
                isWatching: false 
            });
            
            // Cek setiap 2 detik apakah file sudah dibuat
            const checkFileCreation = setInterval(async () => {
                try {
                    await fs.access(relayFilePath);
                    console.log(`[${new Date().toISOString()}] ✅ relay.json created for ${deviceId}, starting realtime monitoring`);
                    clearInterval(checkFileCreation);
                    
                    // Mulai monitoring sebenarnya
                    if (allRelayWatchers.has(deviceId)) {
                        allRelayWatchers.delete(deviceId);
                    }
                    startWatchingDeviceRelay(deviceId);
                    
                } catch (error) {
                    // File masih belum ada, continue checking
                }
            }, 2000);
            
            // Simpan interval untuk cleanup
            const existingWatcher = allRelayWatchers.get(deviceId);
            if (existingWatcher) {
                existingWatcher.creationInterval = checkFileCreation;
            }
        }
    }
}

async function handleGetRequest(req, res) {
    try {
        const { nodeId } = req.params;

        if (!nodeId) {
            return res.status(400).json({ error: 'Node ID is required' });
        }

        const relayFilePath = path.join(__dirname, '..', 'database', 'device', nodeId, 'relay.json');

        try {
            // Cek apakah file ada
            await fs.access(relayFilePath);
            
            // Baca file relay.json
            const fileContent = await fs.readFile(relayFilePath, 'utf8');
            let relayData;
            
            try {
                relayData = JSON.parse(fileContent);
            } catch (error) {
                // File ada tapi format JSON salah, buat default
                relayData = { relayState: "off" };
                await fs.writeFile(relayFilePath, JSON.stringify(relayData, null, 2));
            }

            // Baca konfigurasi node
            const config = await getNodeConfig(nodeId);
            
            // Apply reverse logic jika diperlukan
            const stateToSend = applyReverseLogic(relayData.relayState, config);

            // Mulai pantau file ini jika belum dipantau
            if (!relayWatchers.has(nodeId)) {
                startWatchingRelayFile(nodeId, relayFilePath);
            }

            console.log(`[${new Date().toISOString()}] 📥 GET relay for ${nodeId}: ${relayData.relayState} -> send ${stateToSend}`);
            
            res.json({ 
                success: true, 
                relayState: stateToSend  // Kirim yang sudah diproses
            });

        } catch (error) {
            // File tidak ada
            console.log(`[${new Date().toISOString()}] ❌ Relay file not found for node: ${nodeId}`);
            res.status(404).json({ 
                error: 'Relay file not found',
                message: 'relay.json does not exist for this node.' 
            });
        }

    } catch (error) {
        console.error('Error in node-relay GET API:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function handlePostRequest(req, res) {
    try {
        const { nodeId } = req.params;
        const { relayState } = req.body;

        if (!nodeId || !relayState) {
            return res.status(400).json({ error: 'Node ID and relayState are required' });
        }

        if (!['on', 'off'].includes(relayState.toLowerCase())) {
            return res.status(400).json({ error: 'relayState must be "on" or "off"' });
        }

        const relayFilePath = path.join(__dirname, '..', 'database', 'device', nodeId, 'relay.json');

        try {
            // Cek apakah folder device ada
            const deviceFolder = path.join(__dirname, '..', 'database', 'device', nodeId);
            await fs.access(deviceFolder);
            
            // Update relay state (simpan asli, tanpa reverse logic)
            const relayData = { relayState: relayState.toLowerCase() };
            await fs.writeFile(relayFilePath, JSON.stringify(relayData, null, 2));
            
            console.log(`[${new Date().toISOString()}] 🔧 Admin updated ${nodeId} relay: ${relayState}`);
            
            // Baca konfigurasi untuk logging
            const config = await getNodeConfig(nodeId);
            const reverseLogic = config['reverse-logic-relay'] === 'true';
            
            if (reverseLogic) {
                console.log(`[${new Date().toISOString()}] ⚠️  Note: reverse-logic-relay = true for ${nodeId}, ESP will receive opposite state!`);
            }
            
            // Trigger update ke node (TANPA DELAY!)
            triggerNodeUpdate(nodeId);

            res.json({ 
                success: true, 
                message: 'Relay state updated and node notified',
                relayState: relayData.relayState,
                config: {
                    reverseLogicApplied: reverseLogic
                }
            });

        } catch (error) {
            // Folder device tidak ada
            console.log(`[${new Date().toISOString()}] ❌ Cannot update relay: Device folder not found for ${nodeId}`);
            res.status(404).json({ 
                error: 'Device not found',
                message: 'Cannot update relay state for non-existent device.' 
            });
        }

    } catch (error) {
        console.error('Error in node-relay POST API:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

function startWatchingRelayFile(nodeId, filePath) {
    console.log(`[${new Date().toISOString()}] 👁️  Starting to watch relay file for: ${nodeId}`);
    
    let lastContent = '';
    
    const checkForChanges = async () => {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            
            if (content !== lastContent) {
                console.log(`[${new Date().toISOString()}] 🔄 Relay file changed for ${nodeId}: ${content}`);
                lastContent = content;
                
                // Trigger update ke node (TANPA DELAY!)
                triggerNodeUpdate(nodeId);
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error watching relay file for ${nodeId}:`, error.message);
            
            // Jika file tidak ditemukan, stop watching
            if (error.code === 'ENOENT') {
                console.log(`[${new Date().toISOString()}] ⏹️  Stopping watch for ${nodeId} (file deleted)`);
                relayWatchers.delete(nodeId);
                return;
            }
        }
        
        // Check again in 1 second (LEBIH CEPAT!)
        setTimeout(checkForChanges, 1000);
    };
    
    checkForChanges();
    relayWatchers.set(nodeId, { filePath });
}

async function triggerNodeUpdate(nodeId) {
    console.log(`[${new Date().toISOString()}] 🚀 Triggering Update-Now for: ${nodeId}`);
    
    // Clear existing timeout (jika ada)
    const existingTimeout = nodeTimeouts.get(nodeId);
    if (existingTimeout) {
        clearTimeout(existingTimeout);
    }
    
    // Set timeout 20 detik untuk ubah ke OFFLINE
    const offlineTimeout = setTimeout(async () => {
        console.log(`[${new Date().toISOString()}] ⏰ TIMEOUT 20s: ${nodeId} -> OFFLINE`);
        await nodeWifiAPI.updateNodeStatus(nodeId, 'offline');
        nodeTimeouts.delete(nodeId);
    }, 20000);
    
    nodeTimeouts.set(nodeId, offlineTimeout);
    
    try {
        // Baca node.properties untuk mendapatkan port
        const nodePropsPath = path.join(__dirname, '..', 'database', 'server-config', 'node.properties');
        let nodePort = 8080;
        
        try {
            const propsContent = await fs.readFile(nodePropsPath, 'utf8');
            const lines = propsContent.split('\n');
            lines.forEach(line => {
                const [key, value] = line.split('=');
                if (key && key.trim() === 'node-port') {
                    nodePort = parseInt(value.trim());
                }
            });
        } catch (error) {
            // File tidak ada, buat default
            const defaultProps = 'node-port=8080\n';
            await fs.writeFile(nodePropsPath, defaultProps);
        }

        // Baca wifi.json untuk mendapatkan IP node
        const wifiFilePath = path.join(__dirname, '..', 'database', 'device', nodeId, 'wifi.json');
        
        try {
            const wifiContent = await fs.readFile(wifiFilePath, 'utf8');
            const wifiData = JSON.parse(wifiContent);
            
            if (!wifiData.ESPIP || wifiData.ESPIP.trim() === '') {
                console.log(`[${new Date().toISOString()}] ⚠️  Cannot trigger update for ${nodeId}: ESPIP not set`);
                return;
            }

            // Kirim POST request ke endpoint /Update-Now di node
            const postData = JSON.stringify({
                command: 'update',
                timestamp: new Date().toISOString(),
                nodeId: nodeId
            });

            const options = {
                hostname: wifiData.ESPIP,
                port: nodePort,
                path: '/Update-Now',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 19000  // 19 detik (sedikit kurang dari 20 detik timeout)
            };

            console.log(`[${new Date().toISOString()}] 📤 Sending Update-Now to ${wifiData.ESPIP}:${nodePort}`);
            
            const req = http.request(options, (response) => {
                // CANCEL TIMEOUT! Node merespons!
                const timeout = nodeTimeouts.get(nodeId);
                if (timeout) {
                    clearTimeout(timeout);
                    nodeTimeouts.delete(nodeId);
                }
                
                console.log(`[${new Date().toISOString()}] ✅ Update-Now SUCCESS for ${nodeId}: HTTP ${response.statusCode}`);
                
                // Ubah ke ONLINE jika berhasil (atau tetap online)
                nodeWifiAPI.updateNodeStatus(nodeId, 'online');
            });

            req.on('error', (error) => {
                console.error(`[${new Date().toISOString()}] ❌ Update-Now FAILED for ${nodeId}:`, error.message);
                // Biarkan timeout yang handle offline
            });

            req.on('timeout', () => {
                console.error(`[${new Date().toISOString()}] ⏱️  Update-Now TIMEOUT for ${nodeId} (19s)`);
                req.destroy();
                // Biarkan timeout 20 detik yang handle offline
            });

            req.write(postData);
            req.end();

        } catch (error) {
            console.error(`[${new Date().toISOString()}] ❌ Cannot read wifi.json for ${nodeId}:`, error.message);
            // Cancel timeout karena tidak ada IP
            const timeout = nodeTimeouts.get(nodeId);
            if (timeout) {
                clearTimeout(timeout);
                nodeTimeouts.delete(nodeId);
            }
        }

    } catch (error) {
        console.error(`[${new Date().toISOString()}] 💥 Error triggering node update for ${nodeId}:`, error);
        // Cancel timeout karena error
        const timeout = nodeTimeouts.get(nodeId);
        if (timeout) {
            clearTimeout(timeout);
            nodeTimeouts.delete(nodeId);
        }
    }
}

// Fungsi manual untuk admin
async function forceNodeStatus(nodeId, status) {
    console.log(`[${new Date().toISOString()}] 🛠️  FORCE updating ${nodeId} to ${status}`);
    await nodeWifiAPI.updateNodeStatus(nodeId, status);
    
    // Cancel timeout jika ada
    const timeout = nodeTimeouts.get(nodeId);
    if (timeout) {
        clearTimeout(timeout);
        nodeTimeouts.delete(nodeId);
    }
}

// Fungsi untuk update konfigurasi node
async function updateNodeConfig(nodeId, configUpdates) {
    const configPath = path.join(__dirname, '..', 'database', 'device', nodeId, 'node-config.properties');
    
    try {
        // Cek apakah folder device ada
        const deviceFolder = path.join(__dirname, '..', 'database', 'device', nodeId);
        await fs.access(deviceFolder);
        
        // Baca config existing atau buat default
        let config = await getNodeConfig(nodeId);
        
        // Update config dengan nilai baru
        if (configUpdates['reverse-logic-relay'] !== undefined) {
            config['reverse-logic-relay'] = configUpdates['reverse-logic-relay'] ? 'true' : 'false';
        }
        
        // Tulis kembali ke file
        const content = `# Node Configuration for ${nodeId}
# Updated: ${new Date().toISOString()}
# ========================================

# Reverse Logic Relay
# Jika true: relay.json "on" -> kirim "off" ke ESP, dan sebaliknya
# Default: false
reverse-logic-relay = ${config['reverse-logic-relay']}
`;
        
        await fs.writeFile(configPath, content);
        console.log(`[${new Date().toISOString()}] ✅ Updated config for ${nodeId}: reverse-logic-relay = ${config['reverse-logic-relay']}`);
        
        return {
            success: true,
            nodeId: nodeId,
            config: config
        };
        
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Failed to update config for ${nodeId}:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Fungsi untuk mendapatkan status monitoring
function getMonitoringStatus() {
    const status = {
        monitoredDevices: Array.from(allRelayWatchers.keys()),
        activeMonitors: allRelayWatchers.size,
        pendingTimeouts: Array.from(nodeTimeouts.keys())
    };
    
    console.log(`[${new Date().toISOString()}] 📊 Monitoring status: ${status.activeMonitors} devices monitored`);
    return status;
}

// Cleanup semua timeout dan monitoring saat server shutdown
function cleanupAll() {
    console.log(`[${new Date().toISOString()}] 🧹 Cleaning up all resources...`);
    
    // Cleanup timeouts
    for (const [nodeId, timeout] of nodeTimeouts.entries()) {
        clearTimeout(timeout);
    }
    nodeTimeouts.clear();
    
    // Cleanup intervals dari monitoring
    for (const [deviceId, watcher] of allRelayWatchers.entries()) {
        if (watcher.creationInterval) {
            clearInterval(watcher.creationInterval);
        }
    }
    allRelayWatchers.clear();
    relayWatchers.clear();
    
    console.log(`[${new Date().toISOString()}] ✅ Cleanup complete`);
}

// Panggil fungsi monitoring saat module di-load
startMonitoringAllDevices();

module.exports = {
    handleGetRequest,
    handlePostRequest,
    triggerNodeUpdate,
    forceNodeStatus,
    cleanupAll,          // Ganti cleanupAllTimeouts dengan cleanupAll
    getNodeConfig,
    updateNodeConfig,
    getMonitoringStatus  // Ekspor fungsi baru untuk cek status monitoring
};