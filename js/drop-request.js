/**
 * Dropsite Drop Request (B2B Client File Drop Portal & Creator Inbox)
 * 100% Client-side RAM & Local Storage. Zero cloud leakage.
 * Brand Guidelines: Zero emoji, pure SVG inline, Cyber Mint & Obsidian Glass.
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'dropsite_drop_requests';
    const RECEIVED_KEY = 'dropsite_received_drops';

    // Pobieranie aktywnych zleceń z localStorage
    function getStoredRequests() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    function saveStoredRequests(list) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
            updateDropReqBadge();
        } catch (e) {}
    }

    function getReceivedDrops() {
        try {
            return JSON.parse(localStorage.getItem(RECEIVED_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    function saveReceivedDrop(entry) {
        try {
            const list = getReceivedDrops();
            // Unikamy duplikatów dla tego samego fileKey / url
            const exists = list.some(item => (entry.fileKey && item.fileKey === entry.fileKey) || (entry.fileUrl && item.fileUrl === entry.fileUrl));
            if (!exists) {
                list.unshift(entry);
                localStorage.setItem(RECEIVED_KEY, JSON.stringify(list.slice(0, 100)));
            }
            updateDropReqBadge();
            if (typeof window.loadMyDropRequests === 'function') {
                window.loadMyDropRequests();
            }
        } catch (e) {}
    }

    // Generator ID dla zlecenia
    function generateDropId() {
        return 'dr_' + Math.random().toString(36).substring(2, 9);
    }

    // Obliczanie daty wygaśnięcia
    function calcExpiry(hours) {
        if (!hours || hours === 'never') return null;
        return Date.now() + parseInt(hours, 10) * 3600 * 1000;
    }

    let activePortal = null;

    // Inicjalizacja komponentu
    function initDropRequest() {
        setupCreatorModal();
        checkUrlForDropRequest();
        updateDropReqBadge();
        window.addEventListener('hashchange', checkUrlForDropRequest);
        window.addEventListener('popstate', checkUrlForDropRequest);
    }

    // Konfiguracja Modala Kreatora
    function setupCreatorModal() {
        const modal = document.getElementById('dropRequestModal');
        if (!modal) return;

        const closeBtn = document.getElementById('btnDropReqClose');
        const cancelBtn = document.getElementById('btnDropReqCancel');
        const createBtn = document.getElementById('btnDropReqCreate');
        const copyBtn = document.getElementById('btnDropReqCopy');
        const titleInput = document.getElementById('dropReqTitleInput');
        const noteInput = document.getElementById('dropReqNoteInput');
        const expirySelect = document.getElementById('dropReqExpirySelect');
        const passInput = document.getElementById('dropReqPassInput');
        const resultBox = document.getElementById('dropReqResultBox');
        const urlInput = document.getElementById('dropReqUrlInput');

        function openModal(defaultTitle = '', defaultNote = '') {
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            if (titleInput) {
                titleInput.value = defaultTitle;
                setTimeout(() => titleInput.focus(), 100);
            }
            if (noteInput) noteInput.value = defaultNote;
            if (passInput) passInput.value = '';
            if (resultBox) resultBox.classList.remove('visible');
            if (createBtn) createBtn.style.display = 'inline-flex';
        }

        function closeModal() {
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        if (createBtn) {
            createBtn.addEventListener('click', () => {
                const title = (titleInput && titleInput.value.trim()) || 'Paczka materiałów klienta';
                const note = (noteInput && noteInput.value.trim()) || '';
                const expiryVal = (expirySelect && expirySelect.value) || '72';
                const pass = (passInput && passInput.value.trim()) || '';

                const dropId = generateDropId();
                const expiresAt = calcExpiry(expiryVal);

                // Sprawdź czy użytkownik jest zalogowany
                const userEmail = (window.auth && window.auth.currentUser && window.auth.currentUser.email) ||
                                  window.currentUserEmail ||
                                  localStorage.getItem('dropsite_user_email') || '';

                // Parametry URL z bezpiecznym Base64 (dla działania między różnymi przeglądarkami bez backendu)
                const payload = {
                    id: dropId,
                    t: title,
                    n: note,
                    e: expiresAt,
                    u: userEmail || undefined
                };
                const encodedPayload = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));

                const fullUrl = `${window.location.origin}${window.location.pathname}?drop=${dropId}#dr=${encodedPayload}`;

                // Zapis lokalny dla twórcy
                const stored = getStoredRequests();
                stored.unshift({
                    id: dropId,
                    title: title,
                    note: note,
                    createdAt: Date.now(),
                    expiresAt: expiresAt,
                    password: pass || null,
                    creatorEmail: userEmail || null,
                    fullUrl: fullUrl
                });
                saveStoredRequests(stored);

                // Pokazanie wyniku
                if (urlInput) urlInput.value = fullUrl;
                if (resultBox) resultBox.classList.add('visible');
                createBtn.style.display = 'none';

                if (window.showToast) {
                    window.showToast('Link do skrzynki został wygenerowany!', 'success');
                } else if (typeof showNotification === 'function') {
                    showNotification('Link do skrzynki został wygenerowany!', 'success');
                }

                if (typeof window.loadMyDropRequests === 'function') {
                    window.loadMyDropRequests();
                }
            });
        }

        if (copyBtn && urlInput) {
            copyBtn.addEventListener('click', () => {
                urlInput.select();
                navigator.clipboard.writeText(urlInput.value).then(() => {
                    const origHtml = copyBtn.innerHTML;
                    copyBtn.innerHTML = `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        <span>Skopiowano!</span>
                    `;
                    setTimeout(() => { copyBtn.innerHTML = origHtml; }, 2000);
                    if (window.showToast) {
                        window.showToast('Skopiowano link do schowka', 'success');
                    } else if (typeof showNotification === 'function') {
                        showNotification('Skopiowano link do schowka', 'success');
                    }
                }).catch(() => {
                    document.execCommand('copy');
                });
            });
        }

        // Globalny uchwyt do otwierania
        window.openDropRequestCreator = openModal;

        // Podpięcie przycisków w UI
        const triggers = document.querySelectorAll('.btn-open-drop-request, .btn-drop-request-trigger');
        triggers.forEach(trg => trg.addEventListener('click', () => openModal()));
    }

    // Sprawdzenie czy wchodzimy jako klient pod link Drop Request
    function checkUrlForDropRequest() {
        const urlParams = new URLSearchParams(window.location.search);
        let dropId = urlParams.get('drop');

        let payload = null;

        // Sprawdzenie hasha #dr=
        const hash = window.location.hash;
        if (hash && hash.startsWith('#dr=')) {
            try {
                const b64 = hash.replace('#dr=', '');
                payload = JSON.parse(decodeURIComponent(escape(atob(b64))));
                dropId = payload.id;
            } catch (e) {}
        }

        if (!dropId && !payload) {
            // Brak trybu Drop Request - upewnij się, że baner jest ukryty
            removePortalBanner();
            activePortal = null;
            window._activeDropPortal = null;
            return;
        }

        // Sprawdź czy mamy w bazie lokalnej
        if (!payload) {
            const stored = getStoredRequests();
            const match = stored.find(item => item.id === dropId);
            if (match) {
                payload = {
                    id: match.id,
                    t: match.title,
                    n: match.note,
                    e: match.expiresAt,
                    u: match.creatorEmail
                };
            } else {
                payload = {
                    id: dropId,
                    t: 'Zlecenie przesłania plików',
                    n: 'Wgraj pliki dla zleceniodawcy. Szyfrowanie Zero-Knowledge w RAM.',
                    e: null
                };
            }
        }

        // Sprawdzenie ważności
        if (payload.e && Date.now() > payload.e) {
            if (window.showToast) {
                window.showToast('Ten link do skrzynki wrzutowej wygasł.', 'error');
            } else if (typeof showNotification === 'function') {
                showNotification('Ten link do skrzynki wrzutowej wygasł.', 'error');
            }
            removePortalBanner();
            return;
        }

        activePortal = payload;
        window._activeDropPortal = payload;

        renderPortalBanner(payload);
    }

    // Renderowanie szklanego banera skrzynki klienta
    function renderPortalBanner(payload) {
        let banner = document.getElementById('dropPortalBanner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'dropPortalBanner';
            banner.className = 'drop-portal-banner';

            // Wstaw nad główny kontener wgrywania
            const targetContainer = document.querySelector('.studio-hero-right') || document.querySelector('.upload-container');
            if (targetContainer && targetContainer.parentNode) {
                targetContainer.parentNode.insertBefore(banner, targetContainer);
            }
        }

        banner.innerHTML = `
            <div class="drop-portal-info">
                <div class="drop-portal-tag">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <span>Skrzynka Odbiorcza Dropsite</span>
                </div>
                <h2 class="drop-portal-title">${escapeHtml(payload.t || 'Zlecenie przesłania plików')}</h2>
                ${payload.n ? `<p class="drop-portal-note">${escapeHtml(payload.n)}</p>` : ''}
            </div>
            <button type="button" class="drop-portal-btn-exit" id="btnDropPortalExit">
                Wyjdź ze skrzynki
            </button>
        `;

        banner.style.display = 'flex';

        const exitBtn = banner.querySelector('#btnDropPortalExit');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                window.history.replaceState({}, document.title, window.location.pathname);
                removePortalBanner();
                activePortal = null;
                window._activeDropPortal = null;
            });
        }

        // Dostosowanie napisów na głównej strefie wgrywania
        const dropText = document.querySelector('.drop-text');
        if (dropText) {
            if (!dropText.getAttribute('data-original-text')) {
                dropText.setAttribute('data-original-text', dropText.textContent);
            }
            dropText.textContent = `Wgraj pliki dla zlecenia: ${payload.t}`;
        }
    }

    function removePortalBanner() {
        const banner = document.getElementById('dropPortalBanner');
        if (banner) banner.remove();

        const dropText = document.querySelector('.drop-text');
        if (dropText && dropText.getAttribute('data-original-text')) {
            dropText.textContent = dropText.getAttribute('data-original-text');
            dropText.removeAttribute('data-original-text');
        }
    }

    function escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, function (m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[m];
        });
    }

    function formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // Aktualizacja plakietki licznika w panelu "Moje Pliki"
    function updateDropReqBadge() {
        const badge = document.getElementById('subtabDropReqCount');
        if (!badge) return;
        const list = getStoredRequests();
        badge.textContent = `${list.length}`;
    }

    // RENDEROWANIE ZAKŁADKI SKRYTEK W "MOJE PLIKI"
    window.loadMyDropRequests = function () {
        const container = document.getElementById('modDropReqList');
        const emptyState = document.getElementById('modDropReqEmpty');
        const badge = document.getElementById('subtabDropReqCount');
        if (!container) return;

        const requests = getStoredRequests();
        const receivedDrops = getReceivedDrops();

        if (badge) badge.textContent = `${requests.length}`;

        if (requests.length === 0) {
            container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        container.style.display = 'flex';

        container.innerHTML = requests.map(req => {
            const isExpired = req.expiresAt && Date.now() > req.expiresAt;
            const statusBadge = isExpired
                ? `<span class="drop-req-status-badge expired">Wygasła</span>`
                : `<span class="drop-req-status-badge active">Aktywna</span>`;

            let expiryLabel = 'Bezterminowo';
            if (req.expiresAt) {
                const diffHours = Math.round((req.expiresAt - Date.now()) / (1000 * 3600));
                if (diffHours > 0) {
                    expiryLabel = diffHours > 24 ? `Wygasa za: ${Math.ceil(diffHours / 24)} dni` : `Wygasa za: ${diffHours} godz.`;
                } else {
                    expiryLabel = 'Wygasła';
                }
            }

            // Znajdź odebrane pliki podpięte pod tę skrzynkę
            const matchingFiles = receivedDrops.filter(d => d.dropId === req.id);
            const totalReceivedSize = matchingFiles.reduce((acc, cur) => acc + (cur.fileSize || 0), 0);

            return `
                <div class="drop-req-inbox-card" id="dropReqCard_${req.id}">
                    <div class="drop-req-inbox-head">
                        <div class="drop-req-inbox-title-group">
                            <h4 class="drop-req-inbox-title">${escapeHtml(req.title)}</h4>
                            ${req.note ? `<p class="drop-req-inbox-note">${escapeHtml(req.note)}</p>` : ''}
                        </div>
                        <div class="drop-req-badge-row">
                            ${statusBadge}
                        </div>
                    </div>

                    <div class="drop-req-inbox-meta">
                        <span>Utworzono: ${new Date(req.createdAt).toLocaleDateString('pl-PL')}</span>
                        <span>•</span>
                        <span>${expiryLabel}</span>
                        <span>•</span>
                        <span style="color: #38BDF8; font-weight: 600;">📥 Odebrano: ${matchingFiles.length} ${matchingFiles.length === 1 ? 'plik' : (matchingFiles.length < 5 && matchingFiles.length > 1 ? 'pliki' : 'plików')} (${formatFileSize(totalReceivedSize)})</span>
                    </div>

                    ${matchingFiles.length > 0 ? `
                        <div class="drop-req-files-box">
                            <div class="drop-req-files-header">
                                <span>Odebrane materiały od klienta (${matchingFiles.length})</span>
                                <span>${formatFileSize(totalReceivedSize)}</span>
                            </div>
                            <div class="drop-req-files-list">
                                ${matchingFiles.map(file => `
                                    <div class="drop-req-file-row">
                                        <div class="drop-req-file-info">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34D399" stroke-width="2">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                <polyline points="14 2 14 8 20 8"></polyline>
                                            </svg>
                                            <span class="drop-req-file-name" title="${escapeHtml(file.fileName)}">${escapeHtml(file.fileName)}</span>
                                            <span class="drop-req-file-size">${formatFileSize(file.fileSize)}</span>
                                        </div>
                                        <div class="drop-req-file-actions">
                                            ${file.directUrl || file.fileUrl ? `
                                                <a href="${file.directUrl || file.fileUrl}" target="_blank" rel="noopener noreferrer" class="drop-req-btn-mini" title="Pobierz lub wyświetl plik">
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                                    <span>Pobierz</span>
                                                </a>
                                            ` : ''}
                                            ${file.fileUrl ? `
                                                <a href="${file.fileUrl}" target="_blank" rel="noopener noreferrer" class="drop-req-btn-mini" title="Otwórz podgląd z pinezkami">
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
                                                    <span>Podgląd</span>
                                                </a>
                                            ` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : `
                        <div style="padding: 10px 14px; background: rgba(255, 255, 255, 0.02); border: 1px dashed rgba(255, 255, 255, 0.08); border-radius: 10px; font-size: 0.78rem; color: #64748B; margin-bottom: 12px;">
                            ⏳ Oczekiwanie na przesłanie plików przez klienta. Udostępnij poniższy link, aby klient mógł wrzucić materiały.
                        </div>
                    `}

                    <div class="drop-req-inbox-actions">
                        ${matchingFiles.length > 0 ? `
                            <button type="button" class="drop-req-btn-action btn-make-album" onclick="window.createAlbumFromDropRequest('${req.id}')" title="Utwórz gotowy Album/Kolekcję ze wszystkich plików w tej skrzynce">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                                <span>Utwórz Album z tych plików</span>
                            </button>
                        ` : ''}
                        <button type="button" class="drop-req-btn-action" onclick="window.copyDropReqLink('${req.id}')" title="Kopiuj link do wysłania klientowi">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            <span>Kopiuj link</span>
                        </button>
                        <button type="button" class="drop-req-btn-action" onclick="window.open('${req.fullUrl}', '_blank')" title="Otwórz widok skrzynki">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            <span>Otwórz</span>
                        </button>
                        <button type="button" class="drop-req-btn-action btn-delete" onclick="window.deleteDropReq('${req.id}')" title="Usuń skrzynkę">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            <span>Usuń</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    };

    // Kopiowanie linku do danej skrzynki
    window.copyDropReqLink = function (dropId) {
        const requests = getStoredRequests();
        const found = requests.find(r => r.id === dropId);
        if (!found || !found.fullUrl) return;

        navigator.clipboard.writeText(found.fullUrl).then(() => {
            if (typeof showNotification === 'function') {
                showNotification('Skopiowano link do skrzynki wrzutowej!', 'success');
            } else if (window.showToast) {
                window.showToast('Skopiowano link do schowka', 'success');
            }
        }).catch(() => {
            prompt('Skopiuj link do skrzynki:', found.fullUrl);
        });
    };

    // Usuwanie skrzynki z listy
    window.deleteDropReq = function (dropId) {
        if (!confirm('Czy na pewno chcesz usunąć tę skrzynkę wrzutową?')) return;
        const requests = getStoredRequests().filter(r => r.id !== dropId);
        saveStoredRequests(requests);
        window.loadMyDropRequests();
        if (typeof showNotification === 'function') {
            showNotification('Skrzynka wrzutowa została usunięta.', 'info');
        }
    };

    // Tworzenie Albumu z plików odebranych w Skrytce
    window.createAlbumFromDropRequest = function (dropId) {
        const requests = getStoredRequests();
        const req = requests.find(r => r.id === dropId);
        const receivedDrops = getReceivedDrops();
        const matchingFiles = receivedDrops.filter(d => d.dropId === dropId);

        if (matchingFiles.length === 0) {
            if (typeof showNotification === 'function') {
                showNotification('W tej skrzynce nie ma jeszcze żadnych plików.', 'warning');
            }
            return;
        }

        // Zaznacz pliki dla mechanizmu tworzenia albumu
        if (window.selectedFilesForAlbum) {
            window.selectedFilesForAlbum.clear();
            matchingFiles.forEach(f => {
                const key = f.fileKey || f.fileName;
                if (key) window.selectedFilesForAlbum.add(key);
            });
        }

        // Otwórz modal tworzenia albumu i wstępnie wypełnij tytuł
        if (typeof window.openCreateAlbumModal === 'function') {
            window.openCreateAlbumModal();
            const albumTitleInput = document.getElementById('albumTitleInput');
            const albumDescInput = document.getElementById('albumDescInput');
            if (albumTitleInput && req) {
                albumTitleInput.value = `Paczka: ${req.title}`;
            }
            if (albumDescInput && req && req.note) {
                albumDescInput.value = req.note;
            }
        }
    };

    window.updateDropReqBadge = updateDropReqBadge;

    // Rejestracja zdarzenia po zakończeniu uploadu w trybie Drop Request
    window.addEventListener('dropsite:upload_success', function (e) {
        const detail = e.detail || {};
        const dropId = detail.dropId || (window._activeDropPortal && window._activeDropPortal.id);
        const dropTitle = detail.dropTitle || (window._activeDropPortal && window._activeDropPortal.t);

        if (dropId) {
            saveReceivedDrop({
                dropId: dropId,
                title: dropTitle || 'Zlecenie przesłania plików',
                fileName: detail.fileName || 'Plik przesłany',
                fileKey: detail.fileKey || detail.fileName || 'file_' + Date.now(),
                fileSize: detail.fileSize || 0,
                fileUrl: detail.fileUrl || '',
                directUrl: detail.directUrl || '',
                timestamp: Date.now()
            });
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDropRequest);
    } else {
        initDropRequest();
    }

})();
