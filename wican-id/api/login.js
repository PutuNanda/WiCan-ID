const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const CREDENTIALS_DIR = path.join(__dirname, '..', 'database', 'credentials');
const USER_FILE = path.join(CREDENTIALS_DIR, 'user.json');
const BROWSERS_FILE = path.join(CREDENTIALS_DIR, 'browsers.json');
const BROWSER_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

function parseCookies(req) {
    const header = req.headers.cookie || '';
    const cookies = {};

    header.split(';').forEach((cookie) => {
        const [rawKey, ...rawValue] = cookie.trim().split('=');
        if (!rawKey) return;
        cookies[rawKey] = decodeURIComponent(rawValue.join('=') || '');
    });

    return cookies;
}

function appendSetCookie(res, value) {
    const current = res.getHeader('Set-Cookie');
    if (!current) {
        res.setHeader('Set-Cookie', [value]);
        return;
    }
    if (Array.isArray(current)) {
        res.setHeader('Set-Cookie', [...current, value]);
        return;
    }
    res.setHeader('Set-Cookie', [current, value]);
}

function setCookie(res, key, value, options = {}) {
    const serialized = [`${key}=${encodeURIComponent(value)}`];
    serialized.push('Path=/');
    serialized.push('SameSite=Lax');

    if (options.httpOnly !== false) {
        serialized.push('HttpOnly');
    }
    if (options.maxAgeSeconds) {
        serialized.push(`Max-Age=${options.maxAgeSeconds}`);
    }

    appendSetCookie(res, serialized.join('; '));
}

function clearCookie(res, key) {
    appendSetCookie(res, `${key}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`);
}

async function safeReadJson(filePath, fallback) {
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch (error) {
        return fallback;
    }
}

async function writeJson(filePath, data) {
    const raw = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, `${raw}\n`, 'utf8');
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, hash] = storedHash.split(':');
    const inputHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(inputHash, 'hex'));
}

function createBrowserId() {
    return `b-${crypto.randomUUID()}`;
}

function createSessionToken() {
    return crypto.randomBytes(48).toString('hex');
}

function isExpiredLogin(lastLogin) {
    if (!lastLogin) return true;
    const loginTime = new Date(lastLogin).getTime();
    if (Number.isNaN(loginTime)) return true;
    return Date.now() - loginTime > BROWSER_EXPIRY_MS;
}

async function ensureStorage() {
    await fs.mkdir(CREDENTIALS_DIR, { recursive: true });

    const currentUser = await safeReadJson(USER_FILE, null);
    if (!currentUser || typeof currentUser.user !== 'string' || typeof currentUser.password !== 'string') {
        await writeJson(USER_FILE, {});
    }

    const browsers = await safeReadJson(BROWSERS_FILE, null);
    if (!browsers || typeof browsers.browsers !== 'object' || !browsers.browsers) {
        await writeJson(BROWSERS_FILE, { browsers: {} });
    }
}

async function loadUser() {
    await ensureStorage();
    return safeReadJson(USER_FILE, {});
}

async function saveUser(user) {
    await ensureStorage();
    await writeJson(USER_FILE, user);
}

async function loadBrowsers() {
    await ensureStorage();
    const data = await safeReadJson(BROWSERS_FILE, { browsers: {} });
    if (!data.browsers || typeof data.browsers !== 'object') {
        data.browsers = {};
    }
    return data;
}

async function saveBrowsers(data) {
    await ensureStorage();
    await writeJson(BROWSERS_FILE, data);
}

function hasCredentials(userData) {
    return Boolean(
        userData &&
        typeof userData.user === 'string' &&
        userData.user.trim() &&
        typeof userData.password === 'string' &&
        userData.password.trim()
    );
}

async function pruneExpiredBrowsers() {
    const browsersData = await loadBrowsers();
    let changed = false;

    Object.keys(browsersData.browsers).forEach((browserId) => {
        const info = browsersData.browsers[browserId] || {};
        if (isExpiredLogin(info.lastLogin)) {
            delete browsersData.browsers[browserId];
            changed = true;
        }
    });

    if (changed) {
        await saveBrowsers(browsersData);
    }
}

