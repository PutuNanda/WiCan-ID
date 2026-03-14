const fs = require('fs').promises;
const path = require('path');

async function handleRequest(req, res) {
    console.log(`[${new Date().toISOString()}] 🔄 Relay-Reverse API called: ${req.method} ${req.url}`);
    
    try {
        // Extract nodeId dari URL
        const urlParts = req.url.split('/');
        const nodeId = urlParts[urlParts.length - 1];
        
        if (!nodeId || nodeId === 'relay-reverse') {
            return res.status(400).json({
                success: false,
                error: 'Node ID is required'
            });
        }

        // Handle berdasarkan method
        if (req.method === 'GET') {
            return await getReverseConfig(nodeId, res);
        } else if (req.method === 'POST') {
            return await updateReverseConfig(nodeId, req, res);
        } else {
            return res.status(405).json({
                success: false,
                error: 'Method not allowed'
            });
        }

    } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Error in relay-reverse API:`, error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
}

// GET: Baca konfigurasi reverse logic
async function getReverseConfig(nodeId, res) {
    const configPath = path.join(__dirname, '..', 'database', 'device', nodeId, 'node-config.properties');
    
    try {
        // Cek apakah folder device ada
        const deviceFolder = path.join(__dirname, '..', 'database', 'device', nodeId);
        await fs.access(deviceFolder);
        
        // Baca file config
        let reverseLogic = false;
        let fileExists = false;
        
        try {
            await fs.access(configPath);
            fileExists = true;
            
            const content = await fs.readFile(configPath, 'utf8');
            
            // Parse properties file
            content.split('\n').forEach(line => {
                line = line.trim();
                if (line && !line.startsWith('#')) {
                    const [key, value] = line.split('=');
                    if (key && key.trim() === 'reverse-logic-relay') {
                        reverseLogic = value.trim() === 'true';
                    }
                }
            });
            
        } catch (error) {
            // File tidak ada, gunakan default false
            console.log(`[${new Date().toISOString()}] ℹ️ Config file not found for ${nodeId}, using default`);
        }
        
        // Baca juga meta.json untuk mendapatkan customName
        let customName = nodeId;
        const metaPath = path.join(deviceFolder, 'meta.json');
        try {
            const metaContent = await fs.readFile(metaPath, 'utf8');
            const metaData = JSON.parse(metaContent);
            customName = metaData.customName || nodeId;
        } catch (error) {
            // Abaikan
        }
        
        res.json({
            success: true,
            nodeId: nodeId,
            customName: customName,
            reverseLogic: reverseLogic,
            configExists: fileExists,
            configPath: `database/device/${nodeId}/node-config.properties`
        });
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({
                success: false,
                error: 'Device not found',
                message: `Device folder for ${nodeId} does not exist`
            });
        }
        throw error;
    }
}

// POST: Update konfigurasi reverse logic
async function updateReverseConfig(nodeId, req, res) {
    const configPath = path.join(__dirname, '..', 'database', 'device', nodeId, 'node-config.properties');
    
    try {
        // Cek apakah folder device ada
        const deviceFolder = path.join(__dirname, '..', 'database', 'device', nodeId);
        await fs.access(deviceFolder);
        
        // Parse request body
        const { reverseLogic } = req.body;
        
        if (reverseLogic === undefined) {
            return res.status(400).json({
                success: false,
                error: 'reverseLogic field is required'
            });
        }
        
        // Konversi ke boolean
        const reverseLogicBool = Boolean(reverseLogic);
        const reverseLogicStr = reverseLogicBool ? 'true' : 'false';
        
        // Baca file config yang ada atau buat baru
        let existingContent = '';
        let fileExists = false;
        
        try {
            existingContent = await fs.readFile(configPath, 'utf8');
            fileExists = true;
        } catch (error) {
            // File tidak ada, kita buat baru
            existingContent = '';
        }
        
        // Update atau tambah baris reverse-logic-relay
        const lines = existingContent.split('\n');
        let found = false;
        const newLines = [];
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key] = trimmed.split('=');
                if (key && key.trim() === 'reverse-logic-relay') {
                    // Update existing line
                    newLines.push(`reverse-logic-relay = ${reverseLogicStr}`);
                    found = true;
                } else {
                    newLines.push(line);
                }
            } else {
                newLines.push(line);
            }
        }
        
        if (!found) {
            // Tambah baris baru jika belum ada
            if (newLines.length > 0 && newLines[newLines.length - 1] !== '') {
                newLines.push('');
            }
            newLines.push(`# Reverse Logic Relay - Updated: ${new Date().toISOString()}`);
            newLines.push(`reverse-logic-relay = ${reverseLogicStr}`);
        }
        
        // Tulis kembali ke file
        const newContent = newLines.join('\n');
        await fs.writeFile(configPath, newContent);
        
        // Log perubahan
        console.log(`[${new Date().toISOString()}] ✅ Updated reverse-logic-relay for ${nodeId}: ${reverseLogicStr}`);
        
        res.json({
            success: true,
            nodeId: nodeId,
            reverseLogic: reverseLogicBool,
            message: `Reverse logic relay ${reverseLogicBool ? 'diaktifkan' : 'dinonaktifkan'}`,
            configUpdated: true,
            fileExists: fileExists || true
        });
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({
                success: false,
                error: 'Device not found',
                message: `Device folder for ${nodeId} does not exist`
            });
        }
        throw error;
    }
}

module.exports = { handleRequest };