// schedule-settings.js - Mobile Version with Full Dynamic Content
// ESP-01S Schedule Settings Page - 100% JavaScript Generated

// ====================================
// GLOBAL VARIABLES
// ====================================
let currentDeviceId = '';
let currentDeviceName = '';
let configData = null;
let isLoading = false;
let originalConfig = null; // Untuk tracking perubahan

// ====================================
// INITIALIZATION
// ====================================
async function initScheduleSettingsPage() {
    console.log('⚙️ Initializing Schedule Settings Page (Mobile)...');
    
    // Get deviceId from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentDeviceId = urlParams.get('deviceid');
    
    if (!currentDeviceId) {
        showErrorAndRedirect('ID Perangkat tidak ditemukan di URL');
        return;
    }
    
    console.log('⚙️ Loading settings for device:', currentDeviceId);
    
    // Create DOM structure
    createDOMStructure();
    
    // Get DOM elements after creation
    cacheElements();
    
    // Setup header scroll behavior
    setupHeaderScroll();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load device info and config
    await loadDeviceInfo();
    await loadConfig();
}

// ====================================
// CREATE FULL DOM STRUCTURE
// ====================================
function createDOMStructure() {
    const app = document.getElementById('app');
    if (!app) return;
    
    app.innerHTML = `
        <!-- HEADER (SAMA PERSIS DENGAN HALAMAN LAIN) -->
        <header id="mainHeader">
            <div class="header-left">
                <div class="logo-container">
                    <div class="logo" style="background:#111827;border:1px solid rgba(255,255,255,0.35);"><img src="/WiCan-icon.png" alt="WiCan" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></div>
                    <div class="logo-text">
                        <h1>WiCan</h1>
                        <p>Pengaturan Jadwal</p>
                    </div>
                </div>
            </div>

            <div class="header-right">
                <!-- Tombol Back -->
                <button class="action-btn" id="backBtn" title="Kembali ke Jadwal">
                    <i class="fas fa-arrow-left"></i>
                </button>
            </div>
        </header>

        <!-- MAIN CONTENT -->
        <div class="container">
            <div class="page-header">
                <h2>
                    <i class="fas fa-sliders-h"></i>
                    <span id="pageTitle">Pengaturan Jadwal</span>
                </h2>
                <div class="device-info" id="deviceInfo">
                    <i class="fas fa-microchip"></i>
                    <span id="deviceName">Memuat...</span>
                </div>
            </div>

            <!-- LOADING STATE -->
            <div class="loading-container" id="loadingState">
                <div class="loading"></div>
                <p>Memuat pengaturan jadwal...</p>
            </div>

            <!-- ERROR STATE (Config Not Found) -->
            <div class="error-card" id="errorState" style="display: none;">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>File Konfigurasi Tidak Ditemukan</h3>
                <p id="errorMessage">
                    File <strong>schedule-config.properties</strong> tidak ditemukan untuk perangkat ini.<br><br>
                    File konfigurasi hanya akan dibuat otomatis saat pertama kali Anda menyimpan pengaturan.
                </p>
                <button class="btn btn-primary" id="createConfigBtn" style="margin: 0 auto;">
                    <i class="fas fa-plus-circle"></i> Buat File Konfigurasi Baru
                </button>
            </div>

            <!-- SETTINGS CARD (Main Settings) -->
            <div class="settings-card" id="settingsCard" style="display: none;">
                <div class="card-title">
                    <i class="fas fa-sliders-h"></i> Konfigurasi Jadwal
                </div>

                <!-- Setting 1: Use Relay Feedback -->
                <div class="setting-item">
                    <div class="setting-header">
                        <div class="setting-label">
                            <i class="fas fa-sync-alt"></i>
                            Gunakan Umpan Balik dari Relay
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="useRelayFeedback">
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div class="setting-description">
                        Jika true (ON): Sistem membaca feedback dari status relay itu sendiri.<br>
                        Jika false (OFF): Sistem membaca feedback dari sensor atau status asli perangkat.
                    </div>
                </div>

                <!-- Setting 2: Realtime State Enforcement -->
                <div class="setting-item">
                    <div class="setting-header">
                        <div class="setting-label">
                            <i class="fas fa-bolt"></i>
                            Koreksi Status Perangkat Realtime
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="realtimeEnforcement">
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div class="setting-description">
                        Jika true (ON): Sistem akan langsung mengoreksi perubahan status yang terjadi di luar kendali jadwal.
                    </div>
                </div>

                <!-- Setting 3: Feedback Timeout -->
                <div class="setting-item">
                    <div class="setting-header">
                        <div class="setting-label">
                            <i class="fas fa-hourglass-half"></i>
                            Waktu Umpan Balik (Timeout)
                        </div>
                        <span class="value-badge" id="timeoutValue">5000 ms</span>
                    </div>
                    <div class="setting-description">
                        Jika feedback tidak berubah meskipun state baru sudah dikirim, maka anggap timeout dan akan mengirim ulang perintah sampai feedback sesuai.
                    </div>
                    <div class="input-group">
                        <input type="number" id="feedbackTimeout" 
                               placeholder="Masukkan waktu dalam milidetik" 
                               min="1000" max="30000" step="500" value="5000">
                        <span class="unit">ms</span>
                    </div>
                </div>

                <!-- Info Card -->
                <div class="info-card">
                    <p>
                        <i class="fas fa-info-circle"></i>
                        Perubahan akan langsung diterapkan ke file konfigurasi perangkat. 
                        File akan dibuat secara otomatis jika belum ada saat Anda menyimpan.
                    </p>
                </div>

                <!-- Button Group -->
                <div class="button-group">
                    <button class="btn btn-secondary" id="resetBtn">
                        <i class="fas fa-undo-alt"></i> Reset
                    </button>
                    <button class="btn btn-primary" id="saveBtn">
                        <i class="fas fa-save"></i> Simpan Pengaturan
                    </button>
                </div>
            </div>
        </div>

        <!-- MODAL: Success -->
        <div class="modal" id="successModal">
            <div class="modal-content">
                <div class="modal-header" style="background: linear-gradient(135deg, #38b000, #2a9d8f);">
                    <h3 style="color: white;">
                        <i class="fas fa-check-circle"></i> Berhasil!
                    </h3>
                </div>
                <div class="modal-body" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-check-circle" style="font-size: 4rem; color: #38b000; margin-bottom: 1rem;"></i>
                    <h3 style="margin-bottom: 0.5rem;" id="successMessage">Pengaturan berhasil disimpan</h3>
                    <p style="color: var(--gray);">File konfigurasi telah diperbarui.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-modal" id="okSuccessBtn">
                        <i class="fas fa-check"></i> OK
                    </button>
                </div>
            </div>
        </div>

        <!-- MODAL: Error -->
        <div class="modal" id="errorModal">
            <div class="modal-content">
                <div class="modal-header" style="background: linear-gradient(135deg, #f72585, #d00000);">
                    <h3 style="color: white;">
                        <i class="fas fa-exclamation-triangle"></i> Gagal!
                    </h3>
                </div>
                <div class="modal-body">
                    <i class="fas fa-exclamation-circle" style="color: var(--danger);"></i>
                    <h3 style="color: var(--dark); margin-bottom: 0.5rem;">Terjadi Kesalahan</h3>
                    <p id="errorModalMessage">Gagal menyimpan pengaturan. Silakan coba lagi.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-modal" id="okErrorBtn">
                        <i class="fas fa-check"></i> Tutup
                    </button>
                </div>
            </div>
        </div>

        <!-- TOAST NOTIFICATION -->
        <div class="toast" id="toast"></div>
    `;
}

