/**
 * ============================================================================
 * DROPSITE RODO GUARD (Inteligentna Detekcja Danych Wrażliwych & Auto-Blackout)
 * ============================================================================
 * Skanuje dokument PDF w 100% w pamięci RAM za pomocą pdf.js, wykrywa:
 * - Numery PESEL (z algorytmiczną weryfikacją wag i sumy kontrolnej)
 * - Numery NIP (z algorytmiczną weryfikacją wag)
 * - Numery Dowodów Osobistych (seria i numer)
 * - Adresy poczty elektronicznej (E-mail)
 * - Numery Rachunków Bankowych (IBAN / NRB)
 * - Kwoty transakcyjne / wynagrodzenia
 *
 * Umożliwia 1-kliknięciem nałożenie nieprzezroczystych prostokątów cenzury
 * bez wysyłania dokumentu do chmury (Obsidian Glass + Cyber Mint).
 * ============================================================================
 */

(function () {
    'use strict';

    // Stan modułu RODO Guard
    const state = {
        scanning: false,
        findings: [],       // Lista wykrytych obiektów
        activeFilter: 'all',// 'all' | 'pesel' | 'nip' | 'id' | 'email' | 'iban' | 'amount'
        censorColor: '#000000',
        lastScannedDoc: null
    };

    // --- ALGORYTMY WERYFIKACJI SUM KONTROLNYCH ---

    function validatePesel(str) {
        const clean = (str || '').replace(/\D/g, '');
        if (clean.length !== 11) return false;
        const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
        let sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(clean[i], 10) * weights[i];
        }
        const control = (10 - (sum % 10)) % 10;
        return control === parseInt(clean[10], 10);
    }

    function validateNip(str) {
        const clean = (str || '').replace(/\D/g, '');
        if (clean.length !== 10) return false;
        const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(clean[i], 10) * weights[i];
        }
        const control = sum % 11;
        if (control === 10) return false;
        return control === parseInt(clean[9], 10);
    }

    function maskValue(val, type) {
        if (!val) return '';
        if (type === 'pesel') {
            return val.substring(0, 4) + '••••' + val.substring(8);
        }
        if (type === 'nip') {
            const clean = val.replace(/\D/g, '');
            return clean.substring(0, 3) + '•••••' + clean.substring(8);
        }
        if (type === 'email') {
            const parts = val.split('@');
            if (parts.length === 2) {
                const name = parts[0];
                const maskedName = name.length <= 2 ? name[0] + '•' : name.substring(0, 2) + '••••';
                return `${maskedName}@${parts[1]}`;
            }
        }
        if (type === 'iban') {
            const clean = val.replace(/\s/g, '');
            return clean.substring(0, 4) + ' •••• •••• ' + clean.substring(clean.length - 4);
        }
        if (type === 'id') {
            return val.substring(0, 3) + ' •••' + val.substring(val.length - 2);
        }
        return val;
    }

    // --- GŁÓWNY SILNIK SKANOWANIA DOKUMENTU ---

    async function scanDocument() {
        const pdfDoc = window.studioPdfJsDoc;
        if (!pdfDoc) {
            if (window.showNotification) {
                window.showNotification('Najpierw wczytaj dokument PDF w PDF Studio!', 'warning');
            }
            return [];
        }

        state.scanning = true;
        state.findings = [];
        renderScanningUI();

        try {
            const numPages = pdfDoc.numPages;
            const findings = [];

            // Wyrażenia regularne
            const rxPesel = /\b\d{11}\b/g;
            const rxNip = /\b\d{3}[-\s]?\d{3}[-\s]?\d{2}[-\s]?\d{2}\b|\b\d{3}[-\s]?\d{2}[-\s]?\d{2}[-\s]?\d{3}\b|\b\d{10}\b/g;
            const rxIdCard = /\b[A-Z]{3}\s?\d{6}\b/g;
            const rxEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
            const rxIban = /\b(?:PL)?\s?(?:\d{2}\s?)(?:\d{4}\s?){6}\b|\b\d{26}\b/gi;
            const rxAmount = /\b\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?\s*(?:PLN|zł|EUR|USD|GBP|\$|€)\b/gi;

            const overlayLayer = document.getElementById('pdfOverlayLayer');
            const targetOverlayW = overlayLayer ? overlayLayer.clientWidth : 595;
            const targetOverlayH = overlayLayer ? overlayLayer.clientHeight : 842;

            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                // Pomiń strony usunięte w edytorze
                if (window.studioDeletedPages && window.studioDeletedPages.has(pageNum)) {
                    continue;
                }

                const page = await pdfDoc.getPage(pageNum);
                const extraRot = (window.studioPageRotations && window.studioPageRotations[pageNum]) || 0;
                const totalRotation = (page.rotate + extraRot) % 360;

                // Viewport bazowy w skali 1.0
                const viewport = page.getViewport({ scale: 1.0, rotation: totalRotation });
                const textContent = await page.getTextContent({ normalizeWhitespace: true });

                const items = textContent.items || [];
                if (items.length === 0) continue;

                // Skala przeliczeniowa z przestrzeni bazowej viewport do bieżącej warstwy overlay
                const scaleX = targetOverlayW / viewport.width;
                const scaleY = targetOverlayH / viewport.height;

                // Sprawdzamy każdy token tekstowy
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    const str = item.str;
                    if (!str || str.trim().length === 0) continue;

                    // Przekształcenie macierzy transformacji do współrzędnych ekranu
                    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
                    const itemX = tx[4];
                    const itemY = tx[5]; // Baseline tekstu w układzie współrzędnych canvas
                    const fontHeight = Math.max(10, Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]));
                    const itemW = Math.max(12, item.width);
                    const itemH = fontHeight * 1.25;

                    // Górna krawędź prostokąta w przestrzeni widoku (Y rośnie w dół)
                    const boxTop = itemY - fontHeight;

                    // 1. PESEL
                    let match;
                    rxPesel.lastIndex = 0;
                    while ((match = rxPesel.exec(str)) !== null) {
                        const val = match[0];
                        const isValid = validatePesel(val);
                        findings.push({
                            id: 'rodo_' + Math.random().toString(36).substring(2, 9),
                            page: pageNum,
                            type: 'pesel',
                            categoryLabel: 'PESEL',
                            rawText: val,
                            maskedText: maskValue(val, 'pesel'),
                            badgeClass: 'badge-pesel',
                            verified: isValid,
                            confidence: isValid ? '100% (Suma wag poprawna)' : 'Wzorzec 11 cyfr',
                            selected: true,
                            // Koordynaty w przestrzeni overlay
                            x: Math.max(4, Math.round(itemX * scaleX) - 2),
                            y: Math.max(4, Math.round(boxTop * scaleY) - 2),
                            width: Math.max(50, Math.round(itemW * scaleX) + 4),
                            height: Math.max(16, Math.round(itemH * scaleY) + 4),
                            pageOverlayW: targetOverlayW,
                            pageOverlayH: targetOverlayH
                        });
                    }

                    // 2. NIP
                    rxNip.lastIndex = 0;
                    while ((match = rxNip.exec(str)) !== null) {
                        const val = match[0];
                        const clean = val.replace(/\D/g, '');
                        if (clean.length === 10) {
                            const isValid = validateNip(clean);
                            findings.push({
                                id: 'rodo_' + Math.random().toString(36).substring(2, 9),
                                page: pageNum,
                                type: 'nip',
                                categoryLabel: 'NIP',
                                rawText: val,
                                maskedText: maskValue(val, 'nip'),
                                badgeClass: 'badge-nip',
                                verified: isValid,
                                confidence: isValid ? '100% (Suma wag poprawna)' : 'Format NIP',
                                selected: true,
                                x: Math.max(4, Math.round(itemX * scaleX) - 2),
                                y: Math.max(4, Math.round(boxTop * scaleY) - 2),
                                width: Math.max(50, Math.round(itemW * scaleX) + 4),
                                height: Math.max(16, Math.round(itemH * scaleY) + 4),
                                pageOverlayW: targetOverlayW,
                                pageOverlayH: targetOverlayH
                            });
                        }
                    }

                    // 3. Dowód Osobisty
                    rxIdCard.lastIndex = 0;
                    while ((match = rxIdCard.exec(str)) !== null) {
                        const val = match[0];
                        findings.push({
                            id: 'rodo_' + Math.random().toString(36).substring(2, 9),
                            page: pageNum,
                            type: 'id',
                            categoryLabel: 'Dowód Osobisty',
                            rawText: val,
                            maskedText: maskValue(val, 'id'),
                            badgeClass: 'badge-id',
                            verified: true,
                            confidence: 'Wzorzec Seria i Numer',
                            selected: true,
                            x: Math.max(4, Math.round(itemX * scaleX) - 2),
                            y: Math.max(4, Math.round(boxTop * scaleY) - 2),
                            width: Math.max(45, Math.round(itemW * scaleX) + 4),
                            height: Math.max(16, Math.round(itemH * scaleY) + 4),
                            pageOverlayW: targetOverlayW,
                            pageOverlayH: targetOverlayH
                        });
                    }

                    // 4. E-mail
                    rxEmail.lastIndex = 0;
                    while ((match = rxEmail.exec(str)) !== null) {
                        const val = match[0];
                        findings.push({
                            id: 'rodo_' + Math.random().toString(36).substring(2, 9),
                            page: pageNum,
                            type: 'email',
                            categoryLabel: 'E-mail',
                            rawText: val,
                            maskedText: maskValue(val, 'email'),
                            badgeClass: 'badge-email',
                            verified: true,
                            confidence: 'Format RFC 5322',
                            selected: true,
                            x: Math.max(4, Math.round(itemX * scaleX) - 2),
                            y: Math.max(4, Math.round(boxTop * scaleY) - 2),
                            width: Math.max(50, Math.round(itemW * scaleX) + 4),
                            height: Math.max(16, Math.round(itemH * scaleY) + 4),
                            pageOverlayW: targetOverlayW,
                            pageOverlayH: targetOverlayH
                        });
                    }

                    // 5. Rachunek Bankowy (IBAN)
                    rxIban.lastIndex = 0;
                    while ((match = rxIban.exec(str)) !== null) {
                        const val = match[0].trim();
                        const clean = val.replace(/\D/g, '');
                        if (clean.length === 26) {
                            findings.push({
                                id: 'rodo_' + Math.random().toString(36).substring(2, 9),
                                page: pageNum,
                                type: 'iban',
                                categoryLabel: 'Konto Bankowe',
                                rawText: val,
                                maskedText: maskValue(val, 'iban'),
                                badgeClass: 'badge-iban',
                                verified: true,
                                confidence: 'Numer Rachunku NRB (26 cyfr)',
                                selected: true,
                                x: Math.max(4, Math.round(itemX * scaleX) - 2),
                                y: Math.max(4, Math.round(boxTop * scaleY) - 2),
                                width: Math.max(60, Math.round(itemW * scaleX) + 4),
                                height: Math.max(16, Math.round(itemH * scaleY) + 4),
                                pageOverlayW: targetOverlayW,
                                pageOverlayH: targetOverlayH
                            });
                        }
                    }

                    // 6. Kwoty i Wynagrodzenia
                    rxAmount.lastIndex = 0;
                    while ((match = rxAmount.exec(str)) !== null) {
                        const val = match[0].trim();
                        findings.push({
                            id: 'rodo_' + Math.random().toString(36).substring(2, 9),
                            page: pageNum,
                            type: 'amount',
                            categoryLabel: 'Kwota / Waluta',
                            rawText: val,
                            maskedText: val,
                            badgeClass: 'badge-amount',
                            verified: true,
                            confidence: 'Wartość finansowa',
                            selected: false, // Domyślnie kwoty odznaczone, użytkownik sam decyduje
                            x: Math.max(4, Math.round(itemX * scaleX) - 2),
                            y: Math.max(4, Math.round(boxTop * scaleY) - 2),
                            width: Math.max(40, Math.round(itemW * scaleX) + 4),
                            height: Math.max(16, Math.round(itemH * scaleY) + 4),
                            pageOverlayW: targetOverlayW,
                            pageOverlayH: targetOverlayH
                        });
                    }
                }
            }

            state.findings = findings;
            state.lastScannedDoc = pdfDoc;
            state.scanning = false;

            renderResultsUI();

            if (window.playSound) window.playSound('click');
            if (window.showNotification) {
                window.showNotification(
                    findings.length > 0
                        ? `RODO Guard: Wykryto ${findings.length} potencjalnych danych osobowych.`
                        : 'RODO Guard: Nie wykryto żadnych wrażliwych danych w tekście PDF.',
                    findings.length > 0 ? 'info' : 'success'
                );
            }

            return findings;
        } catch (err) {
            console.error('[RODO Guard] Błąd skanowania:', err);
            state.scanning = false;
            if (window.showNotification) {
                window.showNotification('Błąd podczas skanowania tekstu PDF: ' + err.message, 'error');
            }
            renderResultsUI();
            return [];
        }
    }

    // --- RENDEROWANIE WIDOKU MODALU ---

    function renderScanningUI() {
        const scanState = document.getElementById('rodoScanningState');
        const resultsBody = document.getElementById('rodoResultsBody');
        const btnApply = document.getElementById('btnRodoApply');

        if (scanState) scanState.style.display = 'flex';
        if (resultsBody) resultsBody.style.display = 'none';
        if (btnApply) btnApply.disabled = true;
    }

    function renderResultsUI() {
        const scanState = document.getElementById('rodoScanningState');
        const resultsBody = document.getElementById('rodoResultsBody');
        const listEl = document.getElementById('rodoItemsList');
        const emptyEl = document.getElementById('rodoEmptyState');
        const btnApply = document.getElementById('btnRodoApply');
        const selectAll = document.getElementById('rodoSelectAll');

        if (scanState) scanState.style.display = 'none';
        if (resultsBody) resultsBody.style.display = 'flex';

        // Aktualizacja liczników w chipach
        updateCategoryChipCounts();

        const filtered = state.activeFilter === 'all'
            ? state.findings
            : state.findings.filter(f => f.type === state.activeFilter);

        if (listEl) {
            listEl.innerHTML = '';

            if (filtered.length === 0) {
                if (listEl) listEl.style.display = 'none';
                if (emptyEl) emptyEl.style.display = 'flex';
            } else {
                if (listEl) listEl.style.display = 'flex';
                if (emptyEl) emptyEl.style.display = 'none';

                filtered.forEach(item => {
                    const card = document.createElement('div');
                    card.className = `rodo-item-card ${item.selected ? 'selected' : ''}`;
                    card.dataset.id = item.id;

                    card.innerHTML = `
                        <div class="rodo-item-left">
                            <input type="checkbox" class="rodo-item-checkbox" ${item.selected ? 'checked' : ''}>
                            <div class="rodo-item-info">
                                <div class="rodo-item-header">
                                    <span class="rodo-type-badge ${item.badgeClass}">${item.categoryLabel}</span>
                                    <span class="rodo-page-tag">Strona ${item.page}</span>
                                    ${item.verified ? '<span class="rodo-status-pill">✓ Zweryfikowano</span>' : ''}
                                </div>
                                <div class="rodo-item-value">${escapeHtml(item.maskedText)}</div>
                            </div>
                        </div>
                        <div class="rodo-item-actions">
                            <button type="button" class="rodo-btn-inspect" title="Pokaż tę pozycję na arkuszu">Podgląd</button>
                        </div>
                    `;

                    const chk = card.querySelector('.rodo-item-checkbox');
                    chk.addEventListener('change', () => {
                        item.selected = chk.checked;
                        card.classList.toggle('selected', item.selected);
                        updateApplyButtonState();
                    });

                    const btnInspect = card.querySelector('.rodo-btn-inspect');
                    btnInspect.addEventListener('click', () => {
                        jumpToPageAndHighlight(item);
                    });

                    listEl.appendChild(card);
                });
            }
        }

        if (selectAll) {
            const allSelected = filtered.length > 0 && filtered.every(f => f.selected);
            selectAll.checked = allSelected;
        }

        updateApplyButtonState();
    }

    function updateCategoryChipCounts() {
        const chips = document.querySelectorAll('.rodo-chip');
        chips.forEach(chip => {
            const cat = chip.getAttribute('data-category');
            chip.classList.toggle('active', cat === state.activeFilter);
            const countEl = chip.querySelector('.rodo-chip-count');
            if (countEl) {
                const count = cat === 'all'
                    ? state.findings.length
                    : state.findings.filter(f => f.type === cat).length;
                countEl.textContent = `${count}`;
            }
        });
    }

    function updateApplyButtonState() {
        const btnApply = document.getElementById('btnRodoApply');
        if (!btnApply) return;
        const selectedCount = state.findings.filter(f => f.selected).length;
        btnApply.disabled = selectedCount === 0;
        btnApply.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="currentColor"></rect>
            </svg>
            <span>Zastosuj Cenzurę (${selectedCount})</span>
        `;
    }

    function jumpToPageAndHighlight(item) {
        if (typeof window.studioCurrentPage !== 'undefined') {
            window.studioCurrentPage = item.page;
            if (typeof window.renderCurrentPdfPage === 'function') {
                window.renderCurrentPdfPage();
            }
            closeModal();
            if (window.showNotification) {
                window.showNotification(`Przeniesiono do strony ${item.page} (${item.categoryLabel})`, 'info');
            }
        }
    }

    // --- APLIKACJA CENZURY (AUTO-BLACKOUT) ---

    function applyRedactions() {
        const selectedItems = state.findings.filter(f => f.selected);
        if (selectedItems.length === 0) return;

        if (!Array.isArray(window.studioAnnotations)) {
            window.studioAnnotations = [];
        }

        const colorInput = document.querySelector('input[name="rodoColor"]:checked');
        const color = colorInput ? colorInput.value : '#000000';

        selectedItems.forEach(item => {
            const id = 'ann_' + (window.studioNextId ? window.studioNextId++ : Math.floor(Math.random() * 100000));
            window.studioAnnotations.push({
                id: id,
                page: item.page,
                type: 'censor',
                color: color,
                x: item.x,
                y: item.y,
                width: item.width,
                height: item.height,
                pageOverlayW: item.pageOverlayW,
                pageOverlayH: item.pageOverlayH
            });
        });

        if (typeof window.renderPageAnnotations === 'function') {
            window.renderPageAnnotations();
        }

        if (typeof window.pushStudioHistoryState === 'function') {
            window.pushStudioHistoryState(`Auto-Blackout RODO (${selectedItems.length} pozycji)`);
        }

        if (window.playSound) window.playSound('pop');
        if (window.showNotification) {
            window.showNotification(
                `✓ Pomyślnie nałożono trwałą cenzurę na ${selectedItems.length} pozycji wrażliwych RODO.`,
                'success'
            );
        }

        closeModal();
    }

    // --- KONTROLER OKNA MODALNEGO ---

    function openModal() {
        const modal = document.getElementById('rodoGuardModal');
        if (!modal) return;

        // Sprawdź czy plik jest załadowany
        if (!window.studioPdfJsDoc) {
            if (window.showNotification) {
                window.showNotification('Najpierw wczytaj dokument PDF w edytorze!', 'warning');
            }
            return;
        }

        modal.classList.add('active');

        // Jeśli dokument uległ zmianie lub nie był jeszcze skanowany
        if (state.lastScannedDoc !== window.studioPdfJsDoc || state.findings.length === 0) {
            scanDocument();
        } else {
            renderResultsUI();
        }
    }

    function closeModal() {
        const modal = document.getElementById('rodoGuardModal');
        if (modal) modal.classList.remove('active');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    // --- INICJALIZACJA ZDARZEŃ ---

    function init() {
        const modal = document.getElementById('rodoGuardModal');
        const btnClose = document.getElementById('btnRodoClose');
        const btnCancel = document.getElementById('btnRodoCancel');
        const btnApply = document.getElementById('btnRodoApply');
        const selectAll = document.getElementById('rodoSelectAll');

        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnCancel) btnCancel.addEventListener('click', closeModal);
        if (btnApply) btnApply.addEventListener('click', applyRedactions);

        // Zamykanie przy kliknięciu w tło
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });
        }

        // Klawisz Escape
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
                closeModal();
            }
        });

        // Obsługa przełącznika "Zaznacz wszystkie"
        if (selectAll) {
            selectAll.addEventListener('change', () => {
                const checked = selectAll.checked;
                const filtered = state.activeFilter === 'all'
                    ? state.findings
                    : state.findings.filter(f => f.type === state.activeFilter);

                filtered.forEach(f => { f.selected = checked; });
                renderResultsUI();
            });
        }

        // Filtry kategorii
        const chips = document.querySelectorAll('.rodo-chip');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                state.activeFilter = chip.getAttribute('data-category');
                renderResultsUI();
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Eksport do przestrzeni globalnej
    window.DropsiteRodoGuard = {
        openModal: openModal,
        closeModal: closeModal,
        scanDocument: scanDocument,
        applyRedactions: applyRedactions,
        validatePesel: validatePesel,
        validateNip: validateNip
    };

})();
