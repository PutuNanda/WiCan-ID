// card-edit-relay.js - Handle reverse logic relay feature

// ============================================
// VARIABLES
// ============================================
let currentReverseLogic = false;

// DOM Elements untuk reverse logic
const reverseLogicBtn = document.getElementById('reverseLogicBtn');
const reverseLogicStatus = document.getElementById('reverseLogicStatus');

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Relay Reverse module loaded');
    
    // Tunggu sebentar untuk memastikan card-edit.js sudah load device info
    setTimeout(() => {
        if (typeof window.currentDeviceId !== 'undefined' && window.currentDeviceId) {
            console.log(`✅ Relay Reverse module using device: ${window.currentDeviceId}`);
            loadReverseLogicConfig();
        } else {
            console.log('⏳ Waiting for device info...');
            setTimeout(checkDeviceInfo, 1000);
        }
    }, 500);
    
    // Setup event listener untuk tombol
    if (reverseLogicBtn) {
        reverseLogicBtn.addEventListener('click', openReverseLogicModal);
    }
});

// Fungsi untuk mengecek device info
function checkDeviceInfo() {
    if (typeof window.currentDeviceId !== 'undefined' && window.currentDeviceId) {
        console.log(`✅ Device info now available: ${window.currentDeviceId}`);
        loadReverseLogicConfig();
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        const deviceIdFromUrl = urlParams.get('deviceid');
        
        if (deviceIdFromUrl) {
            console.log(`📝 Using deviceId from URL: ${deviceIdFromUrl}`);
            window.currentDeviceId = deviceIdFromUrl;
            loadReverseLogicConfig();
        }
    }
}

