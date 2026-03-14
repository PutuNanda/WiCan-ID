const fs = require('fs').promises;
const path = require('path');

async function handleRequest(req, res) {
    try {
        const { deviceId } = req.params;
        
        if (!deviceId) {
            return res.status(400).json({
                success: false,
                error: 'Device ID required'
            });
        }

        console.log(`[${new Date().toISOString()}] 🔍 Checking binary for: ${deviceId}`);

        // Cek folder device
        const deviceFolder = path.join(__dirname, '..', 'database', 'device', deviceId);
        
        let folderExists = false;
        try {
            await fs.access(deviceFolder);
            folderExists = true;
        } catch (error) {
            return res.status(404).json({
                success: false,
                error: 'Device not found'
            });
        }

        // Cek binary file
        const binaryPath = path.join(deviceFolder, 'ESP-01S.bin');
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

        // Cek source code
        const sourcePath = path.join(deviceFolder, 'ESP-01S.ino');
        let sourceExists = false;
        
        try {
            await fs.access(sourcePath);
            sourceExists = true;
        } catch (error) {
            sourceExists = false;
        }

        // Cek meta.json
        const metaPath = path.join(deviceFolder, 'meta.json');
        let customName = deviceId;
        let hasBinary = false;
        
        try {
            const metaContent = await fs.readFile(metaPath, 'utf8');
            const metaData = JSON.parse(metaContent);
            customName = metaData.customName || deviceId;
            hasBinary = metaData.hasBinary || false;
        } catch (error) {
            // Meta tidak ditemukan
        }

        res.json({
            success: true,
            device: {
                id: deviceId,
                customName: customName,
                binaryExists: binaryExists,
                sourceExists: sourceExists,
                hasBinaryInMeta: hasBinary,
                binarySize: binarySize,
                binarySizeKB: binaryExists ? (binarySize / 1024).toFixed(2) : 0,
                readyForFlashing: binaryExists
            }
        });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] 💥 Error:`, error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

module.exports = {
    handleRequest
};