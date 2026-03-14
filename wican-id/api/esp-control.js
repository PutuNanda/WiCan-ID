const fs = require('fs').promises;
const path = require('path');
const http = require('http');

async function scanDevices(req, res) {
    try {
        console.log(`[${new Date().toISOString()}] 🔍 Scanning ESP devices...`);
        
        // Path ke folder device
        const deviceFolderPath = path.join(__dirname, '..', 'database', 'device');
        let results = [];
        
        try {
            await fs.access(deviceFolderPath);
            
            // Dapatkan semua folder
            const items = await fs.readdir(deviceFolderPath);
            
            for (const nodeId of items) {
                const nodePath = path.join(deviceFolderPath, nodeId);
                const stats = await fs.stat(nodePath);
                
                if (stats.isDirectory()) {
                    try {
                        // Cek apakah device online dengan membaca wifi.json
                        const wifiPath = path.join(nodePath, 'wifi.json');
                        const wifiContent = await fs.readFile(wifiPath, 'utf8');
                        const wifiData = JSON.parse(wifiContent);
                        
                        if (wifiData.ESPIP && wifiData.ESPIP.trim() !== '') {
                            results.push({
                                deviceId: nodeId,
                                ipAddress: wifiData.ESPIP,
                                status: 'online',
                                rssi: wifiData.rssi || 0
                            });
                        }
                    } catch (error) {
                        // Device tidak memiliki IP atau offline
                        results.push({
                            deviceId: nodeId,
                            ipAddress: 'N/A',
                            status: 'offline',
                            rssi: 0
                        });
                    }
                }
            }
            
            console.log(`[${new Date().toISOString()}] 🔍 Scan complete: ${results.length} devices found`);
            
            res.json({
                success: true,
                message: `Found ${results.length} devices`,
                results: results
            });
            
        } catch (error) {
            console.log(`[${new Date().toISOString()}] 🔍 No devices found`);
            res.json({
                success: true,
                message: 'No devices found',
                results: []
            });
        }
        
    } catch (error) {
        console.error('[Scan Devices Error]:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to scan devices'
        });
    }
}

async function checkDeviceStatus(req, res) {
    try {
        const { nodeId } = req.params;
        
        if (!nodeId) {
            return res.status(400).json({
                success: false,
                error: 'Node ID is required'
            });
        }
        
        console.log(`[${new Date().toISOString()}] 🔍 Checking status for: ${nodeId}`);
        
        const devicePath = path.join(__dirname, '..', 'database', 'device', nodeId);
        
        try {
            await fs.access(devicePath);
            
            // Baca meta.json untuk status
            const metaPath = path.join(devicePath, 'meta.json');
            let metaData = {};
            
            try {
                const metaContent = await fs.readFile(metaPath, 'utf8');
                metaData = JSON.parse(metaContent);
            } catch (error) {
                metaData = { NodeStatus: 'offline' };
            }
            
            // Coba ping device jika ada IP
            let pingStatus = 'unknown';
            const wifiPath = path.join(devicePath, 'wifi.json');
            
            try {
                const wifiContent = await fs.readFile(wifiPath, 'utf8');
                const wifiData = JSON.parse(wifiContent);
                
                if (wifiData.ESPIP && wifiData.ESPIP.trim() !== '') {
                    // Coba request ke node untuk memastikan status
                    pingStatus = await pingDevice(wifiData.ESPIP, nodeId);
                }
            } catch (error) {
                pingStatus = 'offline';
            }
            
            res.json({
                success: true,
                message: 'Status retrieved',
                deviceId: nodeId,
                nodeStatus: metaData.NodeStatus || 'offline',
                pingStatus: pingStatus,
                lastUpdated: metaData.lastUpdated || 'N/A'
            });
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                return res.status(404).json({
                    success: false,
                    error: 'Device not found'
                });
            }
            throw error;
        }
        
    } catch (error) {
        console.error('[Check Device Status Error]:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to check device status'
        });
    }
}

async function pingDevice(ipAddress, nodeId) {
    return new Promise((resolve) => {
        // Baca port dari node.properties
        const nodePropsPath = path.join(__dirname, '..', 'database', 'server-config', 'node.properties');
        
        fs.readFile(nodePropsPath, 'utf8').then(content => {
            let nodePort = 8080;
            const lines = content.split('\n');
            
            lines.forEach(line => {
                const [key, value] = line.split('=');
                if (key && key.trim() === 'node-port') {
                    nodePort = parseInt(value.trim());
                }
            });
            
            const options = {
                hostname: ipAddress,
                port: nodePort,
                path: '/',
                method: 'GET',
                timeout: 5000
            };
            
            const req = http.request(options, (response) => {
                console.log(`[${new Date().toISOString()}] ✅ ${nodeId} (${ipAddress}) is online`);
                resolve('online');
            });
            
            req.on('error', (error) => {
                console.log(`[${new Date().toISOString()}] ❌ ${nodeId} (${ipAddress}) is offline: ${error.message}`);
                resolve('offline');
            });
            
            req.on('timeout', () => {
                console.log(`[${new Date().toISOString()}] ⏱️  ${nodeId} (${ipAddress}) timeout`);
                req.destroy();
                resolve('offline');
            });
            
            req.end();
            
        }).catch(error => {
            console.log(`[${new Date().toISOString()}] ⚠️  Using default port for ${nodeId}`);
            resolve('unknown');
        });
    });
}

async function controlDevice(req, res) {
    try {
        const { nodeId } = req.params;
        const { action } = req.body;
        
        if (!nodeId || !action) {
            return res.status(400).json({
                success: false,
                error: 'Node ID and action are required'
            });
        }
        
        console.log(`[${new Date().toISOString()}] 🎛️  Controlling ${nodeId}: ${action}`);
        
        // Gunakan dashboard-updater API untuk kontrol relay
        try {
            const dashboardAPI = require('./dashboard-updater.js');
            const result = await dashboardAPI.controlRelay(req, res);
            return result;
        } catch (error) {
            throw error;
        }
        
    } catch (error) {
        console.error('[Control Device Error]:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to control device'
        });
    }
}

module.exports = {
    scanDevices,
    checkDeviceStatus,
    controlDevice,
    pingDevice
};