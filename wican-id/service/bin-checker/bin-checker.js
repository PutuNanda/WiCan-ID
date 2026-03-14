// ============================================
// FILE: service/bin-checker/bin-checker.js
// ============================================

const fs = require('fs').promises;
const path = require('path');

const TASK_INTERVAL_MS = 2000;
const SCAN_INTERVAL_MS = 60000;

const basePath = path.join(__dirname, '..', '..');
const deviceRoot = path.join(basePath, 'database', 'device');
const taskFilePath = path.join(__dirname, 'task-list.json');

let isProcessing = false;

function uniq(items) {
    return Array.from(new Set(items));
}

async function ensureTaskFile() {
    try {
        await fs.access(taskFilePath);
    } catch (error) {
        await fs.mkdir(path.dirname(taskFilePath), { recursive: true });
        await fs.writeFile(taskFilePath, JSON.stringify([], null, 2));
    }
}

async function loadTasks() {
    await ensureTaskFile();
    try {
        const content = await fs.readFile(taskFilePath, 'utf8');
        const data = JSON.parse(content);
        if (Array.isArray(data)) return data;
        return [];
    } catch (error) {
        return [];
    }
}

async function saveTasks(tasks) {
    await fs.writeFile(taskFilePath, JSON.stringify(uniq(tasks), null, 2));
}

async function enqueueTask(deviceId) {
    if (!deviceId) return false;
    const tasks = await loadTasks();
    if (!tasks.includes(deviceId)) {
        tasks.push(deviceId);
        await saveTasks(tasks);
        return true;
    }
    return false;
}

async function removeTask(deviceId) {
    const tasks = await loadTasks();
    const next = tasks.filter(id => id !== deviceId);
    await saveTasks(next);
}

async function deviceHasBin(deviceId) {
    const binPath = path.join(deviceRoot, deviceId, 'ESP-01S.bin');
    try {
        await fs.access(binPath);
        return true;
    } catch (error) {
        return false;
    }
}

async function scanDevicesForMissingBin() {
    try {
        const devices = await fs.readdir(deviceRoot);
        for (const deviceId of devices) {
            const devicePath = path.join(deviceRoot, deviceId);
            const stat = await fs.stat(devicePath);
            if (!stat.isDirectory()) continue;
            const hasBin = await deviceHasBin(deviceId);
            if (!hasBin) {
                await enqueueTask(deviceId);
            }
        }
    } catch (error) {
        // Ignore errors; service should keep running
    }
}

async function runCompilerForDevice(deviceId) {
    const sketchMover = require('../../api/sketch-mover.js');

    return new Promise(resolve => {
        const fakeReq = { body: { deviceId } };
        const fakeRes = {
            statusCode: 200,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(payload) {
                resolve({
                    success: payload && payload.success === true,
                    statusCode: this.statusCode,
                    payload
                });
            },
            send() {
                resolve({ success: false, statusCode: this.statusCode });
            }
        };

        Promise.resolve(sketchMover.handleRequest(fakeReq, fakeRes)).catch(error => {
            resolve({ success: false, error });
        });
    });
}

async function processQueueOnce() {
    if (isProcessing) return;
    isProcessing = true;

    try {
        const tasks = await loadTasks();
        if (tasks.length === 0) {
            return;
        }

        const deviceId = tasks[0];
        const hasBin = await deviceHasBin(deviceId);
        if (hasBin) {
            await removeTask(deviceId);
            return;
        }

        const result = await runCompilerForDevice(deviceId);
        if (result.success) {
            await removeTask(deviceId);
        }
    } finally {
        isProcessing = false;
    }
}

async function startBinChecker() {
    await ensureTaskFile();

    // Initial scan
    await scanDevicesForMissingBin();

    setInterval(() => {
        processQueueOnce();
    }, TASK_INTERVAL_MS);

    setInterval(() => {
        scanDevicesForMissingBin();
    }, SCAN_INTERVAL_MS);

    console.log(`[${new Date().toISOString()}] 📦 Bin-checker service started`);
}

module.exports = {
    startBinChecker,
    enqueueTask
};
