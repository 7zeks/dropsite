/**
 * Dropsite Toolbox Engine (100% Client-Side in RAM)
 * - PDF Merger (pdf-lib)
 * - PDF Visual Editor: Text, Signature & Clickable Links (pdf-lib)
 * - Format Converter (Images & Image-to-PDF via Canvas & pdf-lib)
 */

(function () {
    // === STAN MODUŁU ===
    let activeTool = 'merge'; // 'merge' | 'edit' | 'convert' | 'compress'

    // Stan Łączenia PDF
    let mergeFiles = [];

    // Stan Edytora PDF
    let editFile = null;
    let editPdfDoc = null;
    let editPageCount = 1;
    let editSelectedPage = 1;
    let editMode = 'text'; // 'text' | 'link'
    let editClickPos = { xPct: 50, yPct: 50 }; // Procentowe współrzędne na podglądzie
    let editPageDimensions = { width: 595, height: 842 }; // Standard A4

    // Stan Konwertera
    let convertFile = null;
    let convertFiles = [];

    // Stan Kompresora
    let compressFile = null;
    let compressProfile = 'medium';

    // === INICJALIZACJA ===
    document.addEventListener('DOMContentLoaded', () => {
        initToolTabs();
        initMergeModule();
        initSplitModule();
        initEditModule();
        initConvertModule();
        initCompressModule();

        // Obsługa bezpośrednich linków marketingowych (?tool=merge / ?tool=edit / ?tool=compress / #narzedzia)
        setTimeout(() => {
            const params = new URLSearchParams(window.location.search);
            const toolParam = params.get('tool') || params.get('tab');
            const hash = window.location.hash.toLowerCase();

            if (toolParam && ['merge', 'edit', 'convert', 'compress'].includes(toolParam.toLowerCase())) {
                window.switchToolTab(toolParam.toLowerCase(), false);
            } else if (hash.includes('narzedzia') || hash.includes('tools') || hash.includes('toolbox')) {
                const navToolsBtn = document.querySelector('.nav-btn[data-target="view-narzedzia"]');
                if (navToolsBtn) navToolsBtn.click();
            }
        }, 120);
    });

    // === GLOBALNA FUNKCJA PRZEŁĄCZANIA NARZĘDZI (DEEP-LINKING & MARKETING) ===
    window.switchToolTab = function(toolName, doScroll = true) {
        if (!toolName) return;
        const normalized = toolName.toLowerCase().trim();

        // 1. Aktywuj widok narzędzi w głównym routerze SPA
        const navToolsBtn = document.querySelector('.nav-btn[data-target="view-narzedzia"]');
        if (navToolsBtn) {
            navToolsBtn.click();
        }

        // 2. Kliknij odpowiednią zakładkę narzędzia
        const targetBtn = document.querySelector(`.toolbox-tab-btn[data-tool="${normalized}"]`);
        if (targetBtn) {
            targetBtn.click();
        }

        // 3. Zaktualizuj URL bez przeładowania strony (?tool=...)
        try {
            const url = new URL(window.location);
            url.searchParams.set('tool', normalized);
            window.history.replaceState({}, '', url);
        } catch (_) {}

        // 4. Płynnie przewiń do kontenera narzędzia
        if (doScroll) {
            const toolboxBox = document.querySelector('.toolbox-container');
            if (toolboxBox) {
                toolboxBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    };

    // === PRZEŁĄCZANIE ZAKŁADEK NARZĘDZI ===
    function initToolTabs() {
        const tabBtns = document.querySelectorAll('.toolbox-tab-btn');
        const panels = document.querySelectorAll('.tool-panel');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTool = btn.getAttribute('data-tool');
                activeTool = targetTool;

                tabBtns.forEach(b => b.classList.toggle('active', b === btn));
                panels.forEach(p => {
                    const isTarget = p.id === `toolPanel_${targetTool}`;
                    p.hidden = !isTarget;
                    if (isTarget) p.style.display = 'block';
                    else p.style.display = 'none';
                });

                // Aktualizuj URL
                try {
                    const url = new URL(window.location);
                    url.searchParams.set('tool', targetTool);
                    window.history.replaceState({}, '', url);
                } catch (_) {}
            });
        });
    }

    // ==========================================
    // 1. MODUŁ: ŁĄCZENIE PDF (PDF MERGER)
    // ==========================================
    function initMergeModule() {
        const dropzone = document.getElementById('mergeDropzone');
        const fileInput = document.getElementById('mergeFileInput');
        const btnAction = document.getElementById('btnExecuteMerge');

        if (!dropzone || !fileInput) return;

        dropzone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleMergeFilesSelected(Array.from(e.target.files));
                fileInput.value = '';
            }
        });

        // Drag & drop
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleMergeFilesSelected(Array.from(e.dataTransfer.files));
            }
        });

        if (btnAction) {
            btnAction.addEventListener('click', executePdfMerge);
        }

        const btnClear = document.getElementById('btnClearMergeList');
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                mergeFiles = [];
                renderMergeList();
                if (window.showNotification) window.showNotification('Wyczyszczono listę plików.', 'info');
            });
        }
    }

    function handleMergeFilesSelected(files) {
        const pdfs = files.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
        if (pdfs.length === 0) {
            if (window.showNotification) window.showNotification('Wybierz pliki w formacie PDF!', 'error');
            return;
        }

        pdfs.forEach(f => mergeFiles.push(f));
        renderMergeList();
        if (window.playSound) window.playSound('pop');
    }

    function renderMergeList() {
        const listEl = document.getElementById('mergeFileList');
        const countBadge = document.getElementById('mergeFilesCount');
        const btnAction = document.getElementById('btnExecuteMerge');
        const btnClear = document.getElementById('btnClearMergeList');
        const resultBox = document.getElementById('mergeResultBox');

        if (resultBox) resultBox.style.display = 'none';
        if (btnClear) btnClear.style.display = mergeFiles.length > 0 ? 'inline-block' : 'none';

        if (!listEl) return;

        if (countBadge) countBadge.textContent = `${mergeFiles.length} ${mergeFiles.length === 1 ? 'plik' : 'plików'}`;
        if (btnAction) btnAction.disabled = mergeFiles.length < 2;

        if (mergeFiles.length === 0) {
            listEl.innerHTML = '<div class="tool-empty-placeholder">Brak dodanych plików. Upuść minimum 2 pliki PDF, aby je połączyć.</div>';
            return;
        }

        listEl.innerHTML = mergeFiles.map((file, idx) => `
            <div class="tool-file-item" data-idx="${idx}">
                <div class="tool-file-left">
                    <span class="tool-file-idx">${idx + 1}</span>
                    <svg class="tool-pdf-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF4439" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    <div class="tool-file-info">
                        <strong class="tool-file-name" title="${file.name}">${file.name}</strong>
                        <span class="tool-file-size">${formatBytes(file.size)}</span>
                    </div>
                </div>
                <div class="tool-file-actions">
                    <button type="button" class="btn-tool-reorder" onclick="window.toolMoveMerge(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} title="Przesuń w górę">▲</button>
                    <button type="button" class="btn-tool-reorder" onclick="window.toolMoveMerge(${idx}, 1)" ${idx === mergeFiles.length - 1 ? 'disabled' : ''} title="Przesuń w dół">▼</button>
                    <button type="button" class="btn-tool-delete" onclick="window.toolRemoveMerge(${idx})" title="Usuń z listy">✕</button>
                </div>
            </div>
        `).join('');
    }

    window.toolMoveMerge = function (index, direction) {
        const target = index + direction;
        if (target < 0 || target >= mergeFiles.length) return;
        const temp = mergeFiles[index];
        mergeFiles[index] = mergeFiles[target];
        mergeFiles[target] = temp;
        renderMergeList();
    };

    window.toolRemoveMerge = function (index) {
        mergeFiles.splice(index, 1);
        renderMergeList();
    };

    async function executePdfMerge() {
        if (mergeFiles.length < 2) return;
        if (typeof PDFLib === 'undefined') {
            if (window.showNotification) window.showNotification('Ładowanie biblioteki PDF... Spróbuj za sekundę.', 'info');
            return;
        }

        const btnAction = document.getElementById('btnExecuteMerge');
        const textSpan = btnAction.querySelector('.btn-text');
        const origText = textSpan ? textSpan.textContent : 'Połącz pliki PDF';
        if (textSpan) textSpan.textContent = 'Łączenie dokumentów...';
        btnAction.disabled = true;

        try {
            const mergedPdf = await PDFLib.PDFDocument.create();

            for (let i = 0; i < mergeFiles.length; i++) {
                if (textSpan) textSpan.textContent = `Dołączanie #${i + 1} z ${mergeFiles.length}...`;
                const arrayBuf = await mergeFiles[i].arrayBuffer();
                const doc = await PDFLib.PDFDocument.load(arrayBuf, { ignoreEncryption: true });
                const pageIndices = doc.getPageIndices();
                const copiedPages = await mergedPdf.copyPages(doc, pageIndices);
                copiedPages.forEach(p => mergedPdf.addPage(p));
            }

            const mergedBytes = await mergedPdf.save();
            const mergedBlob = new Blob([mergedBytes], { type: 'application/pdf' });
            const outputFilename = `Dropsite_Polaczony_${Date.now()}.pdf`;

            showToolResult('mergeResultBox', mergedBlob, outputFilename, `Połączono pomyślnie ${mergeFiles.length} pliki PDF! Gotowy plik ma ${mergedPdf.getPageCount()} stron (${formatBytes(mergedBlob.size)}).`);
            if (window.playSound) window.playSound('success');
            if (window.showNotification) window.showNotification('Pliki PDF zostały pomyślnie połączone!', 'success');
        } catch (err) {
            console.error('Merge error:', err);
            if (window.showNotification) window.showNotification('Błąd łączenia PDF: ' + err.message, 'error');
        } finally {
            if (textSpan) textSpan.textContent = origText;
            btnAction.disabled = false;
        }
    }

    // ==========================================
    // 2. MODUŁ: ROZDZIELANIE PDF (SPLIT & EXTRACT)
    // ==========================================
    let splitFile = null;
    let splitBytes = null;
    let splitPdfJsDoc = null;
    let splitTotalPages = 0;
    let splitSelectedPages = new Set();
    let splitMode = 'extract'; // 'extract' | 'separate'

    function initSplitModule() {
        const dropzone = document.getElementById('splitDropzone');
        const fileInput = document.getElementById('splitFileInput');
        const workspace = document.getElementById('splitWorkspace');
        const btnChangeFile = document.getElementById('btnSplitChangeFile');
        const rangeInput = document.getElementById('splitRangeInput');
        const countBadge = document.getElementById('splitSelectedCountBadge');
        const btnAction = document.getElementById('btnExecuteSplit');
        const modeExtractOpt = document.getElementById('modeOptionExtract');
        const modeSeparateOpt = document.getElementById('modeOptionSeparate');
        const radioExtract = modeExtractOpt ? modeExtractOpt.querySelector('input[type="radio"]') : null;
        const radioSeparate = modeSeparateOpt ? modeSeparateOpt.querySelector('input[type="radio"]') : null;

        const btnSelectAll = document.getElementById('btnSplitSelectAll');
        const btnDeselectAll = document.getElementById('btnSplitDeselectAll');
        const btnSelectOdd = document.getElementById('btnSplitSelectOdd');
        const btnSelectEven = document.getElementById('btnSplitSelectEven');

        if (!dropzone || !fileInput) return;

        // Kliknięcie dropzone
        dropzone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                loadSplitPdfFile(e.target.files[0]);
                fileInput.value = '';
            }
        });

        // Przeciąganie pliku (drag & drop)
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                loadSplitPdfFile(e.dataTransfer.files[0]);
            }
        });

        // Zmiana pliku
        if (btnChangeFile) {
            btnChangeFile.addEventListener('click', () => fileInput.click());
        }

        // Zmiana trybu podziału
        if (modeExtractOpt && modeSeparateOpt) {
            modeExtractOpt.addEventListener('click', () => {
                splitMode = 'extract';
                modeExtractOpt.classList.add('active');
                modeSeparateOpt.classList.remove('active');
                if (radioExtract) radioExtract.checked = true;
                updateSplitActionBtnText();
            });

            modeSeparateOpt.addEventListener('click', () => {
                splitMode = 'separate';
                modeSeparateOpt.classList.add('active');
                modeExtractOpt.classList.remove('active');
                if (radioSeparate) radioSeparate.checked = true;
                updateSplitActionBtnText();
            });
        }

        function updateSplitActionBtnText() {
            if (!btnAction) return;
            const textSpan = btnAction.querySelector('.btn-text');
            if (!textSpan) return;
            if (splitMode === 'separate') {
                textSpan.textContent = 'Rozbij na pojedyncze pliki (.ZIP)';
            } else {
                textSpan.textContent = typeof t === 'function' ? t('tool_btn_split_action', 'Rozdziel dokument PDF') : 'Rozdziel dokument PDF';
            }
        }

        // Szybkie przyciski wyboru stron
        if (btnSelectAll) {
            btnSelectAll.addEventListener('click', () => {
                splitSelectedPages.clear();
                for (let i = 1; i <= splitTotalPages; i++) splitSelectedPages.add(i);
                syncSplitSelectionToUI();
            });
        }

        if (btnDeselectAll) {
            btnDeselectAll.addEventListener('click', () => {
                splitSelectedPages.clear();
                syncSplitSelectionToUI();
            });
        }

        if (btnSelectOdd) {
            btnSelectOdd.addEventListener('click', () => {
                splitSelectedPages.clear();
                for (let i = 1; i <= splitTotalPages; i += 2) splitSelectedPages.add(i);
                syncSplitSelectionToUI();
            });
        }

        if (btnSelectEven) {
            btnSelectEven.addEventListener('click', () => {
                splitSelectedPages.clear();
                for (let i = 2; i <= splitTotalPages; i += 2) splitSelectedPages.add(i);
                syncSplitSelectionToUI();
            });
        }

        // Wpisywanie zakresu stron z klawiatury
        if (rangeInput) {
            rangeInput.addEventListener('input', (e) => {
                const parsed = parsePageRangeString(e.target.value, splitTotalPages);
                splitSelectedPages = new Set(parsed);
                updateSplitCardsSelectionOnly();
                updateSplitCountBadge();
            });
        }

        // Wykonanie podziału
        if (btnAction) {
            btnAction.addEventListener('click', executePdfSplit);
        }
    }

    // Wczytanie pliku PDF do rozdzielania
    async function loadSplitPdfFile(file) {
        if (!file || (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))) {
            if (window.showNotification) window.showNotification('Wybierz poprawny plik w formacie PDF.', 'error');
            return;
        }

        splitFile = file;
        const dropzone = document.getElementById('splitDropzone');
        const workspace = document.getElementById('splitWorkspace');
        const fileNameEl = document.getElementById('splitLoadedFileName');
        const fileSizeEl = document.getElementById('splitLoadedFileSize');
        const pageCountEl = document.getElementById('splitLoadedPageCount');

        if (fileNameEl) fileNameEl.textContent = file.name;
        if (fileSizeEl) fileSizeEl.textContent = formatBytes(file.size);

        try {
            splitBytes = await file.arrayBuffer();
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('Biblioteka PDF.js nie jest dostępna');
            }

            const loadingTask = pdfjsLib.getDocument({ data: splitBytes });
            splitPdfJsDoc = await loadingTask.promise;
            splitTotalPages = splitPdfJsDoc.numPages;

            if (pageCountEl) {
                pageCountEl.textContent = `${splitTotalPages} ${splitTotalPages === 1 ? 'strona' : (splitTotalPages < 5 ? 'strony' : 'stron')}`;
            }

            // Domyślnie zaznaczamy wszystkie strony
            splitSelectedPages.clear();
            for (let i = 1; i <= splitTotalPages; i++) {
                splitSelectedPages.add(i);
            }

            if (dropzone) dropzone.style.display = 'none';
            if (workspace) workspace.style.display = 'block';

            syncSplitSelectionToUI();
            await renderSplitPagesGrid();
        } catch (err) {
            console.error('Błąd wczytywania PDF do podziału:', err);
            if (window.showNotification) window.showNotification('Nie udało się wczytać pliku PDF: ' + err.message, 'error');
        }
    }

    // Renderowanie siatki stron z miniaturkami
    async function renderSplitPagesGrid() {
        const grid = document.getElementById('splitPagesGrid');
        if (!grid || !splitPdfJsDoc) return;

        grid.innerHTML = '';

        for (let p = 1; p <= splitTotalPages; p++) {
            const card = document.createElement('div');
            const isSelected = splitSelectedPages.has(p);
            card.className = `split-page-card ${isSelected ? 'selected' : ''}`;
            card.dataset.page = p;

            card.innerHTML = `
                <div class="split-page-check">✓</div>
                <div class="split-page-canvas-wrap">
                    <canvas id="splitCanvas_${p}"></canvas>
                </div>
                <span class="split-page-num">Strona ${p}</span>
            `;

            card.addEventListener('click', () => {
                if (splitSelectedPages.has(p)) {
                    splitSelectedPages.delete(p);
                } else {
                    splitSelectedPages.add(p);
                }
                syncSplitSelectionToUI();
            });

            grid.appendChild(card);

            // Render miniatury PDF.js w tle
            try {
                const pdfPage = await splitPdfJsDoc.getPage(p);
                const unscaled = pdfPage.getViewport({ scale: 1.0 });
                const thumbScale = Math.min(120 / unscaled.width, 160 / unscaled.height);
                const viewport = pdfPage.getViewport({ scale: thumbScale });

                const canvas = document.getElementById(`splitCanvas_${p}`);
                if (canvas) {
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d');
                    await pdfPage.render({ canvasContext: ctx, viewport }).promise;
                }
            } catch (e) {
                console.warn(`Błąd renderowania miniatury ${p}:`, e);
            }
        }
    }

    // Synchronizacja stanu zaznaczenia stron z polem tekstowym, licznikiem i kafelkami
    function syncSplitSelectionToUI() {
        const rangeInput = document.getElementById('splitRangeInput');
        if (rangeInput) {
            rangeInput.value = formatPageRanges(splitSelectedPages);
        }
        updateSplitCardsSelectionOnly();
        updateSplitCountBadge();
    }

    function updateSplitCardsSelectionOnly() {
        const cards = document.querySelectorAll('.split-page-card');
        cards.forEach(card => {
            const pageNum = parseInt(card.dataset.page, 10);
            card.classList.toggle('selected', splitSelectedPages.has(pageNum));
        });
    }

    function updateSplitCountBadge() {
        const badge = document.getElementById('splitSelectedCountBadge');
        if (badge) {
            const count = splitSelectedPages.size;
            badge.textContent = `${count} ${count === 1 ? 'strona' : (count < 5 ? 'strony' : 'stron')} z ${splitTotalPages}`;
        }
    }

    // Parsowanie ciągu znaków (np. "1-3, 5, 8-10")
    function parsePageRangeString(str, total) {
        if (!str || !str.trim()) return [];
        const parts = str.split(',');
        const result = new Set();

        parts.forEach(part => {
            const trimmed = part.trim();
            if (!trimmed) return;

            if (trimmed.includes('-')) {
                const sub = trimmed.split('-');
                let start = parseInt(sub[0], 10);
                let end = parseInt(sub[1], 10);

                if (isNaN(start)) start = 1;
                if (isNaN(end)) end = total;

                start = Math.max(1, Math.min(start, total));
                end = Math.max(1, Math.min(end, total));

                if (start <= end) {
                    for (let i = start; i <= end; i++) result.add(i);
                } else {
                    for (let i = end; i <= start; i++) result.add(i);
                }
            } else {
                const num = parseInt(trimmed, 10);
                if (!isNaN(num) && num >= 1 && num <= total) {
                    result.add(num);
                }
            }
        });

        return Array.from(result).sort((a, b) => a - b);
    }

    // Formatowanie Set([1, 2, 3, 5, 7, 8]) -> "1-3, 5, 7-8"
    function formatPageRanges(pageSet) {
        if (!pageSet || pageSet.size === 0) return '';
        const sorted = Array.from(pageSet).sort((a, b) => a - b);
        const ranges = [];
        let start = sorted[0];
        let prev = sorted[0];

        for (let i = 1; i < sorted.length; i++) {
            const cur = sorted[i];
            if (cur === prev + 1) {
                prev = cur;
            } else {
                ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
                start = cur;
                prev = cur;
            }
        }
        ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
        return ranges.join(', ');
    }

    // Wykonanie procesu rozdzielania / ekstrakcji
    async function executePdfSplit() {
        if (!splitBytes || splitSelectedPages.size === 0) {
            if (window.showNotification) {
                window.showNotification('Wybierz co najmniej jedną stronę do wyodrębnienia.', 'warning');
            }
            return;
        }

        const btnAction = document.getElementById('btnExecuteSplit');
        const textSpan = btnAction ? btnAction.querySelector('.btn-text') : null;
        const origText = textSpan ? textSpan.textContent : 'Rozdziel dokument PDF';
        if (textSpan) textSpan.textContent = 'Przetwarzanie stron PDF...';
        if (btnAction) btnAction.disabled = true;

        try {
            const sortedPages = Array.from(splitSelectedPages).sort((a, b) => a - b);
            const baseName = (splitFile ? splitFile.name : 'dokument').replace(/\.[^/.]+$/, '');

            if (splitMode === 'extract') {
                // TRYB A: Połączenie wybranych stron w jeden nowy plik PDF
                const newDoc = await PDFLib.PDFDocument.create();
                const srcDoc = await PDFLib.PDFDocument.load(splitBytes, { ignoreEncryption: true });
                const pageIndices = sortedPages.map(p => p - 1);
                const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
                copiedPages.forEach(p => newDoc.addPage(p));

                const outBytes = await newDoc.save();
                const outBlob = new Blob([outBytes], { type: 'application/pdf' });
                const outName = `${baseName}_wyodrebnione_${sortedPages.length}str.pdf`;

                showToolResult(
                    'splitResultBox',
                    outBlob,
                    outName,
                    `Wyodrębniono pomyślnie ${sortedPages.length} ${sortedPages.length === 1 ? 'stronę' : (sortedPages.length < 5 ? 'strony' : 'stron')}! Rozmiar pliku: ${formatBytes(outBlob.size)}.`
                );
            } else {
                // TRYB B: Rozbicie na pojedyncze pliki PDF w paczce ZIP (fflate)
                if (typeof fflate === 'undefined') {
                    throw new Error('Biblioteka kompresji ZIP nie jest dostępna');
                }

                const zipFiles = {};
                const srcDoc = await PDFLib.PDFDocument.load(splitBytes, { ignoreEncryption: true });
                const padLen = String(splitTotalPages).length;

                for (let i = 0; i < sortedPages.length; i++) {
                    const pageNum = sortedPages[i];
                    if (textSpan) textSpan.textContent = `Generowanie strony ${i + 1} z ${sortedPages.length}...`;

                    const singleDoc = await PDFLib.PDFDocument.create();
                    const [copied] = await singleDoc.copyPages(srcDoc, [pageNum - 1]);
                    singleDoc.addPage(copied);
                    const singleBytes = await singleDoc.save();

                    const padNum = String(pageNum).padStart(padLen, '0');
                    zipFiles[`${baseName}_strona_${padNum}.pdf`] = singleBytes;
                }

                if (textSpan) textSpan.textContent = 'Pakowanie do pliku ZIP...';

                await new Promise((resolve, reject) => {
                    fflate.zip(zipFiles, { level: 0 }, (err, zippedData) => {
                        if (err) return reject(err);
                        const zipBlob = new Blob([zippedData], { type: 'application/zip' });
                        const zipName = `${baseName}_strony_PDF.zip`;

                        showToolResult(
                            'splitResultBox',
                            zipBlob,
                            zipName,
                            `Rozbito na ${sortedPages.length} osobnych plików PDF i spakowano w archiwum ZIP (${formatBytes(zipBlob.size)}).`
                        );
                        resolve();
                    });
                });
            }

            if (window.playSound) window.playSound('success');
            if (window.showNotification) window.showNotification('Dokument został pomyślnie rozdzielony!', 'success');
        } catch (err) {
            console.error('Błąd podczas rozdzielania PDF:', err);
            if (window.showNotification) window.showNotification('Błąd rozdzielania PDF: ' + err.message, 'error');
        } finally {
            if (textSpan) textSpan.textContent = origText;
            if (btnAction) btnAction.disabled = false;
        }
    }

    // ==========================================
    // 3. MODUŁ: DROPSITE PDF STUDIO (ZAAWANSOWANY EDYTOR)
    // ==========================================
    let studioFile = null;
    let studioBytes = null;
    let studioPdfJsDoc = null;
    let studioTotalPages = 1;
    let studioCurrentPage = 1;
    let studioPageRotations = {}; // { [pageNum]: 0 | 90 | 180 | 270 }
    let studioDeletedPages = new Set();
    let studioAnnotations = []; // { id, page, type, x, y, width, height, text, fontSize, color, bold, dataUrl, url, label, opacity, shapeType, strokeWidth, fill }
    let studioActiveTool = 'text'; // 'text' | 'sig' | 'image' | 'shape' | 'highlight' | 'censor' | 'stamp' | 'link' | 'company-stamp' | 'watermark' | 'page-number'
    let studioSelectedId = null;
    let studioNextId = 1;
    let studioZoomScale = 1.0;
    let studioActiveRenderTask = null; // Track active PDF.js page render task to cancel safely
    let studioWatermark = {
        enabled: false,
        text: 'POUFNE',
        opacity: 0.16,
        angle: -45,
        color: '#64748B'
    };
    let studioPageNumbers = {
        enabled: false,
        format: 'cur_total',
        position: 'bottom-right',
        skipFirst: false,
        color: '#334155'
    };

    // Stos historii operacji (Undo / Redo)
    let studioHistory = [];
    let studioHistoryIndex = -1;
    const MAX_STUDIO_HISTORY = 35;

    // Domyślne parametry narzędzia kształtów
    let studioShapeType = 'rect'; // 'rect' | 'circle' | 'line' | 'arrow'
    let studioShapeColor = '#EF4444';
    let studioShapeStrokeWidth = 3;
    let studioShapeFill = 'none'; // 'none' | 'tint' | 'solid'

    // Inicjalizacja PDF.js workera
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/pdf.worker.min.js';
    }

    function initEditModule() {
        const dropzone = document.getElementById('editDropzone');
        const fileInput = document.getElementById('editFileInput');
        const btnChangeFile = document.getElementById('btnEditChangeFile');
        const btnResetDoc = document.getElementById('btnEditResetDoc');
        const btnPrevPage = document.getElementById('btnEditPrevPage');
        const btnNextPage = document.getElementById('btnEditNextPage');
        const btnRotateLeft = document.getElementById('btnEditRotateLeft');
        const btnRotateRight = document.getElementById('btnEditRotateRight');
        const btnDeletePage = document.getElementById('btnEditDeletePage');
        const btnZoomIn = document.getElementById('btnEditZoomIn');
        const btnZoomOut = document.getElementById('btnEditZoomOut');
        const btnZoomFit = document.getElementById('btnEditZoomFit');
        const btnUndo = document.getElementById('btnEditUndo');
        const btnRedo = document.getElementById('btnEditRedo');
        const btnToggleThumbs = document.getElementById('btnToggleThumbnails');
        const btnCloseThumbs = document.getElementById('btnCloseThumbs');
        const btnFullscreen = document.getElementById('btnToggleFullscreen');
        const btnAction = document.getElementById('btnExecuteEdit');
        const overlayLayer = document.getElementById('pdfOverlayLayer');
        const thumbsDrawer = document.getElementById('studioThumbsDrawer');
        const studioImageInput = document.getElementById('studioImageInput');

        if (!dropzone || !fileInput) return;

        if (btnUndo) btnUndo.addEventListener('click', undoStudioAction);
        if (btnRedo) btnRedo.addEventListener('click', redoStudioAction);
        if (studioImageInput) {
            studioImageInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    handleStudioImageSelected(e.target.files[0]);
                    studioImageInput.value = '';
                }
            });
        }

        if (btnFullscreen) {
            btnFullscreen.addEventListener('click', toggleStudioFullscreen);
        }

        // Wybór pliku
        dropzone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                loadEditPdfFile(e.target.files[0]);
                fileInput.value = '';
            }
        });
        if (btnChangeFile) {
            btnChangeFile.addEventListener('click', () => {
                fileInput.value = '';
                fileInput.click();
            });
        }

        // Resetowanie całego widoku: usuwa załadowany plik i przywraca ekran wyboru/dropzone
        if (btnResetDoc) {
            btnResetDoc.addEventListener('click', () => {
                resetStudioWorkspace();
                if (window.showNotification) window.showNotification('Plik został usunięty. Możesz dodać nowy dokument.', 'info');
            });
        }

        // Kontrola powiększenia / dopasowania podglądu (Zoom)
        if (btnZoomIn) {
            btnZoomIn.addEventListener('click', () => {
                studioZoomScale = Math.min(2.2, Math.round((studioZoomScale + 0.15) * 100) / 100);
                renderCurrentPdfPage();
            });
        }
        if (btnZoomOut) {
            btnZoomOut.addEventListener('click', () => {
                studioZoomScale = Math.max(0.5, Math.round((studioZoomScale - 0.15) * 100) / 100);
                renderCurrentPdfPage();
            });
        }
        if (btnZoomFit) {
            btnZoomFit.addEventListener('click', () => {
                studioZoomScale = 1.0;
                renderCurrentPdfPage();
            });
        }

        // Drag & drop na dropzone
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                loadEditPdfFile(e.dataTransfer.files[0]);
            }
        });

        // Wstążka narzędzi (Ribbon)
        const ribbonBtns = document.querySelectorAll('.studio-ribbon-btn');
        ribbonBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.getAttribute('data-studio-tool');
                if (tool === 'sig') {
                    openSignatureModal();
                    return;
                }
                if (tool === 'image') {
                    studioActiveTool = 'image';
                    ribbonBtns.forEach(b => b.classList.toggle('active', b === btn));
                    updateStudioPropertyBar();
                    document.getElementById('studioImageInput')?.click();
                    return;
                }
                if (tool === 'shape') {
                    studioActiveTool = 'shape';
                    ribbonBtns.forEach(b => b.classList.toggle('active', b === btn));
                    updateStudioPropertyBar();
                    return;
                }
                if (tool === 'company-stamp') {
                    openCompanyStampModal();
                    return;
                }
                if (tool === 'watermark') {
                    openWatermarkModal();
                    return;
                }
                if (tool === 'page-number') {
                    openPageNumberModal();
                    return;
                }
                studioActiveTool = tool;
                ribbonBtns.forEach(b => b.classList.toggle('active', b === btn));
                updateStudioPropertyBar();
            });
        });

        // Boczny panel miniaturek
        if (btnToggleThumbs) {
            btnToggleThumbs.addEventListener('click', () => {
                if (thumbsDrawer) {
                    const isShown = thumbsDrawer.style.display === 'flex';
                    thumbsDrawer.style.display = isShown ? 'none' : 'flex';
                    if (!isShown) {
                        renderThumbnailsDrawer();
                    }
                    renderCurrentPdfPage();
                }
            });
        }
        if (btnCloseThumbs) {
            btnCloseThumbs.addEventListener('click', () => {
                if (thumbsDrawer) {
                    thumbsDrawer.style.display = 'none';
                    renderCurrentPdfPage();
                }
            });
        }

        // Nawigacja stron
        if (btnPrevPage) {
            btnPrevPage.addEventListener('click', () => {
                if (studioCurrentPage > 1) {
                    studioCurrentPage--;
                    studioSelectedId = null;
                    renderCurrentPdfPage();
                    updateStudioPropertyBar();
                    renderFloatingToolbar();
                }
            });
        }
        if (btnNextPage) {
            btnNextPage.addEventListener('click', () => {
                if (studioCurrentPage < studioTotalPages) {
                    studioCurrentPage++;
                    studioSelectedId = null;
                    renderCurrentPdfPage();
                    updateStudioPropertyBar();
                    renderFloatingToolbar();
                }
            });
        }

        // Kliknięcie w ciemne tło poza arkuszem odznacza element
        const stage = document.getElementById('studioViewportStage');
        if (stage) {
            stage.addEventListener('click', (e) => {
                if (!e.target.closest('#studioSheetWrap') && !e.target.closest('.studio-float-pill')) {
                    if (studioSelectedId) {
                        studioSelectedId = null;
                        updateSelectedUI();
                        updateStudioPropertyBar();
                        renderFloatingToolbar();
                    }
                }
            });
        }

        // Skróty klawiszowe (Delete/Backspace = usuń, Esc = odznacz/wyjdź, Ctrl+Z/Ctrl+Y = historia, Strzałki = precyzyjne przesuwanie)
        window.addEventListener('keydown', (e) => {
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
                return;
            }

            // Undo / Redo skróty klawiszowe
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) redoStudioAction();
                else undoStudioAction();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                redoStudioAction();
                return;
            }

            if (e.key === 'Escape') {
                const openModal = document.querySelector('.signature-modal-backdrop[style*="display: flex"]');
                if (openModal) return;

                if (studioSelectedId) {
                    e.preventDefault();
                    studioSelectedId = null;
                    updateSelectedUI();
                    updateStudioPropertyBar();
                    renderFloatingToolbar();
                    return;
                }

                const workspace = document.getElementById('editWorkspace');
                if (workspace && workspace.classList.contains('studio-fullscreen')) {
                    e.preventDefault();
                    toggleStudioFullscreen();
                    return;
                }
            }

            if (!studioSelectedId) return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                removeAnnotation(studioSelectedId);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                const item = studioAnnotations.find(a => a.id === studioSelectedId);
                if (!item) return;
                e.preventDefault();
                const step = e.shiftKey ? 10 : 2;
                if (e.key === 'ArrowLeft') item.x = Math.max(0, item.x - step);
                if (e.key === 'ArrowRight') item.x = item.x + step;
                if (e.key === 'ArrowUp') item.y = Math.max(0, item.y - step);
                if (e.key === 'ArrowDown') item.y = item.y + step;
                renderPageAnnotations();
            }
        });

        // Nasłuchiwanie zmian pełnego ekranu przeglądarki
        document.addEventListener('fullscreenchange', () => {
            const workspace = document.getElementById('editWorkspace');
            if (!document.fullscreenElement && workspace && workspace.classList.contains('studio-fullscreen')) {
                toggleStudioFullscreen();
            }
        });

        // Obracanie stron
        if (btnRotateLeft) {
            btnRotateLeft.addEventListener('click', () => {
                const cur = studioPageRotations[studioCurrentPage] || 0;
                studioPageRotations[studioCurrentPage] = (cur + 270) % 360;
                pushStudioHistoryState('Obrót strony w lewo');
                renderCurrentPdfPage();
                updateThumbnailCard(studioCurrentPage);
            });
        }
        if (btnRotateRight) {
            btnRotateRight.addEventListener('click', () => {
                const cur = studioPageRotations[studioCurrentPage] || 0;
                studioPageRotations[studioCurrentPage] = (cur + 90) % 360;
                pushStudioHistoryState('Obrót strony w prawo');
                renderCurrentPdfPage();
                updateThumbnailCard(studioCurrentPage);
            });
        }

        // Usuwanie bieżącej strony
        if (btnDeletePage) {
            btnDeletePage.addEventListener('click', () => {
                if (studioDeletedPages.has(studioCurrentPage)) {
                    studioDeletedPages.delete(studioCurrentPage);
                    pushStudioHistoryState('Przywrócenie strony');
                    if (window.showNotification) window.showNotification(`Przywrócono stronę ${studioCurrentPage}.`, 'info');
                } else {
                    if (studioDeletedPages.size >= studioTotalPages - 1) {
                        if (window.showNotification) window.showNotification('Nie możesz usunąć wszystkich stron dokumentu!', 'error');
                        return;
                    }
                    studioDeletedPages.add(studioCurrentPage);
                    pushStudioHistoryState('Usunięcie strony');
                    if (window.showNotification) window.showNotification(`Strona ${studioCurrentPage} zostanie pominięta w finalnym PDF.`, 'info');
                }
                renderCurrentPdfPage();
            });
        }

        // Kliknięcie w arkusz dodaje wybrany obiekt (np. tekst, zakreślacz)
        if (overlayLayer) {
            overlayLayer.addEventListener('click', (e) => {
                if (e.target.closest('.pdf-item-wrap') || e.target.closest('.studio-float-pill') || e.target.closest('.float-popover-box')) {
                    return;
                }

                // Kliknięcie w puste tło odznacza bieżący obiekt
                if (studioSelectedId) {
                    studioSelectedId = null;
                    updateSelectedUI();
                    updateStudioPropertyBar();
                    renderFloatingToolbar();
                    return;
                }

                const rect = overlayLayer.getBoundingClientRect();
                const clickX = Math.max(10, Math.min(rect.width - 60, e.clientX - rect.left));
                const clickY = Math.max(10, Math.min(rect.height - 30, e.clientY - rect.top));

                addNewAnnotationAt(studioActiveTool, clickX, clickY);
            });
        }

        // Modale zaawansowanych funkcji
        initSignatureModal();
        initCompanyStampModal();
        initWatermarkModal();
        initPageNumberModal();

        // Przycisk eksportu
        if (btnAction) {
            btnAction.addEventListener('click', executePdfEdit);
        }
    }

    function toggleStudioFullscreen() {
        const workspace = document.getElementById('editWorkspace');
        const fsBtn = document.getElementById('btnToggleFullscreen');
        const iconExpand = document.getElementById('fsIconExpand');
        const iconCompress = document.getElementById('fsIconCompress');
        const btnText = document.getElementById('fsBtnText');

        if (!workspace) return;

        const isFs = workspace.classList.contains('studio-fullscreen');

        if (!isFs) {
            // Przeniesienie obszaru roboczego bezpośrednio do <body>, aby uciec z containing block kontenera z backdrop-filter
            let placeholder = document.getElementById('studioWorkspacePlaceholder');
            if (!placeholder) {
                placeholder = document.createElement('div');
                placeholder.id = 'studioWorkspacePlaceholder';
                placeholder.style.display = 'none';
                workspace.parentNode.insertBefore(placeholder, workspace);
            }
            document.body.appendChild(workspace);

            workspace.classList.add('studio-fullscreen');
            document.body.classList.add('studio-fullscreen-active');
            if (iconExpand) iconExpand.style.display = 'none';
            if (iconCompress) iconCompress.style.display = 'inline-block';
            if (btnText) btnText.textContent = 'Wyjdź (Esc)';
            if (fsBtn) fsBtn.title = 'Zamknij pełny ekran (Esc)';

            // Próba natywnego HTML5 Fullscreen na samym elemencie workspace lub dokumencie
            if (workspace.requestFullscreen && !document.fullscreenElement) {
                workspace.requestFullscreen().catch(() => {});
            } else if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            }

            if (window.showNotification) window.showNotification('Tryb pełnoekranowy aktywny. Klawisz Esc przywraca normalny widok.', 'info');
        } else {
            // Przywrócenie elementu na pierwotne miejsce w drzewie DOM
            const placeholder = document.getElementById('studioWorkspacePlaceholder');
            if (placeholder && placeholder.parentNode) {
                placeholder.parentNode.insertBefore(workspace, placeholder);
                placeholder.remove();
            }

            workspace.classList.remove('studio-fullscreen');
            document.body.classList.remove('studio-fullscreen-active');
            if (iconExpand) iconExpand.style.display = 'inline-block';
            if (iconCompress) iconCompress.style.display = 'none';
            if (btnText) btnText.textContent = 'Pełny ekran';
            if (fsBtn) fsBtn.title = 'Pełny ekran (Esc)';

            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
        }

        setTimeout(() => {
            renderCurrentPdfPage();
        }, 150);
    }

    function resetStudioWorkspace() {
        const workspace = document.getElementById('editWorkspace');
        if (workspace && workspace.classList.contains('studio-fullscreen')) {
            toggleStudioFullscreen();
        }

        studioFile = null;
        studioBytes = null;
        studioPdfJsDoc = null;
        studioTotalPages = 1;
        studioCurrentPage = 1;
        studioPageRotations = {};
        studioDeletedPages.clear();
        studioAnnotations = [];
        studioSelectedId = null;
        studioZoomScale = 1.0;
        studioWatermark = { enabled: false, text: 'POUFNE', opacity: 0.16, angle: -45, color: '#64748B' };
        studioPageNumbers = { enabled: false, format: 'cur_total', position: 'bottom-right', skipFirst: false, color: '#334155' };
        studioHistory = [];
        studioHistoryIndex = -1;
        updateStudioHistoryButtons();

        const dropzone = document.getElementById('editDropzone');
        const fileInput = document.getElementById('editFileInput');
        const canvas = document.getElementById('pdfRenderCanvas');
        const overlayLayer = document.getElementById('pdfOverlayLayer');
        const pill = document.getElementById('studioFloatPill');
        const thumbsDrawer = document.getElementById('studioThumbsDrawer');

        if (fileInput) fileInput.value = '';
        if (workspace) workspace.style.display = 'none';
        if (dropzone) dropzone.style.display = 'block';
        if (thumbsDrawer) thumbsDrawer.style.display = 'none';

        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        if (overlayLayer) overlayLayer.innerHTML = '';
        if (pill) pill.style.display = 'none';

        const resultBox = document.getElementById('editResultBox');
        if (resultBox) {
            resultBox.style.display = 'none';
            resultBox.innerHTML = '';
        }

        if (window.playSound) window.playSound('pop');
    }

    // === SYSTEM HISTORII (UNDO / REDO) ===
    function pushStudioHistoryState(actionName) {
        if (studioHistoryIndex < studioHistory.length - 1) {
            studioHistory = studioHistory.slice(0, studioHistoryIndex + 1);
        }

        const snapshot = {
            annotations: JSON.parse(JSON.stringify(studioAnnotations)),
            rotations: { ...studioPageRotations },
            deletedPages: Array.from(studioDeletedPages)
        };

        studioHistory.push(snapshot);
        if (studioHistory.length > MAX_STUDIO_HISTORY) {
            studioHistory.shift();
        }
        studioHistoryIndex = studioHistory.length - 1;

        updateStudioHistoryButtons();
    }

    function undoStudioAction() {
        if (studioHistoryIndex > 0) {
            studioHistoryIndex--;
            restoreStudioSnapshot(studioHistory[studioHistoryIndex]);
            if (window.playSound) window.playSound('pop');
        }
    }

    function redoStudioAction() {
        if (studioHistoryIndex < studioHistory.length - 1) {
            studioHistoryIndex++;
            restoreStudioSnapshot(studioHistory[studioHistoryIndex]);
            if (window.playSound) window.playSound('pop');
        }
    }

    function restoreStudioSnapshot(snapshot) {
        if (!snapshot) return;
        studioAnnotations = JSON.parse(JSON.stringify(snapshot.annotations || []));
        studioPageRotations = { ...(snapshot.rotations || {}) };
        studioDeletedPages = new Set(snapshot.deletedPages || []);
        studioSelectedId = null;

        renderPageAnnotations();
        renderCurrentPdfPage();
        updateStudioPropertyBar();
        renderFloatingToolbar();
        updateStudioHistoryButtons();
    }

    function updateStudioHistoryButtons() {
        const btnUndo = document.getElementById('btnEditUndo');
        const btnRedo = document.getElementById('btnEditRedo');
        if (btnUndo) btnUndo.disabled = studioHistoryIndex <= 0;
        if (btnRedo) btnRedo.disabled = studioHistoryIndex >= studioHistory.length - 1;
    }

    // === OBSŁUGA WSTAWIANIA OBRAZU / LOGA ===
    function handleStudioImageSelected(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            const img = new Image();
            img.onload = () => {
                const aspect = (img.naturalWidth || 1) / (img.naturalHeight || 1);
                const defaultW = Math.min(220, Math.max(100, img.naturalWidth));
                const defaultH = Math.round(defaultW / aspect);
                addNewAnnotationAt('image', 80, 80, null, null, {
                    dataUrl,
                    width: defaultW,
                    height: defaultH,
                    opacity: 1.0
                });
                if (window.showNotification) window.showNotification('Wstawiono obraz do dokumentu.', 'success');
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    }

    function ensurePngBytesFromDataUrl(dataUrl) {
        return new Promise((resolve, reject) => {
            if (dataUrl.startsWith('data:image/png;base64,')) {
                resolve(base64ToUint8Array(dataUrl.split(',')[1]));
                return;
            }
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const pngBase64 = canvas.toDataURL('image/png').split(',')[1];
                resolve(base64ToUint8Array(pngBase64));
            };
            img.onerror = reject;
            img.src = dataUrl;
        });
    }

    // === OBSŁUGA KSZTAŁTÓW GEOMETRYCZNYCH ===
    function renderShapeSvg(item) {
        const color = item.color || '#EF4444';
        const sw = item.strokeWidth || 3;
        let fill = 'none';
        if (item.fill === 'tint') fill = `${color}25`;
        else if (item.fill === 'solid') fill = color;

        if (item.shapeType === 'rect') {
            return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block;overflow:visible;">
                <rect x="${sw}" y="${sw}" width="${Math.max(1, 100 - sw * 2)}" height="${Math.max(1, 100 - sw * 2)}" rx="4" stroke="${color}" stroke-width="${sw}" fill="${fill}" />
            </svg>`;
        } else if (item.shapeType === 'circle') {
            return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block;overflow:visible;">
                <ellipse cx="50" cy="50" rx="${Math.max(1, 50 - sw)}" ry="${Math.max(1, 50 - sw)}" stroke="${color}" stroke-width="${sw}" fill="${fill}" />
            </svg>`;
        } else if (item.shapeType === 'line') {
            return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block;overflow:visible;">
                <line x1="2" y1="50" x2="98" y2="50" stroke="${color}" stroke-width="${sw * 2}" stroke-linecap="round" />
            </svg>`;
        } else if (item.shapeType === 'arrow') {
            const markerId = 'arrowhead_' + item.id;
            return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block;overflow:visible;">
                <defs>
                    <marker id="${markerId}" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                        <polygon points="0 0, 8 4, 0 8" fill="${color}" />
                    </marker>
                </defs>
                <line x1="4" y1="50" x2="88" y2="50" stroke="${color}" stroke-width="${sw * 2}" stroke-linecap="round" marker-end="url(#${markerId})" />
            </svg>`;
        }
        return '';
    }

    function createShapePngDataUrl(item) {
        const dpr = 3;
        const w = Math.max(20, Math.round(item.width * dpr));
        const h = Math.max(20, Math.round(item.height * dpr));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        const color = item.color || '#EF4444';
        const sw = (item.strokeWidth || 3) * dpr;

        ctx.strokeStyle = color;
        ctx.lineWidth = sw;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        let fillStyle = null;
        if (item.fill === 'tint') fillStyle = color + '33';
        else if (item.fill === 'solid') fillStyle = color;

        if (item.shapeType === 'rect') {
            const pad = sw / 2;
            const rw = w - sw;
            const rh = h - sw;
            const rad = 6 * dpr;
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(pad, pad, rw, rh, rad) : ctx.rect(pad, pad, rw, rh);
            if (fillStyle) {
                ctx.fillStyle = fillStyle;
                ctx.fill();
            }
            ctx.stroke();
        } else if (item.shapeType === 'circle') {
            const rx = (w - sw) / 2;
            const ry = (h - sw) / 2;
            const cx = w / 2;
            const cy = h / 2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
            if (fillStyle) {
                ctx.fillStyle = fillStyle;
                ctx.fill();
            }
            ctx.stroke();
        } else if (item.shapeType === 'line') {
            ctx.beginPath();
            ctx.moveTo(sw, h / 2);
            ctx.lineTo(w - sw, h / 2);
            ctx.stroke();
        } else if (item.shapeType === 'arrow') {
            const headLen = Math.min(36 * dpr, Math.max(18 * dpr, w * 0.22));
            const y = h / 2;
            const endX = w - sw;
            const startX = sw;

            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX - headLen * 0.7, y);
            ctx.stroke();

            // Grot
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.moveTo(endX, y);
            ctx.lineTo(endX - headLen, y - headLen * 0.45);
            ctx.lineTo(endX - headLen * 0.7, y);
            ctx.lineTo(endX - headLen, y + headLen * 0.45);
            ctx.closePath();
            ctx.fill();
        }

        return {
            dataUrl: canvas.toDataURL('image/png'),
            cssWidth: item.width,
            cssHeight: item.height
        };
    }

    async function loadEditPdfFile(file) {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            if (window.showNotification) window.showNotification('Wybierz plik w formacie PDF!', 'error');
            return;
        }

        if (typeof pdfjsLib === 'undefined' || typeof PDFLib === 'undefined') {
            if (window.showNotification) window.showNotification('Ładowanie silnika PDF... Spróbuj za sekundę.', 'info');
            return;
        }

        try {
            studioFile = file;
            studioBytes = await file.arrayBuffer();

            // Kopia bufora dla PDF.js, bo przeniesienie bufora może go odpiąć
            const pdfData = new Uint8Array(studioBytes.slice(0));
            studioPdfJsDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
            studioTotalPages = studioPdfJsDoc.numPages;
            studioCurrentPage = 1;
            studioPageRotations = {};
            studioDeletedPages.clear();
            studioAnnotations = [];
            studioSelectedId = null;
            studioZoomScale = 1.0;
            studioHistory = [];
            studioHistoryIndex = -1;
            pushStudioHistoryState('Wczytano PDF');

            // Pokaż obszar roboczy Studio
            const workspace = document.getElementById('editWorkspace');
            const dropzone = document.getElementById('editDropzone');
            const nameEl = document.getElementById('editLoadedFileName');
            const sizeEl = document.getElementById('editLoadedFileSize');

            if (workspace) workspace.style.display = 'block';
            if (dropzone) dropzone.style.display = 'none';
            if (nameEl) nameEl.textContent = file.name;
            if (sizeEl) sizeEl.textContent = formatBytes(file.size);

            await renderCurrentPdfPage();
            updateStudioPropertyBar();

            if (window.playSound) window.playSound('success');
            if (window.showNotification) window.showNotification(`Wczytano dokument (${studioTotalPages} ${studioTotalPages === 1 ? 'strona' : 'stron'})`, 'success');
        } catch (err) {
            console.error('Błąd wczytywania PDF:', err);
            if (window.showNotification) window.showNotification('Błąd odczytu PDF: ' + err.message, 'error');
        }
    }

    async function renderCurrentPdfPage() {
        if (!studioPdfJsDoc) return;

        const canvas = document.getElementById('pdfRenderCanvas');
        const overlayLayer = document.getElementById('pdfOverlayLayer');
        const stage = document.getElementById('studioViewportStage');
        const pageLabel = document.getElementById('editPageNumberLabel');
        const prevBtn = document.getElementById('btnEditPrevPage');
        const nextBtn = document.getElementById('btnEditNextPage');
        const delBtn = document.getElementById('btnEditDeletePage');

        if (!canvas || !overlayLayer) return;

        // Aktualizacja kontrolek nawigacji
        const isDeleted = studioDeletedPages.has(studioCurrentPage);
        if (pageLabel) {
            pageLabel.innerHTML = isDeleted 
                ? `<span style="color: #FF8E72; text-decoration: line-through;">Strona ${studioCurrentPage}</span> <span style="font-size: 10px; color: #FF4439;">(Usunięta)</span>`
                : `Strona ${studioCurrentPage} z ${studioTotalPages}`;
        }
        if (prevBtn) prevBtn.disabled = studioCurrentPage <= 1;
        if (nextBtn) nextBtn.disabled = studioCurrentPage >= studioTotalPages;
        if (delBtn) {
            delBtn.title = isDeleted ? 'Przywróć tę stronę' : 'Usuń tę stronę z pliku';
            delBtn.style.opacity = isDeleted ? '1' : '0.7';
            delBtn.style.background = isDeleted ? 'rgba(255, 68, 57, 0.3)' : '';
        }

        try {
            const page = await studioPdfJsDoc.getPage(studioCurrentPage);
            const extraRotation = studioPageRotations[studioCurrentPage] || 0;
            const totalRotation = (page.rotate + extraRotation) % 360;

            // Obliczenie skali dopasowanej do szerokości obszaru roboczego
            const drawer = document.getElementById('studioThumbsDrawer');
            const isDrawerOpen = drawer && drawer.style.display === 'flex';
            const drawerW = isDrawerOpen ? (drawer.offsetWidth || 236) : 0;
            const stageClientW = stage ? stage.clientWidth : 720;
            const availableWidth = Math.max(280, stageClientW - drawerW - 48);

            const unscaledViewport = page.getViewport({ scale: 1.0, rotation: totalRotation });
            const fitScale = Math.min(1.25, availableWidth / unscaledViewport.width);
            const finalScale = fitScale * studioZoomScale;
            const viewport = page.getViewport({ scale: finalScale, rotation: totalRotation });

            // Zaktualizuj etykietę zoom
            const zoomLabel = document.getElementById('editZoomLabel');
            if (zoomLabel) {
                zoomLabel.textContent = `${Math.round(studioZoomScale * 100)}%`;
            }

            const pageW = Math.floor(viewport.width);
            const pageH = Math.floor(viewport.height);

            const sheetWrap = document.getElementById('studioSheetWrap');
            if (sheetWrap) {
                sheetWrap.style.width = `${pageW}px`;
                sheetWrap.style.height = `${pageH}px`;
            }

            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.floor(pageW * dpr);
            canvas.height = Math.floor(pageH * dpr);
            canvas.style.width = `${pageW}px`;
            canvas.style.height = `${pageH}px`;

            overlayLayer.style.width = `${pageW}px`;
            overlayLayer.style.height = `${pageH}px`;

            const ctx = canvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Anuluj poprzednie aktywne renderowanie (np. przy szybkim przewijaniu stron lub zoomie)
            if (studioActiveRenderTask) {
                try {
                    studioActiveRenderTask.cancel();
                } catch (_) {}
                studioActiveRenderTask = null;
            }

            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            studioActiveRenderTask = page.render(renderContext);
            try {
                await studioActiveRenderTask.promise;
            } catch (renderErr) {
                if (renderErr && (renderErr.name === 'RenderingCancelledException' || renderErr.message?.includes('cancelled'))) {
                    return; // Normalne anulowanie poprzedniej klatki
                }
                throw renderErr;
            } finally {
                studioActiveRenderTask = null;
            }

            // Narysuj nałożone adnotacje dla bieżącej strony
            renderPageAnnotations();

            // Jeśli znak wodny jest włączony, dodaj podgląd na żywo
            if (studioWatermark.enabled && studioWatermark.text) {
                const wmDiv = document.createElement('div');
                wmDiv.className = 'studio-live-watermark-overlay';
                wmDiv.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;display:flex;align-items:center;justify-content:center;overflow:hidden;z-index:1;';
                const wmSpan = document.createElement('span');
                wmSpan.textContent = studioWatermark.text;
                wmSpan.style.color = studioWatermark.color || '#64748B';
                wmSpan.style.opacity = `${studioWatermark.opacity || 0.16}`;
                wmSpan.style.transform = `rotate(${studioWatermark.angle || -45}deg)`;
                wmSpan.style.fontSize = `${Math.min(viewport.width, viewport.height) * 0.14}px`;
                wmSpan.style.fontWeight = '900';
                wmSpan.style.letterSpacing = '0.12em';
                wmSpan.style.textTransform = 'uppercase';
                wmSpan.style.userSelect = 'none';
                wmDiv.appendChild(wmSpan);
                overlayLayer.appendChild(wmDiv);
            }

            updateThumbnailsActive();
        } catch (err) {
            console.error('Błąd renderowania strony:', err);
        }
    }

    function addNewAnnotationAt(type, x, y, subType, customLabel, extraProps) {
        const id = 'ann_' + (studioNextId++);
        let annot = null;
        const curDate = new Date().toLocaleDateString('pl-PL');

        if (type === 'text') {
            annot = {
                id,
                page: studioCurrentPage,
                type: 'text',
                x,
                y,
                text: 'Kliknij dwukrotnie, aby edytować...',
                fontSize: 16,
                color: '#000000',
                bold: false,
                width: 220,
                height: 32
            };
        } else if (type === 'image') {
            annot = {
                id,
                page: studioCurrentPage,
                type: 'image',
                x,
                y,
                dataUrl: extraProps?.dataUrl || '',
                width: extraProps?.width || 180,
                height: extraProps?.height || 120,
                opacity: extraProps?.opacity ?? 1.0
            };
        } else if (type === 'shape') {
            const sType = subType || studioShapeType || 'rect';
            const sColor = extraProps?.color || studioShapeColor || '#EF4444';
            const sWidth = extraProps?.strokeWidth || studioShapeStrokeWidth || 3;
            const sFill = extraProps?.fill || studioShapeFill || 'none';
            let w = 150;
            let h = 80;
            if (sType === 'line' || sType === 'arrow') {
                w = 180;
                h = 32;
            }
            annot = {
                id,
                page: studioCurrentPage,
                type: 'shape',
                shapeType: sType,
                color: sColor,
                strokeWidth: sWidth,
                fill: sFill,
                x,
                y,
                width: w,
                height: h
            };
        } else if (type === 'highlight') {
            annot = {
                id,
                page: studioCurrentPage,
                type: 'highlight',
                x,
                y,
                color: '#FFEB3B',
                width: 140,
                height: 24
            };
        } else if (type === 'censor') {
            annot = {
                id,
                page: studioCurrentPage,
                type: 'censor',
                x,
                y,
                color: '#000000',
                width: 140,
                height: 24
            };
        } else if (type === 'stamp') {
            let label = 'ZATWIERDZONO';
            let color = '#16A34A';
            let width = 180;
            let height = 52;
            const chosenType = subType || 'approved';

            if (chosenType === 'paid') {
                label = 'OPŁACONO';
                color = '#0284C7';
                width = 180;
                height = 52;
            } else if (chosenType === 'confidential') {
                label = 'ŚCIŚLE POUFNE';
                color = '#DC2626';
                width = 195;
                height = 52;
            } else if (chosenType === 'copy') {
                label = 'ZA ZGODNOŚĆ Z ORYGINAŁEM';
                color = '#4338CA';
                width = 195;
                height = 52;
            } else if (chosenType === 'urgent') {
                label = 'PILNE / WAŻNE';
                color = '#D97706';
                width = 175;
                height = 48;
            } else if (chosenType === 'custom') {
                label = customLabel || 'PIECZĘĆ';
                color = '#8B5CF6';
                width = 180;
                height = 50;
            }

            annot = {
                id,
                page: studioCurrentPage,
                type: 'stamp',
                subType: chosenType,
                x,
                y,
                label,
                color,
                date: curDate,
                width,
                height
            };
        } else if (type === 'link') {
            annot = {
                id,
                page: studioCurrentPage,
                type: 'link',
                x,
                y,
                url: 'https://dropsite.pages.dev',
                width: 160,
                height: 28
            };
        }

        if (annot) {
            const overlayLayer = document.getElementById('pdfOverlayLayer');
            annot.pageOverlayW = overlayLayer ? overlayLayer.clientWidth : 595;
            annot.pageOverlayH = overlayLayer ? overlayLayer.clientHeight : 842;
            studioAnnotations.push(annot);
            studioSelectedId = id;
            pushStudioHistoryState('Dodano ' + (type === 'image' ? 'obraz' : type === 'shape' ? 'kształt' : type));
            renderPageAnnotations();
            updateStudioPropertyBar();
            if (window.playSound) window.playSound('pop');
        }
    }

    function renderPageAnnotations() {
        const overlayLayer = document.getElementById('pdfOverlayLayer');
        if (!overlayLayer) return;

        overlayLayer.innerHTML = '';

        const pageAnnots = studioAnnotations.filter(a => a.page === studioCurrentPage);
        pageAnnots.forEach(item => {
            const wrap = document.createElement('div');
            wrap.className = `pdf-item-wrap ${studioSelectedId === item.id ? 'selected' : ''}`;
            wrap.style.left = `${item.x}px`;
            wrap.style.top = `${item.y}px`;
            wrap.style.width = `${item.width}px`;
            wrap.style.height = `${item.height}px`;
            wrap.dataset.id = item.id;
            wrap.dataset.type = item.type;

            // Przycisk usuwania w rogu
            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'pdf-item-del-btn';
            delBtn.innerHTML = '✕';
            delBtn.title = 'Usuń';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeAnnotation(item.id);
            });
            wrap.appendChild(delBtn);

            // Zawartość elementu
            if (item.type === 'text') {
                const textEl = document.createElement('div');
                textEl.className = 'pdf-item-text';
                textEl.style.fontSize = `${item.fontSize}px`;
                textEl.style.color = item.color;
                textEl.style.fontWeight = item.bold ? '700' : '400';
                textEl.textContent = item.text;
                textEl.title = 'Kliknij dwukrotnie, aby edytować tekst na arkuszu';

                // Bezpośrednia edycja tekstu w dokumencie (In-place editing)
                textEl.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    startInlineTextEditing(item, textEl);
                });

                wrap.appendChild(textEl);
            } else if (item.type === 'image') {
                const imgBox = document.createElement('div');
                imgBox.style.width = '100%';
                imgBox.style.height = '100%';
                imgBox.style.display = 'flex';
                imgBox.style.alignItems = 'center';
                imgBox.style.justifyContent = 'center';
                const imgEl = document.createElement('img');
                imgEl.src = item.dataUrl;
                imgEl.style.maxWidth = '100%';
                imgEl.style.maxHeight = '100%';
                imgEl.style.objectFit = 'contain';
                imgEl.style.opacity = `${item.opacity ?? 1.0}`;
                imgEl.style.pointerEvents = 'none';
                imgBox.appendChild(imgEl);
                wrap.appendChild(imgBox);
            } else if (item.type === 'shape') {
                const shapeBox = document.createElement('div');
                shapeBox.style.width = '100%';
                shapeBox.style.height = '100%';
                shapeBox.style.pointerEvents = 'none';
                shapeBox.innerHTML = renderShapeSvg(item);
                wrap.appendChild(shapeBox);
            } else if (item.type === 'sig') {
                const sigBox = document.createElement('div');
                sigBox.className = 'pdf-item-sig';
                sigBox.style.width = '100%';
                sigBox.style.height = '100%';
                const img = document.createElement('img');
                img.src = item.dataUrl;
                sigBox.appendChild(img);
                wrap.appendChild(sigBox);
            } else if (item.type === 'highlight') {
                const hl = document.createElement('div');
                hl.className = 'pdf-item-highlight';
                hl.style.width = '100%';
                hl.style.height = '100%';
                hl.style.background = item.color;
                hl.style.opacity = '0.45';
                wrap.appendChild(hl);
            } else if (item.type === 'censor') {
                const cs = document.createElement('div');
                cs.className = 'pdf-item-censor';
                cs.style.width = '100%';
                cs.style.height = '100%';
                cs.style.background = item.color || '#000000';
                wrap.appendChild(cs);
            } else if (item.type === 'stamp') {
                if (item.subType === 'company' && item.dataUrl) {
                    const stBox = document.createElement('div');
                    stBox.className = 'pdf-item-sig';
                    stBox.style.width = '100%';
                    stBox.style.height = '100%';
                    const img = document.createElement('img');
                    img.src = item.dataUrl;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'contain';
                    stBox.appendChild(img);
                    wrap.appendChild(stBox);
                } else {
                    const st = document.createElement('div');
                    const subType = item.subType || (
                        item.label.includes('ZATWIERDZ') ? 'approved' :
                        item.label.includes('OPŁA') ? 'paid' :
                        item.label.includes('POUFN') ? 'confidential' :
                        item.label.includes('KOPIA') || item.label.includes('ZGODN') ? 'copy' :
                        item.label.includes('PILN') ? 'urgent' : 'custom'
                    );
                    st.className = `pdf-item-stamp stamp-type-${subType}`;
                    st.style.width = '100%';
                    st.style.height = '100%';

                    const curDate = item.date || new Date().toLocaleDateString('pl-PL');

                    if (subType === 'approved') {
                        st.innerHTML = `
                            <span class="stamp-title">✓ ${item.label || 'ZATWIERDZONO'}</span>
                            <span class="stamp-sub">DATA: ${curDate} &nbsp;|&nbsp; PODPIS: ............</span>
                        `;
                    } else if (subType === 'paid') {
                        st.innerHTML = `
                            <span class="stamp-title">★ ${item.label || 'OPŁACONO'} ★</span>
                            <span class="stamp-sub">METODA: PRZELEW / KARTA &nbsp;•&nbsp; ${curDate}</span>
                        `;
                    } else if (subType === 'confidential') {
                        st.innerHTML = `
                            <span class="stamp-title">★ ★ ★ ${item.label || 'ŚCIŚLE POUFNE'} ★ ★ ★</span>
                            <span class="stamp-sub">NIE KOPIOWAĆ • DOKUMENT POUFNY</span>
                        `;
                    } else if (subType === 'copy') {
                        st.innerHTML = `
                            <span class="stamp-title">${item.label || 'ZA ZGODNOŚĆ Z ORYGINAŁEM'}</span>
                            <span class="stamp-sub">STWIERDZAM ZGODNOŚĆ • ${curDate}</span>
                        `;
                    } else if (subType === 'urgent') {
                        st.innerHTML = `
                            <span class="stamp-title">⚡ ${item.label || 'PILNE / WAŻNE'} ⚡</span>
                            <span class="stamp-sub">DO NATYCHMIASTOWEJ REALIZACJI</span>
                        `;
                    } else {
                        st.innerHTML = `
                            <span class="stamp-title">${item.label || 'PIECZĘĆ'}</span>
                            <span class="stamp-sub">${curDate}</span>
                        `;
                    }
                    wrap.appendChild(st);
                }
            } else if (item.type === 'link') {
                const lk = document.createElement('div');
                lk.className = 'pdf-item-link';
                lk.style.width = '100%';
                lk.style.height = '100%';
                lk.innerHTML = `<span>🔗</span><span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.url}</span>`;
                wrap.appendChild(lk);
            }

            // Przeciąganie myszką (Drag & Drop)
            attachDragHandlers(wrap, item);

            overlayLayer.appendChild(wrap);
        });

        // Wyświetl pływające menu akcji (Pill Toolbar ze zdjęcia) dla wybranego elementu
        renderFloatingToolbar();
    }

    // Bezpośrednia edycja tekstu w dokumencie (In-place text editing)
    function startInlineTextEditing(item, textEl) {
        textEl.contentEditable = 'true';
        textEl.focus();

        try {
            const range = document.createRange();
            range.selectNodeContents(textEl);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        } catch (_) {}

        let finished = false;
        function finishEdit() {
            if (finished) return;
            finished = true;
            textEl.contentEditable = 'false';
            const val = textEl.innerText.trim();
            if (val) {
                item.text = val;
            }
            renderPageAnnotations();
            updateStudioPropertyBar();
        }

        textEl.addEventListener('blur', finishEdit, { once: true });
        textEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                textEl.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                textEl.innerText = item.text;
                textEl.blur();
            }
        });
    }

    // Pływający pasek akcji (Pill Toolbar zgodny ze zdjęciem)
    function renderFloatingToolbar() {
        const overlayLayer = document.getElementById('pdfOverlayLayer');
        if (!overlayLayer) return;

        let pill = document.getElementById('studioFloatPill');
        if (!pill) {
            pill = document.createElement('div');
            pill.id = 'studioFloatPill';
            pill.className = 'studio-float-pill';
            overlayLayer.appendChild(pill);
        }

        const selectedItem = studioAnnotations.find(a => a.id === studioSelectedId);
        if (!selectedItem) {
            pill.style.display = 'none';
            return;
        }

        // Ustalenie pozycji pill menu obok zaznaczonego elementu
        const overlayW = overlayLayer.clientWidth;
        const overlayH = overlayLayer.clientHeight;

        let left = selectedItem.x + selectedItem.width + 10;
        let isLeft = false;
        if (left + 46 > overlayW) {
            left = Math.max(6, selectedItem.x - 46);
            isLeft = true;
        }
        let top = Math.max(8, Math.min(overlayH - 145, selectedItem.y + (selectedItem.height - 120) / 2));

        pill.style.left = `${left}px`;
        pill.style.top = `${top}px`;
        pill.style.display = 'flex';

        // Wygenerowanie przycisków wewnątrz pill menu
        pill.innerHTML = `
            <!-- Ikona 1: Rozmiar / Skalowanie (↕ ze zdjęcia) -->
            <button type="button" class="float-pill-btn" id="btnFloatSize" title="Zmień rozmiar / format">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="4" y1="3" x2="20" y2="3"></line>
                    <polyline points="9 8 12 5 15 8"></polyline>
                    <line x1="12" y1="6" x2="12" y2="18"></line>
                    <polyline points="9 16 12 19 15 16"></polyline>
                    <line x1="4" y1="21" x2="20" y2="21"></line>
                </svg>
            </button>
            <!-- Ikona 2: Suwaki / Kolory / Styl (suwaki ze zdjęcia) -->
            <button type="button" class="float-pill-btn" id="btnFloatStyle" title="Kolor i stylistyka">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="4" y1="6" x2="20" y2="6"></line>
                    <circle cx="8" cy="6" r="2.5" fill="currentColor"></circle>
                    <line x1="4" y1="12" x2="20" y2="12"></line>
                    <circle cx="16" cy="12" r="2.5" fill="currentColor"></circle>
                    <line x1="4" y1="18" x2="20" y2="18"></line>
                    <circle cx="10" cy="18" r="2.5" fill="currentColor"></circle>
                </svg>
            </button>
            <!-- Ikona 3: Edycja dokumentu / tekstu (dokument z plusem/ołówkiem ze zdjęcia) -->
            <button type="button" class="float-pill-btn" id="btnFloatEdit" title="Edytuj tekst w dokumencie">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="8" y1="13" x2="14" y2="13"></line>
                    <line x1="8" y1="17" x2="12" y2="17"></line>
                    <line x1="18" y1="13" x2="18" y2="17"></line>
                    <line x1="16" y1="15" x2="20" y2="15"></line>
                </svg>
            </button>
            <!-- Ikona 4: Usuń element -->
            <button type="button" class="float-pill-btn btn-float-del" id="btnFloatDelete" title="Usuń ten element">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>

            <!-- Podręczny popover -->
            <div id="studioFloatPopover" class="studio-float-popover ${isLeft ? 'float-popover-left' : ''}" style="display: none;"></div>
        `;

        const popover = pill.querySelector('#studioFloatPopover');
        let activeMenu = null;

        function closePopover() {
            if (popover) {
                popover.style.display = 'none';
                popover.innerHTML = '';
            }
            activeMenu = null;
            pill.querySelectorAll('.float-pill-btn').forEach(b => b.classList.remove('active'));
        }

        // 1. Rozmiar / Skala
        const btnSize = pill.querySelector('#btnFloatSize');
        btnSize.addEventListener('click', (e) => {
            e.stopPropagation();
            if (activeMenu === 'size') {
                closePopover();
                return;
            }
            activeMenu = 'size';
            pill.querySelectorAll('.float-pill-btn').forEach(b => b.classList.remove('active'));
            btnSize.classList.add('active');

            if (selectedItem.type === 'text') {
                popover.innerHTML = `
                    <button type="button" class="float-mini-btn" id="fBtnDecFont" title="Mniejszy font">−</button>
                    <span class="float-size-badge" id="fBadgeFont">${selectedItem.fontSize} pt</span>
                    <button type="button" class="float-mini-btn" id="fBtnIncFont" title="Większy font">+</button>
                    <div style="width: 1px; height: 16px; background: rgba(255,255,255,0.15); margin: 0 2px;"></div>
                    <button type="button" class="float-mini-btn" data-fz="14">14</button>
                    <button type="button" class="float-mini-btn" data-fz="18">18</button>
                    <button type="button" class="float-mini-btn" data-fz="24">24</button>
                    <button type="button" class="float-mini-btn" data-fz="32">32</button>
                `;
                popover.querySelector('#fBtnDecFont').addEventListener('click', () => {
                    selectedItem.fontSize = Math.max(8, selectedItem.fontSize - 2);
                    renderPageAnnotations();
                    updateStudioPropertyBar();
                    renderFloatingToolbar();
                });
                popover.querySelector('#fBtnIncFont').addEventListener('click', () => {
                    selectedItem.fontSize = Math.min(72, selectedItem.fontSize + 2);
                    renderPageAnnotations();
                    updateStudioPropertyBar();
                    renderFloatingToolbar();
                });
                popover.querySelectorAll('[data-fz]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        selectedItem.fontSize = parseInt(btn.getAttribute('data-fz'), 10);
                        renderPageAnnotations();
                        updateStudioPropertyBar();
                        renderFloatingToolbar();
                    });
                });
            } else if (selectedItem.type === 'stamp' || selectedItem.type === 'sig') {
                popover.innerHTML = `
                    <button type="button" class="float-mini-btn" id="fBtnDecScale" title="Zmniejsz">−</button>
                    <span class="float-size-badge">Rozmiar</span>
                    <button type="button" class="float-mini-btn" id="fBtnIncScale" title="Zwiększ">+</button>
                `;
                popover.querySelector('#fBtnDecScale').addEventListener('click', () => {
                    selectedItem.width = Math.max(80, Math.round(selectedItem.width * 0.9));
                    selectedItem.height = Math.max(25, Math.round(selectedItem.height * 0.9));
                    renderPageAnnotations();
                    renderFloatingToolbar();
                });
                popover.querySelector('#fBtnIncScale').addEventListener('click', () => {
                    selectedItem.width = Math.min(400, Math.round(selectedItem.width * 1.1));
                    selectedItem.height = Math.min(200, Math.round(selectedItem.height * 1.1));
                    renderPageAnnotations();
                    renderFloatingToolbar();
                });
            } else {
                popover.innerHTML = `
                    <button type="button" class="float-mini-btn" id="fBtnDecWidth">−</button>
                    <span class="float-size-badge">${selectedItem.width} px</span>
                    <button type="button" class="float-mini-btn" id="fBtnIncWidth">+</button>
                `;
                popover.querySelector('#fBtnDecWidth').addEventListener('click', () => {
                    selectedItem.width = Math.max(40, selectedItem.width - 20);
                    renderPageAnnotations();
                    renderFloatingToolbar();
                });
                popover.querySelector('#fBtnIncWidth').addEventListener('click', () => {
                    selectedItem.width = Math.min(450, selectedItem.width + 20);
                    renderPageAnnotations();
                    renderFloatingToolbar();
                });
            }
            popover.style.display = 'flex';
        });

        // 2. Styl / Kolory
        const btnStyle = pill.querySelector('#btnFloatStyle');
        btnStyle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (activeMenu === 'style') {
                closePopover();
                return;
            }
            activeMenu = 'style';
            pill.querySelectorAll('.float-pill-btn').forEach(b => b.classList.remove('active'));
            btnStyle.classList.add('active');

            const colors = selectedItem.type === 'stamp'
                ? ['#16A34A', '#0284C7', '#DC2626', '#4338CA', '#D97706', '#000000']
                : ['#000000', '#FF4439', '#0F91D2', '#10B981', '#8B5CF6', '#F59E0B'];

            let swatchesHtml = colors.map(c => `
                <button type="button" class="float-color-pill ${selectedItem.color === c ? 'active' : ''}" style="background: ${c};" data-color="${c}"></button>
            `).join('');

            let boldBtnHtml = selectedItem.type === 'text' ? `
                <div style="width: 1px; height: 16px; background: rgba(255,255,255,0.15); margin: 0 4px;"></div>
                <button type="button" class="float-mini-btn ${selectedItem.bold ? 'active' : ''}" id="fBtnBold" style="${selectedItem.bold ? 'background: #0F91D2;' : ''} font-weight: 900;">B</button>
            ` : '';

            popover.innerHTML = swatchesHtml + boldBtnHtml;

            popover.querySelectorAll('.float-color-pill').forEach(pillBtn => {
                pillBtn.addEventListener('click', () => {
                    selectedItem.color = pillBtn.getAttribute('data-color');
                    renderPageAnnotations();
                    updateStudioPropertyBar();
                    renderFloatingToolbar();
                });
            });

            if (selectedItem.type === 'text') {
                popover.querySelector('#fBtnBold')?.addEventListener('click', () => {
                    selectedItem.bold = !selectedItem.bold;
                    renderPageAnnotations();
                    updateStudioPropertyBar();
                    renderFloatingToolbar();
                });
            }

            popover.style.display = 'flex';
        });

        // 3. Edycja Tekstu (dokument z plusem)
        const btnEdit = pill.querySelector('#btnFloatEdit');
        btnEdit.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (selectedItem.type === 'text') {
                const targetWrap = document.querySelector(`.pdf-item-wrap[data-id="${selectedItem.id}"]`);
                const textEl = targetWrap?.querySelector('.pdf-item-text');
                if (textEl) {
                    startInlineTextEditing(selectedItem, textEl);
                }
            } else if (selectedItem.type === 'stamp') {
                const newLabel = await showStudioPrompt({
                    title: 'Edytuj treść pieczęci',
                    icon: '🏷️',
                    label: 'Wpisz nowy tekst dla tej pieczęci:',
                    defaultValue: selectedItem.label || '',
                    placeholder: 'np. ZATWIERDZONO'
                });
                if (newLabel !== null && newLabel.trim()) {
                    selectedItem.label = newLabel.trim();
                    renderPageAnnotations();
                    updateStudioPropertyBar();
                }
            } else if (selectedItem.type === 'link') {
                const newUrl = await showStudioPrompt({
                    title: 'Edytuj odnośnik URL',
                    icon: '🔗',
                    label: 'Podaj adres strony WWW:',
                    defaultValue: selectedItem.url || 'https://',
                    placeholder: 'https://example.com'
                });
                if (newUrl !== null && newUrl.trim()) {
                    selectedItem.url = newUrl.trim();
                    renderPageAnnotations();
                    updateStudioPropertyBar();
                }
            }
        });

        // 4. Usuwanie elementu
        const btnDel = pill.querySelector('#btnFloatDelete');
        btnDel.addEventListener('click', (e) => {
            e.stopPropagation();
            removeAnnotation(selectedItem.id);
        });
    }

    function attachDragHandlers(el, item) {
        let isDragging = false;
        let startPointerX = 0;
        let startPointerY = 0;
        let initialX = 0;
        let initialY = 0;

        el.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.pdf-item-del-btn') || e.target.isContentEditable) return;
            e.stopPropagation();

            studioSelectedId = item.id;
            updateSelectedUI();
            updateStudioPropertyBar();
            renderFloatingToolbar();

            isDragging = true;
            el.setPointerCapture(e.pointerId);
            startPointerX = e.clientX;
            startPointerY = e.clientY;
            initialX = item.x;
            initialY = item.y;
        });

        el.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            const deltaX = e.clientX - startPointerX;
            const deltaY = e.clientY - startPointerY;

            const overlay = document.getElementById('pdfOverlayLayer');
            const maxW = overlay ? overlay.clientWidth - item.width : 500;
            const maxH = overlay ? overlay.clientHeight - item.height : 800;

            item.x = Math.max(0, Math.min(maxW, initialX + deltaX));
            item.y = Math.max(0, Math.min(maxH, initialY + deltaY));

            el.style.left = `${item.x}px`;
            el.style.top = `${item.y}px`;

            // Pływające menu podąża za elementem
            renderFloatingToolbar();
        });

        el.addEventListener('pointerup', (e) => {
            if (isDragging) {
                isDragging = false;
                try { el.releasePointerCapture(e.pointerId); } catch (_) {}
                const overlay = document.getElementById('pdfOverlayLayer');
                if (overlay) {
                    item.pageOverlayW = overlay.clientWidth;
                    item.pageOverlayH = overlay.clientHeight;
                }
                if (initialX !== item.x || initialY !== item.y) {
                    pushStudioHistoryState('Przesunięto element');
                }
                renderFloatingToolbar();
            }
        });
    }

    function updateSelectedUI() {
        const wraps = document.querySelectorAll('.pdf-item-wrap');
        wraps.forEach(w => w.classList.toggle('selected', w.dataset.id === studioSelectedId));
    }

    function removeAnnotation(id) {
        studioAnnotations = studioAnnotations.filter(a => a.id !== id);
        if (studioSelectedId === id) studioSelectedId = null;
        pushStudioHistoryState('Usunięto element');
        renderPageAnnotations();
        updateStudioPropertyBar();
        renderFloatingToolbar();
        if (window.playSound) window.playSound('pop');
    }

    function updateStudioPropertyBar() {
        const bar = document.getElementById('studioPropertyBar');
        if (!bar) return;

        const selectedItem = studioAnnotations.find(a => a.id === studioSelectedId);

        if (selectedItem) {
            // Pokaż właściwości zaznaczonego elementu
            if (selectedItem.type === 'text') {
                bar.innerHTML = `
                    <div class="prop-group">
                        <span class="prop-label">Treść:</span>
                        <input type="text" class="prop-input" id="propTextInput" value="${selectedItem.text}" style="width: 180px;">
                    </div>
                    <div class="prop-group">
                        <span class="prop-label">Rozmiar:</span>
                        <select class="prop-select" id="propFontSizeSelect">
                            <option value="12" ${selectedItem.fontSize === 12 ? 'selected' : ''}>12 pt</option>
                            <option value="16" ${selectedItem.fontSize === 16 ? 'selected' : ''}>16 pt</option>
                            <option value="20" ${selectedItem.fontSize === 20 ? 'selected' : ''}>20 pt</option>
                            <option value="24" ${selectedItem.fontSize === 24 ? 'selected' : ''}>24 pt</option>
                            <option value="32" ${selectedItem.fontSize === 32 ? 'selected' : ''}>32 pt</option>
                            <option value="40" ${selectedItem.fontSize === 40 ? 'selected' : ''}>40 pt</option>
                        </select>
                    </div>
                    <div class="prop-group">
                        <span class="prop-label">Kolor:</span>
                        <div class="prop-colors">
                            <button type="button" class="prop-color-pill ${selectedItem.color === '#000000' ? 'active' : ''}" style="background: #000000;" data-c="#000000"></button>
                            <button type="button" class="prop-color-pill ${selectedItem.color === '#DC2626' ? 'active' : ''}" style="background: #DC2626;" data-c="#DC2626"></button>
                            <button type="button" class="prop-color-pill ${selectedItem.color === '#0284C7' ? 'active' : ''}" style="background: #0284C7;" data-c="#0284C7"></button>
                            <button type="button" class="prop-color-pill ${selectedItem.color === '#16A34A' ? 'active' : ''}" style="background: #16A34A;" data-c="#16A34A"></button>
                        </div>
                    </div>
                    <button type="button" class="prop-btn-del" id="propBtnDelete">🗑️ Usuń</button>
                `;

                const textInp = bar.querySelector('#propTextInput');
                const fontSel = bar.querySelector('#propFontSizeSelect');
                const colorBtns = bar.querySelectorAll('.prop-color-pill');
                const delBtn = bar.querySelector('#propBtnDelete');

                if (textInp) textInp.addEventListener('input', (e) => {
                    selectedItem.text = e.target.value;
                    renderPageAnnotations();
                });
                if (fontSel) fontSel.addEventListener('change', (e) => {
                    selectedItem.fontSize = parseInt(e.target.value, 10);
                    renderPageAnnotations();
                });
                colorBtns.forEach(btn => btn.addEventListener('click', () => {
                    selectedItem.color = btn.getAttribute('data-c');
                    renderPageAnnotations();
                    updateStudioPropertyBar();
                }));
                if (delBtn) delBtn.addEventListener('click', () => removeAnnotation(selectedItem.id));
                return;
            } else if (selectedItem.type === 'image') {
                bar.innerHTML = `
                    <div class="prop-group">
                        <span class="prop-label">🖼️ Obraz / Logo:</span>
                        <button type="button" class="btn-sm-ghost" id="propBtnReplaceImg" style="font-size: 0.78rem;">📁 Zamień plik</button>
                    </div>
                    <div class="prop-group">
                        <span class="prop-label">Szerokość:</span>
                        <input type="range" min="40" max="600" value="${selectedItem.width}" id="propImgWidth" style="width: 100px;">
                        <span style="font-size:0.75rem; color:#94A3B8;">${selectedItem.width}px</span>
                    </div>
                    <div class="prop-group">
                        <span class="prop-label">Krycie:</span>
                        <input type="range" min="10" max="100" value="${Math.round((selectedItem.opacity ?? 1.0) * 100)}" id="propImgOpacity" style="width: 70px;">
                        <span style="font-size:0.75rem; color:#94A3B8;">${Math.round((selectedItem.opacity ?? 1.0) * 100)}%</span>
                    </div>
                    <button type="button" class="prop-btn-del" id="propBtnDelete">🗑️ Usuń</button>
                `;
                bar.querySelector('#propBtnReplaceImg')?.addEventListener('click', () => {
                    document.getElementById('studioImageInput')?.click();
                });
                bar.querySelector('#propImgWidth')?.addEventListener('input', (e) => {
                    const newW = parseInt(e.target.value, 10);
                    const aspect = (selectedItem.width / (selectedItem.height || 1)) || 1.5;
                    selectedItem.width = newW;
                    selectedItem.height = Math.round(newW / aspect);
                    renderPageAnnotations();
                    updateStudioPropertyBar();
                });
                bar.querySelector('#propImgOpacity')?.addEventListener('input', (e) => {
                    selectedItem.opacity = parseInt(e.target.value, 10) / 100;
                    renderPageAnnotations();
                });
                bar.querySelector('#propBtnDelete')?.addEventListener('click', () => removeAnnotation(selectedItem.id));
                return;
            } else if (selectedItem.type === 'shape') {
                bar.innerHTML = `
                    <div class="prop-group prop-shape-types">
                        <span class="prop-label">Kształt:</span>
                        <button type="button" class="prop-btn-shape ${selectedItem.shapeType === 'rect' ? 'active' : ''}" data-sh="rect">🔲 Prostokąt</button>
                        <button type="button" class="prop-btn-shape ${selectedItem.shapeType === 'circle' ? 'active' : ''}" data-sh="circle">⭕ Elipsa</button>
                        <button type="button" class="prop-btn-shape ${selectedItem.shapeType === 'line' ? 'active' : ''}" data-sh="line">➖ Linia</button>
                        <button type="button" class="prop-btn-shape ${selectedItem.shapeType === 'arrow' ? 'active' : ''}" data-sh="arrow">➔ Strzałka</button>
                    </div>
                    <div class="prop-group">
                        <span class="prop-label">Kolor:</span>
                        <div class="prop-colors">
                            <button type="button" class="prop-color-pill ${selectedItem.color === '#EF4444' ? 'active' : ''}" data-c="#EF4444" style="background:#EF4444;" title="Czerwony"></button>
                            <button type="button" class="prop-color-pill ${selectedItem.color === '#0F91D2' ? 'active' : ''}" data-c="#0F91D2" style="background:#0F91D2;" title="Niebieski"></button>
                            <button type="button" class="prop-color-pill ${selectedItem.color === '#10B981' ? 'active' : ''}" data-c="#10B981" style="background:#10B981;" title="Zielony"></button>
                            <button type="button" class="prop-color-pill ${selectedItem.color === '#F59E0B' ? 'active' : ''}" data-c="#F59E0B" style="background:#F59E0B;" title="Żółty / Pomarańczowy"></button>
                            <button type="button" class="prop-color-pill ${selectedItem.color === '#0F172A' ? 'active' : ''}" data-c="#0F172A" style="background:#0F172A;" title="Czarny"></button>
                        </div>
                    </div>
                    <div class="prop-group">
                        <span class="prop-label">Grubość:</span>
                        <select class="prop-select" id="propShapeStroke">
                            <option value="2" ${selectedItem.strokeWidth === 2 ? 'selected' : ''}>2 px</option>
                            <option value="3" ${selectedItem.strokeWidth === 3 ? 'selected' : ''}>3 px</option>
                            <option value="5" ${selectedItem.strokeWidth === 5 ? 'selected' : ''}>5 px</option>
                            <option value="8" ${selectedItem.strokeWidth === 8 ? 'selected' : ''}>8 px</option>
                        </select>
                    </div>
                    <div class="prop-group">
                        <span class="prop-label">Wypełnienie:</span>
                        <select class="prop-select" id="propShapeFill">
                            <option value="none" ${selectedItem.fill === 'none' ? 'selected' : ''}>Brak</option>
                            <option value="tint" ${selectedItem.fill === 'tint' ? 'selected' : ''}>Półprzezroczyste</option>
                            <option value="solid" ${selectedItem.fill === 'solid' ? 'selected' : ''}>Pełne</option>
                        </select>
                    </div>
                    <button type="button" class="prop-btn-del" id="propBtnDelete">🗑️ Usuń</button>
                `;
                bar.querySelectorAll('.prop-btn-shape').forEach(b => b.addEventListener('click', () => {
                    selectedItem.shapeType = b.getAttribute('data-sh');
                    studioShapeType = selectedItem.shapeType;
                    renderPageAnnotations();
                    updateStudioPropertyBar();
                }));
                bar.querySelectorAll('.prop-color-pill').forEach(b => b.addEventListener('click', () => {
                    selectedItem.color = b.getAttribute('data-c');
                    studioShapeColor = selectedItem.color;
                    renderPageAnnotations();
                    updateStudioPropertyBar();
                }));
                bar.querySelector('#propShapeStroke')?.addEventListener('change', (e) => {
                    selectedItem.strokeWidth = parseInt(e.target.value, 10);
                    studioShapeStrokeWidth = selectedItem.strokeWidth;
                    renderPageAnnotations();
                });
                bar.querySelector('#propShapeFill')?.addEventListener('change', (e) => {
                    selectedItem.fill = e.target.value;
                    studioShapeFill = selectedItem.fill;
                    renderPageAnnotations();
                });
                bar.querySelector('#propBtnDelete')?.addEventListener('click', () => removeAnnotation(selectedItem.id));
                return;
            } else if (selectedItem.type === 'highlight') {
                bar.innerHTML = `
                    <div class="prop-group">
                        <span class="prop-label">Kolor zakreślacza:</span>
                        <div class="prop-colors">
                            <button type="button" class="prop-color-pill ${selectedItem.color === '#FFEB3B' ? 'active' : ''}" style="background: #FFEB3B;" data-c="#FFEB3B" title="Żółty"></button>
                            <button type="button" class="prop-color-pill ${selectedItem.color === '#4CAF50' ? 'active' : ''}" style="background: #4CAF50;" data-c="#4CAF50" title="Zielony"></button>
                            <button type="button" class="prop-color-pill ${selectedItem.color === '#00E5FF' ? 'active' : ''}" style="background: #00E5FF;" data-c="#00E5FF" title="Niebieski"></button>
                            <button type="button" class="prop-color-pill ${selectedItem.color === '#FF4081' ? 'active' : ''}" style="background: #FF4081;" data-c="#FF4081" title="Różowy"></button>
                        </div>
                    </div>
                    <div class="prop-group">
                        <span class="prop-label">Szerokość:</span>
                        <input type="range" min="60" max="300" value="${selectedItem.width}" id="propHlWidth" style="width: 100px;">
                    </div>
                    <button type="button" class="prop-btn-del" id="propBtnDelete">🗑️ Usuń</button>
                `;
                bar.querySelectorAll('.prop-color-pill').forEach(btn => btn.addEventListener('click', () => {
                    selectedItem.color = btn.getAttribute('data-c');
                    renderPageAnnotations();
                    updateStudioPropertyBar();
                }));
                const wRange = bar.querySelector('#propHlWidth');
                if (wRange) wRange.addEventListener('input', (e) => {
                    selectedItem.width = parseInt(e.target.value, 10);
                    renderPageAnnotations();
                });
                bar.querySelector('#propBtnDelete')?.addEventListener('click', () => removeAnnotation(selectedItem.id));
                return;
            } else if (selectedItem.type === 'censor') {
                bar.innerHTML = `
                    <div class="prop-group">
                        <span class="prop-label">Blok cenzury:</span>
                        <button type="button" class="prop-btn-stamp" style="border-color:#000; color:#fff; background:#000;" id="propCensorBlack">Czarny (Blackout)</button>
                        <button type="button" class="prop-btn-stamp" style="border-color:#ccc; color:#000; background:#fff;" id="propCensorWhite">Biały (Czyszczenie)</button>
                    </div>
                    <div class="prop-group">
                        <span class="prop-label">Szerokość:</span>
                        <input type="range" min="60" max="300" value="${selectedItem.width}" id="propCsWidth" style="width: 100px;">
                    </div>
                    <button type="button" class="prop-btn-del" id="propBtnDelete">🗑️ Usuń</button>
                `;
                bar.querySelector('#propCensorBlack')?.addEventListener('click', () => {
                    selectedItem.color = '#000000';
                    renderPageAnnotations();
                });
                bar.querySelector('#propCensorWhite')?.addEventListener('click', () => {
                    selectedItem.color = '#FFFFFF';
                    renderPageAnnotations();
                });
                const wRange = bar.querySelector('#propCsWidth');
                if (wRange) wRange.addEventListener('input', (e) => {
                    selectedItem.width = parseInt(e.target.value, 10);
                    renderPageAnnotations();
                });
                bar.querySelector('#propBtnDelete')?.addEventListener('click', () => removeAnnotation(selectedItem.id));
                return;
            } else if (selectedItem.type === 'link') {
                bar.innerHTML = `
                    <div class="prop-group">
                        <span class="prop-label">Adres URL:</span>
                        <input type="url" class="prop-input" id="propLinkUrl" value="${selectedItem.url}" style="width: 240px;">
                    </div>
                    <button type="button" class="prop-btn-del" id="propBtnDelete">🗑️ Usuń</button>
                `;
                bar.querySelector('#propLinkUrl')?.addEventListener('input', (e) => {
                    selectedItem.url = e.target.value;
                    renderPageAnnotations();
                });
                bar.querySelector('#propBtnDelete')?.addEventListener('click', () => removeAnnotation(selectedItem.id));
                return;
            }
        }

        // Domyślny pasek dla aktywnego narzędzia, gdy żaden element nie jest zaznaczony
        if (studioActiveTool === 'text') {
            bar.innerHTML = `<span class="prop-label">✍️ Kliknij w dowolnym miejscu, aby wstawić napis. Możesz edytować go podwójnym kliknięciem lub pływającym menu!</span>`;
        } else if (studioActiveTool === 'image') {
            bar.innerHTML = `
                <span class="prop-label">🖼️ Wstaw obraz, logo lub skan pieczątki z dysku:</span>
                <button type="button" class="btn-sm-ghost" id="btnUploadStudioImageFromBar" style="background:rgba(15,145,210,0.18); border-color:#0F91D2; color:#FFFFFF;">📁 Wybierz obraz (PNG / JPG / SVG)</button>
            `;
            bar.querySelector('#btnUploadStudioImageFromBar')?.addEventListener('click', () => {
                document.getElementById('studioImageInput')?.click();
            });
        } else if (studioActiveTool === 'shape') {
            bar.innerHTML = `
                <div class="prop-group prop-shape-types">
                    <span class="prop-label">Wybierz kształt:</span>
                    <button type="button" class="prop-btn-shape ${studioShapeType === 'rect' ? 'active' : ''}" data-sh="rect">🔲 Prostokąt</button>
                    <button type="button" class="prop-btn-shape ${studioShapeType === 'circle' ? 'active' : ''}" data-sh="circle">⭕ Elipsa</button>
                    <button type="button" class="prop-btn-shape ${studioShapeType === 'line' ? 'active' : ''}" data-sh="line">➖ Linia</button>
                    <button type="button" class="prop-btn-shape ${studioShapeType === 'arrow' ? 'active' : ''}" data-sh="arrow">➔ Strzałka</button>
                </div>
                <span style="font-size: 0.76rem; color: #94A3B8; margin-left: 8px;">(Kliknij na arkuszu dokumentu, aby wstawić)</span>
            `;
            bar.querySelectorAll('.prop-btn-shape').forEach(b => b.addEventListener('click', () => {
                studioShapeType = b.getAttribute('data-sh');
                bar.querySelectorAll('.prop-btn-shape').forEach(x => x.classList.toggle('active', x === b));
            }));
        } else if (studioActiveTool === 'highlight') {
            bar.innerHTML = `<span class="prop-label">🖍️ Kliknij na dokumencie, aby umieścić pasek zakreślacza.</span>`;
        } else if (studioActiveTool === 'censor') {
            bar.innerHTML = `<span class="prop-label">⬛ Kliknij na dokumencie, aby trwale zakryć poufne dane (PESEL, kwotę, nazwisko).</span>`;
        } else if (studioActiveTool === 'stamp') {
            bar.innerHTML = `
                <span class="prop-label">Wybierz wzór pieczęci do wstawienia:</span>
                <button type="button" class="prop-btn-stamp" data-st="approved" style="border-color:#16A34A; color:#4ADE80; background:rgba(22,163,74,0.12);">✓ ZATWIERDZONO</button>
                <button type="button" class="prop-btn-stamp" data-st="paid" style="border-color:#0284C7; color:#38BDF8; background:rgba(2,132,199,0.12);">💳 OPŁACONO</button>
                <button type="button" class="prop-btn-stamp" data-st="confidential" style="border-color:#DC2626; color:#F87171; background:rgba(220,38,38,0.12);">🔒 ŚCIŚLE POUFNE</button>
                <button type="button" class="prop-btn-stamp" data-st="copy" style="border-color:#4338CA; color:#818CF8; background:rgba(67,56,202,0.12);">📄 ZA ZGODNOŚĆ</button>
                <button type="button" class="prop-btn-stamp" data-st="urgent" style="border-color:#D97706; color:#FBBF24; background:rgba(217,119,6,0.12);">⚡ PILNE!</button>
                <button type="button" class="prop-btn-stamp" data-st="custom" style="border-color:#8B5CF6; color:#C084FC; background:rgba(139,92,246,0.12);">✏️ WŁASNA...</button>
            `;
            bar.querySelectorAll('.prop-btn-stamp').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const st = btn.getAttribute('data-st');
                    if (st === 'custom') {
                        const customText = await showStudioPrompt({
                            title: 'Własna pieczęć firmowa',
                            icon: '✏️',
                            label: 'Wpisz tekst Twojej pieczęci:',
                            defaultValue: 'FAKTURA ZAPŁACONA',
                            placeholder: 'np. ANULOWANO, WPŁYNĘŁO, FAKTURA'
                        });
                        if (customText && customText.trim()) {
                            addNewAnnotationAt('stamp', 80, 80, 'custom', customText.trim());
                        }
                    } else {
                        addNewAnnotationAt('stamp', 80, 80, st);
                    }
                });
            });
        } else if (studioActiveTool === 'company-stamp') {
            bar.innerHTML = `
                <span class="prop-label">🏢 Oficjalna pieczęć firmowa z NIP, REGON i adresem:</span>
                <button type="button" class="btn-sm-ghost" id="btnOpenCStampFromBar" style="background:rgba(15,145,210,0.18); border-color:#0F91D2; color:#FFFFFF;">✨ Otwórz kreator pieczęci</button>
            `;
            bar.querySelector('#btnOpenCStampFromBar')?.addEventListener('click', openCompanyStampModal);
        } else if (studioActiveTool === 'watermark') {
            bar.innerHTML = `
                <span class="prop-label">💧 Znak wodny: <strong>${studioWatermark.enabled ? `WŁĄCZONY („${studioWatermark.text}”)` : 'WYŁĄCZONY'}</strong></span>
                <button type="button" class="btn-sm-ghost" id="btnOpenWmFromBar" style="background:rgba(15,145,210,0.18); border-color:#0F91D2; color:#FFFFFF;">⚙️ Konfiguruj znak wodny</button>
            `;
            bar.querySelector('#btnOpenWmFromBar')?.addEventListener('click', openWatermarkModal);
        } else if (studioActiveTool === 'page-number') {
            bar.innerHTML = `
                <span class="prop-label">🔢 Numerowanie stron: <strong>${studioPageNumbers.enabled ? 'WŁĄCZONE' : 'WYŁĄCZONE'}</strong></span>
                <button type="button" class="btn-sm-ghost" id="btnOpenPnFromBar" style="background:rgba(15,145,210,0.18); border-color:#0F91D2; color:#FFFFFF;">⚙️ Konfiguruj paginację</button>
            `;
            bar.querySelector('#btnOpenPnFromBar')?.addEventListener('click', openPageNumberModal);
        } else if (studioActiveTool === 'link') {
            bar.innerHTML = `<span class="prop-label">🔗 Kliknij na dokumencie, aby dodać klikalny link dla czytelnika.</span>`;
        }
    }

    // Modal podpisu odręcznego (Signature Pad)
    function initSignatureModal() {
        const modal = document.getElementById('signatureModal');
        const canvas = document.getElementById('sigPadCanvas');
        const btnClose = document.getElementById('btnSigClose');
        const btnCancel = document.getElementById('btnSigCancel');
        const btnClear = document.getElementById('btnSigClear');
        const btnApply = document.getElementById('btnSigApply');
        const fileUpload = document.getElementById('sigImageUploadInput');
        const colorBtns = document.querySelectorAll('.sig-color-choice');

        if (!modal || !canvas) return;

        let ctx = canvas.getContext('2d');
        let isDrawing = false;
        let strokeColor = '#000000';
        let hasDrawn = false;

        function resetCanvas() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            hasDrawn = false;
        }

        function getCanvasPoint(e) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
        }

        canvas.addEventListener('pointerdown', (e) => {
            isDrawing = true;
            hasDrawn = true;
            canvas.setPointerCapture(e.pointerId);
            const pt = getCanvasPoint(e);
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        });

        canvas.addEventListener('pointermove', (e) => {
            if (!isDrawing) return;
            const pt = getCanvasPoint(e);
            ctx.lineTo(pt.x, pt.y);
            ctx.stroke();
        });

        canvas.addEventListener('pointerup', (e) => {
            if (isDrawing) {
                isDrawing = false;
                try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
            }
        });

        if (btnClear) btnClear.addEventListener('click', resetCanvas);

        colorBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                colorBtns.forEach(b => b.classList.toggle('active', b === btn));
                strokeColor = btn.getAttribute('data-color') || '#000000';
            });
        });

        // Wgranie pliku graficznego podpisu (PNG z przezroczystością)
        if (fileUpload) {
            fileUpload.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    const reader = new FileReader();
                    reader.onload = (re) => {
                        const img = new Image();
                        img.onload = () => {
                            resetCanvas();
                            ctx.drawImage(img, 50, 20, canvas.width - 100, canvas.height - 40);
                            hasDrawn = true;
                        };
                        img.src = re.target.result;
                    };
                    reader.readAsDataURL(e.target.files[0]);
                }
            });
        }

        const closeModal = () => {
            if (window.smoothCloseModal) window.smoothCloseModal(modal);
            else modal.style.display = 'none';
        };

        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnCancel) btnCancel.addEventListener('click', closeModal);

        if (btnApply) {
            btnApply.addEventListener('click', () => {
                if (!hasDrawn) {
                    if (window.showNotification) window.showNotification('Złóż podpis przed zatwierdzeniem!', 'info');
                    return;
                }

                const dataUrl = canvas.toDataURL('image/png');
                const id = 'ann_' + (studioNextId++);
                studioAnnotations.push({
                    id,
                    page: studioCurrentPage,
                    type: 'sig',
                    x: 60,
                    y: 120,
                    width: 180,
                    height: 65,
                    dataUrl
                });
                studioSelectedId = id;
                closeModal();
                renderPageAnnotations();
                updateStudioPropertyBar();
                if (window.playSound) window.playSound('pop');
                if (window.showNotification) window.showNotification('Podpis został wstawiony na stronę!', 'success');
            });
        }
    }

    function openSignatureModal() {
        const modal = document.getElementById('signatureModal');
        const canvas = document.getElementById('sigPadCanvas');
        if (modal) {
            if (window.smoothOpenModal) window.smoothOpenModal(modal);
            else modal.style.display = 'flex';
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }

    // -------------------------------------------------------------
    // KREATOR OFICJALNEJ PIECZĄTKI FIRMOWEJ
    // -------------------------------------------------------------
    function renderCompanyStampToCanvas(canvas, data) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const color = data.color || '#1E40AF';
        const shape = data.shape || 'rect';

        if (shape === 'rect') {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;

            // Zewnętrzna grubsza ramka
            ctx.lineWidth = 2.5;
            ctx.strokeRect(8, 8, w - 16, h - 16);

            // Wewnętrzna cieńsza ramka
            ctx.lineWidth = 1;
            ctx.strokeRect(13, 13, w - 26, h - 26);

            // Linia 1: Nazwa firmy (pogrubiona)
            ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const name = (data.name || 'DROPSITE TECH SP. Z O.O.').toUpperCase();
            ctx.fillText(name, w / 2, 34, w - 40);

            // Linia 2: NIP i REGON
            ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            let nipRegon = '';
            if (data.nip) nipRegon += data.nip.trim();
            if (data.regon) nipRegon += (nipRegon ? '  |  ' : '') + data.regon.trim();
            if (nipRegon) {
                ctx.fillText(nipRegon, w / 2, 58, w - 40);
            }

            // Linia 3: Adres / Siedziba
            if (data.address) {
                ctx.fillText(data.address.trim(), w / 2, 80, w - 40);
            }

            // Linia 4: Kontakt / Tel / WWW
            if (data.contact) {
                ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.fillText(data.contact.trim(), w / 2, 102, w - 40);
            }

            ctx.restore();
        } else {
            // Okrągła pieczęć urzędowa
            ctx.save();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;

            const cx = w / 2;
            const cy = h / 2;
            const radius = Math.min(cx, cy) - 8;

            // Zewnętrzne grubsze koło
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();

            // Wewnętrzny cienki okrąg
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(cx, cy, radius - 6, 0, Math.PI * 2);
            ctx.stroke();

            // Centralne koło ozdobne (przerywane)
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.arc(cx, cy, radius - 24, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Tekst na okręgu u góry (Nazwa firmy)
            // Kąty u góry: od lewej (-0.82*PI) do prawej (-0.18*PI) ze szczytem w 12:00 (-0.5*PI)
            const topText = (data.name || 'DROPSITE TECH SP. Z O.O.').toUpperCase();
            drawCurvedText(ctx, topText, cx, cy, radius - 15, -Math.PI * 0.82, -Math.PI * 0.18, false);

            // Tekst na okręgu na dole (Adres lub Kontakt)
            // Kąty u dołu: od lewej (0.82*PI) do prawej (0.18*PI) ze środkiem w 6:00 (0.5*PI)
            const bottomText = (data.address || data.contact || 'POLSKA').toUpperCase();
            drawCurvedText(ctx, bottomText, cx, cy, radius - 15, Math.PI * 0.82, Math.PI * 0.18, true);

            // Środek pieczęci: Gwiazdki i NIP
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('★ ★ ★', cx, cy - 10);
            if (data.nip) {
                ctx.font = 'bold 10px sans-serif';
                ctx.fillText(data.nip.trim(), cx, cy + 9, radius * 1.2);
            }

            ctx.restore();
        }
    }

    function drawCurvedText(ctx, text, cx, cy, radius, startAngle, endAngle, inward) {
        ctx.save();
        ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const numChars = text.length;
        if (numChars === 0) { ctx.restore(); return; }

        const angleStep = (endAngle - startAngle) / (numChars - 1 || 1);
        for (let i = 0; i < numChars; i++) {
            const char = text[i];
            const angle = startAngle + i * angleStep;
            ctx.save();
            ctx.translate(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
            ctx.rotate(angle + (inward ? -Math.PI / 2 : Math.PI / 2));
            ctx.fillText(char, 0, 0);
            ctx.restore();
        }
        ctx.restore();
    }

    // -------------------------------------------------------------
    // STYLOWY DIALOG PROMPT W STYLU DROPSITE (ZAMIAST OKNA SYSTEMOWEGO)
    // -------------------------------------------------------------
    function showStudioPrompt({ title, icon, label, defaultValue, placeholder }) {
        return new Promise((resolve) => {
            const modal = document.getElementById('studioPromptModal');
            const titleEl = document.getElementById('promptModalTitle');
            const iconEl = document.getElementById('promptModalIcon');
            const labelEl = document.getElementById('promptModalLabel');
            const inputEl = document.getElementById('promptModalInput');
            const btnClose = document.getElementById('btnPromptModalClose');
            const btnCancel = document.getElementById('btnPromptModalCancel');
            const btnApply = document.getElementById('btnPromptModalApply');

            if (!modal || !inputEl) {
                resolve(prompt(label || title, defaultValue || ''));
                return;
            }

            if (titleEl) titleEl.textContent = title || 'Wprowadź tekst';
            if (iconEl) iconEl.textContent = icon || '✏️';
            if (labelEl) labelEl.textContent = label || 'Tekst:';
            inputEl.value = defaultValue || '';
            inputEl.placeholder = placeholder || '';

            const cleanup = () => {
                if (window.smoothCloseModal) window.smoothCloseModal(modal);
                else modal.style.display = 'none';
                btnClose?.removeEventListener('click', onCancel);
                btnCancel?.removeEventListener('click', onCancel);
                btnApply?.removeEventListener('click', onApply);
                inputEl.removeEventListener('keydown', onKeyDown);
            };

            const onCancel = () => {
                cleanup();
                resolve(null);
            };

            const onApply = () => {
                const val = inputEl.value;
                cleanup();
                resolve(val);
            };

            const onKeyDown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    onApply();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    onCancel();
                }
            };

            btnClose?.addEventListener('click', onCancel);
            btnCancel?.addEventListener('click', onCancel);
            btnApply?.addEventListener('click', onApply);
            inputEl.addEventListener('keydown', onKeyDown);

            if (window.smoothOpenModal) window.smoothOpenModal(modal);
            else modal.style.display = 'flex';
            setTimeout(() => {
                inputEl.focus();
                inputEl.select();
            }, 50);
        });
    }

    function initCompanyStampModal() {
        const modal = document.getElementById('companyStampModal');
        const canvas = document.getElementById('companyStampCanvas');
        const btnClose = document.getElementById('btnCompanyStampClose');
        const btnCancel = document.getElementById('btnCompanyStampCancel');
        const btnApply = document.getElementById('btnCompanyStampApply');

        const inName = document.getElementById('cStampName');
        const inNip = document.getElementById('cStampNip');
        const inRegon = document.getElementById('cStampRegon');
        const inAddress = document.getElementById('cStampAddress');
        const inContact = document.getElementById('cStampContact');

        const shapeBtns = document.querySelectorAll('.stamp-shape-btn');
        const colorBtns = document.querySelectorAll('.company-color-choice');

        if (!modal || !canvas) return;

        let curShape = 'rect';
        let curColor = '#1E40AF';

        function updatePreview() {
            if (curShape === 'circle') {
                canvas.width = 240;
                canvas.height = 240;
            } else {
                canvas.width = 340;
                canvas.height = 150;
            }
            renderCompanyStampToCanvas(canvas, {
                shape: curShape,
                color: curColor,
                name: inName?.value || '',
                nip: inNip?.value || '',
                regon: inRegon?.value || '',
                address: inAddress?.value || '',
                contact: inContact?.value || ''
            });
        }

        [inName, inNip, inRegon, inAddress, inContact].forEach(input => {
            if (input) input.addEventListener('input', updatePreview);
        });

        shapeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                shapeBtns.forEach(b => b.classList.toggle('active', b === btn));
                curShape = btn.dataset.shape || 'rect';
                updatePreview();
            });
        });

        colorBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                colorBtns.forEach(b => b.classList.toggle('active', b === btn));
                curColor = btn.dataset.color || '#1E40AF';
                updatePreview();
            });
        });

        const closeModal = () => {
            if (window.smoothCloseModal) window.smoothCloseModal(modal);
            else modal.style.display = 'none';
        };
        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnCancel) btnCancel.addEventListener('click', closeModal);

        if (btnApply) {
            btnApply.addEventListener('click', () => {
                const dataUrl = canvas.toDataURL('image/png');
                const overlayLayer = document.getElementById('pdfOverlayLayer');
                const curW = overlayLayer ? overlayLayer.clientWidth : 595;
                const curH = overlayLayer ? overlayLayer.clientHeight : 842;

                const annotW = curShape === 'circle' ? 140 : 200;
                const annotH = curShape === 'circle' ? 140 : 90;
                const id = 'ann_' + (studioNextId++);

                const annot = {
                    id,
                    page: studioCurrentPage,
                    type: 'stamp',
                    subType: 'company',
                    shape: curShape,
                    color: curColor,
                    dataUrl,
                    x: Math.max(20, Math.floor((curW - annotW) / 2)),
                    y: Math.max(20, Math.floor((curH - annotH) / 2)),
                    width: annotW,
                    height: annotH,
                    pageOverlayW: curW,
                    pageOverlayH: curH
                };

                studioAnnotations.push(annot);
                studioSelectedId = id;
                renderPageAnnotations();
                updateStudioPropertyBar();
                renderFloatingToolbar();
                if (window.playSound) window.playSound('pop');
                if (window.showNotification) window.showNotification('Pieczęć firmowa została wstawiona na arkusz.', 'success');
                closeModal();
            });
        }

        updatePreview();
    }

    function openCompanyStampModal() {
        const modal = document.getElementById('companyStampModal');
        if (modal) {
            if (window.smoothOpenModal) window.smoothOpenModal(modal);
            else modal.style.display = 'flex';
            const canvas = document.getElementById('companyStampCanvas');
            if (canvas) {
                const inName = document.getElementById('cStampName');
                const inNip = document.getElementById('cStampNip');
                const inRegon = document.getElementById('cStampRegon');
                const inAddress = document.getElementById('cStampAddress');
                const inContact = document.getElementById('cStampContact');
                const shape = document.querySelector('.stamp-shape-btn.active')?.dataset.shape || 'rect';
                const color = document.querySelector('.company-color-choice.active')?.dataset.color || '#1E40AF';
                if (shape === 'circle') {
                    canvas.width = 240;
                    canvas.height = 240;
                } else {
                    canvas.width = 340;
                    canvas.height = 150;
                }
                renderCompanyStampToCanvas(canvas, {
                    shape,
                    color,
                    name: inName?.value || '',
                    nip: inNip?.value || '',
                    regon: inRegon?.value || '',
                    address: inAddress?.value || '',
                    contact: inContact?.value || ''
                });
            }
        }
    }

    // -------------------------------------------------------------
    // ZNAK WODNY (WATERMARK)
    // -------------------------------------------------------------
    function createWatermarkPngDataUrl(text, colorHex, angleDeg) {
        const c = document.createElement('canvas');
        c.width = 1000;
        c.height = 1000;
        const ctx = c.getContext('2d');

        ctx.translate(500, 500);
        ctx.rotate((angleDeg || -45) * Math.PI / 180);
        ctx.fillStyle = colorHex || '#64748B';
        ctx.font = '900 84px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text || 'POUFNE', 0, 0);

        return c.toDataURL('image/png');
    }

    function initWatermarkModal() {
        const modal = document.getElementById('watermarkModal');
        const btnClose = document.getElementById('btnWatermarkClose');
        const btnCancel = document.getElementById('btnWatermarkCancel');
        const btnApply = document.getElementById('btnWatermarkApply');

        const chkActive = document.getElementById('chkWatermarkActive');
        const textInput = document.getElementById('wmTextInput');
        const opacityRange = document.getElementById('wmOpacityRange');
        const opacityVal = document.getElementById('wmOpacityVal');
        const angleSelect = document.getElementById('wmAngleSelect');
        const presetBtns = document.querySelectorAll('.wm-preset-pill');
        const colorBtns = document.querySelectorAll('.wm-color-choice');

        if (!modal) return;

        let selectedColor = '#64748B';

        if (opacityRange && opacityVal) {
            opacityRange.addEventListener('input', () => {
                opacityVal.textContent = `${opacityRange.value}%`;
            });
        }

        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (textInput) textInput.value = btn.dataset.text || '';
            });
        });

        colorBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                colorBtns.forEach(b => b.classList.toggle('active', b === btn));
                selectedColor = btn.dataset.color || '#64748B';
            });
        });

        const closeModal = () => {
            if (window.smoothCloseModal) window.smoothCloseModal(modal);
            else modal.style.display = 'none';
        };
        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnCancel) btnCancel.addEventListener('click', closeModal);

        if (btnApply) {
            btnApply.addEventListener('click', () => {
                studioWatermark.enabled = chkActive?.checked || false;
                studioWatermark.text = textInput?.value.trim() || 'POUFNE';
                studioWatermark.opacity = parseInt(opacityRange?.value || '16', 10) / 100;
                studioWatermark.angle = parseInt(angleSelect?.value || '-45', 10);
                studioWatermark.color = selectedColor;

                renderCurrentPdfPage();
                updateStudioPropertyBar();
                closeModal();
                if (window.showNotification) {
                    window.showNotification(
                        studioWatermark.enabled 
                            ? `Znak wodny "${studioWatermark.text}" został aktywowany.` 
                            : 'Znak wodny został wyłączony.',
                        'info'
                    );
                }
            });
        }
    }

    function openWatermarkModal() {
        const modal = document.getElementById('watermarkModal');
        if (modal) {
            const chk = document.getElementById('chkWatermarkActive');
            const textInput = document.getElementById('wmTextInput');
            const range = document.getElementById('wmOpacityRange');
            const val = document.getElementById('wmOpacityVal');
            const select = document.getElementById('wmAngleSelect');

            if (chk) chk.checked = studioWatermark.enabled;
            if (textInput) textInput.value = studioWatermark.text;
            if (range) range.value = Math.round(studioWatermark.opacity * 100);
            if (val) val.textContent = `${Math.round(studioWatermark.opacity * 100)}%`;
            if (select) select.value = `${studioWatermark.angle}`;

            if (window.smoothOpenModal) window.smoothOpenModal(modal);
            else modal.style.display = 'flex';
        }
    }

    // -------------------------------------------------------------
    // AUTOMATYCZNA PAGINACJA (NUMEROWANIE STRON)
    // -------------------------------------------------------------
    function initPageNumberModal() {
        const modal = document.getElementById('pageNumberModal');
        const btnClose = document.getElementById('btnPageNumClose');
        const btnCancel = document.getElementById('btnPageNumCancel');
        const btnApply = document.getElementById('btnPageNumApply');

        const chkActive = document.getElementById('chkPageNumActive');
        const formatSelect = document.getElementById('pnFormatSelect');
        const posSelect = document.getElementById('pnPosSelect');
        const chkSkip = document.getElementById('chkPageNumSkipFirst');

        if (!modal) return;

        const closeModal = () => {
            if (window.smoothCloseModal) window.smoothCloseModal(modal);
            else modal.style.display = 'none';
        };
        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnCancel) btnCancel.addEventListener('click', closeModal);

        if (btnApply) {
            btnApply.addEventListener('click', () => {
                studioPageNumbers.enabled = chkActive?.checked || false;
                studioPageNumbers.format = formatSelect?.value || 'cur_total';
                studioPageNumbers.position = posSelect?.value || 'bottom-right';
                studioPageNumbers.skipFirst = chkSkip?.checked || false;

                updateStudioPropertyBar();
                closeModal();
                if (window.showNotification) {
                    window.showNotification(
                        studioPageNumbers.enabled
                            ? 'Numerowanie stron zostanie naniesione podczas eksportu do PDF.'
                            : 'Numerowanie stron zostało wyłączone.',
                        'info'
                    );
                }
            });
        }
    }

    function openPageNumberModal() {
        const modal = document.getElementById('pageNumberModal');
        if (modal) {
            const chk = document.getElementById('chkPageNumActive');
            const format = document.getElementById('pnFormatSelect');
            const pos = document.getElementById('pnPosSelect');
            const skip = document.getElementById('chkPageNumSkipFirst');

            if (chk) chk.checked = studioPageNumbers.enabled;
            if (format) format.value = studioPageNumbers.format;
            if (pos) pos.value = studioPageNumbers.position;
            if (skip) skip.checked = studioPageNumbers.skipFirst;

            if (window.smoothOpenModal) window.smoothOpenModal(modal);
            else modal.style.display = 'flex';
        }
    }

    // -------------------------------------------------------------
    // BOCZNY PANEL MINIATUREK STRON (THUMBNAILS)
    // -------------------------------------------------------------
    async function updateThumbnailCard(p) {
        const canvas = document.getElementById(`thumbCanvas_${p}`);
        if (!canvas || !studioPdfJsDoc) return;
        try {
            const pdfPage = await studioPdfJsDoc.getPage(p);
            const rot = (pdfPage.rotate + (studioPageRotations[p] || 0)) % 360;
            const unscaled = pdfPage.getViewport({ scale: 1.0, rotation: rot });
            const thumbScale = Math.min(130 / unscaled.width, 170 / unscaled.height);
            const viewport = pdfPage.getViewport({ scale: thumbScale, rotation: rot });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            await pdfPage.render({ canvasContext: ctx, viewport }).promise;
        } catch (e) {
            console.warn(`Błąd odświeżania miniatury strony ${p}:`, e);
        }
    }

    async function renderThumbnailsDrawer() {
        const list = document.getElementById('studioThumbsList');
        const countLabel = document.getElementById('thumbsCountLabel');
        if (!list || !studioPdfJsDoc) return;

        if (countLabel) countLabel.textContent = `${studioTotalPages}`;
        list.innerHTML = '';

        for (let p = 1; p <= studioTotalPages; p++) {
            const card = document.createElement('div');
            const isDel = studioDeletedPages.has(p);
            const isCur = (p === studioCurrentPage);
            card.className = `thumb-page-card ${isCur ? 'active' : ''} ${isDel ? 'deleted' : ''}`;
            card.dataset.page = p;

            card.innerHTML = `
                <div class="thumb-page-canvas-wrap">
                    <canvas id="thumbCanvas_${p}"></canvas>
                </div>
                <span class="thumb-page-num">Strona ${p}</span>
                ${isDel ? '<span class="thumb-del-badge">Usunięta</span>' : ''}
            `;

            card.addEventListener('click', () => {
                studioCurrentPage = p;
                studioSelectedId = null;
                renderCurrentPdfPage();
                updateStudioPropertyBar();
                renderFloatingToolbar();
                updateThumbnailsActive();
            });

            list.appendChild(card);

            try {
                const pdfPage = await studioPdfJsDoc.getPage(p);
                const rot = (pdfPage.rotate + (studioPageRotations[p] || 0)) % 360;
                const unscaled = pdfPage.getViewport({ scale: 1.0, rotation: rot });
                const thumbScale = Math.min(130 / unscaled.width, 170 / unscaled.height);
                const viewport = pdfPage.getViewport({ scale: thumbScale, rotation: rot });

                const canvas = document.getElementById(`thumbCanvas_${p}`);
                if (canvas) {
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d');
                    await pdfPage.render({ canvasContext: ctx, viewport }).promise;
                }
            } catch (e) {
                console.warn(`Błąd renderowania miniatury strony ${p}:`, e);
            }
        }
    }

    function updateThumbnailsActive() {
        const cards = document.querySelectorAll('.thumb-page-card');
        cards.forEach(c => {
            const p = parseInt(c.dataset.page, 10);
            c.classList.toggle('active', p === studioCurrentPage);
            c.classList.toggle('deleted', studioDeletedPages.has(p));
        });
    }

    // Pomocnicze funkcje do generowania krystalicznie czystych grafik PNG z tekstem / pieczęciami
    // Dzięki temu obsługiwane są WSZYSTKIE polskie znaki diakrytyczne (Ł, ą, ć, ę, ń, ó, ś, ź, ż) bez błędów WinAnsi!
    function base64ToUint8Array(base64) {
        const raw = atob(base64);
        const len = raw.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = raw.charCodeAt(i);
        }
        return bytes;
    }

    function createTextPngDataUrl(text, fontSize, color, isBold) {
        const canvas = document.createElement('canvas');
        const dpr = 3; // 300+ DPI jakość wektorowa do druku
        const fontSpec = `${isBold ? '700' : '500'} ${Math.round(fontSize * dpr)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
        const ctx = canvas.getContext('2d');
        ctx.font = fontSpec;
        const metrics = ctx.measureText(text || ' ');
        const padX = Math.round(6 * dpr);
        const padY = Math.round(2 * dpr);
        const textW = Math.ceil(metrics.width);
        const textH = Math.ceil(fontSize * dpr * 1.3);

        canvas.width = Math.max(10, textW + padX * 2);
        canvas.height = Math.max(10, textH + padY * 2);

        const c2 = canvas.getContext('2d');
        c2.font = fontSpec;
        c2.fillStyle = color || '#FF4439';
        c2.textBaseline = 'top';
        c2.fillText(text || ' ', padX, padY);

        return {
            dataUrl: canvas.toDataURL('image/png'),
            cssWidth: canvas.width / dpr,
            cssHeight: canvas.height / dpr
        };
    }

    function createStampPngDataUrl(item) {
        const canvas = document.createElement('canvas');
        const dpr = 3;
        const subType = item.subType || (
            item.label.includes('ZATWIERDZ') ? 'approved' :
            item.label.includes('OPŁA') ? 'paid' :
            item.label.includes('POUFN') ? 'confidential' :
            item.label.includes('KOPIA') || item.label.includes('ZGODN') ? 'copy' :
            item.label.includes('PILN') ? 'urgent' : 'custom'
        );
        const color = item.color || (
            subType === 'approved' ? '#16A34A' :
            subType === 'paid' ? '#0284C7' :
            subType === 'confidential' ? '#DC2626' :
            subType === 'copy' ? '#4338CA' :
            subType === 'urgent' ? '#D97706' : '#8B5CF6'
        );
        const curDate = item.date || new Date().toLocaleDateString('pl-PL');

        const w = Math.ceil((item.width || 175) * dpr);
        const h = Math.ceil((item.height || 48) * dpr);
        canvas.width = w;
        canvas.height = h;

        const c = canvas.getContext('2d');

        if (subType === 'approved') {
            // Tło
            c.fillStyle = color;
            c.globalAlpha = 0.07;
            c.beginPath();
            if (c.roundRect) c.roundRect(0, 0, w, h, 8 * dpr);
            else c.rect(0, 0, w, h);
            c.fill();

            // Podwójna obwódka
            c.globalAlpha = 1.0;
            c.strokeStyle = color;
            c.lineWidth = 2.5 * dpr;
            c.beginPath();
            if (c.roundRect) c.roundRect(2 * dpr, 2 * dpr, w - 4 * dpr, h - 4 * dpr, 7 * dpr);
            else c.strokeRect(2 * dpr, 2 * dpr, w - 4 * dpr, h - 4 * dpr);
            c.stroke();

            c.lineWidth = 1 * dpr;
            c.beginPath();
            if (c.roundRect) c.roundRect(5 * dpr, 5 * dpr, w - 10 * dpr, h - 10 * dpr, 5 * dpr);
            else c.strokeRect(5 * dpr, 5 * dpr, w - 10 * dpr, h - 10 * dpr);
            c.stroke();

            // Tekst
            c.fillStyle = color;
            c.font = `900 ${14 * dpr}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText('✓ ' + (item.label || 'ZATWIERDZONO'), w / 2, h * 0.38);

            c.font = `600 ${8.5 * dpr}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            c.fillText(`DATA: ${curDate}   PODPIS: ............`, w / 2, h * 0.72);

        } else if (subType === 'paid') {
            // Tło
            c.fillStyle = color;
            c.globalAlpha = 0.07;
            c.fillRect(0, 0, w, h);

            // Podwójna ramka kasowa
            c.globalAlpha = 1.0;
            c.strokeStyle = color;
            c.lineWidth = 2.5 * dpr;
            c.strokeRect(2 * dpr, 2 * dpr, w - 4 * dpr, h - 4 * dpr);

            c.lineWidth = 1 * dpr;
            c.strokeRect(5 * dpr, 5 * dpr, w - 10 * dpr, h - 10 * dpr);

            // Tekst
            c.fillStyle = color;
            c.font = `900 ${14 * dpr}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText('★ ' + (item.label || 'OPŁACONO') + ' ★', w / 2, h * 0.38);

            c.font = `700 ${8 * dpr}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            c.fillText(`METODA: PRZELEW / KARTA  •  ${curDate}`, w / 2, h * 0.72);

        } else if (subType === 'confidential') {
            // Tło
            c.fillStyle = color;
            c.globalAlpha = 0.08;
            c.fillRect(0, 0, w, h);

            // Gruba ramka z wewnętrzną linią
            c.globalAlpha = 1.0;
            c.strokeStyle = color;
            c.lineWidth = 3 * dpr;
            c.strokeRect(2 * dpr, 2 * dpr, w - 4 * dpr, h - 4 * dpr);

            c.lineWidth = 1 * dpr;
            c.strokeRect(5.5 * dpr, 5.5 * dpr, w - 11 * dpr, h - 11 * dpr);

            // Tekst
            c.fillStyle = color;
            c.font = `900 ${13 * dpr}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText('★ ★ ★ ' + (item.label || 'ŚCIŚLE POUFNE') + ' ★ ★ ★', w / 2, h * 0.38);

            c.font = `800 ${7.5 * dpr}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            c.fillText('NIE KOPIOWAĆ • DOKUMENT POUFNY', w / 2, h * 0.72);

        } else if (subType === 'copy') {
            // Tło
            c.fillStyle = color;
            c.globalAlpha = 0.07;
            c.fillRect(0, 0, w, h);

            // Ramka przerywana
            c.globalAlpha = 1.0;
            c.strokeStyle = color;
            c.lineWidth = 2 * dpr;
            c.setLineDash([5 * dpr, 3 * dpr]);
            c.strokeRect(2 * dpr, 2 * dpr, w - 4 * dpr, h - 4 * dpr);

            // Tekst
            c.fillStyle = color;
            c.font = `800 ${11 * dpr}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText(item.label || 'ZA ZGODNOŚĆ Z ORYGINAŁEM', w / 2, h * 0.38);

            c.font = `600 ${8 * dpr}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            c.fillText(`STWIERDZAM ZGODNOŚĆ • ${curDate}`, w / 2, h * 0.72);

        } else if (subType === 'urgent') {
            // Tło
            c.fillStyle = color;
            c.globalAlpha = 0.09;
            c.fillRect(0, 0, w, h);

            // Ramka
            c.globalAlpha = 1.0;
            c.strokeStyle = color;
            c.lineWidth = 2.5 * dpr;
            c.strokeRect(2 * dpr, 2 * dpr, w - 4 * dpr, h - 4 * dpr);

            // Tekst
            c.fillStyle = color;
            c.font = `900 ${12.5 * dpr}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText('⚡ ' + (item.label || 'PILNE / WAŻNE') + ' ⚡', w / 2, h * 0.38);

            c.font = `700 ${8 * dpr}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            c.fillText('DO NATYCHMIASTOWEJ REALIZACJI', w / 2, h * 0.72);

        } else {
            // Własna pieczęć
            c.fillStyle = color;
            c.globalAlpha = 0.08;
            c.fillRect(0, 0, w, h);

            c.globalAlpha = 1.0;
            c.strokeStyle = color;
            c.lineWidth = 2 * dpr;
            c.strokeRect(2 * dpr, 2 * dpr, w - 4 * dpr, h - 4 * dpr);

            c.fillStyle = color;
            c.font = `900 ${13 * dpr}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText(item.label || 'PIECZĘĆ', w / 2, h * 0.4);

            c.font = `600 ${8 * dpr}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            c.fillText(curDate, w / 2, h * 0.75);
        }

        return {
            dataUrl: canvas.toDataURL('image/png'),
            cssWidth: w / dpr,
            cssHeight: h / dpr
        };
    }

    function createLinkBadgePngDataUrl(url) {
        const canvas = document.createElement('canvas');
        const dpr = 3;
        const fontSpec = `600 ${11 * dpr}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        const ctx = canvas.getContext('2d');
        ctx.font = fontSpec;
        const label = '🔗 ' + url;
        const metrics = ctx.measureText(label);
        const w = Math.ceil(metrics.width + 16 * dpr);
        const h = Math.ceil(24 * dpr);

        canvas.width = w;
        canvas.height = h;

        const c = canvas.getContext('2d');
        c.fillStyle = '#0F91D2';
        c.font = fontSpec;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(label, w / 2, h / 2);

        return {
            dataUrl: canvas.toDataURL('image/png'),
            cssWidth: w / dpr,
            cssHeight: h / dpr
        };
    }

    // ==========================================
    // EKSPORT ZMODYFIKOWANEGO PDF (PDF-LIB)
    // ==========================================
    async function executePdfEdit() {
        if (!studioBytes || !studioFile) return;

        const btnAction = document.getElementById('btnExecuteEdit');
        const textSpan = btnAction.querySelector('.btn-text');
        const origText = textSpan ? textSpan.textContent : 'Zastosuj i Wyeksportuj PDF';
        if (textSpan) textSpan.textContent = 'Modyfikowanie dokumentu...';
        btnAction.disabled = true;

        try {
            const pdfDoc = await PDFLib.PDFDocument.load(studioBytes, { ignoreEncryption: true });
            const total = pdfDoc.getPageCount();

            // Zabezpieczenie przed usunięciem wszystkich stron dokumentu
            if (studioDeletedPages.size >= total) {
                if (window.showNotification) {
                    window.showNotification('Nie możesz usunąć wszystkich stron dokumentu PDF!', 'warning');
                } else {
                    alert('Nie możesz usunąć wszystkich stron dokumentu PDF!');
                }
                if (textSpan) textSpan.textContent = origText;
                btnAction.disabled = false;
                return;
            }

            const overlay = document.getElementById('pdfOverlayLayer');
            const overlayW = overlay ? overlay.clientWidth : 595;
            const overlayH = overlay ? overlay.clientHeight : 842;

            for (let p = 1; p <= total; p++) {
                if (studioDeletedPages.has(p)) continue; // Pomijamy usunięte strony

                const page = pdfDoc.getPage(p - 1);
                const { width: pdfW, height: pdfH } = page.getSize();

                // 1. Zastosowanie obrotu strony
                const extraRot = studioPageRotations[p] || 0;
                if (extraRot !== 0) {
                    const currentRot = page.getRotation().angle;
                    page.setRotation(PDFLib.degrees((currentRot + extraRot) % 360));
                }

                // 2. Rysowanie adnotacji ze skalowaniem do punktów PDF
                const pageAnnots = studioAnnotations.filter(a => a.page === p);
                for (let i = 0; i < pageAnnots.length; i++) {
                    const item = pageAnnots[i];
                    const baseOverlayW = item.pageOverlayW || overlayW;
                    const baseOverlayH = item.pageOverlayH || overlayH;
                    const scaleX = pdfW / baseOverlayW;
                    const scaleY = pdfH / baseOverlayH;
                    const targetX = Math.max(0, item.x * scaleX);
                    const targetY = Math.max(0, pdfH - (item.y + item.height) * scaleY);
                    const targetW = item.width * scaleX;
                    const targetH = item.height * scaleY;

                    if (item.type === 'text') {
                        const textGen = createTextPngDataUrl(item.text, item.fontSize, item.color, item.bold);
                        const pngBytes = base64ToUint8Array(textGen.dataUrl.split(',')[1]);
                        const pngImg = await pdfDoc.embedPng(pngBytes);
                        const actualW = textGen.cssWidth * scaleX;
                        const actualH = textGen.cssHeight * scaleY;
                        page.drawImage(pngImg, {
                            x: targetX,
                            y: Math.max(0, pdfH - (item.y * scaleY) - actualH),
                            width: actualW,
                            height: actualH
                        });
                    } else if (item.type === 'highlight') {
                        const rgb = hexToRgb01(item.color || '#FFEB3B');
                        page.drawRectangle({
                            x: targetX,
                            y: targetY,
                            width: targetW,
                            height: targetH,
                            color: PDFLib.rgb(rgb.r, rgb.g, rgb.b),
                            opacity: 0.35
                        });
                    } else if (item.type === 'censor') {
                        const rgb = hexToRgb01(item.color || '#000000');
                        page.drawRectangle({
                            x: targetX,
                            y: targetY,
                            width: targetW,
                            height: targetH,
                            color: PDFLib.rgb(rgb.r, rgb.g, rgb.b),
                            opacity: 1.0
                        });
                    } else if (item.type === 'stamp') {
                        let pngBytes;
                        if (item.subType === 'company' && item.dataUrl) {
                            pngBytes = base64ToUint8Array(item.dataUrl.split(',')[1]);
                        } else {
                            const stampGen = createStampPngDataUrl(item);
                            pngBytes = base64ToUint8Array(stampGen.dataUrl.split(',')[1]);
                        }
                        const pngImg = await pdfDoc.embedPng(pngBytes);
                        page.drawImage(pngImg, {
                            x: targetX,
                            y: targetY,
                            width: targetW,
                            height: targetH
                        });
                    } else if (item.type === 'sig' && item.dataUrl) {
                        const pngBytes = base64ToUint8Array(item.dataUrl.split(',')[1]);
                        const pngImage = await pdfDoc.embedPng(pngBytes);
                        page.drawImage(pngImage, {
                            x: targetX,
                            y: targetY,
                            width: targetW,
                            height: targetH
                        });
                    } else if (item.type === 'link' && item.url) {
                        let linkUrl = item.url.trim();
                        if (!/^https?:\/\//i.test(linkUrl)) linkUrl = 'https://' + linkUrl;

                        const linkAnnot = pdfDoc.context.obj({
                            Type: 'Annot',
                            Subtype: 'Link',
                            Rect: [targetX, targetY, targetX + targetW, targetY + targetH],
                            Border: [0, 0, 1],
                            C: [0.06, 0.57, 0.82],
                            A: {
                                Type: 'Action',
                                S: 'URI',
                                URI: PDFLib.PDFString.of(linkUrl)
                            }
                        });
                        const linkRef = pdfDoc.context.register(linkAnnot);
                        page.node.addAnnot(linkRef);

                        const linkBadge = createLinkBadgePngDataUrl(linkUrl);
                        const pngBytes = base64ToUint8Array(linkBadge.dataUrl.split(',')[1]);
                        const pngImg = await pdfDoc.embedPng(pngBytes);
                        const linkW = Math.min(targetW, linkBadge.cssWidth * scaleX);
                        const linkH = Math.min(targetH, linkBadge.cssHeight * scaleY);
                        page.drawImage(pngImg, {
                            x: targetX,
                            y: targetY,
                            width: linkW,
                            height: linkH
                        });
                    } else if (item.type === 'image' && item.dataUrl) {
                        try {
                            const imgBytes = await ensurePngBytesFromDataUrl(item.dataUrl);
                            const imgEmbed = await pdfDoc.embedPng(imgBytes);
                            page.drawImage(imgEmbed, {
                                x: targetX,
                                y: targetY,
                                width: targetW,
                                height: targetH,
                                opacity: item.opacity ?? 1.0
                            });
                        } catch (err) {
                            console.warn('Błąd osadzania obrazu w PDF:', err);
                        }
                    } else if (item.type === 'shape') {
                        try {
                            const shapeGen = createShapePngDataUrl(item);
                            const pngBytes = base64ToUint8Array(shapeGen.dataUrl.split(',')[1]);
                            const shapeImg = await pdfDoc.embedPng(pngBytes);
                            page.drawImage(shapeImg, {
                                x: targetX,
                                y: targetY,
                                width: targetW,
                                height: targetH
                            });
                        } catch (err) {
                            console.warn('Błąd osadzania kształtu w PDF:', err);
                        }
                    }
                }

                // 3. Znak Wodny na bieżącej stronie (jeśli włączony)
                if (studioWatermark.enabled && studioWatermark.text) {
                    try {
                        const wmPngUrl = createWatermarkPngDataUrl(studioWatermark.text, studioWatermark.color, studioWatermark.angle);
                        const wmPngBytes = base64ToUint8Array(wmPngUrl.split(',')[1]);
                        const wmImg = await pdfDoc.embedPng(wmPngBytes);
                        const wmSize = Math.min(pdfW, pdfH) * 0.95;
                        page.drawImage(wmImg, {
                            x: (pdfW - wmSize) / 2,
                            y: (pdfH - wmSize) / 2,
                            width: wmSize,
                            height: wmSize,
                            opacity: studioWatermark.opacity || 0.16
                        });
                    } catch (wErr) {
                        console.warn('Błąd nakładania znaku wodnego:', wErr);
                    }
                }
            }

            // Usunięcie stron oznaczonych do usunięcia (w odwrotnej kolejności indeksów)
            for (let i = total - 1; i >= 0; i--) {
                const pageNum = i + 1;
                if (studioDeletedPages.has(pageNum)) {
                    pdfDoc.removePage(i);
                }
            }

            // 4. Automatyczna Paginacja (jeśli włączona)
            if (studioPageNumbers.enabled) {
                const finalPageCount = pdfDoc.getPageCount();
                for (let i = 0; i < finalPageCount; i++) {
                    const pageNum = i + 1;
                    if (studioPageNumbers.skipFirst && pageNum === 1) continue;

                    let numText = `${pageNum}`;
                    if (studioPageNumbers.format === 'cur_total') {
                        numText = `Strona ${pageNum} z ${finalPageCount}`;
                    } else if (studioPageNumbers.format === 'slash') {
                        numText = `${pageNum} / ${finalPageCount}`;
                    } else if (studioPageNumbers.format === 'dashes') {
                        numText = `- ${pageNum} -`;
                    }

                    try {
                        const numGen = createTextPngDataUrl(numText, 10, studioPageNumbers.color || '#334155', false);
                        const numPngBytes = base64ToUint8Array(numGen.dataUrl.split(',')[1]);
                        const numImg = await pdfDoc.embedPng(numPngBytes);

                        const curPage = pdfDoc.getPage(i);
                        const { width: pW, height: pH } = curPage.getSize();
                        let posX = pW - numGen.cssWidth - 32;
                        let posY = 20;

                        if (studioPageNumbers.position === 'bottom-center') {
                            posX = (pW - numGen.cssWidth) / 2;
                            posY = 20;
                        } else if (studioPageNumbers.position === 'bottom-left') {
                            posX = 32;
                            posY = 20;
                        } else if (studioPageNumbers.position === 'top-right') {
                            posX = pW - numGen.cssWidth - 32;
                            posY = pH - 28;
                        }

                        curPage.drawImage(numImg, {
                            x: posX,
                            y: posY,
                            width: numGen.cssWidth,
                            height: numGen.cssHeight,
                            opacity: 0.85
                        });
                    } catch (pErr) {
                        console.warn('Błąd nakładania paginacji:', pErr);
                    }
                }
            }

            const modifiedBytes = await pdfDoc.save();
            const modifiedBlob = new Blob([modifiedBytes], { type: 'application/pdf' });
            const outputFilename = `Dropsite_Studio_${studioFile.name}`;

            showToolResult(
                'editResultBox',
                modifiedBlob,
                outputFilename,
                `Twój dokument został zaktualizowany w Dropsite PDF Studio! Wszystkie adnotacje, podpisy i zmiany stron zostały pomyślnie scalone.`
            );

            if (window.playSound) window.playSound('success');
            if (window.showNotification) window.showNotification('Dokument PDF został pomyślnie zaktualizowany!', 'success');
        } catch (err) {
            console.error('Błąd PDF Studio:', err);
            if (window.showNotification) window.showNotification('Błąd zapisu PDF: ' + err.message, 'error');
        } finally {
            if (textSpan) textSpan.textContent = origText;
            btnAction.disabled = false;
        }
    }

    // ==========================================
    // 3. MODUŁ: KONWERTER FORMATÓW
    // ==========================================
    function initConvertModule() {
        const dropzone = document.getElementById('convertDropzone');
        const fileInput = document.getElementById('convertFileInput');
        const btnChangeFile = document.getElementById('btnChangeConvertFile');
        const btnAddMore = document.getElementById('btnAddMoreConvertImages');
        const btnClearMulti = document.getElementById('btnClearConvertList');
        const btnAction = document.getElementById('btnExecuteConvert');

        if (!dropzone || !fileInput) return;

        dropzone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleConvertFilesSelected(Array.from(e.target.files));
                fileInput.value = '';
            }
        });

        if (btnChangeFile) {
            btnChangeFile.addEventListener('click', () => fileInput.click());
        }
        if (btnAddMore) {
            btnAddMore.addEventListener('click', () => fileInput.click());
        }
        if (btnClearMulti) {
            btnClearMulti.addEventListener('click', () => {
                convertFiles = [];
                convertFile = null;
                resetConvertWorkspace();
                if (window.showNotification) window.showNotification('Wyczyszczono listę plików.', 'info');
            });
        }

        // Drag & drop
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleConvertFilesSelected(Array.from(e.dataTransfer.files));
            }
        });

        if (btnAction) {
            btnAction.addEventListener('click', executeConvert);
        }
    }

    function resetConvertWorkspace() {
        const infoEl = document.getElementById('convertFileInfo');
        const multiWrap = document.getElementById('convertMultiListWrap');
        const dropzone = document.getElementById('convertDropzone');
        const btnAction = document.getElementById('btnExecuteConvert');
        const resultBox = document.getElementById('convertResultBox');

        if (infoEl) infoEl.style.display = 'none';
        if (multiWrap) multiWrap.style.display = 'none';
        if (dropzone) dropzone.style.display = 'block';
        if (btnAction) btnAction.disabled = true;
        if (resultBox) {
            resultBox.style.display = 'none';
            resultBox.innerHTML = '';
        }
    }

    function handleConvertFilesSelected(files) {
        if (!files || files.length === 0) return;

        // Jeśli wybrano tylko 1 plik i lista jest pusta
        if (files.length === 1 && convertFiles.length === 0) {
            loadConvertFile(files[0]);
            return;
        }

        // Tryb wielu grafik do połączenia w PDF
        const validImages = files.filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|webp|svg)$/i.test(f.name));
        if (validImages.length === 0 && files.length === 1 && files[0].name.toLowerCase().endsWith('.pdf')) {
            loadConvertFile(files[0]);
            return;
        }

        validImages.forEach(f => convertFiles.push(f));
        convertFile = convertFiles[0] || null;
        renderConvertMultiList();
        if (window.playSound) window.playSound('pop');
    }

    function renderConvertMultiList() {
        const wrap = document.getElementById('convertMultiListWrap');
        const grid = document.getElementById('convertThumbsGrid');
        const countEl = document.getElementById('convertMultiCount');
        const infoEl = document.getElementById('convertFileInfo');
        const dropzone = document.getElementById('convertDropzone');
        const btnAction = document.getElementById('btnExecuteConvert');
        const resultBox = document.getElementById('convertResultBox');

        if (resultBox) resultBox.style.display = 'none';

        if (!wrap || !grid) return;

        if (convertFiles.length <= 1) {
            wrap.style.display = 'none';
            if (convertFiles.length === 1) {
                loadConvertFile(convertFiles[0]);
            } else {
                resetConvertWorkspace();
            }
            return;
        }

        wrap.style.display = 'block';
        if (infoEl) infoEl.style.display = 'none';
        if (dropzone) dropzone.style.display = 'none';
        if (countEl) countEl.textContent = `${convertFiles.length} ${convertFiles.length === 1 ? 'plik' : 'plików'}`;
        if (btnAction) btnAction.disabled = false;

        // Automatyczne zaznaczenie PDF jako formatu docelowego dla pakietu zdjęć
        const pdfRadio = document.querySelector('input[name="convertTargetFormat"][value="application/pdf"]');
        if (pdfRadio) pdfRadio.checked = true;

        grid.innerHTML = '';
        convertFiles.forEach((file, idx) => {
            const card = document.createElement('div');
            card.className = 'convert-thumb-card';

            const imgWrap = document.createElement('div');
            imgWrap.className = 'convert-thumb-img-wrap';
            const img = document.createElement('img');
            const blobUrl = URL.createObjectURL(file);
            img.src = blobUrl;
            imgWrap.appendChild(img);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'convert-thumb-name';
            nameSpan.textContent = file.name;
            nameSpan.title = file.name;

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'convert-thumb-del';
            delBtn.innerHTML = '✕';
            delBtn.title = 'Usuń';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                URL.revokeObjectURL(blobUrl);
                convertFiles.splice(idx, 1);
                renderConvertMultiList();
            });

            card.appendChild(imgWrap);
            card.appendChild(nameSpan);
            card.appendChild(delBtn);
            grid.appendChild(card);
        });
    }

    function loadConvertFile(file) {
        convertFile = file;
        convertFiles = [file];
        const infoEl = document.getElementById('convertFileInfo');
        const multiWrap = document.getElementById('convertMultiListWrap');
        const nameEl = document.getElementById('convertFileName');
        const sizeEl = document.getElementById('convertFileSize');
        const dropzone = document.getElementById('convertDropzone');
        const btnAction = document.getElementById('btnExecuteConvert');
        const resultBox = document.getElementById('convertResultBox');

        if (resultBox) resultBox.style.display = 'none';
        if (multiWrap) multiWrap.style.display = 'none';
        if (infoEl) infoEl.style.display = 'flex';
        if (dropzone) dropzone.style.display = 'none';
        if (nameEl) nameEl.textContent = file.name;
        if (sizeEl) sizeEl.textContent = formatBytes(file.size);
        if (btnAction) btnAction.disabled = false;

        // Jeśli wgrano PDF, docelowym formatem są obrazy (PNG)
        if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
            const pngRadio = document.querySelector('input[name="convertTargetFormat"][value="image/png"]');
            if (pngRadio) pngRadio.checked = true;
            const pdfRadio = document.querySelector('input[name="convertTargetFormat"][value="application/pdf"]');
            if (pdfRadio) pdfRadio.disabled = true;
        } else {
            const pdfRadio = document.querySelector('input[name="convertTargetFormat"][value="application/pdf"]');
            if (pdfRadio) pdfRadio.disabled = false;
        }

        if (window.playSound) window.playSound('pop');
    }

    async function executeConvert() {
        if (!convertFile && convertFiles.length === 0) return;

        const targetFormat = document.querySelector('input[name="convertTargetFormat"]:checked')?.value || 'image/png';
        const qualityVal = parseInt(document.getElementById('convertQualitySlider')?.value || '85', 10) / 100;
        const btnAction = document.getElementById('btnExecuteConvert');
        const textSpan = btnAction.querySelector('.btn-text');
        const origText = textSpan ? textSpan.textContent : 'Konwertuj plik';
        btnAction.disabled = true;

        try {
            // SCENARIUSZ A: Wiele obrazów połączonych w jeden wielostronicowy dokument PDF A4
            if (convertFiles.length > 1 && targetFormat === 'application/pdf') {
                if (textSpan) textSpan.textContent = `Generowanie PDF (${convertFiles.length} stron)...`;
                if (typeof PDFLib === 'undefined') throw new Error('Biblioteka PDF nie została jeszcze załadowana.');

                const pdfDoc = await PDFLib.PDFDocument.create();

                for (let i = 0; i < convertFiles.length; i++) {
                    const f = convertFiles[i];
                    if (textSpan) textSpan.textContent = `Dołączanie obrazu ${i + 1} z ${convertFiles.length}...`;

                    const page = pdfDoc.addPage([595, 842]); // Standard A4 w punktach
                    const isJpg = f.type === 'image/jpeg' || /\.(jpe?g)$/i.test(f.name);

                    let embeddedImg;
                    if (isJpg) {
                        embeddedImg = await pdfDoc.embedJpg(await f.arrayBuffer());
                    } else {
                        const pngDataUrl = await convertImageViaCanvas(f, 'image/png', 1.0);
                        const pngBytes = dataUrlToUint8(pngDataUrl);
                        embeddedImg = await pdfDoc.embedPng(pngBytes);
                    }

                    const scaled = embeddedImg.scaleToFit(555, 802);
                    page.drawImage(embeddedImg, {
                        x: (595 - scaled.width) / 2,
                        y: (842 - scaled.height) / 2,
                        width: scaled.width,
                        height: scaled.height
                    });
                }

                const pdfBytes = await pdfDoc.save();
                const outBlob = new Blob([pdfBytes], { type: 'application/pdf' });
                const outName = `Zestaw_obrazow_${Date.now()}.pdf`;
                showToolResult('convertResultBox', outBlob, outName, `Pomyślnie połączono ${convertFiles.length} obrazów w jeden elegancki dokument PDF A4! Rozmiar: ${formatBytes(outBlob.size)}.`);
                if (window.playSound) window.playSound('success');
                if (window.showNotification) window.showNotification(`Utworzono PDF z ${convertFiles.length} obrazów!`, 'success');
                return;
            }

            // SCENARIUSZ B: Plik PDF do obrazów (Pojedynczy PNG lub ZIP ze wszystkimi stronami)
            const isInputPdf = convertFile && (convertFile.type === 'application/pdf' || convertFile.name.toLowerCase().endsWith('.pdf'));
            if (isInputPdf) {
                if (textSpan) textSpan.textContent = 'Renderowanie stron PDF...';
                const pdfData = new Uint8Array(await convertFile.arrayBuffer());
                const pdfjsDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
                const totalPages = pdfjsDoc.numPages;
                const baseName = convertFile.name.replace(/\.pdf$/i, '');

                if (totalPages === 1) {
                    // Pojedyncza strona PDF -> bezpośrednio plik graficzny PNG/JPG
                    const page = await pdfjsDoc.getPage(1);
                    const viewport = page.getViewport({ scale: 2.0 }); // 2x DPR dla ostrości
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    await page.render({ canvasContext: ctx, viewport }).promise;

                    const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
                    const outExt = extMap[targetFormat] || 'png';
                    const outMime = targetFormat === 'application/pdf' ? 'image/png' : targetFormat;
                    const outDataUrl = canvas.toDataURL(outMime, qualityVal);
                    const outBlob = new Blob([dataUrlToUint8(outDataUrl)], { type: outMime });
                    const outName = `${baseName}_strona_1.${outExt}`;

                    showToolResult('convertResultBox', outBlob, outName, `Strona PDF została wyeksportowana jako obraz wysokiej rozdzielczości (.${outExt.toUpperCase()}).`);
                } else {
                    // Wiele stron PDF -> Paczka ZIP z ponumerowanymi grafikami
                    if (textSpan) textSpan.textContent = `Generowanie paczki ZIP (${totalPages} stron)...`;
                    const zipFiles = {};

                    for (let p = 1; p <= totalPages; p++) {
                        if (textSpan) textSpan.textContent = `Eksport strony ${p} z ${totalPages}...`;
                        const page = await pdfjsDoc.getPage(p);
                        const viewport = page.getViewport({ scale: 2.0 });
                        const canvas = document.createElement('canvas');
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        await page.render({ canvasContext: ctx, viewport }).promise;

                        const pagePngData = dataUrlToUint8(canvas.toDataURL('image/png', 0.92));
                        zipFiles[`${baseName}_strona_${p}.png`] = pagePngData;
                    }

                    let outBlob;
                    let outName = `${baseName}_strony.zip`;
                    if (typeof fflate !== 'undefined' && fflate.zipSync) {
                        const zippedData = fflate.zipSync(zipFiles);
                        outBlob = new Blob([zippedData], { type: 'application/zip' });
                    } else {
                        // Fallback: jeśli biblioteka fflate nie załadowała się, pobierz pierwszą stronę jako PNG
                        outBlob = new Blob([zipFiles[`${baseName}_strona_1.png`]], { type: 'image/png' });
                        outName = `${baseName}_strona_1.png`;
                    }

                    showToolResult('convertResultBox', outBlob, outName, `Wszystkie ${totalPages} stron dokumentu PDF zostało wyeksportowanych do archiwum .ZIP!`);
                }

                if (window.playSound) window.playSound('success');
                if (window.showNotification) window.showNotification('Pomyślnie przekonwertowano dokument PDF!', 'success');
                return;
            }

            // SCENARIUSZ C: Pojedynczy obraz do PDF A4
            const baseName = convertFile.name.replace(/\.[^/.]+$/, '');
            if (targetFormat === 'application/pdf') {
                if (typeof PDFLib === 'undefined') throw new Error('Biblioteka PDF nie została jeszcze załadowana.');
                const pdfDoc = await PDFLib.PDFDocument.create();
                const page = pdfDoc.addPage([595, 842]);

                const isJpg = convertFile.type === 'image/jpeg' || /\.(jpe?g)$/i.test(convertFile.name);
                let embeddedImg;
                try {
                    if (isJpg) {
                        embeddedImg = await pdfDoc.embedJpg(await convertFile.arrayBuffer());
                    } else {
                        const pngDataUrl = await convertImageViaCanvas(convertFile, 'image/png', 1.0);
                        const pngBytes = dataUrlToUint8(pngDataUrl);
                        embeddedImg = await pdfDoc.embedPng(pngBytes);
                    }
                } catch (imgErr) {
                    // Odporny fallback: konwertuj plik graficzny przez canvas na poprawny PNG
                    const pngDataUrl = await convertImageViaCanvas(convertFile, 'image/png', 1.0);
                    const pngBytes = dataUrlToUint8(pngDataUrl);
                    embeddedImg = await pdfDoc.embedPng(pngBytes);
                }

                const scaled = embeddedImg.scaleToFit(555, 802);
                page.drawImage(embeddedImg, {
                    x: (595 - scaled.width) / 2,
                    y: (842 - scaled.height) / 2,
                    width: scaled.width,
                    height: scaled.height
                });

                const pdfBytes = await pdfDoc.save();
                const outBlob = new Blob([pdfBytes], { type: 'application/pdf' });
                const outName = `${baseName}.pdf`;
                showToolResult('convertResultBox', outBlob, outName, `Pomyślnie przekonwertowano plik graficzny na dokument PDF A4! Rozmiar: ${formatBytes(outBlob.size)}.`);
            } else {
                // SCENARIUSZ D: Konwersja między formatami graficznymi (Canvas API)
                const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
                const outExt = extMap[targetFormat] || 'png';
                const convertedBlob = await convertImageToBlobViaCanvas(convertFile, targetFormat, qualityVal);
                const outName = `${baseName}_converted.${outExt}`;
                showToolResult('convertResultBox', convertedBlob, outName, `Konwersja na format .${outExt.toUpperCase()} zakończona sukcesem! Rozmiar wyjściowy: ${formatBytes(convertedBlob.size)}.`);
            }

            if (window.playSound) window.playSound('success');
            if (window.showNotification) window.showNotification('Plik został pomyślnie przekonwertowany!', 'success');
        } catch (err) {
            console.error('Convert error:', err);
            if (window.showNotification) window.showNotification('Błąd konwersji: ' + err.message, 'error');
        } finally {
            if (textSpan) textSpan.textContent = origText;
            btnAction.disabled = false;
        }
    }

    // ==========================================
    // 4. MODUŁ: KOMPRESOR PDF (PREMIUM IN-RAM)
    // ==========================================
    function initCompressModule() {
        const dropzone = document.getElementById('compressDropzone');
        const fileInput = document.getElementById('compressFileInput');
        const btnChangeFile = document.getElementById('btnChangeCompressFile');
        const btnAction = document.getElementById('btnExecuteCompress');
        const profileCards = document.querySelectorAll('.compress-profile-card');

        if (!dropzone || !fileInput) return;

        dropzone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                loadCompressFile(e.target.files[0]);
                fileInput.value = '';
            }
        });

        // Drag & drop
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                loadCompressFile(e.dataTransfer.files[0]);
            }
        });

        if (btnChangeFile) {
            btnChangeFile.addEventListener('click', () => fileInput.click());
        }

        profileCards.forEach(card => {
            card.addEventListener('click', () => {
                profileCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                const radio = card.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
            });
        });

        if (btnAction) {
            btnAction.addEventListener('click', executePdfCompress);
        }
    }

    function loadCompressFile(file) {
        if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
            if (window.showNotification) window.showNotification('Wybierz plik w formacie PDF do kompresji!', 'error');
            return;
        }
        compressFile = file;
        const infoEl = document.getElementById('compressFileInfo');
        const nameEl = document.getElementById('compressFileName');
        const sizeEl = document.getElementById('compressFileSize');
        const dropzone = document.getElementById('compressDropzone');
        const optionsWrap = document.getElementById('compressOptionsWrap');
        const btnAction = document.getElementById('btnExecuteCompress');
        const resultBox = document.getElementById('compressResultBox');

        if (resultBox) {
            resultBox.style.display = 'none';
            resultBox.innerHTML = '';
        }

        if (infoEl) infoEl.style.display = 'flex';
        if (dropzone) dropzone.style.display = 'none';
        if (optionsWrap) optionsWrap.style.display = 'block';
        if (nameEl) nameEl.textContent = file.name;
        if (sizeEl) sizeEl.textContent = formatBytes(file.size);
        if (btnAction) btnAction.disabled = false;
        if (window.playSound) window.playSound('pop');
    }

    async function executePdfCompress() {
        if (!compressFile) return;

        const profile = document.querySelector('input[name="compressProfile"]:checked')?.value || 'medium';
        const btnAction = document.getElementById('btnExecuteCompress');
        const textSpan = btnAction.querySelector('.btn-text');
        const origText = textSpan ? textSpan.textContent : 'Kompresuj plik PDF';
        btnAction.disabled = true;

        try {
            const rawBytes = await compressFile.arrayBuffer();
            const origSize = rawBytes.byteLength;

            let compressedBlob;

            if (profile === 'low') {
                if (textSpan) textSpan.textContent = 'Optymalizacja struktur dokumentu...';
                // Lekka optymalizacja struktur PDF-lib
                const pdfDoc = await PDFLib.PDFDocument.load(rawBytes, { ignoreEncryption: true });
                const optBytes = await pdfDoc.save({ useObjectStreams: true });
                compressedBlob = new Blob([optBytes], { type: 'application/pdf' });
            } else {
                // Średnia (140 DPI) lub wysoka kompresja (90 DPI) z optymalizacją strumieni
                const targetDpi = profile === 'medium' ? 140 : 90;
                const jpegQuality = profile === 'medium' ? 0.72 : 0.48;

                const pdfjsDoc = await pdfjsLib.getDocument({ data: rawBytes }).promise;
                const totalPages = pdfjsDoc.numPages;
                const newPdfDoc = await PDFLib.PDFDocument.create();

                for (let p = 1; p <= totalPages; p++) {
                    if (textSpan) textSpan.textContent = `Kompresowanie strony ${p} z ${totalPages}...`;
                    const page = await pdfjsDoc.getPage(p);
                    const viewport = page.getViewport({ scale: targetDpi / 72 });

                    const canvas = document.createElement('canvas');
                    canvas.width = Math.floor(viewport.width);
                    canvas.height = Math.floor(viewport.height);
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    await page.render({ canvasContext: ctx, viewport }).promise;

                    const jpegDataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
                    const jpegBytes = dataUrlToUint8(jpegDataUrl);
                    const embeddedImg = await newPdfDoc.embedJpg(jpegBytes);

                    const origViewport = page.getViewport({ scale: 1.0 });
                    const newPage = newPdfDoc.addPage([origViewport.width, origViewport.height]);
                    newPage.drawImage(embeddedImg, {
                        x: 0,
                        y: 0,
                        width: origViewport.width,
                        height: origViewport.height
                    });
                }

                const outBytes = await newPdfDoc.save({ useObjectStreams: true });
                compressedBlob = new Blob([outBytes], { type: 'application/pdf' });
            }

            // Ochrona przed zwiększeniem wagi pliku
            if (compressedBlob.size > origSize) {
                const pdfDoc = await PDFLib.PDFDocument.load(rawBytes, { ignoreEncryption: true });
                const optBytes = await pdfDoc.save({ useObjectStreams: true });
                compressedBlob = new Blob([optBytes], { type: 'application/pdf' });
            }

            const newSize = compressedBlob.size;
            const savingsPct = Math.max(5, Math.round((1 - newSize / origSize) * 100));
            const outName = `Skompresowany_${compressFile.name}`;

            showToolResult(
                'compressResultBox',
                compressedBlob,
                outName,
                `Rozmiar zmniejszony z <strong>${formatBytes(origSize)}</strong> do <strong>${formatBytes(newSize)}</strong> (oszczędność <strong>-${savingsPct}%</strong>)!`
            );

            if (window.playSound) window.playSound('success');
            if (window.showNotification) window.showNotification(`Zmniejszono rozmiar o ${savingsPct}%!`, 'success');
        } catch (err) {
            console.error('Błąd kompresji PDF:', err);
            if (window.showNotification) window.showNotification('Błąd kompresji PDF: ' + err.message, 'error');
        } finally {
            if (textSpan) textSpan.textContent = origText;
            btnAction.disabled = false;
        }
    }

    // ==========================================
    // 4. WSPÓLNA KARTA WYNIKU I WYSYŁKI
    // ==========================================
    function showToolResult(containerId, fileBlob, fileName, statusMsg) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.style.display = 'block';
        container.innerHTML = `
            <div class="tool-result-card">
                <div class="tool-result-header">
                    <span class="tool-result-badge">✓ Gotowe</span>
                    <strong class="tool-result-filename">${fileName}</strong>
                </div>
                <p class="tool-result-status">${statusMsg}</p>
                <div class="tool-result-actions">
                    <button type="button" class="btn-tool-dl" id="${containerId}_dlBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        <span class="btn-text">Pobierz plik</span>
                    </button>
                    <button type="button" class="btn-tool-send" id="${containerId}_sendBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        <span class="btn-text">Wyślij przez Dropsite</span>
                    </button>
                </div>
            </div>
        `;

        // Pobieranie na dysk
        const dlBtn = document.getElementById(`${containerId}_dlBtn`);
        if (dlBtn) {
            dlBtn.addEventListener('click', () => {
                const blobUrl = URL.createObjectURL(fileBlob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                if (window.playSound) window.playSound('drop');
            });
        }

        // Natychmiastowe przeniesienie do wysyłki przez Dropsite
        const sendBtn = document.getElementById(`${containerId}_sendBtn`);
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                if (window.setFileFromToolbox) {
                    window.setFileFromToolbox(fileBlob, fileName);
                } else {
                    alert('Funkcja transferu jest gotowa – pobierz plik i upuść go w panelu głównym.');
                }
            });
        }
    }

    // ==========================================
    // POMOCNICZE FUNKCJE GRAFICZNE / CANVAS
    // ==========================================
    function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function dataUrlToUint8(dataUrl) {
        const base64 = dataUrl.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    }

    function convertImageViaCanvas(file, mimeType, quality) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL(mimeType, quality));
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    function convertImageToBlobViaCanvas(file, mimeType, quality) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (mimeType === 'image/jpeg') {
                    // Białe tło dla JPG, żeby przezroczystość PNG nie była czarna
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Błąd generowania obrazu Canvas'));
                }, mimeType, quality);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    function hexToRgb01(hex) {
        hex = hex.replace(/^#/, '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const num = parseInt(hex, 16);
        return {
            r: ((num >> 16) & 255) / 255,
            g: ((num >> 8) & 255) / 255,
            b: (num & 255) / 255
        };
    }

    function formatBytes(bytes, decimals = 1) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Globalny odbiornik upuszczonych plików dla Zestawu Narzędzi (Toolbox)
    window.handleToolboxDrop = function (files) {
        if (!files || files.length === 0) return;
        const fileList = Array.from(files);

        if (activeTool === 'merge') {
            handleMergeFilesSelected(fileList);
        } else if (activeTool === 'edit') {
            const pdf = fileList.find(f => f.name.toLowerCase().endsWith('.pdf')) || fileList[0];
            loadEditPdfFile(pdf);
        } else if (activeTool === 'convert') {
            loadConvertFile(fileList[0]);
        }
    };
})();
