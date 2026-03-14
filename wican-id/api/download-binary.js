const fs = require('fs');
const path = require('path');

async function handleRequest(req, res) {
    console.log(`[${new Date().toISOString()}] 📥 DOWNLOAD BINARY REQUEST: ${req.params.deviceId}`);
    
    try {
        const { deviceId } = req.params;
        
        if (!deviceId || deviceId.trim() === '') {
            console.log('❌ No device ID provided');
            return res.status(400).send('Device ID required');
        }

        // Path ke binary file
        const binaryPath = path.join(__dirname, '..', 'database', 'device', deviceId, 'ESP-01S.bin');
        console.log(`📁 Binary path: ${binaryPath}`);

        // Cek apakah file exists
        if (!fs.existsSync(binaryPath)) {
            console.log(`❌ Binary not found: ${binaryPath}`);
            return res.status(404).send('Binary file not found. Please compile the device first.');
        }

        // Get file stats
        const stats = fs.statSync(binaryPath);
        const fileSize = stats.size;
        
        console.log(`✅ Binary found: ${deviceId} (${(fileSize/1024).toFixed(2)} KB)`);

        // **HANYA SET HEADER INI SAJA! TANPA JSON RESPONSE!**
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', fileSize);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Stream file langsung ke response
        const fileStream = fs.createReadStream(binaryPath);
        fileStream.pipe(res);
        
        // Handle stream errors
        fileStream.on('error', (error) => {
            console.error('❌ Stream error:', error);
            if (!res.headersSent) {
                res.status(500).send('Stream error');
            }
        });
        
        console.log(`🎯 Binary stream started for: ${deviceId}`);
        
    } catch (error) {
        console.error('💥 FATAL ERROR in download-binary:', error);
        if (!res.headersSent) {
            res.status(500).send('Internal server error');
        }
    }
}

module.exports = {
    handleRequest
};