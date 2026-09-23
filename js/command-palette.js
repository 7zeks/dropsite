/**
 * Dropsite Command Palette (Raycast / Linear Style Ctrl + K)
 * Keyboard-first navigation HUD for all studios, tools and actions.
 * Brand Guidelines: Zero emoji, pure SVG inline, Cyber Mint & Obsidian Glass.
 */

(function () {
    'use strict';

    const COMMANDS = [
        // 1. NARZĘDZIA PDF
        {
            id: 'pdf-merge',
            category: 'Narzędzia PDF',
            title: 'Scal pliki PDF',
            desc: 'Połącz wiele dokumentów PDF w jeden plik w 100% w pamięci RAM',
            tag: 'Toolbox',
            keywords: ['scal', 'laczenie', 'merge', 'polacz', 'zepnij'],
            action: () => { if (window.switchToolTab) window.switchToolTab('merge'); }
        },
        {
            id: 'pdf-split',
            category: 'Narzędzia PDF',
            title: 'Podziel PDF',
            desc: 'Wyodrębnij wybrane strony lub podziel dokument na części',
            tag: 'Toolbox',
            keywords: ['podziel', 'rozdziel', 'split', 'strony'],
            action: () => { if (window.switchToolTab) window.switchToolTab('split'); }
        },
        {
            id: 'pdf-compress',
            category: 'Narzędzia PDF',
            title: 'Kompresor PDF',
            desc: 'Zmniejsz wagę dokumentu bez widocznej utraty ostrości tekstu',
            tag: 'Toolbox',
            keywords: ['kompresuj', 'zmniejsz', 'odchudz', 'compress', 'waga'],
            action: () => { if (window.switchToolTab) window.switchToolTab('compress'); }
        },
        {
            id: 'pdf-edit-sign',
            category: 'Narzędzia PDF',
            title: 'Podpis Cyfrowy & Edytor PDF',
            desc: 'Złóż podpis cyfrowy z certyfikatem eIDAS i pieczęcią SHA-256',
            tag: 'Studio',
            keywords: ['podpis', 'podpisz', 'eidas', 'certyfikat', 'pieczec', 'edytuj'],
            action: () => { if (window.switchToolTab) window.switchToolTab('edit'); }
        },
        {
            id: 'pdf-matrix',
            category: 'Narzędzia PDF',
            title: 'Układ Stron & Obrót (Matrix)',
            desc: 'Zmieniaj kolejność stron, obracaj o 90° i usuwaj niepotrzebne arkusze',
            tag: 'Studio',
            keywords: ['matrix', 'obrot', 'obrót', 'kolejnosc', 'uklad', 'strony'],
            action: () => { if (window.switchToolTab) window.switchToolTab('matrix'); }
        },
        {
            id: 'pdf-watermark',
            category: 'Narzędzia PDF',
            title: 'Studio Znaków Wodnych',
            desc: 'Nakładaj profesjonalne znaki wodne, klauzule poufności i siatki',
            tag: 'Studio',
            keywords: ['znak wodny', 'watermark', 'poufne', 'kopia', 'zabezpiecz'],
            action: () => { if (window.switchToolTab) window.switchToolTab('watermark'); }
        },
        {
            id: 'pdf-rodo',
            category: 'Narzędzia PDF',
            title: 'RODO Guard (Auto-Cenzura)',
            desc: 'Wykrywaj PESEL, NIP, numery dowodów i zamalowuj poufne dane',
            tag: 'Bezpieczeństwo',
            keywords: ['rodo', 'pesel', 'nip', 'cenzura', 'anonimizacja', 'blackout'],
            action: () => { if (window.switchToolTab) window.switchToolTab('rodo'); }
        },

        // 2. PRYWATNOŚĆ & TRANSFER B2B
        {
            id: 'drop-request',
            category: 'Transfer & B2B',
            title: 'Poproś o pliki (Drop Request)',
            desc: 'Wygeneruj dedykowany link do bezpiecznego odbioru plików od klientów',
            tag: 'B2B',
            keywords: ['drop request', 'popros', 'odbierz pliki', 'klient', 'skrzynka'],
            action: () => { if (window.openDropRequestCreator) window.openDropRequestCreator(); }
        },
        {
            id: 'dead-drop',
            category: 'Transfer & B2B',
            title: 'Samospalająca się notatka (Dead Drop)',
            desc: 'Przekaż tajne hasło lub klucz API szyfrowany AES-256 (kasowany po 1 odczytaniu)',
            tag: 'Zero-Knowledge',
            keywords: ['dead drop', 'haslo', 'tajna notatka', 'burn note', 'sekret'],
            action: () => { if (window.openDeadDropCreator) window.openDeadDropCreator(); }
        },
        {
            id: 'qr-studio',
            category: 'Transfer & B2B',
            title: 'Studio Kodów QR 4K & Wektor SVG',
            desc: 'Generuj kody QR Ultra HD dla linków, Wi-Fi, wizytówek z własnym logo',
            tag: 'Narzędzie',
            keywords: ['qr', 'kod qr', 'wifi qr', 'vcard', 'svg', '4k'],
            action: () => {
                const modal = document.getElementById('qrStudioModal');
                if (modal) {
                    modal.classList.add('open');
                    document.body.style.overflow = 'hidden';
                    if (window.initQRStudio) window.initQRStudio();
                }
            }
        },
        {
            id: 'video-compress',
            category: 'Transfer & B2B',
            title: 'Lokalny Kompresor Wideo',
            desc: 'Zmniejsz pliki wideo pod limit 25 MB (E-mail, Discord) w 100% w przeglądarce',
            tag: 'Wideo',
            keywords: ['kompresor wideo', 'wideo 25mb', 'mp4', 'zmniejsz film', 'discord'],
            action: () => { if (window.openVideoCompressor) window.openVideoCompressor(); }
        },
        {
            id: 'media-grabber',
            category: 'Transfer & B2B',
            title: 'Pobieracz Wideo & Audio (TikTok, YT, Insta)',
            desc: 'Pobieraj wideo HD bez znaku wodnego z TikToka, YouTube, Instagrama lub zapisz w chmurze R2',
            tag: 'Pobieracz',
            keywords: ['tiktok', 'youtube', 'instagram', 'twitter', 'x', 'pinterest', 'pobierz', 'grabber', 'mp4', 'mp3', 'wideo', 'film', 'bez znaku'],
            action: () => {
                const nav = document.querySelector('[data-target="view-pobieracz"]');
                if (nav) nav.click();
                else if (window.switchView) window.switchView('view-pobieracz');
            }
        },

        // 3. NAWIGACJA
        {
            id: 'nav-home',
            category: 'Nawigacja',
            title: 'Strona Główna (Kokpit Wysyłki)',
            desc: 'Przejdź do głównego uploaderu plików z szyfrowaniem AES-256',
            tag: 'Widok',
            keywords: ['glowna', 'start', 'home', 'uploader', 'wyslij'],
            action: () => {
                const nav = document.querySelector('[data-target="view-glowna"]');
                if (nav) nav.click();
            }
        },
        {
            id: 'nav-tools',
            category: 'Nawigacja',
            title: 'Centrum Narzędzi PDF',
            desc: 'Otwórz pełen pulpit 7 narzędzi do obróbki dokumentów',
            tag: 'Widok',
            keywords: ['narzedzia', 'toolbox', 'pdf studio'],
            action: () => {
                const nav = document.querySelector('[data-target="view-narzedzia"]');
                if (nav) nav.click();
            }
        },
        {
            id: 'nav-history',
            category: 'Nawigacja',
            title: 'Historia Moich Transferów',
            desc: 'Przeglądaj aktywne linki, odebrane paczki i zarządzaj plikami',
            tag: 'Widok',
            keywords: ['historia', 'transfery', 'moje pliki', 'paczki'],
            action: () => {
                const nav = document.querySelector('[data-target="view-historia"]');
                if (nav) nav.click();
            }
        },
        {
            id: 'nav-beam',
            category: 'Nawigacja',
            title: 'Pokoje P2P Beam',
            desc: 'Bezpośredni transfer peer-to-peer z urządzenia na urządzenie',
            tag: 'P2P',
            keywords: ['beam', 'p2p', 'pokoje', 'bezposredni transfer'],
            action: () => {
                const nav = document.querySelector('[data-target="view-beam"]');
                if (nav) nav.click();
            }
        }
    ];

    let selectedIndex = 0;
    let filteredCommands = [];

    function initCommandPalette() {
        const backdrop = document.getElementById('cmdPaletteBackdrop');
        const input = document.getElementById('cmdPaletteInput');

        if (!backdrop || !input) return;

        // Globalny skrót Ctrl+K / Cmd+K
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                togglePalette();
            }
            if (e.key === 'Escape' && backdrop.classList.contains('open')) {
                closePalette();
            }
        });

        // Wyszukiwanie na żywo
        input.addEventListener('input', (e) => {
            renderResults(e.target.value);
        });

        // Nawigacja klawiaturą (góra / dół / enter)
        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                moveSelection(1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                moveSelection(-1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                executeSelected();
            }
        });

        // Zamykanie po kliknięciu w tło
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closePalette();
        });

        // Ujednolicony skrót klawiszowy ⌘K dla każdego urządzenia
        const keycapText = '⌘K';
        document.querySelectorAll('#cmdPaletteKeycap, .cmd-palette-keycap').forEach(el => {
            el.textContent = keycapText;
        });

        // Podpięcie przycisków w UI
        document.querySelectorAll('.btn-open-command-palette').forEach(btn => {
            btn.addEventListener('click', openPalette);
            if (!btn.getAttribute('data-os-title-set')) {
                btn.setAttribute('title', 'Konsola skrótów i wyszukiwarka (⌘K)');
                btn.setAttribute('data-os-title-set', 'true');
            }
        });

        window.openCommandPalette = openPalette;
        window.closeCommandPalette = closePalette;
    }

    function openPalette() {
        const backdrop = document.getElementById('cmdPaletteBackdrop');
        const input = document.getElementById('cmdPaletteInput');
        if (!backdrop || !input) return;

        backdrop.classList.add('open');
        input.value = '';
        renderResults('');
        input.focus();
    }

    function closePalette() {
        const backdrop = document.getElementById('cmdPaletteBackdrop');
        if (backdrop) backdrop.classList.remove('open');
    }

    function togglePalette() {
        const backdrop = document.getElementById('cmdPaletteBackdrop');
        if (backdrop && backdrop.classList.contains('open')) {
            closePalette();
        } else {
            openPalette();
        }
    }

    function filterCommands(query) {
        if (!query) return COMMANDS;
        const q = query.toLowerCase().trim();
        return COMMANDS.filter(cmd => {
            return cmd.title.toLowerCase().includes(q) ||
                cmd.desc.toLowerCase().includes(q) ||
                cmd.category.toLowerCase().includes(q) ||
                (cmd.keywords && cmd.keywords.some(k => k.includes(q)));
        });
    }

    function renderResults(query) {
        const resultsEl = document.getElementById('cmdPaletteResults');
        if (!resultsEl) return;

        filteredCommands = filterCommands(query);
        selectedIndex = 0;

        if (filteredCommands.length === 0) {
            resultsEl.innerHTML = `
                <div class="cmd-no-results">
                    <p>Brak poleceń pasujących do zapytania "${escapeHtml(query)}"</p>
                </div>
            `;
            return;
        }

        // Grupowanie według kategorii
        let html = '';
        let lastCategory = '';

        filteredCommands.forEach((cmd, idx) => {
            if (cmd.category !== lastCategory) {
                html += `<div class="cmd-palette-category-title">${cmd.category}</div>`;
                lastCategory = cmd.category;
            }

            const isSelected = idx === selectedIndex ? 'selected' : '';

            html += `
                <div class="cmd-item ${isSelected}" data-index="${idx}">
                    <div class="cmd-item-left">
                        <div class="cmd-item-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                        </div>
                        <div class="cmd-item-text">
                            <span class="cmd-item-title">${escapeHtml(cmd.title)}</span>
                            <span class="cmd-item-desc">${escapeHtml(cmd.desc)}</span>
                        </div>
                    </div>
                    <span class="cmd-item-tag">${escapeHtml(cmd.tag || 'Akcja')}</span>
                </div>
            `;
        });

        resultsEl.innerHTML = html;

        // Obsługa kliknięć myszą
        resultsEl.querySelectorAll('.cmd-item').forEach(item => {
            item.addEventListener('click', () => {
                const idx = parseInt(item.getAttribute('data-index'), 10);
                if (!isNaN(idx) && filteredCommands[idx]) {
                    closePalette();
                    filteredCommands[idx].action();
                }
            });
            item.addEventListener('mouseenter', () => {
                const idx = parseInt(item.getAttribute('data-index'), 10);
                if (!isNaN(idx)) updateSelectionVisual(idx);
            });
        });
    }

    function moveSelection(delta) {
        if (filteredCommands.length === 0) return;
        selectedIndex = (selectedIndex + delta + filteredCommands.length) % filteredCommands.length;
        updateSelectionVisual(selectedIndex);

        // Scroll do aktywnego elementu
        const resultsEl = document.getElementById('cmdPaletteResults');
        const activeItem = resultsEl && resultsEl.querySelector(`.cmd-item[data-index="${selectedIndex}"]`);
        if (activeItem) {
            activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    function updateSelectionVisual(newIndex) {
        selectedIndex = newIndex;
        const items = document.querySelectorAll('#cmdPaletteResults .cmd-item');
        items.forEach(item => {
            const idx = parseInt(item.getAttribute('data-index'), 10);
            item.classList.toggle('selected', idx === selectedIndex);
        });
    }

    function executeSelected() {
        if (filteredCommands[selectedIndex]) {
            const cmd = filteredCommands[selectedIndex];
            closePalette();
            cmd.action();
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCommandPalette);
    } else {
        initCommandPalette();
    }

})();
