/**
 * Dropsite Video Compressor (Client-Side WebCodecs & MediaRecorder in RAM)
 * 100% Client-Side video compression without cloud upload.
 * Brand Guidelines: Zero emoji, pure SVG inline, Cyber Mint & Obsidian Glass.
 */

(function () {
    'use strict';

    let currentFile = null;
    let selectedPreset = 'email'; // 'email' | 'save70' | 'fast'
    let isCompressing = false;

    function formatBytes(bytes, decimals = 1) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function initVideoCompressor() {
        setupDropzone();
        setupPresets();
        setupStartButton();
    }

    function setupDropzone() {
        const dropzone = document.getElementById('videoCompressDropzone');
        const fileInput = document.getElementById('videoCompressFileInput');

        if (!dropzone || !fileInput) return;

        dropzone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleSelectedVideo(e.target.files[0]);
            }
        });

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('drag-over');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleSelectedVideo(e.dataTransfer.files[0]);
            }
        });
    }

    function setupPresets() {
        const buttons = document.querySelectorAll('.video-preset-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedPreset = btn.getAttribute('data-preset') || 'email';
            });
        });
    }

    function handleSelectedVideo(file) {
        if (!file || !file.type.startsWith('video/')) {
            if (window.showToast) window.showToast('Wybierz poprawny plik wideo (.mp4, .mov, .webm)', 'warning');
            return;
        }

        currentFile = file;

        const activeState = document.getElementById('videoCompressActiveState');
        const fileNameEl = document.getElementById('videoMetaFileName');
        const fileSizeEl = document.getElementById('videoMetaFileSize');
        const resultBox = document.getElementById('videoResultBox');
        const progressBox = document.getElementById('videoProgressBox');

        if (fileNameEl) fileNameEl.textContent = file.name;
        if (fileSizeEl) fileSizeEl.textContent = formatBytes(file.size);
        if (resultBox) resultBox.classList.remove('visible');
        if (progressBox) progressBox.classList.remove('visible');

        if (activeState) activeState.classList.add('visible');
    }

    function setupStartButton() {
        const startBtn = document.getElementById('btnStartVideoCompress');
        if (!startBtn) return;

        startBtn.addEventListener('click', async () => {
            if (!currentFile || isCompressing) return;
            startCompression();
        });
    }

    async function startCompression() {
        isCompressing = true;
        const startBtn = document.getElementById('btnStartVideoCompress');
        const progressBox = document.getElementById('videoProgressBox');
        const progressBar = document.getElementById('videoProgressBar');
        const progressPercent = document.getElementById('videoProgressPercent');
        const resultBox = document.getElementById('videoResultBox');

        if (startBtn) startBtn.disabled = true;
        if (progressBox) progressBox.classList.add('visible');
        if (resultBox) resultBox.classList.remove('visible');

        const video = document.createElement('video');
        video.preload = 'auto';
        video.muted = true;
        video.playsInline = true;
        video.src = URL.createObjectURL(currentFile);

        await new Promise(resolve => {
            video.onloadedmetadata = resolve;
        });

        const duration = video.duration || 10;
        const origWidth = video.videoWidth || 1280;
        const origHeight = video.videoHeight || 720;

        // Oblicz docelową rozdzielczość i bitrate
        let targetWidth = origWidth;
        let targetHeight = origHeight;
        let targetBitrate = 1500000; // 1.5 Mbps default

        if (selectedPreset === 'email') {
            // Pod limit 24 MB
            const targetBytes = 23.5 * 1024 * 1024;
            targetBitrate = Math.min(2200000, Math.floor((targetBytes * 8) / duration));
            if (targetWidth > 1280) {
                targetWidth = 1280;
                targetHeight = Math.round((origHeight * (1280 / origWidth)));
            }
        } else if (selectedPreset === 'save70') {
            targetBitrate = 1200000;
            if (targetWidth > 1280) {
                targetWidth = 1280;
                targetHeight = Math.round((origHeight * (1280 / origWidth)));
            }
        } else if (selectedPreset === 'fast') {
            targetBitrate = 800000;
            if (targetWidth > 960) {
                targetWidth = 960;
                targetHeight = Math.round((origHeight * (960 / origWidth)));
            }
        }

        // Upewnij się, że wymiary są parzyste
        targetWidth = Math.floor(targetWidth / 2) * 2;
        targetHeight = Math.floor(targetHeight / 2) * 2;

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        const stream = canvas.captureStream(25);

        // Wybór kodeka
        let mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm';
        }

        let mediaRecorder;
        try {
            mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                videoBitsPerSecond: targetBitrate
            });
        } catch (e) {
            mediaRecorder = new MediaRecorder(stream);
        }

        const chunks = [];
        mediaRecorder.ondataavailable = e => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        const compressionFinished = new Promise(resolve => {
            mediaRecorder.onstop = () => {
                const compressedBlob = new Blob(chunks, { type: 'video/webm' });
                resolve(compressedBlob);
            };
        });

        mediaRecorder.start(250);
        video.playbackRate = 1.5; // Przyspieszone renderowanie klatek
        video.play();

        function drawFrame() {
            if (video.paused || video.ended) return;
            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

            const progress = Math.min(99, Math.round((video.currentTime / duration) * 100));
            if (progressBar) progressBar.style.width = `${progress}%`;
            if (progressPercent) progressPercent.textContent = `${progress}%`;

            requestAnimationFrame(drawFrame);
        }

        drawFrame();

        await new Promise(resolve => {
            video.onended = resolve;
        });

        mediaRecorder.stop();
        video.pause();
        URL.revokeObjectURL(video.src);

        if (progressBar) progressBar.style.width = '100%';
        if (progressPercent) progressPercent.textContent = '100%';

        const resultBlob = await compressionFinished;

        isCompressing = false;
        if (startBtn) startBtn.disabled = false;

        // Pokaż wynik
        showCompressionResult(resultBlob);
    }

    function showCompressionResult(blob) {
        const resultBox = document.getElementById('videoResultBox');
        const savedText = document.getElementById('videoResultSavedText');
        const detailsText = document.getElementById('videoResultDetails');
        const downloadBtn = document.getElementById('btnDownloadCompressedVideo');

        if (!resultBox) return;

        const origSize = currentFile ? currentFile.size : blob.size;
        const newSize = blob.size;
        const percentSaved = Math.round(((origSize - newSize) / origSize) * 100);

        if (savedText) {
            savedText.textContent = percentSaved > 0
                ? `Zaoszczędzono ${percentSaved}% wagi pliku!`
                : 'Kompresja ukończona pomyślnie!';
        }

        if (detailsText) {
            detailsText.textContent = `${formatBytes(origSize)} → ${formatBytes(newSize)}`;
        }

        if (downloadBtn) {
            downloadBtn.onclick = () => {
                const link = document.createElement('a');
                const baseName = (currentFile ? currentFile.name : 'wideo').replace(/\.[^/.]+$/, '');
                link.download = `${baseName}_kompresja_dropsite.webm`;
                link.href = URL.createObjectURL(blob);
                link.click();
                if (window.showToast) window.showToast('Pobrano skompresowany plik wideo', 'success');
            };
        }

        resultBox.classList.add('visible');
    }

    window.openVideoCompressor = function (file) {
        const modal = document.getElementById('videoCompressModal');
        if (modal) {
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
            if (file) handleSelectedVideo(file);
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initVideoCompressor, 500);
    });

})();
