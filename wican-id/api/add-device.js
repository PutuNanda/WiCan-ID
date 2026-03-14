const fs = require('fs').promises;
const path = require('path');

async function handleRequest(req, res) {
    try {
        const {
            deviceId,
            customName,
            wifiSSID,
            wifiPassword,
            serverIP,
            serverPort,
            nodePort
        } = req.body;

        // Validasi input dasar
        if (!deviceId || !customName) {
            return res.status(400).json({
                success: false,
                error: 'Semua field wajib diisi (deviceId, customName)'
            });
        }

        console.log(`[${new Date().toISOString()}] 🆕 Adding new device: ${deviceId}`);

        // Path ke folder device
        const deviceFolderPath = path.join(__dirname, '..', 'database', 'device', deviceId);
        
        // Cek apakah folder sudah ada
        try {
            await fs.access(deviceFolderPath);
            return res.status(409).json({
                success: false,
                error: 'Perangkat sudah ada',
                message: `Perangkat dengan ID '${deviceId}' sudah terdaftar`
            });
        } catch (error) {
            // Folder tidak ada, lanjutkan
        }

        // Buat folder untuk device baru
        try {
            await fs.mkdir(deviceFolderPath, { recursive: true });
            console.log(`[${new Date().toISOString()}] ✅ Created folder for device: ${deviceId}`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] ❌ Failed to create folder:`, error);
            return res.status(500).json({
                success: false,
                error: 'Gagal membuat folder perangkat',
                message: error.message
            });
        }

        // Baca default config
        const defaultConfig = await loadDefaultConfig();
        
        // Normalisasi input WiFi
        const normalizedWifiSSID = (wifiSSID || '').trim();
        const normalizedWifiPassword = (wifiPassword || '').trim();
        const useDefaultWifi = !normalizedWifiSSID && !normalizedWifiPassword;

        if ((normalizedWifiSSID && !normalizedWifiPassword) || (!normalizedWifiSSID && normalizedWifiPassword)) {
            return res.status(400).json({
                success: false,
                error: 'WiFi SSID dan Password harus diisi bersamaan atau dikosongkan untuk default'
            });
        }

        const finalWifiSSID = useDefaultWifi ? (defaultConfig.wifiSSID || '') : normalizedWifiSSID;
        const finalWifiPassword = useDefaultWifi ? (defaultConfig.wifiPassword || '') : normalizedWifiPassword;

        if (!finalWifiSSID || !finalWifiPassword) {
            return res.status(400).json({
                success: false,
                error: 'WiFi SSID/Password default tidak ditemukan'
            });
        }

        // Gunakan config dari request atau default
        const finalServerIP = (serverIP || '').trim() || defaultConfig.serverIP || '192.168.1.50';
        const finalServerPort = (serverPort !== undefined && serverPort !== null && String(serverPort).trim() !== ''
            ? String(serverPort).trim()
            : '') || defaultConfig.serverPort || '5050';
        const finalNodePort = (nodePort !== undefined && nodePort !== null && String(nodePort).trim() !== ''
            ? String(nodePort).trim()
            : '') || defaultConfig.nodePort || '8080';

        // Buat file meta.json
        const metaData = await createMetaData(deviceId, customName, finalServerIP);
        const metaPath = path.join(deviceFolderPath, 'meta.json');
        
        try {
            await fs.writeFile(metaPath, JSON.stringify(metaData, null, 2));
            console.log(`[${new Date().toISOString()}] ✅ Created meta.json for: ${deviceId}`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] ❌ Failed to create meta.json:`, error);
            // Hapus folder jika gagal
            await fs.rmdir(deviceFolderPath);
            throw error;
        }

        // Buat file relay.json
        const relayData = { relayState: "off" };
        const relayPath = path.join(deviceFolderPath, 'relay.json');
        
        try {
            await fs.writeFile(relayPath, JSON.stringify(relayData, null, 2));
            console.log(`[${new Date().toISOString()}] ✅ Created relay.json for: ${deviceId}`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] ❌ Failed to create relay.json:`, error);
            throw error;
        }

        // Buat file wifi.json
        const wifiData = {
            ESPIP: "",
            WifiSSID: "",
            rssi: 0
        };
        const wifiPath = path.join(deviceFolderPath, 'wifi.json');
        
        try {
            await fs.writeFile(wifiPath, JSON.stringify(wifiData, null, 2));
            console.log(`[${new Date().toISOString()}] ✅ Created wifi.json for: ${deviceId}`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] ❌ Failed to create wifi.json:`, error);
            throw error;
        }

        // Generate kode ESP
        const templatePath = path.join(__dirname, '..', 'database', 'template', 'ESP-01S.ino');
        const outputCodePath = path.join(deviceFolderPath, 'ESP-01S.ino');
        
        let codeGenerated = false;
        try {
            await generateESPCode(
                templatePath,
                outputCodePath,
                {
                    wifiSSID: finalWifiSSID,
                    wifiPassword: finalWifiPassword,
                    serverIP: finalServerIP,
                    serverPort: finalServerPort,
                    deviceId,
                    nodePort: finalNodePort
                }
            );
            codeGenerated = true;
            console.log(`[${new Date().toISOString()}] ✅ Generated ESP code for: ${deviceId}`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] ⚠️ Failed to generate ESP code:`, error);
            // Lanjutkan meski gagal generate kode
        }

        // Queue bin compilation task (handled by bin-checker service)
        let compilationStarted = false;
        let compilationQueued = false;
        if (codeGenerated) {
            try {
                const binChecker = require('../service/bin-checker/bin-checker.js');
                compilationQueued = await binChecker.enqueueTask(deviceId);
            } catch (error) {
                console.log(`[${new Date().toISOString()}] ⚠️  Failed to queue bin compilation:`, error.message);
            }
        }

        console.log(`[${new Date().toISOString()}] 🎉 Device added successfully: ${deviceId}`);
        
        res.json({
            success: true,
            message: 'Perangkat berhasil ditambahkan',
            device: {
                id: deviceId,
                customName: customName,
                folderPath: deviceFolderPath,
                codePath: outputCodePath,
                codeGenerated: codeGenerated,
                    autoCompilation: compilationStarted,
                    compilationQueued: compilationQueued,
                    config: {
                    wifiSSID: finalWifiSSID,
                    serverIP: finalServerIP,
                    serverPort: finalServerPort,
                    nodePort: finalNodePort
                }
            }
        });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] 💥 Error adding device:`, error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
}

