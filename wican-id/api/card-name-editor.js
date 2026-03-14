const fs = require('fs').promises;
const path = require('path');

async function handleRequest(req, res) {
    try {
        const { deviceId } = req.params;
        const { customName, action } = req.body;
        
        console.log(`[${new Date().toISOString()}] ✏️  Card name editor START for: "${deviceId}"`);
        console.log(`  Action: ${action || 'get'}`);
        
        if (!deviceId || deviceId.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Device ID is required'
            });
        }
        
        // Sanitize device ID
        const sanitizedDeviceId = deviceId.replace(/\.\./g, '').replace(/\//g, '');
        
        // ⚠️ ⚠️ ⚠️ PERBAIKI PATH INI! ⚠️ ⚠️ ⚠️
        // Path ke folder device - DARI server.js (root folder)
        const deviceFolderPath = path.join(process.cwd(), 'database', 'device', sanitizedDeviceId);
        const metaPath = path.join(deviceFolderPath, 'meta.json');
        
        console.log(`  📁 Current working directory: ${process.cwd()}`);
        console.log(`  📁 Device folder path: ${deviceFolderPath}`);
        console.log(`  📄 Meta file path: ${metaPath}`);
        
        // Debug: cek apakah path benar
        try {
            const rootPath = path.join(process.cwd(), 'database', 'device');
            const allDevices = await fs.readdir(rootPath);
            console.log(`  📋 All devices in database/device/:`, allDevices);
            console.log(`  📋 Looking for: "${sanitizedDeviceId}", Available: ${allDevices.includes(sanitizedDeviceId)}`);
        } catch (listError) {
            console.log(`  📋 Could not list devices:`, listError.message);
        }
        
        try {
            // Cek apakah FOLDER device ada
            await fs.access(deviceFolderPath);
            console.log(`  ✅ Device folder exists: ${sanitizedDeviceId}`);
            
            // Cek apakah file meta.json ada
            try {
                await fs.access(metaPath);
                console.log(`  ✅ Meta file exists`);
            } catch (metaError) {
                console.log(`  ⚠️  Meta file doesn't exist, creating default...`);
                
                // Buat meta.json default
                const defaultMeta = {
                    ESPID: sanitizedDeviceId,
                    customName: sanitizedDeviceId, // Default ke device ID
                    NodeStatus: "offline",
                    deviceStatus: "off",
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                };
                
                await fs.writeFile(metaPath, JSON.stringify(defaultMeta, null, 2));
                console.log(`  ✅ Created default meta.json`);
            }
            
            // Baca file meta.json
            const metaContent = await fs.readFile(metaPath, 'utf8');
            let metaData;
            
            try {
                metaData = JSON.parse(metaContent);
                console.log(`  📊 Meta data:`, {
                    ESPID: metaData.ESPID,
                    customName: metaData.customName,
                    NodeStatus: metaData.NodeStatus
                });
            } catch (parseError) {
                console.log(`  ⚠️  Meta file corrupted: ${parseError.message}`);
                return res.status(500).json({
                    success: false,
                    error: 'Meta file corrupted',
                    message: `Cannot parse meta.json for device "${sanitizedDeviceId}"`
                });
            }
            
            // Handle action
            if (action === 'update') {
                // Update nama kartu
                if (!customName || customName.trim() === '') {
                    return res.status(400).json({
                        success: false,
                        error: 'Custom name is required for update'
                    });
                }
                
                const oldName = metaData.customName || sanitizedDeviceId;
                const newName = customName.trim();
                
                metaData.customName = newName;
                metaData.lastUpdated = new Date().toISOString();
                
                // Simpan perubahan
                await fs.writeFile(metaPath, JSON.stringify(metaData, null, 2));
                
                console.log(`[${new Date().toISOString()}] ✅ Card name updated: "${oldName}" -> "${newName}"`);
                
                res.json({
                    success: true,
                    message: 'Card name updated successfully',
                    oldName: oldName,
                    newName: newName,
                    deviceId: sanitizedDeviceId
                });
                
            } else {
                // Get current name (default action)
                const currentName = metaData.customName || sanitizedDeviceId;
                
                console.log(`[${new Date().toISOString()}] ✅ Current name retrieved: "${currentName}"`);
                
                res.json({
                    success: true,
                    message: 'Current name retrieved successfully',
                    currentName: currentName,
                    deviceId: sanitizedDeviceId,
                    ESPID: metaData.ESPID,
                    NodeStatus: metaData.NodeStatus,
                    createdAt: metaData.createdAt,
                    lastUpdated: metaData.lastUpdated
                });
            }
            
        } catch (folderError) {
            // Folder tidak ditemukan
            if (folderError.code === 'ENOENT') {
                console.log(`[${new Date().toISOString()}] ❌ Device folder not found: "${sanitizedDeviceId}"`);
                
                return res.status(404).json({
                    success: false,
                    error: 'Device not found',
                    deviceId: sanitizedDeviceId,
                    message: `Folder "database/device/${sanitizedDeviceId}" does not exist`,
                    path: deviceFolderPath
                });
            }
            
            console.error(`  💥 Unexpected error:`, folderError);
            throw folderError;
        }
        
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Card Name Editor API Error:`, error);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
}

module.exports = {
    handleRequest
};