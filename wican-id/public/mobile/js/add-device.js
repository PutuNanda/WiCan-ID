// add-device.js - Mobile Version with Full Dynamic Content
// ESP-01S Add Device Page - 100% JavaScript Generated

// ====================================
// GLOBAL VARIABLES
// ====================================
let currentDeviceId = '';
let isLoading = false;

// ====================================
// INITIALIZATION
// ====================================
async function initAddDevicePage() {
    console.log('📱 Initializing Add Device Page (Mobile)...');
    
    // Create DOM structure first
    createDOMStructure();
    
    // Get DOM elements after creation
    cacheElements();
    
    // Setup header scroll behavior (sama seperti index)
    setupHeaderScroll();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load default config
    await loadDefaultConfig();
    
    console.log('✅ Add Device Page initialized');
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
                        <p>Tambah Device</p>
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
            <div class="page-header">
                <h2>Tambah Perangkat Baru</h2>
                <p>Isi formulir di bawah untuk menambahkan perangkat ESP-01S baru ke sistem</p>
            </div>

            <!-- FORM CARD -->
            <div class="form-card" id="addDeviceForm">
                <div class="form-group">
                    <label for="deviceId">
                        <i class="fas fa-microchip"></i> ID Perangkat (ESP-ID)
                    </label>
                    <input type="text" id="deviceId" placeholder="contoh: lampu-taman, pompa-kolam" autocomplete="off">
                    <div class="form-help">ID unik untuk perangkat ESP-01S. Gunakan huruf, angka, tanda hubung.</div>
                </div>

                <div class="form-group">
                    <label for="customName">
                        <i class="fas fa-tag"></i> Nama Kartu
                    </label>
                    <input type="text" id="customName" placeholder="contoh: Lampu Taman Depan" autocomplete="off">
                    <div class="form-help">Nama yang akan ditampilkan di dashboard.</div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="wifiSSID">
                            <i class="fas fa-wifi"></i> WiFi SSID
                        </label>
                        <input type="text" id="wifiSSID" placeholder="Nama jaringan WiFi" autocomplete="off">
                        <div class="form-help">Kosongkan untuk memakai SSID default.</div>
                    </div>

                    <div class="form-group">
                        <label for="wifiPassword">
                            <i class="fas fa-key"></i> Password WiFi
                        </label>
                        <input type="password" id="wifiPassword" placeholder="Password WiFi" autocomplete="off">
                        <div class="form-help">Kosongkan untuk memakai password default.</div>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="serverIP">
                            <i class="fas fa-server"></i> Server IP
                        </label>
                        <input type="text" id="serverIP" value="192.168.1.50">
                    </div>

                    <div class="form-group">
                        <label for="serverPort">
                            <i class="fas fa-network-wired"></i> Server Port
                        </label>
                        <input type="number" id="serverPort" value="5050">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="nodePort">
                            <i class="fas fa-plug"></i> Node Port
                        </label>
                        <input type="number" id="nodePort" value="8080">
                        <div class="form-help">Port yang digunakan ESP untuk menerima perintah.</div>
                    </div>
                </div>

                <div class="button-group">
                    <button type="button" class="btn btn-secondary" id="cancelBtn">
                        <i class="fas fa-times"></i> Batal
                    </button>
                    <button type="button" class="btn btn-primary" id="addDeviceBtn">
                        <i class="fas fa-plus-circle"></i> Tambah Perangkat
                    </button>
                </div>
            </div>

            <!-- SUCCESS CARD -->
            <div class="success-card" id="successState">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3>Perangkat Berhasil Ditambahkan! 🎉</h3>
                <p>
                    Perangkat <span class="device-name-highlight" id="deviceName"></span> 
                    telah berhasil ditambahkan ke sistem. Kode sumber ESP telah dibuat dan siap untuk di-download.
                </p>
                
                <div class="action-buttons">
                    <button class="action-btn success-action" id="previewCodeBtn">
                        <i class="fas fa-code"></i>
                        <span>Preview</span>
                    </button>
                    <button class="action-btn success-action" id="downloadCodeBtn">
                        <i class="fas fa-download"></i>
                        <span>Download</span>
                    </button>
                    <button class="action-btn success-action" id="programEspBtn">
                        <i class="fas fa-microchip"></i>
                        <span>Program</span>
                    </button>
                </div>
                
                <div style="margin-top: 1rem;">
                    <a href="index.html" class="btn btn-primary" id="backToDashboardBtn">
                        <i class="fas fa-home"></i> Kembali ke Dashboard
                    </a>
                </div>
            </div>
        </div>

        <!-- TOAST NOTIFICATION -->
        <div class="toast" id="toast"></div>
    `;
}

// DOM Elements cache
let addDeviceForm, successState, deviceName, toast;
let deviceIdInput, customNameInput, wifiSSIDInput, wifiPasswordInput;
let serverIPInput, serverPortInput, nodePortInput;
let addDeviceBtn, cancelBtn, backBtn;
let previewCodeBtn, downloadCodeBtn, programEspBtn, backToDashboardBtn;

function cacheElements() {
    // Forms and states
    addDeviceForm = document.getElementById('addDeviceForm');
    successState = document.getElementById('successState');
    deviceName = document.getElementById('deviceName');
    toast = document.getElementById('toast');
    
    // Input fields
    deviceIdInput = document.getElementById('deviceId');
    customNameInput = document.getElementById('customName');
    wifiSSIDInput = document.getElementById('wifiSSID');
    wifiPasswordInput = document.getElementById('wifiPassword');
    serverIPInput = document.getElementById('serverIP');
    serverPortInput = document.getElementById('serverPort');
    nodePortInput = document.getElementById('nodePort');
    
    // Buttons
    addDeviceBtn = document.getElementById('addDeviceBtn');
    cancelBtn = document.getElementById('cancelBtn');
    backBtn = document.getElementById('backBtn');
    previewCodeBtn = document.getElementById('previewCodeBtn');
    downloadCodeBtn = document.getElementById('downloadCodeBtn');
    programEspBtn = document.getElementById('programEspBtn');
    backToDashboardBtn = document.getElementById('backToDashboardBtn');
}

// ====================================
// HEADER SCROLL BEHAVIOR
// ====================================
function setupHeaderScroll() {
    const header = document.getElementById('mainHeader');
    if (!header) return;
    
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

// Load default config from server
async function loadDefaultConfig() {
    try {
        const response = await fetch('/api/default-config');
        if (response.ok) {
            const data = await response.json();
            const config = data.config || {};

            const serverIP = config['server-ip'] || config.serverIP;
            const serverPort = config['server-port'] || config.serverPort;
            const nodePort = config['node-port'] || config.nodePort;
            const wifiSSID = config['wifi-ssid'] || config.wifiSSID;
            const wifiPassword = config['wifi-password'] || config.wifiPassword;

            if (serverIP && serverIPInput) {
                serverIPInput.value = serverIP;
            }

            if (serverPort && serverPortInput) {
                serverPortInput.value = serverPort;
            }

            if (nodePort && nodePortInput) {
                nodePortInput.value = nodePort;
            }

            if (wifiSSID && wifiSSIDInput && !wifiSSIDInput.value.trim()) {
                wifiSSIDInput.value = wifiSSID;
            }

            if (wifiPassword && wifiPasswordInput && !wifiPasswordInput.value) {
                wifiPasswordInput.value = wifiPassword;
            }
            
            console.log('✅ Default config loaded');
        }
    } catch (error) {
        console.log('📱 Using default config values');
        // Tetap pakai nilai default yang sudah ada di input
    }
}

// Add device function
async function addDevice() {
    // Validate inputs
    if (!validateForm()) {
        return;
    }
    
    // Show loading state
    const originalText = addDeviceBtn.innerHTML;
    addDeviceBtn.innerHTML = '<span class="loading"></span> Menambahkan...';
    addDeviceBtn.disabled = true;
    isLoading = true;
    
    try {
        const deviceData = {
            deviceId: deviceIdInput.value.trim(),
            customName: customNameInput.value.trim(),
            wifiSSID: wifiSSIDInput.value.trim(),
            wifiPassword: wifiPasswordInput.value,
            serverIP: serverIPInput.value.trim(),
            serverPort: parseInt(serverPortInput.value),
            nodePort: parseInt(nodePortInput.value)
        };
        
        console.log('📡 Sending device data to server:', deviceData);
        
        const response = await fetch('/api/add-device', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(deviceData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Success!
            currentDeviceId = deviceData.deviceId;
            deviceName.textContent = deviceData.customName;
            
            // Hide form, show success state with animation
            addDeviceForm.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                addDeviceForm.style.display = 'none';
                successState.style.display = 'block';
                successState.style.animation = 'fadeIn 0.4s ease';
                
                // Scroll ke atas agar success state terlihat
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 300);
            
            showToast(result.message || '✅ Perangkat berhasil ditambahkan', 'success');
        } else {
            // Error
            showToast(result.error || '❌ Gagal menambahkan perangkat', 'error');
        }
    } catch (error) {
        console.error('❌ Error adding device:', error);
        showToast('❌ Gagal menambahkan perangkat. Periksa koneksi jaringan.', 'error');
    } finally {
        // Reset button
        addDeviceBtn.innerHTML = originalText;
        addDeviceBtn.disabled = false;
        isLoading = false;
    }
}

// Download code function
async function downloadCode() {
    if (!currentDeviceId) {
        showToast('❌ ID Perangkat tidak ditemukan', 'error');
        return;
    }
    
    try {
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
            
            showToast('✅ Kode sumber berhasil di-download', 'success');
        } else {
            const error = await response.json();
            showToast(error.error || '❌ Gagal mendownload kode sumber', 'error');
        }
    } catch (error) {
        console.error('❌ Error downloading code:', error);
        showToast('❌ Gagal mendownload kode sumber', 'error');
    }
}

// ====================================
// VALIDATION FUNCTIONS
// ====================================

function validateForm() {
    const deviceId = deviceIdInput.value.trim();
    const customName = customNameInput.value.trim();
    const wifiSSID = wifiSSIDInput.value.trim();
    const wifiPassword = wifiPasswordInput.value;
    const serverIP = serverIPInput.value.trim();
    const serverPort = serverPortInput.value;
    const nodePort = nodePortInput.value;
    
    // Validasi Device ID
    if (!deviceId) {
        showToast('⚠️ ID Perangkat harus diisi', 'warning');
        deviceIdInput.focus();
        return false;
    }
    
    // Validasi format Device ID (hanya huruf, angka, hubung, underscore)
    if (!/^[a-zA-Z0-9\-_]+$/.test(deviceId)) {
        showToast('⚠️ ID Perangkat hanya boleh huruf, angka, - dan _', 'warning');
        deviceIdInput.focus();
        return false;
    }
    
    // Validasi panjang Device ID
    if (deviceId.length < 3 || deviceId.length > 30) {
        showToast('⚠️ ID Perangkat harus 3-30 karakter', 'warning');
        deviceIdInput.focus();
        return false;
    }
    
    // Validasi Nama Kartu
    if (!customName) {
        showToast('⚠️ Nama Kartu harus diisi', 'warning');
        customNameInput.focus();
        return false;
    }
    
    if (customName.length < 3 || customName.length > 50) {
        showToast('⚠️ Nama Kartu harus 3-50 karakter', 'warning');
        customNameInput.focus();
        return false;
    }
    
    if ((wifiSSID && !wifiPassword) || (!wifiSSID && wifiPassword)) {
        showToast('⚠️ WiFi SSID dan Password harus diisi bersamaan atau dikosongkan', 'warning');
        if (!wifiSSID) {
            wifiSSIDInput.focus();
        } else {
            wifiPasswordInput.focus();
        }
        return false;
    }

    if (wifiPassword && wifiPassword.length < 8) {
        showToast('⚠️ Password WiFi minimal 8 karakter', 'warning');
        wifiPasswordInput.focus();
        return false;
    }
    
    // Validasi Server IP
    if (!serverIP) {
        showToast('⚠️ Server IP harus diisi', 'warning');
        serverIPInput.focus();
        return false;
    }
    
    // Validasi format IP sederhana
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(serverIP)) {
        showToast('⚠️ Format Server IP tidak valid', 'warning');
        serverIPInput.focus();
        return false;
    }
    
    // Validasi Server Port
    if (!serverPort || serverPort < 1 || serverPort > 65535) {
        showToast('⚠️ Server Port harus antara 1-65535', 'warning');
        serverPortInput.focus();
        return false;
    }
    
    // Validasi Node Port
    if (!nodePort || nodePort < 1 || nodePort > 65535) {
        showToast('⚠️ Node Port harus antara 1-65535', 'warning');
        nodePortInput.focus();
        return false;
    }
    
    // Validasi port tidak sama
    if (serverPort === nodePort) {
        showToast('⚠️ Server Port dan Node Port tidak boleh sama', 'warning');
        nodePortInput.focus();
        return false;
    }
    
    return true;
}

// ====================================
// TOAST NOTIFICATION
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

// Helper untuk escape HTML
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
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'index.html';
        });
    }
    
    // Cancel button
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Konfirmasi jika form sudah diisi
            const hasInput = deviceIdInput.value || customNameInput.value || 
                            wifiSSIDInput.value || wifiPasswordInput.value;
            
            if (hasInput) {
                if (confirm('Yakin ingin membatalkan? Data yang sudah diisi akan hilang.')) {
                    window.location.href = 'index.html';
                }
            } else {
                window.location.href = 'index.html';
            }
        });
    }
    
    // Add device button
    if (addDeviceBtn) {
        addDeviceBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!isLoading) {
                addDevice();
            }
        });
    }
    
    // Preview code button
    if (previewCodeBtn) {
        previewCodeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentDeviceId) {
                window.location.href = `code-preview.html?deviceId=${currentDeviceId}`;
            }
        });
    }
    
    // Download code button
    if (downloadCodeBtn) {
        downloadCodeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            downloadCode();
        });
    }
    
    // Program ESP button
    if (programEspBtn) {
        programEspBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentDeviceId) {
                window.location.href = `esp-flasher.html?deviceId=${currentDeviceId}`;
            }
        });
    }
    
    // Back to dashboard button (di success state)
    if (backToDashboardBtn) {
        backToDashboardBtn.addEventListener('click', (e) => {
            // Biarkan default href bekerja
        });
    }
    
    // Keyboard event: Enter untuk submit
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isLoading && addDeviceForm.style.display !== 'none') {
            e.preventDefault();
            addDevice();
        }
    });
    
    // Input validation realtime untuk Device ID
    if (deviceIdInput) {
        deviceIdInput.addEventListener('input', (e) => {
            // Hanya izinkan huruf, angka, -, _
            e.target.value = e.target.value.replace(/[^a-zA-Z0-9\-_]/g, '');
        });
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
// ADDITIONAL STYLES (untuk animasi tambahan)
// ====================================
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.95); }
    }
    
    .action-btn.success-action {
        background: var(--gray-light);
        color: var(--dark);
        border: 1px solid rgba(0,0,0,0.05);
        padding: 12px 8px;
        border-radius: 18px;
        transition: all 0.2s ease;
    }
    
    .action-btn.success-action i {
        font-size: 1.5rem;
        color: var(--primary);
        margin-bottom: 4px;
    }
    
    .action-btn.success-action:hover {
        background: var(--primary);
        color: white;
    }
    
    .action-btn.success-action:hover i {
        color: white;
    }
    
    .action-btn.success-action:active {
        transform: scale(0.95);
    }
    
    .device-name-highlight {
    display: inline-block;
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: white;
    padding: 0.15rem 0.5rem;        /* Padding super tipis! */
    border-radius: 6px;              /* Radius lebih kecil */
    font-weight: 600;                /* Turunin dikit biar nggak terlalu bold */
    font-size: inherit;              /* Ikut ukuran font parent */
    margin: 0;                       /* Hapus margin biar nggak dorong element lain */
    box-shadow: 0 2px 6px rgba(67, 97, 238, 0.15); /* Bayangan soft */
    letter-spacing: normal;          /* Kembali ke default */
    width: fit-content;              /* Width mengikuti konten */
    max-width: 100%;                 /* Maksimal 100% parent */
    word-break: break-word;          /* Kalau kepanjangan, turun ke bawah */
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.2);  /* Border lebih transparan */
    backdrop-filter: blur(2px);       /* Efek blur tipis */
    line-height: 1.2;                 /* Line height lebih rapat */
    vertical-align: middle;           /* Biar align dengan teks di sampingnya */
}
    
    /* Styling untuk input number */
    input[type=number]::-webkit-inner-spin-button, 
    input[type=number]::-webkit-outer-spin-button { 
        opacity: 0.5;
        height: 24px;
    }
    
    /* Focus state yang lebih jelas untuk mobile */
    input:focus, select:focus, button:focus {
        outline: none;
    }
    
    /* Tap highlight color for mobile */
    .btn, .action-btn {
        -webkit-tap-highlight-color: rgba(67, 97, 238, 0.2);
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
    
    initAddDevicePage();
});

// Export untuk debugging (opsional)
window.addDevicePage = {
    refresh: loadDefaultConfig,
    showToast,
    validate: validateForm
};
