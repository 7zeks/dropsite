// 1. Skopiowana konfiguracja
const firebaseConfig = {
  apiKey: "AIzaSyAm1X3V10ImJ_RVaIqRpcFqRjlyg9vA5yI",
  authDomain: "filmy-zk.firebaseapp.com",
  projectId: "filmy-zk",
  storageBucket: "filmy-zk.firebasestorage.app",
  messagingSenderId: "168407000386",
  appId: "1:168407000386:web:9220f943400263461394db",
  measurementId: "G-TLSHRQH647"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// 2. Obsługa okienka logowania
const auth = firebase.auth();
const loginBtn = document.getElementById('loginBtn');
const loginModalWrap = document.getElementById('loginModalWrap');
const closeLoginModal = document.getElementById('closeLoginModal');
const doLoginBtn = document.getElementById('doLoginBtn');
const loginError = document.getElementById('loginError');

if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        if (document.body.classList.contains('is-admin')) {
            auth.signOut();
        } else {
            loginModalWrap.removeAttribute('hidden');
        }
    });
}

if (closeLoginModal) {
    closeLoginModal.addEventListener('click', () => {
        loginModalWrap.setAttribute('hidden', '');
        loginError.textContent = '';
    });
}

if (doLoginBtn) {
    doLoginBtn.addEventListener('click', () => {
        const email = document.getElementById('adminEmail').value;
        const pass = document.getElementById('adminPass').value;
        loginError.textContent = '';
        
        auth.signInWithEmailAndPassword(email, pass)
            .then(() => {
                loginModalWrap.setAttribute('hidden', '');
            })
            .catch(error => {
    loginError.textContent = error.message; // Teraz pokaże prawdziwy powód!
    console.error("Błąd Firebase:", error.code, error.message);
});
    });
}

// 3. Nasłuchiwanie czy jesteś zalogowany
auth.onAuthStateChanged(user => {
    const btnText = loginBtn ? loginBtn.querySelector('span') : null;
    const openModBtn = document.getElementById('openModBtn');

    if (user) {
        document.body.classList.add('is-admin');
        if (btnText) btnText.textContent = 'Logout';
        if (openModBtn) openModBtn.style.display = 'flex'; // Pokazuje przycisk Modera
    } else {
        document.body.classList.remove('is-admin');
        if (btnText) btnText.textContent = 'Login';
        if (openModBtn) openModBtn.style.display = 'none'; // Ukrywa przycisk Modera
    }
});

let currentFreeSpace = 10737418240; // Domyślnie 10 GB
const WORKER_URL = 'https://uploud-api.yytjarus.workers.dev';

// Główne elementy UI
const uploadBtn = document.getElementById('uploadBtn');
const statusDiv = document.getElementById('status');
const successFlow = document.getElementById('successFlow');
const dropzone = document.getElementById('dropzone');
const optionsContainer = document.querySelector('.options-container');

const fileStatusBox = document.getElementById('fileStatusBox');
const fsName = document.getElementById('fsName');
const fsSizeOrProgress = document.getElementById('fsSizeOrProgress');
const fsTrack = document.getElementById('fsTrack');
const fsProgressBar = document.getElementById('fsProgressBar');

// Zapisujemy oryginalny stan Dropzone
const originalDropzoneHtml = dropzone.innerHTML;
let selectedFile = null;

function formatBytes(bytes) {
    if (bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
}

// === SYSTEM DŹWIĘKÓW INTERFEJSU (WEB AUDIO API) ===
let soundEnabled = localStorage.getItem('dropsite_sound_enabled') !== 'false';
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playSound(type) {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        if (type === 'drop') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(190, now);
            osc.frequency.exponentialRampToValueAtTime(70, now + 0.12);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.12);
        } else if (type === 'success') {
            const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
            notes.forEach((freq, i) => {
                const noteOsc = ctx.createOscillator();
                const noteGain = ctx.createGain();
                noteOsc.type = 'sine';
                noteOsc.frequency.setValueAtTime(freq, now + i * 0.08);
                noteGain.gain.setValueAtTime(0.2, now + i * 0.08);
                noteGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
                noteOsc.connect(noteGain);
                noteGain.connect(ctx.destination);
                noteOsc.start(now + i * 0.08);
                noteOsc.stop(now + i * 0.08 + 0.3);
            });
        } else if (type === 'copy') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(900, now);
            osc.frequency.exponentialRampToValueAtTime(1300, now + 0.06);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.06);
        }
    } catch (e) {
        console.warn('Audio error:', e);
    }
}

// Przełącznik wyciszenia w nawigacji
const soundToggleBtn = document.getElementById('soundToggleBtn');
const soundIconOn = document.getElementById('soundIconOn');
const soundIconOff = document.getElementById('soundIconOff');

function updateSoundButtonUI() {
    if (soundIconOn && soundIconOff) {
        soundIconOn.hidden = !soundEnabled;
        soundIconOff.hidden = soundEnabled;
    }
}

if (soundToggleBtn) {
    updateSoundButtonUI();
    soundToggleBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        localStorage.setItem('dropsite_sound_enabled', soundEnabled);
        updateSoundButtonUI();
        if (soundEnabled) playSound('copy');
    });
}

// === KOMPRESJA ZDJĘĆ PRZEZ CANVAS ===
let originalImageFile = null;
let currentCompressionQuality = 0.8;

const imageCompressPanel = document.getElementById('imageCompressPanel');
const compressToggleCheckbox = document.getElementById('compressToggleCheckbox');
const compressQualitySlider = document.getElementById('compressQualitySlider');
const compressQualityLabel = document.getElementById('compressQualityLabel');
const estCompressedSize = document.getElementById('estCompressedSize');

function setupImageCompression(file) {
    if (file && file.type && file.type.startsWith('image/') && !file.type.includes('svg') && !file.type.includes('gif')) {
        originalImageFile = file;
        if (imageCompressPanel) imageCompressPanel.hidden = false;
        updateCompressionEstimate();
    } else {
        originalImageFile = null;
        if (imageCompressPanel) imageCompressPanel.hidden = true;
    }
}

function updateCompressionEstimate() {
    if (!originalImageFile) return;
    const q = parseInt(compressQualitySlider?.value || '80', 10);
    currentCompressionQuality = q / 100;
    if (compressQualityLabel) compressQualityLabel.textContent = `Jakość: ${q}%`;
    
    // Szacunek wagi
    const estimatedRatio = 0.15 + (q / 100) * 0.55; 
    const estSize = Math.max(1024, Math.round(originalImageFile.size * estimatedRatio));
    const savedPercent = Math.round((1 - estSize / originalImageFile.size) * 100);
    if (estCompressedSize) {
        estCompressedSize.textContent = `${formatBytes(estSize)} (ok. -${savedPercent > 0 ? savedPercent : 0}%)`;
    }
}