async function loadDefaultConfig() {
    const configPath = path.join(__dirname, '..', 'database', 'template', 'ESP-default-config.properties');
    
    try {
        await fs.access(configPath);
        const content = await fs.readFile(configPath, 'utf8');
        const rawConfig = {};
        
        content.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                rawConfig[key.trim()] = value.trim();
            }
        });

        return {
            serverIP: rawConfig['server-ip'] || rawConfig.serverIP || rawConfig.serverIP,
            serverPort: rawConfig['server-port'] || rawConfig.serverPort || rawConfig.serverPort,
            nodePort: rawConfig['node-port'] || rawConfig.nodePort || rawConfig.nodePort,
            wifiSSID: rawConfig['wifi-ssid'] || rawConfig.wifiSSID || rawConfig.wifiSSID,
            wifiPassword: rawConfig['wifi-password'] || rawConfig.wifiPassword || rawConfig.wifiPassword
        };
    } catch (error) {
        console.log(`[${new Date().toISOString()}] ⚠️ Default config not found, using defaults`);
        return {
            serverIP: '192.168.1.50',
            serverPort: '5050',
            nodePort: '8080',
            wifiSSID: 'system',
            wifiPassword: 'ESP-8991'
        };
    }
}

async function createMetaData(deviceId, customName, serverIP) {
    // Get current time
    const now = new Date();
    
    return {
        ESPID: deviceId,
        customName: customName,
        NodeStatus: "offline",
        deviceStatus: "off",
        createdAt: now.toISOString(),
        lastUpdated: now.toISOString(),
        ESPIP: ""
    };
}