// DOM Elements cache
let header, backBtn, pageTitle, deviceName, deviceInfo;
let loadingState, errorState, settingsCard;
let useRelayFeedback, realtimeEnforcement, feedbackTimeout, timeoutValue;
let resetBtn, saveBtn, createConfigBtn;
let errorMessage;
let successModal, errorModal, successMessage, errorModalMessage;
let okSuccessBtn, okErrorBtn;
let toast;

function cacheElements() {
    // Header
    header = document.getElementById('mainHeader');
    backBtn = document.getElementById('backBtn');
    pageTitle = document.getElementById('pageTitle');
    deviceName = document.getElementById('deviceName');
    deviceInfo = document.getElementById('deviceInfo');
    
    // States
    loadingState = document.getElementById('loadingState');
    errorState = document.getElementById('errorState');
    settingsCard = document.getElementById('settingsCard');
    errorMessage = document.getElementById('errorMessage');
    createConfigBtn = document.getElementById('createConfigBtn');
    
    // Settings
    useRelayFeedback = document.getElementById('useRelayFeedback');
    realtimeEnforcement = document.getElementById('realtimeEnforcement');
    feedbackTimeout = document.getElementById('feedbackTimeout');
    timeoutValue = document.getElementById('timeoutValue');
    
    // Buttons
    resetBtn = document.getElementById('resetBtn');
    saveBtn = document.getElementById('saveBtn');
    
    // Modals
    successModal = document.getElementById('successModal');
    errorModal = document.getElementById('errorModal');
    successMessage = document.getElementById('successMessage');
    errorModalMessage = document.getElementById('errorModalMessage');
    okSuccessBtn = document.getElementById('okSuccessBtn');
    okErrorBtn = document.getElementById('okErrorBtn');
    
    toast = document.getElementById('toast');
}

