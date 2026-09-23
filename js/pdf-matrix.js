/**
 * ============================================================================
 * DROPSITE PDF MATRIX — WIZUALNY ORGANIZATOR STRON, OBRÓT & SELEKCJA
 * ============================================================================
 * 100% Client-Side w pamięci RAM (PDF.js + PDF-Lib).
 * Wizualna siatka kafelków, zmiana kolejności Drag & Drop, obracanie o 90°,
 * usuwanie stron, duplikacja i natychmiastowy eksport do czystego pliku PDF.
 * ============================================================================
 */

(function () {
    'use strict';

    let state = {
        file: null,
        arrayBuffer: null,
        pdfJsDoc: null,
        pages: [] // { id, originalIndex, rotation: 0, deleted: false, canvas: null }
    };

    let draggedPageId = null;

    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function initMatrixModule() {
        const dropzone = document.getElementById('organizeDropzone');
        const fileInput = document.getElementById('organizeFileInput');
        const workspace = document.getElementById('organizeWorkspace');
        const btnChangeFile = document.getElementById('btnOrganizeChangeFile');
        const btnRotateAll = document.getElementById('btnOrganizeRotateAllRight');
        const btnReset = document.getElementById('btnOrganizeReset');
        const btnExport = document.getElementById('btnExportOrganizedPdf');

        if (!dropzone || !fileInput) return;

        // Kliknięcie dropzone otwiera okno wyboru pliku
        dropzone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                loadPdfFile(e.target.files[0]);
                fileInput.value = '';
            }
        });

        // Przeciąganie pliku nad dropzone
        ['dragenter', 'dragover'].forEach(name => {
            dropzone.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('drag-active');
            });
        });

        ['dragleave', 'drop'].forEach(name => {
            dropzone.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('drag-active');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files && dt.files.length > 0) {
                const file = dt.files[0];
                if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                    loadPdfFile(file);
                } else {
                    if (window.showNotification) {
                        window.showNotification('Wybierz plik z rozszerzeniem .pdf', 'warning');
                    }
                }
            }
        });

        // Zmiana pliku
        if (btnChangeFile) {
            btnChangeFile.addEventListener('click', () => {
                resetModule();
            });
        }

        // Obróć wszystkie w prawo (+90°)
        if (btnRotateAll) {
            btnRotateAll.addEventListener('click', () => {
                if (state.pages.length === 0) return;
                state.pages.forEach(p => {
                    if (!p.deleted) {
                        p.rotation = (p.rotation + 90) % 360;
                    }
                });
                renderCardsTransformOnly();
                updateExportSummary();
                if (typeof window.playSound === 'function') window.playSound('click');
            });
        }

        // Reset kolejności i obrotów
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if (!state.pdfJsDoc) return;
                state.pages = [];
                for (let i = 0; i < state.pdfJsDoc.numPages; i++) {
                    state.pages.push({
                        id: 'page_' + i + '_' + Date.now(),
                        originalIndex: i,
                        rotation: 0,
                        deleted: false,
                        thumbnailRendered: false
                    });
                }
                renderMatrixGrid();
                updateExportSummary();
                if (typeof window.playSound === 'function') window.playSound('click');
            });
        }

        // Eksport PDF
        if (btnExport) {
            btnExport.addEventListener('click', executeExport);
        }
    }

    async function loadPdfFile(file) {
        const dropzone = document.getElementById('organizeDropzone');
        const workspace = document.getElementById('organizeWorkspace');
        const fileNameEl = document.getElementById('organizeFileName');
        const pageCountEl = document.getElementById('organizePageCount');

        if (!file) return;

        if (typeof window.playSound === 'function') window.playSound('drop');
        if (window.showNotification) {
            window.showNotification('Wczytywanie dokumentu PDF do pamięci RAM...', 'info');
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            state.file = file;
            state.rawBytes = new Uint8Array(arrayBuffer.slice(0));

            // Upewnij się, że pdfjsLib jest załadowany
            if (typeof pdfjsLib === 'undefined' && typeof window.loadScript === 'function') {
                await window.loadScript('js/pdf.min.js');
            }

            if (typeof pdfjsLib === 'undefined') {
                throw new Error('Biblioteka PDF.js nie jest dostępna');
            }

            // Konfiguracja worker dla PDF.js
            if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/pdf.worker.min.js';
            }

            // Przekazujemy KLON bufora, aby Web Worker PDF.js nie odpiął bufora głównego wątku
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
            const doc = await loadingTask.promise;

            state.arrayBuffer = arrayBuffer;
            state.pdfJsDoc = doc;
            state.pages = [];

            for (let i = 0; i < doc.numPages; i++) {
                state.pages.push({
                    id: 'page_' + i + '_' + Date.now(),
                    originalIndex: i,
                    rotation: 0,
                    deleted: false,
                    thumbnailRendered: false
                });
            }

            if (fileNameEl) fileNameEl.textContent = file.name;
            if (pageCountEl) pageCountEl.textContent = `${doc.numPages} stron (${formatBytes(file.size)})`;

            if (dropzone) dropzone.style.display = 'none';
            if (workspace) workspace.style.display = 'flex';

            renderMatrixGrid();
            updateExportSummary();

            if (window.showNotification) {
                window.showNotification(`Załadowano ${doc.numPages} stron. Możesz przeciągać kafelki, obracać i usuwać strony!`, 'success');
            }

        } catch (err) {
            console.error('[PDF Matrix] Błąd ładowania PDF:', err);
            const isEncrypted = err && err.message && (err.message.toLowerCase().includes('encrypt') || err.message.toLowerCase().includes('password'));
            const userMsg = isEncrypted 
                ? 'Ten plik PDF jest zabezpieczony hasłem. Usuń hasło przed zmianą kolejności stron.'
                : ('Nie udało się otworzyć pliku PDF: ' + (err.message || 'Nieznany błąd'));
            if (window.showNotification) window.showNotification(userMsg, 'error');
        }
    }

    function resetModule() {
        const dropzone = document.getElementById('organizeDropzone');
        const workspace = document.getElementById('organizeWorkspace');
        const grid = document.getElementById('organizePagesGrid');

        state = {
            file: null,
            arrayBuffer: null,
            pdfJsDoc: null,
            pages: []
        };

        if (grid) grid.innerHTML = '';
        if (workspace) workspace.style.display = 'none';
        if (dropzone) dropzone.style.display = 'block';
    }

    // Renderowanie całej siatki kafelków
    function renderMatrixGrid() {
        const grid = document.getElementById('organizePagesGrid');
        if (!grid || !state.pdfJsDoc) return;

        grid.innerHTML = '';

        let displayIndex = 1;
        state.pages.forEach((pageItem, arrIdx) => {
            const card = document.createElement('div');
            card.className = `matrix-card ${pageItem.deleted ? 'is-deleted' : ''}`;
            card.id = pageItem.id;
            card.draggable = !pageItem.deleted;

            // Header z numerem strony i przyciskami akcji
            const header = document.createElement('div');
            header.className = 'matrix-card-header';

            const pagePill = document.createElement('div');
            pagePill.className = 'matrix-page-pill';
            pagePill.innerHTML = `<span>#${pageItem.deleted ? '—' : displayIndex}</span>`;
            if (pageItem.originalIndex !== displayIndex - 1) {
                pagePill.innerHTML += `<small style="opacity:0.6;font-size:0.65rem;">(z ${pageItem.originalIndex + 1})</small>`;
            }

            if (pageItem.rotation !== 0) {
                const rotTag = document.createElement('span');
                rotTag.className = 'matrix-rot-tag';
                rotTag.textContent = `${pageItem.rotation}°`;
                pagePill.appendChild(rotTag);
            }

            const actionsWrap = document.createElement('div');
            actionsWrap.className = 'matrix-card-actions';

            // Przycisk obrotu o 90° (czysty SVG z micro-hover)
            const btnRotate = document.createElement('button');
            btnRotate.type = 'button';
            btnRotate.className = 'matrix-icon-btn btn-rotate';
            btnRotate.title = 'Obróć stronę o 90° w prawo';
            btnRotate.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
            `;
            btnRotate.addEventListener('click', (e) => {
                e.stopPropagation();
                pageItem.rotation = (pageItem.rotation + 90) % 360;
                applyCardRotation(card, pageItem.rotation);
                updatePagePill(card, pageItem, displayIndex);
                updateExportSummary();
                if (typeof window.playSound === 'function') window.playSound('click');
            });

            // Przycisk duplikowania strony (czysty SVG)
            const btnDup = document.createElement('button');
            btnDup.type = 'button';
            btnDup.className = 'matrix-icon-btn btn-duplicate';
            btnDup.title = 'Zduplikuj tę stronę';
            btnDup.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
            `;
            btnDup.addEventListener('click', (e) => {
                e.stopPropagation();
                duplicatePage(arrIdx);
            });

            // Przycisk usunięcia do kosza (czysty SVG)
            const btnDel = document.createElement('button');
            btnDel.type = 'button';
            btnDel.className = 'matrix-icon-btn btn-delete';
            btnDel.title = 'Usuń stronę z gotowego dokumentu';
            btnDel.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            `;
            btnDel.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleDeletePage(pageItem, card);
            });

            actionsWrap.appendChild(btnRotate);
            actionsWrap.appendChild(btnDup);
            actionsWrap.appendChild(btnDel);

            header.appendChild(pagePill);
            header.appendChild(actionsWrap);
            card.appendChild(header);

            // Kontener na canvas miniatury
            const canvasWrap = document.createElement('div');
            canvasWrap.className = 'matrix-canvas-wrap';

            const canvas = document.createElement('canvas');
            canvas.id = `thumbCanvas_${pageItem.id}`;
            canvas.style.transform = `rotate(${pageItem.rotation}deg)`;
            canvasWrap.appendChild(canvas);

            // Jeśli usunięta — nakładka kosza
            if (pageItem.deleted) {
                const overlay = document.createElement('div');
                overlay.className = 'matrix-deleted-overlay';
                overlay.innerHTML = `
                    <span>Strona wykluczona</span>
                    <button type="button" class="matrix-btn-restore">Przywróć stronę</button>
                `;
                overlay.querySelector('.matrix-btn-restore').addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleDeletePage(pageItem, card);
                });
                canvasWrap.appendChild(overlay);
            }

            card.appendChild(canvasWrap);

            // Stopka kafelka z przyciskami szybkiego przesuwania (doskonałe na mobile i ekrany dotykowe)
            const footer = document.createElement('div');
            footer.className = 'matrix-card-footer';

            const btnMoveLeft = document.createElement('button');
            btnMoveLeft.type = 'button';
            btnMoveLeft.className = 'matrix-move-btn btn-move-left';
            btnMoveLeft.title = 'Przesuń stronę w lewo';
            btnMoveLeft.disabled = arrIdx === 0 || pageItem.deleted;
            btnMoveLeft.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
            `;
            btnMoveLeft.addEventListener('click', (e) => {
                e.stopPropagation();
                movePage(arrIdx, -1);
            });

            const posBadge = document.createElement('span');
            posBadge.className = 'matrix-pos-indicator';
            posBadge.textContent = `${arrIdx + 1} z ${state.pages.length}`;

            const btnMoveRight = document.createElement('button');
            btnMoveRight.type = 'button';
            btnMoveRight.className = 'matrix-move-btn btn-move-right';
            btnMoveRight.title = 'Przesuń stronę w prawo';
            btnMoveRight.disabled = arrIdx === state.pages.length - 1 || pageItem.deleted;
            btnMoveRight.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            `;
            btnMoveRight.addEventListener('click', (e) => {
                e.stopPropagation();
                movePage(arrIdx, 1);
            });

            footer.appendChild(btnMoveLeft);
            footer.appendChild(posBadge);
            footer.appendChild(btnMoveRight);
            card.appendChild(footer);

            // Obsługa Drag & Drop kafelków
            setupCardDragEvents(card, pageItem);

            grid.appendChild(card);

            // Renderowanie miniatury (asynchronicznie)
            renderPageThumbnail(pageItem.originalIndex + 1, canvas);

            if (!pageItem.deleted) {
                displayIndex++;
            }
        });
    }

    function movePage(fromIndex, delta) {
        const targetIdx = fromIndex + delta;
        if (targetIdx < 0 || targetIdx >= state.pages.length) return;
        const item = state.pages.splice(fromIndex, 1)[0];
        state.pages.splice(targetIdx, 0, item);
        if (typeof window.playSound === 'function') window.playSound('click');
        renderMatrixGrid();
        updateExportSummary();
    }

    // Szybkie odświeżenie samych transformacji obrotu bez re-renderu DOM
    function renderCardsTransformOnly() {
        state.pages.forEach(p => {
            const card = document.getElementById(p.id);
            if (card) {
                applyCardRotation(card, p.rotation);
            }
        });
    }

    function applyCardRotation(card, rotation) {
        const canvas = card.querySelector('canvas');
        if (canvas) {
            canvas.style.transform = `rotate(${rotation}deg)`;
        }
        let rotTag = card.querySelector('.matrix-rot-tag');
        const pagePill = card.querySelector('.matrix-page-pill');
        if (rotation !== 0) {
            if (!rotTag && pagePill) {
                rotTag = document.createElement('span');
                rotTag.className = 'matrix-rot-tag';
                pagePill.appendChild(rotTag);
            }
            if (rotTag) rotTag.textContent = `${rotation}°`;
        } else if (rotTag) {
            rotTag.remove();
        }
    }

    function updatePagePill(card, pageItem, currentNum) {
        const pill = card.querySelector('.matrix-page-pill');
        if (!pill) return;
        pill.querySelector('span').textContent = `#${pageItem.deleted ? '—' : currentNum}`;
    }

    // Renderowanie miniatury strony za pomocą pdf.js
    async function renderPageThumbnail(pageNum, canvas) {
        if (!state.pdfJsDoc || !canvas) return;
        try {
            const page = await state.pdfJsDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 0.35 });
            const ctx = canvas.getContext('2d');

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: ctx,
                viewport: viewport
            }).promise;
        } catch (e) {
            console.warn(`[PDF Matrix] Błąd miniatury str. ${pageNum}:`, e);
        }
    }

    function toggleDeletePage(pageItem, card) {
        pageItem.deleted = !pageItem.deleted;
        if (typeof window.playSound === 'function') window.playSound('click');
        renderMatrixGrid();
        updateExportSummary();
    }

    function duplicatePage(arrIdx) {
        const original = state.pages[arrIdx];
        if (!original) return;
        const newPage = {
            id: 'page_' + original.originalIndex + '_' + Date.now(),
            originalIndex: original.originalIndex,
            rotation: original.rotation,
            deleted: false,
            thumbnailRendered: false
        };
        state.pages.splice(arrIdx + 1, 0, newPage);
        if (typeof window.playSound === 'function') window.playSound('click');
        renderMatrixGrid();
        updateExportSummary();
    }

    // Obsługa zdarzeń HTML5 Drag & Drop dla zmiany kolejności
    function setupCardDragEvents(card, pageItem) {
        card.addEventListener('dragstart', (e) => {
            if (pageItem.deleted) {
                e.preventDefault();
                return;
            }
            window._isInternalDragging = true;
            draggedPageId = pageItem.id;
            card.classList.add('is-dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('application/x-dropsite-page', pageItem.id);
            e.dataTransfer.setData('text/plain', pageItem.id);
        });

        card.addEventListener('dragend', () => {
            window._isInternalDragging = false;
            card.classList.remove('is-dragging');
            document.querySelectorAll('.matrix-card').forEach(c => c.classList.remove('drag-over'));
            draggedPageId = null;
        });

        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (draggedPageId && draggedPageId !== pageItem.id) {
                card.classList.add('drag-over');
            }
        });

        card.addEventListener('dragleave', () => {
            card.classList.remove('drag-over');
        });

        card.addEventListener('drop', (e) => {
            e.preventDefault();
            card.classList.remove('drag-over');

            if (!draggedPageId || draggedPageId === pageItem.id) return;

            const fromIdx = state.pages.findIndex(p => p.id === draggedPageId);
            const toIdx = state.pages.findIndex(p => p.id === pageItem.id);

            if (fromIdx === -1 || toIdx === -1) return;

            // Przesuń element w tablicy
            const [movedItem] = state.pages.splice(fromIdx, 1);
            state.pages.splice(toIdx, 0, movedItem);

            if (typeof window.playSound === 'function') window.playSound('click');
            renderMatrixGrid();
            updateExportSummary();
        });
    }

    function updateExportSummary() {
        const titleEl = document.getElementById('organizeExportTitle');
        const subEl = document.getElementById('organizeExportSub');
        const activePages = state.pages.filter(p => !p.deleted);
        const deletedCount = state.pages.filter(p => p.deleted).length;
        const rotatedCount = activePages.filter(p => p.rotation !== 0).length;

        if (titleEl) {
            titleEl.textContent = `Gotowy układ: ${activePages.length} stron`;
        }
        if (subEl) {
            const details = [];
            if (deletedCount > 0) details.push(`usunięto ${deletedCount}`);
            if (rotatedCount > 0) details.push(`obrócono ${rotatedCount}`);
            subEl.textContent = details.length > 0 
                ? `Zmiany: ${details.join(', ')} • Gotowy do eksportu` 
                : 'Kolejność stron zgodna z podglądem • Oryginalna jakość PDF zachowana';
        }
    }

    // Eksport ułożonego PDF za pomocą pdf-lib w RAM
    async function executeExport() {
        const activePages = state.pages.filter(p => !p.deleted);
        const btnExport = document.getElementById('btnExportOrganizedPdf');

        if (activePages.length === 0) {
            if (window.showNotification) {
                window.showNotification('Wszystkie strony zostały wykluczone. Przywróć co najmniej jedną stronę przed pobraniem.', 'warning');
            }
            return;
        }

        if (!state.arrayBuffer) return;

        if (btnExport) {
            btnExport.classList.add('loading');
            btnExport.textContent = 'Generowanie PDF w RAM...';
        }

        try {
            // Upewnij się, że PDFLib jest dostępny
            if (typeof PDFLib === 'undefined' && typeof window.loadScript === 'function') {
                await window.loadScript('js/pdf-lib.min.js');
            }

            if (typeof PDFLib === 'undefined') {
                throw new Error('Biblioteka pdf-lib nie jest dostępna');
            }

            // Bezpieczne pobranie bufora dokumentu (odporne na Worker detach)
            let srcBuffer;
            if (state.file && typeof state.file.arrayBuffer === 'function') {
                srcBuffer = await state.file.arrayBuffer();
            } else if (state.rawBytes && state.rawBytes.length > 0) {
                srcBuffer = state.rawBytes.buffer.slice(0);
            } else if (state.arrayBuffer && state.arrayBuffer.byteLength > 0) {
                srcBuffer = state.arrayBuffer.slice(0);
            }

            if (!srcBuffer || srcBuffer.byteLength === 0) {
                throw new Error('Brak danych pliku PDF w pamięci RAM. Wczytaj plik ponownie.');
            }

            const srcPdf = await PDFLib.PDFDocument.load(srcBuffer, { ignoreEncryption: true });
            const newPdf = await PDFLib.PDFDocument.create();

            for (const pageItem of activePages) {
                const [copiedPage] = await newPdf.copyPages(srcPdf, [pageItem.originalIndex]);
                
                // Uwzględnij istniejącą rotację strony oraz dodany obrót z matrycy
                const initialRotation = copiedPage.getRotation().angle || 0;
                const totalRotation = (initialRotation + pageItem.rotation) % 360;
                copiedPage.setRotation(PDFLib.degrees(totalRotation));

                newPdf.addPage(copiedPage);
            }

            const pdfBytes = await newPdf.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const downloadLink = document.createElement('a');
            const originalName = state.file ? state.file.name.replace(/\.pdf$/i, '') : 'dokument';
            downloadLink.href = url;
            downloadLink.download = `${originalName}_uklad_dropsite.pdf`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

            setTimeout(() => URL.revokeObjectURL(url), 5000);

            if (typeof window.playSound === 'function') window.playSound('success');
            if (window.showNotification) {
                window.showNotification(`Pomyślnie wygenerowano plik ${downloadLink.download}!`, 'success');
            }

        } catch (err) {
            console.error('[PDF Matrix] Błąd eksportu PDF:', err);
            if (window.showNotification) {
                window.showNotification('Błąd zapisu PDF: ' + (err.message || 'Nieznany błąd'), 'error');
            }
        } finally {
            if (btnExport) {
                btnExport.classList.remove('loading');
                btnExport.innerHTML = `
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <span>Pobierz ułożony PDF</span>
                `;
            }
        }
    }

    // Inicjalizacja po załadowaniu DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMatrixModule);
    } else {
        initMatrixModule();
    }

    // Publiczne API
    window.DropsitePdfMatrix = {
        loadFile: loadPdfFile,
        reset: resetModule
    };

})();
