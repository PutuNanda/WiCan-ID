// schedule.js - Mobile Version with Full Dynamic Content
// ESP-01S Schedule Manager Page - 100% JavaScript Generated
// Mobile First Style - Konsisten dengan halaman lainnya

// ====================================
// GLOBAL VARIABLES
// ====================================
let currentDeviceId = '';
let currentDeviceName = '';
let schedules = [];
let isEditMode = false;
let isLoading = false;
let timeData = null;

// ====================================
// INITIALIZATION
// ====================================
async function initSchedulePage() {
    console.log('📱 Initializing Schedule Manager Page (Mobile)...');
    
    // Get deviceId from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentDeviceId = urlParams.get('deviceid');
    
    if (!currentDeviceId) {
        showErrorAndRedirect('ID Perangkat tidak ditemukan di URL');
        return;
    }
    
    console.log('📱 Loading schedules for device:', currentDeviceId);
    
    // Create DOM structure
    createDOMStructure();
    
    // Get DOM elements after creation
    cacheElements();
    
    // Setup header scroll behavior
    setupHeaderScroll();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load time data first
    await loadTimeData();
    
    // Load schedules
    await loadSchedules();
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
                        <p>Jadwal</p>
                    </div>
                </div>
            </div>

            <div class="header-right">
                <!-- Tombol Schedule Settings -->
                <button class="action-btn" id="scheduleSettingsBtn" title="Pengaturan Jadwal">
                    <i class="fas fa-cog"></i>
                </button>
                <!-- Tombol Back -->
                <button class="action-btn" id="backBtn" title="Kembali">
                    <i class="fas fa-arrow-left"></i>
                </button>
            </div>
        </header>

        <!-- MAIN CONTENT -->
        <div class="container">
            <div class="page-header">
                <h2>
                    <i class="fas fa-clock"></i>
                    <span id="pageTitle">Daftar Jadwal</span>
                </h2>
                <button class="btn-add" id="addScheduleBtn">
                    <i class="fas fa-plus"></i> Tambah Jadwal Baru
                </button>
            </div>

            <!-- Stats Cards -->
            <div class="stats-container" id="statsContainer">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-calendar-check"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="totalSchedules">0</h3>
                        <p>Total Jadwal</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #38b000, #2d6a4f);">
                        <i class="fas fa-play-circle"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="activeSchedules">0</h3>
                        <p>Jadwal Aktif</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #f72585, #b5179e);">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="conflictSchedules">0</h3>
                        <p>Jadwal Bentrok</p>
                    </div>
                </div>
            </div>

            <!-- LOADING STATE -->
            <div class="loading-container" id="loadingState">
                <div class="loading"></div>
                <p>Memuat jadwal...</p>
            </div>

            <!-- ERROR STATE -->
            <div class="empty-state" id="errorState" style="display: none;">
                <div class="empty-icon">
                    <i class="fas fa-exclamation-triangle" style="color: var(--danger);"></i>
                </div>
                <h3>Gagal Memuat Data</h3>
                <p id="errorMessage">Terjadi kesalahan saat memuat jadwal.</p>
                <button class="btn-add" id="retryBtn" style="margin: 0 auto;">
                    <i class="fas fa-sync-alt"></i> Coba Lagi
                </button>
            </div>

            <!-- SCHEDULES GRID -->
            <div class="schedules-grid" id="schedulesGrid"></div>

            <!-- EMPTY STATE (akan dipindahkan ke grid oleh JS) -->
            <div class="empty-state" id="emptyState" style="display: none;">
                <div class="empty-icon">
                    <i class="fas fa-calendar-times"></i>
                </div>
                <h3>Belum Ada Jadwal</h3>
                <p>Perangkat ini belum memiliki jadwal otomatis. Klik tombol "Tambah Jadwal Baru" untuk membuat jadwal pertama.</p>
                <button class="btn-add" id="emptyStateAddBtn" style="margin: 0 auto;">
                    <i class="fas fa-plus"></i> Buat Jadwal Pertama
                </button>
            </div>
        </div>

        <!-- MODAL: Tambah/Edit Jadwal -->
        <div class="modal" id="scheduleModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="modalTitle">
                        <i class="fas fa-plus-circle"></i> Tambah Jadwal Baru
                    </h3>
                    <button class="close-modal" id="closeModalBtn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="scheduleForm">
                        <input type="hidden" id="originalName" name="originalName">
                        
                        <!-- Schedule Name -->
                        <div class="form-group">
                            <label>
                                <i class="fas fa-tag"></i> Nama Jadwal
                            </label>
                            <input type="text" class="form-control" id="scheduleName" 
                                   placeholder="Contoh: Nyala Setiap Hari" required>
                            <small>Nama jadwal harus unik (tidak boleh sama)</small>
                        </div>

                        <!-- Start Time -->
                        <div class="form-group">
                            <label>
                                <i class="fas fa-play"></i> Waktu Mulai
                            </label>
                            <div class="time-group">
                                <select class="time-select" id="startHour" required>
                                    <option value="">Jam</option>
                                </select>
                                <span style="font-weight: bold; font-size: 1.2rem;">:</span>
                                <select class="time-select" id="startMinute" required>
                                    <option value="">Menit</option>
                                </select>
                            </div>
                        </div>

                        <!-- Start Action -->
                        <div class="form-group">
                            <label>
                                <i class="fas fa-bolt"></i> Aksi Mulai
                            </label>
                            <select class="action-select" id="startAction" required>
                                <option value="ON">ON - Nyalakan perangkat</option>
                                <option value="OFF">OFF - Matikan perangkat</option>
                                <option value="None">None - Tidak melakukan apapun</option>
                            </select>
                        </div>

                        <!-- End Time -->
                        <div class="form-group">
                            <label>
                                <i class="fas fa-stop"></i> Waktu Selesai
                            </label>
                            <div class="time-group">
                                <select class="time-select" id="endHour" required>
                                    <option value="">Jam</option>
                                </select>
                                <span style="font-weight: bold; font-size: 1.2rem;">:</span>
                                <select class="time-select" id="endMinute" required>
                                    <option value="">Menit</option>
                                </select>
                            </div>
                        </div>

                        <!-- End Action -->
                        <div class="form-group">
                            <label>
                                <i class="fas fa-power-off"></i> Aksi Selesai
                            </label>
                            <select class="action-select" id="endAction" required>
                                <option value="ON">ON - Nyalakan perangkat</option>
                                <option value="OFF">OFF - Matikan perangkat</option>
                                <option value="None">None - Tidak melakukan apapun</option>
                            </select>
                        </div>

                        <!-- Only Active At Day -->
                        <div class="form-group">
                            <label>
                                <i class="fas fa-calendar-day"></i> Aktif Pada Hari
                            </label>
                            <select class="action-select" id="activeDays">
                                <option value="ALL">Semua Hari (Default)</option>
                                <option value="MONDAY">Senin</option>
                                <option value="TUESDAY">Selasa</option>
                                <option value="WEDNESDAY">Rabu</option>
                                <option value="THURSDAY">Kamis</option>
                                <option value="FRIDAY">Jumat</option>
                                <option value="SATURDAY">Sabtu</option>
                                <option value="SUNDAY">Minggu</option>
                                <option value="WEEKDAY">Senin - Jumat</option>
                                <option value="WEEKEND">Sabtu - Minggu</option>
                            </select>
                            <small>Pilih hari dimana jadwal ini aktif. Default: Semua hari</small>
                        </div>

                        <!-- Form Actions -->
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" id="cancelModalBtn">
                                <i class="fas fa-times"></i> Batal
                            </button>
                            <button type="submit" class="btn-primary" id="submitBtn">
                                <i class="fas fa-save"></i> Simpan Jadwal
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- MODAL: Konfirmasi Hapus -->
        <div class="modal" id="deleteModal">
            <div class="modal-content">
                <div class="modal-header" style="background: linear-gradient(135deg, #f72585, #d00000);">
                    <h3 style="color: white;">
                        <i class="fas fa-exclamation-triangle"></i> Konfirmasi Hapus
                    </h3>
                    <button class="close-modal" id="closeDeleteModalBtn">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; margin-bottom: 1.5rem;">
                        <i class="fas fa-trash-alt" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
                        <h4 style="color: var(--dark); margin-bottom: 0.5rem;">Yakin ingin menghapus?</h4>
                        <p style="color: var(--gray);">Jadwal <strong id="deleteScheduleName">-</strong> akan dihapus permanen.</p>
                    </div>
                </div>
                <div class="modal-footer" style="padding: 1.2rem; display: flex; gap: 0.8rem;">
                    <button class="btn btn-secondary" id="cancelDeleteBtn" style="flex: 1;">Batal</button>
                    <button class="btn btn-danger" id="confirmDeleteBtn" style="flex: 1; background: var(--danger); color: white; border: none; border-radius: 30px; padding: 14px;">
                        <i class="fas fa-trash-alt"></i> Ya, Hapus
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
                    <h3 style="margin-bottom: 0.5rem;" id="successMessage">Jadwal berhasil disimpan</h3>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" id="okSuccessBtn" style="width: 100%; background: var(--success); color: white; border: none; border-radius: 30px; padding: 14px;">
                        OK
                    </button>
                </div>
            </div>
        </div>

        <!-- TOAST NOTIFICATION -->
        <div class="toast" id="toast"></div>
    `;
}

// DOM Elements cache
let header, backBtn, scheduleSettingsBtn, pageTitle, addScheduleBtn;
let loadingState, errorState, emptyState, schedulesGrid;
let totalSchedulesEl, activeSchedulesEl, conflictSchedulesEl;
let errorMessage, retryBtn, emptyStateAddBtn;
let scheduleModal, deleteModal, successModal;
let modalTitle, scheduleForm, closeModalBtn, cancelModalBtn, submitBtn;
let closeDeleteModalBtn, cancelDeleteBtn, confirmDeleteBtn, deleteScheduleName;
let okSuccessBtn, successMessage;
let scheduleName, originalName, startHour, startMinute, startAction;
let endHour, endMinute, endAction, activeDays;
let toast;

function cacheElements() {
    // Header
    header = document.getElementById('mainHeader');
    backBtn = document.getElementById('backBtn');
    scheduleSettingsBtn = document.getElementById('scheduleSettingsBtn');
    pageTitle = document.getElementById('pageTitle');
    addScheduleBtn = document.getElementById('addScheduleBtn');
    
    // States
    loadingState = document.getElementById('loadingState');
    errorState = document.getElementById('errorState');
    emptyState = document.getElementById('emptyState');
    schedulesGrid = document.getElementById('schedulesGrid');
    
    // Stats
    totalSchedulesEl = document.getElementById('totalSchedules');
    activeSchedulesEl = document.getElementById('activeSchedules');
    conflictSchedulesEl = document.getElementById('conflictSchedules');
    
    // Error
    errorMessage = document.getElementById('errorMessage');
    retryBtn = document.getElementById('retryBtn');
    emptyStateAddBtn = document.getElementById('emptyStateAddBtn');
    
    // Modals
    scheduleModal = document.getElementById('scheduleModal');
    deleteModal = document.getElementById('deleteModal');
    successModal = document.getElementById('successModal');
    
    modalTitle = document.getElementById('modalTitle');
    scheduleForm = document.getElementById('scheduleForm');
    closeModalBtn = document.getElementById('closeModalBtn');
    cancelModalBtn = document.getElementById('cancelModalBtn');
    submitBtn = document.getElementById('submitBtn');
    
    closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
    cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    deleteScheduleName = document.getElementById('deleteScheduleName');
    
    okSuccessBtn = document.getElementById('okSuccessBtn');
    successMessage = document.getElementById('successMessage');
    
    // Form fields
    scheduleName = document.getElementById('scheduleName');
    originalName = document.getElementById('originalName');
    startHour = document.getElementById('startHour');
    startMinute = document.getElementById('startMinute');
    startAction = document.getElementById('startAction');
    endHour = document.getElementById('endHour');
    endMinute = document.getElementById('endMinute');
    endAction = document.getElementById('endAction');
    activeDays = document.getElementById('activeDays');
    
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

// Load time data from server
async function loadTimeData() {
    try {
        const response = await fetch('/api/time-date');
        if (response.ok) {
            timeData = await response.json();
            console.log(' Time data loaded:', timeData);
        }
    } catch (error) {
        console.error('Failed to load time data:', error);
    }
}

// Load schedules from API
async function loadSchedules() {
    try {
        isLoading = true;
        showLoadingState(true);
        
        console.log(`📡 Loading schedules for device: ${currentDeviceId}`);
        
        const response = await fetch(`/api/schedule/${currentDeviceId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            schedules = result.schedules || [];
            
            // Update page title with device info
            if (schedules.length > 0) {
                const deviceName = schedules[0]["Device Name"] || currentDeviceId;
                pageTitle.textContent = `Jadwal: ${deviceName}`;
            } else {
                pageTitle.textContent = `Daftar Jadwal`;
            }
            
            updateStats();
            renderSchedules();
            
            console.log(`✅ Loaded ${schedules.length} schedules`);
        } else {
            throw new Error(result.error || 'Failed to load schedules');
        }
    } catch (error) {
        console.error('❌ Error loading schedules:', error);
        showErrorState(error.message);
    } finally {
        isLoading = false;
    }
}

