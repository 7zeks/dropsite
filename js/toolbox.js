/**
 * Dropsite Toolbox Engine (100% Client-Side in RAM)
 * - PDF Merger (pdf-lib)
 * - PDF Visual Editor: Text, Signature & Clickable Links (pdf-lib)
 * - Format Converter (Images & Image-to-PDF via Canvas & pdf-lib)
 */

(function () {
    // === STAN MODUŁU ===
    let activeTool = 'merge'; // 'merge' | 'edit' | 'convert'

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

    // === INICJALIZACJA ===
    document.addEventListener('DOMContentLoaded', () => {
        initToolTabs();
        initMergeModule();
        initEditModule();
        initConvertModule();
    });

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
        const resultBox = document.getElementById('mergeResultBox');

        if (resultBox) resultBox.style.display = 'none';

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
                const doc = await PDFLib.PDFDocument.load(arrayBuf);
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
    // 2. MODUŁ: EDYTOR PDF (TEKST, PODPIS & LINKI)
    // ==========================================
    function initEditModule() {
        const dropzone = document.getElementById('editDropzone');
        const fileInput = document.getElementById('editFileInput');
        const btnAction = document.getElementById('btnExecuteEdit');
        const pagePreview = document.getElementById('editPageVisualPreview');

        if (!dropzone || !fileInput) return;

        dropzone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                loadEditPdfFile(e.target.files[0]);
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
                loadEditPdfFile(e.dataTransfer.files[0]);
            }
        });

        // Przełączanie trybu Tekst vs Link
        const modeRadios = document.querySelectorAll('input[name="editModeChoice"]');
        modeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                editMode = radio.value;
                const textControls = document.getElementById('editTextControls');
                const linkControls = document.getElementById('editLinkControls');
                if (textControls) textControls.style.display = editMode === 'text' ? 'block' : 'none';
                if (linkControls) linkControls.style.display = editMode === 'link' ? 'block' : 'none';
                updateVisualPin();
            });
        });

        // Kliknięcie na podglądzie strony – ustalenie współrzędnych
        if (pagePreview) {
            pagePreview.addEventListener('click', (e) => {
                const rect = pagePreview.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;

                editClickPos.xPct = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
                editClickPos.yPct = Math.max(0, Math.min(100, (clickY / rect.height) * 100));

                updateVisualPin();
                if (window.playSound) window.playSound('pop');
            });
        }

        // Zmiana tekstu lub linku na bieżąco
        const textInput = document.getElementById('editTextInput');
        if (textInput) {
            textInput.addEventListener('input', updateVisualPin);
        }

        // Zmiana strony
        const prevPageBtn = document.getElementById('btnEditPrevPage');
        const nextPageBtn = document.getElementById('btnEditNextPage');
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => {
                if (editSelectedPage > 1) {
                    editSelectedPage--;
                    updatePageSelectorUI();
                }
            });
        }
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                if (editSelectedPage < editPageCount) {
                    editSelectedPage++;
                    updatePageSelectorUI();
                }
            });
        }

        if (btnAction) {
            btnAction.addEventListener('click', executePdfEdit);
        }
    }

    async function loadEditPdfFile(file) {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            if (window.showNotification) window.showNotification('Wybierz plik w formacie PDF!', 'error');
            return;
        }

        if (typeof PDFLib === 'undefined') {
            if (window.showNotification) window.showNotification('Biblioteka PDF ładuje się... Spróbuj za chwilę.', 'info');
            return;
        }

        try {
            editFile = file;
            const arrayBuf = await file.arrayBuffer();
            editPdfDoc = await PDFLib.PDFDocument.load(arrayBuf);
            editPageCount = editPdfDoc.getPageCount();
            editSelectedPage = 1;

            const firstPage = editPdfDoc.getPage(0);
            const { width, height } = firstPage.getSize();
            editPageDimensions = { width, height };

            // Pokaż obszar edytora
            const editorWorkspace = document.getElementById('editWorkspace');
            const dropzone = document.getElementById('editDropzone');
            const fileNameLabel = document.getElementById('editLoadedFileName');
            if (editorWorkspace) editorWorkspace.style.display = 'block';
            if (dropzone) dropzone.style.display = 'none';
            if (fileNameLabel) fileNameLabel.textContent = `${file.name} (${editPageCount} ${editPageCount === 1 ? 'strona' : 'stron'})`;

            updatePageSelectorUI();
            updateVisualPin();
            if (window.playSound) window.playSound('success');
        } catch (err) {
            console.error('PDF load error:', err);
            if (window.showNotification) window.showNotification('Nie udało się wczytać PDF: ' + err.message, 'error');
        }
    }

    function updatePageSelectorUI() {
        const label = document.getElementById('editPageNumberLabel');
        const prevBtn = document.getElementById('btnEditPrevPage');
        const nextBtn = document.getElementById('btnEditNextPage');

        if (label) label.textContent = `Strona ${editSelectedPage} z ${editPageCount}`;
        if (prevBtn) prevBtn.disabled = editSelectedPage <= 1;
        if (nextBtn) nextBtn.disabled = editSelectedPage >= editPageCount;
    }

    function updateVisualPin() {
        const pin = document.getElementById('editVisualPin');
        const pinText = document.getElementById('editVisualPinText');
        const textInput = document.getElementById('editTextInput');
        const linkInput = document.getElementById('editLinkUrlInput');

        if (!pin) return;

        pin.style.left = `${editClickPos.xPct}%`;
        pin.style.top = `${editClickPos.yPct}%`;

        if (editMode === 'text') {
            const val = textInput?.value.trim() || 'Kliknij i wpisz tekst';
            if (pinText) pinText.textContent = val;
            pin.className = 'edit-visual-pin pin-mode-text';
        } else {
            const val = linkInput?.value.trim() || 'https://twojastrona.pl';
            if (pinText) pinText.textContent = `🔗 ${val}`;
            pin.className = 'edit-visual-pin pin-mode-link';
        }
    }

    async function executePdfEdit() {
        if (!editPdfDoc || !editFile) return;

        const btnAction = document.getElementById('btnExecuteEdit');
        const textSpan = btnAction.querySelector('.btn-text');
        const origText = textSpan ? textSpan.textContent : 'Zastosuj i Wyeksportuj PDF';
        if (textSpan) textSpan.textContent = 'Modyfikowanie PDF...';
        btnAction.disabled = true;

        try {
            const pages = editPdfDoc.getPages();
            const targetPage = pages[editSelectedPage - 1];
            const { width, height } = targetPage.getSize();

            // Przeliczenie współrzędnych procentowych z podglądu na punkty PDF
            // Uwaga: w PDF oś Y rośnie od DOŁU do GÓRY!
            const pdfX = (editClickPos.xPct / 100) * width;
            const pdfY = (1 - (editClickPos.yPct / 100)) * height;

            if (editMode === 'text') {
                const textInput = document.getElementById('editTextInput');
                const textVal = textInput?.value.trim() || 'Zatwierdzono';
                const fontSize = parseInt(document.getElementById('editFontSizeSelect')?.value || '18', 10);
                const colorHex = document.querySelector('input[name="editTextColor"]:checked')?.value || '#FF4439';

                const font = await editPdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
                const colorRgb = hexToRgb01(colorHex);

                targetPage.drawText(textVal, {
                    x: Math.max(10, Math.min(width - 150, pdfX)),
                    y: Math.max(10, Math.min(height - 20, pdfY)),
                    size: fontSize,
                    font: font,
                    color: PDFLib.rgb(colorRgb.r, colorRgb.g, colorRgb.b)
                });
            } else {
                // Tryb Linku: dodanie klikalnej adnotacji URI
                const linkInput = document.getElementById('editLinkUrlInput');
                let targetUrl = linkInput?.value.trim() || 'https://dropsite.pages.dev';
                if (!/^https?:\/\//i.test(targetUrl)) targetUrl = 'https://' + targetUrl;

                const linkWidth = 140;
                const linkHeight = 24;

                const linkAnnot = editPdfDoc.context.obj({
                    Type: 'Annot',
                    Subtype: 'Link',
                    Rect: [pdfX, pdfY, pdfX + linkWidth, pdfY + linkHeight],
                    Border: [0, 0, 1], // ramka linku
                    C: [0, 0.4, 0.9], // kolor niebieski
                    A: {
                        Type: 'Action',
                        S: 'URI',
                        URI: PDFLib.PDFString.of(targetUrl)
                    }
                });

                const linkRef = editPdfDoc.context.register(linkAnnot);
                targetPage.node.addAnnot(linkRef);

                // Narysuj też tekst linku, żeby był widoczny wizualnie
                const font = await editPdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
                targetPage.drawText(targetUrl, {
                    x: pdfX + 2,
                    y: pdfY + 6,
                    size: 11,
                    font: font,
                    color: PDFLib.rgb(0, 0.4, 0.9)
                });
            }

            const modifiedBytes = await editPdfDoc.save();
            const modifiedBlob = new Blob([modifiedBytes], { type: 'application/pdf' });
            const outputFilename = `Dropsite_Edytowany_${editFile.name}`;

            showToolResult('editResultBox', modifiedBlob, outputFilename, `Pomyślnie dodano ${editMode === 'text' ? 'napis' : 'link'} na stronie ${editSelectedPage}! Dokument jest gotowy do pobrania lub wysyłki.`);
            if (window.playSound) window.playSound('success');
            if (window.showNotification) window.showNotification('PDF został pomyślnie zmodyfikowany!', 'success');
        } catch (err) {
            console.error('PDF Edit error:', err);
            if (window.showNotification) window.showNotification('Błąd edycji PDF: ' + err.message, 'error');
        } finally {
            if (textSpan) textSpan.textContent = origText;
            btnAction.disabled = false;
        }
    }

    // ==========================================
    // 3. MODUŁ: KONWERTER FORMATÓW (CONVERTER)
    // ==========================================
    function initConvertModule() {
        const dropzone = document.getElementById('convertDropzone');
        const fileInput = document.getElementById('convertFileInput');
        const btnAction = document.getElementById('btnExecuteConvert');

        if (!dropzone || !fileInput) return;

        dropzone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                loadConvertFile(e.target.files[0]);
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
                loadConvertFile(e.dataTransfer.files[0]);
            }
        });

        if (btnAction) {
            btnAction.addEventListener('click', executeConvert);
        }
    }

    function loadConvertFile(file) {
        convertFile = file;
        const infoEl = document.getElementById('convertFileInfo');
        const nameEl = document.getElementById('convertFileName');
        const sizeEl = document.getElementById('convertFileSize');
        const dropzone = document.getElementById('convertDropzone');
        const btnAction = document.getElementById('btnExecuteConvert');

        if (infoEl) infoEl.style.display = 'flex';
        if (dropzone) dropzone.style.display = 'none';
        if (nameEl) nameEl.textContent = file.name;
        if (sizeEl) sizeEl.textContent = formatBytes(file.size);
        if (btnAction) btnAction.disabled = false;
        if (window.playSound) window.playSound('pop');
    }

    async function executeConvert() {
        if (!convertFile) return;

        const targetFormat = document.querySelector('input[name="convertTargetFormat"]:checked')?.value || 'image/png';
        const qualityVal = parseInt(document.getElementById('convertQualitySlider')?.value || '85', 10) / 100;
        const btnAction = document.getElementById('btnExecuteConvert');
        const textSpan = btnAction.querySelector('.btn-text');
        const origText = textSpan ? textSpan.textContent : 'Konwertuj plik';
        if (textSpan) textSpan.textContent = 'Konwertowanie...';
        btnAction.disabled = true;

        try {
            const baseName = convertFile.name.replace(/\.[^/.]+$/, '');

            if (targetFormat === 'application/pdf') {
                // Konwersja obrazu na dokument PDF
                if (typeof PDFLib === 'undefined') throw new Error('Biblioteka PDF nie została jeszcze załadowana.');
                const pdfDoc = await PDFLib.PDFDocument.create();
                const page = pdfDoc.addPage([595, 842]); // A4

                const isJpg = convertFile.type === 'image/jpeg' || convertFile.name.toLowerCase().endsWith('.jpg') || convertFile.name.toLowerCase().endsWith('.jpeg');
                
                let embeddedImg;
                if (isJpg) {
                    embeddedImg = await pdfDoc.embedJpg(await convertFile.arrayBuffer());
                } else {
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
                // Konwersja między formatami graficznymi (Canvas API)
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
