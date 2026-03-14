const fs = require('fs').promises;
const fsConstants = require('fs').constants;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const ESP8266_INDEX_URL = 'http://arduino.esp8266.com/stable/package_esp8266com_index.json';
const CORE_HEADERS = new Set(['ESP8266WiFi.h', 'ESP8266HTTPClient.h', 'WiFiClient.h']);
const COMPILER_LIST_FILENAME = 'compiler-list.properties';
const COMPILER_LIST_DEFAULT = {
    'ESP8266-Core': 'NONE',
    'ArduinoJson.h-Lib': 'NONE',
    'WiFiClient.h-Lib': 'NONE',
    'ESP8266HTTPClient.h-Lib': 'NONE',
    'ESP8266WiFi.h-Lib': 'NONE',
    'Final-Check': 'NONE' // <-- Tambahan state baru
};
const LIBRARIES_BY_HEADER = {
    'ArduinoJson.h': ['ArduinoJson'],
    'ESP8266WiFi.h': [],
    'ESP8266HTTPClient.h': [],
    'WiFiClient.h': []
};

async function compileSketch() {
    console.log(`[${new Date().toISOString()}] 🚀 Starting ESP-01S compilation process...`);
    
    try {
        // Path konfigurasi
        const basePath = path.join(__dirname);
        const sketchSourcePath = path.join(basePath, 'arduino-cli', 'sketch', 'ESP-01S.ino');
        const compilerPath = path.join(basePath, 'sketch-compiler', 'sketch-compiler.ino');
        const arduinoCliWindows = path.join(basePath, 'arduino-cli', 'arduino-cli.exe');
        const arduinoCliLinux = path.join(basePath, 'arduino-cli', 'arduino-cli');
        const outputDir = path.join(basePath, 'sketch-compiler');
        const binDir = path.join(basePath, 'bin');
        const finalBinaryPath = path.join(binDir, 'ESP-01S.bin');
        const compilerDir = path.dirname(compilerPath);
        const cliDataDir = path.join(basePath, 'arduino-cli', '.data');
        const cliDownloadsDir = path.join(basePath, 'arduino-cli', '.downloads');
        const cliUserDir = path.join(basePath, 'arduino-cli', '.user');
        const compilerListPath = path.join(basePath, COMPILER_LIST_FILENAME);

        // Pastikan folder kerja compiler tersedia
        await fs.mkdir(compilerDir, { recursive: true });
        await fs.mkdir(outputDir, { recursive: true });
        await fs.mkdir(binDir, { recursive: true });
        await fs.mkdir(cliDataDir, { recursive: true });
        await fs.mkdir(cliDownloadsDir, { recursive: true });
        await fs.mkdir(cliUserDir, { recursive: true });

        // 1. Cek file sketch source
        console.log(`[${new Date().toISOString()}] 🔍 Checking for source sketch...`);
        try {
            await fs.access(sketchSourcePath);
            console.log(`[${new Date().toISOString()}] ✅ Source sketch found`);
        } catch (error) {
            console.log(`[${new Date().toISOString()}] ❌ No source sketch found at: ${sketchSourcePath}`);
            return { success: false, error: 'Source sketch not found' };
        }

        // 2. Pindahkan sketch ke compiler folder
        console.log(`[${new Date().toISOString()}] 📁 Moving sketch to compiler folder...`);
        try {
            const sketchContent = await fs.readFile(sketchSourcePath, 'utf8');
            await fs.writeFile(compilerPath, sketchContent);
            console.log(`[${new Date().toISOString()}] ✅ Sketch moved to compiler folder`);
        } catch (error) {
            console.log(`[${new Date().toISOString()}] ❌ Failed to move sketch:`, error);
            return { success: false, error: 'Failed to move sketch' };
        }

        // 3. Cek sistem operasi
        const isWindows = process.platform === 'win32';
        const isLinux = process.platform === 'linux';
        
        let arduinoCliPath;
        
        if (isWindows) {
            console.log(`[${new Date().toISOString()}] 🖥️  Windows system detected`);
            arduinoCliPath = arduinoCliWindows;
        } else if (isLinux) {
            console.log(`[${new Date().toISOString()}] 🐧 Linux system detected`);
            arduinoCliPath = arduinoCliLinux;
        } else {
            console.log(`[${new Date().toISOString()}] ⚠️  Unsupported OS: ${process.platform}`);
            return { success: false, error: 'Unsupported operating system' };
        }

        // 4. Cek apakah arduino-cli ada
        try {
            const accessMode = isLinux ? fsConstants.X_OK : fsConstants.F_OK;
            await fs.access(arduinoCliPath, accessMode);
            console.log(`[${new Date().toISOString()}] ✅ Arduino CLI found at: ${arduinoCliPath}`);
        } catch (error) {
            console.log(`[${new Date().toISOString()}] ❌ Arduino CLI not found at: ${arduinoCliPath}`);
            return { success: false, error: 'Arduino CLI not found' };
        }

        const cliExecOptions = {
            cwd: basePath,
            maxBuffer: 50 * 1024 * 1024,
            timeout: 10 * 60 * 1000,
            env: {
                ...process.env,
                ARDUINO_DIRECTORIES_DATA: cliDataDir,
                ARDUINO_DIRECTORIES_DOWNLOADS: cliDownloadsDir,
                ARDUINO_DIRECTORIES_USER: cliUserDir
            }
        };

        // 4.1 Gunakan file status dependency untuk setup sekali di awal.
        let dependencyStatus = await loadOrInitCompilerList(compilerListPath);
        const coreReady = await isEsp8266CoreReady(cliDataDir);
        const pythonReady = await isEsp8266PythonToolReady(cliDataDir);
        const arduinoJsonReady = await isArduinoJsonReady(cliUserDir);
        const dependenciesOk = isCompilerListReady(dependencyStatus) && coreReady && pythonReady && arduinoJsonReady;

        if (!dependenciesOk) {
            console.log(`[${new Date().toISOString()}] ⚙️  Dependency status not ready. Installing required compiler dependencies...`);
            await ensureAllCompilerDependenciesInstalled(arduinoCliPath, cliExecOptions);
            
            dependencyStatus = toAllOkCompilerList();
            dependencyStatus['Final-Check'] = 'NONE'; // Paksa NONE agar proses final check tetap berjalan di instalasi baru
            await saveCompilerList(compilerListPath, dependencyStatus);
            console.log(`[${new Date().toISOString()}] ✅ Dependencies installed, proceeding to Final-Check...`);
        }

        // --- MULAI TAMBAHAN LOGIKA FINAL CHECK ---
        if (dependencyStatus['Final-Check'] !== 'OK') {
            console.log(`[${new Date().toISOString()}] 🔍 Final-Check status is NONE. Running final check sequence...`);
            await runFinalCheckSequence(arduinoCliPath, basePath, cliExecOptions);
            
            dependencyStatus['Final-Check'] = 'OK';
            await saveCompilerList(compilerListPath, dependencyStatus);
            console.log(`[${new Date().toISOString()}] ✅ Final-Check updated to OK in compiler-list.properties`);
        }
        // --- AKHIR TAMBAHAN LOGIKA FINAL CHECK ---

        // 5. Jalankan perintah kompilasi
        // Hindari -v default karena output terlalu besar dapat memicu maxBuffer error di Docker.
        const enableVerbose = process.env.ARDUINO_VERBOSE === '1';
        const verboseFlag = enableVerbose ? ' -v' : '';
        const compileTarget = path.dirname(compilerPath);
        const compileCommand =
            `"${arduinoCliPath}" compile --fqbn esp8266:esp8266:generic "${compileTarget}" --output-dir "${outputDir}" --additional-urls "${ESP8266_INDEX_URL}"${verboseFlag}`;
        
        console.log(`[${new Date().toISOString()}] ⚙️  Compiling sketch...`);
        console.log(`[${new Date().toISOString()}] 📝 Command: ${compileCommand}`);

        try {
            let compileResult;
            let compileAttempt = 0;
            const maxCompileAttempt = 3;

            while (compileAttempt < maxCompileAttempt) {
                compileAttempt += 1;
                try {
                    compileResult = await execAsync(compileCommand, cliExecOptions);
                    break;
                } catch (compileError) {
                    if (isMissingEsp8266PlatformError(compileError) && compileAttempt < maxCompileAttempt) {
                        console.log(`[${new Date().toISOString()}] ⚠️  ESP8266 core belum terpasang. Menjalankan auto-install...`);
                        await ensureEsp8266PlatformInstalled(arduinoCliPath, cliExecOptions, 60 * 60 * 1000);
                        dependencyStatus = {
                            ...dependencyStatus,
                            'ESP8266-Core': 'OK',
                            'WiFiClient.h-Lib': 'OK',
                            'ESP8266HTTPClient.h-Lib': 'OK',
                            'ESP8266WiFi.h-Lib': 'OK'
                        };
                        await saveCompilerList(compilerListPath, dependencyStatus);
                        console.log(`[${new Date().toISOString()}] 🔁 Retry compile setelah install core...`);
                        continue;
                    }

                    const missingHeaders = getMissingRequiredHeaders(compileError);
                    if (missingHeaders.length > 0 && compileAttempt < maxCompileAttempt) {
                        console.log(`[${new Date().toISOString()}] ⚠️  Library header hilang terdeteksi: ${missingHeaders.join(', ')}`);
                        await ensureRequiredLibrariesInstalled(
                            arduinoCliPath,
                            cliExecOptions,
                            missingHeaders,
                            15 * 60 * 1000
                        );
                        if (missingHeaders.includes('ArduinoJson.h')) {
                            dependencyStatus = {
                                ...dependencyStatus,
                                'ArduinoJson.h-Lib': 'OK'
                            };
                            await saveCompilerList(compilerListPath, dependencyStatus);
                        }
                        console.log(`[${new Date().toISOString()}] 🔁 Retry compile setelah setup library...`);
                        continue;
                    }

                    throw compileError;
                }
            }

            const { stdout, stderr } = compileResult;

            if (stdout) {
                console.log(`[${new Date().toISOString()}] ℹ️  Compiler stdout:\n${stdout}`);
            }

            if (stderr) {
                console.log(`[${new Date().toISOString()}] ⚠️  Compilation warnings:`, stderr);
            }

            // --- JURUS DELAY 5 DETIK AGAR FILE TIDAK CORRUPT ---
            console.log(`[${new Date().toISOString()}] ✅ Compilation completed. Waiting 5 seconds for file stabilization...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            // --------------------------------------------------

            // 6. Cek file binary hasil kompilasi
            const binaryFile = path.join(outputDir, 'sketch-compiler.ino.bin');
            
            try {
                await fs.access(binaryFile);
                console.log(`[${new Date().toISOString()}] ✅ Binary file found: ${binaryFile}`);
            } catch (error) {
                console.log(`[${new Date().toISOString()}] ❌ Compiled binary not found at: ${binaryFile}`);
                
                // Coba cari file bin dengan pattern lain
                try {
                    const files = await fs.readdir(outputDir);
                    const binFiles = files.filter(f => f.endsWith('.bin'));
                    
                    if (binFiles.length > 0) {
                        console.log(`[${new Date().toISOString()}] 🔍 Found alternative binary files:`, binFiles);
                        const alternativeBin = path.join(outputDir, binFiles[0]);
                        
                        // Buat folder bin jika belum ada
                        await fs.mkdir(binDir, { recursive: true });
                        
                        // Pindahkan dan rename file
                        await fs.copyFile(alternativeBin, finalBinaryPath);
                        console.log(`[${new Date().toISOString()}] ✅ Binary saved to: ${finalBinaryPath}`);
                        
                        // Bersihkan file
                        await cleanupFiles(sketchSourcePath, outputDir);
                        return { success: true, binaryPath: finalBinaryPath };
                    }
                } catch (searchError) {
                    // Ignore search errors
                }
                
                return { success: false, error: 'Compiled binary not found' };
            }

            // 7. Buat folder bin jika belum ada
            try {
                await fs.mkdir(binDir, { recursive: true });
                console.log(`[${new Date().toISOString()}] ✅ Bin directory ready`);
            } catch (error) {
                // Folder sudah ada
            }

            // 8. Pindahkan dan rename file binary
            console.log(`[${new Date().toISOString()}] 📦 Moving binary to bin folder...`);
            await fs.copyFile(binaryFile, finalBinaryPath);
            console.log(`[${new Date().toISOString()}] ✅ Binary saved to: ${finalBinaryPath}`);

            // 9. Bersihkan file temporary
            await cleanupFiles(sketchSourcePath, outputDir);

            console.log(`[${new Date().toISOString()}] 🎉 Compilation process completed successfully!`);
            return { success: true, binaryPath: finalBinaryPath };

        } catch (error) {
            const detailText = formatErrorDetails(error);
            console.error(`[${new Date().toISOString()}] ❌ Compilation failed:\n${detailText}`);
            return { success: false, error: detailText };
        }

    } catch (error) {
        console.error(`[${new Date().toISOString()}] 💥 Unexpected error in compiler:`, error);
        return { success: false, error: error.message };
    }
}

async function loadOrInitCompilerList(filePath) {
    try {
        await fs.access(filePath);
    } catch (error) {
        return { ...COMPILER_LIST_DEFAULT };
    }

    try {
        const content = await fs.readFile(filePath, 'utf8');
        const parsed = parseCompilerList(content);
        return {
            ...COMPILER_LIST_DEFAULT,
            ...parsed
        };
    } catch (error) {
        return { ...COMPILER_LIST_DEFAULT };
    }
}

function parseCompilerList(content) {
    const result = {};
    const lines = String(content || '').split(/\r?\n/);

    for (const lineRaw of lines) {
        const line = lineRaw.trim();
        if (!line || line.startsWith('#')) continue;
        const eqIndex = line.indexOf('=');
        if (eqIndex < 0) continue;
        const key = line.slice(0, eqIndex).trim();
        const value = line.slice(eqIndex + 1).trim().toUpperCase();
        if (Object.prototype.hasOwnProperty.call(COMPILER_LIST_DEFAULT, key)) {
            result[key] = value === 'OK' ? 'OK' : 'NONE';
        }
    }

    return result;
}

function serializeCompilerList(statusObj) {
    return Object.keys(COMPILER_LIST_DEFAULT)
        .map((key) => `${key} = ${(statusObj[key] || 'NONE').toUpperCase() === 'OK' ? 'OK' : 'NONE'}`)
        .join('\n') + '\n';
}

async function saveCompilerList(filePath, statusObj) {
    const merged = {
        ...COMPILER_LIST_DEFAULT,
        ...(statusObj || {})
    };
    await fs.writeFile(filePath, serializeCompilerList(merged), 'utf8');
}

function isCompilerListReady(statusObj) {
    return Object.keys(COMPILER_LIST_DEFAULT).every(
        (key) => String(statusObj[key] || '').toUpperCase() === 'OK'
    );
}

function toAllOkCompilerList() {
    return Object.keys(COMPILER_LIST_DEFAULT).reduce((acc, key) => {
        acc[key] = 'OK';
        return acc;
    }, {});
}

async function ensureAllCompilerDependenciesInstalled(arduinoCliPath, execOptions) {
    await ensureEsp8266PlatformInstalled(arduinoCliPath, execOptions, 60 * 60 * 1000);
    await ensureRequiredLibrariesInstalled(
        arduinoCliPath,
        execOptions,
        ['ArduinoJson.h', 'WiFiClient.h', 'ESP8266HTTPClient.h', 'ESP8266WiFi.h'],
        15 * 60 * 1000
    );
}

async function isEsp8266CoreReady(cliDataDir) {
    try {
        const coreDir = path.join(cliDataDir, 'packages', 'esp8266', 'hardware', 'esp8266');
        const coreVersions = await fs.readdir(coreDir);
        return coreVersions.length > 0;
    } catch (error) {
        return false;
    }
}

async function isEsp8266PythonToolReady(cliDataDir) {
    try {
        const toolsDir = path.join(cliDataDir, 'packages', 'esp8266', 'tools', 'python3');
        const versions = await fs.readdir(toolsDir);
        for (const version of versions) {
            const pythonPath = path.join(toolsDir, version, 'python3');
            try {
                await fs.access(pythonPath, fsConstants.X_OK);
                return true;
            } catch (error) {
                // keep checking other versions
            }
        }
        return false;
    } catch (error) {
        return false;
    }
}

async function isArduinoJsonReady(cliUserDir) {
    try {
        const libDir = path.join(cliUserDir, 'libraries', 'ArduinoJson');
        await fs.access(libDir);
        return true;
    } catch (error) {
        return false;
    }
}

async function ensureEsp8266PlatformInstalled(arduinoCliPath, execOptions, timeoutMs = 60 * 60 * 1000) {
    const now = new Date().toISOString();
    console.log(`[${now}] ⚙️  Installing ESP8266 platform (timeout ${Math.floor(timeoutMs / 1000)}s per command)...`);

    const updateIndexCommand =
        `"${arduinoCliPath}" core update-index --additional-urls "${ESP8266_INDEX_URL}"`;
    const installCoreCommand =
        `"${arduinoCliPath}" core install esp8266:esp8266 --additional-urls "${ESP8266_INDEX_URL}"`;

    const installExecOptions = {
        ...execOptions,
        timeout: timeoutMs
    };

    try {
        const updateResult = await execAsync(updateIndexCommand, installExecOptions);
        if (updateResult && updateResult.stdout) {
            console.log(`[${new Date().toISOString()}] ℹ️  core update-index output:\n${updateResult.stdout}`);
        }

        const installResult = await execAsync(installCoreCommand, installExecOptions);
        if (installResult && installResult.stdout) {
            console.log(`[${new Date().toISOString()}] ℹ️  core install output:\n${installResult.stdout}`);
        }

        console.log(`[${new Date().toISOString()}] ✅ ESP8266 platform installed`);
    } catch (error) {
        throw new Error(formatErrorDetails(error));
    }
}

function isMissingEsp8266PlatformError(error) {
    const text = formatErrorDetails(error).toLowerCase();
    return (
        text.includes("platform 'esp8266:esp8266' not found") ||
        text.includes('platform esp8266:esp8266 is not found') ||
        text.includes('platform not installed')
    );
}

async function ensureRequiredLibrariesInstalled(arduinoCliPath, execOptions, missingHeaders, timeoutMs = 15 * 60 * 1000) {
    const installExecOptions = {
        ...execOptions,
        timeout: timeoutMs
    };
    const missingSet = new Set(missingHeaders);

    // Header core ESP8266 biasanya ikut platform, jadi pastikan core valid.
    const needCoreCheck = [...missingSet].some((header) => CORE_HEADERS.has(header));
    if (needCoreCheck) {
        console.log(`[${new Date().toISOString()}] ℹ️  Missing core header detected, re-checking ESP8266 platform...`);
        await ensureEsp8266PlatformInstalled(arduinoCliPath, execOptions, 60 * 60 * 1000);
    }

    const libsToInstall = new Set();
    for (const header of missingSet) {
        const libs = LIBRARIES_BY_HEADER[header] || [];
        for (const libName of libs) {
            if (libName) libsToInstall.add(libName);
        }
    }

    for (const libName of libsToInstall) {
        const installLibCommand = `"${arduinoCliPath}" lib install "${libName}"`;
        try {
            const { stdout, stderr } = await execAsync(installLibCommand, installExecOptions);
            if (stdout) {
                console.log(`[${new Date().toISOString()}] ℹ️  lib install (${libName}) output:\n${stdout}`);
            }
            if (stderr) {
                console.log(`[${new Date().toISOString()}] ⚠️  lib install (${libName}) warning:\n${stderr}`);
            }
            console.log(`[${new Date().toISOString()}] ✅ Library installed/ready: ${libName}`);
        } catch (error) {
            const detail = formatErrorDetails(error);
            throw new Error(`Library install failed (${libName}): ${detail}`);
        }
    }
}

function getMissingRequiredHeaders(error) {
    const detail = formatErrorDetails(error);
    const missing = [];
    for (const header of Object.keys(LIBRARIES_BY_HEADER)) {
        const escapedHeader = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`fatal error:\\s*${escapedHeader}:\\s*no such file or directory`, 'i');
        if (pattern.test(detail)) {
            missing.push(header);
        }
    }
    return missing;
}

function formatErrorDetails(error) {
    const stderrText = (error && error.stderr) ? String(error.stderr) : '';
    const stdoutText = (error && error.stdout) ? String(error.stdout) : '';
    const messageText = (error && error.message) ? String(error.message) : 'unknown error';
    return [
        `message=${messageText}`,
        stderrText ? `stderr=${stderrText}` : '',
        stdoutText ? `stdout=${stdoutText}` : ''
    ].filter(Boolean).join('\n');
}

async function cleanupFiles(sketchSourcePath, outputDir) {
    try {
        // Hapus file source sketch
        await fs.unlink(sketchSourcePath);
        console.log(`[${new Date().toISOString()}] 🗑️  Deleted source sketch`);

        // Hapus semua file di folder sketch-compiler
        const files = await fs.readdir(outputDir);
        for (const file of files) {
            const filePath = path.join(outputDir, file);
            await fs.unlink(filePath);
        }
        console.log(`[${new Date().toISOString()}] 🗑️  Cleared sketch-compiler folder`);

    } catch (error) {
        console.log(`[${new Date().toISOString()}] ⚠️  Warning during cleanup:`, error.message);
    }
}

// --- FUNGSI BARU UNTUK MENJALANKAN FINAL CHECK ---
async function runFinalCheckSequence(arduinoCliPath, basePath, execOptions) {
    const cliDir = path.join(basePath, 'arduino-cli');
    const dataDir = path.join(cliDir, '.data');
    const stagingDir = path.join(cliDir, 'staging');

    console.log(`[${new Date().toISOString()}] 🧹 Cleaning up .data and staging directories...`);
    try {
        // Menggunakan fs.rm bawaan Node.js sebagai pengganti 'sudo rm -rf'
        await fs.rm(dataDir, { recursive: true, force: true });
        await fs.rm(stagingDir, { recursive: true, force: true });
        console.log(`[${new Date().toISOString()}] ✅ Cleanup completed.`);
    } catch (err) {
        console.log(`[${new Date().toISOString()}] ⚠️  Cleanup note: ${err.message}`);
    }

    console.log(`[${new Date().toISOString()}] ⚙️  Initializing arduino-cli config...`);
    try {
        await execAsync(`"${arduinoCliPath}" config init --overwrite`, execOptions);
    } catch (err) {
        console.log(`[${new Date().toISOString()}] ⚠️  Config init note:`, err.message);
    }

    console.log(`[${new Date().toISOString()}] ⬇️  Updating core index...`);
    await execAsync(`"${arduinoCliPath}" core update-index --additional-urls "${ESP8266_INDEX_URL}"`, execOptions);

    console.log(`[${new Date().toISOString()}] 📦 Installing esp8266 core...`);
    await execAsync(`"${arduinoCliPath}" core install esp8266:esp8266 --additional-urls "${ESP8266_INDEX_URL}"`, execOptions);
}
// --------------------------------------------------

// Jika file dijalankan langsung
if (require.main === module) {
    compileSketch().then(result => {
        if (result.success) {
            console.log(`[${new Date().toISOString()}] 🎉 Compilation successful! Binary at: ${result.binaryPath}`);
            process.exit(0);
        } else {
            console.error(`[${new Date().toISOString()}] ❌ Compilation failed: ${result.error}`);
            process.exit(1);
        }
    });
}

module.exports = {
    compileSketch,
    cleanupFiles
};