// esp-flasher.js - Mobile Version with Full Dynamic Content
// ESP-01S Web Flasher Page - 100% JavaScript Generated
// Mobile First Style - Konsisten dengan halaman lainnya

// ====================================
// GLOBAL VARIABLES
// ====================================
let currentDeviceId = '';
let currentDeviceName = '';
let currentDeviceData = null;
let binaryReady = false;
let refreshInterval = null;
let isFirstCheck = true;
let isLoading = false;

// ====================================
// INITIALIZATION
// ====================================
async function initEspFlasherPage() {
    console.log('📱 Initializing ESP Flasher Page (Mobile)...');
    
    // Get deviceId from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentDeviceId = urlParams.get('deviceId');
    
    if (!currentDeviceId) {
        showErrorAndRedirect('ID Perangkat tidak ditemukan di URL');
        return;
    }
    
    console.log('📱 Loading flasher for device:', currentDeviceId);
    
    // Create DOM structure
    createDOMStructure();
    
    // Get DOM elements after creation
    cacheElements();
    
    // Setup header scroll behavior
    setupHeaderScroll();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load device info
    await loadDeviceInfo();
    
    // Start background refresh if binary not ready
    if (!binaryReady) {
        startBackgroundRefresh();
    }
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
                        <p>Program ESP</p>
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
                <h2 id="pageTitle">Program Perangkat ESP-01S</h2>
                <p id="pageDescription">Memuat data perangkat...</p>
            </div>

            <!-- STATUS CARD -->
            <div class="status-card" id="statusCard">
                <!-- LOADING STATE -->
                <div class="loading-state" id="loadingState">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <h3>Memuat Data Perangkat</h3>
                    <p>Mohon tunggu sebentar...</p>
                </div>

                <!-- ERROR STATE -->
                <div class="error-state" id="errorState" style="display: none;">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>Gagal Memuat Data</h3>
                    <p id="errorMessage">Terjadi kesalahan saat memuat data perangkat.</p>
                    <button class="btn-primary" id="retryBtn">
                        <i class="fas fa-sync-alt"></i> Coba Lagi
                    </button>
                </div>

                <!-- CONTENT STATE -->
                <div id="contentState" style="display: none;">
                    <!-- Device Info -->
                    <div class="device-info" id="deviceInfo">
                        <div class="info-row">
                            <span class="info-label">ID Perangkat:</span>
                            <span class="info-value" id="deviceIdText">-</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Nama Kartu:</span>
                            <span class="info-value" id="deviceNameText">-</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Status Binary:</span>
                            <span class="info-value">
                                <span class="status-badge status-waiting" id="binaryStatus">Memeriksa...</span>
                            </span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Ukuran Binary:</span>
                            <span class="info-value" id="binarySize">-</span>
                        </div>
                    </div>

                    <!-- Loading Status -->
                    <div class="loading-status" id="loadingStatus">
                        <div class="status-icon waiting" id="statusIcon">
                            <i class="fas fa-sync-alt fa-spin"></i>
                        </div>
                        <h3 id="statusTitle">Sedang melakukan Kompilasi...</h3>
                        <p id="statusMessage">Mohon tunggu sebentar, sistem sedang mengkompilasi file binary.</p>
                    </div>

                    <!-- Action Buttons -->
                    <div class="button-group" id="actionButtons" style="display: none;">
                        <button class="btn btn-secondary" id="backToDashboardBtn">
                            <i class="fas fa-arrow-left"></i> Kembali
                        </button>
                        <button class="btn btn-success" id="downloadBtn">
                            <i class="fas fa-download"></i> Download Binary
                        </button>
                    </div>

                    <!-- Flasher Container -->
                    <div class="flasher-container" id="flasherContainer" style="display: none;">
                        <div class="flasher-header">
                            <h3>
                                <i class="fas fa-bolt"></i> Web Flasher ESP-01S
                            </h3>
                            <p>Solusi praktis untuk memprogram ESP-01S secara online 🎉</p>
                        </div>
                        
                        <!-- ESP Web Install Button -->
                        <esp-web-install-button 
                            id="flashButton" 
                            manifest="">
                        </esp-web-install-button>
                        
                        <div style="margin-top: 1rem; text-align: center; color: var(--gray); font-size: 0.9rem;">
                            <p><i class="fas fa-info-circle"></i> Sambungkan ESP-01S via USB, lalu klik tombol Connect di atas</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL: Binary Ready -->
        <div class="modal" id="binaryReadyModal">
            <div class="modal-content">
                <div class="modal-header" style="background: linear-gradient(135deg, #38b000, #2a9d8f);">
                    <h3 style="color: white;">
                        <i class="fas fa-check-circle"></i> Binary Siap! 🎉
                    </h3>
                    <button class="modal-close" id="closeBinaryModal" style="color: white;">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; margin-bottom: 1.5rem;">
                        <i class="fas fa-microchip" style="font-size: 3rem; color: var(--primary); margin-bottom: 1rem;"></i>
                        <h4 style="color: var(--dark); margin-bottom: 0.5rem;">File Binary Siap Diprogram!</h4>
                        <p style="color: var(--gray);">Klik tombol <strong>FLASH</strong> untuk memprogram ESP-01S Anda.</p>
                    </div>
                    
                    <div class="info-display" style="margin-bottom: 1.5rem;">
                        <div class="info-item">
                            <span class="info-label">ID Perangkat:</span>
                            <span class="info-value" id="modalDeviceId">-</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Nama Kartu:</span>
                            <span class="info-value" id="modalDeviceName">-</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Ukuran Binary:</span>
                            <span class="info-value" id="modalBinarySize">-</span>
                        </div>
                    </div>
                    
                    <div style="background: var(--light); padding: 1rem; border-radius: 16px; border-left: 4px solid var(--warning);">
                        <p style="margin: 0; color: var(--dark); font-size: 0.9rem;">
                            <i class="fas fa-lightbulb" style="color: var(--warning); margin-right: 8px;"></i>
                            Pastikan ESP-01S terhubung via USB dan masuk mode flash sebelum menekan tombol Flash.
                        </p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="closeModalBtn">Tutup</button>
                    <button class="btn btn-success" id="gotoFlashBtn">
                        <i class="fas fa-bolt"></i> Buka Web Flasher
                    </button>
                </div>
            </div>
        </div>

        <!-- MODAL: Background Refresh -->
        <div class="modal" id="refreshModal" style="background: rgba(0, 0, 0, 0.7);">
            <div class="modal-content" style="background: transparent; box-shadow: none; max-width: 300px;">
                <div class="loading-state" style="background: white; border-radius: 28px; padding: 2rem;">
                    <div class="loading-spinner">
                        <i class="fas fa-sync-alt fa-spin" style="font-size: 3rem; color: var(--primary);"></i>
                    </div>
                    <h3 style="color: var(--dark); margin-bottom: 0.5rem;">Sedang Mengkompilasi...</h3>
                    <p style="color: var(--gray); font-size: 0.9rem;">
                        Sistem sedang mengkompilasi file binary...
                    </p>
                    <div style="margin-top: 1.5rem; display: flex; justify-content: center; gap: 8px;">
                        <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--primary); animation: pulseDot 1.5s infinite;"></div>
                        <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--primary); animation: pulseDot 1.5s infinite 0.3s;"></div>
                        <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--primary); animation: pulseDot 1.5s infinite 0.6s;"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL: Success Download -->
        <div class="modal" id="successModal">
            <div class="modal-content">
                <div class="modal-header" style="background: linear-gradient(135deg, #38b000, #2a9d8f);">
                    <h3 style="color: white;">
                        <i class="fas fa-check-circle"></i> Berhasil!
                    </h3>
                </div>
                <div class="modal-body" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-check-circle" style="font-size: 4rem; color: #38b000; margin-bottom: 1rem;"></i>
                    <h3 style="margin-bottom: 0.5rem;">Download Berhasil</h3>
                    <p style="color: var(--gray;">File binary telah diunduh.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" id="okSuccessBtn" style="width: 100%;">OK</button>
                </div>
            </div>
        </div>

        <!-- TOAST NOTIFICATION -->
        <div class="toast" id="toast"></div>
    `;
}

// DOM Elements cache
let header, backBtn, pageTitle, pageDescription;
let loadingState, errorState, contentState;
let errorMessage, retryBtn, backToDashboardBtn;
let deviceIdText, deviceNameText, binaryStatus, binarySize;
let loadingStatus, statusIcon, statusTitle, statusMessage;
let actionButtons, flasherContainer, flashButton, downloadBtn;
let binaryReadyModal, refreshModal, successModal;
let closeBinaryModal, closeModalBtn, gotoFlashBtn, okSuccessBtn;
let modalDeviceId, modalDeviceName, modalBinarySize;
let toast;

function cacheElements() {
    // Header
    header = document.getElementById('mainHeader');
    backBtn = document.getElementById('backBtn');
    pageTitle = document.getElementById('pageTitle');
    pageDescription = document.getElementById('pageDescription');
    
    // States
    loadingState = document.getElementById('loadingState');
    errorState = document.getElementById('errorState');
    contentState = document.getElementById('contentState');
    errorMessage = document.getElementById('errorMessage');
    retryBtn = document.getElementById('retryBtn');
    backToDashboardBtn = document.getElementById('backToDashboardBtn');
    
    // Device info
    deviceIdText = document.getElementById('deviceIdText');
    deviceNameText = document.getElementById('deviceNameText');
    binaryStatus = document.getElementById('binaryStatus');
    binarySize = document.getElementById('binarySize');
    
    // Loading status
    loadingStatus = document.getElementById('loadingStatus');
    statusIcon = document.getElementById('statusIcon');
    statusTitle = document.getElementById('statusTitle');
    statusMessage = document.getElementById('statusMessage');
    
    // Buttons
    actionButtons = document.getElementById('actionButtons');
    flasherContainer = document.getElementById('flasherContainer');
    flashButton = document.getElementById('flashButton');
    downloadBtn = document.getElementById('downloadBtn');
    
    // Modals
    binaryReadyModal = document.getElementById('binaryReadyModal');
    refreshModal = document.getElementById('refreshModal');
    successModal = document.getElementById('successModal');
    
    closeBinaryModal = document.getElementById('closeBinaryModal');
    closeModalBtn = document.getElementById('closeModalBtn');
    gotoFlashBtn = document.getElementById('gotoFlashBtn');
    okSuccessBtn = document.getElementById('okSuccessBtn');
    
    modalDeviceId = document.getElementById('modalDeviceId');
    modalDeviceName = document.getElementById('modalDeviceName');
    modalBinarySize = document.getElementById('modalBinarySize');
    
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
        isLoading = true;
        showLoadingState(true);
        
        console.log(`🔍 Fetching device info for: ${currentDeviceId}`);
        
        const response = await fetch(`/api/esp-flasher/${currentDeviceId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📊 Device info:', result);
        
        if (result.success) {
            const device = result.device;
            currentDeviceData = device;
            currentDeviceName = device.customName || device.id;
            
            // Update UI
            updateDeviceUI(device);
            
            // Hide loading, show content
            loadingState.style.display = 'none';
            contentState.style.display = 'block';
            
            // Update page header
            pageTitle.textContent = `Program ESP: ${currentDeviceName}`;
            pageDescription.textContent = `File binary untuk perangkat ${currentDeviceId}`;
            
            if (device.binaryExists) {
                showBinaryReady(device);
                stopBackgroundRefresh();
                
                // Show modal only on first check
                if (isFirstCheck) {
                    showBinaryReadyModal(device);
                    isFirstCheck = false;
                }
            } else {
                showBinaryWaiting(device);
            }
            
            console.log('✅ Device info loaded');
            
        } else {
            throw new Error(result.error || 'Gagal memuat device');
        }
        
    } catch (error) {
        console.error('❌ Error loading device:', error);
        showErrorState(`Gagal memuat data: ${error.message}`);
    } finally {
        isLoading = false;
    }
}

