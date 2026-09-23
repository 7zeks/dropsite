/**
 * Dropsite Radial Triangle Wheel (Luminous Obsidian Glass Tool Selector)
 * Interactive tool selector with rich, concrete descriptions for every studio.
 * Brand Guidelines: Zero emoji, pure SVG inline, Cyber Mint & Obsidian Glass.
 */

(function () {
    'use strict';

    const DETAIL_INFO = {
        default: {
            badgeKey: 'radial_hub_default_badge',
            badge: 'DROPSITE SUITE',
            icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34D399" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"></circle><line x1="14.31" y1="8" x2="20.05" y2="17.94"></line><line x1="9.69" y1="8" x2="21.17" y2="8"></line><line x1="7.38" y1="12" x2="13.12" y2="2.06"></line><line x1="9.69" y1="16" x2="3.95" y2="6.06"></line><line x1="14.31" y1="16" x2="2.83" y2="16"></line><line x1="16.62" y1="12" x2="10.88" y2="21.94"></line></svg>`,
            titleKey: 'radial_hub_default_title',
            title: 'Wybierz Studio',
            descKey: 'radial_hub_default_desc',
            desc: 'Najedź kursorem lub dotknij narzędzie, aby poznać jego funkcje'
        },
        privacy: {
            badgeKey: 'radial_node_privacy_badge',
            badge: 'ZERO-KNOWLEDGE',
            icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><circle cx="12" cy="11" r="1.5"></circle><path d="M12 12.5V15"></path></svg>`,
            titleKey: 'radial_node_privacy_title',
            title: 'Prywatność & B2B',
            descKey: 'radial_node_privacy_desc',
            desc: 'Szyfrowanie AES-256 w RAM, samozniszczenie i bezpieczny odbiór plików od klientów'
        },
        pdf: {
            badgeKey: 'radial_node_pdf_badge',
            badge: '100% RAM / CLIENT-SIDE',
            icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34D399" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="13" y2="17"></line></svg>`,
            titleKey: 'radial_node_pdf_title',
            title: 'PDF Studio RAM',
            descKey: 'radial_node_pdf_desc',
            desc: 'Podpisy eIDAS, cenzura RODO, obrót stron Matrix i znaki wodne bez wysyłania do chmury'
        },
        media: {
            badgeKey: 'radial_node_media_badge',
            badge: 'WEKTORY & ULTRA HD',
            icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="3" ry="3"></rect></svg>`,
            titleKey: 'radial_node_media_title',
            title: 'Media & QR 4K',
            descKey: 'radial_node_media_desc',
            desc: 'Wektorowe kody QR do druku, kompresor wideo 25 MB oraz podglądy kodu i audio'
        },
        // Szczegółowe opisy dla każdego podnarzędzia:
        'dead-drop': {
            badgeKey: 'radial_tool_dead_drop_badge',
            badge: 'AES-256-GCM',
            icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`,
            titleKey: 'radial_tool_dead_drop_name',
            title: 'Tajna Notatka (Dead Drop)',
            descKey: 'radial_tool_dead_drop_detail',
            desc: 'Przekaż tajne hasło lub token API – treść ulega bezpowrotnemu zniszczeniu po 1 odczytaniu.'
        },
        'drop-request': {
            badgeKey: 'radial_tool_drop_req_badge',
            badge: 'ODBIÓR PLIKÓW',
            icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
            titleKey: 'radial_tool_drop_req_name',
            title: 'Poproś o Pliki (Drop Request)',
            descKey: 'radial_tool_drop_req_detail',
            desc: 'Wygeneruj dedykowany link dla klienta – wrzucone materiały trafiają prosto do Twojej historii.'
        },
        'pdf-edit': {
            badgeKey: 'radial_tool_pdf_edit_badge',
            badge: 'eIDAS & SHA-256',
            icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34D399" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path></svg>`,
            titleKey: 'radial_tool_pdf_edit_name',
            title: 'Podpis eIDAS & SHA-256',
            descKey: 'radial_tool_pdf_edit_detail',
            desc: 'Podpisuj umowy i generuj oficjalną kartę audytową z kryptograficznym hashem dokumentu.'
        },
        'pdf-rodo': {
            badgeKey: 'radial_tool_pdf_rodo_badge',
            badge: 'AUTO-CENZURA',
            icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34D399" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`,
            titleKey: 'radial_tool_pdf_rodo_name',
            title: 'RODO Guard (Auto-Blackout)',
            descKey: 'radial_tool_pdf_rodo_detail',
            desc: 'Wykrywaj numery PESEL, NIP, dowody osobiste i trwale zamalowuj poufne fragmenty w RAM.'
        },
        'pdf-matrix': {
            badgeKey: 'radial_tool_pdf_matrix_badge',
            badge: 'UKŁAD STRON',
            icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34D399" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect></svg>`,
            titleKey: 'radial_tool_pdf_matrix_name',
            title: 'Układ Stron & Obrót (Matrix)',
            descKey: 'radial_tool_pdf_matrix_detail',
            desc: 'Zmieniaj kolejność stron, obracaj arkusze o 90° i usuwaj niepotrzebne strony jednym kliknięciem.'
        },
        'pdf-watermark': {
            badgeKey: 'radial_tool_pdf_watermark_badge',
            badge: 'ZNAKI WODNE',
            icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34D399" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"></circle><line x1="3.5" y1="9" x2="20.5" y2="9"></line><line x1="3.5" y1="15" x2="20.5" y2="15"></line><path d="M12 2.5a15.3 15.3 0 0 1 4 9.5 15.3 15.3 0 0 1-4 9.5 15.3 15.3 0 0 1-4-9.5 15.3 15.3 0 0 1 4-9.5z"></path></svg>`,
            titleKey: 'radial_tool_pdf_watermark_name',
            title: 'Studio Znaków Wodnych',
            descKey: 'radial_tool_pdf_watermark_detail',
            desc: 'Nakładaj profesjonalne klauzule poufności, znaki „KOPIA” lub „PROJEKT” z siatką i kątem.'
        },
        'qr-studio': {
            badgeKey: 'radial_tool_qr_studio_badge',
            badge: '4K & SVG VECTOR',
            icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 18h2v3h-2zM18 14h3v2h-3z"></path></svg>`,
            titleKey: 'radial_tool_qr_studio_name',
            title: 'Studio Kodów QR 4K (SVG)',
            descKey: 'radial_tool_qr_studio_detail',
            desc: 'Generuj kody QR dla linków, sieci Wi-Fi i wizytówek vCard z własnym logo i wektorem do druku.'
        },
        'video-compress': {
            badgeKey: 'radial_tool_video_compress_badge',
            badge: 'MEDIARECORDER RAM',
            icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"></rect><path d="M8 4v16M16 4v16M2 9.5h6M2 14.5h6M16 9.5h6M16 14.5h6"></path></svg>`,
            titleKey: 'radial_tool_video_compress_name',
            title: 'Kompresor Wideo 25 MB',
            descKey: 'radial_tool_video_compress_detail',
            desc: 'Zmniejszaj wagę filmów MP4/MOV bez wysyłania do chmury, idealnie pod limity e-maila i Discorda.'
        },
        'media-grabber': {
            badgeKey: 'radial_tool_grabber_badge',
            badge: 'HD NO WATERMARK',
            icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34D399" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
            titleKey: 'radial_tool_grabber_name',
            title: 'Pobieracz Wideo & Foto',
            descKey: 'radial_tool_grabber_detail',
            desc: 'Pobieraj czyste filmy bez znaku wodnego z TikToka, YouTube i Instagrama oraz zapisuj prosto na dysk lub R2.'
        }
    };

    let currentHubKey = 'default';

    function getI18nText(key, fallback) {
        if (typeof window.t === 'function') {
            const val = window.t(key);
            if (val && val !== key) return val;
        }
        return fallback;
    }

    function initRadialWheel() {
        const backdrop = document.getElementById('radialHudBackdrop');
        const triggerBtn = document.getElementById('btnOpenRadialWheel');
        const closeBtn = document.getElementById('btnRadialHudClose');

        if (!backdrop) return;

        function openHUD() {
            backdrop.classList.add('open');
            document.body.style.overflow = 'hidden';
            updateHub('default');
            if (typeof playSound === 'function') playSound('click');
        }

        function closeHUD() {
            backdrop.classList.remove('open');
            document.body.style.overflow = '';
        }

        // Obsługa wszystkich przycisków otwierających koło radialne (w tym na mobile i w menu)
        document.querySelectorAll('#btnOpenRadialWheel, #btnOpenRadialWheelMobile, #mobileRadialBtn, .btn-open-radial-wheel, .btn-radial-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                openHUD();
                const drawer = document.getElementById('mobileNavDrawer');
                if (drawer) drawer.classList.remove('open');
                const hamburgerBtn = document.getElementById('mobileMenuBtn');
                if (hamburgerBtn) hamburgerBtn.classList.remove('active');
            });
        });
        if (closeBtn) closeBtn.addEventListener('click', closeHUD);

        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeHUD();
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && backdrop.classList.contains('open')) {
                closeHUD();
            }
        });

        // Obsługa najechania na wierzchołki trójkąta (sektory)
        const nodes = document.querySelectorAll('.radial-sector-node');
        nodes.forEach(node => {
            const sectorKey = node.getAttribute('data-sector');
            node.addEventListener('mouseenter', () => {
                nodes.forEach(n => n.classList.remove('active'));
                node.classList.add('active');
                updateHub(sectorKey);
            });
            node.addEventListener('mouseleave', () => {
                node.classList.remove('active');
                updateHub('default');
            });
        });

        // Obsługa najechania i kliknięć w konkretne podnarzędzia
        const subtools = document.querySelectorAll('.radial-subtool-item');
        subtools.forEach(btn => {
            const action = btn.getAttribute('data-action');

            btn.addEventListener('mouseenter', (e) => {
                e.stopPropagation();
                updateHub(action);
            });

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeHUD();
                executeToolAction(action);
            });
        });

        // Obsługa przycisków "Wróć do wyboru" wewnątrz modali
        document.querySelectorAll('.btn-back-to-radial').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Zamknij wszystkie otwarte modale
                document.querySelectorAll('.dead-drop-modal-wrap.open, .drop-req-modal-wrap.open, #qrStudioModal.open, #videoCompressModal.open, .video-compress-modal-wrap.open, .mod-modal.open').forEach(m => {
                    m.classList.remove('open');
                });
                document.body.style.overflow = '';
                // Otwórz selektor radialny
                setTimeout(() => {
                    openHUD();
                }, 60);
            });
        });

        // Reagowanie na dynamiczną zmianę języka w locie
        document.addEventListener('dropsite_language_changed', () => {
            updateHub(currentHubKey || 'default');
        });

        window.openRadialWheel = openHUD;
        window.closeRadialWheel = closeHUD;
    }

    function updateHub(key) {
        currentHubKey = key;
        const hubBadge = document.getElementById('radialHubBadge');
        const hubIcon = document.getElementById('radialHubIcon');
        const hubTitle = document.getElementById('radialHubTitle');
        const hubDesc = document.getElementById('radialHubDesc');

        const info = DETAIL_INFO[key] || DETAIL_INFO.default;

        if (hubBadge) hubBadge.textContent = getI18nText(info.badgeKey, info.badge);
        if (hubIcon) hubIcon.innerHTML = info.icon;
        if (hubTitle) hubTitle.textContent = getI18nText(info.titleKey, info.title);
        if (hubDesc) hubDesc.textContent = getI18nText(info.descKey, info.desc);
    }

    function executeToolAction(action) {
        switch (action) {
            case 'dead-drop':
                if (window.openDeadDropCreator) window.openDeadDropCreator();
                break;
            case 'drop-request':
                if (window.openDropRequestCreator) window.openDropRequestCreator();
                break;
            case 'pdf-edit':
                if (window.switchToolTab) window.switchToolTab('edit');
                break;
            case 'pdf-rodo':
                if (window.switchToolTab) window.switchToolTab('rodo');
                break;
            case 'pdf-matrix':
                if (window.switchToolTab) window.switchToolTab('matrix');
                break;
            case 'pdf-watermark':
                if (window.switchToolTab) window.switchToolTab('watermark');
                break;
            case 'qr-studio':
                const qrModal = document.getElementById('qrStudioModal');
                if (qrModal) {
                    qrModal.classList.add('open');
                    document.body.style.overflow = 'hidden';
                    if (window.initQRStudio) window.initQRStudio();
                }
                break;
            case 'video-compress':
                if (window.openVideoCompressor) window.openVideoCompressor();
                break;
            case 'media-grabber':
            case 'grabber':
                const grabberNav = document.querySelector('[data-target="view-pobieracz"]');
                if (grabberNav) grabberNav.click();
                else if (window.switchView) window.switchView('view-pobieracz');
                break;
            default:
                const toolsNav = document.querySelector('[data-target="view-narzedzia"]');
                if (toolsNav) toolsNav.click();
                break;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRadialWheel);
    } else {
        initRadialWheel();
    }

})();
