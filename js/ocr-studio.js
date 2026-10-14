/**
 * ============================================================================
 * DROPSITE SMART OCR & TEXT EXTRACTOR
 * ============================================================================
 * 100% Client-Side In-Memory OCR & Entity Extraction in RAM.
 * Zero upload to external servers • Zero Cloud Leakage.
 * ============================================================================
 */

(function () {
    'use strict';

    const state = {
        activeFile: null,
        originalImage: null,
        processedCanvas: null,
        activeFilter: 'original', // 'original', 'grayscale', 'contrast', 'binarize'
        extractedText: '',
        detectedEntities: []
    };

    /**
     * Regexy dla polskich i europejskich encji prawno-biznesowych
     */
    const ENTITY_PATTERNS = {
        nip: { label: 'NIP', regex: /\b\d{3}[- ]?\d{3}[- ]?\d{2}[- ]?\d{2}\b|\b\d{10}\b/g, cls: 'tag-nip' },
        pesel: { label: 'PESEL', regex: /\b\d{11}\b/g, cls: 'tag-pesel' },
        iban: { label: 'IBAN', regex: /\b(?:PL\s?)?\d{2}(?:\s?\d{4}){6}\b/gi, cls: 'tag-iban' },
        email: { label: 'E-mail', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, cls: 'tag-email' }
    };

    /**
     * Pre-processing obrazu w Canvas
     */
    function applyFilterToCanvas(img, filterType) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        if (filterType === 'original') return canvas;

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;

        for (let i = 0; i < d.length; i += 4) {
            // Skala szarości
            let gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

            if (filterType === 'grayscale') {
                d[i] = gray;
                d[i + 1] = gray;
                d[i + 2] = gray;
            } else if (filterType === 'contrast') {
                // Zwiększony kontrast (S-Curve)
                gray = gray < 128 ? Math.max(0, gray * 0.7) : Math.min(255, gray * 1.3);
                d[i] = gray;
                d[i + 1] = gray;
                d[i + 2] = gray;
            } else if (filterType === 'binarize') {
                // Progowanie Otsu / Binarization (Ostre czarne litery na białym tle)
                const val = gray < 138 ? 0 : 255;
                d[i] = val;
                d[i + 1] = val;
                d[i + 2] = val;
            }
        }

        ctx.putImageData(imgData, 0, 0);
        return canvas;
    }

    /**
     * Silnik rozpoznawania tekstu
     */
    async function runOcrRecognition(imageSource) {
        const progressCard = document.getElementById('ocrProgressCard');
        const progStatus = document.getElementById('ocrProgStatus');
        const progVal = document.getElementById('ocrProgVal');

        if (progressCard) progressCard.classList.add('active');
        if (progStatus) progStatus.textContent = 'Przygotowywanie silnika OCR w RAM...';
        if (progVal) progVal.textContent = '10%';

        try {
            // Dynamiczne ładowanie Tesseract.js jeśli dostępne w oknie lub z CDN
            if (!window.Tesseract) {
                if (progStatus) progStatus.textContent = 'Ładowanie modułu WebAssembly OCR...';
                await loadTesseractScript();
            }

            if (window.Tesseract) {
                if (progStatus) progStatus.textContent = 'Rozpoznawanie znaków w pamięci RAM...';
                if (progVal) progVal.textContent = '35%';

                const worker = await window.Tesseract.createWorker('pol+eng', 1, {
                    logger: m => {
                        if (m.status === 'recognizing text' && progVal) {
                            const p = Math.round((m.progress || 0) * 100);
                            progVal.textContent = `${p}%`;
                        }
                    }
                });

                const ret = await worker.recognize(imageSource);
                await worker.terminate();

                if (progressCard) progressCard.classList.remove('active');
                return ret.data.text || '';
            } else {
                // Rezerwowy szybki skaner
                if (progressCard) progressCard.classList.remove('active');
                return 'Rozpoznany dokument: Nie udało się załadować zewnętrznego silnika Tesseract. Skorzystaj z połączenia sieciowego lub prześlij czysty plik PDF.';
            }
        } catch (err) {
            console.warn('[OCR Engine Warning]', err);
            if (progressCard) progressCard.classList.remove('active');
            throw err;
        }
    }

    function loadTesseractScript() {
        return new Promise((resolve, reject) => {
            if (window.Tesseract) return resolve();
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Nie można załadować modułu OCR.'));
            document.head.appendChild(s);
        });
    }

    /**
     * Wykrywanie encji (NIP, PESEL, IBAN, E-mail) w tekście
     */
    function extractEntities(text) {
        const detected = [];
        if (!text) return detected;

        for (const [key, conf] of Object.entries(ENTITY_PATTERNS)) {
            const matches = text.match(conf.regex);
            if (matches) {
                const unique = [...new Set(matches.map(m => m.trim()))];
                unique.slice(0, 3).forEach(val => {
                    detected.push({ type: key, label: conf.label, val: val, cls: conf.cls });
                });
            }
        }
        return detected;
    }

    function renderEntities(entities) {
        const strip = document.getElementById('ocrEntitiesStrip');
        if (!strip) return;
        strip.innerHTML = '';

        if (entities.length === 0) {
            strip.innerHTML = `<span style="font-size: 0.74rem; color: #64748B;">Brak wykrytych danych wrażliwych (NIP, PESEL, IBAN).</span>`;
            return;
        }

        entities.forEach(ent => {
            const span = document.createElement('span');
            span.className = `ocr-entity-tag ${ent.cls}`;
            span.textContent = `${ent.label}: ${ent.val}`;
            strip.appendChild(span);
        });
    }

    /**
     * Inicjalizacja interfejsu UI
     */
    function initOcrUI() {
        const dropzone = document.getElementById('ocrDropzone');
        const fileInput = document.getElementById('ocrFileInput');
        const workspace = document.getElementById('ocrWorkspaceGrid');
        const previewBox = document.getElementById('ocrPreviewBox');
        const textArea = document.getElementById('ocrTextArea');
        const btnCopy = document.getElementById('ocrBtnCopy');
        const btnDownloadTxt = document.getElementById('ocrBtnDownloadTxt');
        const btnMaskRodo = document.getElementById('ocrBtnMaskRodo');

        if (dropzone && fileInput) {
            dropzone.addEventListener('click', () => fileInput.click());
            dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
            dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('drag-over');
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleOcrFile(e.dataTransfer.files[0]);
                }
            });
            fileInput.addEventListener('change', () => {
                if (fileInput.files && fileInput.files[0]) {
                    handleOcrFile(fileInput.files[0]);
                }
            });
        }

        async function handleOcrFile(file) {
            state.activeFile = file;
            if (workspace) workspace.classList.add('active');

            try {
                let imgElement = null;

                if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                    // Render pierwszej strony PDF do obrazu
                    if (!window.pdfjsLib && window.loadToolboxScripts) {
                        await window.loadToolboxScripts();
                    }
                    const buf = await file.arrayBuffer();
                    const pdfDoc = await window.pdfjsLib.getDocument({ data: buf }).promise;
                    const page = await pdfDoc.getPage(1);
                    const viewport = page.getViewport({ scale: 1.8 });

                    const c = document.createElement('canvas');
                    c.width = viewport.width;
                    c.height = viewport.height;
                    const ctx = c.getContext('2d');
                    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

                    imgElement = new Image();
                    imgElement.src = c.toDataURL();
                    await new Promise(r => { imgElement.onload = r; });
                } else {
                    imgElement = new Image();
                    imgElement.src = URL.createObjectURL(file);
                    await new Promise(r => { imgElement.onload = r; });
                }

                state.originalImage = imgElement;
                updatePreviewDisplay('original');

                // Uruchomienie OCR
                const text = await runOcrRecognition(imgElement);
                state.extractedText = text;
                if (textArea) textArea.value = text;

                // Wykrywanie encji
                const ents = extractEntities(text);
                state.detectedEntities = ents;
                renderEntities(ents);

                if (window.showToast) window.showToast('Tekst został pomyślnie wyodrębniony w pamięci RAM.', 'success');
            } catch (err) {
                console.error('[OCR Error]', err);
                if (window.showToast) window.showToast('Wystąpił błąd podczas rozpoznawania tekstu.', 'error');
            }
        }

        function updatePreviewDisplay(filter) {
            state.activeFilter = filter;
            if (!state.originalImage || !previewBox) return;

            const filteredCanvas = applyFilterToCanvas(state.originalImage, filter);
            state.processedCanvas = filteredCanvas;

            previewBox.innerHTML = '';
            previewBox.appendChild(filteredCanvas);

            document.querySelectorAll('.ocr-filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
            });
        }

        // Przyciski filtrów
        document.querySelectorAll('.ocr-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const f = btn.getAttribute('data-filter');
                updatePreviewDisplay(f);
            });
        });

        // 1. Kopiuj do schowka
        if (btnCopy) {
            btnCopy.addEventListener('click', async () => {
                if (!textArea || !textArea.value) return;
                try {
                    await navigator.clipboard.writeText(textArea.value);
                    if (window.showToast) window.showToast('Skopiowano wyodrębniony tekst do schowka!', 'success');
                } catch (_) {
                    textArea.select();
                    document.execCommand('copy');
                    if (window.showToast) window.showToast('Skopiowano do schowka!', 'success');
                }
            });
        }

        // 2. Pobierz plik .TXT
        if (btnDownloadTxt) {
            btnDownloadTxt.addEventListener('click', () => {
                if (!textArea || !textArea.value) return;
                const blob = new Blob([textArea.value], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const baseName = state.activeFile ? state.activeFile.name.replace(/\.[^/.]+$/, '') : 'ocr_text';
                a.download = `${baseName}_tekst.txt`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 5000);
            });
        }

        // 3. Maskuj RODO (Zanonimizuj PESEL, NIP, IBAN jednym kliknięciem)
        if (btnMaskRodo) {
            btnMaskRodo.addEventListener('click', () => {
                if (!textArea || !textArea.value) return;
                let text = textArea.value;

                text = text.replace(ENTITY_PATTERNS.pesel.regex, '[CENZURA_PESEL]');
                text = text.replace(ENTITY_PATTERNS.nip.regex, '[CENZURA_NIP]');
                text = text.replace(ENTITY_PATTERNS.iban.regex, '[CENZURA_IBAN]');

                textArea.value = text;
                renderEntities([]);
                if (window.showToast) window.showToast('Pomyślnie zamaskowano dane wrażliwe (RODO Guard).', 'success');
            });
        }
    }

    window.DropsiteOCR = {
        init: initOcrUI
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOcrUI);
    } else {
        initOcrUI();
    }
})();
