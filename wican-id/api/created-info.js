const fs = require('fs').promises;
const path = require('path');

async function handleRequest(req, res) {
    try {
        const { deviceId } = req.params;
        
        console.log(`[${new Date().toISOString()}] 📋 Getting creation info for: "${deviceId}"`);
        
        if (!deviceId || deviceId.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Device ID is required'
            });
        }
        
        const sanitizedDeviceId = deviceId.replace(/\.\./g, '').replace(/\//g, '');
        
        // ⚠️ PERBAIKI PATH! ⚠️
        const metaPath = path.join(process.cwd(), 'database', 'device', sanitizedDeviceId, 'meta.json');
        
        console.log(`  📁 Meta path: ${metaPath}`);
        
        try {
            // Cek apakah file ada
            await fs.access(metaPath);
            
            // Baca file meta.json
            const metaContent = await fs.readFile(metaPath, 'utf8');
            const metaData = JSON.parse(metaContent);
            
            console.log(`  ✅ Meta file found`);
            
            // Format response
            const creationInfo = {
                deviceId: sanitizedDeviceId,
                createdAt: metaData.createdAt || "N/A",
                lastUpdated: metaData.lastUpdated || "N/A",
                binaryGeneratedAt: metaData.binaryGeneratedAt || "N/A",
                customName: metaData.customName || sanitizedDeviceId,
                espId: metaData.ESPID || sanitizedDeviceId,
                nodeStatus: metaData.NodeStatus || "unknown",
                deviceStatus: metaData.deviceStatus || "off"
            };
            
            console.log(`[${new Date().toISOString()}] ✅ Creation info retrieved for: "${sanitizedDeviceId}"`);
            
            res.json({
                success: true,
                message: 'Creation info retrieved successfully',
                data: creationInfo
            });
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`[${new Date().toISOString()}] ❌ Meta file not found: "${sanitizedDeviceId}"`);
                
                return res.status(404).json({
                    success: false,
                    error: 'Device not found',
                    deviceId: sanitizedDeviceId,
                    path: metaPath
                });
            }
            
            if (error instanceof SyntaxError) {
                console.log(`  ❌ JSON parse error:`, error.message);
                return res.status(500).json({
                    success: false,
                    error: 'Meta file corrupted',
                    deviceId: sanitizedDeviceId
                });
            }
            
            throw error;
        }
        
    } catch (error) {
        console.error('[Created Info API Error]:', error);
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