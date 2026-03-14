// Global variables
let currentDeviceId = '';
let currentDeviceName = '';
let lastRestartTime = null;

// DOM Elements
const deviceTitle = document.getElementById('deviceTitle');
const deviceIdText = document.getElementById('deviceIdText');
const editNameBtn = document.getElementById('editNameBtn');
const infoButton = document.getElementById('infoButton');
const deleteButton = document.getElementById('deleteButton');

// New ESP Tools buttons
const previewCodeBtn = document.getElementById('previewCodeBtn');
const downloadCodeBtn = document.getElementById('downloadCodeBtn');
const downloadBinaryBtn = document.getElementById('downloadBinaryBtn');
const programEspBtn = document.getElementById('programEspBtn');

// RESTART ESP BUTTON
const restartEspBtn = document.getElementById('restartEspBtn');
const lastRestartTimeSpan = document.getElementById('lastRestartTime');

// Modals
const editNameModal = document.getElementById('editNameModal');
const infoModal = document.getElementById('infoModal');
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const successModal = document.getElementById('successModal');
const loadingModal = document.getElementById('loadingModal');

// Toast
const toast = document.getElementById('toast');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Get deviceId from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentDeviceId = urlParams.get('deviceid');
    
    if (!currentDeviceId) {
        showToast('ID Perangkat tidak ditemukan di URL', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    console.log('📱 Loading device:', currentDeviceId);
    await loadDeviceInfo();
    setupEventListeners();
    
    // Load last restart time from localStorage
    loadLastRestartTime();
    
    // ===== RESTART BUTTON SELALU AKTIF =====
    // Tombol restart selalu aktif, tidak peduli status online/offline
    enableRestartButton();
});

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
            
            // Update UI
            deviceTitle.textContent = `Edit Kartu: ${currentDeviceName}`;
            deviceTitle.style.color = '';
            deviceIdText.textContent = `ID: ${currentDeviceId}`;
            deviceIdText.style.color = '';
            
            // Set delete modal info
            document.getElementById('deleteDeviceId').textContent = currentDeviceId;
            document.getElementById('deleteDeviceName').textContent = currentDeviceName;
            
            console.log('✅ Device loaded:', currentDeviceName);
            
            // Aktifkan semua tombol
            enableAllButtons();
            
            // Hapus error message jika ada
            removeErrorMessage();
            
            showToast(`Perangkat "${currentDeviceName}" berhasil dimuat`, 'success');
            
        } else {
            throw new Error(result.error || 'Perangkat tidak ditemukan');
        }
        
    } catch (error) {
        console.error('❌ Error loading device:', error);
        
        // Tampilkan informasi error di UI
        deviceTitle.textContent = 'Perangkat Tidak Ditemukan';
        deviceTitle.style.color = 'var(--danger)';
        deviceIdText.textContent = `ID: ${currentDeviceId}`;
        deviceIdText.style.color = 'var(--danger)';
        
        // Nonaktifkan semua tombol
        disableAllButtons();
        
        // Tampilkan pesan error
        const errorMessage = error.message.includes('tidak ditemukan') 
            ? `Perangkat "${currentDeviceId}" tidak ditemukan di sistem.` 
            : `Gagal memuat perangkat: ${error.message}`;
        
        showToast(errorMessage, 'error');
        showErrorMessage(errorMessage);
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
            
            if (lastRestartTimeSpan) {
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
        
        if (lastRestartTimeSpan) {
            lastRestartTimeSpan.textContent = 'Baru saja';
        }
    } catch (error) {
        console.error('Error saving restart time:', error);
    }
}

