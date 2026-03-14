const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function handleRequest(req, res) {
    try {
        const { deviceId } = req.body;
        
        if (!deviceId) {
            return res.status(400).json({
                success: false,
                error: 'Device ID is required'
            });
        }

        console.log(`[${new Date().toISOString()}] 🚀 Starting sketch compilation for: ${deviceId}`);

        // 1. Cari file ESP-01S.ino di folder device
        const sourceCodePath = path.join(__dirname, '..', 'database', 'device', deviceId, 'ESP-01S.ino');
        const arduinoSketchPath = path.join(__dirname, '..', 'mcu-tools', 'arduino-cli', 'sketch', 'ESP-01S.ino');
        const compilerJsPath = path.join(__dirname, '..', 'mcu-tools', 'compiler.js');
        const binDir = path.join(__dirname, '..', 'mcu-tools', 'bin');
        const finalBinaryDest = path.join(__dirname, '..', 'database', 'device', deviceId, 'ESP-01S.bin');

        console.log(`[${new Date().toISOString()}] 🔍 Checking source code...`);
        
        // Cek file source code
        try {
            await fs.access(sourceCodePath);
            console.log(`[${new Date().toISOString()}] ✅ Source code found: ${sourceCodePath}`);
        } catch (error) {
            console.log(`[${new Date().toISOString()}] ❌ Source code not found for device: ${deviceId}`);
            return res.status(404).json({
                success: false,
                error: 'Source code not found',
                message: `ESP-01S.ino not found for device ${deviceId}`
            });
        }

        // 2. Copy file ke arduino-cli sketch folder
        console.log(`[${new Date().toISOString()}] 📁 Copying sketch to arduino-cli folder...`);
        try {
            const sketchContent = await fs.readFile(sourceCodePath, 'utf8');
            
            // Buat folder arduino-cli/sketch jika belum ada
            const sketchFolder = path.dirname(arduinoSketchPath);
            await fs.mkdir(sketchFolder, { recursive: true });
            
            await fs.writeFile(arduinoSketchPath, sketchContent);
            console.log(`[${new Date().toISOString()}] ✅ Sketch copied to: ${arduinoSketchPath}`);
        } catch (error) {
            console.log(`[${new Date().toISOString()}] ❌ Failed to copy sketch:`, error);
            return res.status(500).json({
                success: false,
                error: 'Failed to copy sketch',
                message: error.message
            });
        }

        // 3. Jalankan compiler.js
        console.log(`[${new Date().toISOString()}] ⚙️  Running compiler...`);
        
        try {
            // Gunakan child process untuk menjalankan compiler
            const { stdout, stderr } = await execAsync(`node "${compilerJsPath}"`, {
                cwd: path.join(__dirname, '..'),
                maxBuffer: 20 * 1024 * 1024
            });
            
            if (stderr) {
                console.log(`[${new Date().toISOString()}] ⚠️  Compiler warnings:`, stderr);
            }
            
            console.log(`[${new Date().toISOString()}] 📝 Compiler output:`, stdout);
            
        } catch (error) {
            console.error(`[${new Date().toISOString()}] ❌ Compiler execution failed:`, error);
            if (error && error.stdout) {
                console.error(`[${new Date().toISOString()}] 📄 Compiler stdout:\n${error.stdout}`);
            }
            if (error && error.stderr) {
                console.error(`[${new Date().toISOString()}] 📄 Compiler stderr:\n${error.stderr}`);
            }
            return res.status(500).json({
                success: false,
                error: 'Compiler execution failed',
                message: error.message,
                stderr: error.stderr || '',
                stdout: error.stdout || ''
            });
        }

        // 4. Tunggu sebentar untuk memastikan kompilasi selesai
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 5. Cek file binary hasil kompilasi
        const compiledBinaryPath = path.join(binDir, 'ESP-01S.bin');
        console.log(`[${new Date().toISOString()}] 🔍 Checking for compiled binary...`);
        
        try {
            await fs.access(compiledBinaryPath);
            console.log(`[${new Date().toISOString()}] ✅ Compiled binary found: ${compiledBinaryPath}`);
        } catch (error) {
            console.log(`[${new Date().toISOString()}] ❌ Compiled binary not found`);
            
            // Coba tunggu lebih lama dan cek lagi
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            try {
                await fs.access(compiledBinaryPath);
                console.log(`[${new Date().toISOString()}] ✅ Compiled binary found after delay`);
            } catch (error2) {
                return res.status(500).json({
                    success: false,
                    error: 'Compilation failed',
                    message: 'Binary file was not generated'
                });
            }
        }

        // 6. Move binary ke folder device
        console.log(`[${new Date().toISOString()}] 📦 Moving binary to device folder...`);
        try {
            const binaryContent = await fs.readFile(compiledBinaryPath);
            await fs.writeFile(finalBinaryDest, binaryContent);
            
            // Hapus file dari bin folder
            await fs.unlink(compiledBinaryPath);
            
            console.log(`[${new Date().toISOString()}] ✅ Binary moved to: ${finalBinaryDest}`);
        } catch (error) {
            console.log(`[${new Date().toISOString()}] ❌ Failed to move binary:`, error);
            return res.status(500).json({
                success: false,
                error: 'Failed to move binary',
                message: error.message
            });
        }

        // 7. Verifikasi file binary di folder device
        try {
            const stats = await fs.stat(finalBinaryDest);
            const fileSize = (stats.size / 1024).toFixed(2);
            
            console.log(`[${new Date().toISOString()}] ✅ Binary verification successful: ${fileSize} KB`);
            
            res.json({
                success: true,
                message: 'Sketch compiled and moved successfully',
                deviceId: deviceId,
                binaryPath: finalBinaryDest,
                fileSize: `${fileSize} KB`,
                downloadUrl: `/api/download-binary/${deviceId}`
            });
            
        } catch (error) {
            console.log(`[${new Date().toISOString()}] ❌ Binary verification failed:`, error);
            return res.status(500).json({
                success: false,
                error: 'Binary verification failed',
                message: error.message
            });
        }

    } catch (error) {
        console.error(`[${new Date().toISOString()}] 💥 Error in sketch-mover:`, error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
}

// Fungsi untuk mendapatkan status kompilasi
async function getCompilationStatus(deviceId) {
    const binaryPath = path.join(__dirname, '..', 'database', 'device', deviceId, 'ESP-01S.bin');
    
    try {
        await fs.access(binaryPath);
        const stats = await fs.stat(binaryPath);
        
        return {
            compiled: true,
            binaryPath: binaryPath,
            fileSize: stats.size,
            lastModified: stats.mtime
        };
    } catch (error) {
        return {
            compiled: false,
            error: 'Binary not found'
        };
    }
}

module.exports = {
    handleRequest,
    getCompilationStatus
};
