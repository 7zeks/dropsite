/**
 * ============================================================================
 * DROPSITE STEGO STUDIO & CAMOUFLAGE (LSB STEGANOGRAPHY IN RAM)
 * ============================================================================
 * 100% Client-Side In-Memory Steganography & AES-GCM Encrypted Payload
 * Zero bytes sent to server • Zero-Knowledge
 * ============================================================================
 */

(function () {
    'use strict';

    const MAGIC_HEADER = [0x44, 0x53, 0x53, 0x54]; // 'DSST' (Dropsite Stego)
    const VERSION = 1;

    // Stan modułu
    const state = {
        carrierImage: null,     // Obraz nośnik (File)
        carrierBitmap: null,    // ImageBitmap / Image
        carrierCanvas: null,
        secretFile: null,       // Ukrywany plik (File)
        revealImage: null,      // Obraz do zbadania (File)
        revealBitmap: null
    };

    /**
     * Wyprowadzenie klucza AES-256-GCM z hasła i soli (PBKDF2 100,000 rund)
     */
    async function deriveAesKey(password, salt) {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            enc.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Szyfrowanie ładunku AES-GCM
     */
    async function encryptPayload(dataBytes, password) {
        if (!password) {
            return {
                isEncrypted: false,
                salt: new Uint8Array(0),
                iv: new Uint8Array(0),
                cipherBytes: dataBytes
            };
        }
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveAesKey(password, salt);
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            dataBytes
        );
        return {
            isEncrypted: true,
            salt: salt,
            iv: iv,
            cipherBytes: new Uint8Array(encrypted)
        };
    }

    /**
     * Deszyfrowanie ładunku AES-GCM
     */
    async function decryptPayload(cipherBytes, password, salt, iv) {
        if (!salt || salt.length === 0) return cipherBytes;
        if (!password) throw new Error('Wymagane hasło do odblokowania ukrytego pliku.');
        const key = await deriveAesKey(password, salt);
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            cipherBytes
        );
        return new Uint8Array(decrypted);
    }

    /**
     * Kodowanie binarne do formatu DSST
     */
    function serializePackage(meta, cipherBytes) {
        const enc = new TextEncoder();
        const nameBytes = enc.encode(meta.filename || 'secret.bin');
        const mimeBytes = enc.encode(meta.mimeType || 'application/octet-stream');

        // Rozmiar nagłówka:
        // 4B magic + 1B ver + 1B isEncrypted + 2B nameLen + N bytes + 2B mimeLen + M bytes + 4B payloadLen + 16B salt + 12B iv
        const saltLen = meta.isEncrypted ? 16 : 0;
        const ivLen = meta.isEncrypted ? 12 : 0;
        const totalSize = 4 + 1 + 1 + 2 + nameBytes.length + 2 + mimeBytes.length + 4 + saltLen + ivLen + cipherBytes.length;

        const buffer = new Uint8Array(totalSize);
        const view = new DataView(buffer.buffer);
        let offset = 0;

        // 1. Magic
        buffer.set(MAGIC_HEADER, offset); offset += 4;
        // 2. Version
        buffer[offset++] = VERSION;
        // 3. Flags
        buffer[offset++] = meta.isEncrypted ? 1 : 0;
        // 4. Filename
        view.setUint16(offset, nameBytes.length, false); offset += 2;
        buffer.set(nameBytes, offset); offset += nameBytes.length;
        // 5. MIME
        view.setUint16(offset, mimeBytes.length, false); offset += 2;
        buffer.set(mimeBytes, offset); offset += mimeBytes.length;
        // 6. Payload Length
        view.setUint32(offset, cipherBytes.length, false); offset += 4;
        // 7. Salt & IV
        if (meta.isEncrypted) {
            buffer.set(meta.salt, offset); offset += 16;
            buffer.set(meta.iv, offset); offset += 12;
        }
        // 8. Payload
        buffer.set(cipherBytes, offset);

        return buffer;
    }

    /**
     * Wtłoczenie bajtów do pikseli obrazu (LSB w kanałach R, G, B)
     */
    function embedBitsIntoImageData(imageData, packageBytes) {
        const data = imageData.data;
        const totalPixels = imageData.width * imageData.height;
        const availableBits = totalPixels * 3; // 3 kanały RGB
        const neededBits = packageBytes.length * 8;

        if (neededBits > availableBits) {
            throw new Error(`Plik jest za duży dla wybranego obrazu. Wymagane: ${(neededBits / 8 / 1024).toFixed(1)} KB, Dostępne: ${(availableBits / 8 / 1024).toFixed(1)} KB.`);
        }

        let byteIdx = 0;
        let bitIdx = 7; // od MSB do LSB

        let channelCount = 0;
        for (let i = 0; i < data.length; i += 4) {
            // Kanały R, G, B
            for (let c = 0; c < 3; c++) {
                if (byteIdx < packageBytes.length) {
                    const currentByte = packageBytes[byteIdx];
                    const bit = (currentByte >> bitIdx) & 1;

                    data[i + c] = (data[i + c] & 0xFE) | bit;

                    bitIdx--;
                    if (bitIdx < 0) {
                        bitIdx = 7;
                        byteIdx++;
                    }
                }
            }
            // Kanał Alpha zachowujemy na 255 (pełna nieprzezroczystość dla ochrony danych)
            data[i + 3] = 255;
        }

        return imageData;
    }

    /**
     * Ekstrakcja pakietu DSST z pikseli obrazu
     */
    function extractPackageFromImageData(imageData) {
        const data = imageData.data;
        // 1. Zbadaj pierwsze 4 bajty magiczne (4 * 8 = 32 bity = 32 kanały)
        const magicBits = [];
        let chCount = 0;
        for (let i = 0; i < data.length && chCount < 32; i += 4) {
            for (let c = 0; c < 3 && chCount < 32; c++) {
                magicBits.push(data[i + c] & 1);
                chCount++;
            }
        }

        const magicBytes = [];
        for (let b = 0; b < 4; b++) {
            let val = 0;
            for (let bit = 0; bit < 8; bit++) {
                val = (val << 1) | magicBits[b * 8 + bit];
            }
            magicBytes.push(val);
        }

        const isValid = magicBytes[0] === MAGIC_HEADER[0] &&
                        magicBytes[1] === MAGIC_HEADER[1] &&
                        magicBytes[2] === MAGIC_HEADER[2] &&
                        magicBytes[3] === MAGIC_HEADER[3];

        if (!isValid) {
            throw new Error('W tym obrazie nie wykryto ukrytego pliku Dropsite Stego.');
        }

        // Pobieramy bity do odczytu nagłówka
        function readBitStream() {
            let pixelIdx = 0;
            let channelIdx = 0;
            return {
                readByte: function () {
                    let val = 0;
                    for (let b = 0; b < 8; b++) {
                        const bit = data[pixelIdx + channelIdx] & 1;
                        val = (val << 1) | bit;
                        channelIdx++;
                        if (channelIdx === 3) {
                            channelIdx = 0;
                            pixelIdx += 4;
                        }
                    }
                    return val;
                },
                readBytes: function (count) {
                    const arr = new Uint8Array(count);
                    for (let i = 0; i < count; i++) {
                        arr[i] = this.readByte();
                    }
                    return arr;
                },
                readUint16: function () {
                    const b1 = this.readByte();
                    const b2 = this.readByte();
                    return (b1 << 8) | b2;
                },
                readUint32: function () {
                    const b1 = this.readByte();
                    const b2 = this.readByte();
                    const b3 = this.readByte();
                    const b4 = this.readByte();
                    return ((b1 << 24) >>> 0) | (b2 << 16) | (b3 << 8) | b4;
                }
            };
        }

        const stream = readBitStream();
        // Skip magic (4B)
        stream.readBytes(4);

        const version = stream.readByte();
        const isEncrypted = stream.readByte() === 1;

        const nameLen = stream.readUint16();
        const nameBytes = stream.readBytes(nameLen);
        const filename = new TextDecoder().decode(nameBytes);

        const mimeLen = stream.readUint16();
        const mimeBytes = stream.readBytes(mimeLen);
        const mimeType = new TextDecoder().decode(mimeBytes);

        const payloadLen = stream.readUint32();

        let salt = new Uint8Array(0);
        let iv = new Uint8Array(0);
        if (isEncrypted) {
            salt = stream.readBytes(16);
            iv = stream.readBytes(12);
        }

        const cipherBytes = stream.readBytes(payloadLen);

        return {
            filename: filename,
            mimeType: mimeType,
            isEncrypted: isEncrypted,
            salt: salt,
            iv: iv,
            cipherBytes: cipherBytes
        };
    }

    /**
     * Inicjalizacja interfejsu UI
     */
    function initStegoUI() {
        const tabEncode = document.getElementById('stegoTabEncode');
        const tabDecode = document.getElementById('stegoTabDecode');
        const paneEncode = document.getElementById('stegoPaneEncode');
        const paneDecode = document.getElementById('stegoPaneDecode');

        if (tabEncode && tabDecode && paneEncode && paneDecode) {
            tabEncode.addEventListener('click', () => {
                tabEncode.classList.add('active');
                tabDecode.classList.remove('active');
                paneEncode.classList.add('active');
                paneDecode.classList.remove('active');
            });
            tabDecode.addEventListener('click', () => {
                tabDecode.classList.add('active');
                tabEncode.classList.remove('active');
                paneDecode.classList.add('active');
                paneEncode.classList.remove('active');
            });
        }

        // ==========================================
        // ENCODE: DROP CARRIER & SECRET
        // ==========================================
        const carrierBox = document.getElementById('stegoCarrierBox');
        const carrierInput = document.getElementById('stegoCarrierInput');
        const secretBox = document.getElementById('stegoSecretBox');
        const secretInput = document.getElementById('stegoSecretInput');
        const btnExecuteEncode = document.getElementById('stegoBtnExecuteEncode');
        const encodeResult = document.getElementById('stegoEncodeResult');

        function updateCapacityGauge() {
            const gaugeFill = document.getElementById('stegoCapFill');
            const gaugeText = document.getElementById('stegoCapText');
            const gaugeReq = document.getElementById('stegoCapReq');

            if (!state.carrierBitmap) {
                if (gaugeText) gaugeText.textContent = 'Najpierw wybierz obraz nośnik';
                if (gaugeFill) gaugeFill.style.width = '0%';
                if (btnExecuteEncode) btnExecuteEncode.disabled = true;
                return;
            }

            const maxBits = state.carrierBitmap.width * state.carrierBitmap.height * 3;
            const maxBytes = Math.floor(maxBits / 8);
            const reqBytes = state.secretFile ? state.secretFile.size + 128 : 0; // +128B na nagłówek

            if (gaugeText) gaugeText.textContent = `${formatBytes(reqBytes)} z ${formatBytes(maxBytes)}`;

            if (reqBytes === 0) {
                if (gaugeFill) {
                    gaugeFill.style.width = '0%';
                    gaugeFill.className = 'stego-progress-bar-fill';
                }
                if (btnExecuteEncode) btnExecuteEncode.disabled = true;
                return;
            }

            const pct = Math.min(100, Math.round((reqBytes / maxBytes) * 100));
            if (gaugeFill) {
                gaugeFill.style.width = `${pct}%`;
                if (pct > 95) {
                    gaugeFill.className = 'stego-progress-bar-fill danger';
                } else if (pct > 75) {
                    gaugeFill.className = 'stego-progress-bar-fill warning';
                } else {
                    gaugeFill.className = 'stego-progress-bar-fill';
                }
            }

            if (reqBytes > maxBytes) {
                if (gaugeReq) gaugeReq.textContent = 'Plik przekracza pojemność obrazu! Wybierz większe zdjęcie.';
                if (btnExecuteEncode) btnExecuteEncode.disabled = true;
            } else {
                if (gaugeReq) gaugeReq.textContent = `Wykorzystanie przestrzeni: ${pct}%`;
                if (btnExecuteEncode) btnExecuteEncode.disabled = false;
            }
        }

        // Obsługa nośnika (Carrier Image)
        if (carrierBox && carrierInput) {
            carrierBox.addEventListener('click', () => carrierInput.click());
            carrierBox.addEventListener('dragover', (e) => { e.preventDefault(); carrierBox.classList.add('drag-over'); });
            carrierBox.addEventListener('dragleave', () => carrierBox.classList.remove('drag-over'));
            carrierBox.addEventListener('drop', (e) => {
                e.preventDefault();
                carrierBox.classList.remove('drag-over');
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    loadCarrierFile(e.dataTransfer.files[0]);
                }
            });
            carrierInput.addEventListener('change', () => {
                if (carrierInput.files && carrierInput.files[0]) {
                    loadCarrierFile(carrierInput.files[0]);
                }
            });
        }

        function loadCarrierFile(file) {
            if (!file.type.startsWith('image/')) {
                if (window.showToast) window.showToast('Wybierz plik graficzny (PNG, JPG, WebP) jako nośnik.', 'warning');
                return;
            }
            state.carrierImage = file;
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                state.carrierBitmap = img;
                carrierBox.classList.add('is-loaded');
                const thumb = document.getElementById('stegoCarrierThumb');
                const nameEl = document.getElementById('stegoCarrierName');
                const metaEl = document.getElementById('stegoCarrierMeta');
                if (thumb) thumb.src = url;
                if (nameEl) nameEl.textContent = file.name;
                if (metaEl) metaEl.textContent = `${img.width} × ${img.height} px • ${formatBytes(file.size)}`;
                updateCapacityGauge();
            };
            img.src = url;
        }

        // Obsługa ukrywanego pliku (Secret File)
        if (secretBox && secretInput) {
            secretBox.addEventListener('click', () => secretInput.click());
            secretBox.addEventListener('dragover', (e) => { e.preventDefault(); secretBox.classList.add('drag-over'); });
            secretBox.addEventListener('dragleave', () => secretBox.classList.remove('drag-over'));
            secretBox.addEventListener('drop', (e) => {
                e.preventDefault();
                secretBox.classList.remove('drag-over');
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    loadSecretFile(e.dataTransfer.files[0]);
                }
            });
            secretInput.addEventListener('change', () => {
                if (secretInput.files && secretInput.files[0]) {
                    loadSecretFile(secretInput.files[0]);
                }
            });
        }

        function loadSecretFile(file) {
            state.secretFile = file;
            secretBox.classList.add('is-loaded');
            const nameEl = document.getElementById('stegoSecretName');
            const metaEl = document.getElementById('stegoSecretMeta');
            if (nameEl) nameEl.textContent = file.name;
            if (metaEl) metaEl.textContent = `${file.type || 'Plik binarny'} • ${formatBytes(file.size)}`;
            updateCapacityGauge();
        }

        // Uruchomienie kodowania LSB
        if (btnExecuteEncode) {
            btnExecuteEncode.addEventListener('click', async () => {
                if (!state.carrierBitmap || !state.secretFile) return;

                btnExecuteEncode.disabled = true;
                btnExecuteEncode.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg> Wtapianie danych w piksele...`;

                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = state.carrierBitmap.width;
                    canvas.height = state.carrierBitmap.height;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    ctx.drawImage(state.carrierBitmap, 0, 0);

                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                    // 1. Odczyt sekretnego pliku
                    const secretBuf = await state.secretFile.arrayBuffer();
                    const secretBytes = new Uint8Array(secretBuf);

                    // 2. Szyfrowanie (jeśli podano hasło)
                    const pwdInput = document.getElementById('stegoEncodePassword');
                    const password = pwdInput ? pwdInput.value.trim() : '';

                    const encResult = await encryptPayload(secretBytes, password);

                    // 3. Serializacja pakietu
                    const meta = {
                        filename: state.secretFile.name,
                        mimeType: state.secretFile.type || 'application/octet-stream',
                        isEncrypted: encResult.isEncrypted,
                        salt: encResult.salt,
                        iv: encResult.iv
                    };
                    const pkg = serializePackage(meta, encResult.cipherBytes);

                    // 4. Wtłoczenie bitów LSB
                    embedBitsIntoImageData(imageData, pkg);
                    ctx.putImageData(imageData, 0, 0);

                    // 5. Eksport PNG
                    canvas.toBlob((blob) => {
                        const cleanUrl = URL.createObjectURL(blob);
                        if (encodeResult) encodeResult.classList.add('active');

                        const resThumb = document.getElementById('stegoResThumb');
                        const resName = document.getElementById('stegoResName');
                        const resSize = document.getElementById('stegoResSize');
                        const btnDl = document.getElementById('stegoBtnDownloadEncoded');
                        const btnSend = document.getElementById('stegoBtnSendEncoded');

                        if (resThumb) resThumb.src = cleanUrl;
                        if (resName) resName.textContent = `camouflaged_${state.secretFile.name.replace(/\.[^/.]+$/, '')}.png`;
                        if (resSize) resSize.textContent = `${formatBytes(blob.size)} • PNG Bezstratny`;

                        if (btnDl) {
                            btnDl.onclick = () => {
                                const a = document.createElement('a');
                                a.href = cleanUrl;
                                a.download = `camouflaged_${state.secretFile.name.replace(/\.[^/.]+$/, '')}.png`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                            };
                        }

                        if (btnSend) {
                            btnSend.onclick = () => {
                                const target = new File([blob], `camouflaged_${state.secretFile.name.replace(/\.[^/.]+$/, '')}.png`, { type: 'image/png' });
                                const navHome = document.querySelector('.nav-btn[data-target="view-glowna"]');
                                if (navHome) navHome.click();
                                setTimeout(() => {
                                    if (typeof window.handleFilesSelectionDirectly === 'function') {
                                        window.handleFilesSelectionDirectly([target]);
                                    } else {
                                        const mainInput = document.getElementById('fileInput');
                                        if (mainInput) {
                                            const dt = new DataTransfer();
                                            dt.items.add(target);
                                            mainInput.files = dt.files;
                                            mainInput.dispatchEvent(new Event('change', { bubbles: true }));
                                        }
                                    }
                                }, 200);
                            };
                        }

                        if (window.showToast) window.showToast('Kamuflaż ukończony. Plik został ukryty w strukturze pikseli.', 'success');
                        btnExecuteEncode.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><circle cx="12" cy="12" r="2.5"></circle></svg> Wygenerowano pomyślnie`;
                    }, 'image/png');

                } catch (err) {
                    console.error('[Stego Error]', err);
                    if (window.showToast) window.showToast(err.message || 'Wystąpił błąd podczas wtapiania danych.', 'error');
                    btnExecuteEncode.disabled = false;
                    btnExecuteEncode.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><circle cx="12" cy="12" r="2.5"></circle></svg> Wygeneruj zakamuflowany obraz`;
                }
            });
        }

        // ==========================================
        // DECODE: REVEAL SECRET FROM IMAGE
        // ==========================================
        const revealDropBox = document.getElementById('stegoRevealBox');
        const revealFileInput = document.getElementById('stegoRevealFileInput');
        const revealActionWrap = document.getElementById('stegoRevealActionWrap');
        const btnExecuteReveal = document.getElementById('stegoBtnExecuteReveal');
        const revealPasswordInput = document.getElementById('stegoRevealPassword');
        const revealResultCard = document.getElementById('stegoRevealResultCard');

        if (revealDropBox && revealFileInput) {
            revealDropBox.addEventListener('click', () => revealFileInput.click());
            revealDropBox.addEventListener('dragover', (e) => { e.preventDefault(); revealDropBox.classList.add('drag-over'); });
            revealDropBox.addEventListener('dragleave', () => revealDropBox.classList.remove('drag-over'));
            revealDropBox.addEventListener('drop', (e) => {
                e.preventDefault();
                revealDropBox.classList.remove('drag-over');
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    loadRevealFile(e.dataTransfer.files[0]);
                }
            });
            revealFileInput.addEventListener('change', () => {
                if (revealFileInput.files && revealFileInput.files[0]) {
                    loadRevealFile(revealFileInput.files[0]);
                }
            });
        }

        let pendingDecryption = null;

        function loadRevealFile(file) {
            state.revealImage = file;
            revealDropBox.classList.add('is-loaded');

            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                state.revealBitmap = img;
                const thumb = document.getElementById('stegoRevealThumb');
                const nameEl = document.getElementById('stegoRevealName');
                const metaEl = document.getElementById('stegoRevealMeta');
                if (thumb) thumb.src = url;
                if (nameEl) nameEl.textContent = file.name;
                if (metaEl) metaEl.textContent = `${img.width} × ${img.height} px • ${formatBytes(file.size)}`;

                // Sprawdzamy obecność sygnatury DSST
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                    const pkg = extractPackageFromImageData(imageData);
                    pendingDecryption = pkg;

                    if (revealActionWrap) revealActionWrap.style.display = 'flex';
                    const passRow = document.getElementById('stegoRevealPasswordRow');
                    if (passRow) passRow.style.display = pkg.isEncrypted ? 'flex' : 'none';

                    if (window.showToast) window.showToast('Wykryto ukryty plik Dropsite Stego! Kliknij Odzyskaj.', 'success');
                } catch (err) {
                    pendingDecryption = null;
                    if (revealActionWrap) revealActionWrap.style.display = 'none';
                    if (window.showToast) window.showToast(err.message || 'W tym obrazie nie ma ukrytego pliku.', 'warning');
                }
            };
            img.src = url;
        }

        if (btnExecuteReveal) {
            btnExecuteReveal.addEventListener('click', async () => {
                if (!pendingDecryption) return;

                btnExecuteReveal.disabled = true;
                btnExecuteReveal.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg> Odszyfrowywanie...`;

                try {
                    const password = revealPasswordInput ? revealPasswordInput.value.trim() : '';
                    const rawBytes = await decryptPayload(
                        pendingDecryption.cipherBytes,
                        password,
                        pendingDecryption.salt,
                        pendingDecryption.iv
                    );

                    const blob = new Blob([rawBytes], { type: pendingDecryption.mimeType });
                    const fileUrl = URL.createObjectURL(blob);

                    if (revealResultCard) revealResultCard.classList.add('active');

                    const outName = document.getElementById('stegoOutName');
                    const outMeta = document.getElementById('stegoOutMeta');
                    const btnDl = document.getElementById('stegoBtnDownloadExtracted');

                    if (outName) outName.textContent = pendingDecryption.filename;
                    if (outMeta) outMeta.textContent = `${pendingDecryption.mimeType} • ${formatBytes(blob.size)}`;

                    if (btnDl) {
                        btnDl.onclick = () => {
                            const a = document.createElement('a');
                            a.href = fileUrl;
                            a.download = pendingDecryption.filename;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                        };
                    }

                    if (window.showToast) window.showToast('Plik został pomyślnie odzyskany z obrazu.', 'success');
                    btnExecuteReveal.disabled = false;
                    btnExecuteReveal.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Odzyskaj i rozpakuj plik`;
                } catch (err) {
                    console.error('[Stego Reveal Error]', err);
                    if (window.showToast) window.showToast(err.message || 'Niepoprawne hasło lub błąd odczytu.', 'error');
                    btnExecuteReveal.disabled = false;
                    btnExecuteReveal.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Spróbuj ponownie`;
                }
            });
        }
    }

    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    window.DropsiteStego = {
        init: initStegoUI
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStegoUI);
    } else {
        initStegoUI();
    }
})();