// ===== RESTART BUTTON - SELALU AKTIF =====
// Enable restart button - style seperti tombol delete
function enableRestartButton() {
    if (restartEspBtn) {
        // Hapus semua class dan style yang membuat disabled
        restartEspBtn.classList.remove('disabled');
        restartEspBtn.classList.add('restart-button'); // pakai class khusus restart
        
        // Hapus inline style
        restartEspBtn.style.opacity = '';
        restartEspBtn.style.pointerEvents = '';
        
        // Update title
        restartEspBtn.title = 'Restart perangkat ESP-01S';
        
        // Update description - pakai warna normal seperti tombol lain
        const actionDesc = restartEspBtn.querySelector('.action-desc');
        if (actionDesc) {
            actionDesc.textContent = 'Restart perangkat ESP-01S secara remote';
            actionDesc.style.color = ''; // hapus warna merah
        }
        
        console.log('✅ Restart button enabled (always active)');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Device Management buttons
    if (editNameBtn) {
        editNameBtn.addEventListener('click', openEditNameModal);
    }
    
    if (infoButton) {
        infoButton.addEventListener('click', openInfoModal);
    }
    
    if (deleteButton) {
        deleteButton.addEventListener('click', openDeleteModal);
    }
    
    // ESP Tools buttons
    if (previewCodeBtn) {
        previewCodeBtn.addEventListener('click', () => openPreviewCode(currentDeviceId));
    }
    
    if (downloadCodeBtn) {
        downloadCodeBtn.addEventListener('click', () => downloadCodeSource(currentDeviceId));
    }
    
    if (downloadBinaryBtn) {
        downloadBinaryBtn.addEventListener('click', () => downloadBinaryFile(currentDeviceId));
    }
    
    if (programEspBtn) {
        programEspBtn.addEventListener('click', () => openProgramESP(currentDeviceId));
    }
    
    // ===== RESTART ESP BUTTON - LANGSUNG PANGGIL API =====
    if (restartEspBtn) {
        restartEspBtn.addEventListener('click', restartESP);
    }
    
    // Edit Name Modal
    const closeEditModal = document.getElementById('closeEditModal');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const saveNameBtn = document.getElementById('saveNameBtn');
    
    if (closeEditModal) closeEditModal.addEventListener('click', () => editNameModal.style.display = 'none');
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => editNameModal.style.display = 'none');
    if (saveNameBtn) saveNameBtn.addEventListener('click', saveName);
    
    // Info Modal
    const closeInfoModal = document.getElementById('closeInfoModal');
    const closeInfoBtn = document.getElementById('closeInfoBtn');
    
    if (closeInfoModal) closeInfoModal.addEventListener('click', () => infoModal.style.display = 'none');
    if (closeInfoBtn) closeInfoBtn.addEventListener('click', () => infoModal.style.display = 'none');
    
    // Delete Confirm Modal
    const closeDeleteModal = document.getElementById('closeDeleteModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    
    if (closeDeleteModal) closeDeleteModal.addEventListener('click', () => deleteConfirmModal.style.display = 'none');
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => deleteConfirmModal.style.display = 'none');
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', confirmDelete);
    
    // Success Modal
    const okSuccessBtn = document.getElementById('okSuccessBtn');
    if (okSuccessBtn) {
        okSuccessBtn.addEventListener('click', () => {
            successModal.style.display = 'none';
            window.location.href = 'index.html';
        });
    }
    
    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === editNameModal) editNameModal.style.display = 'none';
        if (e.target === infoModal) infoModal.style.display = 'none';
        if (e.target === deleteConfirmModal) deleteConfirmModal.style.display = 'none';
        if (e.target === successModal) successModal.style.display = 'none';
        if (e.target === loadingModal) loadingModal.style.display = 'none';
    });
}

// ====================== RESTART ESP FUNCTIONS ======================

