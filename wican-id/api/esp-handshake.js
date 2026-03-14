// esp-handshake.js
const fs = require('fs').promises;
const path = require('path');
const http = require('http');

async function handleRequest(req, res) {
    try {
        console.log(`[${new Date().toISOString()}] 📡 Received /server-info request`);

        const requestData = req.body;
        
        if (!requestData) {
            console.log(`[${new Date().toISOString()}] ❌ No request data received`);
            return res.status(400).json({ 
                success: false, 
                error: 'No request data' 
            });
        }

        const { nodeID, nodeIP, handshakeType, message } = requestData;

        if (!nodeID) {
            console.log(`[${new Date().toISOString()}] ❌ nodeID is required`);
            return res.status(400).json({ 
                success: false, 
                error: 'nodeID is required' 
            });
        }

        if (!nodeIP) {
            console.log(`[${new Date().toISOString()}] ❌ nodeIP is required`);
            return res.status(400).json({ 
                success: false, 
                error: 'nodeIP is required' 
            });
        }

        console.log(`[${new Date().toISOString()}] 🤝 Handshake from: ${nodeID} (IP: ${nodeIP}, Type: ${handshakeType || 'initial'})`);

        // Cek apakah folder node ada
        const nodeFolderPath = path.join(__dirname, '..', 'database', 'device', nodeID);
        
        try {
            await fs.access(nodeFolderPath);
            console.log(`[${new Date().toISOString()}] ✅ Node folder found`);
        } catch (error) {
            console.log(`[${new Date().toISOString()}] ❌ Node folder not found: ${nodeID}`);
            return res.status(404).json({ 
                success: false, 
                error: 'Node folder not found',
                message: `Folder for node ${nodeID} does not exist.` 
            });
        }

        // Update files dengan IP baru
        const isRunningAnnouncement = (typeof message === 'string' && message.trim() === 'ESP Is Running');
        const metaUpdated = await updateMetaFile(nodeID, nodeIP, handshakeType, message, isRunningAnnouncement);
        const wifiUpdated = await updateWifiFile(nodeID, nodeIP);
        
        if (!metaUpdated || !wifiUpdated) {
            console.log(`[${new Date().toISOString()}] ❌ Failed to update files for ${nodeID}`);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to update node files' 
            });
        }

        // Berikan response langsung ke ESP terlebih dahulu
        console.log(`[${new Date().toISOString()}] 📨 Sending immediate response to ESP`);
        
        res.json({ 
            success: true, 
            message: 'Handshake completed successfully',
            nodeID: nodeID,
            nodeIP: nodeIP,
            feedbackRequested: (handshakeType === 'initial' || handshakeType === 'ip_change'),
            serverTime: new Date().toISOString(),
            handshakeStatus: 'accepted'
        });

        // Setelah response dikirim, kirim feedback ke ESP (background task)
        // HANYA JIKA INI HANDSHAKE PERTAMA KALI ATAU IP BERUBAH
        if (handshakeType === 'initial' || handshakeType === 'ip_change') {
            console.log(`[${new Date().toISOString()}] ⏳ Sending feedback in background...`);
            
            // Kirim feedback secara async (tidak blocking)
            sendFeedbackInBackground(nodeID, nodeIP).then(feedbackResult => {
                if (feedbackResult.success) {
                    console.log(`[${new Date().toISOString()}] ✅ Background feedback sent successfully to ${nodeID}`);
                } else {
                    console.log(`[${new Date().toISOString()}] ⚠️  Background feedback failed for ${nodeID}: ${feedbackResult.message}`);
                }
            }).catch(error => {
                console.error(`[${new Date().toISOString()}] 💥 Background feedback error:`, error.message);
            });
        } else {
            console.log(`[${new Date().toISOString()}] ⏭️  Skipping feedback for ${handshakeType} handshake`);
        }

        console.log(`[${new Date().toISOString()}] ✅ Handshake processing completed for ${nodeID}`);

    } catch (error) {
        console.error(`[${new Date().toISOString()}] 💥 Error in esp-handshake API:`, error);
        
        if (!res.headersSent) {
            res.status(500).json({ 
                success: false, 
                error: 'Internal server error',
                message: error.message 
            });
        }
    }
}

