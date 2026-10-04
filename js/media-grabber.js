/**
 * ============================================================================
 * DROPSITE MEDIA GRABBER — INTELLIGENT SOCIAL MEDIA DOWNLOADER & CLOUD SAVER
 * Obsługa: TikTok (HD No-Watermark), YouTube, Instagram, X/Twitter, Pinterest
 * Integracja: Direct Download, 1-Click R2 Cloud Save, Compressor & Watermark
 * Zgodność z: BRAND_GUIDELINES.md (Obsidian Glass + Cyber Mint + Inline SVGs)
 * ============================================================================
 */

(function(window) {
    'use strict';

    const DropsiteMediaGrabber = {
        apiBase: (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') 
            ? 'https://uploud-api.dropsite33.workers.dev' 
            : (window.APP_CONFIG && window.APP_CONFIG.API_URL ? window.APP_CONFIG.API_URL : 'https://uploud-api.dropsite33.workers.dev'),
        
        currentData: null,
        isProcessing: false,

        init() {
            this.cacheDom();
            this.bindEvents();
            this.checkUrlParams();
        },

        cacheDom() {
            this.container = document.getElementById('mediaGrabberContainer');
            this.input = document.getElementById('grabberUrlInput');
            this.pasteBtn = document.getElementById('grabberPasteBtn');
            this.submitBtn = document.getElementById('grabberSubmitBtn');
            this.loadingWrap = document.getElementById('grabberLoadingWrap');
            this.resultsWrap = document.getElementById('grabberResultsWrap');
            this.pills = document.querySelectorAll('.grabber-platform-pill, .grabber-platform-chip');
        },

        bindEvents() {
            if (this.input) {
                this.input.addEventListener('input', () => {
                    this.updatePlatformHighlight(this.input.value.trim());
                });
                this.input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.handleGrab();
                    }
                });
            }

            if (this.submitBtn) {
                this.submitBtn.addEventListener('click', (e) => {
                    this.createRipple(e, this.submitBtn);
                    this.handleGrab();
                });
            }

            if (this.pasteBtn) {
                this.pasteBtn.addEventListener('click', async (e) => {
                    this.createRipple(e, this.pasteBtn);
                    try {
                        const text = await navigator.clipboard.readText();
                        if (text && /^https?:\/\//i.test(text.trim())) {
                            this.input.value = text.trim();
                            this.updatePlatformHighlight(text.trim());
                            this.showToast('📋 Wklejono link ze schowka', 'info');
                            this.handleGrab();
                        } else {
                            this.showToast('Schowek nie zawiera prawidłowego adresu URL.', 'warning');
                        }
                    } catch (err) {
                        this.input.focus();
                        this.showToast('Wklej link ręcznie (Ctrl+V)', 'info');
                    }
                });
            }

            // Delegacja Ripple Effect dla wszystkich dynamicznych przycisków akcji
            document.addEventListener('click', (e) => {
                const targetBtn = e.target.closest('.grabber-action-btn, .grabber-btn-submit, .grabber-btn-paste, .grabber-platform-chip');
                if (targetBtn && targetBtn !== this.submitBtn && targetBtn !== this.pasteBtn) {
                    this.createRipple(e, targetBtn);
                }

                const chip = e.target.closest('.grabber-platform-chip');
                if (chip) {
                    const plat = chip.getAttribute('data-platform');
                    if (plat === 'youtube') {
                        this.showToast('ℹ️ YouTube: pobieranie jeszcze nie działa (w trakcie prac technicznych).', 'warning');
                    } else if (plat === 'instagram') {
                        this.showToast('ℹ️ Instagram: pobieranie jeszcze nie działa (w trakcie prac technicznych).', 'warning');
                    } else if (plat === 'tiktok') {
                        this.showToast('✅ TikTok: pobieranie HD bez znaku wodnego w pełni aktywne!', 'success');
                    } else if (plat === 'twitter') {
                        this.showToast('✅ X / Twitter: pobieranie wideo i zdjęć w pełni aktywne!', 'success');
                    }
                }
            });
        },

        createRipple(e, el) {
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const circle = document.createElement('span');
            const diameter = Math.max(rect.width, rect.height);
            const radius = diameter / 2;

            const clientX = e.clientX || (rect.left + rect.width / 2);
            const clientY = e.clientY || (rect.top + rect.height / 2);

            circle.style.width = circle.style.height = `${diameter}px`;
            circle.style.left = `${clientX - rect.left - radius}px`;
            circle.style.top = `${clientY - rect.top - radius}px`;
            circle.classList.add('grabber-ripple');

            const existingRipple = el.querySelector('.grabber-ripple');
            if (existingRipple) {
                existingRipple.remove();
            }

            el.appendChild(circle);

            setTimeout(() => {
                circle.remove();
            }, 600);
        },

        checkUrlParams() {
            try {
                const params = new URLSearchParams(window.location.search);
                const grabUrl = params.get('grab') || params.get('url');
                if (grabUrl && /^https?:\/\//i.test(grabUrl)) {
                    if (this.input) {
                        this.input.value = grabUrl;
                        this.updatePlatformHighlight(grabUrl);
                    }
                    setTimeout(() => {
                        this.handleGrab();
                    }, 400);
                }
            } catch (_) {}
        },

        updatePlatformHighlight(url) {
            let active = null;
            if (/tiktok\.com|douyin\.com/i.test(url)) active = 'tiktok';
            else if (/youtu\.be|youtube\.com/i.test(url)) active = 'youtube';
            else if (/instagram\.com/i.test(url)) active = 'instagram';
            else if (/twitter\.com|x\.com/i.test(url)) active = 'twitter';
            else if (/pinterest\.com|pin\.it/i.test(url)) active = 'pinterest';

            const cockpit = document.querySelector('.grabber-cockpit-frame, .grabber-input-card');
            if (cockpit) {
                if (active) {
                    cockpit.setAttribute('data-active-platform', active);
                } else {
                    cockpit.removeAttribute('data-active-platform');
                }
            }

            this.pills.forEach(pill => {
                if (active && pill.getAttribute('data-platform') === active) {
                    pill.classList.add('active');
                } else {
                    pill.classList.remove('active');
                }
            });
        },

        async grabFromUrl(url) {
            if (this.input) {
                this.input.value = url;
                this.updatePlatformHighlight(url);
            }
            const navBtn = document.querySelector('[data-target="view-pobieracz"]');
            if (navBtn) {
                navBtn.click();
            } else if (typeof window.switchView === 'function') {
                window.switchView('view-pobieracz');
            }
            return this.handleGrab(url);
        },

        async handleGrab(overrideUrl) {
            const targetUrl = (overrideUrl || (this.input ? this.input.value : '')).trim();

            if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
                this.showToast('Wprowadź prawidłowy link do wideo (np. TikTok lub X / Twitter).', 'warning');
                if (this.input) this.input.focus();
                return;
            }

            // Informacja o platformach w trakcie integracji (YouTube & Instagram)
            if (/youtu\.be|youtube\.com/i.test(targetUrl)) {
                this.showToast('ℹ️ Pobieranie z YouTube nie jest jeszcze aktywne. Działa TikTok i X!', 'warning');
                if (this.resultsWrap) {
                    this.resultsWrap.innerHTML = `
                        <div class="grabber-error-box" style="padding:24px 20px; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.28); border-radius:16px; text-align:center; color:#FDE68A; backdrop-filter:blur(14px);">
                            <div style="display:inline-flex; align-items:center; justify-content:center; width:44px; height:44px; border-radius:12px; background:rgba(245,158,11,0.15); margin-bottom:12px; color:#FBBF24;">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            </div>
                            <div style="font-weight:700; font-size:1.05rem; margin-bottom:6px; color:#FBBF24;">Obsługa YouTube jeszcze nie działa</div>
                            <div style="font-size:0.875rem; color:#CBD5E1; max-width:480px; margin:0 auto; line-height:1.55;">
                                Silnik pobierania z YouTube jest obecnie w trakcie prac integracyjnych i zostanie uruchomiony wkrótce.<br><br>
                                W tej chwili możesz pobierać wideo bez znaku wodnego z <strong style="color:#34D399;">TikToka HD</strong> oraz <strong style="color:#38BDF8;">X (Twittera)</strong>.
                            </div>
                        </div>
                    `;
                }
                return;
            }

            if (/instagram\.com/i.test(targetUrl)) {
                this.showToast('ℹ️ Pobieranie z Instagrama nie jest jeszcze aktywne. Działa TikTok i X!', 'warning');
                if (this.resultsWrap) {
                    this.resultsWrap.innerHTML = `
                        <div class="grabber-error-box" style="padding:24px 20px; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.28); border-radius:16px; text-align:center; color:#FDE68A; backdrop-filter:blur(14px);">
                            <div style="display:inline-flex; align-items:center; justify-content:center; width:44px; height:44px; border-radius:12px; background:rgba(245,158,11,0.15); margin-bottom:12px; color:#FBBF24;">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            </div>
                            <div style="font-weight:700; font-size:1.05rem; margin-bottom:6px; color:#FBBF24;">Obsługa Instagrama jeszcze nie działa</div>
                            <div style="font-size:0.875rem; color:#CBD5E1; max-width:480px; margin:0 auto; line-height:1.55;">
                                Silnik pobierania rolek i postów z Instagrama jest w trakcie dopracowywania i będzie dostępny wkrótce.<br><br>
                                W tej chwili stabilnie działa pobieranie wideo z <strong style="color:#34D399;">TikToka HD</strong> oraz <strong style="color:#38BDF8;">X (Twittera)</strong>.
                            </div>
                        </div>
                    `;
                }
                return;
            }

            if (this.isProcessing) return;
            this.setLoading(true);

            try {
                const adminSecret = sessionStorage.getItem('adminSecret') || localStorage.getItem('dropsite_pro_license') || '';
                const headers = {
                    'Content-Type': 'application/json'
                };
                if (adminSecret) {
                    headers['X-Admin-Secret'] = adminSecret;
                }

                const res = await fetch(`${this.apiBase}/api/grab-media`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ url: targetUrl })
                });

                const data = await res.json();

                if (!res.ok || !data.success) {
                    throw new Error(data.message || 'Nie udało się pobrać multimediów z podanego linku.');
                }

                this.currentData = data;
                this.renderResults(data);
                this.showToast('✅ Multimedia pomyślnie zdekodowane!', 'success');
            } catch (err) {
                console.error('Grab error:', err);
                this.showToast(err.message || 'Wystąpił błąd podczas analizy linku.', 'error');
                if (this.resultsWrap) {
                    this.resultsWrap.innerHTML = `
                        <div class="grabber-error-box" style="padding:20px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:14px; text-align:center; color:#FCA5A5;">
                            <div style="font-weight:700; margin-bottom:6px;">⚠️ Nie udało się pobrać wideo</div>
                            <div style="font-size:0.85rem; color:#CBD5E1;">${this.escapeHtml(err.message || 'Upewnij się, że post/wideo jest publiczne i dostępne bez logowania.')}</div>
                        </div>
                    `;
                }
            } finally {
                this.setLoading(false);
            }
        },

        setLoading(loading) {
            this.isProcessing = loading;
            if (this.submitBtn) {
                this.submitBtn.disabled = loading;
                this.submitBtn.innerHTML = loading 
                    ? `<span class="grabber-mini-spin"></span> Przetwarzanie...`
                    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Pobierz`;
            }

            if (this.loadingWrap) {
                this.loadingWrap.style.display = loading ? 'flex' : 'none';
            }

            if (loading && this.resultsWrap) {
                this.resultsWrap.innerHTML = '';
            }
        },

        renderResults(data) {
            if (!this.resultsWrap) return;

            const title = data.title || 'Pobrane Wideo';
            const thumbnail = data.thumbnail || '';
            const author = data.author;
            const mediaList = data.media || [];
            const photoList = data.photos || [];

            const primaryVideo = mediaList.find(m => m.type === 'video' && m.isPrimary) || mediaList.find(m => m.type === 'video');
            const audioItem = mediaList.find(m => m.type === 'audio' || m.format === 'mp3');

            let authorHtml = '';
            if (author) {
                authorHtml = `
                    <div class="grabber-author-tag">
                        ${author.avatar ? `<img src="${this.escapeHtml(author.avatar)}" alt="${this.escapeHtml(author.name)}" style="width:18px;height:18px;border-radius:50%;object-fit:cover;">` : ''}
                        <span>${this.escapeHtml(author.name)}</span>
                        ${author.handle ? `<span style="color:#64748B;font-size:0.75rem;">${this.escapeHtml(author.handle)}</span>` : ''}
                    </div>
                `;
            }

            const platformKey = (data.platform || 'social').toLowerCase();
            const PLATFORM_ICONS = {
                tiktok: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-right:4px;"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298 0 .592.046.87.14V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.47 6.3 6.3 0 0 0 1.87-4.47V8.71a8.28 8.28 0 0 0 4.9 1.58V6.85a4.85 4.85 0 0 1-1-.16Z"/></svg>`,
                youtube: `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="margin-right:4px;"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
                instagram: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-right:4px;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>`,
                twitter: `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style="margin-right:4px;"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
                pinterest: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-right:4px;"><path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.334 1.357-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/></svg>`
            };

            const brandIcon = PLATFORM_ICONS[platformKey] || `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="3" ry="3"/></svg>`;

            const platformBadge = `<span class="grabber-platform-pill active" data-platform="${platformKey}" style="text-transform:uppercase;font-size:0.7rem;padding:3px 8px;display:inline-flex;align-items:center;">${brandIcon}${data.platform || 'WIDEO'}</span>`;

            let actionsHtml = '';

            // 1. Główny przycisk: Pobierz Wideo MP4 HD
            if (primaryVideo && primaryVideo.url) {
                const streamDownloadUrl = `${this.apiBase}/api/grab-media/stream?url=${encodeURIComponent(primaryVideo.url)}&filename=${encodeURIComponent(this.sanitizeFilename(title) + '.mp4')}`;
                actionsHtml += `
                    <a href="${streamDownloadUrl}" class="grabber-action-btn is-primary" download="${this.sanitizeFilename(title)}.mp4">
                        <div class="grabber-action-icon" style="color:#10B981; background:rgba(16,185,129,0.15);">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </div>
                        <div class="grabber-action-text">
                            <strong>Pobierz Wideo MP4 HD</strong>
                            <span>${primaryVideo.quality || 'Czysty plik bez znaku wodnego'}</span>
                        </div>
                    </a>
                `;
            }

            // 2. Przycisk: Pobierz Dźwięk MP3
            if (audioItem && audioItem.url) {
                const streamAudioUrl = `${this.apiBase}/api/grab-media/stream?url=${encodeURIComponent(audioItem.url)}&filename=${encodeURIComponent(this.sanitizeFilename(title) + '_audio.mp3')}&type=audio/mpeg`;
                actionsHtml += `
                    <a href="${streamAudioUrl}" class="grabber-action-btn is-audio" download="${this.sanitizeFilename(title)}_audio.mp3">
                        <div class="grabber-action-icon" style="color:#A78BFA; background:rgba(167,139,250,0.15);">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                        </div>
                        <div class="grabber-action-text">
                            <strong>Pobierz Dźwięk MP3</strong>
                            <span>Oryginalna ścieżka audio</span>
                        </div>
                    </a>
                `;
            }

            // 3. Przycisk: Zapisz bezpośrednio w chmurze Dropsite R2 (Zero zużycia transferu!)
            if (primaryVideo && primaryVideo.url) {
                actionsHtml += `
                    <button type="button" class="grabber-action-btn is-save-cloud" id="btnGrabSaveCloud" data-url="${this.escapeHtml(primaryVideo.url)}" data-filename="${this.escapeHtml(this.sanitizeFilename(title) + '.mp4')}">
                        <div class="grabber-action-icon" style="color:#38BDF8; background:rgba(56,189,248,0.15);">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
                        </div>
                        <div class="grabber-action-text">
                            <strong>Zapisz w Chmurze Dropsite</strong>
                            <span>Generuj link R2 (zero pobierania)</span>
                        </div>
                    </button>
                `;
            }

            // 4. Przycisk: Skompresuj do 25MB (Discord/Email) w RAM
            if (primaryVideo && primaryVideo.url) {
                actionsHtml += `
                    <button type="button" class="grabber-action-btn is-compress" id="btnGrabToCompressor" data-url="${this.escapeHtml(primaryVideo.url)}" data-filename="${this.escapeHtml(this.sanitizeFilename(title) + '.mp4')}">
                        <div class="grabber-action-icon" style="color:#FBBF24; background:rgba(251,191,36,0.15);">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                        </div>
                        <div class="grabber-action-text">
                            <strong>Kompresuj do 25 MB</strong>
                            <span>Gotowe na Discord / E-mail</span>
                        </div>
                    </button>
                `;
            }

            // 5. Jeśli to galeria zdjęć (TikTok/Instagram)
            let photosSectionHtml = '';
            if (photoList.length > 0) {
                photosSectionHtml = `
                    <div style="margin-top:10px;">
                        <div style="font-size:0.85rem; font-weight:700; color:#E2E8F0; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                            <span>📸 Galeria zdjęć (${photoList.length})</span>
                        </div>
                        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(110px, 1fr)); gap:8px;">
                            ${photoList.map((p, idx) => `
                                <div style="border-radius:8px; overflow:hidden; border:1px solid rgba(255,255,255,0.1); background:#000; position:relative; aspect-ratio:1;">
                                    <img src="${this.escapeHtml(p.url)}" alt="Slajd ${idx + 1}" style="width:100%; height:100%; object-fit:cover;">
                                    <a href="${this.apiBase}/api/grab-media/stream?url=${encodeURIComponent(p.url)}&filename=${encodeURIComponent(`slajd_${idx + 1}.jpg`)}&type=image/jpeg" download="slajd_${idx + 1}.jpg" style="position:absolute; bottom:4px; right:4px; background:rgba(0,0,0,0.75); border:1px solid rgba(255,255,255,0.2); border-radius:6px; color:#fff; padding:4px 6px; font-size:0.7rem; text-decoration:none; display:flex; align-items:center; gap:3px;">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                        #${idx + 1}
                                    </a>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            this.resultsWrap.innerHTML = `
                <div class="grabber-result-card">
                    <div class="grabber-result-header">
                        <div class="grabber-result-thumb-box">
                            ${thumbnail 
                                ? `<img src="${this.escapeHtml(thumbnail)}" alt="${this.escapeHtml(title)}" onerror="this.style.display='none'">` 
                                : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748B;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>`}
                        </div>
                        <div class="grabber-result-info">
                            <div class="grabber-result-meta">
                                ${platformBadge}
                                ${authorHtml}
                            </div>
                            <div class="grabber-result-title" title="${this.escapeHtml(title)}">${this.escapeHtml(title)}</div>
                        </div>
                    </div>

                    <div class="grabber-actions-grid">
                        ${actionsHtml}
                    </div>

                    ${photosSectionHtml}

                    <div id="grabberCloudResultBox" style="display:none; margin-top:8px;"></div>
                </div>
            `;

            // Podpięcie akcji Cloud Save & Compressor
            const saveCloudBtn = document.getElementById('btnGrabSaveCloud');
            if (saveCloudBtn) {
                saveCloudBtn.addEventListener('click', () => this.handleSaveToCloud(saveCloudBtn));
            }

            const compressBtn = document.getElementById('btnGrabToCompressor');
            if (compressBtn) {
                compressBtn.addEventListener('click', () => this.handleSendToCompressor(compressBtn));
            }
        },

        async handleSaveToCloud(btn) {
            const streamUrl = btn.getAttribute('data-url');
            const filename = btn.getAttribute('data-filename') || 'grabbed_video.mp4';
            const originalHtml = btn.innerHTML;
            const resultBox = document.getElementById('grabberCloudResultBox');

            btn.disabled = true;
            btn.innerHTML = `<span class="grabber-mini-spin"></span> Zapisywanie na R2...`;

            try {
                const userEmail = localStorage.getItem('dropsite_user_email') || '';
                const res = await fetch(`${this.apiBase}/api/grab-media/save-to-dropsite`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-Email': userEmail
                    },
                    body: JSON.stringify({
                        url: streamUrl,
                        filename: filename,
                        userEmail: userEmail
                    })
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.message || 'Błąd zapisu do chmury.');
                }

                if (resultBox) {
                    resultBox.style.display = 'block';
                    resultBox.innerHTML = `
                        <div style="background:rgba(16,185,129,0.12); border:1px solid rgba(52,211,153,0.4); border-radius:12px; padding:14px 18px; display:flex; flex-direction:column; gap:8px;">
                            <div style="display:flex; align-items:center; justify-content:space-between;">
                                <span style="color:#34D399; font-weight:700; font-size:0.88rem; display:flex; align-items:center; gap:6px;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                    Zapisano w chmurze Dropsite!
                                </span>
                                <span style="font-size:0.75rem; color:#94A3B8;">Ważność: 24h</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:8px; background:rgba(0,0,0,0.5); padding:6px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.1);">
                                <input type="text" readonly value="${this.escapeHtml(data.pageUrl)}" style="flex-grow:1; background:transparent; border:none; color:#F8FAFC; font-size:0.8rem; outline:none;" id="grabberCloudShareInput">
                                <button type="button" id="btnCopyGrabberCloud" style="background:#10B981; border:none; color:#fff; border-radius:6px; padding:6px 12px; font-size:0.75rem; font-weight:700; cursor:pointer;">
                                    Kopiuj link
                                </button>
                            </div>
                        </div>
                    `;

                    const copyBtn = document.getElementById('btnCopyGrabberCloud');
                    const shareInput = document.getElementById('grabberCloudShareInput');
                    if (copyBtn && shareInput) {
                        copyBtn.addEventListener('click', async () => {
                            try {
                                await navigator.clipboard.writeText(shareInput.value);
                                copyBtn.textContent = 'Skopiowano!';
                                setTimeout(() => { copyBtn.textContent = 'Kopiuj link'; }, 2500);
                                this.showToast('🔗 Skopiowano link do schowka!', 'success');
                            } catch (_) {}
                        });
                    }
                }

                this.showToast('☁️ Plik zapisany na Dropsite R2!', 'success');
            } catch (err) {
                this.showToast(err.message || 'Błąd zapisu do chmury.', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        },

        async handleSendToCompressor(btn) {
            const streamUrl = btn.getAttribute('data-url');
            const filename = btn.getAttribute('data-filename') || 'video.mp4';
            const originalHtml = btn.innerHTML;

            btn.disabled = true;
            btn.innerHTML = `<span class="grabber-mini-spin"></span> Pobieranie do RAM...`;

            try {
                // Pobieramy plik przez stream proxy do RAM-u
                const res = await fetch(`${this.apiBase}/api/grab-media/stream?url=${encodeURIComponent(streamUrl)}&filename=${encodeURIComponent(filename)}`);
                if (!res.ok) throw new Error('Nie udało się pobrać strumienia wideo.');
                
                const blob = await res.blob();
                const file = new File([blob], filename, { type: blob.type || 'video/mp4' });

                // Przełącz na narzędzie Video Compressor
                if (typeof window.switchToolTab === 'function') {
                    window.switchToolTab('compressor');
                }

                // Załaduj plik do kompresora
                setTimeout(() => {
                    if (window.DropsiteCompressor && typeof window.DropsiteCompressor.loadVideoFile === 'function') {
                        window.DropsiteCompressor.loadVideoFile(file);
                        this.showToast('🚀 Załadowano wideo do kompresora!', 'success');
                    } else {
                        // Fallback: symulacja upuszczenia do inputu kompresora
                        const compInput = document.getElementById('compressorFileInput') || document.getElementById('videoCompressFileInput');
                        if (compInput) {
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(file);
                            compInput.files = dataTransfer.files;
                            compInput.dispatchEvent(new Event('change', { bubbles: true }));
                            this.showToast('🚀 Załadowano wideo do kompresora!', 'success');
                        }
                    }
                }, 300);

            } catch (err) {
                this.showToast(err.message || 'Błąd transferu do kompresora.', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        },

        showToast(message, type = 'info') {
            if (typeof window.showToast === 'function') {
                window.showToast(message, type);
            } else {
                console.log(`[Toast ${type}] ${message}`);
            }
        },

        sanitizeFilename(name) {
            return (name || 'wideo')
                .replace(/[/\\?%*:|"<>]/g, '')
                .replace(/\s+/g, '_')
                .slice(0, 60);
        },

        escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
    };

    window.DropsiteMediaGrabber = DropsiteMediaGrabber;

    document.addEventListener('DOMContentLoaded', () => {
        DropsiteMediaGrabber.init();
    });

})(window);
