/**
 * ============================================================================
 * DROPSITE CLOUD BRIDGE — GOOGLE DRIVE INTEGRATION (BYOS)
 * Direct Browser-to-Cloud Resumable Upload & Storage Management
 * 0 Server Storage Cost • 100% Client-to-Drive • Permanent Retention
 * Brand Guidelines: Obsidian Glass + Cyber Mint + Pure Inline SVGs
 * ============================================================================
 */

(function (window) {
    'use strict';

    class DropsiteCloudBridgeEngine {
        constructor() {
            this.storageProvider = localStorage.getItem('dropsite_storage_provider') || 'dropsite';
            this.googleClientId = localStorage.getItem('dropsite_gdrive_client_id') || 
                                  (window.APP_CONFIG && window.APP_CONFIG.GOOGLE_CLIENT_ID ? window.APP_CONFIG.GOOGLE_CLIENT_ID : '');
            this.accessToken = localStorage.getItem('dropsite_gdrive_token') || null;
            this.tokenExpiry = parseInt(localStorage.getItem('dropsite_gdrive_token_exp') || '0', 10);
            this.folderId = localStorage.getItem('dropsite_gdrive_folder_id') || null;
            this.isDemoMode = localStorage.getItem('dropsite_gdrive_demo') === '1';

            try {
                this.userProfile = JSON.parse(localStorage.getItem('dropsite_gdrive_profile') || 'null');
            } catch (_) {
                this.userProfile = null;
            }

            this.tokenClient = null;
            this.gisLoaded = false;
            this.init();
        }

        init() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.onDomReady());
            } else {
                this.onDomReady();
            }
            this.loadGoogleIdentityScript();
        }

        onDomReady() {
            this.cacheDom();
            this.bindEvents();
            this.updateUI();
        }

        cacheDom() {
            this.container = document.getElementById('storageTargetContainer');
            this.tabDropsite = document.getElementById('tabStorageDropsite');
            this.tabGdrive = document.getElementById('tabStorageGdrive');
            this.gdrivePanel = document.getElementById('gdriveStatusPanel');
            this.unconnectedBox = document.getElementById('gdriveUnconnected');
            this.connectedBox = document.getElementById('gdriveConnected');
            this.btnConnect = document.getElementById('btnConnectGDrive');
            this.btnDisconnect = document.getElementById('btnDisconnectGDrive');
            this.btnConfig = document.getElementById('btnGDriveConfig');
            this.btnByosInfo = document.getElementById('btnByosInfo');
            this.userAvatar = document.getElementById('gdriveUserAvatar');
            this.userEmail = document.getElementById('gdriveUserEmail');

            // Modal BYOS
            this.modal = document.getElementById('byosModalOverlay');
            this.modalClose = document.getElementById('btnByosModalClose');
            this.clientInput = document.getElementById('byosClientIdInput');
            this.btnSaveClient = document.getElementById('btnSaveByosClientId');
            this.btnAuthGoogle = document.getElementById('btnByosAuthGoogle');
            this.btnDemoMode = document.getElementById('btnByosDemoMode');

            // Nowe elementy przewodnika i linków pomocniczych
            this.btnHelpLink = document.getElementById('btnGDriveHelpLink');
            this.btnToggleGuide = document.getElementById('btnToggleByosGuide');
            this.guideContent = document.getElementById('byosGuideContent');
            this.originCode = document.getElementById('byosOriginCode');
            this.btnCopyOrigin = document.getElementById('btnCopyByosOrigin');
        }

        bindEvents() {
            if (this.tabDropsite) {
                this.tabDropsite.addEventListener('click', () => this.setStorageProvider('dropsite'));
            }
            if (this.tabGdrive) {
                this.tabGdrive.addEventListener('click', () => this.setStorageProvider('gdrive'));
            }
            if (this.btnConnect) {
                this.btnConnect.addEventListener('click', () => this.handleConnectClick());
            }
            if (this.btnDisconnect) {
                this.btnDisconnect.addEventListener('click', () => this.disconnectGoogleDrive());
            }
            if (this.btnConfig) {
                this.btnConfig.addEventListener('click', () => this.openConfigModal());
            }
            if (this.btnByosInfo) {
                this.btnByosInfo.addEventListener('click', () => this.openConfigModal());
            }
            if (this.btnHelpLink) {
                this.btnHelpLink.addEventListener('click', () => this.openConfigModal(true));
            }

            // Rozwijany przewodnik Google Cloud
            if (this.btnToggleGuide && this.guideContent) {
                this.btnToggleGuide.addEventListener('click', () => {
                    const isOpen = this.guideContent.style.display !== 'none';
                    this.guideContent.style.display = isOpen ? 'none' : 'block';
                    this.btnToggleGuide.classList.toggle('is-open', !isOpen);
                    this.btnToggleGuide.setAttribute('aria-expanded', (!isOpen).toString());
                });
            }

            // Automatyczne wstawienie bieżącego origin (np. https://dropsite.pl)
            if (this.originCode) {
                this.originCode.textContent = window.location.origin;
            }

            // Kopiowanie origin do schowka
            if (this.btnCopyOrigin) {
                this.btnCopyOrigin.addEventListener('click', async () => {
                    const text = window.location.origin;
                    try {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                            await navigator.clipboard.writeText(text);
                        } else {
                            const ta = document.createElement('textarea');
                            ta.value = text;
                            document.body.appendChild(ta);
                            ta.select();
                            document.execCommand('copy');
                            document.body.removeChild(ta);
                        }
                        this.showToast('✓ Skopiowano adres URL autoryzacji do schowka!', 'success');
                    } catch (e) {
                        this.showToast('Błąd kopiowania: ' + text, 'info');
                    }
                });
            }

            // Modal events
            if (this.modalClose) {
                this.modalClose.addEventListener('click', () => this.closeConfigModal());
            }
            if (this.modal) {
                this.modal.addEventListener('click', (e) => {
                    if (e.target === this.modal) this.closeConfigModal();
                });
            }
            if (this.btnSaveClient && this.clientInput) {
                this.btnSaveClient.addEventListener('click', () => {
                    const val = this.clientInput.value.trim();
                    this.googleClientId = val;
                    localStorage.setItem('dropsite_gdrive_client_id', val);
                    this.showToast('Zapisano Google Client ID!', 'success');
                    this.initTokenClient();
                });
            }
            if (this.btnAuthGoogle) {
                this.btnAuthGoogle.addEventListener('click', () => {
                    this.closeConfigModal();
                    this.requestGoogleAuth();
                });
            }
            if (this.btnDemoMode) {
                this.btnDemoMode.addEventListener('click', () => {
                    this.enableDemoMode();
                    this.closeConfigModal();
                });
            }

            // Obsługa klawisza Esc do zamykania modalu
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.modal && this.modal.classList.contains('active')) {
                    this.closeConfigModal();
                }
            });
        }

        loadGoogleIdentityScript() {
            if (window.google && window.google.accounts) {
                this.gisLoaded = true;
                this.initTokenClient();
                return;
            }

            const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
            if (existingScript) {
                existingScript.addEventListener('load', () => {
                    this.gisLoaded = true;
                    this.initTokenClient();
                });
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                this.gisLoaded = true;
                this.initTokenClient();
            };
            script.onerror = () => {
                console.warn('[CloudBridge] Nie udało się załadować Google Identity Services. BYOS będzie działać w trybie symulacji/demo.');
            };
            document.head.appendChild(script);
        }

        initTokenClient() {
            if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) return;
            if (!this.googleClientId) return;

            try {
                this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: this.googleClientId,
                    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
                    callback: async (tokenResponse) => {
                        if (tokenResponse && tokenResponse.access_token) {
                            this.accessToken = tokenResponse.access_token;
                            const expiresIn = parseInt(tokenResponse.expires_in || '3599', 10);
                            this.tokenExpiry = Date.now() + (expiresIn * 1000);
                            this.isDemoMode = false;

                            localStorage.setItem('dropsite_gdrive_token', this.accessToken);
                            localStorage.setItem('dropsite_gdrive_token_exp', this.tokenExpiry.toString());
                            localStorage.removeItem('dropsite_gdrive_demo');

                            this.showToast('✓ Autoryzowano Dysk Google!', 'success');
                            await this.fetchUserProfile();
                            await this.ensureDropsiteFolder();
                            this.updateUI();
                        } else if (tokenResponse && tokenResponse.error) {
                            console.error('[CloudBridge] Google Auth Error:', tokenResponse);
                            this.showToast('Błąd autoryzacji Google: ' + (tokenResponse.error_description || tokenResponse.error), 'error');
                        }
                    },
                    error_callback: (err) => {
                        console.error('[CloudBridge] GIS Error:', err);
                        this.showToast('Błąd Google OAuth: ' + (err.message || 'Niepowodzenie'), 'error');
                    }
                });
            } catch (err) {
                console.warn('[CloudBridge] Błąd inicjalizacji TokenClient:', err);
            }
        }

        setStorageProvider(provider) {
            this.storageProvider = provider;
            localStorage.setItem('dropsite_storage_provider', provider);
            this.updateUI();

            if (provider === 'gdrive' && !this.isConnected()) {
                this.handleConnectClick();
            }
        }

        isGoogleDriveActive() {
            return this.storageProvider === 'gdrive';
        }

        isConnected() {
            if (this.isDemoMode) return true;
            return Boolean(this.accessToken && Date.now() < this.tokenExpiry);
        }

        handleConnectClick() {
            if (this.isConnected()) return;

            if (!this.googleClientId) {
                // Jeśli nie podano jeszcze Client ID z Google Cloud Console, otwórz elegancki modal
                this.openConfigModal();
            } else {
                this.requestGoogleAuth();
            }
        }

        requestGoogleAuth() {
            if (!this.googleClientId) {
                this.openConfigModal();
                return;
            }
            if (!this.tokenClient) {
                this.initTokenClient();
            }
            if (this.tokenClient) {
                this.tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                this.showToast('Inicjalizacja Google Identity Services... Spróbuj za chwilę.', 'warning');
            }
        }

        enableDemoMode() {
            this.isDemoMode = true;
            this.storageProvider = 'gdrive';
            this.accessToken = 'demo_access_token_' + Date.now();
            this.tokenExpiry = Date.now() + 86400000;
            this.userProfile = {
                email: 'jan.kowalski@gmail.com',
                name: 'Jan Kowalski',
                picture: ''
            };
            this.folderId = 'demo_dropsite_transfers_folder';

            localStorage.setItem('dropsite_gdrive_demo', '1');
            localStorage.setItem('dropsite_storage_provider', 'gdrive');
            localStorage.setItem('dropsite_gdrive_token', this.accessToken);
            localStorage.setItem('dropsite_gdrive_token_exp', this.tokenExpiry.toString());
            localStorage.setItem('dropsite_gdrive_profile', JSON.stringify(this.userProfile));
            localStorage.setItem('dropsite_gdrive_folder_id', this.folderId);

            this.updateUI();
            this.showToast('🚀 Aktywowano tryb testowy Dysku Google (BYOS)!', 'success');
        }

        disconnectGoogleDrive() {
            this.accessToken = null;
            this.tokenExpiry = 0;
            this.userProfile = null;
            this.folderId = null;
            this.isDemoMode = false;

            localStorage.removeItem('dropsite_gdrive_token');
            localStorage.removeItem('dropsite_gdrive_token_exp');
            localStorage.removeItem('dropsite_gdrive_profile');
            localStorage.removeItem('dropsite_gdrive_folder_id');
            localStorage.removeItem('dropsite_gdrive_demo');

            this.storageProvider = 'dropsite';
            localStorage.setItem('dropsite_storage_provider', 'dropsite');

            this.updateUI();
            this.showToast('Odłączono Dysk Google. Przywrócono domyślny magazyn Dropsite.', 'info');
        }

        async fetchUserProfile() {
            if (this.isDemoMode || !this.accessToken) return;
            try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${this.accessToken}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    this.userProfile = {
                        email: data.email || 'Konto Google',
                        name: data.name || '',
                        picture: data.picture || ''
                    };
                    localStorage.setItem('dropsite_gdrive_profile', JSON.stringify(this.userProfile));
                }
            } catch (err) {
                console.warn('[CloudBridge] Nie udało się pobrać profilu:', err);
            }
        }

        async ensureDropsiteFolder() {
            if (this.isDemoMode) return 'demo_folder_dropsite';
            if (!this.accessToken) return null;

            if (this.folderId) {
                // Szybka weryfikacja czy folder nadal istnieje
                try {
                    const checkRes = await fetch(`https://www.googleapis.com/drive/v3/files/${this.folderId}?fields=id,trashed`, {
                        headers: { Authorization: `Bearer ${this.accessToken}` }
                    });
                    if (checkRes.ok) {
                        const checkData = await checkRes.json();
                        if (!checkData.trashed) return this.folderId;
                    }
                } catch (_) {}
            }

            try {
                // Wyszukaj folder po nazwie w katalogu głównym
                const q = "mimeType='application/vnd.google-apps.folder' and name='Dropsite Transfers' and trashed=false";
                const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`, {
                    headers: { Authorization: `Bearer ${this.accessToken}` }
                });
                const searchData = await searchRes.json();

                if (searchData.files && searchData.files.length > 0) {
                    this.folderId = searchData.files[0].id;
                } else {
                    // Utwórz dedykowany folder Dropsite Transfers
                    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${this.accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name: 'Dropsite Transfers',
                            mimeType: 'application/vnd.google-apps.folder',
                            description: 'Folder transferów utworzony automatycznie przez Dropsite (BYOS).'
                        })
                    });
                    const createData = await createRes.json();
                    this.folderId = createData.id;
                }

                localStorage.setItem('dropsite_gdrive_folder_id', this.folderId);
                return this.folderId;
            } catch (err) {
                console.error('[CloudBridge] Błąd sprawdzania/tworzenia folderu:', err);
                return null;
            }
        }

        /**
         * Główna funkcja wysyłki pliku (Direct Resumable Upload do Google Drive)
         */
        async uploadFile(file, options = {}, onProgressUpdate) {
            // TRYB DEMO / SYMULACJA
            if (this.isDemoMode) {
                return this.simulateUpload(file, options, onProgressUpdate);
            }

            if (!this.isConnected()) {
                throw new Error('Połącz swoje konto Google Drive przed rozpoczęciem transferu BYOS.');
            }

            const folderId = await this.ensureDropsiteFolder();

            // 1. Inicjalizacja sesji resumable upload
            const metadata = {
                name: file.name,
                parents: folderId ? [folderId] : []
            };

            const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json; charset=UTF-8',
                    'X-Upload-Content-Type': file.type || 'application/octet-stream',
                    'X-Upload-Content-Length': file.size.toString()
                },
                body: JSON.stringify(metadata)
            });

            if (!initRes.ok) {
                const errText = await initRes.text();
                throw new Error(`Google Drive API odmówił utworzenia sesji transferu (${initRes.status}): ${errText}`);
            }

            const uploadUrl = initRes.headers.get('Location');
            if (!uploadUrl) {
                throw new Error('Brak adresu zwrotnego sesji uploadu (Location header) z Google Drive.');
            }

            // 2. Bezpośredni upload strumieniowy z monitorowaniem postępu
            const uploadResult = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', uploadUrl, true);
                xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        if (typeof onProgressUpdate === 'function') {
                            onProgressUpdate(e.loaded, e.total, percent);
                        }
                    }
                };

                xhr.onload = () => {
                    if (xhr.status === 200 || xhr.status === 201) {
                        try {
                            const resObj = JSON.parse(xhr.responseText);
                            resolve(resObj);
                        } catch (_) {
                            resolve({ id: 'unknown_gdrive_id' });
                        }
                    } else {
                        reject(new Error(`Błąd wysyłki do Google Drive (HTTP ${xhr.status}): ${xhr.responseText}`));
                    }
                };

                xhr.onerror = () => reject(new Error('Błąd połączenia sieciowego podczas wysyłania do Google Drive.'));
                xhr.onabort = () => reject(new Error('Wysyłanie do Google Drive zostało anulowane.'));

                xhr.send(file);
            });

            const gdriveFileId = uploadResult.id;

            // 3. Nadanie uprawnień odczytu dla każdego z linkiem (aby odbiorca mógł pobrać)
            try {
                await fetch(`https://www.googleapis.com/drive/v3/files/${gdriveFileId}/permissions`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        role: 'reader',
                        type: 'anyone'
                    })
                });
            } catch (permErr) {
                console.warn('[CloudBridge] Ostrzeżenie przy ustawianiu uprawnień publicznych:', permErr);
            }

            // 4. Konstrukcja rekordu transferu
            const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${gdriveFileId}`;
            const fileKey = `gdrive_${gdriveFileId}`;

            const baseOrigin = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                ? window.location.origin
                : (window.PUBLIC_APP_URL || 'https://dropsite.pages.dev');

            const finalUrl = `${baseOrigin}/?f=${encodeURIComponent(fileKey)}&name=${encodeURIComponent(file.name)}&size=${file.size}&source=gdrive`;

            return {
                success: true,
                key: fileKey,
                gdriveId: gdriveFileId,
                name: file.name,
                size: file.size,
                finalUrl: finalUrl,
                directDownloadUrl: directDownloadUrl,
                source: 'gdrive'
            };
        }

        /**
         * Symulacja przesyłania dla trybu demo/testowego
         */
        async simulateUpload(file, options, onProgressUpdate) {
            const totalBytes = file.size;
            let loadedBytes = 0;
            const chunkSize = Math.max(256 * 1024, Math.round(totalBytes / 20));
            const intervalTime = 60; // ms

            await new Promise((resolve) => {
                const timer = setInterval(() => {
                    loadedBytes = Math.min(totalBytes, loadedBytes + chunkSize);
                    const percent = Math.round((loadedBytes / totalBytes) * 100);

                    if (typeof onProgressUpdate === 'function') {
                        onProgressUpdate(loadedBytes, totalBytes, percent);
                    }

                    if (loadedBytes >= totalBytes) {
                        clearInterval(timer);
                        resolve();
                    }
                }, intervalTime);
            });

            const fakeId = 'demo_' + Math.random().toString(36).substring(2, 12);
            const fileKey = `gdrive_${fakeId}`;
            const baseOrigin = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                ? window.location.origin
                : (window.PUBLIC_APP_URL || 'https://dropsite.pages.dev');

            const finalUrl = `${baseOrigin}/?f=${encodeURIComponent(fileKey)}&name=${encodeURIComponent(file.name)}&size=${file.size}&source=gdrive`;

            return {
                success: true,
                key: fileKey,
                gdriveId: fakeId,
                name: file.name,
                size: file.size,
                finalUrl: finalUrl,
                directDownloadUrl: `https://drive.google.com/uc?export=download&id=${fakeId}`,
                source: 'gdrive'
            };
        }

        updateUI() {
            const isGdrive = this.storageProvider === 'gdrive';
            const connected = this.isConnected();

            if (this.container) {
                this.container.classList.toggle('is-gdrive-active', isGdrive);
            }

            if (this.tabDropsite) {
                this.tabDropsite.classList.toggle('active', !isGdrive);
            }
            if (this.tabGdrive) {
                this.tabGdrive.classList.toggle('active', isGdrive);
            }

            if (this.gdrivePanel) {
                this.gdrivePanel.style.display = isGdrive ? 'block' : 'none';
            }

            if (this.unconnectedBox) {
                this.unconnectedBox.style.display = (isGdrive && !connected) ? 'block' : 'none';
            }
            if (this.connectedBox) {
                this.connectedBox.style.display = (isGdrive && connected) ? 'flex' : 'none';
            }

            if (connected && this.userProfile) {
                if (this.userEmail) {
                    this.userEmail.textContent = this.userProfile.email || 'Konto Google (BYOS)';
                }
                if (this.userAvatar) {
                    if (this.userProfile.picture) {
                        this.userAvatar.innerHTML = `<img src="${this.userProfile.picture}" alt="Avatar">`;
                    } else {
                        const letter = (this.userProfile.name || this.userProfile.email || 'G').charAt(0).toUpperCase();
                        this.userAvatar.textContent = letter;
                    }
                }
            }

            // Opcje czasu wygasania: jeśli wybrano Google Drive, pliki są bezpieczne i bezterminowe
            const durationContainer = document.querySelector('.options-container');
            let retentionNotice = document.getElementById('gdriveRetentionNotice');

            if (isGdrive) {
                if (!retentionNotice && durationContainer) {
                    retentionNotice = document.createElement('div');
                    retentionNotice.id = 'gdriveRetentionNotice';
                    retentionNotice.className = 'gdrive-retention-notice';
                    retentionNotice.innerHTML = `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34D399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        <span>Przechowywane na Twoim Dysku Google • <strong>Bezterminowo</strong> (plik nie wygasa)</span>
                    `;
                    durationContainer.parentNode.insertBefore(retentionNotice, durationContainer);
                }
                if (retentionNotice) retentionNotice.style.display = 'flex';
                if (durationContainer) durationContainer.style.display = 'none';
            } else {
                if (retentionNotice) retentionNotice.style.display = 'none';
                if (durationContainer) durationContainer.style.display = 'block';
            }

            if (typeof window.updateAdvActiveBadges === 'function') {
                window.updateAdvActiveBadges();
            }
        }

        openConfigModal(expandGuide = false) {
            if (!this.modal) return;
            if (this.clientInput) {
                this.clientInput.value = this.googleClientId || '';
            }
            if (this.originCode) {
                this.originCode.textContent = window.location.origin;
            }
            if (expandGuide && this.btnToggleGuide && this.guideContent) {
                this.guideContent.style.display = 'block';
                this.btnToggleGuide.classList.add('is-open');
                this.btnToggleGuide.setAttribute('aria-expanded', 'true');
            }
            this.modal.classList.add('active');
        }

        closeConfigModal() {
            if (!this.modal) return;
            this.modal.classList.remove('active');
        }

        showToast(message, type = 'info') {
            if (typeof window.showNotification === 'function') {
                window.showNotification(message, type);
            } else {
                console.log(`[CloudBridge Toast ${type}]:`, message);
            }
        }
    }

    // Eksport globalnej instancji
    window.DropsiteCloudBridge = new DropsiteCloudBridgeEngine();

})(window);
