// Global variables
let devices = [];
let isConnected = false;
let isLoading = false;
let autoRefreshInterval = null;

function isLikelyMobileDevice() {
    const ua = navigator.userAgent || '';
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || window.matchMedia('(max-width: 768px)').matches;
}

function markDirectHandled() {
    try {
        sessionStorage.setItem('platform_direct_done', '1');
    } catch (e) {
        // ignore storage errors
    }
}

function wasDirectHandled() {
    try {
        return sessionStorage.getItem('platform_direct_done') === '1';
    } catch (e) {
        return false;
    }
}

function handleInitialPlatformDirect() {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const directId = params.get('directid');
    const manual = params.get('manual') === '1';

    if (manual) {
        params.delete('manual');
        const nextUrl = `${url.pathname}${params.toString() ? `?${params.toString()}` : ''}${url.hash}`;
        window.history.replaceState({}, '', nextUrl);
        markDirectHandled();
        return false;
    }

    if (directId === 'desktop' || directId === 'mobile') {
        markDirectHandled();
        return false;
    }

    if (wasDirectHandled()) {
        return false;
    }

    markDirectHandled();
    if (isLikelyMobileDevice()) {
        window.location.replace('./mobile/index.html?directid=mobile');
        return true;
    }

    params.set('directid', 'desktop');
    const nextUrl = `${url.pathname}?${params.toString()}${url.hash}`;
    window.history.replaceState({}, '', nextUrl);
    return false;
}

// DOM Elements
const cardsGrid = document.getElementById('cardsGrid');
const emptyState = document.getElementById('emptyState');
const deviceCount = document.getElementById('deviceCount');
const addDeviceBtn = document.getElementById('addDeviceBtn');
const refreshBtn = document.getElementById('refreshBtn');
const refreshDataBtn = document.getElementById('refreshDataBtn');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const toast = document.getElementById('toast');
const mobileBtn = document.getElementById('mobileBtn');
const settingsBtn = document.getElementById('settingsBtn');

// Initialize dashboard
async function initDashboard() {
    console.log(' Initializing ESP Dashboard...');
    
    if (handleInitialPlatformDirect()) {
        return;
    }

    // Set connection status with HEART
    updateConnectionStatus(true, "Terhubung ke server");
    
    // Load devices initially
    await loadDevices();
    
    // Setup event listeners
    setupEventListeners();
    
    // Start auto-refresh
    startAutoRefresh();
    
    console.log(' Dashboard initialized');
}

// Load devices from API
async function loadDevices() {
    try {
        if (isLoading) return;
        
        isLoading = true;
        console.log(' Loading devices from API...');
        
        const response = await fetch('/api/dashboard');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Process the encrypted data
            let devicesData = [];
            
            if (result.data && result.data.encrypted) {
                // Decrypt the data
                devicesData = decryptData(result.data);
                console.log(` Decrypted data for ${devicesData.length} devices`);
            } else {
                // Data is not encrypted (backward compatibility)
                devicesData = result.data || [];
                console.log(` Loaded ${devicesData.length} devices (unencrypted)`);
            }
            
            devices = devicesData;
            updateDeviceCount();
            renderCards();
            
            if (devices.length === 0) {
                emptyState.style.display = 'block';
            } else {
                emptyState.style.display = 'none';
            }
            
            showToast(`${devices.length} perangkat ditemukan`, "success");
            updateConnectionStatus(true, "Terhubung ke server");
        } else {
            throw new Error(result.message || 'Failed to load devices');
        }
    } catch (error) {
        console.error(' Error loading devices:', error);
        showToast("Gagal memuat data perangkat", "error");
        updateConnectionStatus(false, "Gagal terhubung");
    } finally {
        isLoading = false;
    }
}

