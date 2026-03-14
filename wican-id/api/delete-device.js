const fs = require('fs').promises;
const path = require('path');

async function handleRequest(req, res) {
    try {
        const { deviceId } = req.params;
        
        console.log(`[${new Date().toISOString()}] 🗑️  Attempting to delete device: "${deviceId}"`);
        
        if (!deviceId) {
            return res.status(400).json({
                success: false,
                error: 'Device ID is required'
            });
        }
        
        const sanitizedDeviceId = deviceId.replace(/\.\./g, '').replace(/\//g, '');
        
        // ⚠️ PERBAIKI PATH! ⚠️
        const devicePath = path.join(process.cwd(), 'database', 'device', sanitizedDeviceId);
        
        console.log(`  📁 Device path: ${devicePath}`);
        console.log(`  📁 CWD: ${process.cwd()}`);
        
        try {
            // Cek apakah folder ada
            await fs.access(devicePath);
            console.log(`  ✅ Device folder exists`);
            
            // List isi folder
            const files = await fs.readdir(devicePath);
            console.log(`  📋 Files:`, files);
            
            // Hapus folder
            await fs.rm(devicePath, { recursive: true, force: true });
            
            console.log(`[${new Date().toISOString()}] ✅ Device deleted: "${sanitizedDeviceId}"`);
            
            res.json({
                success: true,
                message: 'Device deleted successfully',
                deviceId: sanitizedDeviceId
            });
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`[${new Date().toISOString()}] ❌ Device folder not found: "${sanitizedDeviceId}"`);
                
                return res.status(404).json({
                    success: false,
                    error: 'Device not found',
                    deviceId: sanitizedDeviceId,
                    path: devicePath
                });
            }
            
            throw error;
        }
        
    } catch (error) {
        console.error('[Delete Device API Error]:', error);
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