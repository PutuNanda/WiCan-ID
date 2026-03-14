const fs = require('fs').promises;
const path = require('path');

async function handleRequest(req, res) {
    try {
        const { deviceId } = req.params;
        
        if (!deviceId) {
            console.log('[MANIFEST] ❌ No device ID');
            return res.status(400).json({ error: 'Device ID required' });
        }

        console.log(`[${new Date().toISOString()}] 📄 Generating manifest for: ${deviceId}`);

        // Set header JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Buat manifest data
        const manifest = {
            "name": `ESP-01S: ${deviceId}`,
            "version": "1.0",
            "builds": [
                {
                    "chipFamily": "ESP8266",
                    "parts": [
                        {
                            "path": `/api/download-binary/${deviceId}`,
                            "offset": 0
                        }
                    ]
                }
            ]
        };

        // Kirim sebagai JSON
        res.json(manifest);
        
        console.log(`[${new Date().toISOString()}] ✅ Manifest sent for: ${deviceId}`);

    } catch (error) {
        console.error(`[${new Date().toISOString()}] 💥 Manifest error:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    handleRequest
};