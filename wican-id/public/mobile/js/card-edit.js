// card-edit.js - Mobile Version with Full Dynamic Content
// ESP-01S Card Edit Page - 100% JavaScript Generated
// Mobile First Style - Konsisten dengan index dan add-device

// ====================================
// GLOBAL VARIABLES
// ====================================
let currentDeviceId = '';
let currentDeviceName = '';
let currentDeviceData = null;
let lastRestartTime = null;
let isLoading = false;
let reverseLogicEnabled = false; // Default: nonaktif

// ====================================
// INITIALIZATION
// ====================================
async function initCardEditPage() {
    console.log('📱 Initializing Card Edit Page (Mobile)...');
    
    // Get deviceId from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentDeviceId = urlParams.get('deviceid');
    
    if (!currentDeviceId) {
        showErrorAndRedirect('ID Perangkat tidak ditemukan di URL');
        return;
    }
    
    console.log('📱 Loading device:', currentDeviceId);
    
    // Create DOM structure
    createDOMStructure();
    
    // Get DOM elements after creation
    cacheElements();
    
    // Setup header scroll behavior
    setupHeaderScroll();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load device info from API
    await loadDeviceInfo();
}

// ====================================
// CREATE FULL DOM STRUCTURE
// ====================================
function createDOMStructure() {
    const app = document.getElementById('app');
    if (!app) return;
    
    app.innerHTML = `
        <!-- HEADER (SAMA PERSIS DENGAN INDEX.HTML) -->
        <header id="mainHeader">
            <div class="header-left">
                <div class="logo-container">
                    <div class="logo" style="background:#111827;border:1px solid rgba(255,255,255,0.35);"><img src="/WiCan-icon.png" alt="WiCan" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></div>
                    <div class="logo-text">
                        <h1>WiCan</h1>
                        <p>Edit Perangkat</p>
                    </div>
                </div>
            </div>

            <div class="header-right">
                <!-- Tombol Back -->
                <button class="action-btn" id="backBtn" title="Kembali ke Dashboard">
                    <i class="fas fa-arrow-left"></i>
                </button>
            </div>
        </header>

        <!-- MAIN CONTENT -->
        <div class="container">
            <div class="page-header" id="pageHeader">
                <h2 id="deviceTitle">Memuat Perangkat...</h2>
                <p id="deviceIdText">ID: ${escapeHtml(currentDeviceId)}</p>
            </div>

            <!-- CARD UTAMA -->
            <div class="main-card" id="mainCard">
                <!-- Loading State -->
                <div class="loading-state" id="loadingState">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <h3>Memuat Data Perangkat</h3>
                    <p>Mohon tunggu sebentar...</p>
                </div>

                <!-- Error State -->
                <div class="error-state" id="errorState" style="display: none;">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>Perangkat Tidak Ditemukan</h3>
                    <p id="errorMessage">Perangkat dengan ID "${escapeHtml(currentDeviceId)}" tidak ditemukan.</p>
                    <button class="btn-primary" id="backToDashboardBtn">
                        <i class="fas fa-home"></i> Kembali ke Dashboard
                    </button>
                </div>

                <!-- Content State (akan diisi setelah data dimuat) -->
                <div class="content-state" id="contentState" style="display: none;">
                    <!-- Section: Device Management -->
                    <div class="action-section">
                        <h3 class="section-title">
                            <i class="fas fa-cogs"></i> Pengelolaan Perangkat
                        </h3>
                        
                        <!-- Edit Nama Kartu -->
                        <div class="action-button" id="editNameBtn">
                            <i class="fas fa-pen"></i>
                            <div class="action-content">
                                <div class="action-title">Edit Nama Kartu</div>
                                <div class="action-desc">Ubah nama tampilan kartu di dashboard</div>
                            </div>
                            <i class="fas fa-chevron-right"></i>
                        </div>

                        <!-- Info Pembuatan -->
                        <div class="action-button" id="infoButton">
                            <i class="fas fa-info-circle"></i>
                            <div class="action-content">
                                <div class="action-title">Info Pembuatan</div>
                                <div class="action-desc">Lihat informasi waktu pembuatan dan update</div>
                            </div>
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>

                    <!-- Section: ESP Development Tools -->
                    <div class="action-section">
                        <h3 class="section-title">
                            <i class="fas fa-microchip"></i> ESP Development
                        </h3>
                        
                        <!-- Preview Kode -->
                        <div class="action-button" id="previewCodeBtn">
                            <i class="fas fa-code"></i>
                            <div class="action-content">
                                <div class="action-title">Preview Kode</div>
                                <div class="action-desc">Lihat kode sumber Arduino untuk perangkat ini</div>
                            </div>
                            <i class="fas fa-chevron-right"></i>
                        </div>

                        <!-- Unduh Kode Sumber -->
                        <div class="action-button" id="downloadCodeBtn">
                            <i class="fas fa-download"></i>
                            <div class="action-content">
                                <div class="action-title">Unduh Kode Sumber</div>
                                <div class="action-desc">Download file .ino untuk ESP</div>
                            </div>
                            <i class="fas fa-chevron-right"></i>
                        </div>

                        <!-- Unduh Binary -->
                        <div class="action-button" id="downloadBinaryBtn">
                            <i class="fas fa-file-download"></i>
                            <div class="action-content">
                                <div class="action-title">Unduh Binary</div>
                                <div class="action-desc">Download file .bin untuk flashing</div>
                            </div>
                            <i class="fas fa-chevron-right"></i>
                        </div>

                        <!-- Program ESP -->
                        <div class="action-button" id="programEspBtn">
                            <i class="fas fa-bolt"></i>
                            <div class="action-content">
                                <div class="action-title">Program ESP</div>
                                <div class="action-desc">Buka web flasher untuk memprogram ESP-01S</div>
                            </div>
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>

                    <!-- Section: ESP Control -->
                    <div class="action-section">
                        <h3 class="section-title">
                            <i class="fas fa-bolt"></i> ESP Control
                        </h3>
                        
                        <!-- Balik Logika Perangkat -->
                        <div class="reverse-button" id="reverseLogicBtn">
                            <i class="fas fa-random"></i>
                            <div class="action-content">
                                <div class="action-title">Balik Logika Perangkat</div>
                                <div class="action-desc">Atur reverse logic relay (ON ↔ OFF)</div>
                                <div class="reverse-status" id="reverseLogicStatus">
                                    <span class="badge-inactive">NONAKTIF</span>
                                </div>
                            </div>
                            <i class="fas fa-chevron-right"></i>
                        </div>
                        
                        <!-- Restart ESP -->
                        <div class="restart-button" id="restartEspBtn">
                            <i class="fas fa-power-off"></i>
                            <div class="action-content">
                                <div class="action-title">Restart ESP</div>
                                <div class="action-desc">Restart perangkat ESP-01S secara remote</div>
                                <div class="restart-history" id="restartHistory">
                                    <i class="fas fa-clock"></i> <span id="lastRestartTime">Belum pernah restart</span>
                                </div>
                            </div>
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>

                    <!-- Hapus Perangkat -->
                    <div class="delete-button" id="deleteButton">
                        <i class="fas fa-trash-alt"></i>
                        <div class="action-content">
                            <div class="action-title">Hapus Perangkat</div>
                            <div class="action-desc">Hapus perangkat ini dari sistem secara permanen</div>
                        </div>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODALS -->
        
        <!-- Modal: Edit Nama -->
        <div class="modal" id="editNameModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Nama Kartu</h3>
                    <button class="modal-close" id="closeEditModal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="currentName">Nama sekarang:</label>
                        <input type="text" id="currentName" readonly class="readonly-input">
                    </div>
                    <div class="form-group">
                        <label for="newName">Nama baru:</label>
                        <input type="text" id="newName" placeholder="Masukkan nama baru...">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancelEditBtn">Batal</button>
                    <button class="btn btn-primary" id="saveNameBtn">Simpan</button>
                </div>
            </div>
        </div>

        <!-- Modal: Info -->
        <div class="modal" id="infoModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Info Pembuatan</h3>
                    <button class="modal-close" id="closeInfoModal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="info-display" id="infoDisplay">
                        <div class="info-item">
                            <span class="info-label">Memuat data...</span>
                            <span class="info-value"><i class="fas fa-spinner fa-spin"></i></span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="closeInfoBtn">Tutup</button>
                </div>
            </div>
        </div>

        <!-- Modal: Konfirmasi Hapus -->
        <div class="modal" id="deleteConfirmModal">
            <div class="modal-content">
                <div class="modal-header" style="background: linear-gradient(135deg, #e63946, #d00000);">
                    <h3 style="color: white;">Konfirmasi Penghapusan</h3>
                    <button class="modal-close" id="closeDeleteModal" style="color: white;">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="warning-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <p style="text-align: center; margin-bottom: 1.5rem; font-weight: 600;">
                        Apakah Anda yakin ingin menghapus perangkat ini?
                    </p>
                    <div class="info-display">
                        <div class="info-item">
                            <span class="info-label">ID Perangkat:</span>
                            <span class="info-value" id="deleteDeviceId">-</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Nama Kartu:</span>
                            <span class="info-value" id="deleteDeviceName">-</span>
                        </div>
                    </div>
                    <p style="color: var(--danger); font-weight: 600; text-align: center; margin-top: 1rem;">
                        <i class="fas fa-exclamation-circle"></i> Tindakan ini tidak dapat dibatalkan!
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancelDeleteBtn">Batal</button>
                    <button class="btn btn-danger" id="confirmDeleteBtn">
                        <i class="fas fa-trash-alt"></i> Ya, Hapus
                    </button>
                </div>
            </div>
        </div>

        <!-- Modal: Berhasil Dihapus -->
        <div class="modal" id="successModal">
            <div class="modal-content">
                <div class="modal-header" style="background: linear-gradient(135deg, #38b000, #2a9d8f);">
                    <h3 style="color: white;">
                        <i class="fas fa-check-circle"></i> Berhasil!
                    </h3>
                </div>
                <div class="modal-body" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-check-circle" style="font-size: 4rem; color: #38b000; margin-bottom: 1rem;"></i>
                    <h3 style="margin-bottom: 0.5rem;">Perangkat Berhasil Dihapus</h3>
                    <p style="color: var(--gray);">Perangkat telah berhasil dihapus dari sistem.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" id="okSuccessBtn" style="width: 100%;">
                        OK, Kembali ke Dashboard
                    </button>
                </div>
            </div>
        </div>

        <!-- Modal: Loading -->
        <div class="modal" id="loadingModal">
            <div class="modal-content" style="text-align: center; padding: 2rem;">
                <div class="loading-spinner" style="font-size: 3rem; color: var(--primary); margin-bottom: 1rem;">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <h3 id="loadingTitle">Memproses...</h3>
                <p id="loadingMessage">Mohon tunggu sebentar</p>
            </div>
        </div>

        <!-- TOAST NOTIFICATION -->
        <div class="toast" id="toast"></div>
    `;
}

