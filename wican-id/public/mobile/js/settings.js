// settings.js - Mobile Version with Full Dynamic Content
// ESP-01S Settings Page - 100% JavaScript Generated
// Mobile First Style - Konsisten dengan halaman lainnya

// ====================================
// GLOBAL VARIABLES
// ====================================
let serverInfo = null;
let isLoading = false;

// ====================================
// INITIALIZATION
// ====================================
async function initSettingsPage() {
    console.log('⚙️ Initializing Settings Page (Mobile)...');
    
    // Create DOM structure
    createDOMStructure();
    
    // Get DOM elements after creation
    cacheElements();
    
    // Setup header scroll behavior
    setupHeaderScroll();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load server info
    await loadServerInfo();
    
    // Auto refresh server info every 10 seconds
    setInterval(loadServerInfo, 10000);
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
                        <p>Pengaturan</p>
                    </div>
                </div>
            </div>

            <div class="header-right">
                <!-- Tombol Back -->
                <button class="action-btn" id="backBtn" title="Kembali">
                    <i class="fas fa-arrow-left"></i>
                </button>
            </div>
        </header>

        <!-- MAIN CONTENT -->
        <div class="container">
            <div class="page-header">
                <h2>Pengaturan Sistem</h2>
                <p>Konfigurasi dan kontrol sistem ESP-01S</p>
            </div>

            <!-- LOADING STATE -->
            <div class="loading-state" id="loadingState">
                <div class="loading-spinner-large">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <h3>Memuat Pengaturan</h3>
                <p>Mohon tunggu sebentar...</p>
            </div>

            <!-- ERROR STATE -->
            <div class="error-state" id="errorState" style="display: none;">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Gagal Memuat Data</h3>
                <p id="errorMessage">Terjadi kesalahan saat memuat pengaturan.</p>
                <button class="btn btn-primary" id="retryBtn">
                    <i class="fas fa-sync-alt"></i> Coba Lagi
                </button>
            </div>

            <!-- CONTENT STATE -->
            <div id="contentState" style="display: none;">
                <!-- Card Utama -->
                <div class="card">
                    <div class="card-body">
                        <!-- Informasi Sistem -->
                        <div class="info-card">
                            <h3>
                                <i class="fas fa-info-circle"></i>
                                Informasi Sistem
                            </h3>
                            <p>
                                <i class="fas fa-microchip"></i>
                                <strong>Server:</strong> ESP-01S IoT Dashboard v1.0.0
                            </p>
                            <p>
                                <i class="fas fa-globe"></i>
                                <strong>Status:</strong> <span id="serverStatus">Memeriksa koneksi...</span>
                            </p>
                            <p>
                                <i class="fas fa-clock"></i>
                                <strong>Waktu Server:</strong> <span id="serverTime">-</span>
                            </p>
                            <div class="note">
                                <i class="fas fa-lightbulb"></i>
                                Halaman ini akan bertambah dengan opsi pengaturan lainnya di masa mendatang.
                            </div>
                        </div>

                        <!-- Container untuk pengaturan lainnya di masa depan -->
                        <div class="action-buttons" id="futureSettings">
                            <button class="action-button" id="changeCredBtn">
                                <i class="fas fa-user-shield"></i>
                                <div class="action-content">
                                    <div class="action-title">Ubah Username dan Password</div>
                                    <div class="action-desc">Ganti kredensial akun dashboard</div>
                                </div>
                                <i class="fas fa-chevron-right"></i>
                            </button>
                            <button class="action-button" id="logoutBtn">
                                <i class="fas fa-sign-out-alt" style="color: var(--danger);"></i>
                                <div class="action-content">
                                    <div class="action-title">Logout</div>
                                    <div class="action-desc">Keluar dari sesi login browser ini</div>
                                </div>
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>

                        <!-- Divider -->
                        <div class="divider"></div>

                        <!-- Tombol RESTART SELURUH ESP - ORANYE -->
                        <div class="restart-all-button" id="restartAllBtn">
                            <i class="fas fa-power-off"></i>
                            <div class="action-content">
                                <div class="action-title">Restart Seluruh ESP</div>
                                <div class="action-desc">Kirim perintah restart ke semua perangkat ESP-01S yang terdaftar</div>
                            </div>
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL: Konfirmasi Restart -->
        <div class="modal" id="confirmRestartModal">
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header" style="background: linear-gradient(135deg, var(--warning), #e85d04);">
                    <h3>
                        <i class="fas fa-exclamation-triangle"></i>
                        Konfirmasi Restart
                    </h3>
                    <button class="modal-close" id="closeConfirmModal">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; padding: 0.5rem;">
                        <i class="fas fa-power-off" style="font-size: 4rem; color: var(--warning); margin-bottom: 1rem;"></i>
                        <h3 style="margin-bottom: 1rem;">Restart Seluruh Perangkat?</h3>
                        <p style="color: var(--gray); margin-bottom: 1.5rem; font-size: 0.95rem;">
                            Anda akan mengirim perintah restart ke SEMUA perangkat ESP-01S yang terdaftar di sistem.
                            Perangkat yang sedang online akan restart. Tindakan ini membutuhkan waktu beberapa detik.
                        </p>
                        <div style="background: #fff4e6; border-left: 4px solid var(--warning); padding: 1rem; text-align: left; border-radius: 12px;">
                            <p style="font-weight: 600; margin-bottom: 0.5rem;"><i class="fas fa-info-circle"></i> Informasi:</p>
                            <ul style="margin-left: 1.2rem; color: var(--gray); font-size: 0.85rem;">
                                <li>Hanya perangkat dengan alamat IP yang akan direstart</li>
                                <li>Perangkat offline akan dilewati</li>
                                <li>Proses restart membutuhkan waktu 1-2 menit</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="justify-content: space-between;">
                    <button class="btn btn-secondary" id="cancelRestartBtn">Batal</button>
                    <button class="btn btn-warning" id="confirmRestartBtn">
                        <i class="fas fa-power-off"></i> Ya, Restart Semua
                    </button>
                </div>
            </div>
        </div>

        <!-- MODAL: Hasil Restart -->
        <div class="modal" id="restartResultModal">
            <div class="modal-content">
                <div class="modal-header" style="background: linear-gradient(135deg, var(--warning), #e85d04);">
                    <h3>
                        <i class="fas fa-power-off"></i>
                        Hasil Restart Seluruh ESP
                    </h3>
                    <button class="modal-close" id="closeResultModal">&times;</button>
                </div>
                <div class="modal-body" id="resultModalBody">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Memproses permintaan restart...</p>
                        <p style="font-size: 0.85rem; margin-top: 1rem;">Mohon tunggu, proses ini membutuhkan waktu beberapa detik.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="closeModalBtn">Tutup</button>
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
                    <h3 style="margin-bottom: 0.5rem;" id="successMessage">Perintah restart berhasil dikirim</h3>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" id="okSuccessBtn" style="width: 100%;">OK</button>
                </div>
            </div>
        </div>

        <!-- MODAL: Ubah Username dan Password -->
        <div class="modal" id="changeCredModal">
            <div class="modal-content" style="max-width: 460px;">
                <div class="modal-header" style="background: linear-gradient(135deg, var(--primary), var(--secondary));">
                    <h3>
                        <i class="fas fa-user-shield"></i>
                        Ubah Username dan Password
                    </h3>
                    <button class="modal-close" id="closeChangeCredModal">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 0.8rem;">
                        <label for="newUsernameInput"><strong>Username baru</strong></label>
                        <input id="newUsernameInput" type="text" style="width:100%;padding:0.7rem;border:1px solid var(--gray-light);border-radius:10px;margin-top:0.35rem;">
                    </div>
                    <div style="margin-bottom: 0.8rem;">
                        <label for="oldPasswordInput"><strong>Password lama</strong></label>
                        <input id="oldPasswordInput" type="password" style="width:100%;padding:0.7rem;border:1px solid var(--gray-light);border-radius:10px;margin-top:0.35rem;">
                    </div>
                    <div style="margin-bottom: 0.8rem;">
                        <label for="newPasswordInput"><strong>Password baru</strong></label>
                        <input id="newPasswordInput" type="password" style="width:100%;padding:0.7rem;border:1px solid var(--gray-light);border-radius:10px;margin-top:0.35rem;">
                    </div>
                    <div>
                        <label for="confirmNewPasswordInput"><strong>Konfirmasi password baru</strong></label>
                        <input id="confirmNewPasswordInput" type="password" style="width:100%;padding:0.7rem;border:1px solid var(--gray-light);border-radius:10px;margin-top:0.35rem;">
                    </div>
                    <p id="changeCredMessage" style="margin-top:0.8rem;color:var(--gray);font-size:0.9rem;"></p>
                </div>
                <div class="modal-footer" style="justify-content: space-between;">
                    <button class="btn btn-secondary" id="cancelChangeCredBtn">Batal</button>
                    <button class="btn btn-primary" id="saveChangeCredBtn">Simpan</button>
                </div>
            </div>
        </div>

        <!-- TOAST NOTIFICATION -->
        <div class="toast" id="toast"></div>
    `;
}

// DOM Elements cache
let header, backBtn;
let loadingState, errorState, contentState;
let errorMessage, retryBtn;
let serverStatus, serverTime;
let futureSettings, restartAllBtn;
let changeCredBtn, logoutBtn;
let confirmRestartModal, restartResultModal, successModal;
let closeConfirmModal, cancelRestartBtn, confirmRestartBtn;
let closeResultModal, closeModalBtn;
let resultModalBody;
let okSuccessBtn, successMessage;
let toast;
let changeCredModal, closeChangeCredModal, cancelChangeCredBtn, saveChangeCredBtn;
let changeCredMessage, newUsernameInput, oldPasswordInput, newPasswordInput, confirmNewPasswordInput;

function cacheElements() {
    // Header
    header = document.getElementById('mainHeader');
    backBtn = document.getElementById('backBtn');
    
    // States
    loadingState = document.getElementById('loadingState');
    errorState = document.getElementById('errorState');
    contentState = document.getElementById('contentState');
    errorMessage = document.getElementById('errorMessage');
    retryBtn = document.getElementById('retryBtn');
    
    // Info
    serverStatus = document.getElementById('serverStatus');
    serverTime = document.getElementById('serverTime');
    
    // Future settings
    futureSettings = document.getElementById('futureSettings');
    restartAllBtn = document.getElementById('restartAllBtn');
    changeCredBtn = document.getElementById('changeCredBtn');
    logoutBtn = document.getElementById('logoutBtn');
    
    // Modals
    confirmRestartModal = document.getElementById('confirmRestartModal');
    restartResultModal = document.getElementById('restartResultModal');
    successModal = document.getElementById('successModal');
    
    closeConfirmModal = document.getElementById('closeConfirmModal');
    cancelRestartBtn = document.getElementById('cancelRestartBtn');
    confirmRestartBtn = document.getElementById('confirmRestartBtn');
    
    closeResultModal = document.getElementById('closeResultModal');
    closeModalBtn = document.getElementById('closeModalBtn');
    resultModalBody = document.getElementById('resultModalBody');
    
    okSuccessBtn = document.getElementById('okSuccessBtn');
    successMessage = document.getElementById('successMessage');
    
    toast = document.getElementById('toast');

    changeCredModal = document.getElementById('changeCredModal');
    closeChangeCredModal = document.getElementById('closeChangeCredModal');
    cancelChangeCredBtn = document.getElementById('cancelChangeCredBtn');
    saveChangeCredBtn = document.getElementById('saveChangeCredBtn');
    changeCredMessage = document.getElementById('changeCredMessage');
    newUsernameInput = document.getElementById('newUsernameInput');
    oldPasswordInput = document.getElementById('oldPasswordInput');
    newPasswordInput = document.getElementById('newPasswordInput');
    confirmNewPasswordInput = document.getElementById('confirmNewPasswordInput');
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

// Load server info
async function loadServerInfo() {
    try {
        const response = await fetch('/api/server-info');
        const result = await response.json();
        
        if (result.success) {
            serverInfo = result;
            updateServerInfo(result);
        } else {
            throw new Error('Gagal memuat informasi server');
        }
    } catch (error) {
        console.error('Error loading server info:', error);
        updateServerInfo(null);
    }
}

// Restart all devices
async function restartAllDevices() {
    try {
        console.log('🔄 Calling API: esp-restart-all');
        
        // Close confirm modal
        confirmRestartModal.classList.remove('show');
        
        // Show result modal with loading
        resultModalBody.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Mengirim perintah restart ke semua perangkat...</p>
                <p style="font-size: 0.85rem; margin-top: 1rem;">Mohon tunggu, proses ini membutuhkan waktu beberapa detik.</p>
            </div>
        `;
        restartResultModal.classList.add('show');
        
        const response = await fetch('/api/esp-restart-all', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        const result = await response.json();
        console.log('📦 API Response:', result);

        if (result.success) {
            displayRestartResults(result);
            showSuccessModal('Perintah restart berhasil dikirim ke semua perangkat');
            showToast('✅ Perintah restart berhasil dikirim', 'success');
        } else {
            displayRestartError(result);
            showToast('❌ Gagal mengirim perintah restart', 'error');
        }

    } catch (error) {
        console.error('❌ Error restarting all devices:', error);
        
        resultModalBody.innerHTML = `
            <div style="text-align: center; padding: 1.5rem;">
                <i class="fas fa-exclamation-circle" style="font-size: 4rem; color: var(--danger); margin-bottom: 1rem;"></i>
                <h3 style="color: var(--danger); margin-bottom: 1rem;">Gagal Menghubungi Server</h3>
                <p style="color: var(--gray); margin-bottom: 1.5rem;">${escapeHtml(error.message)}</p>
                <div style="background: #ffe6e6; border-left: 4px solid var(--danger); padding: 1rem; text-align: left; border-radius: 12px;">
                    <p style="font-weight: 600; margin-bottom: 0.5rem;">Kemungkinan penyebab:</p>
                    <ul style="margin-left: 1.2rem; color: var(--gray); font-size: 0.85rem;">
                        <li>Server sedang sibuk</li>
                        <li>Koneksi jaringan terputus</li>
                        <li>API endpoint tidak tersedia</li>
                    </ul>
                </div>
            </div>
        `;
        
        showToast('❌ Gagal terhubung ke server', 'error');
    }
}

// Update server info UI
function updateServerInfo(data) {
    if (!serverStatus || !serverTime) return;
    
    if (data && data.success) {
        serverStatus.innerHTML = '<span style="color: var(--success);">✅ Online</span>';
        serverTime.textContent = new Date(data.server.timestamp).toLocaleString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        // Hide loading, show content
        if (loadingState && contentState) {
            loadingState.style.display = 'none';
            contentState.style.display = 'block';
            errorState.style.display = 'none';
        }
    } else {
        serverStatus.innerHTML = '<span style="color: var(--danger);">❌ Offline</span>';
        serverTime.textContent = '-';
        
        // Show error if first load
        if (!serverInfo && loadingState) {
            loadingState.style.display = 'none';
            errorState.style.display = 'block';
            contentState.style.display = 'none';
            if (errorMessage) {
                errorMessage.textContent = 'Tidak dapat terhubung ke server. Periksa koneksi jaringan.';
            }
        }
    }
}

// Display restart results in modal
function displayRestartResults(data) {
    const summary = data.summary || { total: 0, attempted: 0, success: 0, failed: 0, skipped: 0 };
    const devices = data.devices || [];

    let devicesHtml = '';
    
    if (devices.length === 0) {
        devicesHtml = '<p style="text-align: center; color: var(--gray); padding: 2rem;">Tidak ada perangkat yang ditemukan</p>';
    } else {
        devices.forEach(device => {
            const statusClass = device.status === 'success' ? 'success' : 
                               device.status === 'failed' ? 'failed' : 'skipped';
            const statusIcon = device.status === 'success' ? 'fa-check-circle' :
                              device.status === 'failed' ? 'fa-exclamation-circle' :
                              'fa-info-circle';
            
            devicesHtml += `
                <div class="device-row ${statusClass}">
                    <div class="device-status-icon">
                        <i class="fas ${statusIcon} ${statusClass}"></i>
                    </div>
                    <div class="device-info">
                        <span class="device-name">${escapeHtml(device.espId || device.nodeId || 'Unknown')}</span>
                        <span class="device-ip">${escapeHtml(device.espIp || 'No IP')}</span>
                    </div>
                    <div class="device-message" title="${escapeHtml(device.message || '')}">
                        ${escapeHtml(device.message || (device.status === 'success' ? 'Restart command sent' : 'Failed'))}
                    </div>
                </div>
            `;
        });
    }

    resultModalBody.innerHTML = `
        <div class="result-summary">
            <h4>Ringkasan Restart</h4>
            <div class="summary-stats">
                <div class="stat-item">
                    <div class="stat-value">${summary.total}</div>
                    <div class="stat-label">Total</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${summary.attempted}</div>
                    <div class="stat-label">Dicoba</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color: #a3f7a3;">${summary.success}</div>
                    <div class="stat-label">Berhasil</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color: #ffb3b3;">${summary.failed}</div>
                    <div class="stat-label">Gagal</div>
                </div>
            </div>
            <div style="margin-top: 0.5rem; font-size: 0.85rem;">
                Dilewati: ${summary.skipped}
            </div>
        </div>
        
        <h4 style="margin: 1.5rem 0 0.8rem; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-microchip"></i>
            Detail Perangkat (${devices.length})
        </h4>
        
        <div class="devices-table">
            ${devicesHtml}
        </div>
        
        <p style="text-align: center; margin-top: 1.5rem; color: var(--gray); font-size: 0.8rem;">
            <i class="fas fa-clock"></i> Waktu: ${new Date(data.timestamp || Date.now()).toLocaleString('id-ID')}
        </p>
    `;
}

// Display error in modal
function displayRestartError(data) {
    resultModalBody.innerHTML = `
        <div style="text-align: center; padding: 1.5rem;">
            <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: var(--danger); margin-bottom: 1rem;"></i>
            <h3 style="color: var(--danger); margin-bottom: 1rem;">Restart Gagal</h3>
            <p style="color: var(--gray); margin-bottom: 1.5rem;">${escapeHtml(data.message || data.error || 'Terjadi kesalahan tidak diketahui')}</p>
            <div style="background: #ffe6e6; border-left: 4px solid var(--danger); padding: 1rem; text-align: left; border-radius: 12px;">
                <p style="font-weight: 600; margin-bottom: 0.5rem;">Detail Error:</p>
                <p style="font-family: monospace; font-size: 0.85rem; word-break: break-word;">${escapeHtml(JSON.stringify(data, null, 2))}</p>
            </div>
        </div>
    `;
}

// ====================================
// MODAL FUNCTIONS
// ====================================

// Show confirm restart modal
function showConfirmModal() {
    confirmRestartModal.classList.add('show');
}

// Close confirm restart modal
function closeConfirmModalFn() {
    confirmRestartModal.classList.remove('show');
}

// Close result modal
function closeResultModalFn() {
    restartResultModal.classList.remove('show');
}

// Show success modal
function showSuccessModal(message) {
    if (successMessage) {
        successMessage.textContent = message || 'Berhasil';
    }
    successModal.classList.add('show');
}

// Close success modal
function closeSuccessModal() {
    successModal.classList.remove('show');
}

// ====================================
// UTILITY FUNCTIONS
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

function escapeHtml(unsafe) {
    if (!unsafe) return '';
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
            window.location.href = 'index.html';
        });
    }
    
    // Retry button
    if (retryBtn) {
        retryBtn.addEventListener('click', async () => {
            loadingState.style.display = 'block';
            errorState.style.display = 'none';
            await loadServerInfo();
        });
    }
    
    // Restart All button
    if (restartAllBtn) {
        restartAllBtn.addEventListener('click', showConfirmModal);
    }

    if (changeCredBtn) {
        changeCredBtn.addEventListener('click', () => {
            if (changeCredMessage) changeCredMessage.textContent = '';
            if (changeCredModal) changeCredModal.classList.add('show');
        });
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutCurrentBrowser);
    }
    
    // Confirm Restart modal
    if (closeConfirmModal) {
        closeConfirmModal.addEventListener('click', closeConfirmModalFn);
    }
    if (cancelRestartBtn) {
        cancelRestartBtn.addEventListener('click', closeConfirmModalFn);
    }
    if (confirmRestartBtn) {
        confirmRestartBtn.addEventListener('click', restartAllDevices);
    }
    
    // Result modal
    if (closeResultModal) {
        closeResultModal.addEventListener('click', closeResultModalFn);
    }
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeResultModalFn);
    }
    
    // Success modal
    if (okSuccessBtn) {
        okSuccessBtn.addEventListener('click', closeSuccessModal);
    }
    if (closeChangeCredModal) {
        closeChangeCredModal.addEventListener('click', closeChangeCredModalFn);
    }
    if (cancelChangeCredBtn) {
        cancelChangeCredBtn.addEventListener('click', closeChangeCredModalFn);
    }
    if (saveChangeCredBtn) {
        saveChangeCredBtn.addEventListener('click', changeCredentials);
    }
    
    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === confirmRestartModal) {
            closeConfirmModalFn();
        }
        if (e.target === restartResultModal) {
            closeResultModalFn();
        }
        if (e.target === successModal) {
            closeSuccessModal();
        }
        if (e.target === changeCredModal) {
            closeChangeCredModalFn();
        }
    });
    
    // Window events
    window.addEventListener('online', () => {
        showToast('📶 Koneksi tersambung', 'success');
        loadServerInfo();
    });
    
    window.addEventListener('offline', () => {
        showToast('📡 Koneksi terputus', 'warning');
        if (serverStatus) {
            serverStatus.innerHTML = '<span style="color: var(--danger);">❌ Offline</span>';
        }
    });
}

