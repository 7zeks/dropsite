/**
 * ============================================================================
 * DROPSITE WATERMARK STUDIO ENGINE (100% Client-Side In-Memory Watermarking)
 * ============================================================================
 * Umożliwia nakładanie znaków wodnych (POUFNE, DRAFT, KOPIA, własne teksty)
 * z podglądem na żywo w RAM i eksportem w wektorowej jakości przez pdf-lib.
 * Zgodny z BRAND_GUIDELINES.md (Obsidian Glass + Cyber Mint + Vector SVGs)
 * ============================================================================
 */

(function () {
    'use strict';

    const state = {
        file: null,
        rawBytes: null,
        pdfJsDoc: null,
        currentPage: 1,
        totalPages: 0,
        renderTask: null,
        config: {
            text: 'POUFNE',
            color: '#EF4444',
            opacity: 0.20,
            angle: -45,
            fontSize: 48,
            pattern: 'center', // 'center' | 'repeat'
            scope: 'all'       // 'all' | 'skip-first' | 'first-only'
        }
    };

    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function init() {
        const dropzone = document.getElementById('watermarkDropzone');
        const fileInput = document.getElementById('watermarkFileInput');
        const btnChangeFile = document.getElementById('btnWmChangeFile');
        const textInput = document.getElementById('wmTextInput');
        const opacitySlider = document.getElementById('wmOpacityRange');
        const opacityVal = document.getElementById('wmOpacityVal');
        const angleSlider = document.getElementById('wmAngleRange');
        const angleVal = document.getElementById('wmAngleVal');
        const sizeSlider = document.getElementById('wmSizeRange');
        const sizeVal = document.getElementById('wmSizeVal');
        const btnPrev = document.getElementById('btnWmPrevPage');
        const btnNext = document.getElementById('btnWmNextPage');
        const btnExport = document.getElementById('btnExecuteWatermark');

        if (!dropzone || !fileInput) return;

        // 1. Obsługa Dropzone
        dropzone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                loadFile(e.target.files[0]);
                fileInput.value = '';
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
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                loadFile(e.dataTransfer.files[0]);
            }
        });

        if (btnChangeFile) {
            btnChangeFile.addEventListener('click', () => fileInput.click());
        }

        // 2. Szybkie presety treści
        const presetChips = document.querySelectorAll('.wm-preset-chip');
        presetChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const val = chip.getAttribute('data-preset');
                presetChips.forEach(c => c.classList.toggle('active', c === chip));
                if (textInput) textInput.value = val;
                state.config.text = val;
                updateLiveOverlay();
                if (typeof window.playSound === 'function') window.playSound('click');
            });
        });

        // 3. Własny input tekstowy
        if (textInput) {
            textInput.addEventListener('input', () => {
                state.config.text = textInput.value.trim() || 'POUFNE';
                presetChips.forEach(c => c.classList.toggle('active', c.getAttribute('data-preset') === state.config.text));
                updateLiveOverlay();
            });
        }

        // 4. Paleta kolorów
        const colorBtns = document.querySelectorAll('.wm-color-btn');
        colorBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.getAttribute('data-color');
                colorBtns.forEach(b => b.classList.toggle('active', b === btn));
                state.config.color = color;
                updateLiveOverlay();
                if (typeof window.playSound === 'function') window.playSound('click');
            });
        });

        // 5. Suwak przezroczystości
        if (opacitySlider) {
            opacitySlider.addEventListener('input', () => {
                const val = parseInt(opacitySlider.value, 10);
                state.config.opacity = val / 100;
                if (opacityVal) opacityVal.textContent = `${val}%`;
                updateLiveOverlay();
            });
        }

        // 6. Suwak kąta i presety kąta
        if (angleSlider) {
            angleSlider.addEventListener('input', () => {
                const val = parseInt(angleSlider.value, 10);
                state.config.angle = val;
                if (angleVal) angleVal.textContent = `${val}°`;
                updateLiveOverlay();
            });
        }

        const angleChips = document.querySelectorAll('.wm-angle-chip');
        angleChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const angle = parseInt(chip.getAttribute('data-angle'), 10);
                if (angleSlider) angleSlider.value = angle;
                state.config.angle = angle;
                if (angleVal) angleVal.textContent = `${angle}°`;
                updateLiveOverlay();
                if (typeof window.playSound === 'function') window.playSound('click');
            });
        });

        // 7. Suwak wielkości fontu
        if (sizeSlider) {
            sizeSlider.addEventListener('input', () => {
                const val = parseInt(sizeSlider.value, 10);
                state.config.fontSize = val;
                if (sizeVal) {
                    let desc = 'Średnia';
                    if (val < 32) desc = 'Mała';
                    else if (val > 64) desc = 'Duża';
                    sizeVal.textContent = `${desc} (${val}pt)`;
                }
                updateLiveOverlay();
            });
        }

        // 8. Wzór rozmieszczenia (Pojedynczy / Siatka)
        const patternRadios = document.querySelectorAll('input[name="wmPattern"]');
        patternRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    state.config.pattern = radio.value;
                    updateLiveOverlay();
                    if (typeof window.playSound === 'function') window.playSound('click');
                }
            });
        });

        // 9. Zakres stron
        const scopeRadios = document.querySelectorAll('input[name="wmScope"]');
        scopeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    state.config.scope = radio.value;
                    updateLiveOverlay();
                    if (typeof window.playSound === 'function') window.playSound('click');
                }
            });
        });

        // 10. Nawigacja podglądu stron
        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                if (state.currentPage > 1) {
                    state.currentPage--;
                    renderCurrentPage();
                    if (typeof window.playSound === 'function') window.playSound('click');
                }
            });
        }

        if (btnNext) {
            btnNext.addEventListener('click', () => {
                if (state.currentPage < state.totalPages) {
                    state.currentPage++;
                    renderCurrentPage();
                    if (typeof window.playSound === 'function') window.playSound('click');
                }
            });
        }

        // 11. Przycisk Eksportu
        if (btnExport) {
            btnExport.addEventListener('click', executeExport);
        }
    }

    async function loadFile(file) {
        if (!file) return;

        const dropzone = document.getElementById('watermarkDropzone');
        const workspace = document.getElementById('watermarkWorkspace');
        const fileNameEl = document.getElementById('wmFileName');
        const pageCountEl = document.getElementById('wmPageCount');

        if (typeof window.playSound === 'function') window.playSound('drop');
        if (window.showNotification) {
            window.showNotification('Wczytywanie dokumentu do Watermark Studio...', 'info');
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            state.file = file;
            state.rawBytes = new Uint8Array(arrayBuffer.slice(0));

            // Ładowanie biblioteki pdf.js
            if (typeof pdfjsLib === 'undefined' && typeof window.loadScript === 'function') {
                await window.loadScript('js/pdf.min.js');
            }

            if (typeof pdfjsLib === 'undefined') {
                throw new Error('Biblioteka PDF.js nie jest dostępna');
            }

            if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/pdf.worker.min.js';
            }

            // Klon bufora chroni przed detached ArrayBuffer w workerze
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
            const doc = await loadingTask.promise;

            state.pdfJsDoc = doc;
            state.totalPages = doc.numPages;
            state.currentPage = 1;

            if (fileNameEl) fileNameEl.textContent = file.name;
            if (pageCountEl) pageCountEl.textContent = `${doc.numPages} stron (${formatBytes(file.size)})`;

            if (dropzone) dropzone.style.display = 'none';
            if (workspace) workspace.style.display = 'flex';

            await renderCurrentPage();

            if (window.showNotification) {
                window.showNotification(`Wczytano dokument (${doc.numPages} str.). Dopasuj znak wodny na żywo!`, 'success');
            }

        } catch (err) {
            console.error('[Watermark Studio] Błąd ładowania pliku:', err);
            if (window.showNotification) {
                window.showNotification('Błąd otwierania PDF: ' + (err.message || 'Nieznany błąd'), 'error');
            }
        }
    }

    async function renderCurrentPage() {
        if (!state.pdfJsDoc) return;

        const canvas = document.getElementById('wmBaseCanvas');
        const pageLabel = document.getElementById('wmCurrentPageLabel');
        const btnPrev = document.getElementById('btnWmPrevPage');
        const btnNext = document.getElementById('btnWmNextPage');
        if (!canvas) return;

        if (pageLabel) pageLabel.textContent = `Strona ${state.currentPage} z ${state.totalPages}`;
        if (btnPrev) btnPrev.disabled = state.currentPage <= 1;
        if (btnNext) btnNext.disabled = state.currentPage >= state.totalPages;

        if (state.renderTask) {
            try { state.renderTask.cancel(); } catch (_) {}
        }

        try {
            const page = await state.pdfJsDoc.getPage(state.currentPage);
            const container = document.getElementById('wmCanvasContainer');
            const maxW = Math.min(container ? container.parentElement.clientWidth - 40 : 540, 560);

            const unscaledViewport = page.getViewport({ scale: 1.0 });
            const scale = maxW / unscaledViewport.width;
            const viewport = page.getViewport({ scale });

            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.floor(viewport.width * dpr);
            canvas.height = Math.floor(viewport.height * dpr);
            canvas.style.width = `${Math.floor(viewport.width)}px`;
            canvas.style.height = `${Math.floor(viewport.height)}px`;

            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);

            state.renderTask = page.render({
                canvasContext: ctx,
                viewport: viewport
            });

            await state.renderTask.promise;
            state.renderTask = null;

            updateLiveOverlay();
        } catch (err) {
            if (err && err.name !== 'RenderingCancelledException') {
                console.warn('[Watermark Studio] Błąd renderowania podglądu:', err);
            }
        }
    }

    function isPageWatermarked(pageNum) {
        if (state.config.scope === 'all') return true;
        if (state.config.scope === 'skip-first') return pageNum > 1;
        if (state.config.scope === 'first-only') return pageNum === 1;
        return true;
    }

    function updateLiveOverlay() {
        const overlay = document.getElementById('wmLiveOverlay');
        if (!overlay) return;

        const shouldShow = isPageWatermarked(state.currentPage);
        if (!shouldShow) {
            overlay.innerHTML = `
                <div style="background:rgba(15,23,42,0.85);color:#94A3B8;padding:8px 16px;border-radius:8px;font-size:0.8rem;border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(4px);">
                    Ta strona została pominięta w regule zakresu stron
                </div>
            `;
            return;
        }

        const text = state.config.text || 'POUFNE';
        const color = state.config.color || '#EF4444';
        const opacity = state.config.opacity || 0.20;
        const angle = state.config.angle || -45;
        const size = Math.max(16, Math.min(state.config.fontSize * 0.75, 72)); // skalowanie podglądu kontenera

        if (state.config.pattern === 'center') {
            overlay.innerHTML = `
                <span class="wm-live-text-single" style="
                    color: ${color};
                    opacity: ${opacity};
                    transform: rotate(${angle}deg);
                    font-size: ${size}px;
                ">${escapeHtml(text)}</span>
            `;
        } else {
            // Siatka powtórzona
            let repeatHtml = '';
            for (let i = 0; i < 12; i++) {
                repeatHtml += `
                    <span style="
                        color: ${color};
                        opacity: ${opacity};
                        transform: rotate(${angle}deg);
                        font-size: ${Math.max(14, size * 0.65)}px;
                        font-weight: 800;
                        white-space: nowrap;
                    ">${escapeHtml(text)}</span>
                `;
            }
            overlay.innerHTML = `<div class="wm-live-text-grid">${repeatHtml}</div>`;
        }
    }

    function escapeHtml(str) {
        return (str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Pomocnik do generowania krystalicznie ostrej warstwy znaku wodnego w canvasie o wymiarach arkusza
    function createWatermarkLayerPng(width, height, config) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const text = config.text || 'POUFNE';
        const angleRad = (config.angle * Math.PI) / 180;
        ctx.fillStyle = config.color || '#EF4444';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (config.pattern === 'center') {
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(angleRad);
            ctx.font = `bold ${config.fontSize * 1.5}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            ctx.fillText(text, 0, 0);
            ctx.restore();
        } else {
            // Siatka po przekątnej na całej powierzchni arkusza
            const cols = 3;
            const rows = 4;
            const stepX = canvas.width / cols;
            const stepY = canvas.height / rows;
            const fontSize = Math.round(config.fontSize * 1.0);

            ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cx = stepX * c + stepX / 2;
                    const cy = stepY * r + stepY / 2;
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(angleRad);
                    ctx.fillText(text, 0, 0);
                    ctx.restore();
                }
            }
        }

        return canvas.toDataURL('image/png', 0.95);
    }

    function base64ToUint8Array(base64) {
        const raw = atob(base64);
        const arr = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
            arr[i] = raw.charCodeAt(i);
        }
        return arr;
    }

    async function executeExport() {
        if (!state.file) return;

        const btnExport = document.getElementById('btnExecuteWatermark');
        const origBtnText = btnExport ? btnExport.innerHTML : '';
        if (btnExport) {
            btnExport.classList.add('loading');
            btnExport.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="spin">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                    <path d="M12 2a10 10 0 0 1 10 10"></path>
                </svg>
                <span>Wtapianie znaku wodnego w RAM...</span>
            `;
        }

        try {
            // Upewnij się, że PDFLib jest dostępny
            if (typeof PDFLib === 'undefined' && typeof window.loadScript === 'function') {
                await window.loadScript('js/pdf-lib.min.js');
            }

            if (typeof PDFLib === 'undefined') {
                throw new Error('Biblioteka pdf-lib nie jest załadowana');
            }

            // Bezpieczne pobranie bufora dokumentu (odporne na Worker detach)
            let srcBuffer;
            if (state.file && typeof state.file.arrayBuffer === 'function') {
                srcBuffer = await state.file.arrayBuffer();
            } else if (state.rawBytes && state.rawBytes.length > 0) {
                srcBuffer = state.rawBytes.buffer.slice(0);
            }

            if (!srcBuffer || srcBuffer.byteLength === 0) {
                throw new Error('Brak bufora dokumentu w pamięci RAM. Wczytaj plik ponownie.');
            }

            const pdfDoc = await PDFLib.PDFDocument.load(srcBuffer, { ignoreEncryption: true });
            const pageCount = pdfDoc.getPageCount();

            for (let i = 0; i < pageCount; i++) {
                const pageNum = i + 1;
                if (!isPageWatermarked(pageNum)) continue;

                const page = pdfDoc.getPage(i);
                const { width, height } = page.getSize();

                // Wygeneruj krystaliczną warstwę znaku wodnego w skali arkusza (x1.5 dla wysokiej ostrości druku)
                const wmPngUrl = createWatermarkLayerPng(width * 1.5, height * 1.5, state.config);
                const pngBytes = base64ToUint8Array(wmPngUrl.split(',')[1]);
                const pngImg = await pdfDoc.embedPng(pngBytes);

                page.drawImage(pngImg, {
                    x: 0,
                    y: 0,
                    width: width,
                    height: height,
                    opacity: state.config.opacity || 0.20
                });
            }

            const finalBytes = await pdfDoc.save();
            const blob = new Blob([finalBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const downloadLink = document.createElement('a');
            const origName = state.file.name.replace(/\.pdf$/i, '');
            downloadLink.href = url;
            downloadLink.download = `${origName}_znak_wodny_dropsite.pdf`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

            setTimeout(() => URL.revokeObjectURL(url), 5000);

            if (typeof window.playSound === 'function') window.playSound('success');
            if (window.showNotification) {
                window.showNotification(`Pomyślnie wyeksportowano plik ${downloadLink.download}!`, 'success');
            }

        } catch (err) {
            console.error('[Watermark Studio] Błąd zapisu PDF:', err);
            if (window.showNotification) {
                window.showNotification('Błąd zapisu znaku wodnego: ' + (err.message || 'Nieznany błąd'), 'error');
            }
        } finally {
            if (btnExport) {
                btnExport.classList.remove('loading');
                btnExport.innerHTML = origBtnText;
            }
        }
    }

    // Auto-inicjalizacja po załadowaniu DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Eksport do przestrzeni globalnej
    window.DropsiteWatermarkStudio = {
        loadFile: loadFile,
        updateLiveOverlay: updateLiveOverlay
    };

})();