// Update device UI
function updateDeviceUI(device) {
    deviceIdText.textContent = device.id || currentDeviceId;
    deviceNameText.textContent = device.customName || currentDeviceId;
    binarySize.textContent = device.binarySizeKB ? `${device.binarySizeKB} KB` : '-';
}

// Show binary ready
function showBinaryReady(device) {
    binaryReady = true;
    
    statusIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
    statusIcon.className = 'status-icon ready';
    statusTitle.textContent = '✅ Binary Siap!';
    statusMessage.textContent = `File binary siap untuk diprogram (${device.binarySizeKB} KB)`;
    binaryStatus.textContent = 'Siap';
    binaryStatus.className = 'status-badge status-ready';
    
    // Setup Web Flasher
    setupWebFlasher();
    
    // Show buttons and flasher
    actionButtons.style.display = 'flex';
    flasherContainer.style.display = 'block';
}

// Show binary waiting
function showBinaryWaiting(device) {
    statusIcon.innerHTML = '<i class="fas fa-clock"></i>';
    statusTitle.textContent = '⏳ Menunggu Binary';
    statusMessage.textContent = 'File binary belum tersedia. Sistem sedang melakukan kompilasi...';
    binaryStatus.textContent = 'Menunggu';
    binaryStatus.className = 'status-badge status-waiting';
    
    actionButtons.style.display = 'flex';
    flasherContainer.style.display = 'none';
}

