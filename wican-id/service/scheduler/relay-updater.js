const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const deviceRoot = path.join(__dirname, '..', '..', 'database', 'device');
let updateNowService = null;

const deviceStates = new Map();
const feedbackTimeouts = new Map();
const retryCounts = new Map();
const watchers = new Map();
let newDeviceInterval = null;
let isRunning = false;

const DEFAULT_CONFIG = {
    'use-relay-feedback': false,
    'realtime-state-enforcement': false,
    'feedback-timeout-ms': 5000
};

function normalizeState(value) {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        if (v === 'on' || v === 'off') return v;
        if (v === 'null' || v === 'none') return 'null';
        return 'null';
    }
    return 'null';
}

async function readJsonSafe(filePath) {
    try {
        const data = await fsp.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

async function readScheduleState(deviceId) {
    const schedulePath = path.join(deviceRoot, deviceId, 'schedule-output.json');
    const parsed = await readJsonSafe(schedulePath);
    return normalizeState(parsed && parsed.relayState);
}

async function readRelayState(deviceId) {
    const relayPath = path.join(deviceRoot, deviceId, 'relay.json');
    const parsed = await readJsonSafe(relayPath);
    return normalizeState(parsed && parsed.relayState);
}

async function readMetaStatus(deviceId) {
    const metaPath = path.join(deviceRoot, deviceId, 'meta.json');
    const parsed = await readJsonSafe(metaPath);
    return normalizeState(parsed && parsed.deviceStatus);
}

function parseConfig(content) {
    const config = { ...DEFAULT_CONFIG };
    const lines = content.split('\n');
    for (const line of lines) {
        if (line.trim().startsWith('#') || line.trim() === '') continue;
        const match = line.match(/^([^=]+)\s*=\s*(.+)$/);
        if (!match) continue;
        const key = match[1].trim();
        const raw = match[2].trim();
        if (key === 'use-relay-feedback' || key === 'realtime-state-enforcement') {
            config[key] = raw.toLowerCase() === 'true';
        } else if (key === 'feedback-timeout-ms') {
            const num = parseInt(raw, 10);
            config[key] = Number.isFinite(num) ? num : DEFAULT_CONFIG['feedback-timeout-ms'];
        } else {
            config[key] = raw;
        }
    }
    return config;
}

async function readDeviceConfig(deviceId) {
    const configPath = path.join(deviceRoot, deviceId, 'schedule-config.properties');
    try {
        const data = await fsp.readFile(configPath, 'utf8');
        return parseConfig(data);
    } catch {
        return { ...DEFAULT_CONFIG };
    }
}

async function writeRelayState(deviceId, state) {
    const relayPath = path.join(deviceRoot, deviceId, 'relay.json');
    const output = { relayState: state };
    const payload = JSON.stringify(output, null, 2) + '\n';
    await fsp.writeFile(relayPath, payload);
    triggerUpdateNow(deviceId);
}

function triggerUpdateNow(deviceId) {
    if (!updateNowService) {
        try {
            updateNowService = require('../auto-update/auto-update-now.js');
        } catch {
            updateNowService = null;
        }
    }

    if (updateNowService && typeof updateNowService.manualTrigger === 'function') {
        updateNowService.manualTrigger(deviceId).catch(() => {});
    }
}

function getDeviceState(deviceId) {
    if (!deviceStates.has(deviceId)) {
        deviceStates.set(deviceId, {
            deviceId,
            scheduleState: 'null',
            relayState: 'null',
            deviceStatus: 'null',
            config: { ...DEFAULT_CONFIG },
            lastEnforceAt: 0,
            enforceTimer: null,
            feedbackTimer: null,
            pendingReads: new Map()
        });
    }
    return deviceStates.get(deviceId);
}

function clearTimers(deviceId) {
    const state = getDeviceState(deviceId);
    if (state.enforceTimer) {
        clearTimeout(state.enforceTimer);
        state.enforceTimer = null;
    }
    if (state.feedbackTimer) {
        clearTimeout(state.feedbackTimer);
        state.feedbackTimer = null;
    }
    feedbackTimeouts.delete(deviceId);
    retryCounts.delete(deviceId);
}

function scheduleRead(deviceId, key, fn) {
    const state = getDeviceState(deviceId);
    if (state.pendingReads.has(key)) return;
    const timer = setTimeout(async () => {
        state.pendingReads.delete(key);
        await fn();
    }, 100);
    state.pendingReads.set(key, timer);
}

async function refreshScheduleState(deviceId) {
    const state = getDeviceState(deviceId);
    const scheduleState = await readScheduleState(deviceId);
    if (state.scheduleState !== scheduleState) {
        state.scheduleState = scheduleState;
        console.log(`[relay-updater] Schedule target for ${deviceId}: ${scheduleState}`);
        processScheduleChange(deviceId, scheduleState);
    }
}

async function refreshRelayState(deviceId) {
    const state = getDeviceState(deviceId);
    const relayState = await readRelayState(deviceId);
    if (state.relayState !== relayState) {
        state.relayState = relayState;
        if (state.config['use-relay-feedback']) {
            handleFeedbackChange(deviceId);
        }
    }
}

async function refreshMetaStatus(deviceId) {
    const state = getDeviceState(deviceId);
    const deviceStatus = await readMetaStatus(deviceId);
    if (state.deviceStatus !== deviceStatus) {
        state.deviceStatus = deviceStatus;
        if (!state.config['use-relay-feedback']) {
            handleFeedbackChange(deviceId);
        }
    }
}

async function refreshConfig(deviceId) {
    const state = getDeviceState(deviceId);
    state.config = await readDeviceConfig(deviceId);
}

function getFeedbackValue(state) {
    return state.config['use-relay-feedback'] ? state.relayState : state.deviceStatus;
}

function shouldEnforce(state) {
    return state.scheduleState === 'on' || state.scheduleState === 'off';
}

function getNextRelayCommand(state) {
    if (state.relayState === 'on') return 'off';
    if (state.relayState === 'off') return 'on';
    return 'on';
}

function scheduleEnforcement(deviceId, reason) {
    const state = getDeviceState(deviceId);
    if (!shouldEnforce(state)) {
        clearTimers(deviceId);
        return;
    }

    if (state.config['use-relay-feedback']) {
        enforceNow(deviceId, reason);
        return;
    }

    const timeoutMs = state.config['feedback-timeout-ms'];
    const now = Date.now();
    const elapsed = now - state.lastEnforceAt;
    if (elapsed < timeoutMs) {
        if (state.enforceTimer) return;
        state.enforceTimer = setTimeout(() => {
            state.enforceTimer = null;
            enforceNow(deviceId, reason);
        }, timeoutMs - elapsed);
        return;
    }

    enforceNow(deviceId, reason);
}

function scheduleFeedbackRetry(deviceId) {
    const state = getDeviceState(deviceId);
    if (state.config['use-relay-feedback']) return;

    const timeoutMs = state.config['feedback-timeout-ms'];
    if (state.feedbackTimer) return;

    state.feedbackTimer = setTimeout(() => {
        state.feedbackTimer = null;
        const current = getFeedbackValue(state);
        if (shouldEnforce(state) && current !== state.scheduleState) {
            scheduleEnforcement(deviceId, 'timeout');
        }
    }, timeoutMs);
}

function enforceNow(deviceId, reason) {
    const state = getDeviceState(deviceId);
    if (!shouldEnforce(state)) return;

    const target = state.scheduleState;
    const feedback = getFeedbackValue(state);

    if (feedback === target) {
        clearTimers(deviceId);
        return;
    }

    state.lastEnforceAt = Date.now();
    retryCounts.set(deviceId, (retryCounts.get(deviceId) || 0) + 1);

    if (state.config['use-relay-feedback']) {
        writeRelayState(deviceId, target)
            .then(() => {})
            .catch(() => {});
        return;
    }

    const relayCommand = getNextRelayCommand(state);
    writeRelayState(deviceId, relayCommand)
        .then(() => {
            scheduleFeedbackRetry(deviceId);
        })
        .catch(() => {});
}

function handleFeedbackChange(deviceId) {
    const state = getDeviceState(deviceId);
    if (!shouldEnforce(state)) return;
    if (!state.config['realtime-state-enforcement']) return;

    const feedback = getFeedbackValue(state);
    if (feedback !== state.scheduleState) {
        scheduleEnforcement(deviceId, 'feedback-change');
    } else {
        clearTimers(deviceId);
    }
}

function processScheduleChange(deviceId, scheduleState) {
    const state = getDeviceState(deviceId);
    state.scheduleState = scheduleState;
    clearTimers(deviceId);

    if (!shouldEnforce(state)) {
        return;
    }

    scheduleEnforcement(deviceId, 'schedule-change');
}

function getDeviceConfig(deviceId) {
    const state = getDeviceState(deviceId);
    return state.config;
}

async function setupDevice(deviceId) {
    const state = getDeviceState(deviceId);
    state.config = await readDeviceConfig(deviceId);
    state.scheduleState = await readScheduleState(deviceId);
    state.relayState = await readRelayState(deviceId);
    state.deviceStatus = await readMetaStatus(deviceId);

    const devicePath = path.join(deviceRoot, deviceId);
    const watcher = fs.watch(devicePath, (event, filename) => {
        if (!filename) return;
        if (filename === 'schedule-output.json') {
            scheduleRead(deviceId, 'schedule', () => refreshScheduleState(deviceId));
        } else if (filename === 'relay.json') {
            scheduleRead(deviceId, 'relay', () => refreshRelayState(deviceId));
        } else if (filename === 'meta.json') {
            scheduleRead(deviceId, 'meta', () => refreshMetaStatus(deviceId));
        } else if (filename === 'schedule-config.properties') {
            scheduleRead(deviceId, 'config', () => refreshConfig(deviceId));
        }
    });

    watchers.set(deviceId, watcher);

    if (shouldEnforce(state)) {
        scheduleEnforcement(deviceId, 'initial');
    }
}

async function scanDevices() {
    let entries = [];
    try {
        entries = await fsp.readdir(deviceRoot, { withFileTypes: true });
    } catch {
        return;
    }

    const currentDevices = new Set();
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        currentDevices.add(entry.name);
        if (!watchers.has(entry.name)) {
            await setupDevice(entry.name);
        }
    }

    for (const deviceId of watchers.keys()) {
        if (!currentDevices.has(deviceId)) {
            cleanupDevice(deviceId);
        }
    }
}

function cleanupDevice(deviceId) {
    const watcher = watchers.get(deviceId);
    if (watcher) watcher.close();
    watchers.delete(deviceId);
    clearTimers(deviceId);
    deviceStates.delete(deviceId);
}

async function startRelayUpdater() {
    if (isRunning) return;
    isRunning = true;
    console.log('[relay-updater] Starting Relay Updater Service');
    await scanDevices();
    newDeviceInterval = setInterval(scanDevices, 10000);
}

function getStatus() {
    return {
        devices: Array.from(deviceStates.keys()),
        watchers: watchers.size,
        retries: Object.fromEntries(retryCounts)
    };
}

function cleanup() {
    if (newDeviceInterval) clearInterval(newDeviceInterval);
    newDeviceInterval = null;
    for (const deviceId of watchers.keys()) {
        cleanupDevice(deviceId);
    }
    isRunning = false;
}

module.exports = {
    startRelayUpdater,
    getStatus,
    cleanup,
    processScheduleChange,
    getDeviceConfig,
    deviceStates,
    feedbackTimeouts,
    retryCounts,
    watchers,
    newDeviceInterval
};