function closeChangeCredModalFn() {
    if (changeCredModal) {
        changeCredModal.classList.remove('show');
    }
}

async function changeCredentials() {
    const username = newUsernameInput ? newUsernameInput.value.trim() : '';
    const oldPassword = oldPasswordInput ? oldPasswordInput.value : '';
    const newPassword = newPasswordInput ? newPasswordInput.value : '';
    const confirmNewPassword = confirmNewPasswordInput ? confirmNewPasswordInput.value : '';

    if (!username || !oldPassword || !newPassword || !confirmNewPassword) {
        if (changeCredMessage) {
            changeCredMessage.style.color = 'var(--danger)';
            changeCredMessage.textContent = 'Semua kolom wajib diisi.';
        }
        return;
    }

    try {
        if (saveChangeCredBtn) saveChangeCredBtn.disabled = true;
        const response = await fetch('/api/login/change', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, oldPassword, newPassword, confirmNewPassword })
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Gagal mengubah kredensial');
        }

        if (changeCredMessage) {
            changeCredMessage.style.color = 'var(--success)';
            changeCredMessage.textContent = 'Berhasil mengubah username dan password.';
        }
        if (oldPasswordInput) oldPasswordInput.value = '';
        if (newPasswordInput) newPasswordInput.value = '';
        if (confirmNewPasswordInput) confirmNewPasswordInput.value = '';
        showToast('Kredensial diperbarui', 'success');
    } catch (error) {
        if (changeCredMessage) {
            changeCredMessage.style.color = 'var(--danger)';
            changeCredMessage.textContent = error.message;
        }
    } finally {
        if (saveChangeCredBtn) saveChangeCredBtn.disabled = false;
    }
}

