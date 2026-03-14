const fs = require('fs').promises;
const path = require('path');

async function handleRequest(req, res) {
    try {
        const { nodeId } = req.params;
        const {
            customName,
            nodeStatus,
            gpio3Status
        } = req.body;

        // ============= DEBUG LOG =============
        console.log('\n=== NODE-META DEBUG ===');
        console.log('Timestamp:', new Date().toISOString());
        console.log('nodeId:', nodeId);
        console.log('gpio3Status dari ESP:', gpio3Status);
        console.log('nodeStatus dari ESP:', nodeStatus);
        console.log('customName dari ESP:', customName);
        // ======================================

        if (!nodeId) {
            return res.status(400).json({ error: 'Node ID is required' });
        }

        const metaFilePath = path.join(__dirname, '..', 'database', 'device', nodeId, 'meta.json');

        try {
            // Cek apakah file meta.json ada
            await fs.access(metaFilePath);
            
            let metaData = {};
            try {
                const fileContent = await fs.readFile(metaFilePath, 'utf8');
                metaData = JSON.parse(fileContent);
                console.log('📖 Meta data BEFORE update:', JSON.stringify(metaData, null, 2));
            } catch (error) {
                // File ada tapi kosong/rusak, buat default
                console.log('⚠️ File meta.json rusak atau kosong, membuat default...');
                metaData = await createDefaultMetaData(nodeId);
            }

            // Update data jika ada dalam request
            if (customName !== undefined && metaData.customName === "") {
                console.log('📝 Mengupdate customName:', customName);
                metaData.customName = customName;
            }
            
            if (nodeStatus) {
                console.log('📝 Mengupdate NodeStatus:', nodeStatus);
                metaData.NodeStatus = nodeStatus;
            }
            
            // Update lastUpdated
            metaData.lastUpdated = new Date().toISOString();

            // ============= LOGIKA UTAMA YANG SUDAH DIPERBAIKI =============
            // GPIO3 Status ke Device Status conversion
            // Berdasarkan LOGIKA FISIK YANG SUDAH DIPERBAIKI:
            // - Jika pin HIGH (3.3V / tidak terhubung ke GND) → Device MATI/OFF
            // - Jika pin LOW (terhubung ke GND) → Device HIDUP/ON
            if (gpio3Status !== undefined) {
                console.log('\n🔌 GPIO3 Status dari ESP:', gpio3Status);
                console.log('📊 Konversi ke deviceStatus...');
                
                let deviceStatus;
                if (gpio3Status === 'high') {
                    deviceStatus = 'off';  // HIGH → OFF
                    console.log('✅ GPIO3 HIGH → Device OFF');
                } else if (gpio3Status === 'low') {
                    deviceStatus = 'on';   // LOW → ON
                    console.log('✅ GPIO3 LOW → Device ON');
                } else {
                    deviceStatus = 'unknown';
                    console.log('❓ GPIO3 status tidak dikenal:', gpio3Status);
                }
                
                console.log('🎯 Hasil akhir deviceStatus:', deviceStatus);
                metaData.deviceStatus = deviceStatus;
            } else {
                console.log('⚠️ gpio3Status tidak dikirim dari ESP');
            }
            // =============================================

            console.log('\n📖 Meta data AFTER update:', JSON.stringify(metaData, null, 2));
            console.log('=== END NODE-META DEBUG ===\n');

            // Simpan ke file
            await fs.writeFile(metaFilePath, JSON.stringify(metaData, null, 2));

            console.log(`✅ Updated meta.json for node: ${nodeId}`);
            res.json({ 
                success: true, 
                message: 'Meta data updated successfully',
                data: metaData
            });

        } catch (error) {
            // File tidak ada
            console.log(`❌ Meta file not found for node: ${nodeId}`);
            console.log('Path yang dicari:', metaFilePath);
            res.status(404).json({ 
                error: 'Meta file not found',
                message: 'meta.json does not exist for this node.' 
            });
        }

    } catch (error) {
        console.error('❌ Error in node-meta API:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function createDefaultMetaData(nodeId) {
    const defaultMeta = {
        ESPID: nodeId,
        customName: "",
        NodeStatus: "offline",
        deviceStatus: "off",
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };
    
    console.log('📝 Membuat default meta data:', JSON.stringify(defaultMeta, null, 2));
    return defaultMeta;
}

// Fungsi untuk update status node (dipanggil dari API lain)
async function updateNodeStatus(nodeId, status) {
    try {
        console.log(`🔄 updateNodeStatus dipanggil: ${nodeId} -> ${status}`);
        
        const metaFilePath = path.join(__dirname, '..', 'database', 'device', nodeId, 'meta.json');
        
        try {
            await fs.access(metaFilePath);
            
            let metaData = {};
            try {
                const fileContent = await fs.readFile(metaFilePath, 'utf8');
                metaData = JSON.parse(fileContent);
                console.log('📖 Meta data sebelum update status:', metaData);
            } catch (error) {
                console.log('⚠️ File meta.json tidak bisa dibaca');
                return;
            }

            metaData.NodeStatus = status;
            metaData.lastUpdated = new Date().toISOString();
            
            await fs.writeFile(metaFilePath, JSON.stringify(metaData, null, 2));
            
            console.log(`✅ Node status updated via meta API: ${nodeId} -> ${status}`);
        } catch (error) {
            console.log(`⚠️ File meta.json tidak ditemukan untuk node: ${nodeId}`);
        }
    } catch (error) {
        console.error(`❌ Error updating node status in meta API for ${nodeId}:`, error);
    }
}

module.exports = {
    handleRequest,
    updateNodeStatus
};