function createBrowserRecord() {
    return {
        rememberme: false,
        loggedIn: false,
        sessionToken: null,
        lastLogin: null,
        updatedAt: new Date().toISOString()
    };
}

async function getOrCreateBrowserId(req, res) {
    const cookies = parseCookies(req);
    const inputId = cookies['browser-id'];
    const browsersData = await loadBrowsers();

    let browserId = inputId;
    const existing = browserId ? browsersData.browsers[browserId] : null;

    // Jika cookie lama tidak valid/terhapus, buat browser-id baru.
    if (!browserId || !existing) {
        browserId = createBrowserId();
        setCookie(res, 'browser-id', browserId, {
            maxAgeSeconds: 60 * 60 * 24 * 365 * 2,
            httpOnly: true
        });
        clearCookie(res, 'session-token');
    }

    if (!browsersData.browsers[browserId]) {
        browsersData.browsers[browserId] = createBrowserRecord();
        await saveBrowsers(browsersData);
    }

    return browserId;
}

async function isAuthenticated(req) {
    await pruneExpiredBrowsers();

    const user = await loadUser();
    if (!hasCredentials(user)) return false;

    const cookies = parseCookies(req);
    const browserId = cookies['browser-id'];
    if (!browserId) return false;

    const browsersData = await loadBrowsers();
    const browser = browsersData.browsers[browserId];
    if (!browser) return false;

    if (browser.rememberme === true) return true;

    const sessionToken = cookies['session-token'];
    if (!sessionToken) return false;
    return browser.loggedIn === true && browser.sessionToken && browser.sessionToken === sessionToken;
}

async function handleStatus(req, res) {
    try {
        await pruneExpiredBrowsers();
        const user = await loadUser();
        const setupRequired = !hasCredentials(user);
        const browserId = await getOrCreateBrowserId(req, res);
        const browsersData = await loadBrowsers();
        const browser = browsersData.browsers[browserId] || {};
        const authenticated = setupRequired ? false : await isAuthenticated(req);

        res.json({
            success: true,
            setupRequired,
            authenticated,
            browserId,
            rememberme: Boolean(browser.rememberme),
            lastLogin: browser.lastLogin || null
        });
    } catch (error) {
        console.error('Error in login status API:', error);
        res.status(500).json({ success: false, error: 'Failed to get login status' });
    }
}

function validateCredentialInput(username, password, confirmPassword) {
    if (!username || !password || !confirmPassword) return 'Username dan password wajib diisi';
    if (password !== confirmPassword) return 'Konfirmasi password tidak sama';
    if (String(username).trim().length < 3) return 'Username minimal 3 karakter';
    if (String(password).length < 6) return 'Password minimal 6 karakter';
    return null;
}

async function handleSetup(req, res) {
    try {
        await pruneExpiredBrowsers();
        const { username, password, confirmPassword, rememberMe } = req.body || {};
        const currentUser = await loadUser();

        if (hasCredentials(currentUser)) {
            return res.status(400).json({ success: false, error: 'Credentials already initialized' });
        }

        const validationError = validateCredentialInput(username, password, confirmPassword);
        if (validationError) {
            return res.status(400).json({ success: false, error: validationError });
        }

        await saveUser({
            user: String(username).trim(),
            password: hashPassword(String(password))
        });

        const browserId = await getOrCreateBrowserId(req, res);
        const browsersData = await loadBrowsers();
        const sessionToken = createSessionToken();
        const nowIso = new Date().toISOString();

        browsersData.browsers[browserId] = {
            rememberme: Boolean(rememberMe),
            loggedIn: true,
            sessionToken: rememberMe ? null : sessionToken,
            lastLogin: nowIso,
            updatedAt: nowIso
        };
        await saveBrowsers(browsersData);

        if (rememberMe) {
            clearCookie(res, 'session-token');
        } else {
            setCookie(res, 'session-token', sessionToken, { httpOnly: true });
        }

        res.json({ success: true, message: 'Credentials berhasil dibuat' });
    } catch (error) {
        console.error('Error in login setup API:', error);
        res.status(500).json({ success: false, error: 'Failed to setup credentials' });
    }
}