async function logoutCurrentBrowser() {
    try {
        const response = await fetch('/api/login/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Logout gagal');
        }
        window.location.href = '/login.html';
    } catch (error) {
        showToast(`Logout gagal: ${error.message}`, 'error');
    }
}
        // Back button
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }

        // Retry button
        if (retryBtn && loadingState && errorState) {
            retryBtn.addEventListener('click', async () => {
                loadingState.style.display = 'block';
                errorState.style.display = 'none';
                await loadServerInfo();
            });
        }

        // Restart All button
        if (restartAllBtn) {
            restartAllBtn.addEventListener('click', showConfirmModal);
        }

        // Confirm Restart modal
        if (closeConfirmModal) {
            closeConfirmModal.addEventListener('click', closeConfirmModalFn);
        }
        if (cancelRestartBtn) {
            cancelRestartBtn.addEventListener('click', closeConfirmModalFn);
        }
        if (confirmRestartBtn) {
            confirmRestartBtn.addEventListener('click', restartAllDevices);
        }

        // Result modal
        if (closeResultModal) {
            closeResultModal.addEventListener('click', closeResultModalFn);
        }
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeResultModalFn);
        }

        // Success modal
        if (okSuccessBtn) {
            okSuccessBtn.addEventListener('click', closeSuccessModal);
        }

        // Close modals on outside click
        window.addEventListener('click', (e) => {
            if (confirmRestartModal && e.target === confirmRestartModal) {
                closeConfirmModalFn();
            }
            if (restartResultModal && e.target === restartResultModal) {
                closeResultModalFn();
            }
            if (successModal && e.target === successModal) {
                closeSuccessModal();
            }
        });

        // Window events
        window.addEventListener('online', () => {
            showToast('📶 Koneksi tersambung', 'success');
            loadServerInfo();
        });

        window.addEventListener('offline', () => {
            showToast('📡 Koneksi terputus', 'warning');
            if (serverStatus) {
                serverStatus.innerHTML = '<span style="color: var(--danger);">❌ Offline</span>';
            }
        });