// Fungsi baru untuk refresh global semua perangkat
async function refreshAllDevices() {
    try {
        // Cegah double click
        if (refreshBtn.disabled) return;
        
        // Disable tombol dan beri efek loading
        refreshBtn.disabled = true;
        refreshBtn.style.opacity = '0.6';
        refreshBtn.style.transform = 'rotate(180deg)';
        
        showToast("Menyegarkan semua perangkat...", "info");
        
        console.log(' Memanggil API refresh global...');
        
        const response = await fetch('/api/refresh-update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Tampilkan notifikasi sukses tanpa detail yang rumit
            console.log(' Refresh global berhasil:', result);
            
            // Tampilkan toast sukses sederhana
            showToast(` Refresh selesai (${result.summary?.total || 0} perangkat)`, "success");
            
            // Refresh halaman untuk mendapatkan data terbaru
            await loadDevices();
            
        } else {
            throw new Error(result.message || 'Gagal melakukan refresh global');
        }
    } catch (error) {
        console.error(' Error refreshing all devices:', error);
        showToast(" Gagal refresh, muat ulang data...", "warning");
        
        // Tetap refresh data meskipun API refresh gagal
        await loadDevices();
    } finally {
        // Enable kembali tombol
        refreshBtn.disabled = false;
        refreshBtn.style.opacity = '1';
        
        // Kembalikan rotasi setelah delay
        setTimeout(() => {
            refreshBtn.style.transform = 'rotate(0deg)';
        }, 500);
    }
}

// Decrypt data from server
function decryptData(encryptedData) {
    try {
        if (!encryptedData || !encryptedData.encrypted) {
            console.log(' No encrypted data found, returning empty array');
            return [];
        }
        
        // Simple base64 decode
        const decodedString = atob(encryptedData.encrypted);
        const parsedData = JSON.parse(decodedString);
        
        return parsedData.data || [];
    } catch (error) {
        console.error(' Error decrypting data:', error);
        showToast("Gagal mendekripsi data", "error");
        return [];
    }
}