if (compressQualitySlider) {
    compressQualitySlider.addEventListener('input', () => {
        document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
        updateCompressionEstimate();
    });
}

document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const q = parseInt(btn.getAttribute('data-q'), 10);
        if (compressQualitySlider) compressQualitySlider.value = q;
        updateCompressionEstimate();
    });
});

async function compressImageOnCanvas(file, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            
            const maxDim = 3840;
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
                if (blob && blob.size < file.size) {
                    const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' });
                    resolve(compressedFile);
                } else {
                    resolve(file);
                }
            }, 'image/jpeg', quality);
        };
        img.onerror = () => resolve(file);
    });
}

// === WŁASNY ALIAS LINKU (SLUG TOGGLE) ===
const slugToggleBtn = document.getElementById('slugToggleBtn');
const customSlugBox = document.getElementById('customSlugBox');
const slugArrow = document.getElementById('slugArrow');
if (slugToggleBtn && customSlugBox) {
    slugToggleBtn.addEventListener('click', () => {
        const isHidden = customSlugBox.hidden;
        customSlugBox.hidden = !isHidden;
        if (slugArrow) slugArrow.textContent = isHidden ? '▲' : '▼';
    });
}

// === REKURSYWNY ODCZYT FOLDERÓW Z DROPZONE ===
async function scanFilesAndFolders(dataTransfer) {
    const items = dataTransfer.items;
    if (!items || items.length === 0) return dataTransfer.files;

    const filesArray = [];
    async function traverseFileTree(item, path = '') {
        if (item.isFile) {
            const file = await new Promise((resolve) => item.file(resolve));
            file.fullRelativePath = path + file.name;
            filesArray.push(file);
        } else if (item.isDirectory) {
            const dirReader = item.createReader();
            const entries = await new Promise((resolve) => dirReader.readEntries(resolve));
            for (const entry of entries) {
                await traverseFileTree(entry, path + item.name + '/');
            }
        }
    }

    const promises = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry ? items[i].webkitGetAsEntry() : null;
        if (item) {
            promises.push(traverseFileTree(item));
        }
    }

    if (promises.length > 0) {
        await Promise.all(promises);
        if (filesArray.length > 0) return filesArray;
    }
    return dataTransfer.files;
}

// === WYBÓR PLIKU I DUŻY PODGLĄD ===
async function updateSelectedFile(filesList) {
    if (!filesList || filesList.length === 0) return;
    
    playSound('drop');

    // Jeśli wiele plików lub folder z podkatalogami, zrób ZIP za pomocą fflate
    if (filesList.length > 1 || filesList[0]?.fullRelativePath?.includes('/')) {
        setupImageCompression(null);
        uploadBtn.disabled = true;
        const btnTextSpan = uploadBtn.querySelector('.btn-text');
        if (btnTextSpan) btnTextSpan.textContent = 'Pakowanie ZIP...';
        
        fileStatusBox.classList.add('visible'); 
        fsTrack.hidden = false; 
        fsProgressBar.style.width = '100%';
        fsName.textContent = `Paczka_folder.zip (${filesList.length} el.)`;
        fsSizeOrProgress.innerText = 'Trwa pakowanie, proszę czekać...';
        
        dropzone.innerHTML = `<div style="padding: 40px; text-align: center; font-size: 48px;">📦</div><div style="color: var(--text-muted); padding-bottom: 20px; text-align: center;">Pakowanie ${filesList.length} plików do ZIP...</div>`;
        dropzone.style.padding = "10px";

        setTimeout(async () => {
            try {
                const zipFiles = {};
                for (let i = 0; i < filesList.length; i++) {
                    const f = filesList[i];
                    const pathKey = f.fullRelativePath || f.name;
                    zipFiles[pathKey] = new Uint8Array(await f.arrayBuffer());
                }
                
                const zippedData = await new Promise((resolve, reject) => {
                    fflate.zip(zipFiles, { level: 0 }, (err, data) => {
                        if (err) reject(err);
                        else resolve(data);
                    });
                });
                
                selectedFile = new File([zippedData], `Dropsite_Paczka_${Date.now()}.zip`, { type: 'application/zip' });
                
                fsTrack.hidden = true; 
                fsProgressBar.style.width = '0%';
                fsSizeOrProgress.innerText = formatBytes(selectedFile.size);
                if (btnTextSpan) btnTextSpan.textContent = 'Upload';
                uploadBtn.disabled = false;
                
            } catch (e) {
                showError("Błąd pakowania plików");
            }
        }, 100);
        
    } else {
        selectedFile = filesList[0];
        const file = selectedFile;
        
        setupImageCompression(file);
        
        fileStatusBox.classList.add('visible'); 
        fsTrack.hidden = true; 
        fsProgressBar.style.width = '0%';
        
        fsName.textContent = file.name;
        fsSizeOrProgress.innerText = formatBytes(file.size);
        
        uploadBtn.disabled = false;
        statusDiv.textContent = '';

        if (file.type.startsWith('image/')) {
            const imgUrl = URL.createObjectURL(file);
            dropzone.innerHTML = `<img src="${imgUrl}" style="max-width: 100%; max-height: 250px; border-radius: 8px; object-fit: contain;">`;
            dropzone.style.padding = "10px";
        } else if (file.type.startsWith('video/')) {
            const vidUrl = URL.createObjectURL(file);
            dropzone.innerHTML = `<video src="${vidUrl}" controls autoplay muted loop playsinline style="max-width: 100%; max-height: 250px; border-radius: 8px; background: #000;"></video>`;
            dropzone.style.padding = "10px";
        } else {
            let icon = '📄';
            if (file.name.endsWith('.pdf')) icon = '📕';
            else if (file.name.endsWith('.zip') || file.name.endsWith('.rar')) icon = '📦';
            else if (file.name.endsWith('.js') || file.name.endsWith('.html') || file.name.endsWith('.css') || file.name.endsWith('.json')) icon = '💻';
            else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) icon = '📊';

            dropzone.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-main); font-size: 48px;">${icon}</div><div style="color: var(--text-muted); padding-bottom: 20px; text-align: center;">${file.name}</div>`;
            dropzone.style.padding = "10px";
        }
    }
}

// === DRAG & DROP (CINEMATIC) ===
const globalDragOverlay = document.getElementById('globalDragOverlay');
let dragCounter = 0;

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    window.addEventListener(eventName, (e) => e.preventDefault(), false);
});

window.addEventListener('dragenter', (e) => {
    dragCounter++;
    if (dragCounter === 1 && globalDragOverlay) {
        globalDragOverlay.classList.add('active');
    }
});

window.addEventListener('dragleave', (e) => {
    dragCounter--;
    if (dragCounter === 0 && globalDragOverlay) {
        globalDragOverlay.classList.remove('active');
    }
});