// ====================================
// HEADER SCROLL BEHAVIOR
// ====================================
function setupHeaderScroll() {
    function handleHeaderOnScroll() {
        if (window.scrollY > 15) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }
    
    window.addEventListener('scroll', handleHeaderOnScroll);
    handleHeaderOnScroll(); // Initial check
}

// ====================================
// API FUNCTIONS
// ====================================

// Load device info
async function loadDeviceInfo() {
    try {
        const response = await fetch(`/api/device-info/${currentDeviceId}`);
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                currentDeviceName = result.device?.customName || currentDeviceId;
                if (deviceName) {
                    deviceName.textContent = currentDeviceName;
                }
            } else {
                deviceName.textContent = currentDeviceId;
            }
        } else {
            deviceName.textContent = currentDeviceId;
        }
    } catch (error) {
        console.error('Error loading device info:', error);
        deviceName.textContent = currentDeviceId;
    }
}

// Load config from server via API
async function loadConfig() {
    try {
        isLoading = true;
        showLoadingState(true);
        
        console.log(`📡 Loading schedule config for device: ${currentDeviceId}`);
        
        const response = await fetch(`/api/schedule-settings-editor/${currentDeviceId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                // Config not found - show error state
                showErrorState('File konfigurasi tidak ditemukan');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            configData = result.config || {};
            originalConfig = JSON.parse(JSON.stringify(configData)); // Deep copy
            
            // Update UI with config values
            updateUIFromConfig();
            
            // Show settings card
            showSettingsCard();
            
            console.log('✅ Config loaded:', configData);
        } else {
            throw new Error(result.error || 'Failed to load config');
        }
    } catch (error) {
        console.error('❌ Error loading config:', error);
        
        // Check if it's a 404 (config not found)
        if (error.message.includes('404') || error.message.includes('not found')) {
            showErrorState('File konfigurasi tidak ditemukan');
        } else {
            showToast('Gagal memuat konfigurasi: ' + error.message, 'error');
            showErrorState('Gagal memuat konfigurasi');
        }
    } finally {
        isLoading = false;
    }
}

// Save config via API
async function saveConfig() {
    try {
        // Validate input
        const timeout = parseInt(feedbackTimeout.value);
        if (isNaN(timeout) || timeout < 1000 || timeout > 30000) {
            showToast('Waktu timeout harus antara 1000 - 30000 ms', 'warning');
            feedbackTimeout.focus();
            return false;
        }
        
        // Prepare config object
        const newConfig = {
            "use-relay-feedback": useRelayFeedback.checked,
            "realtime-state-enforcement": realtimeEnforcement.checked,
            "feedback-timeout-ms": timeout
        };
        
        // Show loading state on button
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="loading"></span> Menyimpan...';
        saveBtn.disabled = true;
        
        console.log('📡 Saving config:', newConfig);
        
        const response = await fetch(`/api/schedule-settings-editor/${currentDeviceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newConfig)
        });
        
        const result = await response.json();
        
        // Restore button
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
        
        if (result.success) {
            // Update original config
            originalConfig = JSON.parse(JSON.stringify(newConfig));
            configData = newConfig;
            
            // Show success modal
            showSuccessModal(result.message || 'Pengaturan berhasil disimpan');
            
            // Update timeout value badge
            timeoutValue.textContent = `${timeout} ms`;
            
            return true;
        } else {
            throw new Error(result.error || 'Gagal menyimpan pengaturan');
        }
    } catch (error) {
        console.error('❌ Error saving config:', error);
        
        // Restore button if not already
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Pengaturan';
        saveBtn.disabled = false;
        
        // Show error modal
        showErrorModal(error.message);
        return false;
    }
}