// ============================================
// LOAD CONFIG FROM API
// ============================================
async function loadReverseLogicConfig() {
    const deviceId = window.currentDeviceId;
    
    if (!deviceId) {
        console.error('❌ No deviceId available');
        return;
    }
    
    try {
        console.log(`🔍 Loading reverse logic config for: ${deviceId}`);
        
        const response = await fetch(`/api/relay-reverse/${deviceId}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        
        if (result.success) {
            currentReverseLogic = result.reverseLogic || false;
            updateReverseLogicUI();
            console.log(`✅ Reverse logic: ${currentReverseLogic ? 'ENABLED' : 'DISABLED'}`);
        } else {
            throw new Error(result.error || 'Failed to load');
        }
        
    } catch (error) {
        console.error('❌ Error loading reverse logic:', error);
        currentReverseLogic = false;
        updateReverseLogicUI();
    }
}

// Update UI berdasarkan currentReverseLogic
function updateReverseLogicUI() {
    if (!reverseLogicStatus) return;
    
    reverseLogicStatus.innerHTML = currentReverseLogic 
        ? '<span class="badge-active">AKTIF</span>' 
        : '<span class="badge-inactive">NONAKTIF</span>';
}

// ============================================
// OPEN SIMPLE MODAL
// ============================================
function openReverseLogicModal() {
    const deviceId = window.currentDeviceId;
    const deviceName = window.currentDeviceName || deviceId;
    
    if (!deviceId) {
        if (window.showToast) window.showToast('ID Perangkat tidak ditemukan', 'error');
        return;
    }
    
    let modal = document.getElementById('reverseLogicModal');
    
    if (!modal) {
        createSimpleReverseModal();
        modal = document.getElementById('reverseLogicModal');
    }
    
    // Update konten modal dengan nilai terbaru
    updateSimpleModalContent(deviceId, deviceName);
    
    // Tampilkan modal
    modal.style.display = 'flex';
}

// Buat modal SIMPLE dan RESPONSIF
function createSimpleReverseModal() {
    const modalHTML = `
        <div class="modal" id="reverseLogicModal">
            <div class="modal-content" style="max-width: 420px; margin: 20px;">
                <div class="modal-header" style="background: linear-gradient(135deg, #7209b7, #b5179e); padding: 1rem 1.5rem;">
                    <h3 style="color: white; display: flex; align-items: center; gap: 8px; font-size: 1.2rem; margin: 0;">
                        <i class="fas fa-random"></i>
                        Balik Logika Relay
                    </h3>
                    <button class="modal-close" id="closeReverseModal" style="color: white;">×</button>
                </div>
                
                <div class="modal-body" style="padding: 1.5rem;">
                    <!-- Info Perangkat Ringkas -->
                    <div style="background: #f8f9fa; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; font-size: 0.9rem;">
                        <span><strong>Perangkat:</strong> <span id="modalDeviceName" style="color: #6c757d;">${window.currentDeviceName || ''}</span></span>
                        <span><strong>ID:</strong> <span id="modalDeviceId" style="color: #6c757d;">${window.currentDeviceId || ''}</span></span>
                    </div>
                    
                    <!-- Pengaturan Sederhana -->
                    <div style="background: #f0f3f8; border-radius: 10px; padding: 1.25rem; margin-bottom: 1.25rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                            <span style="font-weight: 600; color: #212529;">Status Saat Ini:</span>
                            <span id="modalReverseStatus" class="badge-inactive">NONAKTIF</span>
                        </div>
                        
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <span style="font-weight: 600; color: #212529;">Aktifkan Reverse:</span>
                            <label class="switch" style="margin: 0;">
                                <input type="checkbox" id="modalReverseCheckbox">
                                <span class="slider round"></span>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Info Singkat - DIPERBAIKI -->
                    <div style="background: #e7f3ff; border-radius: 8px; padding: 0.75rem 1rem; border-left: 3px solid #4361ee; font-size: 0.85rem;">
                        <div style="display: flex; gap: 8px;">
                            <i class="fas fa-info-circle" style="color: #4361ee; font-size: 1rem; margin-top: 2px;"></i>
                            <div>
                                <span style="font-weight: 600; color: #212529; display: block; margin-bottom: 4px;">Cara Kerja:</span>
                                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                                    <span><strong>NONAKTIF:</strong> ON→ON, OFF→OFF</span>
                                    <span><strong>AKTIF:</strong> ON→OFF, OFF→ON</span>
                                </div>
                                <p style="margin-top: 4px; color: #6c757d; font-size: 0.8rem;">Untuk relay Active LOW.</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer" style="padding: 1rem 1.5rem; gap: 8px;">
                    <button class="btn btn-secondary" id="cancelReverseBtn" style="flex: 1;">
                        <i class="fas fa-times"></i> Batal
                    </button>
                    <button class="btn btn-primary" id="saveReverseBtn" style="flex: 2; background: linear-gradient(135deg, #7209b7, #b5179e);">
                        <i class="fas fa-save"></i> Simpan
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Setup event listeners
    setTimeout(() => {
        const modal = document.getElementById('reverseLogicModal');
        const closeBtn = document.getElementById('closeReverseModal');
        const cancelBtn = document.getElementById('cancelReverseBtn');
        const saveBtn = document.getElementById('saveReverseBtn');
        const checkbox = document.getElementById('modalReverseCheckbox');
        
        if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
        if (cancelBtn) cancelBtn.addEventListener('click', () => modal.style.display = 'none');
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const newValue = checkbox ? checkbox.checked : false;
                saveReverseLogicConfig(newValue);
            });
        }
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }, 100);
}

// Update konten modal
function updateSimpleModalContent(deviceId, deviceName) {
    const modal = document.getElementById('reverseLogicModal');
    if (!modal) return;
    
    const nameSpan = document.getElementById('modalDeviceName');
    const idSpan = document.getElementById('modalDeviceId');
    const statusSpan = document.getElementById('modalReverseStatus');
    const checkbox = document.getElementById('modalReverseCheckbox');
    
    if (nameSpan) nameSpan.textContent = deviceName;
    if (idSpan) idSpan.textContent = deviceId;
    
    if (statusSpan) {
        statusSpan.textContent = currentReverseLogic ? 'AKTIF' : 'NONAKTIF';
        statusSpan.className = currentReverseLogic ? 'badge-active' : 'badge-inactive';
    }
    
    if (checkbox) checkbox.checked = currentReverseLogic;
}

