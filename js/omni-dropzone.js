/**
 * ============================================================================
 * DROPSITE OMNI-DROPZONE (Magiczny, kontekstowy asystent uploadu)
 * ============================================================================
 * Rozpoznaje format upuszczonego pliku i wyświetla dyskretną szklaną podpowiedź
 * z akcjami 1-kliknięcia (np. Podpisz PDF, Zmniejsz rozmiar, Usuń EXIF, Beam P2P).
 * ============================================================================
 */

(function () {
    'use strict';

    function isEnglish() {
        if (typeof window === 'undefined') return false;
        const stored = localStorage.getItem('dropsite_lang');
        return stored === 'en' || (!stored && navigator.language && !navigator.language.startsWith('pl'));
    }

    function getOrCreateContainer() {
        let card = document.getElementById('omniContextCard');
        const uploadBox = document.getElementById('uploadBox') || document.querySelector('.upload-container');
        if (!uploadBox) return null;

        if (!card) {
            card = document.createElement('div');
            card.id = 'omniContextCard';
            card.className = 'omni-context-card';
            card.style.display = 'none';
            uploadBox.appendChild(card);
        } else if (card.parentNode !== uploadBox) {
            uploadBox.appendChild(card);
        }
        return card;
    }

    function detectCategory(filesList) {
        if (!filesList || filesList.length === 0) return null;
        
        if (filesList.length > 1) {
            const isAllVid = Array.from(filesList).every(f => /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(f.name || ''));
            if (isAllVid) return 'multi-video';
            const isAllImg = Array.from(filesList).every(f => /\.(jpg|jpeg|png|webp|heic|bmp|gif)$/i.test(f.name || ''));
            if (isAllImg) return 'multi-image';
            const hasVid = Array.from(filesList).some(f => /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(f.name || ''));
            if (hasVid) return 'multi-video-mixed';
            return 'multi-mixed';
        }

        const firstFile = filesList[0];
        const name = (firstFile.name || '').toLowerCase();

        // 1. Dokumenty PDF
        if (name.endsWith('.pdf')) {
            return 'pdf';
        }

        // 2. Wideo
        if (/\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(name)) {
            return 'video';
        }

        // 3. Grafika
        if (/\.(jpg|jpeg|png|webp|heic|bmp|gif)$/i.test(name)) {
            return 'image';
        }

        // 4. Archiwum / Kod
        if (/\.(zip|rar|7z|tar|gz|json|js|py|sql|csv|xlsx|docx)$/i.test(name)) {
            return 'archive';
        }

        return null;
    }

    function showForFiles(filesList) {
        const category = detectCategory(filesList);
        if (!category) {
            hide();
            return;
        }

        const card = getOrCreateContainer();
        if (!card) return;

        const en = isEnglish();
        let iconSvg = '';
        let title = '';
        let badge = '';
        let desc = '';
        let actions = [];

        if (category === 'multi-video' || category === 'multi-video-mixed') {
            iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                <line x1="7" y1="2" x2="7" y2="22"></line>
                <line x1="17" y1="2" x2="17" y2="22"></line>
                <line x1="2" y1="12" x2="22" y2="12"></line>
            </svg>`;
            title = en ? `Detected ${filesList.length} Video Files` : `Wykryto ${filesList.length} filmów wideo`;
            badge = en ? 'Smart Showcase' : 'Kolekcja Wideo';
            desc = en
                ? 'Choose how to share: create an Instant Media Showcase (0 ZIP overhead & online video player) or bundle into a single ZIP archive:'
                : 'Wybierz formę udostępnienia: stwórz gotową Kolekcję Wideo (player 4K online, 0 narzutu ZIP) lub spakuj do jednego archiwum ZIP:';
            actions = [
                {
                    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
                    label: en ? 'Create Video Showcase (No ZIP)' : '🎬 Kolekcja Wideo (Player Online)',
                    highlight: true,
                    onClick: () => {
                        if (typeof window.setMultiUploadMode === 'function') window.setMultiUploadMode('collection');
                    }
                },
                {
                    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect></svg>`,
                    label: en ? 'Bundle into 1 ZIP' : '📦 Spakuj w ZIP',
                    highlight: false,
                    onClick: () => {
                        if (typeof window.setMultiUploadMode === 'function') window.setMultiUploadMode('zip');
                    }
                },
                {
                    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
                    label: en ? 'Beam P2P (Unlimited)' : '⚡ Beam P2P',
                    highlight: false,
                    onClick: () => {
                        const beamBtn = document.querySelector('.nav-btn[data-target="view-beam"]') || document.querySelector('[data-target="view-beam"]');
                        if (beamBtn) beamBtn.click();
                    }
                }
            ];
        } else if (category === 'multi-image') {
            iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34D399" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
            </svg>`;
            title = en ? `Detected ${filesList.length} Photos` : `Wykryto ${filesList.length} fotografii`;
            badge = en ? 'Smart Album' : 'Album & Galeria';
            desc = en
                ? 'Create a cinematic online gallery with full-resolution viewing or bundle photos into a single ZIP archive:'
                : 'Stwórz interaktywną galerię online w pełnej rozdzielczości lub spakuj fotografie do jednego pliku ZIP:';
            actions = [
                {
                    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M7 7h10v10H7z"></path></svg>`,
                    label: en ? 'Create Online Album (Cinematic)' : '🖼️ Galeria / Album (Cinematic)',
                    highlight: true,
                    onClick: () => {
                        if (typeof window.setMultiUploadMode === 'function') window.setMultiUploadMode('collection');
                    }
                },
                {
                    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect></svg>`,
                    label: en ? 'Bundle into 1 ZIP' : '📦 Spakuj w ZIP',
                    highlight: false,
                    onClick: () => {
                        if (typeof window.setMultiUploadMode === 'function') window.setMultiUploadMode('zip');
                    }
                },
                {
                    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
                    label: en ? 'Strip GPS & EXIF' : '🛡️ Wyczyść GPS / EXIF',
                    highlight: false,
                    onClick: () => {
                        const exifCheckbox = document.getElementById('stripExifCheckbox');
                        if (exifCheckbox) {
                            exifCheckbox.checked = true;
                            if (typeof window.showNotification === 'function') {
                                window.showNotification(en ? 'EXIF & GPS metadata scrubbing enabled!' : 'Włączono czyszczenie danych EXIF i GPS!', 'success');
                            }
                        }
                    }
                }
            ];
        } else if (category === 'multi-mixed') {
            iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFBC39" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>`;
            title = en ? `Detected ${filesList.length} Files` : `Wykryto ${filesList.length} plików`;
            badge = en ? 'Multi-Upload' : 'Paczka Plików';
            desc = en
                ? 'Send as a single ZIP archive or create an online Collection for direct individual downloads:'
                : 'Możesz wysłać pliki w jednym archiwum ZIP lub utworzyć Kolekcję do indywidualnego pobierania:';
            actions = [
                {
                    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect></svg>`,
                    label: en ? 'Bundle into 1 ZIP' : '📦 Spakuj w ZIP',
                    highlight: true,
                    onClick: () => {
                        if (typeof window.setMultiUploadMode === 'function') window.setMultiUploadMode('zip');
                    }
                },
                {
                    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>`,
                    label: en ? 'Create Online Collection' : '🎬 Kolekcja Online (Bez ZIP)',
                    highlight: false,
                    onClick: () => {
                        if (typeof window.setMultiUploadMode === 'function') window.setMultiUploadMode('collection');
                    }
                }
            ];
        } else if (category === 'pdf') {
            iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
            </svg>`;
            title = en ? 'PDF Document Detected' : 'Wykryto dokument PDF';
            badge = en ? 'Smart PDF Action' : 'Akcje PDF';
            desc = en 
                ? 'You can send this file as-is, or quickly open it in the PDF Toolbox before sharing:' 
                : 'Możesz wysłać plik bezpośrednio lub otworzyć w narzędziach PDF przed udostępnieniem:';
            actions = [
                {
                    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`,
                    label: en ? 'Sign / Edit PDF' : 'Podpisz / Edytuj',
                    highlight: true,
                    onClick: () => {
                        if (typeof window.switchToolTab === 'function') window.switchToolTab('edit', false);
                    }
                },
                {
                    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>`,
                    label: en ? 'Merge with another' : 'Scal z innym',
                    highlight: false,
                    onClick: () => {
                        if (typeof window.switchToolTab === 'function') window.switchToolTab('merge', false);
                    }
                },
                {
                    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>`,
                    label: en ? 'Reorder / Rotate' : 'Zmień układ / Obróć',
                    highlight: false,
                    onClick: () => {
                        if (typeof window.switchToolTab === 'function') {
                            window.switchToolTab('organize', false);
                            if (filesList && filesList[0] && window.DropsitePdfMatrix) {
                                window.DropsitePdfMatrix.loadFile(filesList[0]);
                            }
                        }
                    }
                },
                {
                    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6m-6-4h10m-10-4h14M16 19l3 3 3-3m-3-7v10"></path></svg>`,
                    label: en ? 'Compress PDF' : 'Zmniejsz rozmiar',
                    highlight: false,
                    onClick: () => {
                        if (typeof window.switchToolTab === 'function') window.switchToolTab('compress', false);
                    }
                },
                {
                    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>`,
                    label: en ? 'Watermark' : 'Znak wodny',
                    highlight: false,
                    onClick: () => {
                        if (typeof window.switchToolTab === 'function') {
                            window.switchToolTab('watermark', false);
                            if (filesList && filesList[0] && window.DropsiteWatermarkStudio) {
                                window.DropsiteWatermarkStudio.loadFile(filesList[0]);
                            }
                        }
                    }
                }
            ];
        } else if (category === 'video') {
            iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>`;
            title = en ? 'Video File Detected' : 'Wykryto plik Wideo';
            badge = en ? 'Unlimited P2P' : 'Beam P2P';
            desc = en
                ? 'Large video file? Remember: you can also beam it directly browser-to-browser with 0 GB limits via Beam P2P.'
                : 'Duży plik wideo? Pamiętaj: możesz też przesłać go bez limitu prędkości i bez limitu rozmiaru bezpośrednio przez Beam P2P.';
            actions = [
                {
                    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
                    label: en ? 'Switch to Beam P2P' : 'Przełącz na Beam P2P',
                    highlight: true,
                    onClick: () => {
                        const beamBtn = document.querySelector('.nav-btn[data-target="view-beam"]') || document.querySelector('[data-target="view-beam"]');
                        if (beamBtn) beamBtn.click();
                    }
                }
            ];
        } else if (category === 'image') {
            iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
            </svg>`;
            title = en ? 'Images Detected' : 'Wykryto pliki graficzne';
            badge = en ? 'Privacy Protection' : 'Ochrona RODO';
            desc = en
                ? 'Protect your privacy by stripping GPS coordinates or convert multiple images to a single PDF:'
                : 'Zadbaj o prywatność usuwając współrzędne GPS lub przekształć zdjęcia w jeden plik PDF:';
            actions = [
                {
                    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
                    label: en ? 'Strip GPS / EXIF' : 'Wyczyść GPS / EXIF',
                    highlight: true,
                    onClick: () => {
                        const exifCheckbox = document.getElementById('stripExifCheckbox');
                        if (exifCheckbox) {
                            exifCheckbox.checked = true;
                            if (typeof window.showNotification === 'function') {
                                window.showNotification(en ? 'EXIF & GPS metadata scrubbing enabled!' : 'Włączono czyszczenie danych EXIF i GPS!', 'success');
                            }
                        }
                    }
                },
                {
                    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`,
                    label: en ? 'Convert to PDF' : 'Konwertuj do PDF',
                    highlight: false,
                    onClick: () => {
                        if (typeof window.switchToolTab === 'function') window.switchToolTab('convert', false);
                    }
                }
            ];
        } else if (category === 'archive') {
            iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFBC39" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>`;
            title = en ? 'Archive / Project Files' : 'Paczka plików / Kod źródłowy';
            badge = en ? 'Security Vault' : 'Szwajcarski Sejf';
            desc = en
                ? 'Sharing confidential materials? Secure this transfer with a password or self-destruct trigger:'
                : 'Wysyłasz poufne materiały? Zabezpiecz transfer hasłem lub włącz tryb jednorazowego zniszczenia:';
            actions = [
                {
                    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
                    label: en ? 'Set File Password' : 'Ustaw hasło do pliku',
                    highlight: true,
                    onClick: () => {
                        const advToggle = document.getElementById('advToggleBtn');
                        const pwdInput = document.getElementById('filePasswordInput');
                        if (advToggle && advToggle.getAttribute('aria-expanded') !== 'true') advToggle.click();
                        if (pwdInput) {
                            pwdInput.focus();
                            pwdInput.style.outline = '2px solid #34D399';
                            setTimeout(() => pwdInput.style.outline = 'none', 1500);
                        }
                    }
                },
                {
                    iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"></path></svg>`,
                    label: en ? 'Burn after download' : 'Zniszcz po pobraniu',
                    highlight: false,
                    onClick: () => {
                        const burnRadio = document.querySelector('input[name="duration"][value="burn"]');
                        if (burnRadio) {
                            burnRadio.checked = true;
                            burnRadio.dispatchEvent(new Event('change', { bubbles: true }));
                            if (typeof window.showNotification === 'function') {
                                window.showNotification(en ? 'Burn after read mode activated!' : 'Aktywowano zniszczenie pliku po pobraniu!', 'success');
                            }
                        }
                    }
                }
            ];
        }

        // Renderowanie HTML (Dymek Popover)
        card.innerHTML = `
            <div class="omni-flyout-arrow"></div>
            <div class="omni-card-header">
                <div class="omni-card-title-box">
                    <span class="omni-card-icon">${iconSvg}</span>
                    <span class="omni-card-title">${title}</span>
                    <span class="omni-card-badge">${badge}</span>
                </div>
                <button type="button" class="omni-close-btn" aria-label="Zamknij podpowiedź">✕</button>
            </div>
            <p class="omni-card-desc">${desc}</p>
            <div class="omni-actions-row"></div>
        `;

        const actionsRow = card.querySelector('.omni-actions-row');
        actions.forEach(act => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `omni-action-chip ${act.highlight ? 'is-highlight' : ''}`;
            btn.innerHTML = `${act.iconSvg || ''}<span>${act.label}</span>`;
            btn.addEventListener('click', () => {
                if (typeof window.playSound === 'function') window.playSound('click');
                act.onClick();
            });
            actionsRow.appendChild(btn);
        });

        const closeBtn = card.querySelector('.omni-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                hide();
            });
        }

        card.style.display = 'flex';
    }

    function showForUrl(rawUrl) {
        if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) return;
        const card = getOrCreateContainer();
        if (!card) return;

        const en = isEnglish();
        const url = rawUrl.trim();
        let platform = 'Wideo & Multimedia';
        if (/tiktok\.com|douyin\.com/i.test(url)) platform = 'TikTok';
        else if (/youtu\.be|youtube\.com/i.test(url)) platform = 'YouTube';
        else if (/instagram\.com/i.test(url)) platform = 'Instagram';
        else if (/twitter\.com|x\.com/i.test(url)) platform = 'X / Twitter';
        else if (/pinterest\.com|pin\.it/i.test(url)) platform = 'Pinterest';

        const iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34D399" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>`;

        const title = en ? `Detected ${platform} Link` : `Wykryto link z ${platform}`;
        const badge = en ? 'Media Grabber' : 'Pobieracz Wideo';
        const desc = en
            ? 'Download clean watermark-free HD video, audio MP3, or save directly to your Dropsite cloud without using local bandwidth:'
            : 'Pobierz czysty plik HD bez znaku wodnego, ścieżkę MP3 lub zapisz bezpośrednio w chmurze Dropsite bez zużywania transferu:';

        const actions = [
            {
                iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
                label: en ? 'Grab HD Media' : 'Pobierz Wideo HD / MP3',
                highlight: true,
                onClick: () => {
                    hide();
                    if (window.DropsiteMediaGrabber && typeof window.DropsiteMediaGrabber.grabFromUrl === 'function') {
                        window.DropsiteMediaGrabber.grabFromUrl(url);
                    } else {
                        const nav = document.querySelector('[data-target="view-pobieracz"]');
                        if (nav) nav.click();
                        else if (window.switchView) window.switchView('view-pobieracz');
                    }
                }
            },
            {
                iconSvg: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`,
                label: en ? 'Save to Dropsite Cloud' : 'Zapisz w Chmurze R2',
                highlight: false,
                onClick: () => {
                    hide();
                    if (window.DropsiteMediaGrabber && typeof window.DropsiteMediaGrabber.grabFromUrl === 'function') {
                        window.DropsiteMediaGrabber.grabFromUrl(url);
                    }
                }
            }
        ];

        card.innerHTML = `
            <div class="omni-flyout-arrow"></div>
            <div class="omni-card-header">
                <div class="omni-card-title-box">
                    <span class="omni-card-icon">${iconSvg}</span>
                    <span class="omni-card-title">${title}</span>
                    <span class="omni-card-badge">${badge}</span>
                </div>
                <button type="button" class="omni-close-btn" aria-label="Zamknij podpowiedź">✕</button>
            </div>
            <p class="omni-card-desc">${desc}</p>
            <div class="omni-actions-row"></div>
        `;

        const actionsRow = card.querySelector('.omni-actions-row');
        actions.forEach(act => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `omni-action-chip ${act.highlight ? 'is-highlight' : ''}`;
            btn.innerHTML = `${act.iconSvg || ''}<span>${act.label}</span>`;
            btn.addEventListener('click', () => {
                if (typeof window.playSound === 'function') window.playSound('click');
                act.onClick();
            });
            actionsRow.appendChild(btn);
        });

        const closeBtn = card.querySelector('.omni-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                hide();
            });
        }

        card.style.display = 'flex';
    }

    function hide() {
        const card = document.getElementById('omniContextCard');
        if (card) {
            card.style.display = 'none';
        }
    }

    // Publiczne API
    const omniApi = {
        showForFiles,
        showForUrl,
        hide
    };

    if (typeof window !== 'undefined') {
        window.DropsiteOmniDropzone = omniApi;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            detectCategory
        };
    }
})();