// Show error state
function showErrorState(message) {
    loadingState.style.display = 'none';
    errorState.style.display = 'block';
    contentState.style.display = 'none';
    if (errorMessage) {
        errorMessage.textContent = message || 'Terjadi kesalahan saat memuat data perangkat.';
    }
    stopBackgroundRefresh();
}

// Show loading state
function showLoadingState(loading) {
    if (!loadingState || !contentState) return;
    
    if (loading) {
        loadingState.style.display = 'block';
        contentState.style.display = 'none';
        errorState.style.display = 'none';
    }
}

// Show error and redirect
function showErrorAndRedirect(message) {
    showToast(message, 'error');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 2000);
}

// ====================================
// WEB FLASHER SETUP
// ====================================
function setupWebFlasher() {
    if (!flashButton) return;
    
    // Set custom styles via CSS variables
    flashButton.style.setProperty('--esp-tools-button-color', 'var(--primary)');
    flashButton.style.setProperty('--esp-tools-button-text-color', 'white');
    flashButton.style.setProperty('--esp-tools-button-border-radius', '30px');
    flashButton.style.setProperty('--esp-tools-button-padding', '14px 28px');
    flashButton.style.setProperty('--esp-tools-button-font-size', '1rem');
    flashButton.style.setProperty('--esp-tools-button-font-weight', '600');
    
    // Set manifest URL
    const manifestUrl = `/api/manifest/${currentDeviceId}`;
    console.log('🔗 Manifest URL:', manifestUrl);
    
    // Set attribute manifest sebagai URL
    flashButton.setAttribute('manifest', manifestUrl);
    
    console.log('🎯 Web Flasher ready!');
}