async function generateESPCode(templatePath, outputPath, config) {
    try {
        // Baca template
        let templateContent = await fs.readFile(templatePath, 'utf8');
        
        // Ganti variabel dalam template
        templateContent = templateContent.replace(/const char\* WIFI_SSID = "";/g, `const char* WIFI_SSID = "${config.wifiSSID}";`);
        templateContent = templateContent.replace(/const char\* WIFI_PASSWORD = "";/g, `const char* WIFI_PASSWORD = "${config.wifiPassword}";`);
        templateContent = templateContent.replace(/const char\* SERVER_IP = "";/g, `const char* SERVER_IP = "${config.serverIP}";`);
        templateContent = templateContent.replace(/const int SERVER_PORT = .*;/g, `const int SERVER_PORT = ${config.serverPort};`);
        templateContent = templateContent.replace(/const char\* ESP_ID = "";/g, `const char* ESP_ID = "${config.deviceId}";`);
        templateContent = templateContent.replace(/const int NODE_PORT = .*;/g, `const int NODE_PORT = ${config.nodePort};`);
        
        // Tulis kode yang sudah dimodifikasi
        await fs.writeFile(outputPath, templateContent);
        
        return true;
        
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Failed to generate ESP code:`, error);
        throw error;
    }
}

// FUNGSI AUTO-COMPILATION BARU
async function startAutoCompilation(deviceId) {
    try {
        console.log(`[${new Date().toISOString()}] ⚙️  Starting auto-compilation for: ${deviceId}`);
        
        // Gunakan setTimeout untuk menjalankan secara async tanpa blocking response
        setTimeout(async () => {
            try {
                // Panggil sketch-mover API secara internal
                const sketchMover = require('./sketch-mover.js');
                const fakeReq = {
                    body: { deviceId: deviceId }
                };
                
                const fakeRes = {
                    json: function(data) {
                        if (data && data.success) {
                            console.log(`[${new Date().toISOString()}] ✅ Auto-compilation successful: ${deviceId}`);
                            
                            // Update meta.json untuk menandakan binary tersedia
                            updateMetaWithBinaryInfo(deviceId, data.binaryPath);
                        } else {
                            console.log(`[${new Date().toISOString()}] ⚠️  Auto-compilation failed:`, 
                                data ? data.error : 'No response');
                        }
                    },
                    status: function() { return this; },
                    send: function() {}
                };
                
                await sketchMover.handleRequest(fakeReq, fakeRes);
            } catch (error) {
                console.log(`[${new Date().toISOString()}] ⚠️  Auto-compilation error:`, error.message);
            }
        }, 2000); // Delay 2 detik sebelum mulai compile
        
        return true;
    } catch (error) {
        console.log(`[${new Date().toISOString()}] ⚠️  Auto-compilation setup failed:`, error.message);
        return false;
    }
}

async function updateMetaWithBinaryInfo(deviceId, binaryPath) {
    try {
        const metaPath = path.join(__dirname, '..', 'database', 'device', deviceId, 'meta.json');
        
        let metaData = {};
        try {
            const fileContent = await fs.readFile(metaPath, 'utf8');
            metaData = JSON.parse(fileContent);
        } catch (error) {
            console.log(`[${new Date().toISOString()}] ⚠️  Cannot update meta: file not found for ${deviceId}`);
            return;
        }

        // Tambah info binary
        metaData.hasBinary = true;
        metaData.binaryGeneratedAt = new Date().toISOString();
        metaData.lastUpdated = new Date().toISOString();
        
        await fs.writeFile(metaPath, JSON.stringify(metaData, null, 2));
        
        console.log(`[${new Date().toISOString()}] 📦 Updated meta.json with binary info for: ${deviceId}`);
        
    } catch (error) {
        console.log(`[${new Date().toISOString()}] ⚠️  Failed to update meta with binary info:`, error.message);
    }
}

// FUNGSI ASLI (TETAP ADA)
async function getCodePreview(deviceId) {
    try {
        const codePath = path.join(__dirname, '..', 'database', 'device', deviceId, 'ESP-01S.ino');
        const content = await fs.readFile(codePath, 'utf8');
        return content;
    } catch (error) {
        throw new Error(`Kode untuk perangkat ${deviceId} tidak ditemukan`);
    }
}

// FUNGSI ASLI (TETAP ADA) - Diperbarui dengan info binary
async function getDeviceInfo(deviceId) {
    try {
        const deviceFolderPath = path.join(__dirname, '..', 'database', 'device', deviceId);
        await fs.access(deviceFolderPath);
        
        // Baca meta.json
        const metaPath = path.join(deviceFolderPath, 'meta.json');
        const metaContent = await fs.readFile(metaPath, 'utf8');
        const metaData = JSON.parse(metaContent);
        
        // Cek apakah ada kode ESP
        const codePath = path.join(deviceFolderPath, 'ESP-01S.ino');
        let hasCode = false;
        try {
            await fs.access(codePath);
            hasCode = true;
        } catch (error) {
            hasCode = false;
        }
        
        // Cek apakah ada binary
        const binaryPath = path.join(deviceFolderPath, 'ESP-01S.bin');
        let hasBinary = false;
        let binaryInfo = null;
        try {
            await fs.access(binaryPath);
            hasBinary = true;
            
            const stats = await fs.stat(binaryPath);
            binaryInfo = {
                path: binaryPath,
                size: stats.size,
                sizeKB: (stats.size / 1024).toFixed(2),
                lastModified: stats.mtime
            };
        } catch (error) {
            hasBinary = false;
        }
        
        return {
            exists: true,
            meta: metaData,
            hasCode: hasCode,
            hasBinary: hasBinary,
            binaryInfo: binaryInfo,
            codePath: hasCode ? codePath : null,
            binaryPath: hasBinary ? binaryPath : null
        };
        
    } catch (error) {
        return {
            exists: false,
            error: error.message
        };
    }
}

// FUNGSI TAMBAHAN: Manual compilation trigger
async function triggerManualCompilation(deviceId) {
    try {
        console.log(`[${new Date().toISOString()}] 🛠️  Manual compilation triggered for: ${deviceId}`);
        
        // Cek apakah kode ada
        const codePath = path.join(__dirname, '..', 'database', 'device', deviceId, 'ESP-01S.ino');
        try {
            await fs.access(codePath);
        } catch (error) {
            throw new Error(`Source code not found for device ${deviceId}`);
        }
        
        // Jalankan compilation
        const result = await startAutoCompilation(deviceId);
        
        return {
            success: true,
            message: 'Compilation process started',
            deviceId: deviceId,
            compilationStarted: result
        };
        
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Manual compilation failed:`, error);
        throw error;
    }
}