window.addEventListener('drop', async (e) => {
    dragCounter = 0;
    if (globalDragOverlay) globalDragOverlay.classList.remove('active');
    
    if (e.dataTransfer) {
        const scannedFiles = await scanFilesAndFolders(e.dataTransfer);
        if (scannedFiles && scannedFiles.length > 0) {
            updateSelectedFile(scannedFiles);
        }
    }
});

document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'fileInput') {
        if (e.target.files && e.target.files.length > 0) {
            updateSelectedFile(e.target.files);
        }
    }
});

// === NOWY SYSTEM WGRYWANIA BEZ LIMITU WAGI (Z OBSŁUGĄ MULTIPART) ===
async function uploadFile() {
    if (!selectedFile) return;

    let file = selectedFile;
    const duration = document.querySelector('input[name="duration"]:checked')?.value || '30d';
    const customSlug = document.getElementById('customSlugInput')?.value.trim() || '';

    // Obsługa kompresji obrazu przed uploadem
    if (originalImageFile && compressToggleCheckbox?.checked) {
        uploadBtn.disabled = true;
        const btnTextSpan = uploadBtn.querySelector('.btn-text');
        if (btnTextSpan) btnTextSpan.textContent = 'Kompresja grafiki...';
        file = await compressImageOnCanvas(originalImageFile, currentCompressionQuality);
        selectedFile = file;
    }

    if (file.size > currentFreeSpace) {
        showError(`Brakuje miejsca na dysku! Plik zajmuje ${formatBytes(file.size)}, a zostało tylko ${formatBytes(currentFreeSpace)} wolnego.`);
        return;
    }

    uploadBtn.disabled = true;
    uploadBtn.classList.add('loading');
    const btnTextSpan = uploadBtn.querySelector('.btn-text');
    if (btnTextSpan) btnTextSpan.textContent = 'Przygotowywanie...';
    
    fsTrack.hidden = false;
    fsProgressBar.style.width = '0%';
    fsSizeOrProgress.innerText = `0% - 0 B z ${formatBytes(file.size)}`;
    statusDiv.innerText = '';

    try {
        if (file.size <= 10 * 1024 * 1024) { 
            await uploadFileStandard(file, duration, customSlug, btnTextSpan);
        } else { 
            await uploadFileMultipart(file, duration, customSlug, btnTextSpan);
        }
    } catch (error) {
        showError(error.message);
    }
}

// === UPLOAD TRADYCYJNY DLA MAŁYCH PLIKÓW ===
async function uploadFileStandard(file, duration, customSlug, btnTextSpan) {
    let urlReq = `${WORKER_URL}/upload-small?file=${encodeURIComponent(file.name)}&expiry=${duration}`;
    if (customSlug) urlReq += `&slug=${encodeURIComponent(customSlug)}`;
    
    if (btnTextSpan) btnTextSpan.textContent = 'Wgrywanie...';

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            fsProgressBar.style.width = percentComplete + '%';
            fsSizeOrProgress.innerText = `${Math.round(percentComplete)}% - ${formatBytes(event.loaded)} z ${formatBytes(event.total)}`;
        }
    });

    xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            if (data.success) {
                showSuccessScreen(data.finalUrl, data.key, duration);
            } else {
                showError(data.message || 'Błąd serwera.');
            }
        } else {
            showError('Błąd podczas zapisu na dysku: ' + xhr.status);
        }
    });
    xhr.addEventListener("error", () => showError('Błąd połączenia podczas wgrywania.'));
    xhr.addEventListener("abort", () => showError('Wgrywanie przerwane.'));

    xhr.open("PUT", urlReq, true);
    xhr.setRequestHeader("Content-Type", file.type || 'application/octet-stream');
    xhr.send(file);
}

