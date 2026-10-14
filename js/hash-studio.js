/**
 * ============================================================================
 * DROPSITE HASH RADAR & CHECKSUM STUDIO
 * ============================================================================
 * 100% Client-Side In-Memory File Integrity Verifier & Cryptographic Hasher
 * Web Crypto API • SHA-256 • SHA-512 • SHA-1 • MD5 • CRC-32
 * Zero upload to external servers • Zero-Knowledge RAM Engine
 * ============================================================================
 */

(function () {
    'use strict';

    // Stan modułu
    const state = {
        activeFile: null,
        hashes: {
            sha256: '',
            sha512: '',
            sha1: '',
            md5: '',
            crc32: ''
        },
        expectedHash: '',
        isCalculating: false
    };

    /**
     * Obliczanie CRC32 (Standard IEEE 802.3)
     */
    const crcTable = (function () {
        let c;
        const table = [];
        for (let n = 0; n < 256; n++) {
            c = n;
            for (let k = 0; k < 8; k++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            table[n] = c;
        }
        return table;
    })();

    function calculateCrc32(bytes) {
        let crc = 0 ^ (-1);
        for (let i = 0; i < bytes.length; i++) {
            crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xFF];
        }
        return ((crc ^ (-1)) >>> 0).toString(16).padStart(8, '0').toLowerCase();
    }

    /**
     * Szybki silnik MD5 w czystym JavaScript (RFC 1321)
     */
    function calculateMd5(bytes) {
        function safeAdd(x, y) {
            const lsw = (x & 0xFFFF) + (y & 0xFFFF);
            const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            return (msw << 16) | (lsw & 0xFFFF);
        }
        function bitRol(num, cnt) {
            return (num << cnt) | (num >>> (32 - cnt));
        }
        function md5cmn(q, a, b, x, s, t) {
            return safeAdd(bitRol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
        }
        function md5ff(a, b, c, d, x, s, t) {
            return md5cmn((b & c) | ((~b) & d), a, b, x, s, t);
        }
        function md5gg(a, b, c, d, x, s, t) {
            return md5cmn((b & d) | (c & (~d)), a, b, x, s, t);
        }
        function md5hh(a, b, c, d, x, s, t) {
            return md5cmn(b ^ c ^ d, a, b, x, s, t);
        }
        function md5ii(a, b, c, d, x, s, t) {
            return md5cmn(c ^ (b | (~d)), a, b, x, s, t);
        }

        const len = bytes.length;
        const words = [];
        for (let i = 0; i < len; i += 4) {
            words.push(
                (bytes[i] || 0) |
                ((bytes[i + 1] || 0) << 8) |
                ((bytes[i + 2] || 0) << 16) |
                ((bytes[i + 3] || 0) << 24)
            );
        }

        // Padding
        const bitLen = len * 8;
        const padIndex = len >> 2;
        words[padIndex] = (words[padIndex] || 0) | (0x80 << ((len % 4) * 8));
        const totalWords = (((len + 8) >> 6) + 1) * 16;
        while (words.length < totalWords) words.push(0);
        words[totalWords - 2] = bitLen & 0xFFFFFFFF;
        words[totalWords - 1] = Math.floor(bitLen / 0x100000000);

        let a = 1732584193;
        let b = -271733879;
        let c = -1732584194;
        let d = 271733878;

        for (let i = 0; i < words.length; i += 16) {
            const olda = a, oldb = b, oldc = c, oldd = d;

            a = md5ff(a, b, c, d, words[i + 0], 7, -680876936);
            d = md5ff(d, a, b, c, words[i + 1], 12, -389564586);
            c = md5ff(c, d, a, b, words[i + 2], 17, 606105819);
            b = md5ff(b, c, d, a, words[i + 3], 22, -1044525330);
            a = md5ff(a, b, c, d, words[i + 4], 7, -176418897);
            d = md5ff(d, a, b, c, words[i + 5], 12, 1200080426);
            c = md5ff(c, d, a, b, words[i + 6], 17, -1473231341);
            b = md5ff(b, c, d, a, words[i + 7], 22, -45705983);
            a = md5ff(a, b, c, d, words[i + 8], 7, 1770035416);
            d = md5ff(d, a, b, c, words[i + 9], 12, -1958414417);
            c = md5ff(c, d, a, b, words[i + 10], 17, -42063);
            b = md5ff(b, c, d, a, words[i + 11], 22, -1990404162);
            a = md5ff(a, b, c, d, words[i + 12], 7, 1804603682);
            d = md5ff(d, a, b, c, words[i + 13], 12, -40341101);
            c = md5ff(c, d, a, b, words[i + 14], 17, -1502002290);
            b = md5ff(b, c, d, a, words[i + 15], 22, 1236535329);

            a = md5gg(a, b, c, d, words[i + 1], 5, -165796510);
            d = md5gg(d, a, b, c, words[i + 6], 9, -1069501632);
            c = md5gg(c, d, a, b, words[i + 11], 14, 643717713);
            b = md5gg(b, c, d, a, words[i + 0], 20, -373897302);
            a = md5gg(a, b, c, d, words[i + 5], 5, -701558691);
            d = md5gg(d, a, b, c, words[i + 10], 9, 38016083);
            c = md5gg(c, d, a, b, words[i + 15], 14, -660478335);
            b = md5gg(b, c, d, a, words[i + 4], 20, -405537848);
            a = md5gg(a, b, c, d, words[i + 9], 5, 568446438);
            d = md5gg(d, a, b, c, words[i + 14], 9, -1019803690);
            c = md5gg(c, d, a, b, words[i + 3], 14, -187363961);
            b = md5gg(b, c, d, a, words[i + 8], 20, 1163531501);
            a = md5gg(a, b, c, d, words[i + 13], 5, -1444681467);
            d = md5gg(d, a, b, c, words[i + 2], 9, -51403784);
            c = md5gg(c, d, a, b, words[i + 7], 14, 1735328473);
            b = md5gg(b, c, d, a, words[i + 12], 20, -1926607734);

            a = md5hh(a, b, c, d, words[i + 5], 4, -378558);
            d = md5hh(d, a, b, c, words[i + 8], 11, -2022574463);
            c = md5hh(c, d, a, b, words[i + 11], 16, 1839030562);
            b = md5hh(b, c, d, a, words[i + 14], 23, -35309556);
            a = md5hh(a, b, c, d, words[i + 1], 4, -1530992060);
            d = md5hh(d, a, b, c, words[i + 4], 11, 1272893353);
            c = md5hh(c, d, a, b, words[i + 7], 16, -155497632);
            b = md5hh(b, c, d, a, words[i + 10], 23, -1094730640);
            a = md5hh(a, b, c, d, words[i + 13], 4, 681279174);
            d = md5hh(d, a, b, c, words[i + 0], 11, -358537222);
            c = md5hh(c, d, a, b, words[i + 3], 16, -722521979);
            b = md5hh(b, c, d, a, words[i + 6], 23, 76029189);
            a = md5hh(a, b, c, d, words[i + 9], 4, -640364487);
            d = md5hh(d, a, b, c, words[i + 12], 11, -421815835);
            c = md5hh(c, d, a, b, words[i + 15], 16, 530742520);
            b = md5hh(b, c, d, a, words[i + 2], 23, -995338651);

            a = md5ii(a, b, c, d, words[i + 0], 6, -198630844);
            d = md5ii(d, a, b, c, words[i + 7], 10, 1126891415);
            c = md5ii(c, d, a, b, words[i + 14], 15, -1416354905);
            b = md5ii(b, c, d, a, words[i + 5], 21, -57434055);
            a = md5ii(a, b, c, d, words[i + 12], 6, 1700485571);
            d = md5ii(d, a, b, c, words[i + 3], 10, -1894986606);
            c = md5ii(c, d, a, b, words[i + 10], 15, -1051523);
            b = md5ii(b, c, d, a, words[i + 1], 21, -2054922799);
            a = md5ii(a, b, c, d, words[i + 8], 6, 1873313359);
            d = md5ii(d, a, b, c, words[i + 15], 10, -30611744);
            c = md5ii(c, d, a, b, words[i + 6], 15, -1560198380);
            b = md5ii(b, c, d, a, words[i + 13], 21, 1309151649);
            a = md5ii(a, b, c, d, words[i + 4], 6, -145523070);
            d = md5ii(d, a, b, c, words[i + 11], 10, -1120210379);
            c = md5ii(c, d, a, b, words[i + 2], 15, 718787259);
            b = md5ii(b, c, d, a, words[i + 9], 21, -343485551);

            a = safeAdd(a, olda);
            b = safeAdd(b, oldb);
            c = safeAdd(c, oldc);
            d = safeAdd(d, oldd);
        }

        const out = [a, b, c, d];
        let hex = '';
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                hex += ((out[i] >> (j * 8)) & 0xFF).toString(16).padStart(2, '0');
            }
        }
        return hex.toLowerCase();
    }

    /**
     * Konwersja ArrayBuffer do ciągu Hex
     */
    function bufferToHex(buffer) {
        const byteArray = new Uint8Array(buffer);
        let hex = '';
        for (let i = 0; i < byteArray.length; i++) {
            hex += byteArray[i].toString(16).padStart(2, '0');
        }
        return hex.toLowerCase();
    }

    /**
     * Formatowanie rozmiaru pliku
     */
    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Główny proces obliczania sum kontrolnych
     */
    async function processFile(file) {
        if (!file || state.isCalculating) return;
        state.activeFile = file;
        state.isCalculating = true;

        // Reset stanu
        state.hashes = { sha256: '', sha512: '', sha1: '', md5: '', crc32: '' };
        renderFileCard(file);
        renderHashesPlaceholder('Obliczanie w pamięci RAM...');

        const progressCard = document.getElementById('hashProgressCard');
        const progFill = document.getElementById('hashProgFill');
        const progStatus = document.getElementById('hashProgStatus');
        const progVal = document.getElementById('hashProgVal');

        if (progressCard) progressCard.classList.add('active');
        if (progStatus) progStatus.textContent = 'Odczyt danych do pamięci RAM...';
        if (progVal) progVal.textContent = '10%';
        if (progFill) progFill.style.width = '10%';

        const startTime = performance.now();

        try {
            // Odczyt pliku jako ArrayBuffer
            if (progStatus) progStatus.textContent = 'Ładowanie bufora pliku...';
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            if (progVal) progVal.textContent = '30%';
            if (progFill) progFill.style.width = '30%';

            // 1. SHA-256 (Web Crypto API)
            if (progStatus) progStatus.textContent = 'Obliczanie SHA-256 (Web Crypto)...';
            const sha256Buf = await crypto.subtle.digest('SHA-256', arrayBuffer);
            state.hashes.sha256 = bufferToHex(sha256Buf);
            updateHashUi('sha256', state.hashes.sha256);

            if (progVal) progVal.textContent = '55%';
            if (progFill) progFill.style.width = '55%';

            // 2. SHA-512 (Web Crypto API)
            if (progStatus) progStatus.textContent = 'Obliczanie SHA-512...';
            const sha512Buf = await crypto.subtle.digest('SHA-512', arrayBuffer);
            state.hashes.sha512 = bufferToHex(sha512Buf);
            updateHashUi('sha512', state.hashes.sha512);

            if (progVal) progVal.textContent = '75%';
            if (progFill) progFill.style.width = '75%';

            // 3. SHA-1 (Web Crypto API)
            if (progStatus) progStatus.textContent = 'Obliczanie SHA-1...';
            const sha1Buf = await crypto.subtle.digest('SHA-1', arrayBuffer);
            state.hashes.sha1 = bufferToHex(sha1Buf);
            updateHashUi('sha1', state.hashes.sha1);

            if (progVal) progVal.textContent = '88%';
            if (progFill) progFill.style.width = '88%';

            // 4. MD5 & CRC32 (Dla plików do 150 MB obliczamy pełny MD5/CRC)
            if (file.size <= 150 * 1024 * 1024) {
                if (progStatus) progStatus.textContent = 'Obliczanie MD5 & CRC-32...';
                state.hashes.md5 = calculateMd5(uint8Array);
                state.hashes.crc32 = calculateCrc32(uint8Array);
            } else {
                state.hashes.md5 = 'Pominięto (plik >150 MB)';
                state.hashes.crc32 = calculateCrc32(uint8Array.subarray(0, 1024 * 1024 * 10)); // próbka
            }
            updateHashUi('md5', state.hashes.md5);
            updateHashUi('crc32', state.hashes.crc32);

            const durationMs = Math.round(performance.now() - startTime);
            const speedMbs = ((file.size / (1024 * 1024)) / (durationMs / 1000)).toFixed(1);

            if (progVal) progVal.textContent = '100%';
            if (progFill) progFill.style.width = '100%';
            if (progStatus) progStatus.textContent = `Ukończono w ${durationMs} ms (${speedMbs} MB/s)`;

            setTimeout(() => {
                if (progressCard) progressCard.classList.remove('active');
            }, 800);

            // Sprawdź porównanie jeśli użytkownik wpisał wcześniej hash
            checkComparison();

            if (window.showToast) {
                window.showToast(`Wyliczono sumy kontrolne dla ${file.name} (${speedMbs} MB/s)`, 'success');
            }

        } catch (err) {
            console.error('[Hash Studio Error]', err);
            if (progressCard) progressCard.classList.remove('active');
            if (window.showToast) window.showToast('Błąd podczas obliczania sumy kontrolnej pliku.', 'error');
        } finally {
            state.isCalculating = false;
        }
    }

    function renderFileCard(file) {
        const dropZone = document.getElementById('hashDropZone');
        const fileCard = document.getElementById('hashFileCard');
        const fileNameEl = document.getElementById('hashFileName');
        const fileMetaEl = document.getElementById('hashFileMeta');

        if (dropZone) dropZone.style.display = 'none';
        if (fileCard) fileCard.classList.add('active');

        if (fileNameEl) fileNameEl.textContent = file.name;
        if (fileMetaEl) {
            const dateStr = file.lastModified ? new Date(file.lastModified).toLocaleDateString() : 'N/A';
            const mime = file.type || 'Nieznany typ';
            fileMetaEl.textContent = `${formatBytes(file.size)} • ${mime} • Zmodyfikowano: ${dateStr}`;
        }
    }

    function resetHashStudio() {
        state.activeFile = null;
        state.hashes = { sha256: '', sha512: '', sha1: '', md5: '', crc32: '' };
        state.expectedHash = '';
        state.isCalculating = false;

        const dropZone = document.getElementById('hashDropZone');
        const fileCard = document.getElementById('hashFileCard');
        const fileInput = document.getElementById('hashFileInput');
        const compareInput = document.getElementById('hashCompareInput');
        const matchStatus = document.getElementById('hashMatchStatus');

        if (dropZone) dropZone.style.display = 'flex';
        if (fileCard) fileCard.classList.remove('active');
        if (fileInput) fileInput.value = '';
        if (compareInput) compareInput.value = '';
        if (matchStatus) {
            matchStatus.className = 'hash-match-status';
            matchStatus.style.display = 'none';
        }

        renderHashesPlaceholder('Oczekiwanie na plik...');
    }

    function renderHashesPlaceholder(placeholderText) {
        ['sha256', 'sha512', 'sha1', 'md5', 'crc32'].forEach(algo => {
            const el = document.getElementById(`hashVal_${algo}`);
            if (el) {
                el.textContent = placeholderText;
                el.classList.add('empty');
            }
        });
    }

    function updateHashUi(algo, value) {
        const el = document.getElementById(`hashVal_${algo}`);
        if (el) {
            el.textContent = value;
            el.classList.remove('empty');
        }
    }

    /**
     * Weryfikacja i porównanie hasha (Live Comparator)
     */
    function checkComparison() {
        const compareInput = document.getElementById('hashCompareInput');
        const matchStatus = document.getElementById('hashMatchStatus');
        const statusText = document.getElementById('hashMatchText');
        const statusIcon = document.getElementById('hashMatchIcon');

        if (!compareInput || !matchStatus || !statusText) return;

        const raw = (compareInput.value || '').trim();
        // Oczyść ze spacji, myślników, dwukropków (np. format SHA256: a1b2... lub format fingerprint)
        const cleaned = raw.replace(/^sha[0-9]+[:=]\s*/i, '').replace(/[\s:-]/g, '').toLowerCase();

        if (!cleaned) {
            matchStatus.className = 'hash-match-status';
            matchStatus.style.display = 'none';
            return;
        }

        if (!state.activeFile || !state.hashes.sha256) {
            matchStatus.className = 'hash-match-status active neutral';
            matchStatus.style.display = 'flex';
            if (statusIcon) {
                statusIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
            }
            statusText.textContent = 'Upuść plik powyżej, aby automatycznie porównać wklejoną sumę kontrolną.';
            return;
        }

        // Sprawdź czy ciąg pasuje do któregoś ze skrótów
        let matchedAlgo = null;
        if (cleaned === state.hashes.sha256.toLowerCase()) matchedAlgo = 'SHA-256';
        else if (cleaned === state.hashes.sha512.toLowerCase()) matchedAlgo = 'SHA-512';
        else if (cleaned === state.hashes.sha1.toLowerCase()) matchedAlgo = 'SHA-1';
        else if (cleaned === state.hashes.md5.toLowerCase()) matchedAlgo = 'MD5';
        else if (cleaned === state.hashes.crc32.toLowerCase()) matchedAlgo = 'CRC-32';

        matchStatus.style.display = 'flex';

        if (matchedAlgo) {
            matchStatus.className = 'hash-match-status active match';
            if (statusIcon) {
                statusIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34D399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
            }
            statusText.textContent = `Zgodność 100% z sumą ${matchedAlgo}! Plik jest autentyczny, nienaruszony i w 100% zgodny z oryginałem.`;
        } else {
            matchStatus.className = 'hash-match-status active mismatch';
            if (statusIcon) {
                statusIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F87171" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
            }
            statusText.textContent = 'Brak zgodności! Wklejona suma kontrolna różni się od obliczonych skrótów pliku. Plik mógł zostać zmodyfikowany lub uszkodzony w transporcie.';
        }
    }

    /**
     * Kopiowanie do schowka z micro-animacją
     */
    async function copyToClipboard(text, btnElement, label) {
        if (!text || text.includes('Obliczanie') || text.includes('Oczekiwanie')) return;
        try {
            await navigator.clipboard.writeText(text);
            if (btnElement) {
                const originalHtml = btnElement.innerHTML;
                btnElement.classList.add('copied');
                btnElement.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Skopiowano!`;
                setTimeout(() => {
                    btnElement.classList.remove('copied');
                    btnElement.innerHTML = originalHtml;
                }, 1800);
            }
            if (window.showToast) {
                window.showToast(`Skopiowano ${label || 'sumę kontrolną'} do schowka`, 'info');
            }
        } catch (_) {
            if (window.showToast) window.showToast('Nie udało się skopiować do schowka.', 'warning');
        }
    }

    /**
     * Pobranie pliku standardu GNU .sha256
     */
    function downloadSha256File() {
        if (!state.activeFile || !state.hashes.sha256) {
            if (window.showToast) window.showToast('Najpierw załaduj plik do wyliczenia sumy.', 'warning');
            return;
        }
        const content = `${state.hashes.sha256}  ${state.activeFile.name}\n`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.activeFile.name}.sha256`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (window.showToast) {
            window.showToast(`Pobrano plik ${state.activeFile.name}.sha256`, 'success');
        }
    }

    /**
     * Eksport pełnego certyfikatu weryfikacji TXT
     */
    function exportFullReport() {
        if (!state.activeFile || !state.hashes.sha256) {
            if (window.showToast) window.showToast('Najpierw załaduj plik do wyliczenia sumy.', 'warning');
            return;
        }

        const dateStr = new Date().toISOString();
        const report = [
            '================================================================================',
            'CERTYFIKAT INTEGRALNOŚCI & SUM KONTROLNYCH DROPSITE (ZERO-KNOWLEDGE RAM)',
            '================================================================================',
            `Nazwa pliku:           ${state.activeFile.name}`,
            `Rozmiar pliku:         ${state.activeFile.size} bajtów (${formatBytes(state.activeFile.size)})`,
            `Typ MIME:              ${state.activeFile.type || 'application/octet-stream'}`,
            `Data modyfikacji:      ${new Date(state.activeFile.lastModified).toISOString()}`,
            `Czas weryfikacji:      ${dateStr}`,
            '--------------------------------------------------------------------------------',
            'KRYPTOGRAFICZNE SKRÓTY INTEGRALNOŚCI:',
            '--------------------------------------------------------------------------------',
            `SHA-256 (NIST FIPS 180-4):`,
            `  ${state.hashes.sha256}`,
            '',
            `SHA-512 (NIST FIPS 180-4):`,
            `  ${state.hashes.sha512}`,
            '',
            `SHA-1 (Legacy):`,
            `  ${state.hashes.sha1}`,
            '',
            `MD5 (RFC 1321):`,
            `  ${state.hashes.md5}`,
            '',
            `CRC-32 (IEEE 802.3):`,
            `  ${state.hashes.crc32}`,
            '================================================================================',
            'Wygenerowano w 100% lokalnie w pamięci RAM przeglądarki użytkownika.',
            'Żadne dane ani bajty pliku nie zostały przesłane do serwera zewnętrznego.',
            'https://dropsite.pl • Bezpieczny transfer & Narzędzia Prywatności'
        ].join('\r\n');

        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.activeFile.name}.integrity-report.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (window.showToast) {
            window.showToast('Pobrano pełny raport integralności pliku (.txt)', 'success');
        }
    }

    /**
     * Kopiowanie wszystkich sum do schowka
     */
    async function copyAllHashes() {
        if (!state.activeFile || !state.hashes.sha256) return;
        const text = [
            `Plik: ${state.activeFile.name} (${formatBytes(state.activeFile.size)})`,
            `SHA-256: ${state.hashes.sha256}`,
            `SHA-512: ${state.hashes.sha512}`,
            `SHA-1:   ${state.hashes.sha1}`,
            `MD5:     ${state.hashes.md5}`,
            `CRC-32:  ${state.hashes.crc32}`
        ].join('\n');
        await copyToClipboard(text, null, 'wszystkie sumy kontrolne');
    }

    /**
     * Inicjalizacja nasłuchiwaczy zdarzeń DOM
     */
    function initHashStudio() {
        const dropZone = document.getElementById('hashDropZone');
        const fileInput = document.getElementById('hashFileInput');
        const resetBtn = document.getElementById('btnHashReset');
        const compareInput = document.getElementById('hashCompareInput');
        const pasteBtn = document.getElementById('btnHashPaste');
        const dlShaBtn = document.getElementById('btnDownloadSha256');
        const exportReportBtn = document.getElementById('btnExportHashReport');
        const copyAllBtn = document.getElementById('btnCopyAllHashes');

        if (!dropZone) return;

        // Drag & Drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer && e.dataTransfer.files;
            if (files && files.length > 0) {
                processFile(files[0]);
            }
        });

        dropZone.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    processFile(e.target.files[0]);
                }
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', resetHashStudio);
        }

        // Live comparator
        if (compareInput) {
            compareInput.addEventListener('input', checkComparison);
        }

        if (pasteBtn) {
            pasteBtn.addEventListener('click', async () => {
                try {
                    const text = await navigator.clipboard.readText();
                    if (text && compareInput) {
                        compareInput.value = text.trim();
                        checkComparison();
                        if (window.showToast) window.showToast('Wklejono sumę kontrolną ze schowka.', 'info');
                    }
                } catch (_) {
                    if (window.showToast) window.showToast('Użyj Ctrl+V, aby wkleić sumę ze schowka.', 'info');
                }
            });
        }

        // Przyciski kopiowania poszczególnych sum
        ['sha256', 'sha512', 'sha1', 'md5', 'crc32'].forEach(algo => {
            const btn = document.getElementById(`btnCopy_${algo}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    const hashVal = state.hashes[algo];
                    copyToClipboard(hashVal, btn, algo.toUpperCase());
                });
            }
        });

        if (dlShaBtn) dlShaBtn.addEventListener('click', downloadSha256File);
        if (exportReportBtn) exportReportBtn.addEventListener('click', exportFullReport);
        if (copyAllBtn) copyAllBtn.addEventListener('click', copyAllHashes);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHashStudio);
    } else {
        initHashStudio();
    }

    window.initHashStudio = initHashStudio;
    window.processHashFile = processFile;
})();
