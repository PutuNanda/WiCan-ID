const fs = require('fs').promises;
const path = require('path');

/**
 * API Controller untuk mengelola jadwal perangkat
 * Endpoint: /api/schedule/:deviceId
 * Method: GET, POST, PUT, DELETE
 */

async function handleRequest(req, res) {
    try {
        const { method } = req;
        const deviceId = req.params.deviceId;
        
        console.log(`📅 [Schedule-Controller] ${method} request for device: ${deviceId}`);
        
        // Validasi deviceId
        if (!deviceId) {
            return res.status(400).json({
                success: false,
                error: 'Device ID diperlukan'
            });
        }
        
        // Route berdasarkan method
        switch (method) {
            case 'GET':
                await getSchedules(req, res, deviceId);
                break;
            case 'POST':
                await createSchedule(req, res, deviceId);
                break;
            case 'PUT':
                await updateSchedule(req, res, deviceId);
                break;
            case 'DELETE':
                await deleteSchedule(req, res, deviceId);
                break;
            default:
                res.status(405).json({
                    success: false,
                    error: 'Method tidak diizinkan'
                });
        }
    } catch (error) {
        console.error('❌ Error in schedule-controller:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
}

/**
 * GET /api/schedule/:deviceId
 * Mendapatkan semua jadwal untuk device tertentu
 */
async function getSchedules(req, res, deviceId) {
    try {
        const schedulePath = path.join(__dirname, '..', 'database', 'device', deviceId, 'schedule-list.json');
        
        // Cek apakah file ada
        try {
            await fs.access(schedulePath);
        } catch (error) {
            // File tidak ada, return array kosong
            return res.json({
                success: true,
                schedules: [],
                deviceId: deviceId
            });
        }
        
        // Baca file
        const data = await fs.readFile(schedulePath, 'utf8');
        let schedules = [];
        
        try {
            // Parse JSON - bisa berupa array atau object
            const parsed = JSON.parse(data);
            
            // Jika array, gunakan langsung
            if (Array.isArray(parsed)) {
                schedules = parsed;
            } 
            // Jika object dengan properti schedules
            else if (parsed.schedules && Array.isArray(parsed.schedules)) {
                schedules = parsed.schedules;
            }
            // Jika single object, jadikan array
            else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                schedules = [parsed];
            }
            
            console.log(`✅ Loaded ${schedules.length} schedules for device ${deviceId}`);
            
        } catch (parseError) {
            console.error('❌ Error parsing schedule-list.json:', parseError);
            schedules = [];
        }
        
        res.json({
            success: true,
            schedules: schedules,
            deviceId: deviceId,
            count: schedules.length
        });
        
    } catch (error) {
        console.error('❌ Error getting schedules:', error);
        res.status(500).json({
            success: false,
            error: 'Gagal membaca jadwal',
            message: error.message
        });
    }
}

/**
 * POST /api/schedule/:deviceId
 * Membuat jadwal baru
 */
async function createSchedule(req, res, deviceId) {
    try {
        const newSchedule = req.body;
        
        // Validasi data yang diperlukan
        const validationError = validateSchedule(newSchedule);
        if (validationError) {
            return res.status(400).json({
                success: false,
                error: validationError
            });
        }
        
        // Path ke file schedule-list.json
        const devicePath = path.join(__dirname, '..', 'database', 'device', deviceId);
        const schedulePath = path.join(devicePath, 'schedule-list.json');
        
        // Buat folder device jika belum ada
        try {
            await fs.mkdir(devicePath, { recursive: true });
        } catch (error) {
            console.log(`📁 Folder device ${deviceId} sudah ada atau dibuat`);
        }
        
        // Baca jadwal yang sudah ada
        let schedules = [];
        try {
            const existingData = await fs.readFile(schedulePath, 'utf8');
            const parsed = JSON.parse(existingData);
            
            if (Array.isArray(parsed)) {
                schedules = parsed;
            } else if (parsed.schedules && Array.isArray(parsed.schedules)) {
                schedules = parsed.schedules;
            }
        } catch (error) {
            // File tidak ada, mulai dengan array kosong
            console.log(`📄 Membuat file schedule-list.json baru untuk device ${deviceId}`);
        }
        
        // Cek duplikasi Schedule Name
        const isDuplicate = schedules.some(s => s["Schedule Name"] === newSchedule["Schedule Name"]);
        if (isDuplicate) {
            return res.status(400).json({
                success: false,
                error: `Nama jadwal "${newSchedule["Schedule Name"]}" sudah digunakan`
            });
        }
        
        // Tambahkan created_at jika tidak ada
        if (!newSchedule.created_at) {
            newSchedule.created_at = new Date().toISOString();
        }
        
        // Set default values jika tidak ada
        if (!newSchedule["Schedule Status"]) {
            newSchedule["Schedule Status"] = "Active";
        }
        
        if (!newSchedule["Only Active At Day"]) {
            newSchedule["Only Active At Day"] = "ALL";
        }
        
        // Tambahkan ke array
        schedules.push(newSchedule);
        
        // Simpan ke file
        await fs.writeFile(schedulePath, JSON.stringify(schedules, null, 2));
        
        console.log(`✅ Jadwal "${newSchedule["Schedule Name"]}" berhasil ditambahkan untuk device ${deviceId}`);
        
        res.status(201).json({
            success: true,
            message: 'Jadwal berhasil ditambahkan',
            schedule: newSchedule,
            deviceId: deviceId
        });
        
    } catch (error) {
        console.error('❌ Error creating schedule:', error);
        res.status(500).json({
            success: false,
            error: 'Gagal membuat jadwal',
            message: error.message
        });
    }
}

/**
 * PUT /api/schedule/:deviceId
 * Mengupdate jadwal yang sudah ada
 */
async function updateSchedule(req, res, deviceId) {
    try {
        const updatedSchedule = req.body;
        const originalName = req.query.originalName || updatedSchedule["Schedule Name"];
        
        // Validasi data
        const validationError = validateSchedule(updatedSchedule);
        if (validationError) {
            return res.status(400).json({
                success: false,
                error: validationError
            });
        }
        
        const schedulePath = path.join(__dirname, '..', 'database', 'device', deviceId, 'schedule-list.json');
        
        // Cek apakah file ada
        try {
            await fs.access(schedulePath);
        } catch (error) {
            return res.status(404).json({
                success: false,
                error: 'File jadwal tidak ditemukan'
            });
        }
        
        // Baca jadwal yang sudah ada
        const data = await fs.readFile(schedulePath, 'utf8');
        let schedules = JSON.parse(data);
        
        // Pastikan dalam bentuk array
        if (!Array.isArray(schedules)) {
            schedules = schedules.schedules || [schedules];
        }
        
        // Cari index jadwal yang akan diupdate
        const index = schedules.findIndex(s => s["Schedule Name"] === originalName);
        
        if (index === -1) {
            return res.status(404).json({
                success: false,
                error: `Jadwal "${originalName}" tidak ditemukan`
            });
        }
        
        // Cek duplikasi nama jika nama berubah
        if (originalName !== updatedSchedule["Schedule Name"]) {
            const isDuplicate = schedules.some((s, i) => 
                i !== index && s["Schedule Name"] === updatedSchedule["Schedule Name"]
            );
            
            if (isDuplicate) {
                return res.status(400).json({
                    success: false,
                    error: `Nama jadwal "${updatedSchedule["Schedule Name"]}" sudah digunakan`
                });
            }
        }
        
        // Pertahankan created_at asli
        if (!updatedSchedule.created_at && schedules[index].created_at) {
            updatedSchedule.created_at = schedules[index].created_at;
        }
        
        // Update jadwal
        schedules[index] = updatedSchedule;
        
        // Simpan ke file
        await fs.writeFile(schedulePath, JSON.stringify(schedules, null, 2));
        
        console.log(`✅ Jadwal "${updatedSchedule["Schedule Name"]}" berhasil diupdate untuk device ${deviceId}`);
        
        res.json({
            success: true,
            message: 'Jadwal berhasil diupdate',
            schedule: updatedSchedule,
            deviceId: deviceId
        });
        
    } catch (error) {
        console.error('❌ Error updating schedule:', error);
        res.status(500).json({
            success: false,
            error: 'Gagal mengupdate jadwal',
            message: error.message
        });
    }
}

/**
 * DELETE /api/schedule/:deviceId
 * Menghapus jadwal
 */
async function deleteSchedule(req, res, deviceId) {
    try {
        const scheduleName = req.query.name;
        
        if (!scheduleName) {
            return res.status(400).json({
                success: false,
                error: 'Nama jadwal diperlukan'
            });
        }
        
        const schedulePath = path.join(__dirname, '..', 'database', 'device', deviceId, 'schedule-list.json');
        
        // Cek apakah file ada
        try {
            await fs.access(schedulePath);
        } catch (error) {
            return res.status(404).json({
                success: false,
                error: 'File jadwal tidak ditemukan'
            });
        }
        
        // Baca jadwal yang sudah ada
        const data = await fs.readFile(schedulePath, 'utf8');
        let schedules = JSON.parse(data);
        
        // Pastikan dalam bentuk array
        if (!Array.isArray(schedules)) {
            schedules = schedules.schedules || [schedules];
        }
        
        // Filter out jadwal yang akan dihapus
        const newSchedules = schedules.filter(s => s["Schedule Name"] !== scheduleName);
        
        if (newSchedules.length === schedules.length) {
            return res.status(404).json({
                success: false,
                error: `Jadwal "${scheduleName}" tidak ditemukan`
            });
        }
        
        // Simpan ke file
        await fs.writeFile(schedulePath, JSON.stringify(newSchedules, null, 2));
        
        console.log(`✅ Jadwal "${scheduleName}" berhasil dihapus dari device ${deviceId}`);
        
        res.json({
            success: true,
            message: 'Jadwal berhasil dihapus',
            deletedSchedule: scheduleName,
            deviceId: deviceId
        });
        
    } catch (error) {
        console.error('❌ Error deleting schedule:', error);
        res.status(500).json({
            success: false,
            error: 'Gagal menghapus jadwal',
            message: error.message
        });
    }
}

/**
 * Validasi struktur jadwal
 */
function validateSchedule(schedule) {
    if (!schedule) {
        return 'Data jadwal tidak boleh kosong';
    }
    
    if (!schedule["Schedule Name"]) {
        return 'Schedule Name wajib diisi';
    }
    
    if (schedule["Schedule Name"].trim() === '') {
        return 'Schedule Name tidak boleh kosong';
    }
    
    if (!schedule["Start Time"] || !isValidTimeFormat(schedule["Start Time"])) {
        return 'Start Time harus dalam format HH:MM (contoh: 13:30)';
    }
    
    if (!schedule["End Time"] || !isValidTimeFormat(schedule["End Time"])) {
        return 'End Time harus dalam format HH:MM (contoh: 13:30)';
    }
    
    if (schedule["Start Action"] && !['ON', 'OFF', 'None'].includes(schedule["Start Action"])) {
        return 'Start Action harus ON, OFF, atau None';
    }
    
    if (schedule["End Action"] && !['ON', 'OFF', 'None'].includes(schedule["End Action"])) {
        return 'End Action harus ON, OFF, atau None';
    }
    
    if (schedule["Schedule Status"] && !['Active', 'Inactive'].includes(schedule["Schedule Status"])) {
        return 'Schedule Status harus Active atau Inactive';
    }
    
    return null;
}

/**
 * Validasi format waktu HH:MM
 */
function isValidTimeFormat(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return false;
    
    const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(timeStr);
}

module.exports = {
    handleRequest
};