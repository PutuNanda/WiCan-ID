const fs = require('fs').promises;
const path = require('path');

async function handleRequest(req, res) {
    try {
        const { nodeId } = req.params;
        const {
            wifiSSID,
            nodeIP,
            wifiRSSI,
            nodePort,
            gpio3Status
        } = req.body;

        // Validasi nodeId
        if (!nodeId) {
            return res.status(400).json({ error: 'Node ID is required' });
        }

        console.log(`[${new Date().toISOString()}] ESP POST from: ${nodeId}`);

        // Path ke folder node
        const nodeFolderPath = path.join(__dirname, '..', 'database', 'device', nodeId);
        const wifiFilePath = path.join(nodeFolderPath, 'wifi.json');

        try {
            // Cek apakah folder node ada
            await fs.access(nodeFolderPath);
            
            // Cek apakah file wifi.json ada
            let wifiData = {};
            try {
                const fileContent = await fs.readFile(wifiFilePath, 'utf8');
                wifiData = JSON.parse(fileContent);
            } catch (error) {
                // File tidak ada atau kosong, buat struktur default
                wifiData = {
                    ESPIP: "",
                    WifiSSID: "",
                    rssi: 0
                };
            }

            // Update data jika ada dalam request
            if (nodeIP) wifiData.ESPIP = nodeIP;
            if (wifiSSID) wifiData.WifiSSID = wifiSSID;
            if (wifiRSSI !== undefined) wifiData.rssi = parseInt(wifiRSSI);

            // Simpan ke file
            await fs.writeFile(wifiFilePath, JSON.stringify(wifiData, null, 2));
            
            // UPDATE META.JSON KE ONLINE!
            await updateMetaDataToOnline(nodeId, nodeIP, wifiSSID, gpio3Status);

            console.log(`[${new Date().toISOString()}] ✅ ${nodeId} -> ONLINE (IP: ${nodeIP || wifiData.ESPIP || 'unknown'})`);
            
            res.json({ 
                success: true, 
                message: 'WiFi data updated successfully',
                data: wifiData
            });

        } catch (error) {
            // Folder tidak ada
            console.log(`[${new Date().toISOString()}] ❌ Node folder not found: ${nodeId}`);
            res.status(404).json({ 
                error: 'Node folder not found',
                message: 'Folder for this node does not exist. Create it manually first.' 
            });
        }

    } catch (error) {
        console.error('Error in node-wifi API:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function updateMetaDataToOnline(nodeId, nodeIP, wifiSSID, gpio3Status) {
    try {
        const metaFilePath = path.join(__dirname, '..', 'database', 'device', nodeId, 'meta.json');
        
        let metaData = {};
        try {
            const fileContent = await fs.readFile(metaFilePath, 'utf8');
            metaData = JSON.parse(fileContent);
        } catch (error) {
            // File tidak ada, tidak bisa update
            console.log(`[${new Date().toISOString()}] ⚠️  Meta file not found for ${nodeId}`);
            return;
        }

        // UPDATE KE ONLINE (selalu!)
        metaData.NodeStatus = "online";
        metaData.lastUpdated = new Date().toISOString();
        
        // Update ESPIP jika ada
        if (nodeIP && nodeIP.trim() !== '') {
            metaData.ESPIP = nodeIP;
        }
        
        // PERBAIKAN DI SINI: Update GPIO3 status dengan LOGIKA YANG SAMA DENGAN NODE-META.JS
        if (gpio3Status !== undefined) {
            // HIGH = "off", LOW = "on" (sama dengan node-meta.js)
            const deviceStatus = (gpio3Status === 'high') ? 'off' : 'on';
            metaData.deviceStatus = deviceStatus;
            console.log(`[${new Date().toISOString()}] 🔌 GPIO3: ${gpio3Status} -> deviceStatus: ${deviceStatus}`);
        }

        await fs.writeFile(metaFilePath, JSON.stringify(metaData, null, 2));
        
    } catch (error) {
        console.error(`Error updating meta data for ${nodeId}:`, error);
    }
}

// Fungsi untuk update status manual (dipanggil dari node-relay.js)
async function updateNodeStatus(nodeId, status) {
    try {
        const metaFilePath = path.join(__dirname, '..', 'database', 'device', nodeId, 'meta.json');
        
        let metaData = {};
        try {
            const fileContent = await fs.readFile(metaFilePath, 'utf8');
            metaData = JSON.parse(fileContent);
        } catch (error) {
            console.log(`[${new Date().toISOString()}] Cannot update status for ${nodeId}: meta.json not found`);
            return false;
        }

        // Update status
        metaData.NodeStatus = status;
        metaData.lastUpdated = new Date().toISOString();
        
        await fs.writeFile(metaFilePath, JSON.stringify(metaData, null, 2));
        
        console.log(`[${new Date().toISOString()}] 🔄 ${nodeId} -> ${status.toUpperCase()} (via manual update)`);
        return true;
        
    } catch (error) {
        console.error(`Error updating node status for ${nodeId}:`, error);
        return false;
    }
}

module.exports = {
    handleRequest,
    updateMetaDataToOnline,
    updateNodeStatus
};