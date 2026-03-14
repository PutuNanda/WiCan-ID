// mobile.js - ESP-01S Mobile Dashboard
// Full Dynamic Version - Without WebSocket, Manual Refresh Only

// ====================================
// GLOBAL VARIABLES
// ====================================
let devices = [];
let isConnected = false;
let isLoading = false;
let autoRefreshInterval = null;
let lastUpdate = null;
function markDirectHandled() {
    try {
        sessionStorage.setItem('platform_direct_done', '1');
    } catch (e) {
        // ignore storage errors
    }
}

function normalizeMobileDirectQuery() {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const manual = params.get('manual') === '1';
    const directId = params.get('directid');

    if (manual) {
        params.delete('manual');
        if (!directId) {
            params.set('directid', 'mobile');
        }
        const nextUrl = `${url.pathname}${params.toString() ? `?${params.toString()}` : ''}${url.hash}`;
        window.history.replaceState({}, '', nextUrl);
    } else if (!directId) {
        params.set('directid', 'mobile');
        const nextUrl = `${url.pathname}?${params.toString()}${url.hash}`;
        window.history.replaceState({}, '', nextUrl);
    }

    markDirectHandled();
}

// ====================================
// INITIALIZATION
// ====================================
async function initMobileDashboard() {
    console.log('📱 Initializing ESP Mobile Dashboard (Manual Refresh)...');
    
    normalizeMobileDirectQuery();
    // Create DOM structure first
    createDOMStructure();
    
    // Get DOM elements after creation
    cacheElements();
    
    // Set connection status dengan HEART
    updateConnectionStatus(true, "Terhubung ke server");
    
    // Setup header scroll behavior
    setupHeaderScroll();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load devices from API
    await loadDevices();
    
    // Show welcome toast
    setTimeout(() => {
        showToast("✨ Mobile Dashboard siap digunakan", "success");
    }, 500);
    
    console.log('✅ Mobile Dashboard initialized');
}

// ====================================
// CREATE FULL DOM STRUCTURE
// ====================================
function createDOMStructure() {
    const app = document.getElementById('app');
    if (!app) return;
    
    app.innerHTML = `
        <!-- HEADER -->
        <header id="mainHeader">
            <div class="header-left">
                <div class="logo-container">
                    <div class="logo" style="background:#111827;border:1px solid rgba(255,255,255,0.35);"><img src="/WiCan-icon.png" alt="WiCan" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></div>
                    <div class="logo-text">
                        <h1>WiCan</h1>
                        <p>Mobile</p>
                    </div>
                </div>
                <!-- Heart indicator -->
                <div class="heart-status">
                    <div class="status-indicator connected" id="statusIndicator">
                        <i class="fas fa-heart"></i>
                    </div>
                </div>
            </div>

            <div class="header-right">
                <!-- Tombol ke Desktop -->
                <button class="action-btn desktop" id="desktopBtn" title="Buka Dashboard Desktop">
                    <i class="fas fa-desktop"></i>
                </button>
                <!-- Tombol Refresh -->
                <button class="action-btn refresh" id="refreshBtn" title="Refresh Data">
                    <i class="fas fa-sync-alt"></i>
                </button>
                <!-- Tombol Tambah Perangkat -->
                <button class="action-btn add-device" id="addDeviceBtn" title="Tambah Perangkat">
                    <i class="fas fa-plus"></i>
                </button>
                <!-- Tombol Pengaturan -->
                <button class="action-btn settings" id="settingsBtn" title="Pengaturan">
                    <i class="fas fa-cog"></i>
                </button>
            </div>
        </header>

        <!-- MAIN CONTENT -->
        <div class="container">
            <div class="dashboard-title">
                <h2>Perangkat Mobile</h2>
                <div class="device-count">
                    <span id="deviceCount">0</span> Perangkat
                </div>
            </div>

            <!-- CARDS GRID -->
            <div class="cards-grid" id="cardsGrid"></div>

            <!-- EMPTY STATE (will be moved to cardsGrid by JS) -->
            <div class="empty-state" id="emptyState" style="display: none;">
                <div class="empty-icon">
                    <i class="fas fa-plug"></i>
                </div>
                <h3>Tidak Ada Perangkat</h3>
                <p>Belum ada perangkat ESP-01S yang terdeteksi. Perangkat akan muncul secara otomatis setelah terhubung ke server.</p>
                <button class="btn-primary" id="refreshDataBtn">
                    <i class="fas fa-sync-alt"></i> Refresh Data
                </button>
            </div>
        </div>

        <!-- TOAST NOTIFICATION -->
        <div class="toast" id="toast"></div>
    `;
}