// === UPLOAD MULTIPART DLA DUŻYCH PLIKÓW (Niezawodny) ===
async function uploadFileMultipart(file, duration, customSlug, btnTextSpan) {
    let urlReq = `${WORKER_URL}/multipart/create?file=${encodeURIComponent(file.name)}&expiry=${duration}&size=${file.size}`;
    if (customSlug) urlReq += `&slug=${encodeURIComponent(customSlug)}`;
    
    const response = await fetch(urlReq);
    const data = await response.json();

    if (!data.success) throw new Error(data.message || "Błąd generowania sesji uploadu");
    if (btnTextSpan) btnTextSpan.textContent = 'Wgrywanie (0%)...';

    const { uploadId, key } = data;
    const CHUNK_SIZE = 10 * 1024 * 1024; 
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const parts = [];
    let uploadedBytes = 0;

    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        const partNumber = i + 1;

        const chunkData = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener("progress", (event) => {
                if (event.lengthComputable) {
                    const currentTotalUploaded = uploadedBytes + event.loaded;
                    const percentComplete = (currentTotalUploaded / file.size) * 100;
                    fsProgressBar.style.width = percentComplete + '%';
                    fsSizeOrProgress.innerText = `${Math.round(percentComplete)}% - ${formatBytes(currentTotalUploaded)} z ${formatBytes(file.size)}`;
                }
            });

            xhr.addEventListener("load", () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(new Error(`Błąd wysyłania chunka #${partNumber}`));
                }
            });
            xhr.addEventListener("error", () => reject(new Error(`Błąd sieciowy chunk #${partNumber}`)));
            
            xhr.open("PUT", `${WORKER_URL}/multipart/upload?key=${encodeURIComponent(key)}&uploadId=${uploadId}&partNumber=${partNumber}`, true);
            xhr.send(chunk);
        });

        if (!chunkData.success) {
            fetch(`${WORKER_URL}/multipart/abort?key=${encodeURIComponent(key)}&uploadId=${uploadId}`, { method: 'DELETE' }).catch(()=>{});
            throw new Error("Błąd podczas wgrywania części pliku.");
        }

        parts.push({ partNumber: chunkData.partNumber, etag: chunkData.etag });
        uploadedBytes += (end - start);
        if (btnTextSpan) btnTextSpan.textContent = `Wgrywanie (${Math.round((uploadedBytes / file.size) * 100)}%)...`;
    }

    if (btnTextSpan) btnTextSpan.textContent = 'Składanie pliku...';
    const completeRes = await fetch(`${WORKER_URL}/multipart/complete?key=${encodeURIComponent(key)}&uploadId=${uploadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts })
    });
    const completeData = await completeRes.json();

    if (!completeData.success) {
        throw new Error(completeData.message || "Błąd podczas łączenia pliku.");
    }

    showSuccessScreen(data.finalUrl, key, duration);
}

// === WSPÓLNA LOGIKA PO ZAKOŃCZENIU ===
function showSuccessScreen(finalUrlStr, fileKey, duration) {
    uploadBtn.classList.remove('loading');
    const finalLink = document.getElementById('finalLink');
    
    // Odtwórz dźwięk sukcesu!
    playSound('success');

    // Generujemy link do podstrony pobierania Dropsite
    let shareableUrl = finalUrlStr;
    if (fileKey) {
        const baseUrl = window.location.origin + window.location.pathname;
        shareableUrl = `${baseUrl}?f=${encodeURIComponent(fileKey)}`;
    }

    if (finalLink) {
        finalLink.href = shareableUrl;
        finalLink.textContent = shareableUrl;
    }

    // Zapisujemy w lokalnej historii użytkownika
    if (selectedFile) {
        saveToUserHistory({
            name: selectedFile.name,
            size: selectedFile.size,
            url: shareableUrl,
            directUrl: finalUrlStr,
            duration: duration || '30d',
            date: new Date().toISOString()
        });
    }

    setTimeout(() => {
        dropzone.hidden = true;
        if (optionsContainer) optionsContainer.hidden = true;
        if (imageCompressPanel) imageCompressPanel.hidden = true;
        const customSlugWrap = document.querySelector('.custom-slug-wrap');
        if (customSlugWrap) customSlugWrap.hidden = true;

        uploadBtn.hidden = true;
        fileStatusBox.classList.remove('visible');
        statusDiv.innerText = '';
        
        successFlow.hidden = false;
        successFlow.style.animation = 'slideInUp 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)';
        
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 120,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#C4E7D4', '#0F91D2', '#FFFFFF']
            });
        }
    }, 500);
    
    fetchDiskStats();
}

function showError(msg) {
    uploadBtn.classList.remove('loading');
    uploadBtn.disabled = false;
    const btnTextSpan = uploadBtn.querySelector('.btn-text');
    if (btnTextSpan) btnTextSpan.textContent = 'Spróbuj ponownie';
    statusDiv.style.color = "#FF4439";
    statusDiv.innerText = msg;
    fsTrack.hidden = true; 
}

// === LOGIKA DYSKU ===
async function fetchDiskStats() {
    try {
        const response = await fetch(`${WORKER_URL}/stats`);
        let data;
        if (response.ok) {
            data = await response.json();
        } else {
            data = {
                totalBytes: 549755813888, 
                usedBytes: 131342342342,  
                categories: { images: 40000000000, videos: 60000000000, documents: 15000000000, archives: 10000000000, others: 6342342342 }
            };
        }
        renderDiskStats(data);
    } catch (e) {
        console.error("Nie udało się pobrać statystyk dysku", e);
    }
}

function renderDiskStats(data) {
    const { totalBytes, usedBytes, categories } = data;
    currentFreeSpace = Math.max(0, totalBytes - usedBytes);
    
    document.getElementById('diskUsedText').innerText = `${formatBytes(usedBytes)} z ${formatBytes(totalBytes)} zajęte`;
    document.getElementById('diskFreeText').innerText = formatBytes(totalBytes - usedBytes) + " wolne";

    const storageBar = document.getElementById('storageBar');
    storageBar.innerHTML = ''; 

    const categoryColors = { images: '#0F91D2', videos: '#FF4439', documents: '#FFBC39', archives: '#59A829', others: '#48484A' };

    for (const [key, bytes] of Object.entries(categories)) {
        if (bytes > 0) {
            const percentage = (bytes / totalBytes) * 100;
            const segment = document.createElement('div');
            segment.className = 'segment';
            segment.style.width = `${percentage}%`;
            segment.style.background = categoryColors[key] || '#FFFFFF';
            segment.title = `${key}: ${formatBytes(bytes)}`;
            storageBar.appendChild(segment);
        }
    }
}

fetchDiskStats();

// === PANEL MODERACJI (DASHBOARD) ===
const modModal = document.getElementById('modModal');
const openModBtn = document.getElementById('openModBtn');
const closeModBtn = document.getElementById('closeModBtn');
const refreshModBtn = document.getElementById('refreshModBtn');
const modFileList = document.getElementById('modFileList');
const modSearchInput = document.getElementById('modSearchInput');
const modSortSelect = document.getElementById('modSortSelect');
const modFilterPills = document.getElementById('modFilterPills');

let loadedModFiles = [];
let activeCategoryFilter = 'all';
let activeSearchQuery = '';
let activeSort = 'newest';

openModBtn.addEventListener('click', () => {
    modModal.hidden = false;
    fetchModFiles();
});

closeModBtn.addEventListener('click', (e) => {
    e.preventDefault();
    modModal.hidden = true;
});

modModal.addEventListener('click', (e) => {
    if (e.target === modModal) {
        modModal.hidden = true;
    }
});

refreshModBtn.addEventListener('click', fetchModFiles);

if (modSearchInput) {
    modSearchInput.addEventListener('input', (e) => {
        activeSearchQuery = e.target.value.toLowerCase().trim();
        applyModFiltersAndRender();
    });
}

if (modSortSelect) {
    modSortSelect.addEventListener('change', (e) => {
        activeSort = e.target.value;
        applyModFiltersAndRender();
    });
}

if (modFilterPills) {
    modFilterPills.addEventListener('click', (e) => {
        const pill = e.target.closest('.mod-pill');
        if (!pill) return;
        
        modFilterPills.querySelectorAll('.mod-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeCategoryFilter = pill.getAttribute('data-filter');
        applyModFiltersAndRender();
    });
}

async function fetchModFiles() {
    refreshModBtn.innerText = 'Ładowanie...';
    
    let apiSecret = localStorage.getItem('apiSecret');
    if (!apiSecret) {
        apiSecret = prompt("Zabezpieczenie serwera: Podaj klucz API do zarządzania plikami (np. 1234):");
        if (!apiSecret) {
            refreshModBtn.innerText = 'Odśwież';
            return;
        }
        localStorage.setItem('apiSecret', apiSecret);
    }

    try {
        const response = await fetch(`${WORKER_URL}/list`, {
            headers: {
                'X-Admin-Secret': apiSecret
            }
        });
        
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('apiSecret');
            throw new Error('Nieprawidłowy klucz API! Odmowa dostępu.');
        }
        
        if (!response.ok) throw new Error('Błąd pobierania listy plików');
        
        const data = await response.json();
        loadedModFiles = data.files || [];
        updateModStats(loadedModFiles);
        applyModFiltersAndRender();
    } catch (e) {
        alert(e.message);
    } finally {
        refreshModBtn.innerText = 'Odśwież';
    }
}

// Funkcja pomocnicza do czyszczenia nazwy
function cleanFileName(filename) {
    let name = filename;
    if (name.includes('/')) name = name.substring(name.indexOf('/') + 1);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;
    if (uuidRegex.test(name)) name = name.substring(37);
    return name;
}

function getFileCategory(filename) {
    if (/\.(mp4|webm|ogg|mov|mkv|avi)$/i.test(filename)) return 'video';
    if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(filename)) return 'image';
    if (/\.(pdf|doc|docx|txt|xls|xlsx|csv|json)$/i.test(filename)) return 'doc';
    if (/\.(zip|rar|7z|tar|gz)$/i.test(filename)) return 'archive';
    return 'other';
}

function updateModStats(files) {
    let totalSize = 0;
    let counts = { all: files.length, video: 0, image: 0, doc: 0, archive: 0, other: 0 };

    files.forEach(f => {
        totalSize += f.size || 0;
        const cat = getFileCategory(f.name);
        if (counts[cat] !== undefined) counts[cat]++;
    });

    const elTotalFiles = document.getElementById('modTotalFiles');
    const elTotalSize = document.getElementById('modTotalSize');
    const elMediaCount = document.getElementById('modMediaCount');

    if (elTotalFiles) elTotalFiles.innerText = `${files.length}`;
    if (elTotalSize) elTotalSize.innerText = formatBytes(totalSize);
    if (elMediaCount) elMediaCount.innerText = `${counts.video} wideo • ${counts.image} zdjęć`;

    // Aktualizacja liczników w pigułkach filtrów
    const cAll = document.getElementById('count-all');
    const cVid = document.getElementById('count-video');
    const cImg = document.getElementById('count-image');
    const cDoc = document.getElementById('count-doc');
    const cArc = document.getElementById('count-archive');

    if (cAll) cAll.innerText = counts.all;
    if (cVid) cVid.innerText = counts.video;
    if (cImg) cImg.innerText = counts.image;
    if (cDoc) cDoc.innerText = counts.doc;
    if (cArc) cArc.innerText = counts.archive;
}

function applyModFiltersAndRender() {
    let filtered = [...loadedModFiles];

    // 1. Filtr kategorii
    if (activeCategoryFilter !== 'all') {
        filtered = filtered.filter(f => getFileCategory(f.name) === activeCategoryFilter);
    }

    // 2. Wyszukiwarka
    if (activeSearchQuery) {
        filtered = filtered.filter(f => {
            const clean = cleanFileName(f.name).toLowerCase();
            const raw = f.name.toLowerCase();
            return clean.includes(activeSearchQuery) || raw.includes(activeSearchQuery);
        });
    }

    // 3. Sortowanie
    if (activeSort === 'newest') {
        filtered.reverse(); // Cloudflare zwraca domyślnie leksykograficznie
    } else if (activeSort === 'size-desc') {
        filtered.sort((a, b) => (b.size || 0) - (a.size || 0));
    } else if (activeSort === 'size-asc') {
        filtered.sort((a, b) => (a.size || 0) - (b.size || 0));
    } else if (activeSort === 'name-asc') {
        filtered.sort((a, b) => cleanFileName(a.name).localeCompare(cleanFileName(b.name)));
    }

    renderModFilesList(filtered);
}

function renderModFilesList(files) {
    modFileList.innerHTML = ''; 
    if (files.length === 0) {
        modFileList.innerHTML = '<p style="color: var(--text-muted); text-align: center; font-size: 13px; margin: 30px 0;">Brak plików spełniających kryteria.</p>';
        return;
    }

    files.forEach(file => {
        const li = document.createElement('li');
        li.className = 'mod-file-item';
        
        const publicLink = `https://pub-c4bdff47af9f412bb44968e460266513.r2.dev/${file.name}`;        
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
        const isVideo = /\.(mp4|webm|ogg|mov|mkv)$/i.test(file.name);
        
        let previewHtml = '';
        if (isImage) {
            previewHtml = `<img src="${publicLink}" class="mod-preview-img" alt="preview" onclick="openImagePreview('${publicLink}')" title="Powiększ zdjęcie">`;
        } else if (isVideo) {
            previewHtml = `<div style="position: relative; cursor: pointer; width: 46px; height: 46px; flex-shrink: 0;" onclick="openVideoPreview('${publicLink}')" title="Odtwórz wideo">
                              <video src="${publicLink}#t=0.1" class="mod-preview-img" style="width: 100%; height: 100%; object-fit: cover; background: #000; border-radius: 6px;" muted preload="metadata"></video>
                              <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.35); border-radius: 6px;">
                                  <span style="font-size: 14px; color: white;">▶</span>
                              </div>
                           </div>`;
        } else {
            let icon = '📄';
            if (file.name.endsWith('.pdf')) icon = '📕';
            else if (file.name.endsWith('.zip') || file.name.endsWith('.rar')) icon = '📦';
            previewHtml = `<div class="mod-preview-icon">${icon}</div>`;
        }

        const displayName = cleanFileName(file.name);

        // Badge wygasania
        let expBadge = '<span class="mod-badge-exp exp-perm">♾️ Permanentny</span>';
        if (file.name.startsWith('1d/')) {
            expBadge = '<span class="mod-badge-exp exp-1d">⏳ 1 Dzień</span>';
        } else if (file.name.startsWith('30d/')) {
            expBadge = '<span class="mod-badge-exp exp-30d">📅 30 Dni</span>';
        }

        li.innerHTML = `
            <div class="mod-file-main">
                ${previewHtml}
                <div class="mod-file-info">
                    <a href="${publicLink}" target="_blank" class="mod-file-name" title="${file.name}">${displayName}</a>
                    <div class="mod-meta-row">
                        <span class="mod-badge-size">${formatBytes(file.size)}</span>
                        ${expBadge}
                    </div>
                </div>
            </div>
            <div class="mod-actions">
                <button class="btn-copy-mod" onclick="copyDirectLink('${publicLink}')" title="Kopiuj bezpośredni link">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Kopiuj
                </button>
                <button class="btn-delete" data-filename="${file.name}" onclick="handleSafeDelete(this, '${file.name}')">Usuń</button>
            </div>
        `;
        modFileList.appendChild(li);
    });
}