// Fungsi utama restart ESP - LANGSUNG KIRIM PERINTAH, TANPA CEK STATUS
async function restartESP() {
    // Tampilkan loading modal
    showLoading('Merestart ESP', `Mengirim perintah restart ke ${currentDeviceName}...`);
    
    try {
        console.log(`🔄 Sending restart command to device: ${currentDeviceId}`);
        
        // Call API esp-restart
        const response = await fetch(`/api/esp-restart/${currentDeviceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        const result = await response.json();
        
        // Sembunyikan loading
        hideLoading();
        
        if (result.success) {
            // Save restart time
            saveLastRestartTime();
            
            // Tampilkan modal sukses (bukan toast, tapi modal seperti delete success)
            showRestartSuccessModal(result);
            
        } else {
            // Tampilkan modal gagal
            showRestartFailedModal(result);
        }
        
    } catch (error) {
        console.error('❌ Error restarting ESP:', error);
        hideLoading();
        
        // Tampilkan modal gagal dengan error message
        showRestartFailedModal({
            message: error.message,
            error: error.message
        });
    }
}

// ===== MODAL UNTUK HASIL RESTART =====
// Fungsi untuk menampilkan modal sukses restart
function showRestartSuccessModal(result) {
    // Cek apakah modal sudah ada, jika belum buat
    let restartResultModal = document.getElementById('restartResultModal');
    
    if (!restartResultModal) {
        // Buat modal element
        restartResultModal = document.createElement('div');
        restartResultModal.id = 'restartResultModal';
        restartResultModal.className = 'modal';
        
        // Isi modal
        restartResultModal.innerHTML = `
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header" style="background: linear-gradient(135deg, #38b000, #2a9d8f); color: white;">
                    <h3 style="color: white; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-check-circle" style="font-size: 1.4rem;"></i>
                        Restart Berhasil!
                    </h3>
                    <button class="modal-close" id="closeRestartResultModal" style="color: white;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 2rem 1.5rem; text-align: center;">
                    <i class="fas fa-power-off" style="font-size: 4rem; color: #38b000; margin-bottom: 1rem;"></i>
                    <h4 style="margin-bottom: 1rem; font-size: 1.3rem;">Perintah Restart Terkirim</h4>
                    <div style="background: #f8f9fa; border-radius: 10px; padding: 1rem; text-align: left; margin-top: 1rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #6c757d;">Perangkat:</span>
                            <span style="font-weight: 600; color: #212529;">${currentDeviceName}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #6c757d;">ID:</span>
                            <span style="font-weight: 600; color: #212529;">${currentDeviceId}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #6c757d;">Alamat IP:</span>
                            <span style="font-weight: 600; color: #212529;">${result.espIp || 'Tidak diketahui'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #6c757d;">Waktu:</span>
                            <span style="font-weight: 600; color: #212529;">${new Date().toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                    <p style="margin-top: 1.5rem; color: #6c757d; font-size: 0.9rem;">
                        ESP akan restart dalam beberapa detik.
                    </p>
                </div>
                <div class="modal-footer" style="justify-content: center;">
                    <button class="btn btn-success" id="okRestartResultBtn" style="width: 100%; padding: 12px;">
                        <i class="fas fa-check"></i> OK, Saya Mengerti
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(restartResultModal);
        
        // Setup event listeners untuk modal baru
        setTimeout(() => {
            const closeBtn = document.getElementById('closeRestartResultModal');
            const okBtn = document.getElementById('okRestartResultBtn');
            
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    restartResultModal.style.display = 'none';
                });
            }
            
            if (okBtn) {
                okBtn.addEventListener('click', () => {
                    restartResultModal.style.display = 'none';
                });
            }
            
            // Close on outside click
            restartResultModal.addEventListener('click', (e) => {
                if (e.target === restartResultModal) {
                    restartResultModal.style.display = 'none';
                }
            });
        }, 100);
    } else {
        // Update konten modal yang sudah ada
        const modalContent = restartResultModal.querySelector('.modal-content');
        if (modalContent) {
            // Update header
            const header = modalContent.querySelector('.modal-header');
            if (header) {
                header.style.background = 'linear-gradient(135deg, #38b000, #2a9d8f)';
                header.querySelector('h3').innerHTML = '<i class="fas fa-check-circle"></i> Restart Berhasil!';
            }
            
            // Update body
            const body = modalContent.querySelector('.modal-body');
            if (body) {
                body.innerHTML = `
                    <i class="fas fa-power-off" style="font-size: 4rem; color: #38b000; margin-bottom: 1rem;"></i>
                    <h4 style="margin-bottom: 1rem; font-size: 1.3rem;">Perintah Restart Terkirim</h4>
                    <div style="background: #f8f9fa; border-radius: 10px; padding: 1rem; text-align: left; margin-top: 1rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #6c757d;">Perangkat:</span>
                            <span style="font-weight: 600; color: #212529;">${currentDeviceName}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #6c757d;">ID:</span>
                            <span style="font-weight: 600; color: #212529;">${currentDeviceId}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #6c757d;">Alamat IP:</span>
                            <span style="font-weight: 600; color: #212529;">${result.espIp || 'Tidak diketahui'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #6c757d;">Waktu:</span>
                            <span style="font-weight: 600; color: #212529;">${new Date().toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                    <p style="margin-top: 1.5rem; color: #6c757d; font-size: 0.9rem;">
                        ESP akan restart dalam beberapa detik.
                    </p>
                `;
            }
            
            // Update footer button
            const footer = modalContent.querySelector('.modal-footer');
            if (footer) {
                footer.innerHTML = `
                    <button class="btn btn-success" id="okRestartResultBtn" style="width: 100%; padding: 12px;">
                        <i class="fas fa-check"></i> OK, Saya Mengerti
                    </button>
                `;
            }
        }
    }
    
    // Tampilkan modal
    restartResultModal.style.display = 'flex';
}

// Fungsi untuk menampilkan modal gagal restart
function showRestartFailedModal(result) {
    // Cek apakah modal sudah ada, jika belum buat
    let restartResultModal = document.getElementById('restartResultModal');
    
    if (!restartResultModal) {
        // Buat modal element
        restartResultModal = document.createElement('div');
        restartResultModal.id = 'restartResultModal';
        restartResultModal.className = 'modal';
        
        // Isi modal
        restartResultModal.innerHTML = `
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header" style="background: linear-gradient(135deg, #e63946, #d00000); color: white;">
                    <h3 style="color: white; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 1.4rem;"></i>
                        Restart Gagal!
                    </h3>
                    <button class="modal-close" id="closeRestartResultModal" style="color: white;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 2rem 1.5rem; text-align: center;">
                    <i class="fas fa-exclamation-circle" style="font-size: 4rem; color: #e63946; margin-bottom: 1rem;"></i>
                    <h4 style="margin-bottom: 1rem; font-size: 1.3rem;">Tidak Dapat Merestart ESP</h4>
                    <div style="background: #fff1f0; border-radius: 10px; padding: 1rem; text-align: left; margin-top: 1rem; border: 1px solid #ffcccb;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #6c757d;">Perangkat:</span>
                            <span style="font-weight: 600; color: #212529;">${currentDeviceName}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #6c757d;">ID:</span>
                            <span style="font-weight: 600; color: #212529;">${currentDeviceId}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #6c757d;">Penyebab:</span>
                            <span style="font-weight: 600; color: #e63946;">${getErrorMessage(result)}</span>
                        </div>
                    </div>
                    <p style="margin-top: 1.5rem; color: #6c757d; font-size: 0.9rem;">
                        Pastikan ESP dalam keadaan online dan terhubung ke jaringan.
                    </p>
                </div>
                <div class="modal-footer" style="justify-content: center;">
                    <button class="btn btn-danger" id="okRestartResultBtn" style="width: 100%; padding: 12px;">
                        <i class="fas fa-times"></i> Tutup
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(restartResultModal);
        
        // Setup event listeners untuk modal baru
        setTimeout(() => {
            const closeBtn = document.getElementById('closeRestartResultModal');
            const okBtn = document.getElementById('okRestartResultBtn');
            
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    restartResultModal.style.display = 'none';
                });
            }
            
            if (okBtn) {
                okBtn.addEventListener('click', () => {
                    restartResultModal.style.display = 'none';
                });
            }
            
            // Close on outside click
            restartResultModal.addEventListener('click', (e) => {
                if (e.target === restartResultModal) {
                    restartResultModal.style.display = 'none';
                }
            });
        }, 100);
    } else {
        // Update konten modal yang sudah ada
        const modalContent = restartResultModal.querySelector('.modal-content');
        if (modalContent) {
            // Update header
            const header = modalContent.querySelector('.modal-header');
            if (header) {
                header.style.background = 'linear-gradient(135deg, #e63946, #d00000)';
                header.querySelector('h3').innerHTML = '<i class="fas fa-exclamation-triangle"></i> Restart Gagal!';
            }
            
            // Update body
            const body = modalContent.querySelector('.modal-body');
            if (body) {
                body.innerHTML = `
                    <i class="fas fa-exclamation-circle" style="font-size: 4rem; color: #e63946; margin-bottom: 1rem;"></i>
                    <h4 style="margin-bottom: 1rem; font-size: 1.3rem;">Tidak Dapat Merestart ESP</h4>
                    <div style="background: #fff1f0; border-radius: 10px; padding: 1rem; text-align: left; margin-top: 1rem; border: 1px solid #ffcccb;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #6c757d;">Perangkat:</span>
                            <span style="font-weight: 600; color: #212529;">${currentDeviceName}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #6c757d;">ID:</span>
                            <span style="font-weight: 600; color: #212529;">${currentDeviceId}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #6c757d;">Penyebab:</span>
                            <span style="font-weight: 600; color: #e63946;">${getErrorMessage(result)}</span>
                        </div>
                    </div>
                    <p style="margin-top: 1.5rem; color: #6c757d; font-size: 0.9rem;">
                        Pastikan ESP dalam keadaan online dan terhubung ke jaringan.
                    </p>
                `;
            }
            
            // Update footer button
            const footer = modalContent.querySelector('.modal-footer');
            if (footer) {
                footer.innerHTML = `
                    <button class="btn btn-danger" id="okRestartResultBtn" style="width: 100%; padding: 12px;">
                        <i class="fas fa-times"></i> Tutup
                    </button>
                `;
            }
        }
    }
    
    // Tampilkan modal
    restartResultModal.style.display = 'flex';
}

// Helper untuk mendapatkan pesan error yang user-friendly
function getErrorMessage(result) {
    const message = result.message || result.error || 'Unknown error';
    
    if (message.includes('ECONNREFUSED') || message.includes('refused')) {
        return 'ESP offline / tidak merespon';
    } else if (message.includes('timeout')) {
        return 'Timeout (ESP tidak merespon)';
    } else if (message.includes('ENOTFOUND')) {
        return 'Alamat IP tidak valid';
    } else if (message.includes('404')) {
        return 'Endpoint restart tidak ditemukan';
    } else if (message.includes('400')) {
        return 'Bad request / ID tidak valid';
    }
    
    // Potong pesan jika terlalu panjang
    if (message.length > 50) {
        return message.substring(0, 50) + '...';
    }
    
    return message;
}

// ====================== ESP TOOLS FUNCTIONS ======================

// Open Preview Code - TETAP DI TAB YANG SAMA
async function openPreviewCode(deviceId) {
    if (!deviceId || deviceId === 'undefined') {
        showToast('ID Perangkat tidak valid', 'error');
        return;
    }
    
    showLoading('Membuka Preview Kode', 'Sedang memuat kode sumber...');
    
    try {
        // Buka di tab yang sama
        window.location.href = `code-preview.html?deviceId=${deviceId}`;
        
    } catch (error) {
        console.error('Error opening code preview:', error);
        hideLoading();
        showToast(`Gagal membuka preview: ${error.message}`, 'error');
    }
}

// Download Code Source
async function downloadCodeSource(deviceId) {
    if (!deviceId || deviceId === 'undefined') {
        showToast('ID Perangkat tidak valid', 'error');
        return;
    }
    
    showLoading('Mengunduh Kode Sumber', 'Sedang mempersiapkan file .ino...');
    
    try {
        const response = await fetch(`/api/download-code/${deviceId}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal mengunduh kode sumber');
        }
        
        // Get the blob data
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${deviceId}.ino`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        hideLoading();
        showToast('Kode sumber berhasil diunduh!', 'success');
        
    } catch (error) {
        console.error('Error downloading code:', error);
        hideLoading();
        showToast(`Gagal mengunduh: ${error.message}`, 'error');
    }
}

// Download Binary File
async function downloadBinaryFile(deviceId) {
    if (!deviceId || deviceId === 'undefined') {
        showToast('ID Perangkat tidak valid', 'error');
        return;
    }
    
    showLoading('Mengunduh Binary', 'Sedang mempersiapkan file .bin...');
    
    try {
        const response = await fetch(`/api/download-binary/${deviceId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('File binary tidak ditemukan. Silakan kompilasi terlebih dahulu.');
            }
            throw new Error(`HTTP ${response.status}: Gagal mengunduh binary`);
        }
        
        // Get the blob data
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${deviceId}.bin`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        hideLoading();
        showToast('File binary berhasil diunduh!', 'success');
        
    } catch (error) {
        console.error('Error downloading binary:', error);
        hideLoading();
        showToast(`Gagal mengunduh binary: ${error.message}`, 'error');
    }
}

// Open Program ESP - TETAP DI TAB YANG SAMA
async function openProgramESP(deviceId) {
    if (!deviceId || deviceId === 'undefined') {
        showToast('ID Perangkat tidak valid', 'error');
        return;
    }
    
    showLoading('Membuka Web Flasher', 'Sedang memuat ESP flasher...');
    
    try {
        // Buka di tab yang sama
        window.location.href = `esp-flasher.html?deviceId=${deviceId}`;
        
    } catch (error) {
        console.error('Error opening ESP flasher:', error);
        hideLoading();
        showToast(`Gagal membuka flasher: ${error.message}`, 'error');
    }
}

// ====================== ORIGINAL FUNCTIONS ======================

// Open Edit Name Modal
async function openEditNameModal() {
    try {
        if (!currentDeviceName || deviceTitle.textContent.includes('Tidak Ditemukan')) {
            showToast('Perangkat tidak ditemukan. Silakan refresh halaman.', 'error');
            return;
        }
        
        const currentNameInput = document.getElementById('currentName');
        const newNameInput = document.getElementById('newName');
        
        if (!currentNameInput || !newNameInput) {
            showToast('Elemen modal tidak ditemukan', 'error');
            return;
        }
        
        currentNameInput.value = currentDeviceName;
        newNameInput.value = '';
        
        editNameModal.style.display = 'flex';
        setTimeout(() => {
            newNameInput.focus();
        }, 100);
        
    } catch (error) {
        console.error('Error opening edit modal:', error);
        showToast('Gagal membuka editor nama', 'error');
    }
}

// Save Name
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
    
    try {
        const saveBtn = document.getElementById('saveNameBtn');
        if (!saveBtn) return;
        
        saveBtn.innerHTML = '<span class="loading"></span> Menyimpan...';
        saveBtn.disabled = true;
        
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
            
            deviceTitle.textContent = `Edit Kartu: ${currentDeviceName}`;
            document.getElementById('deleteDeviceName').textContent = currentDeviceName;
            
            editNameModal.style.display = 'none';
            
            showToast(`Nama berhasil diubah menjadi: ${newName}`, 'success');
            
        } else {
            throw new Error(result.error || 'Gagal mengubah nama');
        }
        
    } catch (error) {
        console.error('Error saving name:', error);
        
        let userMessage = 'Gagal mengubah nama. ';
        if (error.message.includes('tidak ditemukan')) {
            userMessage = 'Perangkat tidak ditemukan. Mungkin sudah dihapus.';
        } else if (error.message.includes('Network')) {
            userMessage = 'Masalah koneksi jaringan.';
        } else {
            userMessage += error.message;
        }
        
        showToast(userMessage, 'error');
    } finally {
        const saveBtn = document.getElementById('saveNameBtn');
        if (saveBtn) {
            saveBtn.innerHTML = 'Simpan';
            saveBtn.disabled = false;
        }
    }
}

// Open Info Modal
async function openInfoModal() {
    try {
        if (!currentDeviceName || deviceTitle.textContent.includes('Tidak Ditemukan')) {
            showToast('Perangkat tidak ditemukan', 'error');
            return;
        }
        
        const infoDisplay = document.getElementById('infoDisplay');
        if (!infoDisplay) return;
        
        infoDisplay.innerHTML = `
            <div class="info-item">
                <span class="info-label">Memuat data...</span>
                <span class="info-value">
                    <i class="fas fa-spinner fa-spin"></i>
                </span>
            </div>
        `;
        
        infoModal.style.display = 'flex';
        
        const response = await fetch(`/api/created-info/${currentDeviceId}`, {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            const data = result.data;
            
            const formatDate = (dateString) => {
                if (!dateString || dateString === 'N/A') return 'N/A';
                try {
                    const date = new Date(dateString);
                    return date.toLocaleString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                } catch (error) {
                    return dateString;
                }
            };
            
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
            
            addStatusStyles();
            
        } else {
            throw new Error(result.error || 'Gagal memuat info');
        }
        
    } catch (error) {
        console.error('Error loading info:', error);
        const infoDisplay = document.getElementById('infoDisplay');
        if (infoDisplay) {
            infoDisplay.innerHTML = `
                <div class="info-item">
                    <span class="info-label" style="color: var(--danger);">
                        <i class="fas fa-exclamation-triangle"></i> Error:
                    </span>
                    <span class="info-value">${error.message}</span>
                </div>
            `;
        }
    }
}

// Open Delete Modal
function openDeleteModal() {
    try {
        if (!currentDeviceName || deviceTitle.textContent.includes('Tidak Ditemukan')) {
            showToast('Perangkat tidak ditemukan', 'error');
            return;
        }
        
        document.getElementById('deleteDeviceId').textContent = currentDeviceId;
        document.getElementById('deleteDeviceName').textContent = currentDeviceName;
        
        deleteConfirmModal.style.display = 'flex';
        
    } catch (error) {
        console.error('Error opening delete modal:', error);
        showToast('Gagal membuka konfirmasi hapus', 'error');
    }
}

// Confirm Delete
async function confirmDelete() {
    try {
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        if (!deleteBtn) return;
        
        deleteBtn.innerHTML = '<span class="loading"></span> Menghapus...';
        deleteBtn.disabled = true;
        
        const response = await fetch(`/api/delete-device/${currentDeviceId}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            deleteConfirmModal.style.display = 'none';
            successModal.style.display = 'flex';
            
            console.log('✅ Device deleted:', currentDeviceId);
            
            deviceTitle.textContent = 'Perangkat Telah Dihapus';
            deviceTitle.style.color = 'var(--danger)';
            deviceIdText.textContent = `ID: ${currentDeviceId} (Telah dihapus)`;
            
            disableAllButtons();
            
        } else {
            throw new Error(result.error || 'Gagal menghapus perangkat');
        }
        
    } catch (error) {
        console.error('Error deleting device:', error);
        
        let errorMessage = `Gagal menghapus perangkat: ${error.message}`;
        if (error.message.includes('404') || error.message.includes('tidak ditemukan')) {
            errorMessage = `Perangkat "${currentDeviceId}" tidak ditemukan. Mungkin sudah dihapus sebelumnya.`;
        }
        
        showToast(errorMessage, 'error');
        
    } finally {
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        if (deleteBtn) {
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Ya, Hapus';
            deleteBtn.disabled = false;
        }
    }
}