// DOM Elements cache
let cardsGrid, emptyState, deviceCountSpan, refreshBtn, desktopBtn, 
    addDeviceBtn, settingsBtn, statusIndicator, toast, header, refreshDataBtn;

function cacheElements() {
    cardsGrid = document.getElementById('cardsGrid');
    emptyState = document.getElementById('emptyState');
    deviceCountSpan = document.getElementById('deviceCount');
    refreshBtn = document.getElementById('refreshBtn');
    desktopBtn = document.getElementById('desktopBtn');
    addDeviceBtn = document.getElementById('addDeviceBtn');
    settingsBtn = document.getElementById('settingsBtn');
    statusIndicator = document.getElementById('statusIndicator');
    toast = document.getElementById('toast');
    header = document.getElementById('mainHeader');
    refreshDataBtn = document.getElementById('refreshDataBtn');
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

async function loadDevices(showRefreshToast = false) {
    try {
        if (isLoading) return;
        
        isLoading = true;
        showLoadingState(true);
        
        console.log('📡 Loading devices from API...');
        
        const response = await fetch('/api/dashboard');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Process the encrypted data
            let devicesData = [];
            
            if (result.data && result.data.encrypted) {
                devicesData = decryptData(result.data);
                console.log(`✅ Decrypted data for ${devicesData.length} devices`);
            } else {
                devicesData = result.data || [];
                console.log(`✅ Loaded ${devicesData.length} devices (unencrypted)`);
            }
            
            devices = devicesData;
            updateDeviceCount();
            renderCards();
            
            showEmptyState(devices.length === 0);
            
            if (showRefreshToast) {
                showToast(`🔄 Data diperbarui (${devices.length} perangkat)`, "success");
            }
            
            updateConnectionStatus(true, "Terhubung ke server");
            lastUpdate = new Date();
        } else {
            throw new Error(result.message || 'Failed to load devices');
        }
    } catch (error) {
        console.error('❌ Error loading devices:', error);
        showToast("Gagal memuat data perangkat", "error");
        updateConnectionStatus(false, "Gagal terhubung");
        
        // For demo/development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('📱 Loading sample data for development');
            loadSampleDevices();
        }
    } finally {
        isLoading = false;
        showLoadingState(false);
    }
}

function loadSampleDevices() {
    devices = [
        {
            deviceId: "ESP01S_A1B2",
            customName: "Relay 1 (Ruang Tamu)",
            status: "online",
            deviceStatus: "on",
            relayState: "on",
            rssi: -61,
            ipAddress: "192.168.1.101",
            wifiSSID: "SmartHome WiFi",
            lastUpdated: new Date().toISOString()
        },
        {
            deviceId: "ESP01S_C3D4",
            customName: "Relay 2 (Kamar Tidur)",
            status: "online",
            deviceStatus: "on",
            relayState: "off",
            rssi: -72,
            ipAddress: "192.168.1.102",
            wifiSSID: "SmartHome WiFi",
            lastUpdated: new Date().toISOString()
        },
        {
            deviceId: "ESP01S_E5F6",
            customName: "Relay 3 (Dapur)",
            status: "offline",
            deviceStatus: "off",
            relayState: "off",
            rssi: -85,
            ipAddress: "192.168.1.103",
            wifiSSID: "SmartHome WiFi",
            lastUpdated: new Date(Date.now() - 3600000).toISOString()
        }
    ];
    
    updateDeviceCount();
    renderCards();
    showEmptyState(devices.length === 0);
    showToast("📱 Mode Demo: Data sampel", "info");
}

async function refreshAllDevices() {
    try {
        if (refreshBtn.disabled) return;
        
        refreshBtn.disabled = true;
        refreshBtn.style.transform = 'rotate(180deg)';
        
        showToast("Menyegarkan semua perangkat...", "info");
        
        console.log('🔄 Memanggil API refresh global...');
        
        const response = await fetch('/api/refresh-update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Refresh global berhasil:', result);
            showToast(`✅ Refresh selesai (${result.summary?.total || 0} perangkat)`, "success");
            // Load devices after refresh to get updated data
            await loadDevices(true);
        } else {
            throw new Error(result.message || 'Gagal melakukan refresh global');
        }
    } catch (error) {
        console.error('❌ Error refreshing all devices:', error);
        showToast("⚠️ Gagal refresh, muat ulang data...", "warning");
        await loadDevices(true);
    } finally {
        refreshBtn.disabled = false;
        setTimeout(() => {
            refreshBtn.style.transform = 'rotate(0deg)';
        }, 500);
    }
}