// Render device cards
function renderCards() {
    // Clear existing cards
    const existingCards = cardsGrid.querySelectorAll('.card');
    existingCards.forEach(card => card.remove());
    
    // If no devices, show empty state
    if (devices.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    // Hide empty state
    emptyState.style.display = 'none';
    
    // Render each device card
    devices.forEach((device, index) => {
        const card = createDeviceCard(device, index);
        cardsGrid.appendChild(card);
    });
}

// Create a device card element
function createDeviceCard(device, index) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = device.deviceId;
    
    // Determine RSSI class based on value
    let rssiClass = 'rssi-weak';
    let rssiWidth = '30%';
    let rssiQuality = 'Lemah';
    
    if (device.rssi >= -50) {
        rssiClass = 'rssi-excellent';
        rssiWidth = '90%';
        rssiQuality = 'Sangat Baik';
    } else if (device.rssi >= -60) {
        rssiClass = 'rssi-good';
        rssiWidth = '70%';
        rssiQuality = 'Baik';
    } else if (device.rssi >= -70) {
        rssiClass = 'rssi-fair';
        rssiWidth = '50%';
        rssiQuality = 'Cukup';
    }
    
    card.innerHTML = `
        <div class="card-header">
            <div class="device-name">${device.customName || device.deviceId}</div>
            <div class="device-status">
                <div class="connection-status-badge">
                    <div class="status-dot ${device.status === 'online' ? 'status-online' : 'status-offline'}"></div>
                    <span>${device.status === 'online' ? 'Online' : 'Offline'}</span>
                </div>
            </div>
        </div>
        <div class="card-body">
            <div class="status-grid">
                <div class="status-item">
                    <span class="status-label">Status Koneksi</span>
                    <span class="status-value ${device.status === 'online' ? 'online' : 'offline'}">
                        ${device.status === 'online' ? 'Online' : 'Offline'}
                    </span>
                </div>
                <div class="status-item">
                    <span class="status-label">Status Perangkat</span>
                    <span class="status-value ${device.deviceStatus === 'on' ? 'on' : 'off'}">
                        ${device.deviceStatus === 'on' ? 'ON' : 'OFF'}
                    </span>
                </div>
                <div class="status-item">
                    <span class="status-label">Status Relay</span>
                    <span class="status-value ${device.relayState === 'on' ? 'relay-on' : 'relay-off'}">
                        ${device.relayState === 'on' ? 'ON' : 'OFF'}
                    </span>
                </div>
                <div class="status-item">
                    <span class="status-label">Sinyal RSSI</span>
                    <span class="status-value">
                        ${device.rssi} dBm
                    </span>
                </div>
            </div>
            
            <div class="device-info">
                <div class="info-row">
                    <span class="info-label">ID Perangkat:</span>
                    <span class="info-value">${device.deviceId}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Alamat IP:</span>
                    <span class="ip-address">${device.ipAddress || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">WiFi SSID:</span>
                    <span class="info-value">${device.wifiSSID || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Terakhir Update:</span>
                    <span class="info-value">${formatDate(device.lastUpdated)}</span>
                </div>
            </div>
            
            <div class="rssi-container">
                <div class="rssi-label">
                    <span>Kekuatan Sinyal (RSSI):</span>
                    <span class="rssi-value">${device.rssi} dBm (${rssiQuality})</span>
                </div>
                <div class="rssi-bar-container">
                    <div class="rssi-bar ${rssiClass}" style="width: ${rssiWidth}"></div>
                </div>
            </div>
            
            <div class="card-actions">
                <button class="action-btn edit-btn" title="Edit Perangkat" data-id="${device.deviceId}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn schedule-btn" title="Atur Jadwal" data-id="${device.deviceId}">
                    <i class="fas fa-calendar-alt"></i> Jadwal
                </button>
            </div>
            
            <div class="switch-container">
                <span class="switch-label">Kontrol Relay:</span>
                <label class="switch">
                    <input type="checkbox" ${device.relayState === 'on' ? 'checked' : ''} 
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

// Format date for display
function formatDate(dateString) {
    if (!dateString || dateString === 'N/A') return 'N/A';
    
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Baru saja';
        if (diffMins < 60) return `${diffMins} menit lalu`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} jam lalu`;
        
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
}

// Update device count
function updateDeviceCount() {
    deviceCount.textContent = devices.length;
}

// Update connection status display with HEART
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
    
    if (statusText) {
        statusText.textContent = message;
    }
}

// Control device relay
async function controlDeviceRelay(deviceId, action) {
    try {
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
            showToast(`Relay ${action === 'on' ? 'dinyalakan' : 'dimatikan'}`, "success");
            // Reload devices to update UI
            await loadDevices();
        } else {
            showToast(result.message || 'Gagal mengontrol relay', "error");
        }
    } catch (error) {
        console.error('Error controlling device:', error);
        showToast('Gagal mengontrol relay', "error");
    }
}

// Start auto-refresh
function startAutoRefresh() {
    // Refresh setiap 30 detik
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    autoRefreshInterval = setInterval(() => {
        if (!isLoading) {
            loadDevices();
        }
    }, 30000); // 30 detik
    
    console.log(' Auto-refresh started (30s interval)');
}

// Stop auto-refresh
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log(' Auto-refresh stopped');
    }
}

