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
    // 2. MODUŁ: DROPSITE PDF STUDIO (ZAAWANSOWANY EDYTOR)
    // ==========================================
    let studioFile = null;
    let studioBytes = null;
    let studioPdfJsDoc = null;
    let studioTotalPages = 1;
    let studioCurrentPage = 1;
    let studioPageRotations = {}; // { [pageNum]: 0 | 90 | 180 | 270 }
    let studioDeletedPages = new Set();
    let studioAnnotations = []; // { id, page, type, x, y, width, height, text, fontSize, color, bold, dataUrl, url, label }
    let studioActiveTool = 'text'; // 'text' | 'sig' | 'highlight' | 'censor' | 'stamp' | 'link'
    let studioSelectedId = null;
    let studioNextId = 1;

    // Inicjalizacja PDF.js workera
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/pdf.worker.min.js';
    }

    function initEditModule() {
        const dropzone = document.getElementById('editDropzone');
        const fileInput = document.getElementById('editFileInput');
        const btnChangeFile = document.getElementById('btnEditChangeFile');
        const btnPrevPage = document.getElementById('btnEditPrevPage');
        const btnNextPage = document.getElementById('btnEditNextPage');
        const btnRotateLeft = document.getElementById('btnEditRotateLeft');
        const btnRotateRight = document.getElementById('btnEditRotateRight');
        const btnDeletePage = document.getElementById('btnEditDeletePage');
        const btnAction = document.getElementById('btnExecuteEdit');
        const overlayLayer = document.getElementById('pdfOverlayLayer');

        if (!dropzone || !fileInput) return;

        // Wybór pliku
        dropzone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                loadEditPdfFile(e.target.files[0]);
                fileInput.value = '';
            }
        });
        if (btnChangeFile) {
            btnChangeFile.addEventListener('click', () => fileInput.click());
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
                studioActiveTool = tool;
                ribbonBtns.forEach(b => b.classList.toggle('active', b === btn));
                updateStudioPropertyBar();
            });
        });

        // Nawigacja stron
        if (btnPrevPage) {
            btnPrevPage.addEventListener('click', () => {
                if (studioCurrentPage > 1) {
                    studioCurrentPage--;
                    renderCurrentPdfPage();
                }
            });
        }
        if (btnNextPage) {
            btnNextPage.addEventListener('click', () => {
                if (studioCurrentPage < studioTotalPages) {
                    studioCurrentPage++;
                    renderCurrentPdfPage();
                }
            });
        }

        // Obracanie stron
        if (btnRotateLeft) {
            btnRotateLeft.addEventListener('click', () => {
                const cur = studioPageRotations[studioCurrentPage] || 0;
                studioPageRotations[studioCurrentPage] = (cur + 270) % 360;
                renderCurrentPdfPage();
                if (window.playSound) window.playSound('pop');
            });
        }
        if (btnRotateRight) {
            btnRotateRight.addEventListener('click', () => {
                const cur = studioPageRotations[studioCurrentPage] || 0;
                studioPageRotations[studioCurrentPage] = (cur + 90) % 360;
                renderCurrentPdfPage();
                if (window.playSound) window.playSound('pop');
            });
        }

        // Usuwanie / przywracanie strony
        if (btnDeletePage) {
            btnDeletePage.addEventListener('click', () => {
                if (studioDeletedPages.has(studioCurrentPage)) {
                    studioDeletedPages.delete(studioCurrentPage);
                    if (window.showNotification) window.showNotification(`Przywrócono stronę ${studioCurrentPage}`, 'info');
                } else {
                    if (studioDeletedPages.size >= studioTotalPages - 1) {
                        if (window.showNotification) window.showNotification('Nie możesz usunąć wszystkich stron dokumentu!', 'error');
                        return;
                    }
                    studioDeletedPages.add(studioCurrentPage);
                    if (window.showNotification) window.showNotification(`Strona ${studioCurrentPage} zostanie usunięta przy eksporcie`, 'info');
                }
                renderCurrentPdfPage();
            });
        }

        // Kliknięcie na arkuszu – wstawianie elementu w miejscu kliknięcia
        if (overlayLayer) {
            overlayLayer.addEventListener('click', (e) => {
                if (e.target.closest('.pdf-item-wrap')) return; // kliknięto w istniejący element

                const rect = overlayLayer.getBoundingClientRect();
                const clickX = Math.max(10, Math.min(rect.width - 60, e.clientX - rect.left));
                const clickY = Math.max(10, Math.min(rect.height - 30, e.clientY - rect.top));

                addNewAnnotationAt(studioActiveTool, clickX, clickY);
            });
        }

        // Modal podpisu odręcznego
        initSignatureModal();

        // Przycisk eksportu
        if (btnAction) {
            btnAction.addEventListener('click', executePdfEdit);
        }
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

            // Obliczenie skali, aby dopasować arkusz do kontenera roboczego (maksymalnie 680px)
            const availableWidth = Math.max(300, (stage ? stage.clientWidth - 50 : 640));
            const unscaledViewport = page.getViewport({ scale: 1.0, rotation: totalRotation });
            const fitScale = Math.min(1.5, availableWidth / unscaledViewport.width);
            const viewport = page.getViewport({ scale: fitScale, rotation: totalRotation });

            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.floor(viewport.width * dpr);
            canvas.height = Math.floor(viewport.height * dpr);
            canvas.style.width = `${Math.floor(viewport.width)}px`;
            canvas.style.height = `${Math.floor(viewport.height)}px`;

            overlayLayer.style.width = `${Math.floor(viewport.width)}px`;
            overlayLayer.style.height = `${Math.floor(viewport.height)}px`;

            const ctx = canvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            await page.render(renderContext).promise;

            // Narysuj nałożone adnotacje dla bieżącej strony
            renderPageAnnotations();
        } catch (err) {
            console.error('Błąd renderowania strony:', err);
        }
    }

    function addNewAnnotationAt(type, x, y) {
        const id = 'ann_' + (studioNextId++);
        let annot = null;

        if (type === 'text') {
            annot = {
                id,
                page: studioCurrentPage,
                type: 'text',
                x,
                y,
                text: 'Nowy tekst...',
                fontSize: 16,
                color: '#FF4439',
                bold: true,
                width: 140,
                height: 30
            };
        } else if (type === 'highlight') {
            annot = {
                id,
                page: studioCurrentPage,
                type: 'highlight',
                x,
                y,
                color: '#FFEB3B',
                width: 130,
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
            annot = {
                id,
                page: studioCurrentPage,
                type: 'stamp',
                x,
                y,
                label: 'ZATWIERDZONO',
                color: '#FF4439',
                width: 160,
                height: 40
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
            studioAnnotations.push(annot);
            studioSelectedId = id;
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

            // Przycisk usuwania
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
                wrap.appendChild(textEl);
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
                const st = document.createElement('div');
                st.className = 'pdf-item-stamp';
                st.style.width = '100%';
                st.style.height = '100%';
                st.style.borderColor = item.color || '#FF4439';
                st.style.color = item.color || '#FF4439';
                st.textContent = item.label || 'ZATWIERDZONO';
                wrap.appendChild(st);
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
    }

    function attachDragHandlers(el, item) {
        let isDragging = false;
        let startPointerX = 0;
        let startPointerY = 0;
        let initialX = 0;
        let initialY = 0;

        el.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.pdf-item-del-btn')) return;
            e.stopPropagation();

            studioSelectedId = item.id;
            updateSelectedUI();
            updateStudioPropertyBar();

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
        });

        el.addEventListener('pointerup', (e) => {
            if (isDragging) {
                isDragging = false;
                try { el.releasePointerCapture(e.pointerId); } catch (_) {}
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
        renderPageAnnotations();
        updateStudioPropertyBar();
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
                            <option value="26" ${selectedItem.fontSize === 26 ? 'selected' : ''}>26 pt</option>
                            <option value="36" ${selectedItem.fontSize === 36 ? 'selected' : ''}>36 pt</option>
                        </select>
                    </div>
                    <div class="prop-group">
                        <span class="prop-label">Kolor:</span>
                        <div class="prop-colors">
                            <button type="button" class="prop-color-pill ${selectedItem.color === '#FF4439' ? 'active' : ''}" style="background: #FF4439;" data-c="#FF4439"></button>
                            <button type="button" class="prop-color-pill ${selectedItem.color === '#000000' ? 'active' : ''}" style="background: #000000;" data-c="#000000"></button>
                            <button type="button" class="prop-color-pill ${selectedItem.color === '#0F91D2' ? 'active' : ''}" style="background: #0F91D2;" data-c="#0F91D2"></button>
                            <button type="button" class="prop-color-pill ${selectedItem.color === '#10B981' ? 'active' : ''}" style="background: #10B981;" data-c="#10B981"></button>
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
            bar.innerHTML = `<span class="prop-label">✍️ Kliknij w dowolnym miejscu dokumentu, aby wstawić napis. Możesz go potem swobodnie przesuwać!</span>`;
        } else if (studioActiveTool === 'highlight') {
            bar.innerHTML = `<span class="prop-label">🖍️ Kliknij na dokumencie, aby umieścić pasek zakreślacza.</span>`;
        } else if (studioActiveTool === 'censor') {
            bar.innerHTML = `<span class="prop-label">⬛ Kliknij na dokumencie, aby trwale zakryć poufne dane (PESEL, kwotę, nazwisko).</span>`;
        } else if (studioActiveTool === 'stamp') {
            bar.innerHTML = `
                <span class="prop-label">Wybierz gotową pieczęć do wstawienia:</span>
                <button type="button" class="prop-btn-stamp" data-st="ZATWIERDZONO" style="border-color:#16A34A; color:#4ADE80;">✓ ZATWIERDZONO</button>
                <button type="button" class="prop-btn-stamp" data-st="OPŁACONO" style="border-color:#0284C7; color:#38BDF8;">💳 OPŁACONO</button>
                <button type="button" class="prop-btn-stamp" data-st="POUFNE" style="border-color:#DC2626; color:#F87171;">🔒 POUFNE</button>
                <button type="button" class="prop-btn-stamp" data-st="KOPIA" style="border-color:#D97706; color:#FBBF24;">📄 KOPIA</button>
            `;
            bar.querySelectorAll('.prop-btn-stamp').forEach(btn => {
                btn.addEventListener('click', () => {
                    const label = btn.getAttribute('data-st');
                    addNewAnnotationAt('stamp', 80, 80);
                    const last = studioAnnotations[studioAnnotations.length - 1];
                    if (last) last.label = label;
                    renderPageAnnotations();
                });
            });
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
            modal.style.display = 'none';
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
            modal.style.display = 'flex';
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
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
            const pdfDoc = await PDFLib.PDFDocument.load(studioBytes);
            const total = pdfDoc.getPageCount();

            // Fonty dla tekstu
            const fontBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
            const fontRegular = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

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

                // 2. Skalowanie współrzędnych ekranu do punktów PDF
                const scaleX = pdfW / overlayW;
                const scaleY = pdfH / overlayH;

                // 3. Rysowanie adnotacji
                const pageAnnots = studioAnnotations.filter(a => a.page === p);
                for (let i = 0; i < pageAnnots.length; i++) {
                    const item = pageAnnots[i];
                    const targetX = Math.max(0, item.x * scaleX);
                    const targetY = Math.max(0, pdfH - (item.y + item.height) * scaleY);
                    const targetW = item.width * scaleX;
                    const targetH = item.height * scaleY;

                    if (item.type === 'text') {
                        const rgb = hexToRgb01(item.color || '#FF4439');
                        page.drawText(item.text, {
                            x: targetX,
                            y: targetY + 2,
                            size: Math.max(8, item.fontSize * scaleY * 0.95),
                            font: item.bold ? fontBold : fontRegular,
                            color: PDFLib.rgb(rgb.r, rgb.g, rgb.b)
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
                        const rgb = hexToRgb01(item.color || '#FF4439');
                        page.drawRectangle({
                            x: targetX,
                            y: targetY,
                            width: targetW,
                            height: targetH,
                            borderColor: PDFLib.rgb(rgb.r, rgb.g, rgb.b),
                            borderWidth: 2,
                            color: PDFLib.rgb(rgb.r, rgb.g, rgb.b),
                            opacity: 0.08
                        });
                        page.drawText(item.label || 'ZATWIERDZONO', {
                            x: targetX + 12,
                            y: targetY + (targetH / 2) - 5,
                            size: 13 * scaleY,
                            font: fontBold,
                            color: PDFLib.rgb(rgb.r, rgb.g, rgb.b)
                        });
                    } else if (item.type === 'sig' && item.dataUrl) {
                        const pngBase64 = item.dataUrl.split(',')[1];
                        const pngBytes = Uint8Array.from(atob(pngBase64), c => c.charCodeAt(0));
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

                        page.drawText(linkUrl, {
                            x: targetX + 4,
                            y: targetY + 4,
                            size: 9 * scaleY,
                            font: fontRegular,
                            color: PDFLib.rgb(0.06, 0.57, 0.82)
                        });
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