// Szybkie kopiowanie linku z powiadomieniem
window.copyDirectLink = function(url) {
    navigator.clipboard.writeText(url).then(() => {
        showNotification('Skopiowano link do pliku! 📋', 'success');
    }).catch(() => {
        showNotification('Nie udało się skopiować linku', 'error');
    });
};

// Bezpieczne 2-etapowe usuwanie
window.handleSafeDelete = async function(btn, filename) {
    if (!btn.classList.contains('confirming')) {
        btn.classList.add('confirming');
        btn.innerText = 'Na pewno?';
        
        const timer = setTimeout(() => {
            btn.classList.remove('confirming');
            btn.innerText = 'Usuń';
        }, 3500);

        btn._confirmTimer = timer;
        return;
    }

    // Drugie kliknięcie - usuwamy!
    clearTimeout(btn._confirmTimer);
    btn.disabled = true;
    btn.innerText = 'Usuwanie...';

    let apiSecret = localStorage.getItem('apiSecret');
    if (!apiSecret) {
        alert("Brak klucza API! Odśwież listę plików, aby się zalogować.");
        return;
    }

    try {
        const response = await fetch(`${WORKER_URL}/delete/${filename}`, { 
            method: 'DELETE',
            headers: {
                'X-Admin-Secret': apiSecret
            }
        });
        
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('apiSecret');
            alert('Nieprawidłowy klucz API! Odmowa dostępu.');
            return;
        }

        if (response.ok) {
            showNotification('Plik został usunięty 🗑️', 'success');
            fetchModFiles(); 
            fetchDiskStats(); 
        } else {
            alert('Błąd podczas usuwania pliku.');
        }
    } catch (e) {
        console.error('Błąd połączenia z serwerem:', e);
        alert('Błąd połączenia z serwerem');
    }
};

