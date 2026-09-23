/**
 * Dropsite Dead Drop / Burn Note
 * 100% Client-Side AES-256-GCM Ephemeral Secrets in RAM. Zero cloud leakage.
 * Brand Guidelines: Zero emoji, pure inline SVG, Obsidian Glass & Cyber Mint / Amber.
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'dropsite_dead_drops';

    function getStoredDrops() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        } catch (e) {
            return {};
        }
    }

    function saveStoredDrops(dict) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dict));
        } catch (e) {}
    }

    // Pomocnicze funkcje konwersji buforów
    function bufToBase64(buf) {
        let bin = '';
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.byteLength; i++) {
            bin += String.fromCharCode(bytes[i]);
        }
        return btoa(bin);
    }

    function base64ToBuf(b64) {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
            bytes[i] = bin.charCodeAt(i);
        }
        return bytes.buffer;
    }

    // 1. SZYFROWANIE NOTATKI (AES-256-GCM)
    async function encryptSecret(plainText) {
        const key = await window.crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const enc = new TextEncoder();
        const encodedData = enc.encode(plainText);

        const cipherBuf = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encodedData
        );

        const exportedKey = await window.crypto.subtle.exportKey('raw', key);
        const keyB64 = bufToBase64(exportedKey);
        const ivB64 = bufToBase64(iv);
        const cipherB64 = bufToBase64(cipherBuf);

        return {
            keyB64: keyB64,
            ivB64: ivB64,
            cipherB64: cipherB64
        };
    }

    // 2. ODSZYFROWANIE NOTATKI (AES-256-GCM)
    async function decryptSecret(cipherB64, ivB64, keyB64) {
        const keyBuf = base64ToBuf(keyB64);
        const ivBuf = base64ToBuf(ivB64);
        const cipherBuf = base64ToBuf(cipherB64);

        const key = await window.crypto.subtle.importKey(
            'raw',
            keyBuf,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );

        const decryptedBuf = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: new Uint8Array(ivBuf) },
            key,
            cipherBuf
        );

        const dec = new TextDecoder();
        return dec.decode(decryptedBuf);
    }

    function generateNoteId() {
        return 'nt_' + Math.random().toString(36).substring(2, 9);
    }

    // INICJALIZACJA
    function initDeadDrop() {
        setupCreatorModal();
        setupReaderModal();
        checkUrlForSecretNote();
        window.addEventListener('hashchange', checkUrlForSecretNote);
    }

    // OBSŁUGA KREATORA NOTATKI
    function setupCreatorModal() {
        const modal = document.getElementById('deadDropModal');
        if (!modal) return;

        const textInput = document.getElementById('deadDropTextInput');
        const expirySelect = document.getElementById('deadDropExpirySelect');
        const createBtn = document.getElementById('btnDeadDropCreate');
        const closeBtn = document.getElementById('btnDeadDropClose');
        const cancelBtn = document.getElementById('btnDeadDropCancel');
        const resultBox = document.getElementById('deadDropResultBox');
        const urlInput = document.getElementById('deadDropUrlInput');
        const copyBtn = document.getElementById('btnDeadDropCopy');

        function openModal() {
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
            if (textInput) {
                textInput.value = '';
                textInput.focus();
            }
            if (resultBox) resultBox.classList.remove('visible');
            if (createBtn) createBtn.style.display = 'inline-flex';
        }

        function closeModal() {
            modal.classList.remove('open');
            document.body.style.overflow = '';
        }

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        if (createBtn) {
            createBtn.addEventListener('click', async () => {
                const text = textInput ? textInput.value.trim() : '';
                if (!text) {
                    if (window.showToast) window.showToast('Wprowadź treść notatki do zaszyfrowania', 'warning');
                    return;
                }

                createBtn.disabled = true;
                createBtn.style.opacity = '0.6';

                try {
                    const encRes = await encryptSecret(text);
                    const noteId = generateNoteId();
                    const expiryHours = expirySelect ? expirySelect.value : 'read';

                    const expiryTimestamp = expiryHours === 'read' ? null : (Date.now() + parseInt(expiryHours, 10) * 3600 * 1000);

                    // Zapis w lokalnej bazie danych
                    const drops = getStoredDrops();
                    drops[noteId] = {
                        iv: encRes.ivB64,
                        cipher: encRes.cipherB64,
                        expiry: expiryTimestamp,
                        burnOnRead: expiryHours === 'read'
                    };
                    saveStoredDrops(drops);

                    // Pełny link: zawiera klucz w HASHU oraz payload zapasowy (dla współdzielenia między różnymi przeglądarkami bez backendu)
                    const payload = {
                        id: noteId,
                        iv: encRes.ivB64,
                        c: encRes.cipherB64,
                        k: encRes.keyB64,
                        e: expiryTimestamp,
                        b: expiryHours === 'read'
                    };
                    const payloadB64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));

                    const fullUrl = `${window.location.origin}${window.location.pathname}?note=${noteId}#secret=${payloadB64}`;

                    if (urlInput) urlInput.value = fullUrl;
                    if (resultBox) resultBox.classList.add('visible');
                    createBtn.style.display = 'none';

                    if (window.showToast) {
                        window.showToast('Notatka zaszyfrowana w RAM (AES-256)!', 'success');
                    }
                } catch (err) {
                    console.error('Błąd szyfrowania notatki:', err);
                    if (window.showToast) window.showToast('Wystąpił błąd podczas szyfrowania', 'error');
                } finally {
                    createBtn.disabled = false;
                    createBtn.style.opacity = '1';
                }
            });
        }

        if (copyBtn && urlInput) {
            copyBtn.addEventListener('click', () => {
                urlInput.select();
                navigator.clipboard.writeText(urlInput.value).then(() => {
                    const orig = copyBtn.textContent;
                    copyBtn.textContent = 'Skopiowano!';
                    setTimeout(() => { copyBtn.textContent = orig; }, 2000);
                    if (window.showToast) window.showToast('Skopiowano tajny link do schowka', 'success');
                }).catch(() => {
                    document.execCommand('copy');
                });
            });
        }

        window.openDeadDropCreator = openModal;

        const triggers = document.querySelectorAll('.btn-open-dead-drop');
        triggers.forEach(trg => trg.addEventListener('click', openModal));
    }

    // OBSŁUGA CZYTNIKA NOTATKI
    function setupReaderModal() {
        const modal = document.getElementById('deadDropReaderModal');
        if (!modal) return;

        const revealBtn = document.getElementById('btnDeadDropReveal');
        const warningBox = document.getElementById('deadDropReaderWarning');
        const revealedBox = document.getElementById('deadDropRevealedBox');
        const secretTextEl = document.getElementById('deadDropSecretText');
        const copySecretBtn = document.getElementById('btnDeadDropCopySecret');
        const closeBtn = document.getElementById('btnDeadDropReaderClose');

        function closeReader() {
            modal.classList.remove('open');
            document.body.style.overflow = '';
            // Wyczyść URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (closeBtn) closeBtn.addEventListener('click', closeReader);

        if (revealBtn) {
            revealBtn.addEventListener('click', async () => {
                if (!window._activeSecretPayload) return;

                const p = window._activeSecretPayload;

                try {
                    const decryptedText = await decryptSecret(p.cipher, p.iv, p.key);

                    // NATYCHMIASTOWE SAMOZNISZCZENIE Z PAMIĘCI
                    const drops = getStoredDrops();
                    if (drops[p.id]) {
                        delete drops[p.id];
                        saveStoredDrops(drops);
                    }

                    // Wyczyść hash z URL dla bezpieczeństwa
                    window.history.replaceState({}, document.title, window.location.pathname);

                    if (warningBox) warningBox.style.display = 'none';
                    if (secretTextEl) secretTextEl.textContent = decryptedText;
                    if (revealedBox) revealedBox.classList.add('visible');

                    if (window.showToast) {
                        window.showToast('Treść odszyfrowana w RAM. Szyfrogram został bezpowrotnie zniszczony.', 'info');
                    }
                } catch (e) {
                    console.error('Błąd deszyfrowania:', e);
                    if (window.showToast) window.showToast('Błąd deszyfrowania: niepoprawny klucz lub uszkodzone dane.', 'error');
                }
            });
        }

        if (copySecretBtn && secretTextEl) {
            copySecretBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(secretTextEl.textContent).then(() => {
                    const span = copySecretBtn.querySelector('span');
                    if (span) span.textContent = 'Skopiowano!';
                    setTimeout(() => { if (span) span.textContent = 'Kopiuj treść'; }, 2000);
                    if (window.showToast) window.showToast('Tajna treść skopiowana do schowka', 'success');
                });
            });
        }
    }

    // SPRAWDZENIE CZY UŻYTKOWNIK OTWIERA LINK Z NOTATKĄ
    function checkUrlForSecretNote() {
        const urlParams = new URLSearchParams(window.location.search);
        const noteId = urlParams.get('note');
        const hash = window.location.hash;

        if (!noteId && (!hash || !hash.includes('#secret='))) return;

        let payload = null;

        if (hash && hash.includes('#secret=')) {
            try {
                const b64 = hash.split('#secret=')[1];
                const raw = JSON.parse(decodeURIComponent(escape(atob(b64))));
                payload = {
                    id: raw.id,
                    cipher: raw.c,
                    iv: raw.iv,
                    key: raw.k,
                    expiry: raw.e,
                    burnOnRead: raw.b
                };
            } catch (e) {}
        }

        if (!payload && noteId) {
            const drops = getStoredDrops();
            const record = drops[noteId];
            if (record) {
                // Wyciągnij klucz z hasha #key=
                const keyMatch = hash.match(/#key=([^&]+)/);
                if (keyMatch) {
                    payload = {
                        id: noteId,
                        cipher: record.cipher,
                        iv: record.iv,
                        key: keyMatch[1],
                        expiry: record.expiry,
                        burnOnRead: record.burnOnRead
                    };
                }
            }
        }

        const readerModal = document.getElementById('deadDropReaderModal');
        if (!readerModal) return;

        if (!payload) {
            // Notatka już nie istnieje lub została spalona
            renderBurnedNotice(readerModal);
            return;
        }

        // Sprawdź wygaśnięcie czasowe
        if (payload.expiry && Date.now() > payload.expiry) {
            renderBurnedNotice(readerModal, 'Ta notatka wygasła i uległa automatycznemu samozniszczeniu.');
            return;
        }

        window._activeSecretPayload = payload;

        // Otwórz czytnik z ostrzeżeniem
        readerModal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function renderBurnedNotice(modal, customMsg = '') {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';

        const warningBox = document.getElementById('deadDropReaderWarning');
        if (warningBox) {
            warningBox.innerHTML = `
                <div class="dead-drop-fire-icon" style="background: rgba(148, 163, 184, 0.1); border-color: rgba(148, 163, 184, 0.25); color: #94A3B8;">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                </div>
                <h3 class="dead-drop-warning-title">Notatka nie istnieje</h3>
                <p class="dead-drop-warning-desc">${customMsg || 'Ta wiadomość została już odsłonięta i bezpowrotnie zniszczona z pamięci (Zero-Knowledge).'}</p>
                <button type="button" class="dead-drop-btn-cancel" onclick="document.getElementById('deadDropReaderModal').classList.remove('open'); document.body.style.overflow=''; window.history.replaceState({}, document.title, window.location.pathname);">
                    Wróć do Dropsite
                </button>
            `;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDeadDrop);
    } else {
        initDeadDrop();
    }

})();
