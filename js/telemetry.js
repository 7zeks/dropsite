/**
 * ============================================================================
 * DROPSITE ADVANCED TELEMETRY & LIVE SESSION RECORDER
 * ============================================================================
 * Automatyczny moduł zbierania telemetrii sprzętowej, sieciowej i ścieżki (User Flow)
 * oraz silnik renderowania Dziennika Sesji w Panelu Administratora.
 */

(function () {
    'use strict';

    const WORKER_URL = 'https://uploud-api.dropsite33.workers.dev';

    // =========================================================================
    // 1. MODUŁ DETEKCJI SPRZĘTOWEJ I SYSTEMOWEJ (CLIENT-SIDE FINGERPRINTING)
    // =========================================================================

    // Detekcja dokładnego modelu karty graficznej (GPU) przez WebGL
    function detectGpu() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl', { powerPreference: 'high-performance' }) || canvas.getContext('experimental-webgl');
            if (!gl) return 'Standard Display';

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (!debugInfo) return 'Generic WebGL';

            const unmasked = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
            // Czyszczenie wrapperów ANGLE / Direct3D / OpenGL
            let clean = unmasked
                .replace(/^ANGLE \(([^,]+), ([^,]+).*\)$/i, '$2 ($1)')
                .replace(/ vs_.*$/i, '')
                .replace(/Direct3D.*$/i, '')
                .replace(/\(0x[0-9a-fA-F]+\)/g, '')
                .trim();

            return clean || unmasked || 'Akceleracja Sprzętowa';
        } catch (e) {
            return 'Zintegrowana GPU';
        }
    }

    // Detekcja Systemu Operacyjnego
    function detectOs() {
        const ua = navigator.userAgent || '';
        const platform = navigator.platform || '';

        if (/windows phone/i.test(ua)) return 'Windows Phone';
        if (/win/i.test(platform) || /windows/i.test(ua)) {
            if (/windows nt 10/i.test(ua)) return 'Windows 10/11 PC';
            return 'Windows PC';
        }
        if (/iphone/i.test(ua)) return 'iPhone (iOS)';
        if (/ipad/i.test(ua)) return 'iPad (iPadOS)';
        if (/mac/i.test(platform) || /macintosh/i.test(ua)) return 'macOS (Apple Mac)';
        if (/android/i.test(ua)) return 'Android';
        if (/linux/i.test(platform) || /linux/i.test(ua)) return 'Linux';
        return 'Inny OS';
    }

    // Detekcja Przeglądarki
    function detectBrowser() {
        const ua = navigator.userAgent || '';
        if (/edg\//i.test(ua)) return 'Microsoft Edge';
        if (/opr\/|opera/i.test(ua)) return 'Opera';
        if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua) && !/opr\//i.test(ua)) return 'Google Chrome';
        if (/firefox|fxios/i.test(ua)) return 'Mozilla Firefox';
        if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Apple Safari';
        if (/samsungbrowser/i.test(ua)) return 'Samsung Internet';
        return 'Przeglądarka Web';
    }

    // Detekcja Poziomu Baterii
    async function detectBattery() {
        if (typeof navigator.getBattery === 'function') {
            try {
                const b = await navigator.getBattery();
                const pct = Math.round(b.level * 100);
                return `${pct}%${b.charging ? ' ⚡' : ''}`;
            } catch (e) {}
        }
        return '100%';
    }

    // =========================================================================
    // 2. MODUŁ ŚLEDZENIA SESJI & USER FLOW
    // =========================================================================

    // Generowanie lub pobieranie unikalnego ID sesji
    let currentSessionId = sessionStorage.getItem('ds_telemetry_sid');
    if (!currentSessionId) {
        currentSessionId = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
        sessionStorage.setItem('ds_telemetry_sid', currentSessionId);
    }

    let visitorId = localStorage.getItem('ds_telemetry_vid');
    if (!visitorId) {
        visitorId = 'vis_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
        localStorage.setItem('ds_telemetry_vid', visitorId);
    }

    let sessionStartTime = parseInt(sessionStorage.getItem('ds_telemetry_start') || '0', 10);
    if (!sessionStartTime) {
        sessionStartTime = Date.now();
        sessionStorage.setItem('ds_telemetry_start', sessionStartTime.toString());
    }

    // Ścieżka wędrówki w tej sesji (User Flow)
    let userFlow = [];
    try {
        const raw = sessionStorage.getItem('ds_telemetry_flow');
        if (raw) userFlow = JSON.parse(raw);
    } catch (e) {}

    let currentRoute = getCurrentRouteName();
    let currentHopStartTime = Date.now();

    function getCurrentRouteName() {
        const path = window.location.pathname || '/';
        const hash = window.location.hash || '';
        const search = window.location.search || '';

        if (search.includes('?f=')) {
            const fParam = new URLSearchParams(search).get('f');
            return `/f/${(fParam || '').substring(0, 10)}`;
        }
        if (path.startsWith('/f/') || path.startsWith('/v/')) {
            return path;
        }
        if (hash) {
            return `${path}${hash}`;
        }
        return path === '' ? '/' : path;
    }

    // Inicjalizacja pierwszego hopa jeśli pusty
    if (userFlow.length === 0) {
        userFlow.push({
            path: currentRoute,
            duration: 1,
            current: true
        });
        saveUserFlow();
    }

    function saveUserFlow() {
        try {
            sessionStorage.setItem('ds_telemetry_flow', JSON.stringify(userFlow.slice(-10))); // maks 10 ostatnich kroków
        } catch (e) {}
    }

    function recordRouteHop(newRoute) {
        if (!newRoute || newRoute === currentRoute) return;

        const now = Date.now();
        const durationSec = Math.max(1, Math.round((now - currentHopStartTime) / 1000));

        // Zaktualizuj poprzedni krok
        if (userFlow.length > 0) {
            userFlow[userFlow.length - 1].duration = durationSec;
            userFlow[userFlow.length - 1].current = false;
        }

        // Dodaj nowy krok
        userFlow.push({
            path: newRoute,
            duration: 0,
            current: true
        });

        currentRoute = newRoute;
        currentHopStartTime = now;
        saveUserFlow();

        // Wyślij aktualizację do serwera
        sendTelemetryPing('nav');
    }

    // Nasłuchiwanie zmian tras
    window.addEventListener('hashchange', () => {
        recordRouteHop(getCurrentRouteName());
    });
    window.addEventListener('popstate', () => {
        recordRouteHop(getCurrentRouteName());
    });

    // Śledzenie otwarć kluczowych sekcji i modali
    const originalSmoothOpenModal = window.smoothOpenModal;
    if (typeof originalSmoothOpenModal === 'function') {
        window.smoothOpenModal = function (modalEl, callback) {
            if (modalEl && modalEl.id) {
                let modalName = '#' + modalEl.id.replace('Wrap', '').replace('Modal', '');
                if (modalEl.id === 'proModalWrap') modalName = '#pro-modal';
                else if (modalEl.id === 'loginModalWrap') modalName = '#login-modal';
                else if (modalEl.id === 'modModal') modalName = '#admin-panel';
                recordRouteHop(modalName);
            }
            return originalSmoothOpenModal.apply(this, arguments);
        };
    }

    // =========================================================================
    // 3. WYSYŁANIE PINGÓW TELEMETRII NA SERWER
    // =========================================================================

    let isSendingPing = false;
    let cachedGpu = null;
    let cachedBattery = null;

    async function getTelemetryPayload() {
        if (!cachedGpu) cachedGpu = detectGpu();
        if (!cachedBattery) cachedBattery = await detectBattery();

        const urlParams = new URLSearchParams(window.location.search);
        const utmSource = urlParams.get('utm_source') || (document.referrer ? 'referral' : 'direct');

        // Zaktualizuj czas obecnego hopa
        if (userFlow.length > 0) {
            userFlow[userFlow.length - 1].duration = Math.max(1, Math.round((Date.now() - currentHopStartTime) / 1000));
            userFlow[userFlow.length - 1].path = currentRoute;
            userFlow[userFlow.length - 1].current = true;
        }

        const currentUserEmail = (window.auth?.currentUser?.email || '').toLowerCase().trim();
        const isUserPro = typeof window.isProUser === 'function' ? window.isProUser() : false;
        const userRole = (typeof window.isActualAdminUser === 'function' && window.isActualAdminUser()) 
            ? 'admin' 
            : (isUserPro ? 'pro' : (currentUserEmail ? 'free' : 'guest'));

        return {
            sessionId: currentSessionId,
            visitorId: visitorId,
            userEmail: currentUserEmail || null,
            isPro: isUserPro,
            role: userRole,
            os: detectOs(),
            browser: detectBrowser(),
            deviceType: (/(mobile|android|iphone|ipad)/i.test(navigator.userAgent || '') || window.innerWidth < 768) ? 'mobile' : 'pc',
            gpu: cachedGpu,
            battery: cachedBattery,
            screen: `${screen.width}x${screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            dpr: window.devicePixelRatio || 1,
            colorDepth: screen.colorDepth || 24,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Warsaw',
            language: navigator.language || 'pl-PL',
            referrer: document.referrer ? new URL(document.referrer).hostname : 'Direct / Bookmark',
            utmSource: utmSource,
            currentPage: currentRoute,
            flow: userFlow.slice(-8),
            sessionStart: sessionStartTime,
            lastActive: Date.now()
        };
    }

    async function sendTelemetryPing(reason = 'heartbeat') {
        if (isSendingPing) return;
        isSendingPing = true;

        try {
            const payload = await getTelemetryPayload();
            await fetch(`${WORKER_URL}/api/telemetry/ping`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            });
        } catch (e) {
            // Ciche ignorowanie ewentualnych błędów sieciowych
        } finally {
            isSendingPing = false;
        }
    }

    // Ping początkowy po załadowaniu DOM
    if (document.readyState === 'complete') {
        sendTelemetryPing('init');
    } else {
        window.addEventListener('load', () => sendTelemetryPing('init'));
    }

    // Heartbeat co 25 sekund
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            sendTelemetryPing('heartbeat');
        }
    }, 25000);

    // Ostatni ping przed opuszczeniem strony (sendBeacon)
    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            getTelemetryPayload().then(payload => {
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                navigator.sendBeacon(`${WORKER_URL}/api/telemetry/ping`, blob);
            });
        }
    });

    // =========================================================================
    // 4. KONTROLER PANELU ADMINISTRATORA (DZIENNIK SESJI & TELEMETRIA NA ŻYWO)
    // =========================================================================

    let adminTelemetryData = [];
    let adminTelemetryFilter = 'all';
    let adminTelemetrySearch = '';
    let adminTelemetryInterval = null;
    let expandedCardIds = new Set();

    function formatTimeAgo(timestamp) {
        if (!timestamp) return 'Przed chwilą';
        const diffSec = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
        if (diffSec < 15) return 'Przed chwilą';
        if (diffSec < 60) return `${diffSec}s temu`;
        const diffMin = Math.round(diffSec / 60);
        if (diffMin < 60) return `${diffMin}m temu`;
        const diffHours = Math.round(diffMin / 60);
        if (diffHours < 24) return `${diffHours}h temu`;
        const d = new Date(timestamp);
        return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
    }

    function formatDuration(sec) {
        if (!sec || sec < 0) return '0s';
        if (sec < 60) return `${sec}s`;
        const min = Math.floor(sec / 60);
        const remSec = sec % 60;
        if (min < 60) return `${min}m ${remSec}s`;
        const hrs = Math.floor(min / 60);
        return `${hrs}h ${min % 60}m`;
    }

    function cleanGpuName(raw) {
        if (!raw) return 'AMD / NVIDIA GPU';
        return raw
            .replace(/^ANGLE \(([^,]+), ([^,]+).*\)$/i, '$2')
            .replace(/ vs_.*$/i, '')
            .replace(/Direct3D.*$/i, '')
            .trim();
    }

    async function fetchAdminTelemetry() {
        const apiSecret = localStorage.getItem('dropsite_admin_secret') || '12345678';
        const listContainer = document.getElementById('telemetrySessionsList');
        const onlineCountEl = document.getElementById('telemetryOnlineCount');
        const badgeOnlineEl = document.getElementById('adminOnlineBadge');

        try {
            const res = await fetch(`${WORKER_URL}/admin/telemetry`, {
                headers: { 'X-Admin-Secret': apiSecret }
            });
            const data = await res.json();

            if (data.success && Array.isArray(data.sessions)) {
                adminTelemetryData = data.sessions;

                if (onlineCountEl) onlineCountEl.textContent = data.onlineCount || 0;
                if (badgeOnlineEl) {
                    badgeOnlineEl.textContent = data.onlineCount || 0;
                    badgeOnlineEl.style.display = data.onlineCount > 0 ? 'inline-block' : 'none';
                }

                // Domyślnie rozwiń pierwszą sesję, jeśli żadna nie jest jeszcze rozwinięta
                if (expandedCardIds.size === 0 && adminTelemetryData.length > 0) {
                    expandedCardIds.add(adminTelemetryData[0].sessionId);
                }

                renderTelemetryList();
            } else {
                if (listContainer) {
                    listContainer.innerHTML = `<div class="telemetry-empty-box">Nie udało się pobrać danych: ${data.message || 'Brak uprawnień'}</div>`;
                }
            }
        } catch (err) {
            console.error('Błąd pobierania telemetrii:', err);
            if (listContainer && adminTelemetryData.length === 0) {
                listContainer.innerHTML = `<div class="telemetry-empty-box">Błąd połączenia podczas pobierania telemetrii.</div>`;
            }
        }
    }

    function renderTelemetryList() {
        const listContainer = document.getElementById('telemetrySessionsList');
        if (!listContainer) return;

        let filtered = adminTelemetryData.filter(item => {
            // Filtry zakładek (Wszystkie / Online / PC / Tel)
            if (adminTelemetryFilter === 'online' && !item.online) return false;
            if (adminTelemetryFilter === 'pc' && item.deviceType !== 'pc') return false;
            if (adminTelemetryFilter === 'mobile' && item.deviceType !== 'mobile') return false;

            // Filtry wyszukiwarki
            if (adminTelemetrySearch) {
                const q = adminTelemetrySearch.toLowerCase();
                const matchStr = `${item.userEmail || ''} ${item.city} ${item.countryName} ${item.country} ${item.ip} ${item.isp} ${item.gpu} ${item.os} ${item.browser} ${item.currentPage}`.toLowerCase();
                if (!matchStr.includes(q)) return false;
            }

            return true;
        });

        if (filtered.length === 0) {
            listContainer.innerHTML = `<div class="telemetry-empty-box">Brak zarejestrowanych sesji odpowiadających wybranym filtrom.</div>`;
            return;
        }

        let html = '';
        filtered.forEach(session => {
            const isExpanded = expandedCardIds.has(session.sessionId);
            const isOnline = !!session.online;
            const shortGpu = cleanGpuName(session.gpu);
            const locationStr = `${session.city || 'Nieznane'} (${session.countryName || session.country || 'Polska'})`;
            const subStr = `${session.os || 'Windows PC'} • ${session.browser || 'Google Chrome'} • ${session.isp || 'Internet'}`;

            // Renderowanie kroków User Flow
            let flowHopsHtml = '';
            if (Array.isArray(session.flow) && session.flow.length > 0) {
                session.flow.forEach((hop, idx) => {
                    const isLast = idx === session.flow.length - 1;
                    const durationStr = hop.duration ? `(${hop.duration}s)` : '(1s)';
                    flowHopsHtml += `
                        <span class="telemetry-flow-hop ${isLast ? 'active' : ''}">
                            📍 ${escapeHtml(hop.path || '/')} <span class="hop-time">${durationStr}</span>
                        </span>
                    `;
                    if (!isLast) {
                        flowHopsHtml += `<span class="telemetry-flow-arrow">➔</span>`;
                    }
                });
            } else {
                flowHopsHtml = `<span class="telemetry-flow-hop active">📍 ${escapeHtml(session.currentPage || '/')} <span class="hop-time">(1s)</span></span>`;
            }

            const userPillHtml = session.userEmail ? `
                <div style="margin: 2px 0;">
                    <span class="telemetry-user-badge ${session.isPro ? 'is-pro' : ''}" onclick="event.stopPropagation(); if(window.openAdminUserDossier) window.openAdminUserDossier('${escapeHtml(session.userEmail)}');" title="Otwórz Dossier tego użytkownika">
                        ${session.isPro ? '⭐ PRO: ' : '👤 '}${escapeHtml(session.userEmail)}
                    </span>
                </div>
            ` : '';

            html += `
                <div class="telemetry-card ${isExpanded ? 'is-expanded' : ''}" data-session-id="${session.sessionId}">
                    <div class="telemetry-card-header">
                        <div class="telemetry-user-primary">
                            <span class="telemetry-status-dot ${isOnline ? 'online' : 'offline'}" title="${isOnline ? 'Online (Aktywny teraz)' : 'Offline'}"></span>
                            <span class="telemetry-country-badge">${escapeHtml(session.country || 'PL')}</span>
                            <div class="telemetry-user-meta">
                                <span class="telemetry-location">${escapeHtml(locationStr)}</span>
                                ${userPillHtml}
                                <span class="telemetry-subinfo" title="${escapeHtml(subStr)}">${escapeHtml(subStr)}</span>
                            </div>
                        </div>

                        <div class="telemetry-badges-row">
                            <span class="telemetry-badge badge-gpu" title="Karta Graficzna: ${escapeHtml(session.gpu || '')}">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                                ${escapeHtml(shortGpu)}
                            </span>
                            <span class="telemetry-badge badge-battery" title="Bateria">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                                ${escapeHtml(session.battery || '100%')}
                            </span>
                            <span class="telemetry-badge badge-res" title="Rozdzielczość ekranu">
                                ${session.deviceType === 'mobile' ? '📱' : '🖥️'} ${escapeHtml(session.screen || '3840x2160')}
                            </span>
                            <span class="telemetry-badge badge-route" title="Aktualna podstrona">
                                📍 ${escapeHtml(session.currentPage || '/')}
                            </span>
                        </div>

                        <div class="telemetry-card-times">
                            <span class="telemetry-time-rel">${formatTimeAgo(session.lastActive)}</span>
                            <span class="telemetry-duration">Czas sesji: ${formatDuration(session.durationSec)}</span>
                        </div>
                    </div>

                    <div class="telemetry-card-details">
                        <div class="telemetry-grid">
                            <div class="telemetry-grid-item">
                                <span class="telemetry-grid-label">IP:</span>
                                <span class="telemetry-grid-val mono">${escapeHtml(session.ip || '127.0.0.1')}</span>
                            </div>
                            <div class="telemetry-grid-item">
                                <span class="telemetry-grid-label">ISP / Org:</span>
                                <span class="telemetry-grid-val">${escapeHtml(session.isp || 'Multimedia Polska')}</span>
                            </div>
                            <div class="telemetry-grid-item">
                                <span class="telemetry-grid-label">Viewport:</span>
                                <span class="telemetry-grid-val">${escapeHtml(session.viewport || '1920x1080')} (${session.dpr || 1}x DPR)</span>
                            </div>
                            <div class="telemetry-grid-item">
                                <span class="telemetry-grid-label">Color Depth:</span>
                                <span class="telemetry-grid-val">${session.colorDepth || 24} bit</span>
                            </div>
                            <div class="telemetry-grid-item">
                                <span class="telemetry-grid-label">Timezone:</span>
                                <span class="telemetry-grid-val">${escapeHtml(session.timezone || 'Europe/Warsaw')}</span>
                            </div>
                            <div class="telemetry-grid-item">
                                <span class="telemetry-grid-label">Language:</span>
                                <span class="telemetry-grid-val">${escapeHtml(session.language || 'pl-PL')}</span>
                            </div>
                            <div class="telemetry-grid-item">
                                <span class="telemetry-grid-label">Referrer:</span>
                                <span class="telemetry-grid-val">${escapeHtml(session.referrer || 'Direct / Bookmark')}</span>
                            </div>
                            <div class="telemetry-grid-item">
                                <span class="telemetry-grid-label">UTM Source:</span>
                                <span class="telemetry-grid-val">${escapeHtml(session.utmSource || 'direct')}</span>
                            </div>
                        </div>

                        <div class="telemetry-flow-box">
                            <div class="telemetry-flow-title">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                Ścieżka wędrówki w tej sesji (User Flow):
                            </div>
                            <div class="telemetry-flow-hops">
                                ${flowHopsHtml}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        listContainer.innerHTML = html;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Inicjalizacja nasłuchiwaczy dla panelu telemetrii
    function initAdminTelemetryControls() {
        const searchInput = document.getElementById('telemetrySearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                adminTelemetrySearch = e.target.value.trim();
                renderTelemetryList();
            });
        }

        const filterBtns = document.querySelectorAll('.telemetry-filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                adminTelemetryFilter = btn.getAttribute('data-filter') || 'all';
                renderTelemetryList();
            });
        });

        const refreshBtn = document.getElementById('telemetryRefreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                fetchAdminTelemetry();
            });
        }

        const clearBtn = document.getElementById('telemetryClearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', async () => {
                if (!confirm('Czy na pewno chcesz wyczyścić całą historię telemetrii sesji?')) return;
                const apiSecret = localStorage.getItem('dropsite_admin_secret') || '12345678';
                try {
                    await fetch(`${WORKER_URL}/admin/telemetry/clear`, {
                        method: 'POST',
                        headers: { 'X-Admin-Secret': apiSecret }
                    });
                    adminTelemetryData = [];
                    renderTelemetryList();
                    if (typeof showNotification === 'function') {
                        showNotification('Historia telemetrii została wyczyszczona', 'info');
                    }
                } catch (e) {}
            });
        }

        // Delegacja kliknięć do rozwijania/zwijania kart sesji
        const listContainer = document.getElementById('telemetrySessionsList');
        if (listContainer) {
            listContainer.addEventListener('click', (e) => {
                const card = e.target.closest('.telemetry-card');
                if (!card) return;

                const sid = card.getAttribute('data-session-id');
                if (!sid) return;

                if (expandedCardIds.has(sid)) {
                    expandedCardIds.delete(sid);
                    card.classList.remove('is-expanded');
                } else {
                    expandedCardIds.add(sid);
                    card.classList.add('is-expanded');
                }
            });
        }
    }

    // Funkcja wywoływana przy przełączeniu na zakładkę telemetrii
    window.renderAdminTelemetryTab = function () {
        initAdminTelemetryControls();
        fetchAdminTelemetry();

        if (adminTelemetryInterval) clearInterval(adminTelemetryInterval);
        adminTelemetryInterval = setInterval(() => {
            const tabPane = document.getElementById('adminTabPane_telemetry');
            if (tabPane && tabPane.style.display !== 'none') {
                fetchAdminTelemetry();
            } else {
                clearInterval(adminTelemetryInterval);
                adminTelemetryInterval = null;
            }
        }, 6000);
    };

    window.getAdminTelemetryData = function () {
        return adminTelemetryData || [];
    };
    window.fetchAdminTelemetry = fetchAdminTelemetry;
})();