// === SUCCESS FLOW FUNCTIONS ===
function copyToClipboard() {
    const linkElement = document.getElementById('finalLink');
    if (linkElement && linkElement.href && linkElement.href !== '#') {
        navigator.clipboard.writeText(linkElement.href).then(() => {
            showNotification('Link skopiowany do schowka!', 'success');
        }).catch(() => {
            const textArea = document.createElement('textarea');
            textArea.value = linkElement.href;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('Link skopiowany do schowka!', 'success');
        });
    }
}

function shareLink() {
    const linkElement = document.getElementById('finalLink');
    if (linkElement && linkElement.href && linkElement.href !== '#' && navigator.share) {
        navigator.share({
            title: 'Przesłany plik',
            text: 'Sprawdź mój przesłany plik:',
            url: linkElement.href
        });
    } else {
        copyToClipboard();
    }
}

function resetUpload() {
    successFlow.style.animation = 'slideOutDown 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
    
    setTimeout(() => {
        successFlow.hidden = true;
        dropzone.hidden = false;
        optionsContainer.hidden = false;
        uploadBtn.hidden = false;
        
        selectedFile = null;
        dropzone.innerHTML = originalDropzoneHtml;
        dropzone.style.padding = "";
        
        const finalLink = document.getElementById('finalLink');
        if (finalLink) {
            finalLink.href = '#';
            finalLink.textContent = 'https://link...';
        }

        uploadBtn.disabled = true;
        const btnTextSpan = uploadBtn.querySelector('.btn-text');
        if (btnTextSpan) btnTextSpan.textContent = 'Upload';
        
    }, 300);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success-green)' : 'var(--accent-blue)'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 600;
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    // === MAGNETYCZNE PRZYCISKI ===
    const magneticElements = document.querySelectorAll('.btn-primary, .nav-logo');
    magneticElements.forEach(elem => {
        elem.addEventListener('mousemove', (e) => {
            const rect = elem.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            elem.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px) scale(1.02)`;
        });
        elem.addEventListener('mouseleave', () => {
            elem.style.transform = ``; // Reset to CSS default
        });
    });

    // Efekt "ripple" na przyciskach
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-primary') || e.target.classList.contains('btn-secondary')) {
            const button = e.target;
            const ripple = document.createElement('div');
            ripple.className = 'btn-ripple';
            
            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            
            button.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        }
    });
    
    const featureTags = document.querySelectorAll('.feature-tag');
    featureTags.forEach(tag => {
        tag.addEventListener('mouseenter', () => tag.style.transform = 'translateY(-2px) scale(1.05)');
        tag.addEventListener('mouseleave', () => tag.style.transform = 'translateY(0) scale(1)');
    });

    // === NOWE: LOGIKA MINIMALIZACJI WIDŻETU DYSKU ===
    const minimizeDot = document.getElementById('minimizeDot');
    const storageWidget = document.getElementById('storageWidget');

    if (minimizeDot && storageWidget) {
        minimizeDot.addEventListener('click', () => {
            storageWidget.classList.toggle('minimized');
        });
    }
});

// === PODGLĄD ZDJĘĆ W PANELU MODERACJI (LIGHTBOX) ===
window.openImagePreview = function(url) {
    let previewModal = document.getElementById('imagePreviewModal');

    if (!previewModal) {
        previewModal = document.createElement('div');
        previewModal.id = 'imagePreviewModal';
        previewModal.style.cssText = `
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(5px);
            z-index: 99999;
            justify-content: center;
            align-items: center;
            cursor: zoom-out;
        `;

        const img = document.createElement('img');
        img.id = 'imagePreviewSrc';
        img.style.cssText = `
            max-width: 90%;
            max-height: 90vh;
            border-radius: var(--radius-md, 14px);
            box-shadow: 0 24px 60px rgba(0,0,0,0.8);
            object-fit: contain;
            transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        `;

        previewModal.appendChild(img);

        previewModal.onclick = () => {
            previewModal.style.display = 'none';
            img.src = ''; 
        };

        document.body.appendChild(previewModal);
    }

    document.getElementById('imagePreviewSrc').src = url;
    previewModal.style.display = 'flex';
};

// === ODTWARZACZ WIDEO W PANELU MODERACJI ===
window.openVideoPreview = function(url) {
    let previewModal = document.getElementById('videoPreviewModal');

    if (!previewModal) {
        previewModal = document.createElement('div');
        previewModal.id = 'videoPreviewModal';
        previewModal.style.cssText = `
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(8px);
            z-index: 99999;
            justify-content: center;
            align-items: center;
            flex-direction: column;
        `;

        const videoContainer = document.createElement('div');
        videoContainer.style.cssText = `
            position: relative;
            width: 90%;
            max-width: 1000px;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute;
            top: -40px;
            right: 0;
            background: none;
            border: none;
            color: var(--text-muted, #8A8F98);
            font-size: 36px;
            cursor: pointer;
            line-height: 1;
            transition: color 0.2s;
        `;
        closeBtn.onmouseover = () => closeBtn.style.color = '#FF4439';
        closeBtn.onmouseout = () => closeBtn.style.color = '#8A8F98';

        const videoPlayer = document.createElement('video');
        videoPlayer.id = 'videoPreviewSrc';
        videoPlayer.controls = true; 
        videoPlayer.autoplay = true; 
        videoPlayer.style.cssText = `
            width: 100%;
            max-height: 80vh;
            border-radius: var(--radius-md, 14px);
            box-shadow: 0 24px 60px rgba(0,0,0,0.8);
            background: #000;
            outline: none;
        `;

        const closeModal = () => {
            previewModal.style.display = 'none';
            videoPlayer.pause(); 
            videoPlayer.src = ''; 
        };

        closeBtn.onclick = closeModal;
        
        previewModal.onclick = (e) => {
            if (e.target === previewModal) closeModal();
        };

        videoContainer.appendChild(closeBtn);
        videoContainer.appendChild(videoPlayer);
        previewModal.appendChild(videoContainer);
        document.body.appendChild(previewModal);
    }

    const videoElement = document.getElementById('videoPreviewSrc');
    videoElement.src = url;
    previewModal.style.display = 'flex';
};

// === SYSTEM ZAKŁADEK (SPA NAVIGATION) ===
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Pobierz ID docelowego widoku
            const targetId = link.getAttribute('data-target');
            
            // Zdejmij klasę 'active' ze wszystkich linków
            navLinks.forEach(nav => nav.classList.remove('active'));
            // Dodaj klasę 'active' do klikniętego linku
            link.classList.add('active');
            
            // Ukryj wszystkie widoki
            views.forEach(view => {
                view.hidden = true;
                view.classList.remove('active');
            });
            
            // Pokaż docelowy widok
            const targetView = document.getElementById(targetId);
            if (targetView) {
                targetView.hidden = false;
                targetView.classList.add('active');
            }
        });
    });
});

// ============================================================================
// 1. INTERAKTYWNE TŁO CZĄSTECZEK AURORA (CANVAS)
// ============================================================================
(function initAuroraCanvas() {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = Math.min(Math.floor(width / 35), 45);
    
    const mouse = { x: width / 2, y: height / 2, active: false };
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;
    });

    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            radius: Math.random() * 2 + 1,
            color: i % 2 === 0 ? 'rgba(196, 231, 212, 0.4)' : 'rgba(15, 145, 210, 0.4)'
        });
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;

            // Przyciąganie myszą
            if (mouse.active) {
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 180) {
                    p.x += dx * 0.015;
                    p.y += dy * 0.015;
                }
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Łączenie linii między cząsteczkami
            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(196, 231, 212, ${0.15 * (1 - dist / 120)})`;
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }
    animate();
})();

// ============================================================================
// 2. BŁYSKAWICZNY UPLOAD ZE SCHOWKA (CTRL + V)
// ============================================================================
window.addEventListener('paste', (e) => {
    // Nie przechwytuj, jeśli użytkownik wpisuje tekst w formularzu (np. logowanie lub szukajka)
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    const files = [];

    for (let index in items) {
        const item = items[index];
        if (item.kind === 'file') {
            const blob = item.getAsFile();
            if (blob) {
                // Jeśli to zrzut ekranu bez nazwy, nadaj mu czytelną nazwę
                const filename = blob.name === 'image.png' ? `Zrzut_ekranu_${new Date().toISOString().slice(0,10)}_${Date.now().toString().slice(-4)}.png` : blob.name;
                const file = new File([blob], filename, { type: blob.type });
                files.push(file);
            }
        }
    }

    if (files.length > 0) {
        showNotification(`Wklejono ${files.length} plik(ów) ze schowka! 📋`, 'success');
        updateSelectedFile(files);
        // Przełącz na główny widok, jeśli użytkownik był w innej zakładce
        const mainNav = document.querySelector('[data-target="view-glowna"]');
        if (mainNav) mainNav.click();
    }
});

// ============================================================================
// 3. GENEROWANIE KODÓW QR (DO POBRANIA NA TELEFONIE)
// ============================================================================
const qrModalWrap = document.getElementById('qrModalWrap');
const closeQrModal = document.getElementById('closeQrModal');
const qrCanvas = document.getElementById('qrCanvas');

window.copyToClipboard = function() {
    const finalLink = document.getElementById('finalLink');
    if (!finalLink || !finalLink.href) return;
    window.copyDirectLink(finalLink.href);
};

window.shareLink = function() {
    const finalLink = document.getElementById('finalLink');
    const url = finalLink?.href;
    if (navigator.share && url) {
        navigator.share({
            title: 'Pobierz plik z Dropsite',
            text: 'Przesyłam Ci plik przez Dropsite:',
            url: url
        }).catch(()=>{});
    } else {
        window.copyToClipboard();
    }
};

window.openQrModal = function(customUrl) {
    const url = customUrl || document.getElementById('finalLink')?.href;
    if (!url || url === '#' || !qrCanvas) return;

    if (typeof QRCode !== 'undefined') {
        QRCode.toCanvas(qrCanvas, url, {
            width: 200,
            margin: 1,
            color: {
                dark: '#0E1015',
                light: '#FFFFFF'
            }
        }, function (error) {
            if (error) console.error("Błąd generowania QR:", error);
            else if (qrModalWrap) qrModalWrap.hidden = false;
        });
    }
};

if (closeQrModal && qrModalWrap) {
    closeQrModal.addEventListener('click', () => { qrModalWrap.hidden = true; });
    qrModalWrap.addEventListener('click', (e) => {
        if (e.target === qrModalWrap) qrModalWrap.hidden = true;
    });
}

// ============================================================================
// 4. HISTORIA WGRANYCH PLIKÓW UŻYTKOWNIKA (LOKALNY STORAGE)
// ============================================================================
const openHistoryBtn = document.getElementById('openHistoryBtn');
const historyModalWrap = document.getElementById('historyModalWrap');
const closeHistoryModal = document.getElementById('closeHistoryModal');
const userHistoryList = document.getElementById('userHistoryList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

function getLocalHistory() {
    try {
        return JSON.parse(localStorage.getItem('dropsite_user_history') || '[]');
    } catch {
        return [];
    }
}

function saveToUserHistory(item) {
    const history = getLocalHistory();
    // Unikamy duplikatów
    const filtered = history.filter(h => h.url !== item.url);
    filtered.unshift(item);
    // Zachowaj maksymalnie 20 ostatnich plików
    if (filtered.length > 20) filtered.pop();
    localStorage.setItem('dropsite_user_history', JSON.stringify(filtered));
}

function renderUserHistory() {
    if (!userHistoryList) return;
    const history = getLocalHistory();
    userHistoryList.innerHTML = '';

    if (history.length === 0) {
        userHistoryList.innerHTML = '<p style="color: var(--text-muted); text-align: center; font-size: 13px; margin: 30px 0;">Brak historii wgranych plików.</p>';
        return;
    }

    history.forEach(item => {
        const li = document.createElement('li');
        li.className = 'mod-file-item';

        let icon = '📄';
        if (/\.(mp4|webm|mov)$/i.test(item.name)) icon = '🎬';
        else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(item.name)) icon = '🖼️';
        else if (/\.(zip|rar)$/i.test(item.name)) icon = '📦';

        let badge = '<span class="mod-badge-exp exp-30d">30 Dni</span>';
        if (item.duration === '1d') badge = '<span class="mod-badge-exp exp-1d">1 Dzień</span>';
        else if (item.duration === 'permanent') badge = '<span class="mod-badge-exp exp-perm">Permanentny</span>';
        else if (item.duration === 'burn') badge = '<span class="mod-badge-exp" style="background: rgba(255,68,57,0.2); color:#FF4439;">1x Pobranie</span>';

        li.innerHTML = `
            <div class="mod-file-main">
                <div class="mod-preview-icon">${icon}</div>
                <div class="mod-file-info">
                    <a href="${item.url}" target="_blank" class="mod-file-name" title="${item.name}">${item.name}</a>
                    <div class="mod-meta-row">
                        <span class="mod-badge-size">${formatBytes(item.size)}</span>
                        ${badge}
                    </div>
                </div>
            </div>
            <div class="mod-actions">
                <button class="btn-copy-mod" onclick="copyDirectLink('${item.url}')" title="Kopiuj link">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Kopiuj
                </button>
            </div>
        `;
        userHistoryList.appendChild(li);
    });
}

if (openHistoryBtn && historyModalWrap) {
    openHistoryBtn.addEventListener('click', () => {
        renderUserHistory();
        historyModalWrap.hidden = false;
    });
}

if (closeHistoryModal && historyModalWrap) {
    closeHistoryModal.addEventListener('click', () => { historyModalWrap.hidden = true; });
    historyModalWrap.addEventListener('click', (e) => {
        if (e.target === historyModalWrap) historyModalWrap.hidden = true;
    });
}

if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
        localStorage.removeItem('dropsite_user_history');
        renderUserHistory();
        showNotification('Historia została wyczyszczona', 'info');
    });
}