// DOM Elements cache
let header, backBtn, deviceTitle, deviceIdText;
let loadingState, errorState, contentState;
let editNameBtn, infoButton, deleteButton;
let previewCodeBtn, downloadCodeBtn, downloadBinaryBtn, programEspBtn;
let reverseLogicBtn, reverseLogicStatusElement, restartEspBtn, lastRestartTimeSpan;
let editNameModal, infoModal, deleteConfirmModal, successModal, loadingModal, toast;
let errorMessage, backToDashboardBtn;

function cacheElements() {
    // Header
    header = document.getElementById('mainHeader');
    backBtn = document.getElementById('backBtn');
    deviceTitle = document.getElementById('deviceTitle');
    deviceIdText = document.getElementById('deviceIdText');
    
    // States
    loadingState = document.getElementById('loadingState');
    errorState = document.getElementById('errorState');
    contentState = document.getElementById('contentState');
    errorMessage = document.getElementById('errorMessage');
    backToDashboardBtn = document.getElementById('backToDashboardBtn');
    
    // Action buttons
    editNameBtn = document.getElementById('editNameBtn');
    infoButton = document.getElementById('infoButton');
    deleteButton = document.getElementById('deleteButton');
    previewCodeBtn = document.getElementById('previewCodeBtn');
    downloadCodeBtn = document.getElementById('downloadCodeBtn');
    downloadBinaryBtn = document.getElementById('downloadBinaryBtn');
    programEspBtn = document.getElementById('programEspBtn');
    reverseLogicBtn = document.getElementById('reverseLogicBtn');
    reverseLogicStatusElement = document.getElementById('reverseLogicStatus');
    restartEspBtn = document.getElementById('restartEspBtn');
    lastRestartTimeSpan = document.getElementById('lastRestartTime');
    
    // Modals
    editNameModal = document.getElementById('editNameModal');
    infoModal = document.getElementById('infoModal');
    deleteConfirmModal = document.getElementById('deleteConfirmModal');
    successModal = document.getElementById('successModal');
    loadingModal = document.getElementById('loadingModal');
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
        console.log(`🔍 Fetching device info for: ${currentDeviceId}`);
        
        const response = await fetch(`/api/card-name-editor/${currentDeviceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ action: 'get' })
        });
        
        console.log('Response Status:', response.status);
        
        const result = await response.json();
        console.log('Response Data:', result);
        
        if (result.success) {
            // Device ditemukan
            currentDeviceName = result.currentName || currentDeviceId;
            currentDeviceData = result;
            
            // Update UI
            deviceTitle.textContent = currentDeviceName;
            deviceIdText.textContent = `ID: ${currentDeviceId}`;
            
            // Set delete modal info
            document.getElementById('deleteDeviceId').textContent = currentDeviceId;
            document.getElementById('deleteDeviceName').textContent = currentDeviceName;
            
            // Load reverse logic status
            loadReverseLogicStatus();
            
            // Load last restart time
            loadLastRestartTime();
            
            // Show content, hide loading
            loadingState.style.display = 'none';
            contentState.style.display = 'block';
            
            console.log('✅ Device loaded:', currentDeviceName);
            
            showToast(`Perangkat "${currentDeviceName}" berhasil dimuat`, 'success');
            
        } else {
            throw new Error(result.error || 'Perangkat tidak ditemukan');
        }
        
    } catch (error) {
        console.error('❌ Error loading device:', error);
        
        // Show error state
        loadingState.style.display = 'none';
        errorState.style.display = 'block';
        
        if (errorMessage) {
            errorMessage.textContent = `Perangkat dengan ID "${currentDeviceId}" tidak ditemukan.`;
        }
        
        showToast('Gagal memuat perangkat', 'error');
    }
}

// Load reverse logic status
async function loadReverseLogicStatus() {
    try {
        const response = await fetch(`/api/relay-reverse/${currentDeviceId}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
            const result = await response.json();
            // server returns { success: true, reverseLogic: boolean }
            reverseLogicEnabled = result.reverseLogic || false;

            if (reverseLogicStatusElement) {
                if (reverseLogicEnabled) {
                    reverseLogicStatusElement.innerHTML = '<span class="badge-active">AKTIF</span>';
                } else {
                    reverseLogicStatusElement.innerHTML = '<span class="badge-inactive">NONAKTIF</span>';
                }
            }
        } else {
            // non-2xx, try to parse json for message
            try {
                const err = await response.json();
                console.warn('reverse-logic GET error:', err);
            } catch (e) {
                console.warn('reverse-logic GET non-json response');
            }
        }
    } catch (error) {
        console.error('Error loading reverse logic:', error);
    }
}