// Save schedule (create or update)
async function saveSchedule(event) {
    event.preventDefault();
    
    try {
        // Get form values
        const scheduleNameVal = scheduleName.value.trim();
        const startHourVal = startHour.value;
        const startMinuteVal = startMinute.value;
        const startActionVal = startAction.value;
        const endHourVal = endHour.value;
        const endMinuteVal = endMinute.value;
        const endActionVal = endAction.value;
        const activeDaysVal = activeDays.value;
        const originalNameVal = originalName.value;
        
        // Validate
        if (!scheduleNameVal) {
            showToast('Nama jadwal harus diisi', 'error');
            return;
        }
        
        if (!startHourVal || !startMinuteVal) {
            showToast('Waktu mulai harus diisi', 'error');
            return;
        }
        
        if (!endHourVal || !endMinuteVal) {
            showToast('Waktu selesai harus diisi', 'error');
            return;
        }
        
        // Check for duplicate name (only when creating or name changed)
        if (!isEditMode || (isEditMode && originalNameVal !== scheduleNameVal)) {
            const isDuplicate = schedules.some(s => s["Schedule Name"] === scheduleNameVal);
            if (isDuplicate) {
                showToast(`Nama jadwal "${scheduleNameVal}" sudah digunakan`, 'error');
                return;
            }
        }
        
        // Prepare schedule object
        const schedule = {
            "Schedule Name": scheduleNameVal,
            "created_at": isEditMode ? null : new Date().toISOString(),
            "Start Time": `${startHourVal}:${startMinuteVal}`,
            "Start Action": startActionVal,
            "End Time": `${endHourVal}:${endMinuteVal}`,
            "End Action": endActionVal,
            "Only Active At Day": activeDaysVal,
            "Schedule Status": "Active" // Default active for new schedules
        };
        
        // If editing, preserve created_at
        if (isEditMode) {
            const existing = schedules.find(s => s["Schedule Name"] === originalNameVal);
            if (existing && existing.created_at) {
                schedule.created_at = existing.created_at;
            }
        }
        
        // Determine method and URL
        let url = `/api/schedule/${currentDeviceId}`;
        let method = 'POST';
        
        if (isEditMode) {
            url += `?originalName=${encodeURIComponent(originalNameVal)}`;
            method = 'PUT';
        }
        
        showLoadingModal(isEditMode ? 'Mengupdate jadwal...' : 'Menyimpan jadwal...');
        
        // Send request
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(schedule)
        });
        
        const result = await response.json();
        hideLoadingModal();
        
        if (result.success) {
            showSuccessModal(result.message || (isEditMode ? 'Jadwal berhasil diupdate' : 'Jadwal berhasil disimpan'));
            closeModal();
            await loadSchedules(); // Reload schedules
        } else {
            throw new Error(result.error || 'Gagal menyimpan jadwal');
        }
        
    } catch (error) {
        hideLoadingModal();
        console.error('Error saving schedule:', error);
        showToast('Gagal menyimpan: ' + error.message, 'error');
    }
}

