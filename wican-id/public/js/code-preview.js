// DOM Elements
const pageTitle = document.getElementById('pageTitle');
const pageDescription = document.getElementById('pageDescription');
const deviceInfo = document.getElementById('deviceInfo');
const codeFileName = document.getElementById('codeFileName');
const codeContent = document.getElementById('codeContent');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const backBtn = document.getElementById('backBtn');
const downloadBtn = document.getElementById('downloadBtn');
const programBtn = document.getElementById('programBtn');
const toast = document.getElementById('toast');
let isCodeReady = false;

// Info elements
const infoDeviceId = document.getElementById('infoDeviceId');
const infoCustomName = document.getElementById('infoCustomName');
const infoStatus = document.getElementById('infoStatus');
const infoCreatedAt = document.getElementById('infoCreatedAt');

// Get device ID from URL
const urlParams = new URLSearchParams(window.location.search);
const deviceId = urlParams.get('deviceId');

// Event Listeners
backBtn.addEventListener('click', () => {
    window.history.back();
});

copyCodeBtn.addEventListener('click', copyCodeToClipboard);
downloadBtn.addEventListener('click', downloadCode);

// Update program button link
if (deviceId) {
    programBtn.href = `esp-flasher.html?deviceId=${deviceId}`;
}

// Initialize page
if (deviceId) {
    loadDeviceInfo();
    loadCodePreview();
} else {
    showToast('ID Perangkat tidak ditemukan di URL', 'error');
    setTimeout(() => {
        window.location.href = 'add-device.html';
    }, 2000);
}

// Load device information
async function loadDeviceInfo() {
    try {
        const response = await fetch(`/api/device-info/${deviceId}`);
        const result = await response.json();
        
        if (result.success && result.device.exists) {
            const meta = result.device.meta;
            
            infoDeviceId.textContent = meta.ESPID;
            infoCustomName.textContent = meta.customName;
            
            // Format status dengan badge
            if (meta.NodeStatus === 'online') {
                infoStatus.innerHTML = `<span class="status-badge status-online">${meta.NodeStatus.toUpperCase()}</span>`;
            } else {
                infoStatus.innerHTML = `<span class="status-badge status-offline">${meta.NodeStatus.toUpperCase()}</span>`;
            }
            
            infoCreatedAt.textContent = new Date(meta.createdAt).toLocaleString('id-ID');
            
            pageTitle.textContent = `Preview Kode: ${meta.customName}`;
            pageDescription.textContent = `Kode sumber untuk perangkat ${meta.ESPID}`;
            codeFileName.innerHTML = `<i class="fas fa-file-code file-icon"></i> ${deviceId}.ino`;
            
        } else {
            showToast('Informasi perangkat tidak ditemukan', 'error');
        }
    } catch (error) {
        console.error('Error loading device info:', error);
        showToast('Gagal memuat informasi perangkat', 'error');
    }
}

// Load code preview dengan highlight.js
async function loadCodePreview() {
    try {
        isCodeReady = false;
        codeContent.textContent = '// Memuat kode sumber...';
        
        const response = await fetch(`/api/code-preview/${deviceId}`);
        const result = await response.json();
        
        if (result.success) {
            // Set kode ke element
            codeContent.textContent = result.code;
            isCodeReady = true;
            
            // Terapkan highlight.js
            hljs.highlightElement(codeContent);
            
            // Tambahkan class tambahan untuk Arduino spesifik jika diperlukan
            codeContent.parentElement.classList.add('hljs');
            
            showToast('Kode sumber berhasil dimuat', 'success');
        } else {
            codeContent.textContent = '// Error loading code';
            isCodeReady = false;
            showToast('Gagal memuat kode sumber', 'error');
        }
    } catch (error) {
        console.error('Error loading code preview:', error);
        codeContent.textContent = '// Error: Gagal memuat kode sumber';
        isCodeReady = false;
        showToast('Gagal memuat kode sumber', 'error');
    }
}

async function writeTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.top = '-1000px';
    textArea.style.left = '-1000px';
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);
    return copied;
}

// Copy code to clipboard
async function copyCodeToClipboard() {
    try {
        const code = codeContent.textContent;
        if (!isCodeReady || !code || code.includes('// Memuat kode sumber')) {
            showToast('Kode belum siap untuk disalin', 'error');
            return;
        }

        await writeTextToClipboard(code);
        
        // Visual feedback
        const originalText = copyCodeBtn.innerHTML;
        copyCodeBtn.innerHTML = '<i class="fas fa-check"></i> Tersalin!';
        copyCodeBtn.classList.add('copied');
        
        showToast('Kode berhasil disalin ke clipboard', 'success');
        
        setTimeout(() => {
            copyCodeBtn.innerHTML = originalText;
            copyCodeBtn.classList.remove('copied');
        }, 2000);
    } catch (error) {
        console.error('Error copying code:', error);
        showToast('Gagal menyalin kode', 'error');
    }
}

// Download code
async function downloadCode() {
    try {
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<span class="loading"></span> Mengunduh...';
        downloadBtn.disabled = true;
        
        const response = await fetch(`/api/download-code/${deviceId}`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${deviceId}.ino`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showToast('Kode berhasil di-download', 'success');
        } else {
            const error = await response.json();
            showToast(error.error || 'Gagal mendownload kode', 'error');
        }
    } catch (error) {
        console.error('Error downloading code:', error);
        showToast('Gagal mendownload kode', 'error');
    } finally {
        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download Kode';
        downloadBtn.disabled = false;
    }
}

// Show toast notification
function showToast(message, type = "info") {
    const icon = type === 'success' ? 'fas fa-check-circle' : 
                type === 'error' ? 'fas fa-exclamation-circle' : 
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
