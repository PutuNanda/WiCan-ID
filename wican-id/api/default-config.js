const fs = require('fs').promises;
const path = require('path');

async function handleRequest(req, res) {
    try {
        const configPath = path.join(__dirname, '..', 'database', 'template', 'ESP-default-config.properties');
        
        try {
            await fs.access(configPath);
            const content = await fs.readFile(configPath, 'utf8');
            const config = {};
            
            content.split('\n').forEach(line => {
                const [key, value] = line.split('=');
                if (key && value) {
                    config[key.trim()] = value.trim();
                }
            });

            res.json({
                success: true,
                config: config
            });
            
        } catch (error) {
            // File not found, return defaults
            res.json({
                success: true,
                config: {
                    'server-ip': '192.168.1.50',
                    'server-port': '5050',
                    'node-port': '8080',
                    'wifi-ssid': 'system',
                    'wifi-password': 'ESP-8991'
                }
            });
        }
        
    } catch (error) {
        console.error('Error in default-config API:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

module.exports = {
    handleRequest
};
