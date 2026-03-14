const fs = require('fs').promises;
const path = require('path');

async function handleRequest(req, res) {
    try {
        console.log(`[${new Date().toISOString()}] 📊 Dashboard API called`);
        
        // Path ke folder device
        const deviceFolderPath = path.join(__dirname, '..', 'database', 'device');
        
        try {
            // Cek apakah folder device ada
            await fs.access(deviceFolderPath);
            
            // Dapatkan semua folder dalam device
            const items = await fs.readdir(deviceFolderPath);
            
            // Filter hanya folder (bukan file)
            const nodeFolders = [];
            for (const item of items) {
                try {
                    const itemPath = path.join(deviceFolderPath, item);
                    const stats = await fs.stat(itemPath);
                    if (stats.isDirectory()) {
                        nodeFolders.push(item);
                    }
                } catch (error) {
                    console.log(`[${new Date().toISOString()}] ⚠️  Skipping ${item}: ${error.message}`);
                }
            }
            
            // Jika tidak ada folder
            if (nodeFolders.length === 0) {
                console.log(`[${new Date().toISOString()}] 📊 No device folders found`);
                return res.json({
                    success: true,
                    message: 'No devices found',
                    data: []
                });
            }
            
            // Ambil data dari setiap folder node
            const devices = [];
            
            for (const nodeId of nodeFolders) {
                try {
                    const deviceData = await getDeviceData(nodeId);
                    if (deviceData) {
                        devices.push(deviceData);
                    }
                } catch (error) {
                    console.log(`[${new Date().toISOString()}] ⚠️  Error getting data for ${nodeId}: ${error.message}`);
                }
            }
            
            console.log(`[${new Date().toISOString()}] 📊 Found ${devices.length} devices`);
            
            // Enkripsi data sebelum dikirim (simulasi sederhana)
            const encryptedData = simpleEncrypt(devices);
            
            res.json({
                success: true,
                message: 'Devices retrieved successfully',
                data: encryptedData,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            // Folder device tidak ada
            if (error.code === 'ENOENT') {
                console.log(`[${new Date().toISOString()}] 📊 Device folder not found`);
                return res.json({
                    success: true,
                    message: 'Device folder not found',
                    data: []
                });
            }
            
            throw error;
        }
        
    } catch (error) {
        console.error('[Dashboard API Error]:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: 'Failed to retrieve devices'
        });
    }
}

async function getDeviceData(nodeId) {
    const devicePath = path.join(__dirname, '..', 'database', 'device', nodeId);
    
    // Cek apakah folder node ada
    try {
        await fs.access(devicePath);
    } catch (error) {
        return null;
    }
    
    // Inisialisasi data default
    let metaData = {
        ESPID: nodeId,
        customName: nodeId,
        NodeStatus: "offline",
        deviceStatus: "off",
        createdAt: "N/A",
        lastUpdated: "N/A"
    };
    
    let relayData = { relayState: "off" };
    let wifiData = { ESPIP: "N/A", WifiSSID: "N/A", rssi: 0 };
    
    // Baca file meta.json
    const metaPath = path.join(devicePath, 'meta.json');
    try {
        const metaContent = await fs.readFile(metaPath, 'utf8');
        metaData = { ...metaData, ...JSON.parse(metaContent) };
    } catch (error) {
        // File tidak ditemukan atau corrupt, gunakan default
    }
    
    // Baca file relay.json
    const relayPath = path.join(devicePath, 'relay.json');
    try {
        const relayContent = await fs.readFile(relayPath, 'utf8');
        relayData = JSON.parse(relayContent);
    } catch (error) {
        // File tidak ditemukan atau corrupt, gunakan default
    }
    
    // Baca file wifi.json
    const wifiPath = path.join(devicePath, 'wifi.json');
    try {
        const wifiContent = await fs.readFile(wifiPath, 'utf8');
        wifiData = JSON.parse(wifiContent);
    } catch (error) {
        // File tidak ditemukan atau corrupt, gunakan default
    }
    
    // Format data untuk dashboard
    const deviceData = {
        deviceId: nodeId,
        customName: metaData.customName || nodeId,
        status: metaData.NodeStatus || "offline",
        deviceStatus: metaData.deviceStatus || "off",
        relayState: relayData.relayState || "off",
        ipAddress: wifiData.ESPIP || metaData.ESPIP || "N/A",
        wifiSSID: wifiData.WifiSSID || "N/A",
        rssi: wifiData.rssi || 0,
        createdAt: metaData.createdAt || "N/A",
        lastUpdated: metaData.lastUpdated || "N/A",
        espId: metaData.ESPID || nodeId
    };
    
    return deviceData;
}

// Fungsi enkripsi sederhana (base64 dengan timestamp)
function simpleEncrypt(data) {
    try {
        const timestamp = Date.now();
        const dataString = JSON.stringify({ data, timestamp });
        
        // Encode ke base64
        const base64Data = Buffer.from(dataString).toString('base64');
        
        // Tambahkan checksum sederhana
        const checksum = simpleChecksum(base64Data);
        
        return {
            encrypted: base64Data,
            checksum: checksum,
            timestamp: timestamp
        };
    } catch (error) {
        console.error('[Encryption Error]:', error);
        return data; // Jika error, kembalikan data asli
    }
}

// Checksum sederhana
function simpleChecksum(str) {
    let sum = 0;
    for (let i = 0; i < str.length; i++) {
        sum += str.charCodeAt(i);
    }
    return sum % 1000;
}

module.exports = {
    handleRequest,
    getDeviceData
};