// FUNGSI TAMBAHAN: Cek status kompilasi
async function checkCompilationStatus(deviceId) {
    try {
        const deviceFolderPath = path.join(__dirname, '..', 'database', 'device', deviceId);
        
        // Cek apakah device ada
        try {
            await fs.access(deviceFolderPath);
        } catch (error) {
            throw new Error(`Device ${deviceId} not found`);
        }
        
        // Cek file meta.json
        const metaPath = path.join(deviceFolderPath, 'meta.json');
        let metaData = {};
        try {
            const metaContent = await fs.readFile(metaPath, 'utf8');
            metaData = JSON.parse(metaContent);
        } catch (error) {
            // Meta tidak ditemukan
        }
        
        // Cek file binary
        const binaryPath = path.join(deviceFolderPath, 'ESP-01S.bin');
        let binaryExists = false;
        let binarySize = 0;
        
        try {
            await fs.access(binaryPath);
            binaryExists = true;
            const stats = await fs.stat(binaryPath);
            binarySize = stats.size;
        } catch (error) {
            binaryExists = false;
        }
        
        // Cek file source code
        const codePath = path.join(deviceFolderPath, 'ESP-01S.ino');
        let codeExists = false;
        
        try {
            await fs.access(codePath);
            codeExists = true;
        } catch (error) {
            codeExists = false;
        }
        
        return {
            deviceId: deviceId,
            codeExists: codeExists,
            binaryExists: binaryExists,
            binarySize: binarySize,
            binarySizeKB: binaryExists ? (binarySize / 1024).toFixed(2) : 0,
            hasBinaryInMeta: metaData.hasBinary || false,
            binaryGeneratedAt: metaData.binaryGeneratedAt || null,
            readyForProgramming: binaryExists
        };
        
    } catch (error) {
        throw error;
    }
}

// EXPORT SEMUA FUNGSI
module.exports = {
    handleRequest,
    getCodePreview,
    getDeviceInfo,
    generateESPCode,
    triggerManualCompilation,
    checkCompilationStatus,
    startAutoCompilation
};
