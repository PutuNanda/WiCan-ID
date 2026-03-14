const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();

// Minimal middleware for ESP endpoints
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

function parseProperties(content) {
    const config = {};
    content.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            config[key.trim()] = value.trim();
        }
    });
    return config;
}

async function loadESPServerConfig() {
    const configPath = path.join(__dirname, 'database', 'server-config', 'ESP-Server.properties');
    try {
        await fs.access(configPath);
        const content = await fs.readFile(configPath, 'utf8');
        return parseProperties(content);
    } catch (error) {
        const defaultConfig = { 'ESP-Port': '5150', 'ESP-Listen': '0.0.0.0' };
        try {
            await fs.mkdir(path.dirname(configPath), { recursive: true });
            const defaultContent = 'ESP-Port=5150\nESP-Listen=0.0.0.0\n';
            await fs.writeFile(configPath, defaultContent);
        } catch (writeError) {
            // ignore
        }
        return defaultConfig;
    }
}

function registerEspRoutes() {
    app.post('/server-info', async (req, res) => {
        try {
            const espHandshakeAPI = require('./api/esp-handshake.js');
            await espHandshakeAPI.handleRequest(req, res);
        } catch (error) {
            console.error('Error in esp-handshake API:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    app.post('/api/node-wifi/:nodeId', async (req, res) => {
        try {
            const nodeWifiAPI = require('./api/node-wifi.js');
            await nodeWifiAPI.handleRequest(req, res);
        } catch (error) {
            console.error('Error in node-wifi API:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    app.post('/api/node-meta/:nodeId', async (req, res) => {
        try {
            const nodeMetaAPI = require('./api/node-meta.js');
            await nodeMetaAPI.handleRequest(req, res);
        } catch (error) {
            console.error('Error in node-meta API:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    app.get('/api/node-relay/:nodeId', async (req, res) => {
        try {
            const nodeRelayAPI = require('./api/node-relay.js');
            await nodeRelayAPI.handleGetRequest(req, res);
        } catch (error) {
            console.error('Error in node-relay GET API:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    app.get('/api/health', (req, res) => {
        res.json({ success: true, status: 'ok', service: 'ESP-Server' });
    });
}

async function startESPServer() {
    const config = await loadESPServerConfig();
    const port = parseInt(config['ESP-Port']) || 5150;
    const host = config['ESP-Listen'] || '0.0.0.0';

    registerEspRoutes();

    app.listen(port, host, () => {
        console.log('='.repeat(80));
        console.log('📡 ESP-Server (Device API Only)');
        console.log('='.repeat(80));
        console.log(`🌐 ESP server running at: http://${host}:${port}`);
        console.log('Endpoints:');
        console.log('  POST /server-info');
        console.log('  POST /api/node-wifi/:nodeId');
        console.log('  POST /api/node-meta/:nodeId');
        console.log('  GET  /api/node-relay/:nodeId');
        console.log('  GET  /api/health');
        console.log('='.repeat(80));
    });
}

module.exports = {
    startESPServer
};