// Toggle reverse logic
async function toggleReverseLogic() {
    showLoading('Mengubah Reverse Logic', 'Sedang memproses...');
    
    try {
        const response = await fetch(`/api/relay-reverse/${currentDeviceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ reverseLogic: !reverseLogicEnabled })
        });

        // handle non-JSON responses gracefully
        let result;
        try {
            result = await response.json();
        } catch (e) {
            throw new Error('Non-JSON response from server');
        }

        hideLoading();

        if (response.ok && result.success) {
            // server returns reverseLogic boolean
            reverseLogicEnabled = Boolean(result.reverseLogic);

            if (reverseLogicStatusElement) {
                if (reverseLogicEnabled) {
                    reverseLogicStatusElement.innerHTML = '<span class="badge-active">AKTIF</span>';
                    showToast('✅ Reverse logic diaktifkan', 'success');
                } else {
                    reverseLogicStatusElement.innerHTML = '<span class="badge-inactive">NONAKTIF</span>';
                    showToast('✅ Reverse logic dinonaktifkan', 'success');
                }
            }
        } else {
            throw new Error(result.error || result.message || 'Gagal mengubah reverse logic');
        }
        
    } catch (error) {
        hideLoading();
        console.error('Error toggling reverse logic:', error);
        showToast(`Gagal: ${error.message}`, 'error');
    }
}

// Load last restart time dari localStorage
function loadLastRestartTime() {
    try {
        const key = `esp_restart_${currentDeviceId}`;
        const saved = localStorage.getItem(key);
        
        if (saved) {
            const data = JSON.parse(saved);
            lastRestartTime = data.timestamp;
            
            const date = new Date(lastRestartTime);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            
            if (diffMins < 1) {
                lastRestartTimeSpan.textContent = 'Baru saja';
            } else if (diffMins < 60) {
                lastRestartTimeSpan.textContent = `${diffMins} menit lalu`;
            } else {
                const diffHours = Math.floor(diffMins / 60);
                lastRestartTimeSpan.textContent = `${diffHours} jam lalu`;
            }
        }
    } catch (error) {
        console.error('Error loading restart time:', error);
    }
}

// Save last restart time ke localStorage
function saveLastRestartTime() {
    try {
        const key = `esp_restart_${currentDeviceId}`;
        const data = {
            timestamp: new Date().toISOString(),
            deviceId: currentDeviceId,
            deviceName: currentDeviceName
        };
        
        localStorage.setItem(key, JSON.stringify(data));
        lastRestartTime = data.timestamp;
        lastRestartTimeSpan.textContent = 'Baru saja';
    } catch (error) {
        console.error('Error saving restart time:', error);
    }
}

// Restart ESP
async function restartESP() {
    showLoading('Merestart ESP', `Mengirim perintah restart ke ${currentDeviceName}...`);
    
    try {
        console.log(`🔄 Sending restart command to device: ${currentDeviceId}`);
        
        const response = await fetch(`/api/esp-restart/${currentDeviceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        const result = await response.json();
        hideLoading();
        
        if (result.success) {
            saveLastRestartTime();
            showRestartResultModal('success', result);
        } else {
            showRestartResultModal('error', result);
        }
        
    } catch (error) {
        console.error('❌ Error restarting ESP:', error);
        hideLoading();
        showRestartResultModal('error', { message: error.message });
    }
}

// Show restart result modal
function showRestartResultModal(type, result) {
    const modalId = 'restartResultModal';
    let modal = document.getElementById(modalId);
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    const isSuccess = type === 'success';
    const bgColor = isSuccess ? 'linear-gradient(135deg, #38b000, #2a9d8f)' : 'linear-gradient(135deg, #e63946, #d00000)';
    const icon = isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle';
    const title = isSuccess ? 'Restart Berhasil!' : 'Restart Gagal!';
    const iconColor = isSuccess ? '#38b000' : '#e63946';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <div class="modal-header" style="background: ${bgColor}; color: white;">
                <h3 style="color: white; display: flex; align-items: center; gap: 10px;">
                    <i class="fas ${icon}" style="font-size: 1.4rem;"></i> ${title}
                </h3>
                <button class="modal-close" id="closeRestartModal" style="color: white;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 2rem 1.5rem; text-align: center;">
                <i class="fas ${icon}" style="font-size: 4rem; color: ${iconColor}; margin-bottom: 1rem;"></i>
                <h4 style="margin-bottom: 1.5rem;">
                    ${isSuccess ? 'Perintah restart terkirim!' : 'Tidak dapat merestart ESP'}
                </h4>
                <div class="info-display" style="background: #f8f9fa; text-align: left;">
                    <div class="info-item">
                        <span class="info-label">Perangkat:</span>
                        <span class="info-value">${currentDeviceName}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">ID:</span>
                        <span class="info-value">${currentDeviceId}</span>
                    </div>
                    ${isSuccess ? `
                    <div class="info-item">
                        <span class="info-label">Alamat IP:</span>
                        <span class="info-value">${result.espIp || 'Tidak diketahui'}</span>
                    </div>
                    ` : `
                    <div class="info-item">
                        <span class="info-label">Penyebab:</span>
                        <span class="info-value" style="color: #e63946;">${getErrorMessage(result)}</span>
                    </div>
                    `}
                </div>
                ${isSuccess ? 
                    '<p style="margin-top: 1.5rem; color: #6c757d;">ESP akan restart dalam beberapa detik.</p>' : 
                    '<p style="margin-top: 1.5rem; color: #6c757d;">Pastikan ESP online dan terhubung ke jaringan.</p>'
                }
            </div>
            <div class="modal-footer">
                <button class="btn ${isSuccess ? 'btn-success' : 'btn-danger'}" id="okRestartBtn" style="width: 100%;">
                    <i class="fas fa-check"></i> OK
                </button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    
    document.getElementById('closeRestartModal').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    document.getElementById('okRestartBtn').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
}

// Get error message helper
function getErrorMessage(result) {
    const message = result.message || result.error || 'Unknown error';
    
    if (message.includes('ECONNREFUSED') || message.includes('refused')) {
        return 'ESP offline / tidak merespon';
    } else if (message.includes('timeout')) {
        return 'Timeout (ESP tidak merespon)';
    } else if (message.includes('ENOTFOUND')) {
        return 'Alamat IP tidak valid';
    }
    
    return message.length > 50 ? message.substring(0, 50) + '...' : message;
}

// Open info modal
async function openInfoModal() {
    showLoading('Memuat Info', 'Mengambil data informasi perangkat...');
    
    try {
        const response = await fetch(`/api/created-info/${currentDeviceId}`, {
            headers: { 'Accept': 'application/json' }
        });
        
        const result = await response.json();
        hideLoading();
        
        if (result.success) {
            const data = result.data;
            
            const formatDate = (dateString) => {
                if (!dateString || dateString === 'N/A') return 'N/A';
                try {
                    const date = new Date(dateString);
                    return date.toLocaleString('id-ID', {
                        year: 'numeric', month: 'long', day: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                    });
                } catch (error) {
                    return dateString;
                }
            };
            
            const infoDisplay = document.getElementById('infoDisplay');
            infoDisplay.innerHTML = `
                <div class="info-item">
                    <span class="info-label">ID Perangkat:</span>
                    <span class="info-value">${data.deviceId || currentDeviceId}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Nama Kartu:</span>
                    <span class="info-value">${data.customName || currentDeviceName}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Dibuat Pada:</span>
                    <span class="info-value">${formatDate(data.createdAt)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Terakhir Update:</span>
                    <span class="info-value">${formatDate(data.lastUpdated)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Binary Dibuat:</span>
                    <span class="info-value">${formatDate(data.binaryGeneratedAt)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Status Node:</span>
                    <span class="info-value ${data.nodeStatus === 'online' ? 'online-status' : 'offline-status'}">
                        ${data.nodeStatus || 'unknown'}
                    </span>
                </div>
            `;
            
            infoModal.style.display = 'flex';
        } else {
            throw new Error(result.error || 'Gagal memuat info');
        }
        
    } catch (error) {
        hideLoading();
        console.error('Error loading info:', error);
        showToast('Gagal memuat info perangkat', 'error');
    }
}

// Save name
async function saveName() {
    const newNameInput = document.getElementById('newName');
    if (!newNameInput) return;
    
    const newName = newNameInput.value.trim();
    
    if (!newName) {
        showToast('Nama baru harus diisi', 'error');
        newNameInput.focus();
        return;
    }
    
    if (newName === currentDeviceName) {
        showToast('Nama sama dengan yang sekarang', 'info');
        return;
    }
    
    if (newName.length < 2) {
        showToast('Nama minimal 2 karakter', 'error');
        newNameInput.focus();
        return;
    }
    
    const saveBtn = document.getElementById('saveNameBtn');
    saveBtn.innerHTML = '<span class="loading"></span> Menyimpan...';
    saveBtn.disabled = true;
    
    try {
        const response = await fetch(`/api/card-name-editor/${currentDeviceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                action: 'update',
                customName: newName
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentDeviceName = newName;
            deviceTitle.textContent = currentDeviceName;
            document.getElementById('deleteDeviceName').textContent = currentDeviceName;
            editNameModal.style.display = 'none';
            showToast(`Nama berhasil diubah menjadi: ${newName}`, 'success');
        } else {
            throw new Error(result.error || 'Gagal mengubah nama');
        }
        
    } catch (error) {
        console.error('Error saving name:', error);
        showToast(`Gagal mengubah nama: ${error.message}`, 'error');
    } finally {
        saveBtn.innerHTML = 'Simpan';
        saveBtn.disabled = false;
    }
}

// Confirm delete
async function confirmDelete() {
    const deleteBtn = document.getElementById('confirmDeleteBtn');
    deleteBtn.innerHTML = '<span class="loading"></span> Menghapus...';
    deleteBtn.disabled = true;
    
    try {
        const response = await fetch(`/api/delete-device/${currentDeviceId}`, {
            method: 'DELETE',
            headers: { 'Accept': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            deleteConfirmModal.style.display = 'none';
            successModal.style.display = 'flex';
        } else {
            throw new Error(result.error || 'Gagal menghapus perangkat');
        }
        
    } catch (error) {
        console.error('Error deleting device:', error);
        showToast(`Gagal menghapus: ${error.message}`, 'error');
        deleteConfirmModal.style.display = 'none';
    } finally {
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Ya, Hapus';
        deleteBtn.disabled = false;
    }
}

// Open edit name modal
function openEditNameModal() {
    document.getElementById('currentName').value = currentDeviceName;
    document.getElementById('newName').value = '';
    editNameModal.style.display = 'flex';
    setTimeout(() => {
        document.getElementById('newName').focus();
    }, 100);
}

// Open delete modal
function openDeleteModal() {
    document.getElementById('deleteDeviceId').textContent = currentDeviceId;
    document.getElementById('deleteDeviceName').textContent = currentDeviceName;
    deleteConfirmModal.style.display = 'flex';
}

// Download code
async function downloadCodeSource() {
    showLoading('Mengunduh Kode', 'Mempersiapkan file .ino...');
    
    try {
        const response = await fetch(`/api/download-code/${currentDeviceId}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal mengunduh');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentDeviceId}.ino`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        hideLoading();
        showToast('Kode sumber berhasil diunduh!', 'success');
        
    } catch (error) {
        hideLoading();
        console.error('Error downloading code:', error);
        showToast(`Gagal mengunduh: ${error.message}`, 'error');
    }
}

// Download binary
async function downloadBinaryFile() {
    showLoading('Mengunduh Binary', 'Mempersiapkan file .bin...');
    
    try {
        const response = await fetch(`/api/download-binary/${currentDeviceId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('File binary tidak ditemukan. Silakan kompilasi terlebih dahulu.');
            }
            throw new Error(`Gagal mengunduh binary`);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentDeviceId}.bin`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        hideLoading();
        showToast('File binary berhasil diunduh!', 'success');
        
    } catch (error) {
        hideLoading();
        console.error('Error downloading binary:', error);
        showToast(`Gagal mengunduh binary: ${error.message}`, 'error');
    }
}

// Navigate functions
function openPreviewCode() {
    window.location.href = `code-preview.html?deviceId=${currentDeviceId}`;
}

function openProgramESP() {
    window.location.href = `esp-flasher.html?deviceId=${currentDeviceId}`;
}

// ====================================
// UTILITY FUNCTIONS
// ====================================

function showErrorAndRedirect(message) {
    showToast(message, 'error');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 2000);
}

function showToast(message, type = "info") {
    if (!toast) return;
    
    const icon = type === 'success' ? 'fas fa-check-circle' : 
                type === 'error' ? 'fas fa-exclamation-circle' : 
                type === 'warning' ? 'fas fa-exclamation-triangle' :
                'fas fa-info-circle';
    
    toast.innerHTML = `<i class="${icon}"></i><span>${escapeHtml(message)}</span>`;
    toast.className = `toast toast-${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showLoading(title = 'Memproses...', message = 'Mohon tunggu sebentar') {
    const loadingTitle = document.getElementById('loadingTitle');
    const loadingMessage = document.getElementById('loadingMessage');
    
    if (loadingTitle) loadingTitle.textContent = title;
    if (loadingMessage) loadingMessage.textContent = message;
    if (loadingModal) loadingModal.style.display = 'flex';
}

function hideLoading() {
    if (loadingModal) loadingModal.style.display = 'none';
}

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
            window.location.href = 'index.html';
        });
    }
    
    // Back to dashboard button (error state)
    if (backToDashboardBtn) {
        backToDashboardBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    // Device Management
    if (editNameBtn) editNameBtn.addEventListener('click', openEditNameModal);
    if (infoButton) infoButton.addEventListener('click', openInfoModal);
    if (deleteButton) deleteButton.addEventListener('click', openDeleteModal);
    
    // ESP Tools
    if (previewCodeBtn) previewCodeBtn.addEventListener('click', openPreviewCode);
    if (downloadCodeBtn) downloadCodeBtn.addEventListener('click', downloadCodeSource);
    if (downloadBinaryBtn) downloadBinaryBtn.addEventListener('click', downloadBinaryFile);
    if (programEspBtn) programEspBtn.addEventListener('click', openProgramESP);
    
    // ESP Control
    if (reverseLogicBtn) reverseLogicBtn.addEventListener('click', toggleReverseLogic);
    if (restartEspBtn) restartEspBtn.addEventListener('click', restartESP);
    
    // Edit Name Modal
    document.getElementById('closeEditModal')?.addEventListener('click', () => editNameModal.style.display = 'none');
    document.getElementById('cancelEditBtn')?.addEventListener('click', () => editNameModal.style.display = 'none');
    document.getElementById('saveNameBtn')?.addEventListener('click', saveName);
    
    // Info Modal
    document.getElementById('closeInfoModal')?.addEventListener('click', () => infoModal.style.display = 'none');
    document.getElementById('closeInfoBtn')?.addEventListener('click', () => infoModal.style.display = 'none');
    
    // Delete Confirm Modal
    document.getElementById('closeDeleteModal')?.addEventListener('click', () => deleteConfirmModal.style.display = 'none');
    document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => deleteConfirmModal.style.display = 'none');
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDelete);
    
    // Success Modal
    document.getElementById('okSuccessBtn')?.addEventListener('click', () => {
        successModal.style.display = 'none';
        window.location.href = 'index.html';
    });
    
    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === editNameModal) editNameModal.style.display = 'none';
        if (e.target === infoModal) infoModal.style.display = 'none';
        if (e.target === deleteConfirmModal) deleteConfirmModal.style.display = 'none';
        if (e.target === successModal) successModal.style.display = 'none';
        if (e.target === loadingModal) loadingModal.style.display = 'none';
    });
    
    // Enter key for save name
    document.getElementById('newName')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveName();
        }
    });
}

// ====================================
// ADDITIONAL STYLES
// ====================================
const style = document.createElement('style');
style.textContent = `
    /* Loading State */
    .loading-state {
        text-align: center;
        padding: 3rem 1.5rem;
    }
    
    .loading-spinner {
        font-size: 3rem;
        color: var(--primary);
        margin-bottom: 1rem;
    }
    
    .loading-state h3 {
        margin-bottom: 0.5rem;
        color: var(--dark);
    }
    
    .loading-state p {
        color: var(--gray);
    }
    
    /* Error State */
    .error-state {
        text-align: center;
        padding: 3rem 1.5rem;
    }
    
    .error-icon {
        font-size: 3.5rem;
        color: var(--danger);
        margin-bottom: 1rem;
    }
    
    .error-state h3 {
        margin-bottom: 0.5rem;
        color: var(--danger);
    }
    
    .error-state p {
        color: var(--gray);
        margin-bottom: 2rem;
    }
    
    /* Main Card */
    .main-card {
        background-color: var(--card-bg);
        border-radius: 24px;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
        overflow: hidden;
        border: 1px solid rgba(0, 0, 0, 0.05);
        margin-bottom: 2rem;
    }
    
    /* Page Header */
    .page-header {
        margin-bottom: 1rem;
    }
    
    .page-header h2 {
        font-size: 1.5rem;
        color: var(--dark);
        margin-bottom: 0.25rem;
    }
    
    .page-header p {
        color: var(--gray);
        font-size: 0.9rem;
    }
    
    /* Action Sections */
    .action-section {
        padding: 1.5rem;
        border-bottom: 8px solid var(--body-bg);
    }
    
    .action-section:last-child {
        border-bottom: none;
    }
    
    .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 1rem;
        color: var(--primary);
        font-size: 1rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .section-title i {
        font-size: 1rem;
    }
    
    /* Action Buttons */
    .action-button {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 1rem;
        background-color: var(--light);
        border: 1px solid var(--gray-light);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-bottom: 0.8rem;
    }
    
    .action-button:last-child {
        margin-bottom: 0;
    }
    
    .action-button:active {
        transform: scale(0.98);
        background-color: white;
        border-color: var(--primary);
    }
    
    .action-button i:first-child {
        font-size: 1.2rem;
        color: var(--primary);
        width: 24px;
        text-align: center;
    }
    
    .action-content {
        flex: 1;
    }
    
    .action-title {
        font-weight: 600;
        margin-bottom: 0.25rem;
        color: var(--dark);
        font-size: 1rem;
    }
    
    .action-desc {
        font-size: 0.8rem;
        color: var(--gray);
    }
    
    .action-button i:last-child {
        color: var(--gray);
        font-size: 0.9rem;
    }
    
    /* Reverse Button */
    .reverse-button {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 1rem;
        background: linear-gradient(145deg, #7209b7, #b5179e);
        border: none;
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-bottom: 0.8rem;
        color: white;
    }
    
    .reverse-button:active {
        transform: scale(0.98);
        opacity: 0.9;
    }
    
    .reverse-button i:first-child {
        font-size: 1.2rem;
        color: white;
        width: 24px;
    }
    
    .reverse-button .action-content {
        color: white;
    }
    
    .reverse-button .action-title {
        color: white;
    }
    
    .reverse-button .action-desc {
        color: rgba(255, 255, 255, 0.9);
    }
    
    .reverse-button i:last-child {
        color: rgba(255, 255, 255, 0.7);
    }
    
    /* Restart Button */
    .restart-button {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 1rem;
        background-color: #fff4e6;
        border: 1px solid #ffe0b3;
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-bottom: 0.8rem;
    }
    
    .restart-button:active {
        transform: scale(0.98);
        background-color: #ffe8d9;
        border-color: #f8961e;
    }
    
    .restart-button i:first-child {
        font-size: 1.2rem;
        color: #f8961e;
        width: 24px;
    }
    
    .restart-button .action-title {
        color: #e85d04;
    }
    
    .restart-history {
        font-size: 0.75rem;
        color: var(--gray);
        margin-top: 4px;
        display: flex;
        align-items: center;
        gap: 4px;
    }
    
    .restart-history i {
        font-size: 0.7rem;
        color: var(--gray);
    }
    
    /* Delete Button */
    .delete-button {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 1rem;
        background-color: #ffeaea;
        border: 1px solid #ffcccc;
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        margin: 1.5rem;
    }
    
    .delete-button:active {
        transform: scale(0.98);
        background-color: #ffdbdb;
        border-color: var(--danger);
    }
    
    .delete-button i:first-child {
        font-size: 1.2rem;
        color: var(--danger);
        width: 24px;
    }
    
    /* Badges */
    .badge-active {
        display: inline-block;
        padding: 4px 12px;
        background: linear-gradient(135deg, #38b000, #2a9d8f);
        color: white;
        border-radius: 20px;
        font-size: 0.7rem;
        font-weight: 600;
    }
    
    .badge-inactive {
        display: inline-block;
        padding: 4px 12px;
        background: linear-gradient(135deg, #6c757d, #495057);
        color: white;
        border-radius: 20px;
        font-size: 0.7rem;
        font-weight: 600;
    }
    
    /* Modal Styles */
    .modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(5px);
    }
    
    .modal-content {
        background-color: white;
        border-radius: 24px;
        width: 90%;
        max-width: 450px;
        max-height: 90vh;
        overflow-y: auto;
        animation: modalSlide 0.3s ease;
    }
    
    @keyframes modalSlide {
        from {
            opacity: 0;
            transform: translateY(50px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .modal-header {
        padding: 1.2rem;
        border-bottom: 1px solid var(--gray-light);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(135deg, var(--primary), var(--secondary));
        color: white;
    }
    
    .modal-header h3 {
        color: white;
        font-size: 1.2rem;
    }
    
    .modal-close {
        background: rgba(255,255,255,0.2);
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .modal-body {
        padding: 1.5rem;
    }
    
    .modal-footer {
        padding: 1.2rem;
        border-top: 1px solid var(--gray-light);
        display: flex;
        gap: 0.8rem;
    }
    
    .modal-footer .btn {
        flex: 1;
    }
    
    /* Info Display */
    .info-display {
        background-color: var(--light);
        border-radius: 16px;
        padding: 1.2rem;
    }
    
    .info-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.8rem;
        padding-bottom: 0.8rem;
        border-bottom: 1px solid var(--gray-light);
    }
    
    .info-item:last-child {
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
    }
    
    .info-label {
        color: var(--gray);
        font-weight: 600;
        font-size: 0.9rem;
    }
    
    .info-value {
        color: var(--dark);
        font-weight: 600;
        font-size: 0.9rem;
    }
    
    .online-status {
        color: var(--success);
    }
    
    .offline-status {
        color: var(--danger);
    }
    
    /* Warning Icon */
    .warning-icon {
        text-align: center;
        font-size: 3rem;
        color: var(--warning);
        margin-bottom: 1rem;
    }
    
    /* Form */
    .form-group {
        margin-bottom: 1.2rem;
    }
    
    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        color: var(--dark);
        font-size: 0.9rem;
    }
    
    .form-group input {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid var(--gray-light);
        border-radius: 16px;
        font-size: 1rem;
        transition: all 0.3s ease;
        background-color: white;
    }
    
    .form-group input:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 4px rgba(67, 97, 238, 0.1);
    }
    
    .readonly-input {
        background-color: var(--light);
        color: var(--gray);
    }
    
    /* Buttons */
    .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 20px;
        border-radius: 30px;
        font-weight: 600;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
    }
    
    .btn:active {
        transform: scale(0.96);
    }
    
    .btn-primary {
        background: var(--primary);
        color: white;
    }
    
    .btn-danger {
        background: var(--danger);
        color: white;
    }
    
    .btn-success {
        background: var(--success);
        color: white;
    }
    
    .btn-secondary {
        background: var(--gray-light);
        color: var(--dark);
    }
    
    .btn-secondary:active {
        background: var(--gray);
        color: white;
    }
    
    /* Loading Spinner */
    .loading {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .fa-spin {
        animation: spin 1s linear infinite;
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
    
    initCardEditPage();
});

// Export untuk debugging
window.cardEditPage = {
    refresh: loadDeviceInfo,
    showToast,
    reload: () => window.location.reload()
};
