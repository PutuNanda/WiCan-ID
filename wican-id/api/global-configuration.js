const fs = require('fs').promises;
const path = require('path');

const basePath = path.join(__dirname, '..');
const serverConfigDir = path.join(basePath, 'database', 'server-config');
const templateDir = path.join(basePath, 'database', 'template');

const globalConfigPath = path.join(serverConfigDir, 'wican-global-config.properties');
const serverPropsPath = path.join(serverConfigDir, 'server.properties');
const espServerPropsPath = path.join(serverConfigDir, 'ESP-Server.properties');
const nodePropsPath = path.join(serverConfigDir, 'node.properties');
const espDefaultConfigPath = path.join(templateDir, 'ESP-default-config.properties');

function normalizeKey(key) {
    return String(key || '').trim().toLowerCase();
}

async function readProperties(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const config = {};
        content.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const [rawKey, rawValue] = trimmed.split('=');
            if (rawKey && rawValue !== undefined) {
                config[rawKey.trim()] = rawValue.trim();
            }
        });
        return config;
    } catch (error) {
        return {};
    }
}

async function writeProperties(filePath, orderedPairs) {
    const lines = orderedPairs.map(([key, value]) => {
        if (value === null || value === undefined) return `${key}`;
        return `${key}=${value}`;
    });
    const content = `${lines.join('\n')}\n`;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');
}

function getValue(config, key, fallback = '') {
    if (!config) return fallback;
    if (config[key] !== undefined) return config[key];
    const normalized = normalizeKey(key);
    const match = Object.keys(config).find(k => normalizeKey(k) === normalized);
    return match ? config[match] : fallback;
}

async function ensureGlobalConfigFile() {
    try {
        await fs.access(globalConfigPath);
        return;
    } catch (error) {
        // create from current configs (or defaults)
    }

    const serverProps = await readProperties(serverPropsPath);
    const espServerProps = await readProperties(espServerPropsPath);
    const nodeProps = await readProperties(nodePropsPath);
    const espDefaults = await readProperties(espDefaultConfigPath);

    const defaults = [
        ['Server-Web-Port', getValue(serverProps, 'server-port', '5050')],
        ['Server-Web-Listen', getValue(serverProps, 'server-listen', '0.0.0.0')],
        ['Server-Node-Port', getValue(espServerProps, 'ESP-Port', getValue(espDefaults, 'server-port', '5150'))],
        ['Server-Node-Listen', getValue(espServerProps, 'ESP-Listen', '0.0.0.0')],
        ['server-ip', getValue(espDefaults, 'server-ip', '192.168.1.50')],
        ['default-wifi-ssid', getValue(espDefaults, 'wifi-ssid', 'system')],
        ['default-wifi-password', getValue(espDefaults, 'wifi-password', 'ESP-8991')],
        ['node-port', getValue(nodeProps, 'node-port', getValue(espDefaults, 'node-port', '8080'))]
    ];

    await writeProperties(globalConfigPath, defaults);
}

async function syncGlobalConfig() {
    await ensureGlobalConfigFile();
    const globalConfig = await readProperties(globalConfigPath);

    const webPort = getValue(globalConfig, 'Server-Web-Port', '5050');
    const webListen = getValue(globalConfig, 'Server-Web-Listen', '0.0.0.0');
    const nodePort = getValue(globalConfig, 'Server-Node-Port', '5150');
    const nodeListen = getValue(globalConfig, 'Server-Node-Listen', '0.0.0.0');
    const serverIp = getValue(globalConfig, 'server-ip', '192.168.1.50');
    const defaultWifiSsid = getValue(globalConfig, 'default-wifi-ssid', 'system');
    const defaultWifiPassword = getValue(globalConfig, 'default-wifi-password', 'ESP-8991');
    const deviceNodePort = getValue(globalConfig, 'node-port', '8080');

    await writeProperties(serverPropsPath, [
        ['server-port', webPort],
        ['server-listen', webListen]
    ]);

    await writeProperties(espServerPropsPath, [
        ['ESP-Port', nodePort],
        ['ESP-Listen', nodeListen]
    ]);

    await writeProperties(espDefaultConfigPath, [
        ['# Default Configuration for ESP-01S Devices', null],
        ['# File: database/template/ESP-default-config.properties', null],
        ['', null],
        ['# Server Configuration', null],
        ['server-ip', serverIp],
        ['server-port', nodePort],
        ['', null],
        ['# Node Configuration', null],
        ['node-port', deviceNodePort],
        ['', null],
        ['# WiFi Configuration', null],
        ['wifi-ssid', defaultWifiSsid],
        ['wifi-password', defaultWifiPassword],
        ['', null],
        ['# ESP Configuration', null],
        ['# Note: Device ID and custom name are set per device', null],
        ['', null],
        ['# Default values are used when adding new devices', null],
        ['# These values can be overridden in the add-device form', null]
    ]);

    await writeProperties(nodePropsPath, [
        ['node-port', deviceNodePort]
    ]);
}

module.exports = {
    syncGlobalConfig
};