// ====================================
// BACKGROUND REFRESH SYSTEM
// ====================================
function startBackgroundRefresh() {
    // Show refresh modal if not already shown
    showRefreshModal();
    
    // Start interval
    refreshInterval = setInterval(async () => {
        console.log('🔄 Background refresh checking...');
        try {
            const response = await fetch(`/api/esp-flasher/${currentDeviceId}`);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.device.binaryExists) {
                    // Binary is ready!
                    clearInterval(refreshInterval);
                    refreshInterval = null;
                    
                    // Update UI
                    updateDeviceUI(result.device);
                    showBinaryReady(result.device);
                    setupWebFlasher();
                    
                    // Hide refresh modal
                    hideRefreshModal();
                    
                    // Show success modal
                    showBinaryReadyModal(result.device);
                }
            }
        } catch (error) {
            console.log('Background refresh error:', error);
        }
    }, 3000); // Check every 3 seconds
}

function stopBackgroundRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
        hideRefreshModal();
    }
}

function showRefreshModal() {
    if (refreshModal) {
        refreshModal.classList.add('show');
    }
}

function hideRefreshModal() {
    if (refreshModal) {
        refreshModal.classList.remove('show');
    }
}

// ====================================
// MODAL FUNCTIONS
// ====================================
function showBinaryReadyModal(device) {
    modalDeviceId.textContent = device.id || currentDeviceId;
    modalDeviceName.textContent = device.customName || currentDeviceId;
    modalBinarySize.textContent = device.binarySizeKB ? `${device.binarySizeKB} KB` : '-';
    binaryReadyModal.classList.add('show');
}

function hideBinaryReadyModal() {
    binaryReadyModal.classList.remove('show');
}

function showSuccessModal() {
    successModal.classList.add('show');
    setTimeout(() => {
        successModal.classList.remove('show');
    }, 2000);
}

