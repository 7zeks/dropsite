/**
 * ============================================================================
 * DROPSITE DOCUMENT DIFF RADAR STUDIO
 * ============================================================================
 * 100% Client-Side Visual & Textual Comparison Engine in RAM.
 * Zero upload to server • Supports PDF, Images & Text files.
 * ============================================================================
 */

(function () {
    'use strict';

    const state = {
        fileA: null,
        fileB: null,
        docType: null, // 'image', 'pdf', 'text'
        currentPage: 1,
        totalPages: 1,
        activeMode: 'curtain', // 'curtain', 'side-by-side', 'heatmap', 'text'
        canvasA: null,
        canvasB: null,
        textLinesA: [],
        textLinesB: []
    };

    /**
     * Odczyt i parsowanie plików A i B
     */
    async function processComparison() {
        if (!state.fileA || !state.fileB) return;

        const isTextA = isTextFile(state.fileA);
        const isTextB = isTextFile(state.fileB);
        const isPdfA = state.fileA.type === 'application/pdf' || state.fileA.name.endsWith('.pdf');
        const isPdfB = state.fileB.type === 'application/pdf' || state.fileB.name.endsWith('.pdf');
        const isImgA = state.fileA.type.startsWith('image/');
        const isImgB = state.fileB.type.startsWith('image/');

        if (isTextA && isTextB) {
            state.docType = 'text';
            await processTextDiff();
        } else if (isPdfA && isPdfB) {
            state.docType = 'pdf';
            await processPdfDiff();
        } else if (isImgA && isImgB) {
            state.docType = 'image';
            await processImageDiff();
        } else {
            if (window.showToast) window.showToast('Wybierz dwa pliki tego samego typu (dwa PDF, dwa obrazy lub dwa pliki tekstowe).', 'warning');
        }
    }

    function isTextFile(file) {
        const textExts = ['.txt', '.md', '.json', '.js', '.html', '.css', '.csv', '.xml', '.ts', '.py'];
        return file.type.startsWith('text/') || textExts.some(ext => file.name.toLowerCase().endsWith(ext));
    }

    /**
     * Porównywanie obrazów
     */
    async function processImageDiff() {
        const imgA = await loadImage(state.fileA);
        const imgB = await loadImage(state.fileB);

        const width = Math.max(imgA.width, imgB.width);
        const height = Math.max(imgA.height, imgB.height);

        state.canvasA = document.createElement('canvas');
        state.canvasA.width = width;
        state.canvasA.height = height;
        const ctxA = state.canvasA.getContext('2d');
        ctxA.drawImage(imgA, 0, 0);

        state.canvasB = document.createElement('canvas');
        state.canvasB.width = width;
        state.canvasB.height = height;
        const ctxB = state.canvasB.getContext('2d');
        ctxB.drawImage(imgB, 0, 0);

        renderVisualViews();
    }

    /**
     * Porównywanie dokumentów PDF (strona po stronie)
     */
    async function processPdfDiff() {
        if (!window.pdfjsLib) {
            if (window.loadToolboxScripts) {
                await window.loadToolboxScripts();
            }
        }
        if (!window.pdfjsLib) {
            throw new Error('Biblioteka PDF.js nie jest dostępna.');
        }

        const bufA = await state.fileA.arrayBuffer();
        const bufB = await state.fileB.arrayBuffer();

        const pdfDocA = await window.pdfjsLib.getDocument({ data: bufA }).promise;
        const pdfDocB = await window.pdfjsLib.getDocument({ data: bufB }).promise;

        state.totalPages = Math.max(pdfDocA.numPages, pdfDocB.numPages);
        state.currentPage = Math.min(state.currentPage, state.totalPages);

        const pageA = state.currentPage <= pdfDocA.numPages ? await pdfDocA.getPage(state.currentPage) : null;
        const pageB = state.currentPage <= pdfDocB.numPages ? await pdfDocB.getPage(state.currentPage) : null;

        const viewportA = pageA ? pageA.getViewport({ scale: 1.5 }) : { width: 800, height: 1100 };
        const viewportB = pageB ? pageB.getViewport({ scale: 1.5 }) : { width: 800, height: 1100 };

        const width = Math.max(viewportA.width, viewportB.width);
        const height = Math.max(viewportA.height, viewportB.height);

        state.canvasA = document.createElement('canvas');
        state.canvasA.width = width;
        state.canvasA.height = height;
        const ctxA = state.canvasA.getContext('2d');
        ctxA.fillStyle = '#FFFFFF';
        ctxA.fillRect(0, 0, width, height);
        if (pageA) await pageA.render({ canvasContext: ctxA, viewport: viewportA }).promise;

        state.canvasB = document.createElement('canvas');
        state.canvasB.width = width;
        state.canvasB.height = height;
        const ctxB = state.canvasB.getContext('2d');
        ctxB.fillStyle = '#FFFFFF';
        ctxB.fillRect(0, 0, width, height);
        if (pageB) await pageB.render({ canvasContext: ctxB, viewport: viewportB }).promise;

        renderVisualViews();
    }

    function loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => { resolve(img); };
            img.onerror = reject;
            img.src = url;
        });
    }

    /**
     * Renderowanie widoków wizualnych: Curtain, Side-by-side oraz Heatmap
     */
    function renderVisualViews() {
        const curtainLayerA = document.getElementById('diffCurtainLayerA');
        const curtainLayerB = document.getElementById('diffCurtainLayerB');
        const sideBoxA = document.getElementById('diffSideBoxA');
        const sideBoxB = document.getElementById('diffSideBoxB');
        const heatmapCanvas = document.getElementById('diffHeatmapCanvas');

        if (!curtainLayerA || !curtainLayerB || !state.canvasA || !state.canvasB) return;

        // 1. Curtain
        curtainLayerA.innerHTML = '';
        curtainLayerB.innerHTML = '';
        const cA = cloneCanvas(state.canvasA);
        const cB = cloneCanvas(state.canvasB);
        curtainLayerA.appendChild(cA);
        curtainLayerB.appendChild(cB);

        // 2. Side by side
        if (sideBoxA && sideBoxB) {
            sideBoxA.innerHTML = '';
            sideBoxB.innerHTML = '';
            sideBoxA.appendChild(cloneCanvas(state.canvasA));
            sideBoxB.appendChild(cloneCanvas(state.canvasB));
        }

        // 3. Heatmap & Pixel Difference calculation
        if (heatmapCanvas) {
            const w = state.canvasA.width;
            const h = state.canvasA.height;
            heatmapCanvas.width = w;
            heatmapCanvas.height = h;

            const hCtx = heatmapCanvas.getContext('2d');
            const dataA = state.canvasA.getContext('2d').getImageData(0, 0, w, h).data;
            const dataB = state.canvasB.getContext('2d').getImageData(0, 0, w, h).data;

            const heatImg = hCtx.createImageData(w, h);
            const heatData = heatImg.data;

            let diffPixels = 0;
            const totalPixels = w * h;

            for (let i = 0; i < dataA.length; i += 4) {
                const rDiff = Math.abs(dataA[i] - dataB[i]);
                const gDiff = Math.abs(dataA[i + 1] - dataB[i + 1]);
                const bDiff = Math.abs(dataA[i + 2] - dataB[i + 2]);
                const delta = (rDiff + gDiff + bDiff) / 3;

                if (delta > 18) { // próg czułości
                    diffPixels++;
                    // Jeśli w B jest ciemniejszy (dodany tusz/tekst) -> Neon Mint
                    // Jeśli w A był ciemniejszy (usunięty tusz) -> Neon Coral
                    const lumA = (dataA[i] + dataA[i + 1] + dataA[i + 2]) / 3;
                    const lumB = (dataB[i] + dataB[i + 1] + dataB[i + 2]) / 3;

                    if (lumB < lumA) {
                        // Dodany element (Mint)
                        heatData[i] = 52;
                        heatData[i + 1] = 211;
                        heatData[i + 2] = 153;
                        heatData[i + 3] = 255;
                    } else {
                        // Usunięty element (Coral)
                        heatData[i] = 255;
                        heatData[i + 1] = 68;
                        heatData[i + 2] = 57;
                        heatData[i + 3] = 255;
                    }
                } else {
                    // Tło identyczne (subtelny przyciemniony monochrom)
                    const baseLum = (dataA[i] + dataA[i + 1] + dataA[i + 2]) / 3;
                    heatData[i] = Math.floor(baseLum * 0.25);
                    heatData[i + 1] = Math.floor(baseLum * 0.28);
                    heatData[i + 2] = Math.floor(baseLum * 0.35);
                    heatData[i + 3] = 255;
                }
            }

            hCtx.putImageData(heatImg, 0, 0);

            // Aktualizacja wskaźnika zgodności
            const matchScore = (100 - (diffPixels / totalPixels) * 100).toFixed(1);
            const scoreEl = document.getElementById('diffMatchScore');
            if (scoreEl) scoreEl.textContent = `${matchScore}%`;
        }

        switchViewMode(state.activeMode || 'curtain');
    }

    function cloneCanvas(oldCanvas) {
        const newCanvas = document.createElement('canvas');
        newCanvas.width = oldCanvas.width;
        newCanvas.height = oldCanvas.height;
        const ctx = newCanvas.getContext('2d');
        ctx.drawImage(oldCanvas, 0, 0);
        return newCanvas;
    }

    /**
     * Porównywanie tekstowe (LCS Diff)
     */
    async function processTextDiff() {
        const textA = await state.fileA.text();
        const textB = await state.fileB.text();

        const linesA = textA.split(/\r?\n/);
        const linesB = textB.split(/\r?\n/);

        const diffOps = computeLcsDiff(linesA, linesB);
        renderTextDiff(diffOps);
        switchViewMode('text');
    }

    function computeLcsDiff(a, b) {
        const n = a.length;
        const m = b.length;
        // Uproszczony wydajny LCS dla diff
        const matrix = [];
        for (let i = 0; i <= n; i++) {
            matrix[i] = new Uint16Array(m + 1);
        }

        for (let i = 1; i <= n; i++) {
            for (let j = 1; j <= m; j++) {
                if (a[i - 1] === b[j - 1]) {
                    matrix[i][j] = matrix[i - 1][j - 1] + 1;
                } else {
                    matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
                }
            }
        }

        const result = [];
        let i = n, j = m;
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
                result.unshift({ type: 'unchanged', text: a[i - 1], lineA: i, lineB: j });
                i--; j--;
            } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
                result.unshift({ type: 'added', text: b[j - 1], lineB: j });
                j--;
            } else if (i > 0 && (j === 0 || matrix[i][j - 1] < matrix[i - 1][j])) {
                result.unshift({ type: 'removed', text: a[i - 1], lineA: i });
                i--;
            }
        }

        return result;
    }

    function renderTextDiff(ops) {
        const textView = document.getElementById('diffTextView');
        if (!textView) return;
        textView.innerHTML = '';

        let addedCount = 0;
        let removedCount = 0;

        ops.forEach(op => {
            const lineEl = document.createElement('div');
            lineEl.className = `diff-line ${op.type}`;

            let prefix = ' ';
            if (op.type === 'added') { prefix = '+'; addedCount++; }
            if (op.type === 'removed') { prefix = '-'; removedCount++; }

            lineEl.innerHTML = `
                <span class="diff-line-no">${op.lineA || op.lineB || ''}</span>
                <span class="diff-line-prefix">${prefix}</span>
                <span class="diff-line-text">${escapeHtml(op.text)}</span>
            `;
            textView.appendChild(lineEl);
        });

        const scoreEl = document.getElementById('diffMatchScore');
        if (scoreEl) {
            const total = ops.length;
            const match = ops.filter(o => o.type === 'unchanged').length;
            scoreEl.textContent = total > 0 ? `${((match / total) * 100).toFixed(1)}%` : '100%';
        }
    }

    function switchViewMode(mode) {
        state.activeMode = mode;
        const curtainView = document.getElementById('diffCurtainViewport');
        const sideView = document.getElementById('diffSideBySideGrid');
        const heatView = document.getElementById('diffHeatmapView');
        const textView = document.getElementById('diffTextView');

        if (curtainView) curtainView.style.display = mode === 'curtain' ? 'block' : 'none';
        if (sideView) sideView.style.display = mode === 'side-by-side' ? 'grid' : 'none';
        if (heatView) heatView.style.display = mode === 'heatmap' ? 'block' : 'none';
        if (textView) textView.style.display = mode === 'text' ? 'block' : 'none';

        document.querySelectorAll('.diff-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
        });
    }

    function initDiffUI() {
        const dropCardA = document.getElementById('diffDropCardA');
        const inputA = document.getElementById('diffInputA');
        const dropCardB = document.getElementById('diffDropCardB');
        const inputB = document.getElementById('diffInputB');

        if (dropCardA && inputA) {
            dropCardA.addEventListener('click', () => inputA.click());
            dropCardA.addEventListener('dragover', (e) => { e.preventDefault(); dropCardA.classList.add('drag-over'); });
            dropCardA.addEventListener('dragleave', () => dropCardA.classList.remove('drag-over'));
            dropCardA.addEventListener('drop', (e) => {
                e.preventDefault();
                dropCardA.classList.remove('drag-over');
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    loadFile(e.dataTransfer.files[0], 'A');
                }
            });
            inputA.addEventListener('change', () => {
                if (inputA.files && inputA.files[0]) loadFile(inputA.files[0], 'A');
            });
        }

        if (dropCardB && inputB) {
            dropCardB.addEventListener('click', () => inputB.click());
            dropCardB.addEventListener('dragover', (e) => { e.preventDefault(); dropCardB.classList.add('drag-over'); });
            dropCardB.addEventListener('dragleave', () => dropCardB.classList.remove('drag-over'));
            dropCardB.addEventListener('drop', (e) => {
                e.preventDefault();
                dropCardB.classList.remove('drag-over');
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    loadFile(e.dataTransfer.files[0], 'B');
                }
            });
            inputB.addEventListener('change', () => {
                if (inputB.files && inputB.files[0]) loadFile(inputB.files[0], 'B');
            });
        }

        function loadFile(file, side) {
            if (side === 'A') {
                state.fileA = file;
                if (dropCardA) dropCardA.classList.add('is-loaded');
                const nameEl = document.getElementById('diffNameA');
                const sizeEl = document.getElementById('diffSizeA');
                if (nameEl) nameEl.textContent = file.name;
                if (sizeEl) sizeEl.textContent = formatBytes(file.size);
            } else {
                state.fileB = file;
                if (dropCardB) dropCardB.classList.add('is-loaded');
                const nameEl = document.getElementById('diffNameB');
                const sizeEl = document.getElementById('diffSizeB');
                if (nameEl) nameEl.textContent = file.name;
                if (sizeEl) sizeEl.textContent = formatBytes(file.size);
            }

            if (state.fileA && state.fileB) {
                processComparison();
            }
        }

        // Przyciski wyboru trybów
        document.querySelectorAll('.diff-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.getAttribute('data-mode');
                switchViewMode(mode);
            });
        });

        // Suwak kurtynowy (Curtain divider drag)
        const curtainViewport = document.getElementById('diffCurtainViewport');
        const curtainDivider = document.getElementById('diffCurtainDivider');
        const layerB = document.getElementById('diffCurtainLayerB');

        if (curtainViewport && curtainDivider && layerB) {
            let isDragging = false;

            const onMove = (clientX) => {
                const rect = curtainViewport.getBoundingClientRect();
                let x = clientX - rect.left;
                x = Math.max(0, Math.min(x, rect.width));
                const pct = (x / rect.width) * 100;

                curtainDivider.style.left = `${pct}%`;
                layerB.style.clipPath = `polygon(${pct}% 0, 100% 0, 100% 100%, ${pct}% 100%)`;
            };

            curtainViewport.addEventListener('mousedown', (e) => {
                isDragging = true;
                onMove(e.clientX);
            });
            window.addEventListener('mousemove', (e) => {
                if (isDragging) onMove(e.clientX);
            });
            window.addEventListener('mouseup', () => { isDragging = false; });

            // Obsługa dotyku (Touch)
            curtainViewport.addEventListener('touchstart', (e) => {
                if (e.touches && e.touches[0]) {
                    isDragging = true;
                    onMove(e.touches[0].clientX);
                }
            }, { passive: true });
            window.addEventListener('touchmove', (e) => {
                if (isDragging && e.touches && e.touches[0]) {
                    onMove(e.touches[0].clientX);
                }
            }, { passive: true });
            window.addEventListener('touchend', () => { isDragging = false; });
        }
    }

    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    window.DropsiteDiff = {
        init: initDiffUI
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDiffUI);
    } else {
        initDiffUI();
    }
})();