// Delete schedule
async function deleteSchedule() {
    const scheduleNameVal = deleteScheduleName.textContent;
    
    try {
        showLoadingModal('Menghapus jadwal...');
        
        const response = await fetch(`/api/schedule/${currentDeviceId}?name=${encodeURIComponent(scheduleNameVal)}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        hideLoadingModal();
        
        if (result.success) {
            deleteModal.classList.remove('show');
            showSuccessModal('Jadwal berhasil dihapus');
            await loadSchedules();
        } else {
            throw new Error(result.error || 'Gagal menghapus jadwal');
        }
        
    } catch (error) {
        hideLoadingModal();
        console.error('Error deleting schedule:', error);
        showToast('Gagal menghapus: ' + error.message, 'error');
    }
}

// Toggle schedule status
async function toggleScheduleStatus(scheduleNameVal, isActive) {
    try {
        const schedule = schedules.find(s => s["Schedule Name"] === scheduleNameVal);
        if (!schedule) return;
        
        const updatedSchedule = {
            ...schedule,
            "Schedule Status": isActive ? "Active" : "Inactive"
        };
        
        showToast('Mengupdate status...', 'info');
        
        const response = await fetch(`/api/schedule/${currentDeviceId}?originalName=${encodeURIComponent(scheduleNameVal)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedSchedule)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`Jadwal ${isActive ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
            await loadSchedules(); // Reload to get updated data
        } else {
            throw new Error(result.error || 'Gagal mengupdate status');
        }
    } catch (error) {
        console.error('Error toggling schedule status:', error);
        showToast('Gagal mengupdate status: ' + error.message, 'error');
        // Revert checkbox by reloading
        await loadSchedules();
    }
}

// ====================================
// RENDERING FUNCTIONS
// ====================================

// Render schedules
function renderSchedules() {
    if (schedules.length === 0) {
        showEmptyState(true);
        return;
    }
    
    showEmptyState(false);
    
    // Clear grid
    schedulesGrid.innerHTML = '';
    
    // Detect conflicts for highlighting
    const conflicts = detectConflicts();
    const conflictNames = conflicts.map(c => [c.name1, c.name2]).flat();
    
    // Sort by time
    const sortedSchedules = [...schedules].sort((a, b) => {
        return (a["Start Time"] || "00:00").localeCompare(b["Start Time"] || "00:00");
    });
    
    // Create cards
    sortedSchedules.forEach((schedule, index) => {
        const card = createScheduleCard(schedule, conflictNames.includes(schedule["Schedule Name"]), index);
        schedulesGrid.appendChild(card);
    });
}

// Create schedule card element
function createScheduleCard(schedule, hasConflict, index) {
    const card = document.createElement('div');
    card.className = `schedule-card ${hasConflict ? 'conflict' : ''}`;
    card.dataset.name = schedule["Schedule Name"];
    card.style.animationDelay = `${index * 0.1}s`;
    
    const isActive = schedule["Schedule Status"] === "Active";
    const startActionClass = (schedule["Start Action"] || "none").toLowerCase();
    const endActionClass = (schedule["End Action"] || "none").toLowerCase();
    
    // Format day display
    let dayDisplay = schedule["Only Active At Day"] || "ALL";
    if (dayDisplay === "ALL") dayDisplay = "Setiap Hari";
    else if (dayDisplay === "WEEKDAY") dayDisplay = "Senin - Jumat";
    else if (dayDisplay === "WEEKEND") dayDisplay = "Sabtu - Minggu";
    else {
        const days = {
            "MONDAY": "Senin",
            "TUESDAY": "Selasa",
            "WEDNESDAY": "Rabu",
            "THURSDAY": "Kamis",
            "FRIDAY": "Jumat",
            "SATURDAY": "Sabtu",
            "SUNDAY": "Minggu"
        };
        dayDisplay = days[dayDisplay] || dayDisplay;
    }
    
    // Format date
    let createdDate = "N/A";
    if (schedule.created_at) {
        try {
            const date = new Date(schedule.created_at);
            createdDate = date.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            createdDate = schedule.created_at;
        }
    }
    
    card.innerHTML = `
        ${hasConflict ? '<div class="conflict-badge"><i class="fas fa-exclamation-triangle"></i> Bentrok</div>' : ''}
        <div class="card-header">
            <div class="schedule-name" title="${escapeHtml(schedule["Schedule Name"])}">
                ${escapeHtml(schedule["Schedule Name"])}
            </div>
            <div class="status-badge ${isActive ? 'active' : 'inactive'}">
                <div class="status-dot ${isActive ? 'active' : 'inactive'}"></div>
                ${isActive ? 'Aktif' : 'Tidak Aktif'}
            </div>
        </div>
        <div class="card-body">
            <div class="time-grid">
                <div class="time-item">
                    <div class="time-label">MULAI</div>
                    <div class="time-value">${schedule["Start Time"] || '00:00'}</div>
                    <div class="time-sub">
                        <span class="action-badge ${startActionClass}">
                            ${schedule["Start Action"] || 'None'}
                        </span>
                    </div>
                </div>
                <div class="time-item">
                    <div class="time-label">SELESAI</div>
                    <div class="time-value">${schedule["End Time"] || '00:00'}</div>
                    <div class="time-sub">
                        <span class="action-badge ${endActionClass}">
                            ${schedule["End Action"] || 'None'}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="info-row">
                <span class="info-label">
                    <i class="fas fa-calendar-day"></i> Hari Aktif
                </span>
                <span class="info-value">
                    <span class="day-badge">${escapeHtml(dayDisplay)}</span>
                </span>
            </div>
            
            <div class="info-row">
                <span class="info-label">
                    <i class="fas fa-clock"></i> Dibuat
                </span>
                <span class="info-value">${escapeHtml(createdDate)}</span>
            </div>
            
            <div class="switch-container">
                <span class="switch-label">
                    <i class="fas fa-toggle-on"></i> Status Jadwal
                </span>
                <label class="switch">
                    <input type="checkbox" ${isActive ? 'checked' : ''} 
                           data-name="${escapeHtml(schedule["Schedule Name"])}">
                    <span class="slider"></span>
                </label>
            </div>
            
            <div class="card-actions">
                <button class="edit-btn" data-name="${escapeHtml(schedule["Schedule Name"])}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="delete-btn" data-name="${escapeHtml(schedule["Schedule Name"])}">
                    <i class="fas fa-trash"></i> Hapus
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// Update statistics
function updateStats() {
    const total = schedules.length;
    const active = schedules.filter(s => s["Schedule Status"] === "Active").length;
    const conflicts = detectConflicts().length;
    
    totalSchedulesEl.textContent = total;
    activeSchedulesEl.textContent = active;
    conflictSchedulesEl.textContent = conflicts;
}

// Detect schedule conflicts
function detectConflicts() {
    const conflicts = [];
    
    // Only check active schedules
    const activeSchedules = schedules.filter(s => s["Schedule Status"] === "Active");
    
    for (let i = 0; i < activeSchedules.length; i++) {
        for (let j = i + 1; j < activeSchedules.length; j++) {
            const s1 = activeSchedules[i];
            const s2 = activeSchedules[j];
            
            // Check if times overlap
            if (s1["Start Time"] === s2["Start Time"] && 
                s1["Start Action"] !== s2["Start Action"] &&
                (s1["Start Action"] === "ON" || s1["Start Action"] === "OFF") &&
                (s2["Start Action"] === "ON" || s2["Start Action"] === "OFF")) {
                
                // ON + OFF at same time = conflict
                if ((s1["Start Action"] === "ON" && s2["Start Action"] === "OFF") ||
                    (s1["Start Action"] === "OFF" && s2["Start Action"] === "ON")) {
                    
                    conflicts.push({
                        name1: s1["Schedule Name"],
                        name2: s2["Schedule Name"],
                        time: s1["Start Time"],
                        action1: s1["Start Action"],
                        action2: s2["Start Action"]
                    });
                }
            }
        }
    }
    
    return conflicts;
}

// ====================================
// MODAL FUNCTIONS
// ====================================

// Open modal for adding new schedule
function openAddModal() {
    isEditMode = false;
    modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Tambah Jadwal Baru';
    
    // Reset form
    scheduleForm.reset();
    originalName.value = '';
    
    // Set default values
    startAction.value = 'ON';
    endAction.value = 'OFF';
    activeDays.value = 'ALL';
    
    // Set default time based on current time
    if (timeData) {
        const currentHour = timeData.hours;
        const currentMinute = timeData.minutes;
        
        startHour.value = currentHour.toString().padStart(2, '0');
        startMinute.value = currentMinute.toString().padStart(2, '0');
        
        let endHourVal = currentHour + 1;
        if (endHourVal >= 24) endHourVal = 0;
        endHour.value = endHourVal.toString().padStart(2, '0');
        endMinute.value = currentMinute.toString().padStart(2, '0');
    } else {
        // Default to 08:00 - 09:00
        startHour.value = '08';
        startMinute.value = '00';
        endHour.value = '09';
        endMinute.value = '00';
    }
    
    scheduleModal.classList.add('show');
}

// Open modal for editing schedule
function openEditModal(scheduleNameVal) {
    const schedule = schedules.find(s => s["Schedule Name"] === scheduleNameVal);
    if (!schedule) {
        showToast('Jadwal tidak ditemukan', 'error');
        return;
    }
    
    isEditMode = true;
    modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Jadwal';
    
    // Parse time
    const startTime = schedule["Start Time"] || '00:00';
    const [startHourVal, startMinuteVal] = startTime.split(':');
    
    const endTime = schedule["End Time"] || '00:00';
    const [endHourVal, endMinuteVal] = endTime.split(':');
    
    // Fill form
    originalName.value = schedule["Schedule Name"];
    scheduleName.value = schedule["Schedule Name"];
    startHour.value = startHourVal;
    startMinute.value = startMinuteVal;
    startAction.value = schedule["Start Action"] || 'ON';
    endHour.value = endHourVal;
    endMinute.value = endMinuteVal;
    endAction.value = schedule["End Action"] || 'OFF';
    activeDays.value = schedule["Only Active At Day"] || 'ALL';
    
    scheduleModal.classList.add('show');
}

// Open delete confirmation modal
function openDeleteModal(scheduleNameVal) {
    deleteScheduleName.textContent = scheduleNameVal;
    deleteModal.classList.add('show');
}

// Close modal
function closeModal() {
    scheduleModal.classList.remove('show');
}

// Close delete modal
function closeDeleteModal() {
    deleteModal.classList.remove('show');
}

// Show success modal
function showSuccessModal(message) {
    successMessage.textContent = message || 'Jadwal berhasil disimpan';
    successModal.classList.add('show');
}

// Show loading modal
function showLoadingModal(message = 'Memproses...') {
    // Create loading modal if not exists
    let loadingModal = document.getElementById('loadingModal');
    if (!loadingModal) {
        loadingModal = document.createElement('div');
        loadingModal.id = 'loadingModal';
        loadingModal.className = 'modal';
        loadingModal.innerHTML = `
            <div class="modal-content" style="background: transparent; box-shadow: none; max-width: 300px;">
                <div class="loading-state" style="background: white; border-radius: 28px; padding: 2rem;">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: var(--primary);"></i>
                    </div>
                    <h3 style="color: var(--dark); margin-bottom: 0.5rem;">${message}</h3>
                    <p style="color: var(--gray); font-size: 0.9rem;">Mohon tunggu sebentar...</p>
                </div>
            </div>
        `;
        document.body.appendChild(loadingModal);
    } else {
        const titleEl = loadingModal.querySelector('h3');
        if (titleEl) titleEl.textContent = message;
    }
    loadingModal.classList.add('show');
}

// Hide loading modal
function hideLoadingModal() {
    const loadingModal = document.getElementById('loadingModal');
    if (loadingModal) {
        loadingModal.classList.remove('show');
    }
}

// ====================================
// UTILITY FUNCTIONS
// ====================================

function showLoadingState(loading) {
    if (!loadingState || !schedulesGrid) return;
    
    if (loading) {
        loadingState.style.display = 'block';
        schedulesGrid.style.display = 'none';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
    }
}

function showErrorState(message) {
    loadingState.style.display = 'none';
    schedulesGrid.style.display = 'none';
    errorState.style.display = 'block';
    emptyState.style.display = 'none';
    if (errorMessage) {
        errorMessage.textContent = message || 'Terjadi kesalahan saat memuat jadwal.';
    }
}

function showEmptyState(show) {
    if (show) {
        schedulesGrid.innerHTML = '';
        schedulesGrid.style.display = 'block';
        loadingState.style.display = 'none';
        errorState.style.display = 'none';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        schedulesGrid.style.display = 'grid';
    }
}

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
    
    // Schedule Settings button
    if (scheduleSettingsBtn) {
        scheduleSettingsBtn.addEventListener('click', () => {
            window.location.href = `schedule-settings.html?deviceid=${currentDeviceId}`;
        });
    }
    
    // Add schedule buttons
    if (addScheduleBtn) {
        addScheduleBtn.addEventListener('click', openAddModal);
    }
    if (emptyStateAddBtn) {
        emptyStateAddBtn.addEventListener('click', openAddModal);
    }
    
    // Retry button
    if (retryBtn) {
        retryBtn.addEventListener('click', async () => {
            errorState.style.display = 'none';
            loadingState.style.display = 'block';
            await loadSchedules();
        });
    }
    
    // Form submit
    if (scheduleForm) {
        scheduleForm.addEventListener('submit', saveSchedule);
    }
    
    // Close modal buttons
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    if (cancelModalBtn) {
        cancelModalBtn.addEventListener('click', closeModal);
    }
    
    // Delete modal
    if (closeDeleteModalBtn) {
        closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
    }
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    }
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', deleteSchedule);
    }
    
    // Success modal
    if (okSuccessBtn) {
        okSuccessBtn.addEventListener('click', () => {
            successModal.classList.remove('show');
        });
    }
    
    // Event delegation for dynamic elements
    if (schedulesGrid) {
        schedulesGrid.addEventListener('click', (e) => {
            // Edit button
            const editBtn = e.target.closest('.edit-btn');
            if (editBtn) {
                const scheduleName = editBtn.dataset.name;
                if (scheduleName) {
                    openEditModal(scheduleName);
                }
            }
            
            // Delete button
            const deleteBtn = e.target.closest('.delete-btn');
            if (deleteBtn) {
                const scheduleName = deleteBtn.dataset.name;
                if (scheduleName) {
                    openDeleteModal(scheduleName);
                }
            }
        });
        
        // Change event for switches
        schedulesGrid.addEventListener('change', (e) => {
            const checkbox = e.target.closest('.switch input[type="checkbox"]');
            if (checkbox && checkbox.dataset.name) {
                const scheduleName = checkbox.dataset.name;
                const isActive = checkbox.checked;
                toggleScheduleStatus(scheduleName, isActive);
            }
        });
    }
    
    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === scheduleModal) {
            closeModal();
        }
        if (e.target === deleteModal) {
            closeDeleteModal();
        }
        if (e.target === successModal) {
            successModal.classList.remove('show');
        }
        const loadingModal = document.getElementById('loadingModal');
        if (loadingModal && e.target === loadingModal) {
            loadingModal.classList.remove('show');
        }
    });
    
    // Populate time dropdowns after modal is created
    populateTimeDropdowns();
}