// Funkcja kopiowania bezpośredniego z dźwiękiem
window.copyDirectLink = function(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            playSound('copy');
            if (typeof showNotification === 'function') {
                showNotification('Link został skopiowany do schowka! 📋', 'success');
            }
        }).catch(() => {
            prompt('Skopiuj link poniżej:', url);
        });
    } else {
        prompt('Skopiuj link poniżej:', url);
    }
};

// ============================================================================
// 5. DEDYKOWANA STRONA POBIERANIA (DOWNLOAD LANDING PAGE, STATS & BURN)
// ============================================================================
async function initDownloadRouter() {
    const urlParams = new URLSearchParams(window.location.search);
    const fileKey = urlParams.get('f') || urlParams.get('file');

    if (!fileKey) return; // Zwykłe wejście na stronę główną

    // Ukryj wszystkie widoki i pokaż dedykowany widok pobierania
    document.querySelectorAll('.view-section').forEach(v => { v.hidden = true; v.classList.remove('active'); });
    document.querySelectorAll('.nav-btn').forEach(n => n.classList.remove('active'));

    const dlView = document.getElementById('view-download');
    if (dlView) {
        dlView.hidden = false;
        dlView.classList.add('active');
    }

    const dlFileName = document.getElementById('dlFileName');
    const dlFileSize = document.getElementById('dlFileSize');
    const dlBadgeWrap = document.getElementById('dlBadgeWrap');
    const dlPreviewContainer = document.getElementById('dlPreviewContainer');
    const dlBurnWarning = document.getElementById('dlBurnWarning');
    const dlDownloadBtn = document.getElementById('dlDownloadBtn');
    const dlViewCount = document.getElementById('dlViewCount');
    const dlDownloadCount = document.getElementById('dlDownloadCount');

    try {
        // Rejestracja wyświetlenia na backendzie
        fetch(`${WORKER_URL}/track-stat?key=${encodeURIComponent(fileKey)}&type=view`, { method: 'POST' }).catch(()=>{});

        const res = await fetch(`${WORKER_URL}/file-info?key=${encodeURIComponent(fileKey)}`);
        const data = await res.json();

        if (!data.success) {
            dlFileName.innerText = 'Plik niedostępny';
            dlFileSize.innerText = data.message || 'Plik wygasł lub został zniszczony po pobraniu.';
            dlPreviewContainer.innerHTML = '<div style="font-size: 48px; padding: 20px;">⚠️</div>';
            dlDownloadBtn.style.display = 'none';
            return;
        }

        const cleanName = cleanFileName(data.key);
        dlFileName.innerText = cleanName;
        dlFileSize.innerText = `Rozmiar pliku: ${formatBytes(data.size)}`;

        if (dlViewCount) dlViewCount.textContent = (data.views || 1);
        if (dlDownloadCount) dlDownloadCount.textContent = (data.downloads || 0);

        // Badge
        if (data.isBurn) {
            dlBadgeWrap.innerHTML = '<span class="dl-badge burn">💥 Jednorazowy (Burn after download)</span>';
            dlBurnWarning.hidden = false;
            dlDownloadBtn.href = `${WORKER_URL}/burn-download?key=${encodeURIComponent(data.key)}`;
        } else if (data.expiryType === 'permanent') {
            dlBadgeWrap.innerHTML = '<span class="dl-badge perm">♾️ Bezterminowy</span>';
            dlDownloadBtn.href = data.directUrl;
            dlDownloadBtn.setAttribute('download', cleanName);
        } else {
            dlBadgeWrap.innerHTML = `<span class="dl-badge temp">📅 Wygasa za ${data.expiryType === '1d' ? '1 dzień' : '30 dni'}</span>`;
            dlDownloadBtn.href = data.directUrl;
            dlDownloadBtn.setAttribute('download', cleanName);
        }

        // Zwiększ licznik pobrań po kliknięciu
        dlDownloadBtn.addEventListener('click', () => {
            playSound('drop');
            fetch(`${WORKER_URL}/track-stat?key=${encodeURIComponent(fileKey)}&type=download`, { method: 'POST' }).catch(()=>{});
            if (dlDownloadCount) {
                const current = parseInt(dlDownloadCount.textContent || '0', 10);
                dlDownloadCount.textContent = current + 1;
            }
        });

        // Renderowanie podglądu multimediów
        if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(cleanName)) {
            dlPreviewContainer.innerHTML = `<img src="${data.directUrl}" class="dl-preview-media" alt="${cleanName}">`;
        } else if (/\.(mp4|webm|mov)$/i.test(cleanName)) {
            dlPreviewContainer.innerHTML = `<video src="${data.directUrl}" controls autoplay muted playsinline class="dl-preview-media" style="width: 100%; max-height: 280px; background: #000;"></video>`;
        } else if (/\.(pdf)$/i.test(cleanName)) {
            dlPreviewContainer.innerHTML = '<div style="font-size: 54px; padding: 20px;">📕</div>';
        } else if (/\.(zip|rar|7z)$/i.test(cleanName)) {
            dlPreviewContainer.innerHTML = '<div style="font-size: 54px; padding: 20px;">📦</div>';
        } else {
            dlPreviewContainer.innerHTML = '<div style="font-size: 54px; padding: 20px;">📄</div>';
        }

    } catch (err) {
        dlFileName.innerText = 'Błąd połączenia z serwerem';
        dlFileSize.innerText = err.message;
    }
}

// Inicjalizacja przy starcie strony
document.addEventListener('DOMContentLoaded', initDownloadRouter);