// ============================================
// SAVE CONFIG TO API
// ============================================
async function saveReverseLogicConfig(newValue) {
    const deviceId = window.currentDeviceId;
    
    if (!deviceId) {
        if (window.showToast) window.showToast('ID Perangkat tidak ditemukan', 'error');
        return;
    }
    
    const saveBtn = document.getElementById('saveReverseBtn');
    const originalText = saveBtn.innerHTML;
    
    saveBtn.innerHTML = '<span class="loading"></span> Menyimpan...';
    saveBtn.disabled = true;
    
    try {
        console.log(`💾 Saving reverse logic: ${newValue ? 'ENABLED' : 'DISABLED'}`);
        
        const response = await fetch(`/api/relay-reverse/${deviceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ reverseLogic: newValue })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentReverseLogic = newValue;
            updateReverseLogicUI();
            
            const modal = document.getElementById('reverseLogicModal');
            if (modal) modal.style.display = 'none';
            
            if (window.showToast) {
                window.showToast(`Reverse logic ${newValue ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
            }
            
            console.log('✅ Reverse logic updated');
            
        } else {
            throw new Error(result.error || result.message || 'Failed to save');
        }
        
    } catch (error) {
        console.error('❌ Error saving:', error);
        if (window.showToast) {
            window.showToast(`Gagal menyimpan: ${error.message}`, 'error');
        }
        
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// ============================================
// STYLES (Switch dan Badge)
// ============================================
(function addReverseLogicStyles() {
    if (document.getElementById('reverse-logic-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'reverse-logic-styles';
    style.textContent = `
        /* Tombol Reverse */
        .reverse-button {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 1rem 1.5rem;
            background: linear-gradient(145deg, #7209b7, #b5179e);
            border: none;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: left;
            margin: 1rem 0;
            color: white;
            box-shadow: 0 4px 12px rgba(114, 9, 183, 0.2);
        }
        
        .reverse-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(114, 9, 183, 0.3);
            background: linear-gradient(145deg, #8a2be2, #c51cb8);
        }
        
        .reverse-button i:first-child {
            font-size: 1.2rem;
            color: white;
            width: 24px;
        }
        
        .reverse-button .action-content {
            flex: 1;
            color: white;
        }
        
        .reverse-button .action-title {
            font-weight: 600;
            margin-bottom: 0.25rem;
            color: white;
        }
        
        .reverse-button .action-desc {
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.9);
        }
        
        /* Status Badge */
        .badge-active, .badge-inactive {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            color: white;
        }
        
        .badge-active {
            background: linear-gradient(135deg, #38b000, #2a9d8f);
        }
        
        .badge-inactive {
            background: linear-gradient(135deg, #6c757d, #495057);
        }
        
        /* Switch Toggle */
        .switch {
            position: relative;
            display: inline-block;
            width: 52px;
            height: 26px;
        }
        
        .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .3s;
            border-radius: 34px;
        }
        
        .slider:before {
            position: absolute;
            content: "";
            height: 20px;
            width: 20px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .3s;
            border-radius: 50%;
        }
        
        input:checked + .slider {
            background: linear-gradient(90deg, #7209b7, #b5179e);
        }
        
        input:checked + .slider:before {
            transform: translateX(26px);
        }
        
        /* Loading spinner */
        .loading {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
            margin-right: 8px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        /* Responsive untuk mobile */
        @media (max-width: 480px) {
            .modal-content {
                margin: 10px !important;
            }
            
            .reverse-button {
                padding: 0.8rem 1rem;
            }
            
            .badge-active, .badge-inactive {
                padding: 3px 10px;
                font-size: 0.7rem;
            }
            
            .modal-body {
                padding: 1rem !important;
            }
        }
    `;
    
    document.head.appendChild(style);
})();