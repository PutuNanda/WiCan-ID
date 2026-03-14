const loginAPI = require('../../api/login');

let timer = null;

async function runCleanup() {
    try {
        await loginAPI.pruneExpiredBrowsers();
    } catch (error) {
        console.error('[Browser-ID Timeout] Cleanup error:', error.message);
    }
}

async function startBrowserIdTimeoutService() {
    if (timer) return;

    await runCleanup();

    // Jalankan setiap 1 jam untuk hapus browser-id yang lastLogin > 30 hari.
    timer = setInterval(runCleanup, 60 * 60 * 1000);

    console.log('✅ [Browser-ID Timeout] Service started (interval: 1 hour)');
}

function stopBrowserIdTimeoutService() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
}

module.exports = {
    startBrowserIdTimeoutService,
    stopBrowserIdTimeoutService,
    runCleanup
};