// Create new config file
async function createNewConfig() {
    try {
        // Default values
        const defaultConfig = {
            "use-relay-feedback": false,
            "realtime-state-enforcement": false,
            "feedback-timeout-ms": 5000
        };
        
        // Show loading on button
        const originalText = createConfigBtn.innerHTML;
        createConfigBtn.innerHTML = '<span class="loading"></span> Membuat file...';
        createConfigBtn.disabled = true;
        
        console.log('📡 Creating new config with defaults:', defaultConfig);
        
        const response = await fetch(`/api/schedule-settings-editor/${currentDeviceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(defaultConfig)
        });
        
        const result = await response.json();
        
        // Restore button
        createConfigBtn.innerHTML = originalText;
        createConfigBtn.disabled = false;
        
        if (result.success) {
            // Update config data
            configData = defaultConfig;
            originalConfig = JSON.parse(JSON.stringify(defaultConfig));
            
            // Update UI
            updateUIFromConfig();
            
            // Show settings card
            showSettingsCard();
            
            // Show success toast
            showToast('File konfigurasi berhasil dibuat', 'success');
            
            return true;
        } else {
            throw new Error(result.error || 'Gagal membuat file konfigurasi');
        }
    } catch (error) {
        console.error('❌ Error creating config:', error);
        showToast('Gagal membuat file: ' + error.message, 'error');
        return false;
    }
}

// ====================================
// UI FUNCTIONS
// ====================================

// Update UI from config data
function updateUIFromConfig() {
    if (!configData) return;
    
    // Set switch values
    if (useRelayFeedback) {
        useRelayFeedback.checked = configData["use-relay-feedback"] === true;
    }
    
    if (realtimeEnforcement) {
        realtimeEnforcement.checked = configData["realtime-state-enforcement"] === true;
    }
    
    // Set timeout value
    const timeout = configData["feedback-timeout-ms"] || 5000;
    if (feedbackTimeout) {
        feedbackTimeout.value = timeout;
    }
    if (timeoutValue) {
        timeoutValue.textContent = `${timeout} ms`;
    }
}

// Reset to original values
function resetToOriginal() {
    if (!originalConfig) return;
    
    // Restore from original config
    if (useRelayFeedback) {
        useRelayFeedback.checked = originalConfig["use-relay-feedback"] === true;
    }
    
    if (realtimeEnforcement) {
        realtimeEnforcement.checked = originalConfig["realtime-state-enforcement"] === true;
    }
    
    const timeout = originalConfig["feedback-timeout-ms"] || 5000;
    if (feedbackTimeout) {
        feedbackTimeout.value = timeout;
    }
    if (timeoutValue) {
        timeoutValue.textContent = `${timeout} ms`;
    }
    
    showToast('Pengaturan dikembalikan ke nilai semula', 'info');
}

// Check if settings have changed
function hasChanges() {
    if (!originalConfig || !configData) return false;
    
    const currentTimeout = parseInt(feedbackTimeout.value) || 5000;
    
    return (
        useRelayFeedback.checked !== (originalConfig["use-relay-feedback"] === true) ||
        realtimeEnforcement.checked !== (originalConfig["realtime-state-enforcement"] === true) ||
        currentTimeout !== (originalConfig["feedback-timeout-ms"] || 5000)
    );
}

// ====================================
// STATE MANAGEMENT
// ====================================

function showLoadingState(loading) {
    if (!loadingState || !settingsCard || !errorState) return;
    
    if (loading) {
        loadingState.style.display = 'block';
        settingsCard.style.display = 'none';
        errorState.style.display = 'none';
    }
}

function showErrorState(message) {
    loadingState.style.display = 'none';
    settingsCard.style.display = 'none';
    errorState.style.display = 'block';
    if (errorMessage) {
        errorMessage.innerHTML = `File <strong>schedule-config.properties</strong> tidak ditemukan untuk perangkat <strong>${escapeHtml(currentDeviceName || currentDeviceId)}</strong>.<br><br>File konfigurasi hanya akan dibuat otomatis saat pertama kali Anda menyimpan pengaturan.`;
    }
}

function showSettingsCard() {
    loadingState.style.display = 'none';
    errorState.style.display = 'none';
    settingsCard.style.display = 'block';
}

function showErrorAndRedirect(message) {
    showToast(message, 'error');
    setTimeout(() => {
        window.location.href = `schedule.html?deviceid=${currentDeviceId}`;
    }, 2000);
}

// ====================================
// MODAL FUNCTIONS
// ====================================

function showSuccessModal(message) {
    if (successMessage) {
        successMessage.textContent = message || 'Pengaturan berhasil disimpan';
    }
    successModal.classList.add('show');
}

function showErrorModal(message) {
    if (errorModalMessage) {
        errorModalMessage.textContent = message || 'Gagal menyimpan pengaturan. Silakan coba lagi.';
    }
    errorModal.classList.add('show');
}

function closeModals() {
    if (successModal) successModal.classList.remove('show');
    if (errorModal) errorModal.classList.remove('show');
}

// ====================================
// TOAST FUNCTION
// ====================================

function showToast(message, type = "info") {
    if (!toast) return;
    
    const icon = type === 'success' ? 'fas fa-check-circle' : 
                type === 'error' ? 'fas fa-exclamation-circle' : 
                type === 'warning' ? 'fas fa-exclamation-triangle' :
                'fas fa-info-circle';
    
    toast.innerHTML = `
        <i class="${icon}"></i>
        <span>${escapeHtml(message)}</span>
    `;
    
    toast.className = `toast toast-${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ====================================
// UTILITY FUNCTIONS
// ====================================

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ====================================
// EVENT LISTENERS
// ====================================

function setupEventListeners() {
    // Back button
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = `schedule.html?deviceid=${currentDeviceId}`;
        });
    }
    
    // Create config button
    if (createConfigBtn) {
        createConfigBtn.addEventListener('click', async () => {
            await createNewConfig();
        });
    }
    
    // Reset button
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (hasChanges()) {
                resetToOriginal();
            } else {
                showToast('Tidak ada perubahan yang perlu di-reset', 'info');
            }
        });
    }
    
    // Save button
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            if (!hasChanges()) {
                showToast('Tidak ada perubahan yang disimpan', 'info');
                return;
            }
            
            const success = await saveConfig();
            if (success) {
                // Update original config
                originalConfig = {
                    "use-relay-feedback": useRelayFeedback.checked,
                    "realtime-state-enforcement": realtimeEnforcement.checked,
                    "feedback-timeout-ms": parseInt(feedbackTimeout.value) || 5000
                };
            }
        });
    }
    
    // Timeout input realtime update
    if (feedbackTimeout) {
        feedbackTimeout.addEventListener('input', (e) => {
            let value = parseInt(e.target.value);
            if (isNaN(value)) {
                timeoutValue.textContent = '5000 ms';
            } else {
                // Clamp value
                if (value < 1000) value = 1000;
                if (value > 30000) value = 30000;
                timeoutValue.textContent = `${value} ms`;
            }
        });
        
        feedbackTimeout.addEventListener('blur', (e) => {
            let value = parseInt(e.target.value);
            if (isNaN(value)) {
                feedbackTimeout.value = 5000;
                timeoutValue.textContent = '5000 ms';
            } else {
                // Clamp value
                if (value < 1000) {
                    feedbackTimeout.value = 1000;
                    timeoutValue.textContent = '1000 ms';
                } else if (value > 30000) {
                    feedbackTimeout.value = 30000;
                    timeoutValue.textContent = '30000 ms';
                }
            }
        });
    }
    
    // Modal OK buttons
    if (okSuccessBtn) {
        okSuccessBtn.addEventListener('click', () => {
            successModal.classList.remove('show');
        });
    }
    
    if (okErrorBtn) {
        okErrorBtn.addEventListener('click', () => {
            errorModal.classList.remove('show');
        });
    }
    
    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === successModal) {
            successModal.classList.remove('show');
        }
        if (e.target === errorModal) {
            errorModal.classList.remove('show');
        }
    });
    
    // Warn before leaving if there are unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (hasChanges()) {
            e.preventDefault();
            e.returnValue = 'Ada perubahan yang belum disimpan. Yakin ingin meninggalkan halaman?';
        }
    });
    
    // Handle online/offline
    window.addEventListener('online', () => {
        showToast('📶 Koneksi tersambung', 'success');
    });
    
    window.addEventListener('offline', () => {
        showToast('📡 Koneksi terputus', 'warning');
    });
}