// ====================== HELPER FUNCTIONS ======================

function showToast(message, type = "info") {
    if (!toast) return;
    
    const icon = type === 'success' ? 'fas fa-check-circle' : 
                type === 'error' ? 'fas fa-exclamation-circle' : 
                'fas fa-info-circle';
    
    const backgroundColor = type === 'success' ? 'var(--success)' :
                          type === 'error' ? 'var(--danger)' :
                          'var(--primary)';
    
    toast.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;
    toast.style.backgroundColor = backgroundColor;
    toast.className = `toast show`;
    
    setTimeout(() => {
        if (toast) {
            toast.classList.remove('show');
        }
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

function showErrorMessage(message) {
    const cardHeader = document.querySelector('.card-header');
    if (!cardHeader) return;
    
    removeErrorMessage();
    
    const errorMsg = document.createElement('div');
    errorMsg.className = 'error-message';
    errorMsg.style.cssText = `
        color: var(--danger);
        margin-top: 15px;
        font-size: 0.9rem;
        padding: 12px;
        background-color: rgba(230, 57, 70, 0.1);
        border-radius: 8px;
        border: 1px solid rgba(230, 57, 70, 0.3);
        line-height: 1.5;
    `;
    
    errorMsg.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 10px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 1.2rem; margin-top: 2px;"></i>
            <div>
                <strong style="display: block; margin-bottom: 5px;">${message}</strong>
                <small style="opacity: 0.8;">
                    ID: <code>${currentDeviceId}</code><br>
                    Pastikan perangkat telah ditambahkan ke sistem.
                </small>
            </div>
        </div>
        <div style="margin-top: 10px; display: flex; gap: 10px;">
            <button onclick="window.location.href='index.html'" style="
                padding: 6px 12px;
                background: var(--primary);
                color: white;
                border: none;
                border-radius: 4px;
                font-size: 0.8rem;
                cursor: pointer;
            ">
                <i class="fas fa-arrow-left"></i> Kembali ke Dashboard
            </button>
            <button onclick="window.location.reload()" style="
                padding: 6px 12px;
                background: var(--gray-light);
                color: var(--dark);
                border: none;
                border-radius: 4px;
                font-size: 0.8rem;
                cursor: pointer;
            ">
                <i class="fas fa-sync-alt"></i> Refresh Halaman
            </button>
        </div>
    `;
    
    cardHeader.appendChild(errorMsg);
}

function removeErrorMessage() {
    const errorMsg = document.querySelector('.error-message');
    if (errorMsg) {
        errorMsg.remove();
    }
}

function addStatusStyles() {
    if (!document.getElementById('status-styles')) {
        const style = document.createElement('style');
        style.id = 'status-styles';
        style.textContent = `
            .online-status {
                color: var(--success);
                font-weight: bold;
            }
            .offline-status {
                color: var(--danger);
                font-weight: bold;
            }
            .loading {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 3px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                border-top-color: white;
                animation: spin 1s ease-in-out infinite;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            .fa-spinner {
                animation: spin 1s linear infinite;
            }
        `;
        document.head.appendChild(style);
    }
}

function enableAllButtons() {
    const buttons = [
        'editNameBtn', 'infoButton', 'deleteButton',
        'previewCodeBtn', 'downloadCodeBtn', 'downloadBinaryBtn', 'programEspBtn'
    ];
    
    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
            btn.classList.remove('disabled');
        }
    });
}

function disableAllButtons() {
    const buttons = [
        'editNameBtn', 'infoButton', 'deleteButton',
        'previewCodeBtn', 'downloadCodeBtn', 'downloadBinaryBtn', 'programEspBtn',
        'restartEspBtn'
    ];
    
    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
            btn.classList.add('disabled');
        }
    });
}

// Make functions available globally
window.loadDeviceInfo = loadDeviceInfo;