const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();

// ============================================
// ROUTE API YANG SUDAH ADA
// ============================================

// Route untuk Login/Auth
router.get('/api/login/status', async (req, res) => {
    try {
        const loginAPI = require('./api/login.js');
        await loginAPI.handleStatus(req, res);
    } catch (error) {
        console.error('Error in login status API:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

router.post('/api/login/setup', async (req, res) => {
    try {
        const loginAPI = require('./api/login.js');
        await loginAPI.handleSetup(req, res);
    } catch (error) {
        console.error('Error in login setup API:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

router.post('/api/login/signin', async (req, res) => {
    try {
        const loginAPI = require('./api/login.js');
        await loginAPI.handleSignin(req, res);
    } catch (error) {
        console.error('Error in signin API:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

router.post('/api/login/change', async (req, res) => {
    try {
        const loginAPI = require('./api/login.js');
        await loginAPI.handleChangeCredentials(req, res);
    } catch (error) {
        console.error('Error in change credentials API:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

router.post('/api/login/logout', async (req, res) => {
    try {
        const loginAPI = require('./api/login.js');
        await loginAPI.handleLogout(req, res);
    } catch (error) {
        console.error('Error in logout API:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Route untuk API dashboard
router.get('/api/dashboard', async (req, res) => {
    try {
        const dashboardAPI = require('./api/dashboard-updater.js');
        await dashboardAPI.handleRequest(req, res);
    } catch (error) {
        console.error('Error in dashboard API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// Route untuk API node-wifi
router.post('/api/node-wifi/:nodeId', async (req, res) => {
    try {
        const nodeWifiAPI = require('./api/node-wifi.js');
        await nodeWifiAPI.handleRequest(req, res);
    } catch (error) {
        console.error('Error in node-wifi API:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route untuk API node-relay GET (untuk node)
router.get('/api/node-relay/:nodeId', async (req, res) => {
    try {
        const nodeRelayAPI = require('./api/node-relay.js');
        await nodeRelayAPI.handleGetRequest(req, res);
    } catch (error) {
        console.error('Error in node-relay GET API:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route untuk API node-relay POST (untuk admin/update relay state)
router.post('/api/node-relay/:nodeId', async (req, res) => {
    try {
        const nodeRelayAPI = require('./api/node-relay.js');
        await nodeRelayAPI.handlePostRequest(req, res);
    } catch (error) {
        console.error('Error in node-relay POST API:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route untuk API node-meta
router.post('/api/node-meta/:nodeId', async (req, res) => {
    try {
        const nodeMetaAPI = require('./api/node-meta.js');
        await nodeMetaAPI.handleRequest(req, res);
    } catch (error) {
        console.error('Error in node-meta API:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route untuk time-date API
router.get('/api/time-date', async (req, res) => {
    try {
        const timeDateAPI = require('./api/time-date.js');
        await timeDateAPI.handleRequest(req, res);
    } catch (error) {
        console.error('Error in time-date API:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// ROUTE API ADD DEVICE SYSTEM
// ============================================

// Route untuk API add-device
router.post('/api/add-device', async (req, res) => {
    try {
        const addDeviceAPI = require('./api/add-device.js');
        await addDeviceAPI.handleRequest(req, res);
    } catch (error) {
        console.error('Error in add-device API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// Route untuk API default-config
router.get('/api/default-config', async (req, res) => {
    try {
        const defaultConfigAPI = require('./api/default-config.js');
        await defaultConfigAPI.handleRequest(req, res);
    } catch (error) {
        console.error('Error in default-config API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// Route untuk API download-code
router.get('/api/download-code/:deviceId', async (req, res) => {
    try {
        const downloadCodeAPI = require('./api/download-code.js');
        await downloadCodeAPI.handleRequest(req, res);
    } catch (error) {
        console.error('Error in download-code API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// Route untuk API code-preview
router.get('/api/code-preview/:deviceId', async (req, res) => {
    try {
        const addDeviceAPI = require('./api/add-device.js');
        const code = await addDeviceAPI.getCodePreview(req.params.deviceId);
        
        res.json({
            success: true,
            code: code
        });
        
    } catch (error) {
        console.error('Error in code-preview API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Route untuk API device-info
router.get('/api/device-info/:deviceId', async (req, res) => {
    try {
        const addDeviceAPI = require('./api/add-device.js');
        const deviceInfo = await addDeviceAPI.getDeviceInfo(req.params.deviceId);
        
        res.json({
            success: true,
            device: deviceInfo
        });
        
    } catch (error) {
        console.error('Error in device-info API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Route untuk API check-compilation-status
router.get('/api/check-compilation/:deviceId', async (req, res) => {
    try {
        const addDeviceAPI = require('./api/add-device.js');
        const status = await addDeviceAPI.checkCompilationStatus(req.params.deviceId);
        
        res.json({
            success: true,
            status: status
        });
        
    } catch (error) {
        console.error('Error in check-compilation API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Route untuk API manual-compile
router.post('/api/manual-compile/:deviceId', async (req, res) => {
    try {
        const addDeviceAPI = require('./api/add-device.js');
        const result = await addDeviceAPI.triggerManualCompilation(req.params.deviceId);
        
        res.json(result);
        
    } catch (error) {
        console.error('Error in manual-compile API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// ============================================
// ROUTE API ESP FLASHER (BARU)
// ============================================

// Route untuk API esp-flasher (cek status binary)
router.get('/api/esp-flasher/:deviceId', async (req, res) => {
    try {
        const espFlasherAPI = require('./api/esp-flasher.js');
        await espFlasherAPI.handleRequest(req, res);
    } catch (error) {
        console.error('Error in esp-flasher API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// ============================================
// ROUTE MANIFEST (UNTUK ESP WEB TOOLS)
// ============================================

// Route untuk manifest dinamis
router.get('/api/manifest/:deviceId', async (req, res) => {
    try {
        const manifestAPI = require('./api/manifest.js');
        await manifestAPI.handleRequest(req, res);
    } catch (error) {
        console.error('Error in manifest API:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route untuk download binary - INI SATU-SATUNYA YANG HARUS ADA!
router.get('/api/download-binary/:deviceId', async (req, res) => {
    try {
        const downloadBinaryAPI = require('./api/download-binary.js');
        await downloadBinaryAPI.handleRequest(req, res);
    } catch (error) {
        console.error('Error downloading binary:', error);
        if (!res.headersSent) {
            res.status(500).send('Internal server error');
        }
    }
});

// ============================================
// ROUTE API MCU-TOOLS SYSTEM (BARU)
// ============================================

// Route untuk API sketch-mover (kompilasi otomatis)
router.post('/api/sketch-mover', async (req, res) => {
    try {
        const sketchMoverAPI = require('./api/sketch-mover.js');
        await sketchMoverAPI.handleRequest(req, res);
    } catch (error) {
        console.error('Error in sketch-mover API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// Route untuk API mcu-tools-status
router.get('/api/mcu-tools-status', async (req, res) => {
    try {
        const validateMCUTools = require('./mcu-tools/compiler.js');
        const status = await validateMCUTools.validateStructure();
        
        res.json({
            success: true,
            status: status,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error in mcu-tools-status API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// ============================================
// ROUTE API ESP CONTROL SYSTEM
// ============================================

// Route untuk API scan-devices
router.get('/api/scan-devices', async (req, res) => {
    try {
        const espControlAPI = require('./api/esp-control.js');
        await espControlAPI.scanDevices(req, res);
    } catch (error) {
        console.error('Error in scan-devices API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// Route untuk API check-device-status
router.get('/api/check-device-status/:nodeId', async (req, res) => {
    try {
        const espControlAPI = require('./api/esp-control.js');
        await espControlAPI.checkDeviceStatus(req, res);
    } catch (error) {
        console.error('Error in check-device-status API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// Route untuk API control-device
router.post('/api/control-device/:nodeId', async (req, res) => {
    try {
        const espControlAPI = require('./api/esp-control.js');
        await espControlAPI.controlDevice(req, res);
    } catch (error) {
        console.error('Error in control-device API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// ============================================
// ROUTE API CARD EDIT SYSTEM (BARU)
// ============================================

// Route untuk API delete-device
router.delete('/api/delete-device/:deviceId', async (req, res) => {
    try {
        const deleteDeviceAPI = require('./api/delete-device.js');
        await deleteDeviceAPI.handleRequest(req, res);
    } catch (error) {
        console.error('Error in delete-device API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// Route untuk API created-info
router.get('/api/created-info/:deviceId', async (req, res) => {
    try {
        const createdInfoAPI = require('./api/created-info.js');
        await createdInfoAPI.handleRequest(req, res);
    } catch (error) {
        console.error('Error in created-info API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// Route untuk API card-name-editor (POST)
router.post('/api/card-name-editor/:deviceId', async (req, res) => {
    console.log(`ðŸŽ¯ DEBUG: card-name-editor route hit! Device: ${req.params.deviceId}`);
    console.log(`  Method: ${req.method}, URL: ${req.url}`);
    
    try {
        const cardNameEditorAPI = require('./api/card-name-editor.js');
        console.log('  âœ… API module loaded successfully');
        await cardNameEditorAPI.handleRequest(req, res);
    } catch (error) {
        console.error('âŒ Error in card-name-editor API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// ============================================
// ROUTE API UTILITY
// ============================================

// Route untuk API server-info
router.get('/api/server-info', async (req, res) => {
    try {
        const config = await loadServerConfig();
        const now = new Date();
        
        res.json({
            success: true,
            server: {
                name: 'ESP-01S IoT Server',
                version: '1.0.0',
                port: config['server-port'] || 5050,
                listen: config['server-listen'] || '0.0.0.0',
                uptime: process.uptime(),
                timestamp: now.toISOString()
            },
            features: {
                addDevice: true,
                autoCompile: true,
                mcuTools: true,
                deviceControl: true,
                dashboard: true
            }
        });
        
    } catch (error) {
        console.error('Error in server-info API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// Route untuk API health-check
router.get('/api/health', async (req, res) => {
    try {
        // Cek struktur folder penting
        const importantFolders = [
            'database/device',
            'database/template',
            'database/server-config',
            'api',
            'public',
            'mcu-tools'
        ];
        
        const folderStatus = {};
        
        for (const folder of importantFolders) {
            const folderPath = path.join(__dirname, folder);
            try {
                await fs.access(folderPath);
                folderStatus[folder] = 'exists';
            } catch (error) {
                folderStatus[folder] = 'missing';
            }
        }
        
        res.json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            folders: folderStatus,
            memory: process.memoryUsage(),
            uptime: process.uptime()
        });
        
    } catch (error) {
        console.error('Error in health-check API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// Route untuk API esp-handshake (handshake dengan ESP)
router.post('/server-info', async (req, res) => {
    try {
        const espHandshakeAPI = require('./api/esp-handshake.js');
        await espHandshakeAPI.handleRequest(req, res);
    } catch (error) {
        console.error('Error in esp-handshake API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// ============================================
// ROUTE API ESP RESTART ALL (BARU)
// ============================================

// Route untuk API esp-restart-all
router.post('/api/esp-restart-all', async (req, res) => {
    try {
        const espRestartAllAPI = require('./api/esp-restart-all.js');
        await espRestartAllAPI.handleRequest(req, res);
    } catch (error) {
        console.error('Error in esp-restart-all API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// ============================================
// ROUTE API ESP RESTART INDIVIDUAL (BARU)
// ============================================

// Route untuk API esp-restart (Single Device)
router.post('/api/esp-restart/:deviceId', async (req, res) => {
    try {
        const espRestartAPI = require('./api/esp-restart.js');
        await espRestartAPI.handleRequest(req, res);
    } catch (error) {
        console.error('âŒ Error in esp-restart API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: error.message,
            deviceId: req.params.deviceId
        });
    }
});

// ============================================
// ROUTE API REFRESH UPDATE (BARU)
// ============================================

// Route untuk API refresh-update (global refresh)
router.post('/api/refresh-update', async (req, res) => {
    try {
        const refreshUpdateAPI = require('./api/refresh-update.js');
        await refreshUpdateAPI.handleRequest(req, res);
    } catch (error) {
        console.error('âŒ Error in refresh-update API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// ============================================
// ROUTE API RELAY REVERSE (BARU)
// ============================================

// Route untuk API relay-reverse
router.all('/api/relay-reverse/:nodeId', async (req, res) => {
    try {
        const relayReverseAPI = require('./api/relay-reverse.js');
        await relayReverseAPI.handleRequest(req, res);
    } catch (error) {
        console.error('âŒ Error in relay-reverse API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// ============================================
// ROUTE API SCHEDULE SYSTEM (BARU)
// ============================================

// Route untuk API schedule controller
router.all('/api/schedule/:deviceId', async (req, res) => {
    try {
        const scheduleController = require('./api/schedule-controller.js');
        await scheduleController.handleRequest(req, res);
    } catch (error) {
        console.error('âŒ Error in schedule-controller API:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// ============================================
// ROUTE API SCHEDULE SETTINGS EDITOR (BARU)
// ============================================

// Route untuk GET schedule settings
router.get('/api/schedule-settings-editor/:deviceId', async (req, res) => {
    try {
        const scheduleSettingsEditor = require('./api/schedule-settings-editor.js');
        await scheduleSettingsEditor.handleRequest(req, res);
    } catch (error) {
        console.error('âŒ Error in schedule-settings-editor GET:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Route untuk POST/PUT schedule settings
router.post('/api/schedule-settings-editor/:deviceId', async (req, res) => {
    try {
        const scheduleSettingsEditor = require('./api/schedule-settings-editor.js');
        await scheduleSettingsEditor.handleRequest(req, res);
    } catch (error) {
        console.error('âŒ Error in schedule-settings-editor POST:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// ============================================
// ROUTE UNTUK FALLBACK
// ============================================

router.get('*', (req, res) => {
    if (req.url.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            error: 'API endpoint not found'
        });
    }

    const notFoundPath = path.join(__dirname, 'public', 'error', '404.html');
    return res.status(404).sendFile(notFoundPath);
});

// Fungsi loadServerConfig untuk API server-info
async function loadServerConfig() {
    try {
        const configPath = path.join(__dirname, 'database', 'server-config', 'server.properties');
        const data = await fs.readFile(configPath, 'utf8');
        const config = {};
        data.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                config[key.trim()] = value.trim();
            }
        });
        return config;
    } catch (error) {
        return {
            'server-port': '5050',
            'server-listen': '0.0.0.0'
        };
    }
}

module.exports = router;