async function controlDeviceRelay(deviceId, action) {
    try {
        showToast(`Mengontrol relay...`, "info");
        
        const response = await fetch(`/api/node-relay/${deviceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                relayState: action 
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`✅ Relay ${action === 'on' ? 'dinyalakan' : 'dimatikan'}`, "success");
            
            // Update local device state
            const device = devices.find(d => d.deviceId === deviceId);
            if (device) {
                device.relayState = action;
            }
            
            // Update UI without reload
            updateCardRelayState(deviceId, action);
            
            // Optional: Refresh data after a short delay to sync with server
            setTimeout(() => {
                loadDevices(false);
            }, 500);
        } else {
            showToast(result.message || 'Gagal mengontrol relay', "error");
            
            // Revert checkbox if failed
            const checkbox = document.querySelector(`.card[data-id="${deviceId}"] .switch input`);
            if (checkbox) {
                checkbox.checked = action === 'off';
            }
        }
    } catch (error) {
        console.error('Error controlling device:', error);
        showToast('Gagal mengontrol relay', "error");
        
        // Revert checkbox if failed
        const checkbox = document.querySelector(`.card[data-id="${deviceId}"] .switch input`);
        if (checkbox) {
            checkbox.checked = action === 'off';
        }
    }
}

function decryptData(encryptedData) {
    try {
        if (!encryptedData || !encryptedData.encrypted) {
            console.log('⚠️ No encrypted data found, returning empty array');
            return [];
        }
        
        const decodedString = atob(encryptedData.encrypted);
        const parsedData = JSON.parse(decodedString);
        
        return parsedData.data || [];
    } catch (error) {
        console.error('❌ Error decrypting data:', error);
        showToast("Gagal mendekripsi data", "error");
        return [];
    }
}

// ====================================
// UI RENDERING FUNCTIONS
// ====================================

function renderCards() {
    // Clear existing cards
    const existingCards = cardsGrid.querySelectorAll('.card');
    existingCards.forEach(card => card.remove());
    
    // If no devices, show empty state
    if (devices.length === 0) {
        showEmptyState(true);
        return;
    }
    
    // Hide empty state
    showEmptyState(false);
    
    // Render each device card with animation
    devices.forEach((device, index) => {
        const card = createDeviceCard(device, index);
        cardsGrid.appendChild(card);
    });
}

function createDeviceCard(device, index) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = device.deviceId;
    card.style.animationDelay = `${index * 0.1}s`;
    
    const rssiInfo = getRssiInfo(device.rssi);
    const connectionStatus = device.status === 'online' ? 'Online' : 'Offline';
    const connectionClass = device.status === 'online' ? 'status-online' : 'status-offline';
    const deviceStatusText = device.deviceStatus === 'on' ? 'ON' : 'OFF';
    const deviceStatusClass = device.deviceStatus === 'on' ? 'on' : 'off';
    const relayStatusText = device.relayState === 'on' ? 'ON' : 'OFF';
    const relayStatusClass = device.relayState === 'on' ? 'relay-on' : 'relay-off';
    const displayName = device.customName || device.deviceId;
    
    card.innerHTML = `
        <div class="card-header">
            <div class="device-name">${escapeHtml(displayName)}</div>
            <div class="device-status">
                <div class="connection-status-badge">
                    <div class="status-dot ${connectionClass}"></div>
                    <span>${connectionStatus}</span>
                </div>
            </div>
        </div>
        <div class="card-body">
            <!-- Status Row - 2 Items Side by Side -->
            <div class="status-row">
                <div class="status-item">
                    <span class="status-label">
                        <i class="fas fa-power-off" style="font-size: 0.7rem; margin-right: 4px;"></i>
                        Perangkat
                    </span>
                    <span class="status-value ${deviceStatusClass}">${deviceStatusText}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">
                        <i class="fas fa-bolt" style="font-size: 0.7rem; margin-right: 4px;"></i>
                        Relay
                    </span>
                    <span class="status-value ${relayStatusClass}">${relayStatusText}</span>
                </div>
            </div>
            
            <!-- RSSI Container -->
            <div class="rssi-container">
                <div class="rssi-label">
                    <span>
                        <i class="fas fa-wifi" style="margin-right: 6px; color: var(--primary);"></i>
                        Kekuatan Sinyal
                    </span>
                    <span class="rssi-value">${device.rssi} dBm (${rssiInfo.quality})</span>
                </div>
                <div class="rssi-bar-container">
                    <div class="rssi-bar ${rssiInfo.class}" style="width: ${rssiInfo.width}"></div>
                </div>
            </div>
            
            <!-- Card Actions -->
            <div class="card-actions">
                <button class="action-btn edit-btn" title="Edit Perangkat" data-id="${device.deviceId}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn schedule-btn" title="Atur Jadwal" data-id="${device.deviceId}">
                    <i class="fas fa-calendar-alt"></i> Jadwal
                </button>
            </div>
            
            <!-- Switch Control -->
            <div class="switch-container">
                <span class="switch-label">
                    <i class="fas fa-toggle-on"></i>
                    Kontrol Relay
                </span>
                <label class="switch">
                    <input type="checkbox" 
                           ${device.relayState === 'on' ? 'checked' : ''} 
                           data-id="${device.deviceId}" 
                           data-type="relay"
                           ${device.status !== 'online' ? 'disabled' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
        </div>
    `;
    
    return card;
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

function getRssiInfo(rssi) {
    if (rssi >= -50) {
        return {
            class: 'rssi-excellent',
            width: '90%',
            quality: 'Sangat Baik'
        };
    } else if (rssi >= -60) {
        return {
            class: 'rssi-good',
            width: '70%',
            quality: 'Baik'
        };
    } else if (rssi >= -70) {
        return {
            class: 'rssi-fair',
            width: '50%',
            quality: 'Cukup'
        };
    } else {
        return {
            class: 'rssi-weak',
            width: '30%',
            quality: 'Lemah'
        };
    }
}

function updateCardRelayState(deviceId, action) {
    const card = document.querySelector(`.card[data-id="${deviceId}"]`);
    if (!card) return;
    
    const checkbox = card.querySelector('.switch input');
    const relayStatusSpan = card.querySelector('.status-value.relay-on, .status-value.relay-off');
    
    if (checkbox) {
        checkbox.checked = action === 'on';
    }
    
    if (relayStatusSpan) {
        relayStatusSpan.className = `status-value relay-${action}`;
        relayStatusSpan.textContent = action === 'on' ? 'ON' : 'OFF';
        
        // Add animation effect
        relayStatusSpan.style.animation = 'none';
        relayStatusSpan.offsetHeight;
        relayStatusSpan.style.animation = 'glowRed 0.5s ease-in-out';
    }
}

function updateDeviceCount() {
    if (deviceCountSpan) {
        deviceCountSpan.textContent = devices.length;
    }
}

function showEmptyState(show) {
    if (!emptyState) return;
    
    if (show && devices.length === 0) {
        // Move empty state to cardsGrid if not already there
        if (emptyState.parentNode !== cardsGrid) {
            cardsGrid.appendChild(emptyState);
        }
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
    }
}

function showLoadingState(loading) {
    if (refreshBtn) {
        if (loading) {
            refreshBtn.innerHTML = '<div class="loading"></div>';
        } else {
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        }
    }
}

// ====================================
// CONNECTION STATUS
// ====================================

function updateConnectionStatus(connected, message) {
    if (!statusIndicator) return;
    
    if (connected) {
        statusIndicator.className = 'status-indicator connected';
        statusIndicator.innerHTML = '<i class="fas fa-heart"></i>';
        isConnected = true;
    } else {
        statusIndicator.className = 'status-indicator disconnected';
        statusIndicator.innerHTML = '<i class="fas fa-heart"></i>';
        isConnected = false;
    }
}

async function testConnection() {
    try {
        const response = await fetch('/api/dashboard', { method: 'HEAD' });
        if (response.ok) {
            updateConnectionStatus(true, "Terhubung ke server");
        } else {
            updateConnectionStatus(false, "Gagal terhubung");
        }
    } catch (error) {
        updateConnectionStatus(false, "Gagal terhubung");
    }
}

// ====================================
// AUTO REFRESH (Disabled by default, can be enabled if needed)
// ====================================

function startAutoRefresh() {
    // Auto refresh is disabled by default
    // You can enable it by uncommenting the code below
    /*
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    autoRefreshInterval = setInterval(() => {
        if (!isLoading) {
            console.log('🔄 Auto-refreshing devices...');
            loadDevices(false);
        }
    }, 30000);
    
    console.log('🔄 Auto-refresh started (30s interval)');
    */
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log('⏹️ Auto-refresh stopped');
    }
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

// ====================================
// EVENT LISTENERS
// ====================================

function setupEventListeners() {
    // Desktop button
    if (desktopBtn) {
        desktopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            markDirectHandled();
            window.location.href = '../index.html?directid=desktop&manual=1';
        });
    }
    
    // Refresh button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshAllDevices();
        });
    }
    
    // Add device button
    if (addDeviceBtn) {
        addDeviceBtn.addEventListener('click', () => {
            window.location.href = 'add-device.html';
        });
    }
    
    // Settings button
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            window.location.href = 'settings.html';
        });
    }
    
    // Refresh data button in empty state
    if (refreshDataBtn) {
        refreshDataBtn.addEventListener('click', () => {
            if (!isLoading) {
                loadDevices(true);
            }
        });
    }
    
    // Delegate events for dynamic elements
    if (cardsGrid) {
        cardsGrid.addEventListener('click', (e) => {
            // Edit button
            const editBtn = e.target.closest('.edit-btn');
            if (editBtn) {
                e.preventDefault();
                const deviceId = editBtn.dataset.id;
                window.location.href = `card-edit.html?deviceid=${deviceId}`;
            }
            
            // Schedule button
            const schedBtn = e.target.closest('.schedule-btn');
            if (schedBtn) {
                e.preventDefault();
                const deviceId = schedBtn.dataset.id;
                window.location.href = `schedule.html?deviceid=${deviceId}`;
            }
        });
        
        // Change event for switches
        cardsGrid.addEventListener('change', (e) => {
            const checkbox = e.target.closest('.switch input[type="checkbox"]');
            if (checkbox && checkbox.dataset.id) {
                e.preventDefault();
                
                const deviceId = checkbox.dataset.id;
                const isOn = checkbox.checked;
                const action = isOn ? 'on' : 'off';
                
                // Visual feedback
                const card = checkbox.closest('.card');
                if (card) {
                    card.style.transform = 'scale(0.98)';
                    setTimeout(() => {
                        card.style.transform = '';
                    }, 200);
                }
                
                // Control relay
                controlDeviceRelay(deviceId, action);
            }
        });
    }
    
    // Window events
    window.addEventListener('beforeunload', () => {
        stopAutoRefresh();
    });
    
    window.addEventListener('online', () => {
        showToast('📶 Koneksi tersambung', 'success');
        updateConnectionStatus(true, 'Terhubung ke server');
        loadDevices(false);
    });
    
    window.addEventListener('offline', () => {
        showToast('📡 Koneksi terputus', 'warning');
        updateConnectionStatus(false, 'Tidak ada koneksi');
    });
}

// ====================================
// ADDITIONAL STYLES
// ====================================
const style = document.createElement('style');
style.textContent = `
    .loading {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .card {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    
    .toast i {
        font-size: 1.1rem;
    }
    
    @keyframes glowRed {
        0%, 100% { text-shadow: 0 0 0 transparent; }
        50% { text-shadow: 0 0 10px var(--relay-on); }
    }

    .status-indicator.disconnected i {
        color: transparent;
        -webkit-text-stroke: 2px rgba(255, 255, 255, 0.8);
    }

    .status-indicator.connected i {
        color: #22c55e;
        filter: drop-shadow(0 0 8px #22c55e);
    }

    /* Additional animations */
    .fa-heart {
        transition: all 0.3s ease;
    }

    header.scrolled .fa-heart {
        transform: scale(0.9);
    }
`;
document.head.appendChild(style);

// ====================================
// START THE DASHBOARD
// ====================================
document.addEventListener('DOMContentLoaded', () => {
    // Buat elemen app jika belum ada
    let app = document.getElementById('app');
    if (!app) {
        app = document.createElement('div');
        app.id = 'app';
        document.body.appendChild(app);
    }
    
    initMobileDashboard();
});

// Start connection test interval
setInterval(testConnection, 10000);

// Export for debugging
window.mobileDashboard = {
    refresh: loadDevices,
    devices: () => devices,
    showToast,
    refreshAll: refreshAllDevices
};