// ====================================
// ADDITIONAL STYLES
// ====================================
const style = document.createElement('style');
style.textContent = `
    /* Info Card Note */
    .info-card .note {
        background-color: #fff4e6;
        border-left: 4px solid var(--warning);
        padding: 1rem;
        border-radius: 12px;
        margin-top: 1rem;
        color: var(--dark);
        display: flex;
    try {
        const response = await fetch('/api/server-info');
        const result = await response.json();

        if (result.success) {
            serverInfo = result;
            updateServerInfo(result);
        } else {
            throw new Error('Gagal memuat informasi server');
        }
    } catch (error) {
        console.error('Error loading server info:', error);
        // Cegah error jika resultModalBody atau serverStatus null
        if (typeof updateServerInfo === 'function') {
            updateServerInfo(null);
        }
    }
        align-items: center;
        gap: 10px;
        font-size: 0.9rem;
    }
    
    .info-card .note i {
        color: var(--warning);
        font-size: 1.1rem;
    }
    
    /* Empty Settings */
    .empty-settings {
        text-align: center;
        padding: 2rem;
        background: var(--light);
        border-radius: 18px;
        border: 2px dashed var(--gray-light);
    }
    
    .empty-settings i {
        font-size: 3rem;
        color: var(--gray);
        margin-bottom: 1rem;
    }
    
    .empty-settings h3 {
        color: var(--gray);
        margin-bottom: 0.5rem;
        font-size: 1.2rem;
    }
    
    .empty-settings p {
        color: var(--gray);
        font-size: 0.9rem;
    }
    
    /* Loading Spinner Large */
    .loading-spinner-large {
        font-size: 3rem;
        color: var(--primary);
        margin-bottom: 1rem;
        animation: pulse 1.5s ease-in-out infinite;
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.1); opacity: 1; }
    }
    
    /* Animation delays */
    .stat-item {
        animation: fadeIn 0.4s ease forwards;
        opacity: 0;
    }
    
    .stat-item:nth-child(1) { animation-delay: 0.1s; }
    .stat-item:nth-child(2) { animation-delay: 0.2s; }
    .stat-item:nth-child(3) { animation-delay: 0.3s; }
    .stat-item:nth-child(4) { animation-delay: 0.4s; }
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
    
    initSettingsPage();
});

// Export untuk debugging
window.settingsPage = {
    refresh: loadServerInfo,
    showToast,
    reload: () => window.location.reload()
};
