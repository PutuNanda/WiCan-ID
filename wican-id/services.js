// ============================================
// AUTO-UPDATE-NOW SERVICE
// ============================================
try {
    console.log('[Server] Initializing auto-update-now service...');
    require('./service/auto-update/auto-update-now.js');

    setTimeout(() => {
        console.log('[Server] Auto-update-now service will start automatically');
    }, 2000);

    console.log('[Server] Auto-update-now service loaded successfully');
} catch (error) {
    console.error('[Server] Failed to load auto-update-now:', error.message);
    console.log('[Server] Auto-update-now will not run! Check path: ./service/auto-update/auto-update-now.js');
}

// ============================================
// SCHEDULER SERVICE
// ============================================
try {
    console.log('[Server] Initializing scheduler service...');
    require('./service/scheduler/scheduler.js');
    console.log('[Server] Scheduler service loaded successfully');
} catch (error) {
    console.error('[Server] Failed to load scheduler:', error.message);
    console.log('[Server] Scheduler will not run! Check path: ./service/scheduler/scheduler.js');
}

// ============================================
// RELAY UPDATER SERVICE
// ============================================
try {
    console.log('[Server] Initializing relay-updater service...');
    const relayUpdater = require('./service/scheduler/relay-updater.js');

    setTimeout(() => {
        console.log('[Server] Starting relay-updater service...');
        relayUpdater.startRelayUpdater().catch(error => {
            console.error('[Server] Failed to start relay-updater:', error.message);
        });
    }, 3000);

    console.log('[Server] Relay-updater service loaded successfully');
} catch (error) {
    console.error('[Server] Failed to load relay-updater:', error.message);
    console.log('[Server] Relay-updater will not run! Check path: ./service/scheduler/relay-updater.js');
}

// ============================================
// BROWSER-ID TIMEOUT SERVICE
// ============================================
try {
    console.log('[Server] Initializing browser-id-timeout service...');
    const browserIdTimeout = require('./service/login/browser-id-timeout.js');

    setTimeout(() => {
        browserIdTimeout.startBrowserIdTimeoutService().catch(error => {
            console.error('[Server] Failed to start browser-id-timeout:', error.message);
        });
    }, 1500);

    console.log('[Server] Browser-id-timeout service loaded successfully');
} catch (error) {
    console.error('[Server] Failed to load browser-id-timeout:', error.message);
    console.log('[Server] Browser-id-timeout will not run! Check path: ./service/login/browser-id-timeout.js');
}

// ============================================
// BIN-CHECKER SERVICE
// ============================================
try {
    console.log('[Server] Initializing bin-checker service...');
    const binChecker = require('./service/bin-checker/bin-checker.js');

    setTimeout(() => {
        binChecker.startBinChecker().catch(error => {
            console.error('[Server] Failed to start bin-checker:', error.message);
        });
    }, 1000);

    console.log('[Server] Bin-checker service loaded successfully');
} catch (error) {
    console.error('[Server] Failed to load bin-checker:', error.message);
    console.log('[Server] Bin-checker will not run! Check path: ./service/bin-checker/bin-checker.js');
}

module.exports = {
    getServices: () => {
        return {
            autoUpdateNow: {
                status: 'loaded',
                path: './service/auto-update/auto-update-now.js'
            },
            scheduler: {
                status: 'loaded',
                path: './service/scheduler/scheduler.js'
            },
            relayUpdater: {
                status: 'loaded',
                path: './service/scheduler/relay-updater.js'
            },
            browserIdTimeout: {
                status: 'loaded',
                path: './service/login/browser-id-timeout.js'
            }
        };
    }
};
