/**
 * ============================================================================
 * DROPSITE CONCIERGE ENGINE (100% Client-Side Algorithmic Assistant)
 * ============================================================================
 * Lekki, bezpłatny asystent nawigacyjny i wyszukiwarka intencji użytkownika.
 * Działa w 100% lokalnie w przeglądarce (0 zł kosztów, zero zewnętrznych API AI).
 * 
 * Funkcje:
 * - Tokenizacja zapytań i słownik synonimów w języku polskim i angielskim
 * - Algorytm Levenshteina dla tolerancji literówek i odmian gramatycznych
 * - Bezpośrednie wywoływanie akcji w interfejsie Dropsite (nawigacja, modale, taby)
 * - Drzewo szybkich podpowiedzi (Zero pisania, 1 kliknięcie do celu)
 * ============================================================================
 */

(function () {
    'use strict';

    // === BAZA INTENCJI I SŁOWNIK SYNONIMÓW ===
    const INTENT_CATALOG = [
        {
            id: 'TOOL_PDF_MERGE',
            category: 'pdf',
            titlePl: 'Łączenie / Scalanie plików PDF',
            titleEn: 'Merge / Combine PDF Files',
            descPl: 'Połącz 2 lub więcej dokumentów PDF w jeden spójny plik z wyborem kolejności.',
            descEn: 'Combine 2 or more PDF documents into a single file with custom order.',
            keywords: [
                'scal', 'scalanie', 'polacz', 'połącz', 'laczenie', 'łączenie', 'złącz', 'zlacz',
                'merge', 'combine', 'połączyć', 'złączyć', 'scalić', 'scalac', 'dwa pdf', 'wiele pdf'
            ],
            action: function () {
                if (typeof window.switchToolTab === 'function') {
                    window.switchToolTab('merge', true);
                } else {
                    navigateToTargetView('view-narzedzia');
                }
            }
        },
        {
            id: 'TOOL_PDF_SPLIT',
            category: 'pdf',
            titlePl: 'Rozdzielanie / Dzielenie PDF',
            titleEn: 'Split / Extract PDF Pages',
            descPl: 'Wyodrębnij wybrane strony z dokumentu lub podziel go na pojedyncze kartki.',
            descEn: 'Extract specific pages from a document or split it into individual sheets.',
            keywords: [
                'podziel', 'rozdziel', 'dzielenie', 'rozdzielanie', 'split', 'extract', 'wytnij strony',
                'wyciagnij', 'strony', 'jedna strona', 'rozbij', 'stron'
            ],
            action: function () {
                if (typeof window.switchToolTab === 'function') {
                    window.switchToolTab('split', false);
                } else {
                    navigateToTargetView('view-narzedzia');
                }
            }
        },
        {
            id: 'TOOL_PDF_ORGANIZE',
            category: 'pdf',
            titlePl: 'Układ stron, Obrót & Usuwanie stron PDF',
            titleEn: 'Organize, Reorder & Rotate PDF Pages',
            descPl: 'Przeciągaj kafelki stron, obracaj o 90° i usuwaj niepotrzebne strony w pamięci RAM.',
            descEn: 'Visual drag & drop page matrix to reorder, rotate 90°, and delete pages in RAM.',
            keywords: [
                'obroc', 'obróć', 'obrocic', 'obrócić', 'kolejnosc', 'kolejność', 'zamien strony',
                'usun strone', 'usuń stronę', 'skasuj strone', 'uklad', 'układ', 'organize',
                'rotate', 'reorder', 'sortuj', 'sortowanie', 'przekrec', 'przekręć', 'orientacja'
            ],
            action: function () {
                if (typeof window.switchToolTab === 'function') {
                    window.switchToolTab('organize', false);
                } else {
                    navigateToTargetView('view-narzedzia');
                }
            }
        },
        {
            id: 'TOOL_PDF_EDIT_SIGN',
            category: 'pdf',
            titlePl: 'Podpis elektroniczny & Edycja PDF',
            titleEn: 'Sign & Edit PDF Online',
            descPl: 'Złóż odręczny podpis cyfrowy myszką lub dotykiem, wstaw tekst, pieczątkę lub link.',
            descEn: 'Draw your signature with mouse or touch, add text, stamps, and links.',
            keywords: [
                'podpis', 'podpisz', 'podpisac', 'podpisać', 'umowa', 'umowe', 'umowę', 'faktura',
                'sign', 'signature', 'edytor', 'edytuj', 'pieczatka', 'pieczątka', 'stempel', 'link',
                'napisz', 'tekst w pdf', 'edytor pdf', 'wypelnij', 'wypełnij'
            ],
            action: function () {
                if (typeof window.switchToolTab === 'function') {
                    window.switchToolTab('edit', true);
                } else {
                    navigateToTargetView('view-narzedzia');
                }
            }
        },
        {
            id: 'TOOL_PDF_WATERMARK',
            category: 'pdf',
            titlePl: 'Znak Wodny PDF (POUFNE, WZÓR, DRAFT)',
            titleEn: 'PDF Watermark Studio',
            descPl: 'Błyskawicznie nałóż znak wodny lub stempel bezpieczeństwa bez wysyłania pliku na serwer.',
            descEn: 'Apply customizable watermarks, stamps and confidential marks 100% in RAM.',
            keywords: [
                'znak wodny', 'znaku wodnego', 'watermark', 'poufne', 'draft', 'wzor', 'wzór',
                'kopia', 'zastrzez', 'zastrzeż', 'oznacz', 'stempel wodny', 'confidential'
            ],
            action: function () {
                if (typeof window.switchToolTab === 'function') {
                    window.switchToolTab('watermark', false);
                } else {
                    navigateToTargetView('view-narzedzia');
                }
            }
        },
        {
            id: 'TOOL_PDF_REDACT',
            category: 'pdf',
            titlePl: 'Cenzura RODO / Zamazanie danych',
            titleEn: 'Redact & Blackout Sensitive Data',
            descPl: 'Trwale zamaż wrażliwe dane osobowe (PESEL, NIP, adresy) bezpośrednio w pamięci RAM.',
            descEn: 'Permanently blackout sensitive personal data in memory before sharing.',
            keywords: [
                'rodo', 'cenzura', 'zamaz', 'zamaż', 'ukryj pesel', 'pesel', 'nip', 'anonimizacja',
                'blackout', 'redact', 'ukryj dane', 'wyczysc dane', 'zasłoń', 'zaslon'
            ],
            action: function () {
                if (typeof window.switchToolTab === 'function') {
                    window.switchToolTab('edit', true);
                    setTimeout(() => {
                        const censorBtn = document.querySelector('.studio-ribbon-btn[data-studio-tool="censor"]');
                        if (censorBtn) censorBtn.click();
                        if (window.studioPdfJsDoc && window.DropsiteRodoGuard) {
                            window.DropsiteRodoGuard.openModal();
                        }
                    }, 250);
                } else {
                    navigateToTargetView('view-narzedzia');
                }
            }
        },
        {
            id: 'TOOL_DROP_REQUEST',
            category: 'transfer',
            titlePl: 'Poproś o pliki od klienta (Drop Request)',
            titleEn: 'Request Files from Clients (Drop Request)',
            descPl: 'Wygeneruj bezpieczną skrzynkę wrzutową z własnym tytułem i notatką dla klientów bez logowania.',
            descEn: 'Generate a secure drop box with custom title and note for clients without login.',
            keywords: [
                'popros o pliki', 'poproś o pliki', 'odbierz pliki', 'klient', 'skrzynka', 'drop request',
                'paczka od klienta', 'prośba o pliki', 'request files', 'zbieraj pliki', 'odbior plikow',
                'odbierz od kogos', 'link dla klienta', 'link do wgrania', 'wrzutowa'
            ],
            action: function () {
                if (typeof window.openDropRequestCreator === 'function') {
                    window.openDropRequestCreator();
                }
            }
        },
        {
            id: 'TOOL_DEAD_DROP',
            category: 'security',
            titlePl: 'Samospalające się notatki (Dead Drop / Burn Note)',
            titleEn: 'Self-Destructing Secret Notes (Burn Note)',
            descPl: 'Przekaż hasło, klucz API lub tajną wiadomość zaszyfrowaną AES-256, która niszczy się po 1 odczytaniu.',
            descEn: 'Send an AES-256 encrypted password or secret that self-destructs after 1 read.',
            keywords: [
                'haslo', 'hasło', 'tajna notatka', 'samospalajaca', 'samospalająca', 'burn note',
                'dead drop', 'sekret', 'tajne haslo', 'tajne hasło', 'jednorazowe haslo', 'jednorazowa wiadomosc',
                'jednorazowa wiadomość', 'klucz api', 'zaszyfruj tekst', 'zniszcz po odczytaniu'
            ],
            action: function () {
                if (typeof window.openDeadDropCreator === 'function') {
                    window.openDeadDropCreator();
                }
            }
        },
        {
            id: 'TOOL_QR_STUDIO',
            category: 'tools',
            titlePl: 'Studio Kodów QR 4K & Wektor SVG',
            titleEn: '4K QR Code & Vector SVG Studio',
            descPl: 'Generuj profesjonalne kody QR do druku dla linków, Wi-Fi, wizytówek vCard z własnym logo.',
            descEn: 'Generate professional 4K and vector QR codes for URLs, Wi-Fi, vCards with custom logo.',
            keywords: [
                'kod qr', 'kody qr', 'qr', 'qrious', 'generator qr', 'wifi qr', 'vcard', 'wizytowka qr',
                'wizytówka qr', 'qr z logo', 'druk qr', 'wektorowy qr', 'svg qr', '4k qr'
            ],
            action: function () {
                const modal = document.getElementById('qrStudioModal');
                if (modal) {
                    modal.classList.add('open');
                    document.body.style.overflow = 'hidden';
                    if (typeof window.initQRStudio === 'function') window.initQRStudio();
                }
            }
        },
        {
            id: 'TOOL_VIDEO_COMPRESS',
            category: 'tools',
            titlePl: 'Lokalny Kompresor Wideo (pod limit 25 MB)',
            titleEn: 'Local Video Compressor (25 MB limit)',
            descPl: 'Zmniejsz wagę wideo MP4/MOV/WebM bezpośrednio w przeglądarce pod limit e-maila lub Discorda.',
            descEn: 'Compress MP4/MOV/WebM videos in browser for email or Discord 25 MB limits.',
            keywords: [
                'kompresor wideo', 'zmniejsz wideo', 'kompresuj film', 'wideo 25mb', 'za duze wideo',
                'odchudz wideo', 'video compress', 'mp4 kompresor', 'discord wideo', 'email wideo'
            ],
            action: function () {
                if (typeof window.openVideoCompressor === 'function') {
                    window.openVideoCompressor();
                }
            }
        },
        {
            id: 'TOOL_PDF_COMPRESS',
            category: 'pdf',
            titlePl: 'Kompresor plików PDF',
            titleEn: 'Compress & Reduce PDF Size',
            descPl: 'Zmniejsz wagę pliku PDF bez zauważalnej utraty ostrości tekstu.',
            descEn: 'Reduce PDF file size without noticeable loss of text sharpness.',
            keywords: [
                'zmniejsz', 'zmniejszenie', 'kompresuj', 'kompresja', 'kompresor', 'zmniejsz pdf',
                'odchudz', 'odchudź', 'za duzy pdf', 'za duzy', 'za duża', 'waga',
                'zmniejszyc', 'zmniejszyć', 'waga pdf', 'compress', 'shrink', 'mb', 'kb', 'rozmiar'
            ],
            action: function () {
                if (typeof window.switchToolTab === 'function') {
                    window.switchToolTab('compress', true);
                } else {
                    navigateToTargetView('view-narzedzia');
                }
            }
        },
        {
            id: 'TOOL_PDF_CONVERT',
            category: 'pdf',
            titlePl: 'Konwerter obrazów do PDF (JPG, PNG, WebP)',
            titleEn: 'Convert Images to PDF',
            descPl: 'Przekształć zdjęcia i grafiki w wielostronicowy dokument PDF w 2 sekundy.',
            descEn: 'Convert your pictures and graphics into a multi-page PDF document in 2 seconds.',
            keywords: [
                'konwertuj', 'konwersja', 'jpg do pdf', 'png do pdf', 'zdjecie do pdf', 'zdjęcie do pdf',
                'obraz do pdf', 'convert', 'grafika', 'obrazek'
            ],
            action: function () {
                if (typeof window.switchToolTab === 'function') {
                    window.switchToolTab('convert', true);
                } else {
                    navigateToTargetView('view-narzedzia');
                }
            }
        },
        {
            id: 'FEATURE_BEAM_P2P',
            category: 'transfer',
            titlePl: 'Dropsite Beam — Transfer P2P bez limitu wielkości',
            titleEn: 'Dropsite Beam — Unlimited P2P Transfer',
            descPl: 'Przesyłaj pliki 10 GB, 50 GB lub 100 GB bezpośrednio z przeglądarki do przeglądarki z 0 zł opłat.',
            descEn: 'Send 10 GB, 50 GB or 100 GB files directly peer-to-peer with 0 server limits.',
            keywords: [
                'beam', 'p2p', 'webrtc', 'bez limitu', 'wielki plik', 'duzy plik', 'duży plik',
                '50gb', '100gb', 'gigabajtow', 'bez serwera', 'bezposredni', 'bezpośredni', 'szybki transfer'
            ],
            action: function () {
                navigateToTargetView('view-beam');
            }
        },
        {
            id: 'FEATURE_BURN_AFTER_READ',
            category: 'security',
            titlePl: 'Tryb Szpiegowski (Zniszcz po pobraniu)',
            titleEn: 'Burn After Download (Self-Destruct)',
            descPl: 'Plik jest bezpowrotnie kasowany z chmury w sekundzie, gdy odbiorca skończy pobieranie.',
            descEn: 'File is permanently wiped from storage the exact second the recipient finishes downloading.',
            keywords: [
                'zniszcz', 'zniszczenie', 'skasuj', 'usun po pobraniu', 'usuń po pobraniu', 'burn',
                'jednorazowy', 'tajny', 'szpiegowski', 'kasowanie', 'autodestrukcja', 'samozniszczenie'
            ],
            action: function () {
                navigateToTargetView('view-glowna');
                highlightElement('burnCheckboxWrap', 'burnCheckbox');
            }
        },
        {
            id: 'FEATURE_TIMELOCK',
            category: 'security',
            titlePl: 'Kapsuła Czasu (TimeLock)',
            titleEn: 'TimeLock Capsule Delivery',
            descPl: 'Zablokuj dostęp do pliku do wyznaczonej daty i godziny (np. urodziny, embargo prasowe).',
            descEn: 'Lock file access until a specific date and time (embargo, surprises, legal release).',
            keywords: [
                'kapsula', 'kapsuła', 'timelock', 'czasu', 'embargo', 'zablokuj na czas', 'urodziny',
                'data otwarcia', 'odliczanie', 'opoznienie', 'opóźnienie'
            ],
            action: function () {
                navigateToTargetView('view-glowna');
                highlightElement('timeLockCard', 'timeLockToggle');
            }
        },
        {
            id: 'FEATURE_EXIF_STRIP',
            category: 'security',
            titlePl: 'Czyszczenie metadanych EXIF i GPS ze zdjęć',
            titleEn: 'Strip EXIF & GPS Metadata from Photos',
            descPl: 'Automatycznie usuwaj współrzędne geograficzne i model aparatu z wysyłanych zdjęć.',
            descEn: 'Automatically strip geographic GPS coordinates and camera models before sharing.',
            keywords: [
                'exif', 'gps', 'metadane', 'lokalizacja', 'prywatnosc zdjec', 'prywatność zdjęć',
                'gdzie zrobione', 'oczysc zdjecie', 'oczyść zdjęcie'
            ],
            action: function () {
                navigateToTargetView('view-glowna');
                highlightElement('stripExifWrap', 'stripExifCheckbox');
            }
        },
        {
            id: 'FEATURE_HISTORY',
            category: 'utility',
            titlePl: 'Twoja Historia Wgranych Plików',
            titleEn: 'Your Upload History',
            descPl: 'Szybki wgląd w przesłane przez Ciebie linki, kody QR i daty ważności plików.',
            descEn: 'Quick access to your sent links, QR codes, and expiration countdowns.',
            keywords: [
                'historia', 'moje pliki', 'poprzednie', 'linki', 'gdzie moj link', 'zgubilem link',
                'zgubiłem link', 'co wyslalem', 'co wysłałem', 'wgrane', 'wysylalem', 'wysłałem',
                'wyslane', 'wysłane', 'moje transfery', 'stare pliki'
            ],
            action: function () {
                const historyBtn = document.getElementById('openHistoryBtn');
                if (historyBtn) historyBtn.click();
            }
        },
        {
            id: 'FEATURE_PRO',
            category: 'pricing',
            titlePl: 'Dropsite PRO (10 GB & Własny Dysk)',
            titleEn: 'Dropsite PRO (10 GB & Custom Quotas)',
            descPl: 'Transfer plików do 10 GB, brak limitów dziennych, wsparcie BLIK i priorytet sieciowy.',
            descEn: 'Send up to 10 GB per file, unlimited transfers, BLIK support, and high-speed priority.',
            keywords: [
                'pro', 'cennik', 'ile kosztuje', 'cena', 'platnosc', 'płatność', 'blik', 'subskrypcja',
                'limit', 'zwieksz limit', 'zwiększ limit', '10 gb', 'premium', 'konto'
            ],
            action: function () {
                const proBtn = document.getElementById('openProBtn');
                if (proBtn) {
                    proBtn.click();
                } else {
                    navigateToTargetView('view-cennik');
                }
            }
        },
        {
            id: 'FEATURE_UPLOAD_GENERAL',
            category: 'transfer',
            titlePl: 'Standardowy Szybki Upload w Chmurze',
            titleEn: 'High-Speed Cloud Upload',
            descPl: 'Przeciągnij i upuść pliki lub folder, by natychmiast wygenerować bezpieczny link.',
            descEn: 'Drag and drop any file or folder to generate an instant secure link.',
            keywords: [
                'upload', 'wyslij', 'wyślij', 'wrzuc', 'wrzuć', 'wysylanie', 'wysyłanie', 'plik',
                'chmura', 'transfer', 'jak wyslac', 'nowy plik', 'start'
            ],
            action: function () {
                navigateToTargetView('view-glowna');
            }
        }
    ];

    // === SZYBKIE KATEGORIE (ZERO PISANIA) ===
    const QUICK_PILLS = [
        {
            iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34D399" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`,
            i18nKey: 'concierge_pill_sign',
            labelPl: 'Podpisz lub edytuj PDF',
            labelEn: 'Sign or Edit PDF',
            intentId: 'TOOL_PDF_EDIT_SIGN'
        },
        {
            iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`,
            i18nKey: 'concierge_pill_merge',
            labelPl: 'Scal lub rozdziel PDF',
            labelEn: 'Merge or Split PDF',
            intentId: 'TOOL_PDF_MERGE'
        },
        {
            iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
            i18nKey: 'concierge_pill_beam',
            labelPl: 'Wyślij duży plik (Beam P2P)',
            labelEn: 'Send Large Files (Beam P2P)',
            intentId: 'FEATURE_BEAM_P2P'
        },
        {
            iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
            i18nKey: 'concierge_pill_privacy',
            labelPl: 'Bezpieczeństwo & RODO',
            labelEn: 'Privacy & GDPR Redaction',
            intentId: 'TOOL_PDF_REDACT'
        }
    ];

    // === POMOCNICZE: NAWIGACJA W APLIKACJI ===
    function navigateToTargetView(viewId) {
        if (!viewId) return;
        const navBtn = document.querySelector(`.nav-btn[data-target="${viewId}"]`);
        if (navBtn) {
            navBtn.click();
        } else {
            // Fallback: ręczne przełączenie widoków
            document.querySelectorAll('.view-section').forEach(v => {
                const match = v.id === viewId;
                v.hidden = !match;
                v.classList.toggle('active', match);
            });
        }
        window.scrollTo({ top: 0, behavior: 'auto' });
    }

    function highlightElement(containerId, inputId) {
        setTimeout(() => {
            const container = document.getElementById(containerId);
            const input = document.getElementById(inputId);
            if (container) {
                container.style.outline = '2px solid #34D399';
                container.style.transition = 'outline 0.3s ease';
                setTimeout(() => {
                    container.style.outline = 'none';
                }, 2000);
            }
            if (input && typeof input.focus === 'function') {
                input.focus();
            }
        }, 100);
    }

    // === ALGORYTM LEVENSHTEINA (TOLERANCJA LITERÓWEK) ===
    function levenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // zamiana
                        matrix[i][j - 1] + 1,     // wstawienie
                        matrix[i - 1][j] + 1      // usunięcie
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }

    function normalizeText(text) {
        return (text || '')
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // usuń diakrytyki dla dopasowania bezogonkowego
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ');
    }

    // === GŁÓWNY SILNIK DOPASOWANIA INTENCJI ===
    function queryIntents(rawQuery) {
        const queryNorm = normalizeText(rawQuery);
        if (!queryNorm || queryNorm.length < 2) return [];

        const queryWords = queryNorm.split(' ').filter(w => w.length > 1);
        const scoredResults = [];

        INTENT_CATALOG.forEach(item => {
            let totalScore = 0;
            let phraseMatched = false;

            // 1. Sprawdzenie dopasowania całej frazy
            item.keywords.forEach(keyword => {
                const kwNorm = normalizeText(keyword);
                if (queryNorm === kwNorm) {
                    totalScore += 120;
                    phraseMatched = true;
                } else if (queryNorm.includes(kwNorm) && kwNorm.includes(' ')) {
                    totalScore += 80;
                    phraseMatched = true;
                }
            });

            // 2. Sprawdzenie pojedynczych słów zapytania
            queryWords.forEach(qWord => {
                let bestWordScore = 0;

                item.keywords.forEach(keyword => {
                    const kwNorm = normalizeText(keyword);
                    const kwWords = kwNorm.split(' ');

                    kwWords.forEach(kwW => {
                        if (qWord === kwW) {
                            bestWordScore = Math.max(bestWordScore, 50);
                        } else if (kwW.startsWith(qWord) && qWord.length >= 3) {
                            bestWordScore = Math.max(bestWordScore, 35);
                        } else if (qWord.length >= 4 && kwW.length >= 4) {
                            const dist = levenshteinDistance(qWord, kwW);
                            if (dist === 1) {
                                bestWordScore = Math.max(bestWordScore, 40);
                            } else if (dist === 2 && (qWord.length >= 5 || kwW.length >= 5)) {
                                bestWordScore = Math.max(bestWordScore, 25);
                            }
                        }
                    });
                });

                totalScore += bestWordScore;
            });

            if (totalScore > 0) {
                scoredResults.push({
                    intent: item,
                    score: totalScore
                });
            }
        });

        // Posortuj od najwyższego wyniku
        scoredResults.sort((a, b) => b.score - a.score);
        return scoredResults;
    }

    // === KONTROLER INTERFEJSU UI ASYSTENTA ===
    function getCurrentLang() {
        if (typeof window !== 'undefined' && typeof window.currentLanguage === 'function') {
            return window.currentLanguage();
        }
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('dropsite_lang');
            if (stored) return stored;
        }
        return 'pl';
    }

    function initConciergeUI() {
        if (typeof document === 'undefined') return;

        const launcherBtn = document.getElementById('conciergeLauncherBtn');
        const modalWrap = document.getElementById('conciergeModalWrap');
        const closeBtn = document.getElementById('conciergeCloseBtn');
        const searchInput = document.getElementById('conciergeSearchInput');
        const clearBtn = document.getElementById('conciergeClearBtn');
        const quickGrid = document.getElementById('conciergeQuickGrid');
        const quickLabel = document.getElementById('conciergeQuickLabel');
        const resultsContainer = document.getElementById('conciergeResultsContainer');

        if (!launcherBtn || !modalWrap) return;

        // Renderuj szybkie kafelki
        function renderQuickPills() {
            if (!quickGrid) return;
            const lang = getCurrentLang();
            const isPl = lang === 'pl';
            quickGrid.innerHTML = '';
            QUICK_PILLS.forEach(pill => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'concierge-quick-card';
                const label = (typeof window.t === 'function' && pill.i18nKey) 
                    ? window.t(pill.i18nKey) 
                    : (isPl ? pill.labelPl : pill.labelEn);
                btn.innerHTML = `${pill.iconSvg || ''}<span>${label}</span>`;
                btn.addEventListener('click', () => {
                    if (typeof window.playSound === 'function') window.playSound('click');
                    publicApi.executeIntentById(pill.intentId);
                    closeModal();
                });
                quickGrid.appendChild(btn);
            });
        }

        function openModal() {
            if (typeof window.playSound === 'function') window.playSound('click');
            renderQuickPills();
            modalWrap.classList.add('is-active');
            modalWrap.setAttribute('aria-hidden', 'false');
            if (searchInput) {
                searchInput.value = '';
                if (clearBtn) clearBtn.style.display = 'none';
                if (resultsContainer) resultsContainer.style.display = 'none';
                if (quickGrid) quickGrid.style.display = 'grid';
                if (quickLabel) quickLabel.style.display = 'block';
                setTimeout(() => searchInput.focus(), 100);
            }
        }

        function closeModal() {
            modalWrap.classList.remove('is-active');
            modalWrap.setAttribute('aria-hidden', 'true');
        }

        launcherBtn.addEventListener('click', openModal);

        const mobileBtn = document.getElementById('mobileConciergeBtn');
        if (mobileBtn) {
            mobileBtn.addEventListener('click', () => {
                const drawer = document.getElementById('mobileNavDrawer');
                if (drawer) drawer.classList.remove('open');
                openModal();
            });
        }

        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        // Zamykanie tłem
        modalWrap.addEventListener('click', (e) => {
            if (e.target === modalWrap) {
                closeModal();
            }
        });

        // Klawisz ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalWrap.classList.contains('is-active')) {
                closeModal();
            }
        });

        // Reakcja na zmianę języka w czasie rzeczywistym
        document.addEventListener('dropsite_language_changed', () => {
            renderQuickPills();
            if (searchInput && searchInput.value.trim().length >= 2) {
                handleSearchQuery(searchInput.value.trim());
            }
        });

        // Wyszukiwanie na żywo
        let searchTimer = null;
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                if (clearBtn) clearBtn.style.display = query.length > 0 ? 'block' : 'none';

                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => {
                    handleSearchQuery(query);
                }, 100);
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.focus();
                }
                clearBtn.style.display = 'none';
                handleSearchQuery('');
            });
        }

        function handleSearchQuery(query) {
            const lang = getCurrentLang();
            const isPl = lang === 'pl';
            if (!query || query.length < 2) {
                if (resultsContainer) resultsContainer.style.display = 'none';
                if (quickGrid) quickGrid.style.display = 'grid';
                if (quickLabel) quickLabel.style.display = 'block';
                return;
            }

            if (quickGrid) quickGrid.style.display = 'none';
            if (quickLabel) quickLabel.style.display = 'none';
            if (!resultsContainer) return;

            resultsContainer.style.display = 'block';
            resultsContainer.innerHTML = '';

            const matches = queryIntents(query);
            if (matches.length === 0) {
                const noRes = (typeof window.t === 'function') 
                    ? window.t('concierge_no_results') 
                    : (isPl ? 'Nie znaleziono bezpośredniego narzędzia dla tej frazy.' : 'No direct tool found for this phrase.');
                const tryKeys = (typeof window.t === 'function') 
                    ? window.t('concierge_try_keywords') 
                    : (isPl ? 'Spróbuj haseł takich jak: "pdf", "podpis", "zmniejsz", "beam", "zniszcz".' : 'Try keywords like: "pdf", "sign", "compress", "beam", "burn".');
                resultsContainer.innerHTML = `
                    <div class="concierge-empty-state">
                        <span class="concierge-empty-icon">🔍</span>
                        <p>${noRes}</p>
                        <p style="font-size: 0.78rem; color: #64748B; margin-top: 4px;">
                            ${tryKeys}
                        </p>
                    </div>
                `;
                return;
            }

            const openToolText = (typeof window.t === 'function') ? window.t('concierge_open_tool') : (isPl ? 'Przejdź do narzędzia' : 'Open Tool');
            const matchTagText = (score) => {
                if (score >= 100) {
                    return (typeof window.t === 'function') ? window.t('concierge_match_direct') : (isPl ? 'Trafienie' : 'Direct Match');
                }
                return (typeof window.t === 'function') ? window.t('concierge_match_suggestion') : (isPl ? 'Podpowiedź' : 'Suggestion');
            };

            // Pokaż maksymalnie 3 najlepiej pasujące wyniki
            const topMatches = matches.slice(0, 3);
            topMatches.forEach(item => {
                const intent = item.intent;
                const title = isPl ? intent.titlePl : (intent.titleEn || intent.titlePl);
                const desc = isPl ? intent.descPl : (intent.descEn || intent.descPl);

                const card = document.createElement('div');
                card.className = 'concierge-result-card';
                card.innerHTML = `
                    <div class="concierge-result-top">
                        <span class="concierge-result-title">${title}</span>
                        <span class="concierge-result-match-tag">${matchTagText(item.score)}</span>
                    </div>
                    <p class="concierge-result-desc">${desc}</p>
                    <button type="button" class="concierge-action-btn">
                        <span>${openToolText}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </button>
                `;

                const actionBtn = card.querySelector('.concierge-action-btn');
                if (actionBtn) {
                    actionBtn.addEventListener('click', () => {
                        if (typeof window.playSound === 'function') window.playSound('click');
                        if (typeof intent.action === 'function') intent.action();
                        closeModal();
                    });
                }

                resultsContainer.appendChild(card);
            });
        }
    }

    // Automatyczna inicjalizacja UI po załadowaniu DOM
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initConciergeUI);
        } else {
            initConciergeUI();
        }
    }

    // === PUBLICZNE API CONCIERGE ===
    const publicApi = {
        catalog: INTENT_CATALOG,
        quickPills: QUICK_PILLS,
        findIntents: queryIntents,
        initUI: initConciergeUI,
        executeIntentById: function (intentId) {
            const match = INTENT_CATALOG.find(i => i.id === intentId);
            if (match && typeof match.action === 'function') {
                match.action();
                return true;
            }
            return false;
        }
    };

    if (typeof window !== 'undefined') {
        window.DropsiteConcierge = publicApi;
    }

    // Obsługa środowiska testowego Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            INTENT_CATALOG,
            QUICK_PILLS,
            queryIntents,
            levenshteinDistance,
            normalizeText
        };
    }
})();
