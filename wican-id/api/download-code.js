const fs = require('fs').promises;
const path = require('path');

async function handleRequest(req, res) {
    try {
        const { deviceId } = req.params;
        
        if (!deviceId) {
            return res.status(400).json({
                success: false,
                error: 'Device ID is required'
            });
        }
        
        const codePath = path.join(__dirname, '..', 'database', 'device', deviceId, 'ESP-01S.ino');
        
        try {
            await fs.access(codePath);
            
            // Read the file
            const fileContent = await fs.readFile(codePath, 'utf8');
            
            // Set headers for download
            res.setHeader('Content-Disposition', `attachment; filename="${deviceId}.ino"`);
            res.setHeader('Content-Type', 'text/plain');
            
            // Send the file
            res.send(fileContent);
            
            console.log(`[${new Date().toISOString()}] 📥 Downloaded code for: ${deviceId}`);
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                return res.status(404).json({
                    success: false,
                    error: 'Code file not found',
                    message: `Kode untuk perangkat ${deviceId} belum dibuat.`
                });
            }
            throw error;
        }
        
    } catch (error) {
        console.error('Error in download-code API:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

module.exports = {
    handleRequest
};