// Show toast notification
function showToast(message, type = "info") {
    const icon = type === 'success' ? 'fas fa-check-circle' : 
                type === 'error' ? 'fas fa-exclamation-circle' : 
                type === 'warning' ? 'fas fa-exclamation-triangle' :
                'fas fa-info-circle';
    
    toast.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;
    toast.className = `toast toast-${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Setup event listeners
function setupEventListeners() {
    // Refresh button (global refresh)
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshAllDevices();
        });
    }
    
    // Refresh data button (empty state)
    if (refreshDataBtn) {
        refreshDataBtn.addEventListener('click', () => {
            if (!isLoading) {
                loadDevices();
            }
        });
    }
    
    // Mobile button
    if (mobileBtn) {
        mobileBtn.addEventListener('click', function(e) {
            e.preventDefault();
            markDirectHandled();
            window.location.href = './mobile/index.html?directid=mobile&manual=1';
        });
    }
    
    // Settings button
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function(e) {
            window.location.href = 'settings.html';
        });
    }
    
    // Add device button
    if (addDeviceBtn) {
        addDeviceBtn.addEventListener('click', function(e) {
            window.location.href = 'add-device.html';
        });
    }
    
    // Delegate events for dynamic elements
    cardsGrid.addEventListener('click', (e) => {
        // Edit button
        if (e.target.closest('.edit-btn')) {
            const button = e.target.closest('.edit-btn');
            const deviceId = button.dataset.id;
            window.location.href = `card-edit.html?deviceid=${deviceId}`;
        }
        
        // Schedule button
        if (e.target.closest('.schedule-btn')) {
            const button = e.target.closest('.schedule-btn');
            const deviceId = button.dataset.id;
            window.location.href = `schedule.html?deviceid=${deviceId}`;
        }
        
        // Switch toggle (relay control)
        if (e.target.closest('.switch input')) {
            const checkbox = e.target.closest('.switch input');
            const deviceId = checkbox.dataset.id;
            const isOn = checkbox.checked;
            const action = isOn ? 'on' : 'off';
            
            controlDeviceRelay(deviceId, action);
        }
    });
    
    // Window before unload - cleanup
    window.addEventListener('beforeunload', function() {
        stopAutoRefresh();
    });
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard);

// Simulate connection test periodically
function testConnection() {
    fetch('/api/dashboard', { method: 'HEAD' })
        .then(() => {
            updateConnectionStatus(true, "Terhubung ke server");
        })
        .catch(() => {
            updateConnectionStatus(false, "Gagal terhubung");
        });
}

// Run connection test every 10 seconds
setInterval(testConnection, 10000);

// Add some button styles for the refresh button
const style = document.createElement('style');
style.textContent = `
    .btn-primary {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: var(--primary);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 1rem;
    }
    
    .btn-primary:hover {
        background: var(--primary-dark);
        transform: translateY(-2px);
    }
    
    .btn-primary:active {
        transform: translateY(0);
    }
    
    .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none !important;
    }
    
    .btn-primary i {
        font-size: 1.1rem;
    }
    
    /* Card Actions */
    .card-actions {
        display: flex;
        gap: 10px;
        margin: 1.5rem 0;
        padding-top: 1.5rem;
        border-top: 1px solid var(--gray-light);
    }
    .card-actions .action-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .edit-btn {
        background-color: var(--primary);
        color: white;
        flex: 1;
    }
    
    .edit-btn:hover {
        background-color: var(--primary-dark);
        transform: translateY(-2px);
    }
    
    .schedule-btn {
        background-color: var(--secondary);
        color: white;
        flex: 1;
    }
    
    .schedule-btn:hover {
        background-color: #5f0b9e;
        transform: translateY(-2px);
    }
    .card-actions .action-btn:active {
        transform: translateY(0);
    }
    .card-actions .action-btn i {
        font-size: 0.9rem;
    }

    /* Heart animation */
    @keyframes heartbeat {
        0% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.2); opacity: 1; }
        100% { transform: scale(1); opacity: 0.8; }
    }
    
    .status-indicator.connected {
        animation: heartbeat 1.8s ease-in-out infinite;
    }
    
    /* Refresh button styles */
    .action-btn.refresh {
        transition: transform 0.5s ease, opacity 0.3s ease;
    }
    
    .action-btn.refresh:disabled {
        cursor: wait;
        opacity: 0.6;
    }
/* Toast warning style */
    .toast-warning {
        background-color: var(--warning);
    }
`;
document.head.appendChild(style);


