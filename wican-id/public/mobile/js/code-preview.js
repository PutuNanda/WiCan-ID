// code-preview.js - Mobile Version with Full Dynamic Content
// ESP-01S Code Preview Page - 100% JavaScript Generated
// Mobile First Style - Konsisten dengan halaman lainnya

// ====================================
// GLOBAL VARIABLES
// ====================================
let currentDeviceId = '';
let currentDeviceData = null;
let isLoading = false;

// ====================================
// INITIALIZATION
// ====================================
async function initCodePreviewPage() {
    console.log('📱 Initializing Code Preview Page (Mobile)...');
    
    // Get deviceId from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentDeviceId = urlParams.get('deviceId');
    
    if (!currentDeviceId) {
        showErrorAndRedirect('ID Perangkat tidak ditemukan di URL');
        return;
    }
    
    console.log('📱 Loading code preview for device:', currentDeviceId);
    
    // Create DOM structure
    createDOMStructure();
    
    // Get DOM elements after creation
    cacheElements();
    
    // Setup header scroll behavior
    setupHeaderScroll();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load device info and code
    await loadDeviceInfo();
    await loadCodePreview();
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
                        <p>Preview Kode</p>
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
                <h2 id="pageTitle">Preview Kode Sumber</h2>
                <p id="pageDescription">Memuat data perangkat...</p>
            </div>

            <!-- LOADING STATE -->
            <div class="loading-state" id="loadingState">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <h3>Memuat Preview Kode</h3>
                <p>Mohon tunggu sebentar...</p>
            </div>

            <!-- ERROR STATE -->
            <div class="error-state" id="errorState" style="display: none;">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Gagal Memuat Kode</h3>
                <p id="errorMessage">Terjadi kesalahan saat memuat kode sumber.</p>
                <button class="btn-primary" id="retryBtn">
                    <i class="fas fa-sync-alt"></i> Coba Lagi
                </button>
            </div>

            <!-- CONTENT STATE (akan ditampilkan setelah data dimuat) -->
            <div id="contentState" style="display: none;">
                <!-- Device Information Card -->
                <div class="device-info" id="deviceInfo">
                    <div class="info-row">
                        <div class="info-label">ID Perangkat:</div>
                        <div class="info-value" id="infoDeviceId">-</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Nama Kartu:</div>
                        <div class="info-value" id="infoCustomName">-</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Status:</div>
                        <div class="info-value" id="infoStatus">-</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Dibuat pada:</div>
                        <div class="info-value" id="infoCreatedAt">-</div>
                    </div>
                </div>

                <!-- Code Preview Container -->
                <div class="code-container">
                    <div class="code-header">
                        <h3 id="codeFileName">
                            <i class="fas fa-file-code file-icon"></i>
                            Loading...
                        </h3>
                        <button class="copy-btn" id="copyCodeBtn">
                            <i class="far fa-copy"></i> Salin
                        </button>
                    </div>
                    <div class="code-content">
                        <pre><code class="language-cpp" id="codeContent">// Memuat kode sumber...
// Harap tunggu sebentar...</code></pre>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="button-group">
                    <button class="btn btn-secondary" id="backToDashboardBtn">
                        <i class="fas fa-arrow-left"></i> Kembali
                    </button>
                    <button class="btn btn-success" id="downloadBtn">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <a href="#" class="btn btn-warning" id="programBtn">
                        <i class="fas fa-microchip"></i> Program
                    </a>
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
let errorMessage, retryBtn;
let infoDeviceId, infoCustomName, infoStatus, infoCreatedAt;
let codeFileName, codeContent, copyCodeBtn;
let backToDashboardBtn, downloadBtn, programBtn;
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
    
    // Device info
    infoDeviceId = document.getElementById('infoDeviceId');
    infoCustomName = document.getElementById('infoCustomName');
    infoStatus = document.getElementById('infoStatus');
    infoCreatedAt = document.getElementById('infoCreatedAt');
    
    // Code elements
    codeFileName = document.getElementById('codeFileName');
    codeContent = document.getElementById('codeContent');
    copyCodeBtn = document.getElementById('copyCodeBtn');
    
    // Buttons
    backToDashboardBtn = document.getElementById('backToDashboardBtn');
    downloadBtn = document.getElementById('downloadBtn');
    programBtn = document.getElementById('programBtn');
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

// Load device information
async function loadDeviceInfo() {
    try {
        console.log(`🔍 Fetching device info for: ${currentDeviceId}`);
        
        const response = await fetch(`/api/device-info/${currentDeviceId}`);
        const result = await response.json();
        
        if (result.success && result.device.exists) {
            const meta = result.device.meta;
            currentDeviceData = meta;
            
            // Update info elements
            infoDeviceId.textContent = meta.ESPID || currentDeviceId;
            infoCustomName.textContent = meta.customName || currentDeviceId;
            
            // Format status dengan badge
            if (meta.NodeStatus === 'online') {
                infoStatus.innerHTML = `<span class="status-badge status-online">${meta.NodeStatus.toUpperCase()}</span>`;
            } else {
                infoStatus.innerHTML = `<span class="status-badge status-offline">${meta.NodeStatus.toUpperCase()}</span>`;
            }
            
            // Format tanggal
            if (meta.createdAt) {
                infoCreatedAt.textContent = formatDate(meta.createdAt);
            } else {
                infoCreatedAt.textContent = 'Tidak diketahui';
            }
            
            // Update page header
            pageTitle.textContent = `Preview Kode: ${meta.customName || currentDeviceId}`;
            pageDescription.textContent = `Kode sumber untuk perangkat ${currentDeviceId}`;
            
            console.log('✅ Device info loaded:', meta);
        } else {
            throw new Error('Informasi perangkat tidak ditemukan');
        }
    } catch (error) {
        console.error('❌ Error loading device info:', error);
        showErrorState('Gagal memuat informasi perangkat');
    }
}

// Load code preview dengan highlight.js
async function loadCodePreview() {
    try {
        isLoading = true;
        showLoadingState(true);
        
        console.log(`📡 Fetching code preview for: ${currentDeviceId}`);
        
        const response = await fetch(`/api/code-preview/${currentDeviceId}`);
        const result = await response.json();
        
        if (result.success) {
            // Update file name
            codeFileName.innerHTML = `<i class="fas fa-file-code file-icon"></i> ${currentDeviceId}.ino`;
            
            // Set kode ke element
            codeContent.textContent = result.code;
            
            // Terapkan highlight.js jika tersedia
            if (window.hljs) {
                hljs.highlightElement(codeContent);
            }
            
            // Hide loading, show content
            loadingState.style.display = 'none';
            contentState.style.display = 'block';
            
            showToast('✅ Kode sumber berhasil dimuat', 'success');
            console.log('✅ Code preview loaded');
        } else {
            throw new Error(result.error || 'Gagal memuat kode sumber');
        }
    } catch (error) {
        console.error('❌ Error loading code preview:', error);
        showErrorState('Gagal memuat kode sumber. Periksa koneksi jaringan.');
    } finally {
        isLoading = false;
    }
}

// Download code
async function downloadCode() {
    try {
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<span class="loading"></span> Mengunduh...';
        downloadBtn.disabled = true;
        
        showToast('📥 Mendownload kode sumber...', 'info');
        
        const response = await fetch(`/api/download-code/${currentDeviceId}`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentDeviceId}.ino`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showToast('✅ Kode berhasil di-download', 'success');
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Gagal mendownload kode');
        }
    } catch (error) {
        console.error('❌ Error downloading code:', error);
        showToast('❌ Gagal mendownload kode', 'error');
    } finally {
        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download';
        downloadBtn.disabled = false;
    }
}

async function writeTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.top = '-1000px';
    textArea.style.left = '-1000px';
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);
    return copied;
}

// Copy code to clipboard
async function copyCodeToClipboard() {
    try {
        const code = codeContent.textContent;
        
        if (!code || code.includes('Memuat kode sumber') || code.includes('Gagal memuat')) {
            showToast('❌ Kode belum tersedia', 'error');
            return;
        }
        
        await writeTextToClipboard(code);
        
        // Visual feedback
        const originalText = copyCodeBtn.innerHTML;
        copyCodeBtn.innerHTML = '<i class="fas fa-check"></i> Tersalin!';
        copyCodeBtn.classList.add('copied');
        
        showToast('✅ Kode disalin ke clipboard', 'success');
        
        setTimeout(() => {
            copyCodeBtn.innerHTML = originalText;
            copyCodeBtn.classList.remove('copied');
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error copying code:', error);
        showToast('❌ Gagal menyalin kode', 'error');
    }
}

// ====================================
// UTILITY FUNCTIONS
// ====================================

function formatDate(dateString) {
    if (!dateString || dateString === 'N/A') return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
}

function showErrorAndRedirect(message) {
    showToast(message, 'error');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 2000);
}

function showErrorState(message) {
    loadingState.style.display = 'none';
    errorState.style.display = 'block';
    if (errorMessage) {
        errorMessage.textContent = message || 'Terjadi kesalahan saat memuat kode sumber.';
    }
}

function showLoadingState(loading) {
    if (!loadingState || !contentState) return;
    
    if (loading) {
        loadingState.style.display = 'block';
        contentState.style.display = 'none';
        errorState.style.display = 'none';
    }
}

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
            window.history.back();
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
            await loadCodePreview();
        });
    }
    
    // Download button
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadCode);
    }
    
    // Copy button
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', copyCodeToClipboard);
    }
    
    // Program button
    if (programBtn && currentDeviceId) {
        programBtn.href = `esp-flasher.html?deviceId=${currentDeviceId}`;
    }
    
    // Window events
    window.addEventListener('online', () => {
        showToast('📶 Koneksi tersambung', 'success');
    });
    
    window.addEventListener('offline', () => {
        showToast('📡 Koneksi terputus', 'warning');
    });
}

// ====================================
// ADDITIONAL STYLES (untuk memastikan highlight.js)
// ====================================
const style = document.createElement('style');
style.textContent = `
    /* Pastikan highlight.js bekerja dengan baik */
    .hljs {
        background: transparent !important;
    }
    
    /* Animasi untuk copy button */
    .copy-btn.copied {
        background: linear-gradient(135deg, #38b000, #2a9d8f) !important;
    }
    
    /* Styling untuk code content */
    .code-content code {
        font-family: 'Cascadia Code', 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.5;
    }
    
    /* Responsive untuk layar sangat kecil */
    @media (max-width: 360px) {
        .code-content code {
            font-size: 11px;
        }
        
        .code-header h3 {
            font-size: 0.9rem;
        }
        
        .copy-btn {
            padding: 8px 12px;
            font-size: 0.8rem;
        }
    }
    
    /* Tap highlight color */
    .btn, .action-btn, .copy-btn {
        -webkit-tap-highlight-color: rgba(67, 97, 238, 0.2);
    }
`;
document.head.appendChild(style);

// ====================================
// LOAD HIGHLIGHT.JS if not exists
// ====================================
function loadHighlightJS() {
    return new Promise((resolve, reject) => {
        if (window.hljs) {
            resolve();
            return;
        }
        
        // Load CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '../vendor/highlightjs/atom-one-dark.min.css';
        document.head.appendChild(link);
        
        // Load JS
        const script = document.createElement('script');
        script.src = '../vendor/highlightjs/highlight.min.js';
        script.onload = () => {
            // Load Arduino/C++ support
            const arduinoScript = document.createElement('script');
            arduinoScript.src = '../vendor/highlightjs/arduino.min.js';
            arduinoScript.onload = resolve;
            arduinoScript.onerror = resolve; // Tetap lanjut meskipun gagal
            document.head.appendChild(arduinoScript);
        };
        script.onerror = resolve; // Tetap lanjut meskipun gagal
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
    
    // Load highlight.js dulu
    await loadHighlightJS();
    
    // Initialize page
    initCodePreviewPage();
});

// Export untuk debugging
window.codePreviewPage = {
    refresh: () => {
        initCodePreviewPage();
    },
    showToast,
    reload: () => window.location.reload()
};