// Populate hour and minute dropdowns
function populateTimeDropdowns() {
    if (!startHour || !startMinute || !endHour || !endMinute) return;
    
    // Clear existing options
    startHour.innerHTML = '<option value="">Jam</option>';
    startMinute.innerHTML = '<option value="">Menit</option>';
    endHour.innerHTML = '<option value="">Jam</option>';
    endMinute.innerHTML = '<option value="">Menit</option>';
    
    // Hours (00-23)
    for (let i = 0; i < 24; i++) {
        const hourStr = i.toString().padStart(2, '0');
        startHour.innerHTML += `<option value="${hourStr}">${hourStr}</option>`;
        endHour.innerHTML += `<option value="${hourStr}">${hourStr}</option>`;
    }
    
    // Minutes (00-59)
    for (let i = 0; i < 60; i++) {
        const minuteStr = i.toString().padStart(2, '0');
        startMinute.innerHTML += `<option value="${minuteStr}">${minuteStr}</option>`;
        endMinute.innerHTML += `<option value="${minuteStr}">${minuteStr}</option>`;
    }
}

// ====================================
// ADDITIONAL STYLES
// ====================================
const style = document.createElement('style');
style.textContent = `
    /* Loading spinner */
    .loading-spinner i {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    /* Modal footer */
    .modal-footer {
        padding: 1.2rem;
        border-top: 1px solid var(--gray-light);
    }
    
    /* Danger button */
    .btn-danger {
        background: var(--danger);
        color: white;
        border: none;
        border-radius: 30px;
        padding: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }
    
    .btn-danger:active {
        transform: scale(0.96);
        background: #d1145a;
    }
    
    /* Success button */
    .btn-success {
        background: var(--success);
        color: white;
        border: none;
        border-radius: 30px;
        padding: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .btn-success:active {
        transform: scale(0.96);
        background: #2a9d8f;
    }
    
    /* Loading state in modal */
    .loading-state {
        text-align: center;
    }
    
    /* Animation delays */
    .schedule-card {
        animation: fadeIn 0.4s ease forwards;
        opacity: 0;
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
    
    initSchedulePage();
});

// Export untuk debugging
window.schedulePage = {
    refresh: loadSchedules,
    showToast,
    reload: () => window.location.reload()
};

