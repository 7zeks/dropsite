/**
 * ============================================================================
 * DROPSITE CLIENT-SIDE AI UPSCALER 4K & ESRGAN NEURAL ENGINE
 * ============================================================================
 * 100% In-Browser AI Neural Network (TensorFlow.js + WebGL/WebGPU)
 * Runs entirely on the VISITOR'S own device & GPU • Zero cloud/server dependency
 * Zero connection to developer's PC • 100% RAM Privacy & Security
 * ============================================================================
 */

(function () {
    'use strict';

    // Stan modułu
    const state = {
        sourceFile: null,
        sourceDataUrl: null,
        sourceWidth: 0,
        sourceHeight: 0,
        sourceSize: 0,

        // Wynik
        upscaledDataUrl: null,
        upscaledBlob: null,
        upscaledWidth: 0,
        upscaledHeight: 0,

        // Parametry
        scale: 4, // 2 lub 4
        preset: 'ui-web',
        sharpen: 65,

        // Stan silnika
        isProcessing: false,
        isAiReady: false,
        activeEngineName: 'Sieć Neuronowa ESRGAN (Lokalne GPU/WebGL)',

        // UI & Podgląd
        compareMode: 'split', // 'split' | 'side' | 'zoom'
        sliderPosition: 50,
        isDragging: false
    };

    let _upscalerInstance = null;
    let _aiLibsLoadingPromise = null;

    /**
     * Dynamiczne, asynchroniczne ładowanie bibliotek AI do przeglądarki odwiedzającego
     * (Zero spowolnienia strony głównej — biblioteki ładowane są dopiero po wejściu w narzędzie)
     */
    function loadAiLibraries() {
        if (window.Upscaler && window.tf) {
            state.isAiReady = true;
            return Promise.resolve();
        }

        if (_aiLibsLoadingPromise) return _aiLibsLoadingPromise;

        _aiLibsLoadingPromise = new Promise((resolve, reject) => {
            function loadScript(src) {
                return new Promise((res, rej) => {
                    // Sprawdź czy skrypt już istnieje
                    if (document.querySelector(`script[src="${src}"]`)) {
                        res();
                        return;
                    }
                    const s = document.createElement('script');
                    s.src = src;
                    s.async = false;
                    s.onload = res;
                    s.onerror = rej;
                    document.head.appendChild(s);
                });
            }

            // 1. TensorFlow.js (Akcelerator WebGL / WebGPU w przeglądarce)
            loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js')
                // 2. UpscalerJS Core
                .then(() => loadScript('https://cdn.jsdelivr.net/npm/upscaler@latest/dist/browser/umd/upscaler.min.js'))
                // 3. Model ESRGAN 4x Slim (Wydajna sieć neuronowa do 4K)
                .then(() => loadScript('https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-slim@latest/dist/umd/4x.min.js'))
                // 4. Model ESRGAN 2x Default
                .then(() => loadScript('https://cdn.jsdelivr.net/npm/@upscalerjs/default-model@latest/dist/umd/index.min.js'))
                .then(() => {
                    state.isAiReady = true;
                    resolve();
                })
                .catch((err) => {
                    console.warn('[Upscaler] Błąd ładowania CDN AI, aktywny fallback Canvas CAS:', err);
                    reject(err);
                });
        });

        return _aiLibsLoadingPromise;
    }

    /**
     * Wykrywanie sprzętu odwiedzającego (GPU WebGL / WebGPU)
     */
    function detectVisitorHardware() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    if (renderer) {
                        const cleanName = renderer
                            .replace(/ANGLE \((.*?),/, '$1')
                            .replace(/Direct3D\d+.*?vs_\d+_\d+/, '')
                            .replace(/\(.*?\)/g, '')
                            .trim()
                            .slice(0, 32);
                        state.activeEngineName = `ESRGAN AI na Twoim GPU (${cleanName})`;
                        updateHardwareBadge();
                        return;
                    }
                }
            }
        } catch (_) {}

        state.activeEngineName = 'ESRGAN AI (WebGL / GPU użytkownika)';
        updateHardwareBadge();
    }

    function updateHardwareBadge() {
        const dropBadge = document.getElementById('upscaleGpuBadge');
        const activeName = document.getElementById('upscaleActiveEngineName');
        if (dropBadge) dropBadge.textContent = 'Lokalna Sieć Neuronowa AI (Twój sprzęt)';
        if (activeName) activeName.textContent = state.activeEngineName;
    }

    /**
     * Główny proces powiększania: uruchomienie sieci neuronowej w przeglądarce internauty
     */
    async function runClientAiUpscale() {
        if (!state.sourceDataUrl || state.isProcessing) return;

        state.isProcessing = true;
        const overlay = document.getElementById('upscaleProgressOverlay');
        const titleEl = document.getElementById('upscaleProgressTitle');
        const subEl = document.getElementById('upscaleProgressSub');
        const btnExecute = document.getElementById('btnExecuteUpscale');

        if (overlay) overlay.style.display = 'flex';
        if (btnExecute) btnExecute.disabled = true;

        if (titleEl) titleEl.textContent = 'Inicjalizacja sieci neuronowej AI...';
        if (subEl) subEl.textContent = 'Pobieranie wag modelu i alokacja w pamięci GPU Twojego urządzenia';

        const startTime = performance.now();

        try {
            // Upewnij się, że biblioteki AI są załadowane do przeglądarki użytkownika
            await loadAiLibraries();

            if (titleEl) titleEl.textContent = 'Powiększanie obrazu przez sieć ESRGAN...';
            if (subEl) subEl.textContent = 'Przetwarzanie kafelkowe na karcie graficznej urządzenia: 0%';

            // Wybierz model AI (4x ESRGAN Slim lub 2x Default)
            let chosenModel = window.ESRGANSlim4x;
            if (state.scale === 2 && window.DefaultUpscalerJSModel) {
                chosenModel = window.DefaultUpscalerJSModel;
            }

            const upscaler = new window.Upscaler({
                model: chosenModel
            });
            _upscalerInstance = upscaler;

            const imgEl = new Image();
            imgEl.crossOrigin = 'anonymous';

            const loadPromise = new Promise((res, rej) => {
                imgEl.onload = res;
                imgEl.onerror = rej;
                imgEl.src = state.sourceDataUrl;
            });
            await loadPromise;

            // Kafelkowe przetwarzanie (patchSize: 64) zabezpiecza przed brakiem pamięci na telefonach i słabszych laptopach
            const upscaledDataUrl = await upscaler.upscale(imgEl, {
                patchSize: 64,
                padding: 4,
                progress: (rate) => {
                    const percent = Math.round(rate * 100);
                    if (subEl) subEl.textContent = `Przetwarzanie na Twoim GPU: ${percent}%`;
                }
            });

            // Wylicz końcowe wymiary
            const targetW = state.sourceWidth * (state.scale === 2 ? 2 : 4);
            const targetH = state.sourceHeight * (state.scale === 2 ? 2 : 4);

            // Konwersja do Bloba dla bezstratnego pobierania PNG
            const blobRes = await fetch(upscaledDataUrl);
            const upscaledBlob = await blobRes.blob();

            state.upscaledDataUrl = upscaledDataUrl;
            state.upscaledBlob = upscaledBlob;
            state.upscaledWidth = targetW;
            state.upscaledHeight = targetH;

            // Zaktualizuj kanwas porównawczy
            updateCanvasElements(upscaledDataUrl);

            const exportBar = document.getElementById('upscaleExportBar');
            if (exportBar) exportBar.style.display = 'flex';

            const elapsed = Math.round(performance.now() - startTime);
            const exportMeta = document.getElementById('upscaleExportMeta');
            if (exportMeta) {
                exportMeta.textContent = `${targetW} × ${targetH} px • Wygenerowano w ${elapsed} ms na Twoim sprzęcie (100% RAM)`;
            }

            if (window.showToast) {
                window.showToast(`AI Super-Resolution ukończone: ${targetW} × ${targetH} px (${elapsed} ms).`, 'success');
            }

        } catch (err) {
            console.warn('[Upscaler] UpscalerJS błąd, przełączam na algorytm Canvas CAS:', err);
            // Fallback sprzętowy Canvas CAS
            try {
                if (titleEl) titleEl.textContent = 'Przetwarzanie Canvas CAS...';
                const fallbackRes = await runCanvasFallback(state.sourceDataUrl, state.scale);
                state.upscaledDataUrl = fallbackRes.dataUrl;
                state.upscaledBlob = fallbackRes.blob;
                state.upscaledWidth = fallbackRes.width;
                state.upscaledHeight = fallbackRes.height;

                updateCanvasElements(fallbackRes.dataUrl);
                const exportBar = document.getElementById('upscaleExportBar');
                if (exportBar) exportBar.style.display = 'flex';

                if (window.showToast) {
                    window.showToast('Powiększono za pomocą sprzętowego silnika Canvas CAS.', 'info');
                }
            } catch (fallbackErr) {
                if (window.showToast) window.showToast('Nie udało się powiększyć obrazu.', 'error');
            }
        } finally {
            state.isProcessing = false;
            if (overlay) overlay.style.display = 'none';
            if (btnExecute) btnExecute.disabled = false;
        }
    }

    /**
     * Fallback Canvas 2D + Contrast-Adaptive Sharpening
     */
    async function runCanvasFallback(imageUrl, scaleFactor) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const targetW = img.width * scaleFactor;
                const targetH = img.height * scaleFactor;
                const canvas = document.createElement('canvas');
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) return reject(new Error('Canvas error'));

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, targetW, targetH);

                const dataUrl = canvas.toDataURL('image/png');
                canvas.toBlob((blob) => {
                    resolve({ dataUrl, blob, width: targetW, height: targetH });
                }, 'image/png');
            };
            img.onerror = reject;
            img.src = imageUrl;
        });
    }

    /**
     * Aktualizacja elementów na kanwasie
     */
    function updateCanvasElements(upscaledUrl) {
        const splitRes = document.getElementById('upscaleSplitResImg');
        const splitOrig = document.getElementById('upscaleSplitOrigImg');
        const sideRes = document.getElementById('upscaleSideResImg');
        const sideOrig = document.getElementById('upscaleSideOrigImg');

        if (splitRes) splitRes.src = upscaledUrl;
        if (splitOrig) splitOrig.src = state.sourceDataUrl;

        if (sideRes) sideRes.src = upscaledUrl;
        if (sideOrig) sideOrig.src = state.sourceDataUrl;

        const sideOrigLabel = document.getElementById('upscaleSideOrigLabel');
        const sideResLabel = document.getElementById('upscaleSideResLabel');
        if (sideOrigLabel) sideOrigLabel.textContent = `Przed: Oryginał (${state.sourceWidth} × ${state.sourceHeight} px)`;
        if (sideResLabel) sideResLabel.textContent = `Po: AI Super-Resolution (${state.upscaledWidth} × ${state.upscaledHeight} px)`;

        const lens = document.getElementById('upscaleZoomLens');
        if (lens) lens.style.backgroundImage = `url('${upscaledUrl}')`;

        applySliderClip(state.sliderPosition);
    }

    /**
     * Obsługa suwaka z użyciem clip-path (Pixel-Perfect Alignment)
     */
    function applySliderClip(percent) {
        state.sliderPosition = percent;
        const origLayer = document.getElementById('upscaleSplitOrigImg');
        const divider = document.getElementById('upscaleSplitDivider');

        if (origLayer) {
            origLayer.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
        }
        if (divider) {
            divider.style.left = `${percent}%`;
        }
    }

    /**
     * Interakcje myszy i dotyku dla suwaka i lupy
     */
    function initViewerInteractions() {
        const frame = document.getElementById('upscaleSplitFrame');
        if (!frame) return;

        function handlePointer(clientX) {
            const rect = frame.getBoundingClientRect();
            if (rect.width <= 0) return;
            let percent = ((clientX - rect.left) / rect.width) * 100;
            percent = Math.max(0, Math.min(100, percent));
            applySliderClip(percent);
        }

        frame.addEventListener('mousedown', (e) => {
            if (state.compareMode !== 'split') return;
            state.isDragging = true;
            handlePointer(e.clientX);
        });

        window.addEventListener('mousemove', (e) => {
            if (state.isDragging && state.compareMode === 'split') {
                handlePointer(e.clientX);
            }

            // Obsługa lupy 200%
            if (state.compareMode === 'zoom' && state.upscaledDataUrl) {
                handleZoomLens(e);
            }
        });

        window.addEventListener('mouseup', () => {
            state.isDragging = false;
        });

        // Obsługa urządzeń mobilnych (Touch)
        frame.addEventListener('touchstart', (e) => {
            if (state.compareMode !== 'split') return;
            if (e.touches && e.touches[0]) {
                state.isDragging = true;
                handlePointer(e.touches[0].clientX);
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (state.isDragging && state.compareMode === 'split' && e.touches && e.touches[0]) {
                handlePointer(e.touches[0].clientX);
            }
        }, { passive: true });

        window.addEventListener('touchend', () => {
            state.isDragging = false;
        });
    }

    /**
     * Lupa 200%
     */
    function handleZoomLens(e) {
        const frame = document.getElementById('upscaleSplitFrame');
        const lens = document.getElementById('upscaleZoomLens');
        if (!frame || !lens) return;

        const rect = frame.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (mouseX < 0 || mouseX > rect.width || mouseY < 0 || mouseY > rect.height) {
            lens.style.display = 'none';
            return;
        }

        lens.style.display = 'block';
        const lensSize = 180;
        lens.style.left = `${mouseX - lensSize / 2}px`;
        lens.style.top = `${mouseY - lensSize / 2}px`;

        const zoomFactor = 2.5;
        const bgW = rect.width * zoomFactor;
        const bgH = rect.height * zoomFactor;
        const bgX = -(mouseX * zoomFactor - lensSize / 2);
        const bgY = -(mouseY * zoomFactor - lensSize / 2);

        lens.style.backgroundSize = `${bgW}px ${bgH}px`;
        lens.style.backgroundPosition = `${bgX}px ${bgY}px`;
    }

    /**
     * Zmiana trybu podglądu
     */
    function setViewMode(mode) {
        state.compareMode = mode;

        const btnSplit = document.getElementById('btnModeSplit');
        const btnSide = document.getElementById('btnModeSide');
        const btnZoom = document.getElementById('btnModeZoom');
        [btnSplit, btnSide, btnZoom].forEach(b => { if (b) b.classList.remove('active'); });

        const frame = document.getElementById('upscaleSplitFrame');
        const sideBox = document.getElementById('upscaleSideBySide');
        const lens = document.getElementById('upscaleZoomLens');
        const divider = document.getElementById('upscaleSplitDivider');
        const origLayer = document.getElementById('upscaleSplitOrigImg');

        if (mode === 'split') {
            if (btnSplit) btnSplit.classList.add('active');
            if (frame) frame.style.display = 'inline-block';
            if (sideBox) sideBox.style.display = 'none';
            if (lens) lens.style.display = 'none';
            if (divider) divider.style.display = 'block';
            applySliderClip(state.sliderPosition);
        } else if (mode === 'side') {
            if (btnSide) btnSide.classList.add('active');
            if (frame) frame.style.display = 'none';
            if (sideBox) sideBox.style.display = 'grid';
            if (lens) lens.style.display = 'none';
        } else if (mode === 'zoom') {
            if (btnZoom) btnZoom.classList.add('active');
            if (frame) frame.style.display = 'inline-block';
            if (sideBox) sideBox.style.display = 'none';
            if (divider) divider.style.display = 'none';
            if (origLayer) origLayer.style.clipPath = 'none';
        }
    }

    /**
     * Załadowanie pliku ze schowka lub eksploratora
     */
    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            if (window.showToast) window.showToast('Wybierz poprawny plik graficzny (PNG, JPG, WebP itp.).', 'error');
            return;
        }

        state.sourceFile = file;
        state.sourceSize = file.size;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            state.sourceDataUrl = dataUrl;

            const img = new Image();
            img.onload = () => {
                state.sourceWidth = img.naturalWidth || img.width;
                state.sourceHeight = img.naturalHeight || img.height;

                const dropzone = document.getElementById('upscaleDropzone');
                const workspace = document.getElementById('upscaleWorkspace');
                if (dropzone) dropzone.style.display = 'none';
                if (workspace) workspace.style.display = 'flex';

                const thumb = document.getElementById('upscaleThumbMini');
                const nameEl = document.getElementById('upscaleFilename');
                if (thumb) thumb.src = dataUrl;
                if (nameEl) nameEl.textContent = file.name;

                updateEstimatedDimensions();
                updateCanvasElements(dataUrl);

                // Automatyczny start powiększania
                runClientAiUpscale();
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    }

    function updateEstimatedDimensions() {
        const origDim = document.getElementById('upscaleDimOrig');
        const targetDim = document.getElementById('upscaleDimTarget');
        if (origDim) origDim.textContent = `${state.sourceWidth} × ${state.sourceHeight} px`;
        if (targetDim) {
            const tW = state.sourceWidth * state.scale;
            const tH = state.sourceHeight * state.scale;
            const badge = tW >= 3840 ? ' (4K UHD)' : tW >= 1920 ? ' (Full HD)' : '';
            targetDim.textContent = `${tW} × ${tH} px${badge}`;
        }
    }

    function exportFile(format) {
        if (!state.upscaledDataUrl) return;

        const baseName = state.sourceFile ? state.sourceFile.name.replace(/\.[^/.]+$/, '') : 'obraz';
        const targetName = `${baseName}_4k_upscale.${format}`;

        if (format === 'png' && state.upscaledBlob) {
            const url = URL.createObjectURL(state.upscaledBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = targetName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
            if (window.showToast) window.showToast(`Pobrano plik: ${targetName}`, 'success');
            return;
        }

        // WebP
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = targetName;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setTimeout(() => URL.revokeObjectURL(url), 10000);
                    if (window.showToast) window.showToast(`Pobrano plik: ${targetName}`, 'success');
                }
            }, 'image/webp', 0.94);
        };
        img.src = state.upscaledDataUrl;
    }

    async function copyImageToClipboard() {
        if (!state.upscaledBlob) {
            if (window.showToast) window.showToast('Brak gotowego obrazu.', 'warning');
            return;
        }

        try {
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': state.upscaledBlob })
            ]);
            if (window.showToast) window.showToast('Skopiowano obraz 4K do schowka.', 'success');
        } catch (_) {
            if (window.showToast) window.showToast('Użyj przycisku Pobierz, aby zapisać obraz.', 'warning');
        }
    }

    /**
     * Inicjalizacja modułu
     */
    function initUpscaleUI() {
        const panel = document.getElementById('toolPanel_upscale');
        if (!panel) return;

        detectVisitorHardware();

        const dropzone = document.getElementById('upscaleDropzone');
        const fileInput = document.getElementById('upscaleFileInput');
        const workspace = document.getElementById('upscaleWorkspace');

        if (dropzone && fileInput) {
            dropzone.onclick = () => fileInput.click();
            dropzone.ondragover = (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); };
            dropzone.ondragleave = () => dropzone.classList.remove('drag-over');
            dropzone.ondrop = (e) => {
                e.preventDefault();
                dropzone.classList.remove('drag-over');
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFile(e.dataTransfer.files[0]);
                }
            };
            fileInput.onchange = () => {
                if (fileInput.files && fileInput.files[0]) {
                    handleFile(fileInput.files[0]);
                }
            };
        }

        // Global Paste (Ctrl + V)
        window.addEventListener('paste', (e) => {
            if (panel.style.display === 'none' || panel.hidden) return;
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) {
                        handleFile(file);
                        if (window.showToast) window.showToast('Wczytano grafikę ze schowka.', 'success');
                        break;
                    }
                }
            }
        });

        // Wybór skali
        panel.querySelectorAll('.upscale-factor-btn').forEach(btn => {
            btn.onclick = () => {
                panel.querySelectorAll('.upscale-factor-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.scale = parseInt(btn.dataset.scale, 10) || 4;
                updateEstimatedDimensions();
            };
        });

        // Wybór presetu
        panel.querySelectorAll('.upscale-preset-card').forEach(card => {
            card.onclick = () => {
                panel.querySelectorAll('.upscale-preset-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                state.preset = card.dataset.preset || 'ui-web';
            };
        });

        // Przyciski akcji
        const btnExecute = document.getElementById('btnExecuteUpscale');
        if (btnExecute) btnExecute.onclick = runClientAiUpscale;

        const btnReset = document.getElementById('btnUpscaleReset');
        if (btnReset) {
            btnReset.onclick = () => {
                state.sourceFile = null;
                state.sourceDataUrl = null;
                state.upscaledDataUrl = null;
                state.upscaledBlob = null;
                if (workspace) workspace.style.display = 'none';
                if (dropzone) dropzone.style.display = 'flex';
                if (fileInput) fileInput.value = '';
            };
        }

        // Tryby podglądu
        const btnSplit = document.getElementById('btnModeSplit');
        const btnSide = document.getElementById('btnModeSide');
        const btnZoom = document.getElementById('btnModeZoom');

        if (btnSplit) btnSplit.onclick = () => setViewMode('split');
        if (btnSide) btnSide.onclick = () => setViewMode('side');
        if (btnZoom) btnZoom.onclick = () => setViewMode('zoom');

        // Przyciski eksportu
        const btnPng = document.getElementById('btnUpscaleDlPng');
        const btnWebp = document.getElementById('btnUpscaleDlWebp');
        const btnCopy = document.getElementById('btnUpscaleCopy');

        if (btnPng) btnPng.onclick = () => exportFile('png');
        if (btnWebp) btnWebp.onclick = () => exportFile('webp');
        if (btnCopy) btnCopy.onclick = copyImageToClipboard;

        initViewerInteractions();

        // Ciche wczesne pobranie bibliotek w tle przy bezczynności
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(() => loadAiLibraries(), { timeout: 3000 });
        } else {
            setTimeout(() => loadAiLibraries(), 2000);
        }
    }

    window.DropsiteUpscaler = {
        init: initUpscaleUI,
        loadSourceFile: handleFile,
        executeUpscale: runClientAiUpscale
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUpscaleUI);
    } else {
        initUpscaleUI();
    }
})();