// ====================================
// DOWNLOAD BINARY
// ====================================
async function downloadBinary() {
    try {
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<span class="loading"></span> Mengunduh...';
        downloadBtn.disabled = true;
        
        showToast('📥 Mendownload file binary...', 'info');
        
        const downloadUrl = `/api/download-binary/${currentDeviceId}`;
        console.log('📥 Downloading:', downloadUrl);
        
        const response = await fetch(downloadUrl);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentDeviceId}.bin`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        console.log('✅ Download success');
        showToast(`✅ Binary berhasil diunduh: ${currentDeviceId}.bin`, 'success');
        showSuccessModal();
        
    } catch (error) {
        console.error('❌ Download error:', error);
        showToast(`❌ Gagal mengunduh: ${error.message}`, 'error');
    } finally {
        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download Binary';
        downloadBtn.disabled = false;
    }
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
    
    // Back to dashboard button
    if (backToDashboardBtn) {
        backToDashboardBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    // Retry button
    if (retryBtn) {
        retryBtn.addEventListener('click', async () => {
            errorState.style.display = 'none';
            loadingState.style.display = 'block';
            await loadDeviceInfo();
        });
    }
    
    // Download button
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadBinary);
    }
    
    // Binary ready modal
    if (closeBinaryModal) {
        closeBinaryModal.addEventListener('click', hideBinaryReadyModal);
    }
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hideBinaryReadyModal);
    }
    if (gotoFlashBtn) {
        gotoFlashBtn.addEventListener('click', () => {
            hideBinaryReadyModal();
            // Scroll to flasher section
            if (flasherContainer) {
                flasherContainer.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
    
    // Success modal
    if (okSuccessBtn) {
        okSuccessBtn.addEventListener('click', () => {
            successModal.classList.remove('show');
        });
    }
    
    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === binaryReadyModal) {
            binaryReadyModal.classList.remove('show');
        }
        if (e.target === refreshModal) {
            refreshModal.classList.remove('show');
        }
        if (e.target === successModal) {
            successModal.classList.remove('show');
        }
    });
    
    // Window events
    window.addEventListener('online', () => {
        showToast('📶 Koneksi tersambung', 'success');
    });
    
    window.addEventListener('offline', () => {
        showToast('📡 Koneksi terputus', 'warning');
    });
    
    window.addEventListener('beforeunload', () => {
        stopBackgroundRefresh();
    });
}

// ====================================
// ADDITIONAL STYLES
// ====================================
const style = document.createElement('style');
style.textContent = `
    /* Info Display untuk modal */
    .info-display {
        background-color: var(--light);
        border-radius: 18px;
        padding: 1.2rem;
        border: 1px solid rgba(0, 0, 0, 0.03);
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
    
    /* Pulse animation untuk dots */
    @keyframes pulseDot {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.3); opacity: 0.7; }
    }
    
    /* Error state */
    .error-state {
        text-align: center;
        padding: 3rem 1.5rem;
    }
    
    .error-icon {
        font-size: 3.5rem;
        color: var(--danger);
        margin-bottom: 1rem;
        animation: shake 0.5s ease-in-out;
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
    
    .error-state h3 {
        margin-bottom: 0.5rem;
        color: var(--danger);
        font-size: 1.3rem;
    }
    
    .error-state p {
        color: var(--gray);
        margin-bottom: 2rem;
        font-size: 0.95rem;
        line-height: 1.5;
    }
    
    /* Loading state */
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
        font-size: 1.2rem;
    }
    
    .loading-state p {
        color: var(--gray);
        font-size: 0.9rem;
    }
    
    /* Button primary */
    .btn-primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: var(--primary);
        color: white;
        border: none;
        padding: 14px 28px;
        border-radius: 30px;
        font-weight: 600;
        cursor: pointer;
        font-size: 1rem;
        box-shadow: 0 8px 16px rgba(67, 97, 238, 0.3);
        transition: all 0.2s ease;
    }
    
    .btn-primary:active {
        transform: scale(0.96);
        box-shadow: 0 4px 8px rgba(67, 97, 238, 0.4);
    }
    
    /* Tap highlight */
    .btn, .action-btn, .modal-close, .btn-primary {
        -webkit-tap-highlight-color: rgba(67, 97, 238, 0.2);
    }
`;
document.head.appendChild(style);

// ====================================
// LOAD ESP WEB TOOLS
// ====================================
function loadEspWebTools() {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (customElements.get('esp-web-install-button')) {
            resolve();
            return;
        }
        
        // Load script
        const script = document.createElement('script');
        script.src = '/web/install-button.js';
        script.type = 'module';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ====================================
// START THE PAGE
// ====================================
document.addEventListener('DOMContentLoaded', async () => {
    // Buat elemen app jika belum ada
    let app = document.getElementById('app');
    if (!app) {
        app = document.createElement('div');
        app.id = 'app';
        document.body.appendChild(app);
    }
    
    // Load ESP Web Tools dulu
    try {
        await loadEspWebTools();
        console.log('✅ ESP Web Tools loaded');
    } catch (error) {
        console.error('❌ Failed to load ESP Web Tools:', error);
    }
    
    // Initialize page
    initEspFlasherPage();
});

// Export untuk debugging
window.espFlasherPage = {
    refresh: loadDeviceInfo,
    showToast,
    reload: () => window.location.reload()
};
