/**
 * DROPSITE ACCOUNT VAULT & SCRATCHPAD
 * Bezpieczny podręczny notatnik z autozapisem w czasie rzeczywistym
 * powiązany bezpośrednio z kontem użytkownika i magazynem R2 w chmurze.
 * Zwiększone odstępy między liniami, estetyczna numeracja (Gutter) i asystent porządkowania.
 * Brand Guidelines: Obsidian Glass, Cyber Mint & Neon Cyan, Pure inline SVG, Zero Emojis.
 */

(function () {
    'use strict';

    const WORKER_URL = window.WORKER_URL || 'https://uploud-api.dropsite33.workers.dev';

    // Domyślne szablony dla nowych użytkowników
    const DEFAULT_NOTES = [
        {
            id: 'note_passwords_vault',
            title: 'Hasła, Kody i Dostęp',
            content: `// DROPSITE ACCOUNT VAULT — KODY I HASŁA
// Notatka zapisuje się automatycznie na Twoim koncie w chmurze.

[Serwery i Chmura]
Cloudflare / R2: admin@dropsite.com
PIN do serwerowni: 8492
Klucz API Produkcja: dp_live_9f81a72b4c1092e48fa

[Konta Zapasowe & 2FA]
01. 8491-2940-1192
02. 3902-8819-4820
03. 5910-3847-1903

[Wskazówka bezpieczeństwa]
Kliknij ikonę oka (Ukryj), aby rozmyć treść przy osobach trzecich!`,
            category: 'passwords',
            isMasked: false,
            isMonospace: true,
            isPinned: true,
            updatedAt: new Date().toISOString()
        },
        {
            id: 'note_quick_scratchpad',
            title: 'Podręczny Notatnik',
            content: `Podręczny notatnik Dropsite — wpisuj tutaj tymczasowe teksty, szkice, numery przesyłek, linki i kody BLIK.

Każda linia ma swój własny odstęp i numer w panelu:
- Dostępne z każdego urządzenia po zalogowaniu
- Tryb czcionki programistycznej { } dla kodów i json
- Wbudowany generator silnych haseł i PIN-ów
- Narzędzie "Uporządkuj" do automatycznej numeracji i zwiększania odstępów`,
            category: 'notes',
            isMasked: false,
            isMonospace: false,
            isPinned: false,
            updatedAt: new Date().toISOString()
        }
    ];

    class DropsiteVaultEngine {
        constructor() {
            this.notes = [];
            this.activeNoteId = null;
            this.activeCategory = 'all';
            this.searchQuery = '';
            this.syncStatus = 'idle'; // 'idle' | 'saving' | 'synced' | 'guest'
            this.lastSynced = null;
            this.debounceSaveTimer = null;
            this.isGeneratorOpen = false;
            this.isFormatOpen = false;
            this.showLineNumbers = localStorage.getItem('dropsite_vault_line_nums') !== '0';
            this.generatorSettings = { length: 16, type: 'pass' };
            this.pendingDeleteNoteId = null;
            this.pendingDeleteTimer = null;

            this.init();
        }

        init() {
            this.loadInitialData();
            this.bindGlobalEvents();
        }

        getCurrentUserEmail() {
            if (typeof window.getCurrentUserEmail === 'function') {
                const em = window.getCurrentUserEmail();
                if (em) return em.toLowerCase().trim();
            }
            if (window.auth && window.auth.currentUser && window.auth.currentUser.email) {
                return window.auth.currentUser.email.toLowerCase().trim();
            }
            const localEm = localStorage.getItem('dropsite_user_email');
            return localEm ? localEm.toLowerCase().trim() : '';
        }

        getStorageKey() {
            const email = this.getCurrentUserEmail();
            if (email) {
                const safeEmail = email.replace(/[^a-zA-Z0-9_.-]/g, '_');
                return `dropsite_user_vault_${safeEmail}`;
            }
            return 'dropsite_guest_vault';
        }

        loadInitialData() {
            const storageKey = this.getStorageKey();
            let saved = null;
            try {
                const raw = localStorage.getItem(storageKey);
                if (raw) saved = JSON.parse(raw);
            } catch (_) {}

            if (saved && Array.isArray(saved.notes) && saved.notes.length > 0) {
                this.notes = saved.notes;
                this.activeNoteId = saved.activeNoteId || this.notes[0].id;
                this.lastSynced = saved.lastSynced || null;
            } else {
                this.notes = JSON.parse(JSON.stringify(DEFAULT_NOTES));
                this.activeNoteId = this.notes[0].id;
                this.saveToLocalStorage();
            }

            const email = this.getCurrentUserEmail();
            if (email) {
                this.syncFromCloud();
            } else {
                this.syncStatus = 'guest';
            }
        }

        saveToLocalStorage() {
            try {
                const data = {
                    notes: this.notes,
                    activeNoteId: this.activeNoteId,
                    lastSynced: this.lastSynced,
                    updatedAt: new Date().toISOString()
                };
                localStorage.setItem(this.getStorageKey(), JSON.stringify(data));
            } catch (e) {
                console.warn('[Vault] Błąd zapisu lokalnego:', e);
            }
        }

        getActiveNote() {
            if (!this.notes.length) return null;
            let note = this.notes.find(n => n.id === this.activeNoteId);
            if (!note) {
                note = this.notes[0];
                this.activeNoteId = note.id;
            }
            return note;
        }

        triggerAutoSave() {
            this.saveToLocalStorage();
            this.updateStatusBar();
            this.updateBadgeCounts();

            const email = this.getCurrentUserEmail();
            if (!email) {
                this.syncStatus = 'guest';
                this.renderSyncIndicator();
                return;
            }

            this.syncStatus = 'saving';
            this.renderSyncIndicator();

            if (this.debounceSaveTimer) clearTimeout(this.debounceSaveTimer);
            this.debounceSaveTimer = setTimeout(() => {
                this.syncToCloud();
            }, 750);
        }

        async syncToCloud() {
            const email = this.getCurrentUserEmail();
            if (!email) return;

            try {
                const res = await fetch(`${WORKER_URL}/api/notes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-Email': email
                    },
                    body: JSON.stringify({
                        notes: this.notes,
                        activeNoteId: this.activeNoteId
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        this.syncStatus = 'synced';
                        this.lastSynced = data.lastSynced || new Date().toISOString();
                        this.saveToLocalStorage();
                    } else {
                        this.syncStatus = 'idle';
                    }
                } else {
                    this.syncStatus = 'idle';
                }
            } catch (err) {
                console.warn('[Vault] Błąd synchronizacji w chmurze:', err);
                this.syncStatus = 'idle';
            } finally {
                this.renderSyncIndicator();
            }
        }

        async syncFromCloud() {
            const email = this.getCurrentUserEmail();
            if (!email) return;

            try {
                this.syncStatus = 'saving';
                this.renderSyncIndicator();

                const res = await fetch(`${WORKER_URL}/api/notes?email=${encodeURIComponent(email)}`, {
                    headers: {
                        'X-User-Email': email
                    }
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.notes) && data.notes.length > 0) {
                        this.notes = data.notes;
                        if (data.activeNoteId && this.notes.some(n => n.id === data.activeNoteId)) {
                            this.activeNoteId = data.activeNoteId;
                        } else {
                            this.activeNoteId = this.notes[0].id;
                        }
                        this.lastSynced = data.lastSynced || new Date().toISOString();
                        this.saveToLocalStorage();
                        this.syncStatus = 'synced';
                        this.renderAllViews();
                    } else {
                        this.syncToCloud();
                    }
                }
            } catch (err) {
                console.warn('[Vault] Błąd pobierania notatek z chmury:', err);
                this.syncStatus = 'idle';
            } finally {
                this.renderSyncIndicator();
                this.updateBadgeCounts();
            }
        }

        onUserAuthChanged(user) {
            this.loadInitialData();
            this.renderAllViews();
        }

        createNewNote(template = 'blank') {
            this.resetPendingDelete();
            const id = 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            let title = 'Nowa notatka';
            let content = '';
            let category = 'notes';
            let isMonospace = false;

            if (template === 'passwords') {
                title = 'Nowe Kody i Dostęp';
                content = `// Dane dostępowe i kody PIN\nSerwis: \nLogin: \nHasło: \nPIN: \nKody 2FA: `;
                category = 'passwords';
                isMonospace = true;
            } else if (template === 'codes') {
                title = 'Nowy Snippet & Token';
                content = `// Klucze API i konfiguracje\nKEY=""\nSECRET=""\n`;
                category = 'codes';
                isMonospace = true;
            }

            const newNote = {
                id,
                title,
                content,
                category,
                isMasked: false,
                isMonospace,
                isPinned: false,
                updatedAt: new Date().toISOString()
            };

            this.notes.unshift(newNote);
            this.activeNoteId = id;
            this.triggerAutoSave();
            this.renderAllViews();

            setTimeout(() => {
                const titleInputs = document.querySelectorAll('.vault-title-input');
                titleInputs.forEach(inp => {
                    inp.focus();
                    inp.select();
                });
            }, 100);
        }

        resetPendingDelete() {
            if (this.pendingDeleteTimer) {
                clearTimeout(this.pendingDeleteTimer);
                this.pendingDeleteTimer = null;
            }
            this.pendingDeleteNoteId = null;
            const delBtns = document.querySelectorAll('#vaultToolDeleteBtn');
            delBtns.forEach(btn => {
                btn.classList.remove('confirming-delete');
                btn.title = 'Usuń tę notatkę';
                btn.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                `;
            });
        }

        deleteActiveNote() {
            const activeNote = this.getActiveNote();
            if (!activeNote) return;

            // Pierwsze kliknięcie: uzbrojenie przycisku (wymaga ponownego kliknięcia w ciągu 3.5s)
            if (this.pendingDeleteNoteId !== activeNote.id) {
                this.pendingDeleteNoteId = activeNote.id;

                const delBtns = document.querySelectorAll('#vaultToolDeleteBtn');
                delBtns.forEach(btn => {
                    btn.classList.add('confirming-delete');
                    btn.title = 'Kliknij ponownie, aby bezpowrotnie usunąć tę notatkę';
                    btn.innerHTML = `
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                        <span class="vault-delete-confirm-label">Kliknij, by usunąć!</span>
                    `;
                });

                if (this.pendingDeleteTimer) clearTimeout(this.pendingDeleteTimer);
                this.pendingDeleteTimer = setTimeout(() => {
                    this.resetPendingDelete();
                }, 3500);
                return;
            }

            // Drugie kliknięcie: faktyczne usunięcie notatki bez żadnych okienek systemowych
            this.resetPendingDelete();

            this.notes = this.notes.filter(n => n.id !== activeNote.id);
            if (this.notes.length === 0) {
                this.createNewNote();
            } else {
                this.activeNoteId = this.notes[0].id;
            }

            this.triggerAutoSave();
            this.renderAllViews();
            if (typeof window.showNotification === 'function') {
                window.showNotification('Notatka została usunięta.', 'info');
            }
        }

        togglePinActiveNote() {
            const activeNote = this.getActiveNote();
            if (!activeNote) return;
            activeNote.isPinned = !activeNote.isPinned;
            this.notes.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
            this.triggerAutoSave();
            this.renderAllViews();
        }

        toggleMaskActiveNote() {
            const activeNote = this.getActiveNote();
            if (!activeNote) return;
            activeNote.isMasked = !activeNote.isMasked;
            this.triggerAutoSave();
            this.renderEditorPane();
        }

        toggleMonospaceActiveNote() {
            const activeNote = this.getActiveNote();
            if (!activeNote) return;
            activeNote.isMonospace = !activeNote.isMonospace;
            this.triggerAutoSave();
            this.renderEditorPane();
        }

        toggleLineNumbers() {
            this.showLineNumbers = !this.showLineNumbers;
            localStorage.setItem('dropsite_vault_line_nums', this.showLineNumbers ? '1' : '0');
            this.renderEditorPane();
            if (typeof window.showNotification === 'function') {
                window.showNotification(this.showLineNumbers ? 'Włączono numerację linii' : 'Wyłączono numerację linii', 'info');
            }
        }

        copyActiveNoteContent() {
            const activeNote = this.getActiveNote();
            if (!activeNote || !activeNote.content) {
                if (typeof window.showNotification === 'function') {
                    window.showNotification('Notatka jest pusta.', 'info');
                }
                return;
            }

            navigator.clipboard.writeText(activeNote.content).then(() => {
                if (typeof window.showNotification === 'function') {
                    window.showNotification('Skopiowano treść notatki do schowka', 'success');
                }
            }).catch(() => {
                const ta = document.createElement('textarea');
                ta.value = activeNote.content;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                if (typeof window.showNotification === 'function') {
                    window.showNotification('Skopiowano treść notatki do schowka', 'success');
                }
            });
        }

        downloadActiveNote() {
            const activeNote = this.getActiveNote();
            if (!activeNote) return;

            const blob = new Blob([activeNote.content || ''], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const safeName = (activeNote.title || 'notatka').replace(/[^a-zA-Z0-9_\-\u0100-\u017F]/g, '_');
            a.href = url;
            a.download = `${safeName}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        // ASYSTENT ESTETYKI I FORMATOWANIA LISTY HASEŁ
        formatAddNumbering() {
            const activeNote = this.getActiveNote();
            if (!activeNote || !activeNote.content) return;

            const lines = activeNote.content.split('\n');
            let counter = 1;
            const formatted = lines.map(line => {
                if (!line.trim()) return line;
                // Usuń poprzednie numeracje jeśli istniały
                const clean = line.replace(/^\s*(\d+[\.\)]|\•|\-)\s*/, '');
                const numStr = counter < 10 ? `0${counter}` : `${counter}`;
                counter++;
                return `${numStr}. ${clean}`;
            });

            activeNote.content = formatted.join('\n');
            activeNote.updatedAt = new Date().toISOString();
            this.triggerAutoSave();
            this.renderEditorPane();
            this.isFormatOpen = false;
            this.renderFormatPopover();
            if (typeof window.showNotification === 'function') {
                window.showNotification('Dodano estetyczną numerację haseł (01., 02....)', 'success');
            }
        }

        formatRemoveNumbering() {
            const activeNote = this.getActiveNote();
            if (!activeNote || !activeNote.content) return;

            const lines = activeNote.content.split('\n');
            const formatted = lines.map(line => line.replace(/^\s*(\d+[\.\)]|\•|\-)\s*/, ''));
            activeNote.content = formatted.join('\n');
            activeNote.updatedAt = new Date().toISOString();
            this.triggerAutoSave();
            this.renderEditorPane();
            this.isFormatOpen = false;
            this.renderFormatPopover();
            if (typeof window.showNotification === 'function') {
                window.showNotification('Usunięto numerację z treści', 'info');
            }
        }

        formatAddSpacing() {
            const activeNote = this.getActiveNote();
            if (!activeNote || !activeNote.content) return;

            const lines = activeNote.content.split('\n');
            const nonBlank = lines.filter(l => l.trim().length > 0);
            activeNote.content = nonBlank.join('\n\n');
            activeNote.updatedAt = new Date().toISOString();
            this.triggerAutoSave();
            this.renderEditorPane();
            this.isFormatOpen = false;
            this.renderFormatPopover();
            if (typeof window.showNotification === 'function') {
                window.showNotification('Zwiększono odstępy między pozycjami', 'success');
            }
        }

        formatCompactSpacing() {
            const activeNote = this.getActiveNote();
            if (!activeNote || !activeNote.content) return;

            const lines = activeNote.content.split('\n');
            const nonBlank = lines.filter(l => l.trim().length > 0);
            activeNote.content = nonBlank.join('\n');
            activeNote.updatedAt = new Date().toISOString();
            this.triggerAutoSave();
            this.renderEditorPane();
            this.isFormatOpen = false;
            this.renderFormatPopover();
            if (typeof window.showNotification === 'function') {
                window.showNotification('Zagęszczono listę (usunięto puste wiersze)', 'info');
            }
        }

        formatSortAlpha() {
            const activeNote = this.getActiveNote();
            if (!activeNote || !activeNote.content) return;

            const lines = activeNote.content.split('\n');
            const nonBlank = lines.filter(l => l.trim().length > 0);
            nonBlank.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
            activeNote.content = nonBlank.join('\n');
            activeNote.updatedAt = new Date().toISOString();
            this.triggerAutoSave();
            this.renderEditorPane();
            this.isFormatOpen = false;
            this.renderFormatPopover();
            if (typeof window.showNotification === 'function') {
                window.showNotification('Posortowano listę alfabetycznie (A-Z)', 'success');
            }
        }

        // GENERATOR HASEŁ
        generatePassword(type = 'pass', length = 16) {
            let charset = '';
            if (type === 'pass') {
                charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=~';
            } else if (type === 'pin') {
                charset = '0123456789';
            } else if (type === 'token') {
                charset = '0123456789abcdef';
            } else if (type === 'readable') {
                charset = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            }

            let result = '';
            const randomValues = new Uint32Array(length);
            window.crypto.getRandomValues(randomValues);
            for (let i = 0; i < length; i++) {
                result += charset[randomValues[i] % charset.length];
            }
            return result;
        }

        insertGeneratedSecret(secret) {
            const activeNote = this.getActiveNote();
            if (!activeNote) return;

            const insertText = (activeNote.content && !activeNote.content.endsWith('\n') ? '\n' : '') + secret;
            activeNote.content = (activeNote.content || '') + insertText;
            activeNote.updatedAt = new Date().toISOString();
            this.triggerAutoSave();
            this.renderEditorPane();

            navigator.clipboard.writeText(secret).catch(() => {});
            if (typeof window.showNotification === 'function') {
                window.showNotification('Wstawiono wygenerowane hasło i skopiowano do schowka', 'success');
            }
            this.isGeneratorOpen = false;
            this.renderGeneratorPopover();
        }

        generateLineNumbersHtml(content) {
            const lines = (content || '').split('\n');
            const count = Math.max(lines.length, 1);
            let html = '';
            for (let i = 1; i <= count; i++) {
                const numStr = i < 10 ? `0${i}` : `${i}`;
                html += `<span class="vault-line-num">${numStr}</span>`;
            }
            return html;
        }

        updateLineNumbersGutter(pane, content) {
            const gutter = pane.querySelector('#vaultLineNumbers');
            if (!gutter) return;
            if (!this.showLineNumbers) {
                gutter.style.display = 'none';
                return;
            }
            gutter.style.display = 'block';
            gutter.innerHTML = this.generateLineNumbersHtml(content);
        }

        renderContainer(targetEl) {
            if (!targetEl) return;

            targetEl.innerHTML = `
                <div class="account-vault-wrap">
                    <!-- Top Bar -->
                    <div class="vault-topbar">
                        <div class="vault-brand-meta">
                            <div class="vault-badge-icon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                            </div>
                            <div class="vault-title-text">
                                <span class="vault-main-title">
                                    Sejf Notatek &amp; Kodów <span class="vault-sparkle">✦</span>
                                </span>
                                <span class="vault-user-chip" id="vaultUserChip">
                                    Ładowanie konta...
                                </span>
                            </div>
                        </div>

                        <!-- Status synchronizacji chmury -->
                        <div class="vault-sync-indicator" id="vaultSyncIndicator" title="Stan synchronizacji z kontem w chmurze">
                            <span class="vault-sync-dot"></span>
                            <span class="vault-sync-label">Synchronizacja...</span>
                        </div>

                        <!-- Akcje główne nagłówka -->
                        <div class="vault-top-actions">
                            <button type="button" class="vault-btn-ghost" id="vaultNewPassBtn" title="Utwórz szablon na kody i hasła">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                                <span>+ Hasła</span>
                            </button>
                            <button type="button" class="vault-btn-primary" id="vaultNewNoteBtn" title="Utwórz nową czystą notatkę">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                <span>Nowa notatka</span>
                            </button>
                        </div>
                    </div>

                    <!-- Split Body -->
                    <div class="vault-split-body">
                        <!-- Sidebar: Lista notatek -->
                        <aside class="vault-sidebar">
                            <div class="vault-sidebar-search">
                                <div class="vault-search-box">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                    </svg>
                                    <input type="text" class="vault-search-input" id="vaultSearchInput" placeholder="Szukaj notatek i kodów...">
                                </div>
                            </div>

                            <div class="vault-category-chips">
                                <button type="button" class="vault-cat-chip ${this.activeCategory === 'all' ? 'active' : ''}" data-cat="all">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -1px; margin-right: 4px;"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>Wszystkie
                                </button>
                                <button type="button" class="vault-cat-chip ${this.activeCategory === 'passwords' ? 'active' : ''}" data-cat="passwords">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -1px; margin-right: 4px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>Hasła &amp; PIN
                                </button>
                                <button type="button" class="vault-cat-chip ${this.activeCategory === 'codes' ? 'active' : ''}" data-cat="codes">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -1px; margin-right: 4px;"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>Snippety
                                </button>
                                <button type="button" class="vault-cat-chip ${this.activeCategory === 'notes' ? 'active' : ''}" data-cat="notes">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -1px; margin-right: 4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>Notatki
                                </button>
                            </div>

                            <div class="vault-notes-list" id="vaultNotesList"></div>
                        </aside>

                        <!-- Editor Pane -->
                        <main class="vault-editor-pane" id="vaultEditorPane">
                            <!-- Rendered by renderEditorPane() -->
                        </main>
                    </div>

                    <!-- Statusbar -->
                    <div class="vault-statusbar">
                        <div class="vault-stats-group">
                            <span class="vault-stat-item" id="vaultStatChars">Znaki: <strong>0</strong></span>
                            <span class="vault-stat-item" id="vaultStatWords">Słowa: <strong>0</strong></span>
                            <span class="vault-stat-item" id="vaultStatLines">Linie: <strong>0</strong></span>
                        </div>
                        <div class="vault-sync-time" id="vaultSyncTime">
                            Ostatni zapis: teraz
                        </div>
                    </div>
                </div>
            `;

            this.bindContainerEvents(targetEl);
            this.renderAllViews();
        }

        renderAllViews() {
            this.renderSidebarList();
            this.renderEditorPane();
            this.renderSyncIndicator();
            this.updateStatusBar();
            this.updateUserChip();
        }

        updateUserChip() {
            const chips = document.querySelectorAll('#vaultUserChip');
            const email = this.getCurrentUserEmail();
            chips.forEach(chip => {
                if (email) {
                    chip.innerHTML = `
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span class="vault-user-email" title="Konto: ${email}">${email}</span>
                        <span style="color: #34D399; font-weight: 700; font-size: 10px; display: inline-flex; align-items: center; gap: 3px;">
                            <span style="width: 5px; height: 5px; border-radius: 50%; background: #34D399; display: inline-block;"></span> Profil aktywny
                        </span>
                    `;
                } else {
                    chip.innerHTML = `
                        <span style="color: #F59E0B; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            Tryb gościa
                        </span>
                        <a href="javascript:void(0)" onclick="if(window.openLoginModal) window.openLoginModal();" style="color: #38BDF8; text-decoration: underline; margin-left: 4px;">Zaloguj, aby synchronizować</a>
                    `;
                }
            });
        }

        renderSyncIndicator() {
            const indicators = document.querySelectorAll('#vaultSyncIndicator');
            indicators.forEach(ind => {
                ind.className = 'vault-sync-indicator';
                const label = ind.querySelector('.vault-sync-label');

                if (this.syncStatus === 'synced') {
                    ind.classList.add('synced');
                    if (label) label.textContent = 'Zapisano w chmurze';
                    ind.title = `Wszystkie zmiany zapisane na Twoim koncie w chmurze (${this.lastSynced ? new Date(this.lastSynced).toLocaleTimeString() : 'teraz'})`;
                } else if (this.syncStatus === 'saving') {
                    ind.classList.add('saving');
                    if (label) label.textContent = 'Zapisywanie...';
                    ind.title = 'Trwa natychmiastowy zapis zmian...';
                } else if (this.syncStatus === 'guest') {
                    ind.classList.add('guest');
                    if (label) label.textContent = 'Zapis lokalny (Gość)';
                    ind.title = 'Zaloguj się na konto, aby notatki były dostępne w chmurze na każdym urządzeniu.';
                } else {
                    ind.classList.add('synced');
                    if (label) label.textContent = 'Zapisano';
                }
            });
        }

        renderSidebarList() {
            const listEls = document.querySelectorAll('#vaultNotesList');
            const filtered = this.notes.filter(note => {
                if (this.activeCategory !== 'all' && note.category !== this.activeCategory) {
                    return false;
                }
                if (this.searchQuery) {
                    const q = this.searchQuery.toLowerCase();
                    const matchTitle = (note.title || '').toLowerCase().includes(q);
                    const matchContent = (note.content || '').toLowerCase().includes(q);
                    return matchTitle || matchContent;
                }
                return true;
            });

            listEls.forEach(list => {
                if (filtered.length === 0) {
                    list.innerHTML = `<div class="vault-empty-list">Brak notatek w tej kategorii.<br>Kliknij <strong>+ Nowa notatka</strong>, aby utworzyć pierwszą.</div>`;
                    return;
                }

                list.innerHTML = filtered.map(note => {
                    const isActive = note.id === this.activeNoteId;
                    const dateStr = note.updatedAt ? new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
                    const snippet = (note.content || '').replace(/\n+/g, ' ').substring(0, 48) || 'Pusta notatka';
                    const catClass = `cat-${note.category || 'notes'}`;
                    const catLabel = note.category === 'passwords' ? 'Hasła' : (note.category === 'codes' ? 'Kod' : 'Tekst');

                    return `
                        <div class="vault-note-item ${isActive ? 'active' : ''}" data-id="${note.id}">
                            <div class="vault-note-item-header">
                                <span class="vault-note-item-title">${escapeHtml(note.title || 'Bez tytułu')}</span>
                                ${note.isPinned ? `
                                    <span class="vault-pin-badge" title="Przypięta">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                            <line x1="12" y1="17" x2="12" y2="22"></line>
                                            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
                                        </svg>
                                    </span>
                                ` : ''}
                            </div>
                            <div class="vault-note-snippet">${escapeHtml(snippet)}</div>
                            <div class="vault-note-meta-row">
                                <span class="vault-note-category-tag ${catClass}">${catLabel}</span>
                                <span>${dateStr}</span>
                            </div>
                        </div>
                    `;
                }).join('');

                list.querySelectorAll('.vault-note-item').forEach(item => {
                    item.addEventListener('click', () => {
                        this.resetPendingDelete();
                        this.activeNoteId = item.getAttribute('data-id');
                        this.renderAllViews();
                    });
                });
            });
        }

        renderEditorPane() {
            const panes = document.querySelectorAll('#vaultEditorPane');
            const activeNote = this.getActiveNote();

            panes.forEach(pane => {
                if (!activeNote) {
                    pane.innerHTML = `<div class="vault-empty-list" style="padding-top: 100px;">Wybierz notatkę z listy lub utwórz nową.</div>`;
                    return;
                }

                pane.innerHTML = `
                    <!-- Editor Header -->
                    <div class="vault-editor-header">
                        <div class="vault-title-input-wrap">
                            <input type="text" class="vault-title-input" id="vaultTitleInput" value="${escapeHtml(activeNote.title || '')}" placeholder="Tytuł notatki...">
                        </div>

                        <div class="vault-editor-tools">
                            <!-- Generator Haseł -->
                            <button type="button" class="vault-tool-btn" id="vaultToolGenBtn" title="Wygeneruj silne hasło, PIN lub klucz API">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                                </svg>
                                <span>Generator</span>
                            </button>

                            <!-- Asystent Porządkowania i Odstępów -->
                            <button type="button" class="vault-tool-btn" id="vaultToolFormatBtn" title="Uporządkuj listę haseł, dodaj numerację lub zwiększ odstępy">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="21" y1="10" x2="3" y2="10"></line>
                                    <line x1="21" y1="6" x2="3" y2="6"></line>
                                    <line x1="21" y1="14" x2="3" y2="14"></line>
                                    <line x1="21" y1="18" x2="3" y2="18"></line>
                                </svg>
                                <span>Uporządkuj</span>
                            </button>

                            <!-- Przełącznik Numeracji Linii (Gutter) -->
                            <button type="button" class="vault-tool-btn ${this.showLineNumbers ? 'active' : ''}" id="vaultToolLineNumsBtn" title="Pokaż / Ukryj numerację linii na marginesie">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="10" y1="6" x2="21" y2="6"></line>
                                    <line x1="10" y1="12" x2="21" y2="12"></line>
                                    <line x1="10" y1="18" x2="21" y2="18"></line>
                                    <path d="M4 6h1v4"></path>
                                    <path d="M4 10h2"></path>
                                    <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
                                </svg>
                                <span>Numeracja</span>
                            </button>

                            <!-- Privacy Shield (Masking) -->
                            <button type="button" class="vault-tool-btn ${activeNote.isMasked ? 'active' : ''}" id="vaultToolMaskBtn" title="${activeNote.isMasked ? 'Odkryj treść' : 'Ukryj treść (ochrona przed podglądaniem)'}">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    ${activeNote.isMasked ? `
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    ` : `
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    `}
                                </svg>
                                <span>${activeNote.isMasked ? 'Odkryj' : 'Ukryj'}</span>
                            </button>

                            <!-- Monospace switch -->
                            <button type="button" class="vault-tool-btn ${activeNote.isMonospace ? 'active' : ''}" id="vaultToolMonoBtn" title="Przełącz czcionkę programistyczną / monospace">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="16 18 22 12 16 6"></polyline>
                                    <polyline points="8 6 2 12 8 18"></polyline>
                                </svg>
                                <span>{ } Kod</span>
                            </button>

                            <!-- Kopiuj całość -->
                            <button type="button" class="vault-tool-btn" id="vaultToolCopyBtn" title="Skopiuj całą treść notatki do schowka">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                <span>Kopiuj</span>
                            </button>

                            <!-- Pobierz .txt -->
                            <button type="button" class="vault-tool-btn" id="vaultToolDownloadBtn" title="Pobierz notatkę jako plik .txt">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                            </button>

                            <!-- Przypnij -->
                            <button type="button" class="vault-tool-btn ${activeNote.isPinned ? 'active' : ''}" id="vaultToolPinBtn" title="${activeNote.isPinned ? 'Odepnij z góry' : 'Przypnij notatkę na górze'}">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="12" y1="17" x2="12" y2="22"></line>
                                    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
                                </svg>
                            </button>

                            <!-- Usuń -->
                            <button type="button" class="vault-tool-btn danger" id="vaultToolDeleteBtn" title="Usuń tę notatkę">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- Textarea Wrap z numeracją linii (Gutter) i komfortowymi odstępami -->
                    <div class="vault-textarea-wrap">
                        <div class="vault-line-numbers" id="vaultLineNumbers" style="${this.showLineNumbers ? '' : 'display: none;'}">
                            ${this.generateLineNumbersHtml(activeNote.content)}
                        </div>

                        <div class="vault-textarea-inner">
                            <textarea 
                                class="vault-textarea ${activeNote.isMonospace ? 'is-monospace' : ''} ${activeNote.isMasked ? 'is-masked' : ''}" 
                                id="vaultTextarea" 
                                placeholder="Zacznij pisać tutaj... Hasła, kody, notatki zapisują się automatycznie na Twoim koncie."
                                spellcheck="false"
                            >${escapeHtml(activeNote.content || '')}</textarea>

                            ${activeNote.isMasked ? `
                                <div class="vault-mask-overlay">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                    <span>Treść ukryta. Najedź kursorem lub kliknij "Odkryj".</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Generator Popover Placeholder -->
                    <div id="vaultGenPopoverSlot"></div>

                    <!-- Format Popover Placeholder -->
                    <div id="vaultFormatPopoverSlot"></div>
                `;

                this.bindEditorEvents(pane, activeNote);
                this.renderGeneratorPopover();
                this.renderFormatPopover();
            });

            this.updateStatusBar();
        }

        renderFormatPopover() {
            const slots = document.querySelectorAll('#vaultFormatPopoverSlot');
            slots.forEach(slot => {
                if (!this.isFormatOpen) {
                    slot.innerHTML = '';
                    return;
                }

                slot.innerHTML = `
                    <div class="vault-format-popover" id="vaultFormatPopover">
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 6px 8px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 4px;">
                            <span style="font-size: 11.5px; font-weight: 700; color: #FFFFFF;">Estetyka i Odstępy</span>
                            <button type="button" class="mod-close" id="closeFormatBtn" style="font-size: 13px; padding: 2px;">✕</button>
                        </div>

                        <button type="button" class="vault-format-item" id="btnFmtNumbering">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h1v4"></path><path d="M4 10h2"></path><line x1="10" y1="6" x2="20" y2="6"></line><line x1="10" y1="12" x2="20" y2="12"></line><line x1="10" y1="18" x2="20" y2="18"></line></svg>
                            <span>Ponumeruj hasła (01., 02.)</span>
                        </button>

                        <button type="button" class="vault-format-item" id="btnFmtAddSpacing">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline><line x1="5" y1="5" x2="19" y2="5"></line></svg>
                            <span>Zwiększ odstępy (Rozstrzel)</span>
                        </button>

                        <button type="button" class="vault-format-item" id="btnFmtCompact">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline><line x1="5" y1="19" x2="19" y2="19"></line></svg>
                            <span>Zagęść (usuń puste linie)</span>
                        </button>

                        <button type="button" class="vault-format-item" id="btnFmtSort">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M6 12h12m-9 6h6"></path></svg>
                            <span>Sortuj alfabetycznie (A-Z)</span>
                        </button>

                        <button type="button" class="vault-format-item" id="btnFmtRemoveNums" style="color: #94A3B8;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            <span>Wyczyść numerację z tekstu</span>
                        </button>
                    </div>
                `;

                const popover = slot.querySelector('#vaultFormatPopover');
                if (!popover) return;

                popover.querySelector('#closeFormatBtn').addEventListener('click', () => {
                    this.isFormatOpen = false;
                    this.renderFormatPopover();
                });

                popover.querySelector('#btnFmtNumbering').addEventListener('click', () => this.formatAddNumbering());
                popover.querySelector('#btnFmtAddSpacing').addEventListener('click', () => this.formatAddSpacing());
                popover.querySelector('#btnFmtCompact').addEventListener('click', () => this.formatCompactSpacing());
                popover.querySelector('#btnFmtSort').addEventListener('click', () => this.formatSortAlpha());
                popover.querySelector('#btnFmtRemoveNums').addEventListener('click', () => this.formatRemoveNumbering());
            });
        }

        renderGeneratorPopover() {
            const slots = document.querySelectorAll('#vaultGenPopoverSlot');
            slots.forEach(slot => {
                if (!this.isGeneratorOpen) {
                    slot.innerHTML = '';
                    return;
                }

                const currentSecret = this.generatePassword(this.generatorSettings.type, this.generatorSettings.length);

                slot.innerHTML = `
                    <div class="vault-generator-popover" id="vaultGenPopover">
                        <div class="vault-gen-row" style="font-weight: 700; color: #FFFFFF; font-size: 12.5px;">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                                </svg>
                                <span>Generator Bezpiecznych Haseł</span>
                            </div>
                            <button type="button" class="mod-close" id="closeGenBtn" style="font-size: 14px; padding: 2px;">✕</button>
                        </div>

                        <div class="vault-gen-preview" id="genPreviewText">${currentSecret}</div>

                        <div class="vault-gen-chips">
                            <button type="button" class="vault-gen-chip ${this.generatorSettings.type === 'pass' ? 'active' : ''}" data-type="pass">Silne Hasło (16)</button>
                            <button type="button" class="vault-gen-chip ${this.generatorSettings.type === 'pin' ? 'active' : ''}" data-type="pin">PIN (6 cyfr)</button>
                            <button type="button" class="vault-gen-chip ${this.generatorSettings.type === 'token' ? 'active' : ''}" data-type="token">Klucz HEX (32)</button>
                            <button type="button" class="vault-gen-chip ${this.generatorSettings.type === 'readable' ? 'active' : ''}" data-type="readable">Czytelne</button>
                        </div>

                        <div style="display: flex; gap: 8px; margin-top: 4px;">
                            <button type="button" class="vault-btn-ghost" id="btnRerollGen" style="flex: 1; justify-content: center; gap: 6px;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="23 4 23 10 17 10"></polyline>
                                    <polyline points="1 20 1 14 7 14"></polyline>
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                </svg>
                                <span>Odśwież</span>
                            </button>
                            <button type="button" class="vault-btn-primary" id="btnInsertGen" style="flex: 1.5; justify-content: center; gap: 6px;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <polyline points="19 12 12 19 5 12"></polyline>
                                </svg>
                                <span>Wstaw do notatki</span>
                            </button>
                        </div>
                    </div>
                `;

                const popover = slot.querySelector('#vaultGenPopover');
                if (!popover) return;

                popover.querySelector('#closeGenBtn').addEventListener('click', () => {
                    this.isGeneratorOpen = false;
                    this.renderGeneratorPopover();
                });

                popover.querySelectorAll('.vault-gen-chip').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const type = btn.getAttribute('data-type');
                        this.generatorSettings.type = type;
                        this.generatorSettings.length = type === 'pin' ? 6 : (type === 'token' ? 32 : 16);
                        this.renderGeneratorPopover();
                    });
                });

                popover.querySelector('#btnRerollGen').addEventListener('click', () => {
                    this.renderGeneratorPopover();
                });

                popover.querySelector('#btnInsertGen').addEventListener('click', () => {
                    const secret = popover.querySelector('#genPreviewText').textContent;
                    this.insertGeneratedSecret(secret);
                });
            });
        }

        bindEditorEvents(pane, activeNote) {
            const titleInput = pane.querySelector('#vaultTitleInput');
            const textarea = pane.querySelector('#vaultTextarea');
            const genBtn = pane.querySelector('#vaultToolGenBtn');
            const formatBtn = pane.querySelector('#vaultToolFormatBtn');
            const lineNumsBtn = pane.querySelector('#vaultToolLineNumsBtn');
            const maskBtn = pane.querySelector('#vaultToolMaskBtn');
            const monoBtn = pane.querySelector('#vaultToolMonoBtn');
            const copyBtn = pane.querySelector('#vaultToolCopyBtn');
            const downloadBtn = pane.querySelector('#vaultToolDownloadBtn');
            const pinBtn = pane.querySelector('#vaultToolPinBtn');
            const deleteBtn = pane.querySelector('#vaultToolDeleteBtn');

            if (titleInput) {
                titleInput.addEventListener('input', (e) => {
                    activeNote.title = e.target.value || 'Bez tytułu';
                    activeNote.updatedAt = new Date().toISOString();
                    this.triggerAutoSave();
                    this.renderSidebarList();
                });
            }

            if (textarea) {
                textarea.addEventListener('input', (e) => {
                    activeNote.content = e.target.value;
                    activeNote.updatedAt = new Date().toISOString();
                    this.triggerAutoSave();
                    this.updateLineNumbersGutter(pane, e.target.value);
                });

                textarea.addEventListener('scroll', () => {
                    const gutter = pane.querySelector('#vaultLineNumbers');
                    if (gutter) {
                        gutter.scrollTop = textarea.scrollTop;
                    }
                });
            }

            if (genBtn) {
                genBtn.addEventListener('click', () => {
                    this.isGeneratorOpen = !this.isGeneratorOpen;
                    if (this.isGeneratorOpen) this.isFormatOpen = false;
                    this.renderGeneratorPopover();
                    this.renderFormatPopover();
                });
            }

            if (formatBtn) {
                formatBtn.addEventListener('click', () => {
                    this.isFormatOpen = !this.isFormatOpen;
                    if (this.isFormatOpen) this.isGeneratorOpen = false;
                    this.renderFormatPopover();
                    this.renderGeneratorPopover();
                });
            }

            if (lineNumsBtn) lineNumsBtn.addEventListener('click', () => this.toggleLineNumbers());
            if (maskBtn) maskBtn.addEventListener('click', () => this.toggleMaskActiveNote());
            if (monoBtn) monoBtn.addEventListener('click', () => this.toggleMonospaceActiveNote());
            if (copyBtn) copyBtn.addEventListener('click', () => this.copyActiveNoteContent());
            if (downloadBtn) downloadBtn.addEventListener('click', () => this.downloadActiveNote());
            if (pinBtn) pinBtn.addEventListener('click', () => this.togglePinActiveNote());
            if (deleteBtn) deleteBtn.addEventListener('click', () => this.deleteActiveNote());
        }

        bindContainerEvents(container) {
            const newNoteBtn = container.querySelector('#vaultNewNoteBtn');
            const newPassBtn = container.querySelector('#vaultNewPassBtn');
            const searchInput = container.querySelector('#vaultSearchInput');
            const catChips = container.querySelectorAll('.vault-cat-chip');

            if (newNoteBtn) newNoteBtn.addEventListener('click', () => this.createNewNote('blank'));
            if (newPassBtn) newPassBtn.addEventListener('click', () => this.createNewNote('passwords'));

            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.searchQuery = e.target.value.trim();
                    this.renderSidebarList();
                });
            }

            catChips.forEach(chip => {
                chip.addEventListener('click', () => {
                    catChips.forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    this.activeCategory = chip.getAttribute('data-cat') || 'all';
                    this.renderSidebarList();
                });
            });
        }

        updateStatusBar() {
            const activeNote = this.getActiveNote();
            const content = activeNote ? (activeNote.content || '') : '';
            const chars = content.length;
            const words = content.trim() ? content.trim().split(/\s+/).length : 0;
            const lines = content ? content.split('\n').length : 0;

            const charEls = document.querySelectorAll('#vaultStatChars strong');
            const wordEls = document.querySelectorAll('#vaultStatWords strong');
            const lineEls = document.querySelectorAll('#vaultStatLines strong');
            const timeEls = document.querySelectorAll('#vaultSyncTime');

            charEls.forEach(el => el.textContent = chars.toLocaleString());
            wordEls.forEach(el => el.textContent = words.toLocaleString());
            lineEls.forEach(el => el.textContent = lines.toLocaleString());

            const timeStr = activeNote && activeNote.updatedAt ? new Date(activeNote.updatedAt).toLocaleTimeString() : 'teraz';
            timeEls.forEach(el => el.textContent = `Zapisano: ${timeStr}`);
        }

        updateBadgeCounts() {
            const badges = document.querySelectorAll('#subtabNotesCount, #dockVaultBadge');
            badges.forEach(b => {
                b.textContent = this.notes.length;
            });
        }

        bindGlobalEvents() {
            window.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'n') {
                    e.preventDefault();
                    window.openAccountVault();
                }
            });
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    const vaultInstance = new DropsiteVaultEngine();
    window.DropsiteVault = vaultInstance;

    window.openAccountVault = function() {
        const modal = document.getElementById('accountVaultModalWrap');
        if (!modal) return;

        const mountPoint = document.getElementById('accountVaultModalMount');
        if (mountPoint && !mountPoint.hasChildNodes()) {
            vaultInstance.renderContainer(mountPoint);
        } else {
            vaultInstance.renderAllViews();
        }

        window.smoothOpenModal(modal);
    };

    window.closeAccountVault = function() {
        const modal = document.getElementById('accountVaultModalWrap');
        if (modal) {
            window.smoothCloseModal(modal);
        }
    };

    const vaultModalEl = document.getElementById('accountVaultModalWrap');
    if (vaultModalEl) {
        vaultModalEl.addEventListener('click', (e) => {
            if (e.target === vaultModalEl) {
                window.closeAccountVault();
            }
        });
    }

    window.renderAccountVaultInline = function() {
        const mount = document.getElementById('subpane_notes');
        if (mount && (!mount.querySelector('.account-vault-wrap') || mount.childElementCount === 0)) {
            vaultInstance.renderContainer(mount);
        } else {
            vaultInstance.renderAllViews();
        }
    };

    if (typeof auth !== 'undefined' && auth && typeof auth.onAuthStateChanged === 'function') {
        auth.onAuthStateChanged(user => {
            if (vaultInstance) vaultInstance.onUserAuthChanged(user);
        });
    }

})();