// ====================================
// ADDITIONAL STYLES
// ====================================
const style = document.createElement('style');
style.textContent = `
    /* Additional styles for settings page */
    .setting-item {
        transition: all 0.3s ease;
    }
    
    .setting-item:hover {
        background-color: rgba(67, 97, 238, 0.02);
    }
    
    .value-badge {
        background: linear-gradient(135deg, var(--primary), var(--secondary));
        color: white;
        padding: 6px 12px;
        border-radius: 30px;
        font-size: 0.8rem;
        font-weight: 600;
    }
    
    .input-group input[type="number"] {
        -moz-appearance: textfield;
    }
    
    .input-group input[type="number"]::-webkit-outer-spin-button,
    .input-group input[type="number"]::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    
    /* Loading spinner in button */
    .btn .loading {
        width: 16px;
        height: 16px;
        border-width: 2px;
        margin-right: 8px;
    }
    
    /* Animation for settings card */
    .settings-card {
        animation: slideUp 0.4s ease;
    }
    
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

// ====================================
// START THE PAGE
// ====================================
document.addEventListener('DOMContentLoaded', () => {
    // Buat elemen app jika belum ada
    let app = document.getElementById('app');
    if (!app) {
        app = document.createElement('div');
        app.id = 'app';
        document.body.appendChild(app);
    }
    
    initScheduleSettingsPage();
});

// Export untuk debugging
window.scheduleSettingsPage = {
    refresh: () => loadConfig(),
    showToast,
    reload: () => window.location.reload()
};