async function updateMetaFile(nodeID, nodeIP, handshakeType, message, isRunningAnnouncement) {
    try {
        const metaFilePath = path.join(__dirname, '..', 'database', 'device', nodeID, 'meta.json');
        
        let metaData = {};
        try {
            const fileContent = await fs.readFile(metaFilePath, 'utf8');
            metaData = JSON.parse(fileContent);
        } catch (error) {
            console.log(`[${new Date().toISOString()}] ❌ Cannot read meta.json for ${nodeID}:`, error.message);
            return false;
        }

        const oldIP = metaData.ESPIP || 'not set';
        
        // Update ESPIP hanya jika berubah
        if (oldIP !== nodeIP) {
            console.log(`[${new Date().toISOString()}] 🔄 IP changed in meta.json: ${oldIP} -> ${nodeIP}`);
            metaData.ESPIP = nodeIP;
        } else {
            console.log(`[${new Date().toISOString()}] ⏭️  IP unchanged in meta.json: ${nodeIP}`);
        }
        
        metaData.lastUpdated = new Date().toISOString();
        metaData.NodeStatus = "online";
        if (isRunningAnnouncement === true) {
            metaData.lastRunningMessage = "ESP Is Running";
            metaData.lastRunningMessageAt = new Date().toISOString();
        }
        if (handshakeType) {
            metaData.lastHandshakeType = handshakeType;
        }
        if (message) {
            metaData.lastHandshakeMessage = message;
        }

        await fs.writeFile(metaFilePath, JSON.stringify(metaData, null, 2));
        console.log(`[${new Date().toISOString()}] ✅ meta.json updated`);
        
        return true;
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Error updating meta.json for ${nodeID}:`, error);
        return false;
    }
}

async function updateWifiFile(nodeID, nodeIP) {
    try {
        const wifiFilePath = path.join(__dirname, '..', 'database', 'device', nodeID, 'wifi.json');
        
        let wifiData = {};
        try {
            const fileContent = await fs.readFile(wifiFilePath, 'utf8');
            wifiData = JSON.parse(fileContent);
        } catch (error) {
            console.log(`[${new Date().toISOString()}] ❌ Cannot read wifi.json for ${nodeID}:`, error.message);
            return false;
        }

        const oldIP = wifiData.ESPIP || 'not set';
        
        // Update ESPIP hanya jika berubah
        if (oldIP !== nodeIP) {
            console.log(`[${new Date().toISOString()}] 🔄 IP changed in wifi.json: ${oldIP} -> ${nodeIP}`);
            wifiData.ESPIP = nodeIP;
        } else {
            console.log(`[${new Date().toISOString()}] ⏭️  IP unchanged in wifi.json: ${nodeIP}`);
        }
        
        wifiData.updatedAt = new Date().toISOString();

        await fs.writeFile(wifiFilePath, JSON.stringify(wifiData, null, 2));
        console.log(`[${new Date().toISOString()}] ✅ wifi.json updated`);
        
        return true;
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Error updating wifi.json for ${nodeID}:`, error);
        return false;
    }
}

async function sendFeedbackInBackground(nodeID, nodeIP) {
    return new Promise(async (resolve) => {
        try {
            // Baca node.properties untuk mendapatkan port
            const nodePropsPath = path.join(__dirname, '..', 'database', 'server-config', 'node.properties');
            let nodePort = 8080; // Default port
            
            try {
                const propsContent = await fs.readFile(nodePropsPath, 'utf8');
                const lines = propsContent.split('\n');
                lines.forEach(line => {
                    const [key, value] = line.split('=');
                    if (key && key.trim() === 'node-port') {
                        nodePort = parseInt(value.trim());
                    }
                });
                console.log(`[${new Date().toISOString()}] 🔧 Using port ${nodePort} for feedback`);
            } catch (error) {
                // File tidak ada, buat default
                const defaultProps = 'node-port=8080\n';
                await fs.writeFile(nodePropsPath, defaultProps);
                console.log(`[${new Date().toISOString()}] 📝 Created default node.properties`);
            }

            // Kirim feedback ke ESP via endpoint /server-feedback
            const postData = JSON.stringify({
                feedback: "server-side-good",
                timestamp: new Date().toISOString(),
                nodeID: nodeID,
                serverMessage: "Handshake successful - LED will blink 3 times",
                serverTimestamp: new Date().toISOString()
            });

            const options = {
                hostname: nodeIP,
                port: nodePort,
                path: '/server-feedback',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 2000  // Hanya 2 detik timeout - jika ESP tidak merespons, itu OK
            };

            console.log(`[${new Date().toISOString()}] 📤 Sending background feedback to ${nodeIP}:${nodePort}`);

            const req = http.request(options, (response) => {
                let responseData = '';
                
                response.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                response.on('end', () => {
                    console.log(`[${new Date().toISOString()}] ✅ ESP accepted feedback: HTTP ${response.statusCode}`);
                    console.log(`[${new Date().toISOString()}] 📨 ESP response: ${responseData.substring(0, 100)}...`);
                    resolve({ success: true, message: 'ESP responded' });
                });
            });

            req.on('error', (error) => {
                // Ini NORMAL - ESP mungkin sudah menutup koneksi setelah menerima response handshake
                console.log(`[${new Date().toISOString()}] ℹ️  ESP connection closed (normal behavior): ${error.message}`);
                resolve({ success: false, message: 'ESP connection closed', error: error.message });
            });

            req.on('timeout', () => {
                // Ini juga NORMAL - ESP mungkin sibuk dengan hal lain
                console.log(`[${new Date().toISOString()}] ⏱️  Feedback timeout (ESP busy or not listening)`);
                req.destroy();
                resolve({ success: false, message: 'Feedback timeout', error: 'timeout' });
            });

            req.write(postData);
            req.end();

        } catch (error) {
            console.error(`[${new Date().toISOString()}] 💥 Error in background feedback:`, error.message);
            resolve({ success: false, message: 'Internal error', error: error.message });
        }
    });
}

module.exports = {
    handleRequest
};