async function handleSignin(req, res) {
    try {
        await pruneExpiredBrowsers();
        const { username, password, rememberMe } = req.body || {};
        const user = await loadUser();

        if (!hasCredentials(user)) {
            return res.status(400).json({ success: false, error: 'Credentials belum dibuat' });
        }

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username dan password wajib diisi' });
        }

        const isValidUser = String(username).trim() === user.user;
        const isValidPassword = verifyPassword(String(password), user.password);
        if (!isValidUser || !isValidPassword) {
            return res.status(401).json({ success: false, error: 'Username atau password salah' });
        }

        const browserId = await getOrCreateBrowserId(req, res);
        const browsersData = await loadBrowsers();
        const sessionToken = createSessionToken();
        const nowIso = new Date().toISOString();

        browsersData.browsers[browserId] = {
            rememberme: Boolean(rememberMe),
            loggedIn: true,
            sessionToken: rememberMe ? null : sessionToken,
            lastLogin: nowIso,
            updatedAt: nowIso
        };
        await saveBrowsers(browsersData);

        if (rememberMe) {
            clearCookie(res, 'session-token');
        } else {
            setCookie(res, 'session-token', sessionToken, { httpOnly: true });
        }

        res.json({ success: true, message: 'Login berhasil' });
    } catch (error) {
        console.error('Error in signin API:', error);
        res.status(500).json({ success: false, error: 'Failed to sign in' });
    }
}

async function handleChangeCredentials(req, res) {
    try {
        const authenticated = await isAuthenticated(req);
        if (!authenticated) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { username, oldPassword, newPassword, confirmNewPassword } = req.body || {};
        if (!username || !oldPassword || !newPassword || !confirmNewPassword) {
            return res.status(400).json({ success: false, error: 'Semua kolom wajib diisi' });
        }
        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ success: false, error: 'Konfirmasi password baru tidak sama' });
        }
        if (String(username).trim().length < 3 || String(newPassword).length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Username minimal 3 karakter dan password minimal 6 karakter'
            });
        }

        const current = await loadUser();
        if (!verifyPassword(String(oldPassword), current.password)) {
            return res.status(401).json({ success: false, error: 'Password lama salah' });
        }

        await saveUser({
            user: String(username).trim(),
            password: hashPassword(String(newPassword))
        });

        res.json({ success: true, message: 'Username dan password berhasil diperbarui' });
    } catch (error) {
        console.error('Error in change credentials API:', error);
        res.status(500).json({ success: false, error: 'Failed to change credentials' });
    }
}

async function handleLogout(req, res) {
    try {
        const cookies = parseCookies(req);
        const browserId = cookies['browser-id'];
        if (browserId) {
            const browsersData = await loadBrowsers();
            if (browsersData.browsers[browserId]) {
                browsersData.browsers[browserId].rememberme = false;
                browsersData.browsers[browserId].loggedIn = false;
                browsersData.browsers[browserId].sessionToken = null;
                browsersData.browsers[browserId].updatedAt = new Date().toISOString();
                await saveBrowsers(browsersData);
            }
        }

        clearCookie(res, 'session-token');
        res.json({ success: true, message: 'Logout berhasil' });
    } catch (error) {
        console.error('Error in logout API:', error);
        res.status(500).json({ success: false, error: 'Failed to logout' });
    }
}

module.exports = {
    ensureStorage,
    isAuthenticated,
    pruneExpiredBrowsers,
    handleStatus,
    handleSetup,
    handleSignin,
    handleChangeCredentials,
    handleLogout
};
