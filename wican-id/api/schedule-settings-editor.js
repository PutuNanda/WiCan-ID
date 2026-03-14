// api/schedule-settings-editor.js
// API untuk membaca dan menulis file schedule-config.properties

const fs = require('fs').promises;
const path = require('path');

class ScheduleSettingsEditor {
    async handleRequest(req, res) {
        const { deviceId } = req.params;
        
        try {
            // Validasi deviceId
            if (!deviceId || deviceId.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: 'Device ID tidak valid'
                });
            }

            // Handle berdasarkan method
            switch (req.method) {
                case 'GET':
                    await this.handleGet(req, res, deviceId);
                    break;
                case 'POST':
                case 'PUT':
                    await this.handlePost(req, res, deviceId);
                    break;
                default:
                    res.status(405).json({
                        success: false,
                        error: 'Method tidak diizinkan'
                    });
            }
        } catch (error) {
            console.error('❌ Error in schedule-settings-editor:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    async handleGet(req, res, deviceId) {
        try {
            // Path ke file konfigurasi
            const configPath = path.join(
                __dirname, 
                '..', 
                'database', 
                'device', 
                deviceId, 
                'schedule-config.properties'
            );

            // Cek apakah file ada
            try {
                await fs.access(configPath);
            } catch (error) {
                // File tidak ditemukan
                return res.status(404).json({
                    success: false,
                    error: 'File konfigurasi tidak ditemukan',
                    deviceId: deviceId
                });
            }

            // Baca file
            const content = await fs.readFile(configPath, 'utf8');
            
            // Parse file properties
            const config = this.parseProperties(content);
            
            // Kirim response
            res.json({
                success: true,
                deviceId: deviceId,
                config: config,
                file: 'schedule-config.properties'
            });

        } catch (error) {
            console.error('Error reading config:', error);
            res.status(500).json({
                success: false,
                error: 'Gagal membaca file konfigurasi',
                message: error.message
            });
        }
    }

    async handlePost(req, res, deviceId) {
        try {
            const newConfig = req.body;
            
            // Validasi required fields
            if (newConfig['use-relay-feedback'] === undefined ||
                newConfig['realtime-state-enforcement'] === undefined ||
                newConfig['feedback-timeout-ms'] === undefined) {
                
                return res.status(400).json({
                    success: false,
                    error: 'Data konfigurasi tidak lengkap'
                });
            }

            // Validasi tipe data
            if (typeof newConfig['use-relay-feedback'] !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    error: 'use-relay-feedback harus bertipe boolean'
                });
            }

            if (typeof newConfig['realtime-state-enforcement'] !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    error: 'realtime-state-enforcement harus bertipe boolean'
                });
            }

            const timeout = parseInt(newConfig['feedback-timeout-ms']);
            if (isNaN(timeout) || timeout < 1000 || timeout > 30000) {
                return res.status(400).json({
                    success: false,
                    error: 'feedback-timeout-ms harus antara 1000 - 30000'
                });
            }

            // Path ke folder device
            const deviceFolder = path.join(
                __dirname, 
                '..', 
                'database', 
                'device', 
                deviceId
            );

            // Buat folder device jika belum ada
            try {
                await fs.mkdir(deviceFolder, { recursive: true });
            } catch (error) {
                console.error('Error creating device folder:', error);
            }

            // Path ke file konfigurasi
            const configPath = path.join(deviceFolder, 'schedule-config.properties');

            // Generate konten file
            const content = this.generateProperties(newConfig);

            // Tulis file
            await fs.writeFile(configPath, content, 'utf8');

            // Kirim response sukses
            const isNewFile = req.method === 'POST' && !(await this.fileExists(configPath));
            
            res.json({
                success: true,
                deviceId: deviceId,
                message: isNewFile ? 
                    'File konfigurasi berhasil dibuat' : 
                    'Pengaturan berhasil disimpan',
                config: newConfig
            });

        } catch (error) {
            console.error('Error writing config:', error);
            res.status(500).json({
                success: false,
                error: 'Gagal menyimpan file konfigurasi',
                message: error.message
            });
        }
    }

    // Helper: Parse file properties
    parseProperties(content) {
        const config = {
            'use-relay-feedback': false,
            'realtime-state-enforcement': false,
            'feedback-timeout-ms': 5000
        };

        const lines = content.split('\n');
        
        for (const line of lines) {
            // Skip komentar dan baris kosong
            if (line.trim().startsWith('#') || line.trim() === '') continue;
            
            // Parse key = value
            const match = line.match(/^([^=]+)\s*=\s*(.+)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                
                // Convert value berdasarkan key
                if (key === 'use-relay-feedback' || key === 'realtime-state-enforcement') {
                    config[key] = value.toLowerCase() === 'true';
                } else if (key === 'feedback-timeout-ms') {
                    const num = parseInt(value);
                    config[key] = isNaN(num) ? 5000 : num;
                } else {
                    config[key] = value;
                }
            }
        }

        return config;
    }

    // Helper: Generate file properties
    generateProperties(config) {
        const timestamp = new Date().toISOString();
        
        return `# Schedule Configuration for ${config['device-id'] || 'device'}
# Created: ${timestamp}
# ========================================

use-relay-feedback = ${config['use-relay-feedback']}
# Jika false maka gunakan feedback dari sensor, jika true gunakan feedback dari relay itself
# Menentukan sumber feedback yang digunakan oleh sistem schedule untuk memverifikasi status perangkat.
# false → Sistem membaca feedback dari sensor atau status asli perangkat.
# true → Sistem membaca feedback dari status relay itu sendiri.

feedback-timeout-ms = ${config['feedback-timeout-ms']}
# Jika feedback tidak berubah meskipun state baru udah dikirim, maka anggap feedback timeout
# dan change state lagi. sampai feedback beneran berubah sesuai state yang dikirim.

realtime-state-enforcement = ${config['realtime-state-enforcement']}
# Menentukan apakah sistem akan langsung mengoreksi perubahan status yang terjadi di luar kendali schedule.

# ========================================
# Jangan hapus komentar di atas!
# File ini digunakan oleh schedule system
`;
    }

    // Helper: Cek apakah file ada
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}

module.exports = new ScheduleSettingsEditor();