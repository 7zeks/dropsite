/**
 * ============================================================================
 * DROPSITE ADVANCED MONETIZATION & MULTI-CAMPAIGN ROTATOR ENGINE
 * ============================================================================
 * 
 * Funkcjonalności:
 * 1. 100% Ekspozycja Wszystkich Reklam (Smart Auto-Rotator):
 *    - Każdy slot reklamowy płynnie rotuje przez całą bazę kampanii partnerskich
 *      co 7.5 sekundy.
 *    - Użytkownik w trakcie krótkiej wizyty zobaczy KAŻDĄ JEDNĄ reklamę i ofertę!
 *    - Sloty zaczynają od różnych kampanii (staggered offset), aby nie dublować
 *      tych samych treści na jednym ekranie.
 * 2. Pełna interaktywność i komfort (Zero-Annoyance):
 *    - Kropki nawigacyjne (carousel dots) z podświetleniem aktywnego sponsora.
 *    - Przyciski strzałek (< >) do natychmiastowego przełączania ofert.
 *    - Najechanie myszką (Hover) wstrzymuje rotację, by użytkownik mógł spokojnie
 *      przeczytać ofertę i kliknąć przycisk.
 * 3. 100% Odporność na AdBlock, uBlock Origin i Tarczę Brave:
 *    - Kafelki są generowane natywnie jako część interfejsu (First-Party DOM).
 * 4. Wielojęzyczność (i18n):
 *    - Baza kampanii automatycznie tłumaczy się na PL, EN, DE, ES, FR, UK.
 * 5. Dźwignia Dropsite PRO & Pełne ukrycie dla subskrybentów i Administratora.
 */

(function () {
    'use strict';

    window.ADS_CONFIG = {
        // Tryb: 'hybrid' (zalecany - rotacja natywna lub AdSense z fallbackiem), 'affiliate', 'adsense'
        mode: 'hybrid',

        // Czas rotacji pomiędzy kampaniami (w milisekundach)
        rotationIntervalMs: 7500,

        // Konfiguracja Google AdSense (dla trybu 'adsense')
        googleAdSense: {
            enabled: true,
            client: 'ca-pub-5653151226207684',
            slotTop: 'auto',
            slotBottom: 'auto',
            slotSuccess: 'auto',
            slotHome: 'auto'
        },

        // Baza Kampanii Afiliacyjnych (Wklej tutaj swoje linki partnerskie):
        campaigns: [
            {
                id: 'nordVpn',
                badge: { pl: 'VPN SPONSOR', en: 'VPN SPONSOR', de: 'VPN SPONSOR', es: 'PATROCINADOR VPN', fr: 'SPONSOR VPN', uk: 'VPN СПОНСОР' },
                title: {
                    pl: 'Chroń swoją prywatność i ukryj IP',
                    en: 'Protect your privacy & hide your IP',
                    de: 'Schütze deine Privatsphäre & IP',
                    es: 'Protege tu privacidad y oculta tu IP',
                    fr: 'Protégez votre vie privée et masquez votre IP',
                    uk: 'Захистіть приватність та приховайте IP'
                },
                desc: {
                    pl: 'Pobierasz lub wysyłasz poufne pliki? Zaszyfruj całe swoje łącze z NordVPN (82% rabatu + 3 msc gratis).',
                    en: 'Downloading or sharing sensitive files? Encrypt your entire connection with NordVPN (82% off + 3 mos free).',
                    de: 'Vertrauliche Dateien teilen? Verschlüssele deine Verbindung mit NordVPN (82% Rabatt + 3 Monate gratis).',
                    es: '¿Compartiendo archivos sensibles? Cifra tu conexión con NordVPN (82% de descuento + 3 meses gratis).',
                    fr: 'Vous partagez des fichiers sensibles ? Chiffrez votre connexion avec NordVPN (82% de réduction + 3 mois offerts).',
                    uk: 'Передаєте конфіденційні файли? Зашифруйте своє з\'єднання з NordVPN (знижка 82% + 3 міс. безкоштовно).'
                },
                btnText: {
                    pl: 'Odbierz rabat ➔',
                    en: 'Get 82% Discount ➔',
                    de: 'Rabatt sichern ➔',
                    es: 'Obtener descuento ➔',
                    fr: 'Profiter de l\'offre ➔',
                    uk: 'Отримати знижку ➔'
                },
                url: 'https://nordvpn.com', // Podmień na swój link partnerski NordVPN
                iconBg: 'linear-gradient(135deg, #0F91D2 0%, #0052CC 100%)',
                iconType: 'shield'
            },
            {
                id: 'pCloud',
                badge: { pl: 'LIFETIME CLOUD', en: 'LIFETIME CLOUD', de: 'LIFETIME CLOUD', es: 'NUBE DE POR VIDA', fr: 'CLOUD À VIE', uk: 'ДОВІЧНА ХМАРА' },
                title: {
                    pl: 'Prywatna chmura dożywotnia (Lifetime 10 TB)',
                    en: 'Swiss Lifetime Cloud Storage (Up to 10 TB)',
                    de: 'Lebenslanger Cloud-Speicher (Bis zu 10 TB)',
                    es: 'Almacenamiento en la nube de por vida (10 TB)',
                    fr: 'Stockage cloud à vie en Suisse (10 To)',
                    uk: 'Довічна хмара без підписок (до 10 ТБ)'
                },
                desc: {
                    pl: 'Masz dość comiesięcznych abonamentów? Przechowuj do 10 TB danych z szyfrowaniem zerowej wiedzy w Szwajcarii (pCloud).',
                    en: 'Tired of monthly subscriptions? Secure up to 10 TB with zero-knowledge Swiss encryption on pCloud.',
                    de: 'Keine Lust auf monatliche Abos? Sichere bis zu 10 TB mit Schweizer Zero-Knowledge-Verschlüsselung.',
                    es: '¿Cansado de suscripciones mensuales? Guarda hasta 10 TB con cifrado suizo de conocimiento cero.',
                    fr: 'Marre des abonnements mensuels ? Stockez jusqu\'à 10 To avec chiffrement suisse zéro connaissance.',
                    uk: 'Набридли щомісячні підписки? Зберігайте до 10 ТБ із захищеним швейцарським шифруванням у pCloud.'
                },
                btnText: {
                    pl: 'Sprawdź Lifetime ➔',
                    en: 'Get Lifetime Deal ➔',
                    de: 'Lifetime Deal ➔',
                    es: 'Ver oferta Lifetime ➔',
                    fr: 'Découvrir l\'offre ➔',
                    uk: 'Переглянути хмару ➔'
                },
                url: 'https://partner.pcloud.com/r/157308', // Twój link partnerski pCloud (Lifetime 20% prowizji)
                iconBg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                iconType: 'cloud'
            },
            {
                id: 'devHosting',
                badge: { pl: 'DEV SPONSOR', en: 'DEV SPONSOR', de: 'DEV SPONSOR', es: 'HOSTING PROMO', fr: 'SPONSOR DEV', uk: 'ХМАРНИЙ СПОНСОР' },
                title: {
                    pl: 'Szybka chmura NVMe dla twórców & 200$ na start',
                    en: 'High-Speed Cloud VPS & $200 Free Start Credit',
                    de: 'Highspeed Cloud VPS & 200$ Startguthaben',
                    es: 'Cloud VPS de alta velocidad y $200 de crédito',
                    fr: 'VPS Cloud ultra-rapide et 200$ de crédit offert',
                    uk: 'Хмарний VPS для розробників та 200$ на старт'
                },
                desc: {
                    pl: 'Hostuj własne aplikacje, boty i pliki na superszybkich procesorach chmurowych – odbierz 200$ darmowego kredytu na 60 dni.',
                    en: 'Deploy apps, storage, and projects on lightning-fast NVMe cloud – claim your $200 free credit today.',
                    de: 'Erstelle Apps, Bots und Speicher auf schnellen NVMe-Servern – sichere dir 200$ Startguthaben.',
                    es: 'Despliega aplicaciones y archivos en servidores ultrarrápidos NVMe – reclama tus $200 de crédito gratis.',
                    fr: 'Déployez vos applications et fichiers sur des serveurs NVMe ultra-rapides – 200$ de crédit offert.',
                    uk: 'Розгортайте додатки та сайти на надшвидких NVMe-серверах – отримайте 200$ безкоштовного кредиту.'
                },
                btnText: {
                    pl: 'Odbierz 200$ ➔',
                    en: 'Claim $200 Credit ➔',
                    de: '200$ sichern ➔',
                    es: 'Reclamar $200 ➔',
                    fr: 'Récupérer 200$ ➔',
                    uk: 'Отримати 200$ ➔'
                },
                url: 'https://digitalocean.com', // Podmień na swój link partnerski DigitalOcean / Hostinger
                iconBg: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                iconType: 'server'
            },
            {
                id: 'nordPass',
                badge: { pl: 'BEZPIECZEŃSTWO', en: 'SECURITY VAULT', de: 'SICHERHEIT', es: 'SEGURIDAD', fr: 'SÉCURITÉ', uk: 'БЕЗПЕКА' },
                title: {
                    pl: 'Zaszyfrowany sejf na hasła i klucze licencyjne',
                    en: 'Encrypted Password & Digital License Vault',
                    de: 'Verschlüsselter Passwort-Tresor für alle Geräte',
                    es: 'Bóveda cifrada de contraseñas y claves',
                    fr: 'Coffre-fort chiffré pour mots de passe et clés',
                    uk: 'Зашифроване сховище паролів та ключів'
                },
                desc: {
                    pl: 'Generuj unikalne hasła i bezpiecznie przechowuj dane dostępowe na telefonie i komputerze (NordPass).',
                    en: 'Generate unhackable passwords and sync access keys securely across all your devices with NordPass.',
                    de: 'Erstelle sichere Passwörter und synchronisiere deine Zugangsdaten auf allen Geräten.',
                    es: 'Genera contraseñas seguras y sincroniza tus accesos de forma segura en todos tus dispositivos.',
                    fr: 'Générez des mots de passe inviolables et synchronisez vos identifiants sur tous vos appareils.',
                    uk: 'Створюйте надійні паролі та синхронізуйте ключі доступу на всіх пристроях з NordPass.'
                },
                btnText: {
                    pl: 'Wypróbuj za darmo ➔',
                    en: 'Try for Free ➔',
                    de: 'Kostenlos testen ➔',
                    es: 'Probar gratis ➔',
                    fr: 'Essayer gratuitement ➔',
                    uk: 'Спробувати безкоштовно ➔'
                },
                url: 'https://nordpass.com',
                iconBg: 'linear-gradient(135deg, #FF9900 0%, #E65100 100%)',
                iconType: 'key'
            },
            {
                id: 'protonVpn',
                badge: { pl: 'SWISS PRIVACY', en: 'SWISS PRIVACY', de: 'SCHWEIZER PRIVATSPHÄRE', es: 'PRIVACIDAD SUIZA', fr: 'CONFIDENTIALITÉ SUISSE', uk: 'ШВЕЙЦАРСЬКА ПРИВАТНІСТЬ' },
                title: {
                    pl: 'Szwajcarski VPN z polityką Zero-Logs (Proton)',
                    en: 'Swiss Zero-Logs High Speed Privacy (Proton VPN)',
                    de: 'Schweizer Zero-Logs Highspeed VPN (Proton)',
                    es: 'VPN suizo de alta velocidad sin registros (Proton)',
                    fr: 'VPN suisse haute vitesse sans logs (Proton)',
                    uk: 'Швейцарський VPN без ведення логів (Proton)'
                },
                desc: {
                    pl: 'Stworzony przez naukowców z CERN. Maksymalna ochrona przed inwigilacją i blokadami regionalnymi.',
                    en: 'Developed by CERN scientists. Protect your traffic from tracking and bypass strict censorship.',
                    de: 'Entwickelt von CERN-Wissenschaftlern. Schütze deine Daten vor Überwachung und Geoblocking.',
                    es: 'Creado por científicos del CERN. Máxima protección contra el rastreo y bloqueos de red.',
                    fr: 'Créé par les scientifiques du CERN. Protection maximale contre la surveillance en ligne.',
                    uk: 'Створено науковцями CERN. Максимальний захист від стеження та гео-блокувань.'
                },
                btnText: {
                    pl: 'Włącz Proton ➔',
                    en: 'Get Proton VPN ➔',
                    de: 'Proton holen ➔',
                    es: 'Obtener Proton ➔',
                    fr: 'Activer Proton ➔',
                    uk: 'Отримати Proton ➔'
                },
                url: 'https://protonvpn.com',
                iconBg: 'linear-gradient(135deg, #6D4AFF 0%, #3B1B99 100%)',
                iconType: 'shield'
            }
        ]
    };

    /**
     * Zwraca aktualny język interfejsu (pl, en, de, es, fr, uk)
     */
    function getCurrentLang() {
        const stored = localStorage.getItem('dropsite_lang');
        if (stored && ['pl', 'en', 'de', 'es', 'fr', 'uk'].includes(stored)) return stored;
        const browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
        if (browserLang.startsWith('pl')) return 'pl';
        if (browserLang.startsWith('de')) return 'de';
        if (browserLang.startsWith('es')) return 'es';
        if (browserLang.startsWith('fr')) return 'fr';
        if (browserLang.startsWith('uk')) return 'uk';
        return 'en';
    }

    /**
     * Generator ikon SVG w zależności od typu kampanii
     */
    function getCampaignSvgIcon(iconType) {
        switch (iconType) {
            case 'cloud':
                return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>`;
            case 'server':
                return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>`;
            case 'key':
                return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
            case 'shield':
            default:
                return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
        }
    }

    /**
     * Sprawdza, czy bieżący użytkownik ma aktywne konto PRO lub Administratora
     */
    function isUserProOrAdmin() {
        if (document.body.classList.contains('is-pro')) return true;
        if (document.body.classList.contains('is-admin')) return true;
        if (typeof window.isProUser === 'function' && window.isProUser()) return true;
        return false;
    }

    // Stan aktywnych rotacji per kontener
    const activeRotators = {};

    /**
     * Renderuje szkielet rotatora reklamowego w danym slocie
     */
    function setupRotatorSlot(containerId, initialIndex = 0) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (isUserProOrAdmin()) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }

        container.style.display = '';

        const campaigns = window.ADS_CONFIG.campaigns;
        if (!campaigns || campaigns.length === 0) return;

        // Jeśli rotator już istnieje w tym kontenerze, zatrzymaj stary timer
        if (activeRotators[containerId]) {
            clearInterval(activeRotators[containerId].timer);
        }

        let currentIndex = initialIndex % campaigns.length;
        let isHovered = false;

        const lang = getCurrentLang();
        const removeAdsText = {
            pl: 'Wyłącz reklamy z Dropsite PRO',
            en: 'Remove ads with Dropsite PRO',
            de: 'Werbung mit Dropsite PRO entfernen',
            es: 'Quitar anuncios con Dropsite PRO',
            fr: 'Supprimer les pubs avec Dropsite PRO',
            uk: 'Вимкнути рекламу з Dropsite PRO'
        }[lang] || 'Remove ads with Dropsite PRO';

        // Generuj HTML szkieletu
        container.innerHTML = `
            <div class="dropsite-ad-banner" id="${containerId}_banner" data-slot="${containerId}">
                <div class="ad-top-meta">
                    <span class="ad-tag-badge" id="${containerId}_badge">SPONSOR</span>
                    <span class="ad-pro-link" onclick="if(window.openProModal) window.openProModal();" title="Przejdź na plan PRO">
                        ✦ ${removeAdsText}
                    </span>
                </div>
                <div class="ad-banner-body" id="${containerId}_body">
                    <!-- Dynamiczna treść kampanii wstrzykiwana przez updateCampaignView() -->
                </div>
                <div class="ad-rotator-footer">
                    <div class="ad-dots-row" id="${containerId}_dots">
                        ${campaigns.map((_, i) => `<span class="ad-dot-pill ${i === currentIndex ? 'active' : ''}" data-idx="${i}" title="Przejdź do oferty ${i + 1}"></span>`).join('')}
                    </div>
                    <div class="ad-arrow-group">
                        <button type="button" class="ad-arrow-btn ad-prev" title="Poprzednia oferta" aria-label="Poprzednia oferta">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        <button type="button" class="ad-arrow-btn ad-next" title="Następna oferta" aria-label="Następna oferta">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        const bannerEl = document.getElementById(`${containerId}_banner`);
        const bodyEl = document.getElementById(`${containerId}_body`);
        const badgeEl = document.getElementById(`${containerId}_badge`);
        const dotsEl = document.getElementById(`${containerId}_dots`);

        function updateCampaignView(index, animate = true) {
            const c = campaigns[index];
            if (!c) return;

            const curLang = getCurrentLang();
            const badgeText = c.badge[curLang] || c.badge.en || 'SPONSOR';
            const titleText = c.title[curLang] || c.title.en || '';
            const descText = c.desc[curLang] || c.desc.en || '';
            const btnText = c.btnText[curLang] || c.btnText.en || 'Sprawdź ➔';

            if (badgeEl) badgeEl.textContent = badgeText;

            const applyContent = () => {
                if (bodyEl) {
                    bodyEl.innerHTML = `
                        <div class="ad-icon-box" style="background: ${c.iconBg}">
                            ${getCampaignSvgIcon(c.iconType)}
                        </div>
                        <div class="ad-info-text">
                            <h4 class="ad-banner-title">${titleText}</h4>
                            <p class="ad-banner-desc">${descText}</p>
                        </div>
                        <a href="${c.url}" target="_blank" rel="noopener noreferrer nofollow" class="btn-ad-action">
                            ${btnText}
                        </a>
                    `;
                    bodyEl.classList.remove('ad-animating');
                }
            };

            if (animate && bodyEl) {
                bodyEl.classList.add('ad-animating');
                setTimeout(applyContent, 180);
            } else {
                applyContent();
            }

            // Zaktualizuj aktywne kropki
            if (dotsEl) {
                dotsEl.querySelectorAll('.ad-dot-pill').forEach((dot, dIdx) => {
                    dot.classList.toggle('active', dIdx === index);
                });
            }
        }

        // Pierwsze wyrenderowanie bez animacji
        updateCampaignView(currentIndex, false);

        // Funkcje sterujące
        const nextSlide = () => {
            currentIndex = (currentIndex + 1) % campaigns.length;
            updateCampaignView(currentIndex, true);
        };

        const prevSlide = () => {
            currentIndex = (currentIndex - 1 + campaigns.length) % campaigns.length;
            updateCampaignView(currentIndex, true);
        };

        // Podpięcie strzałek
        if (bannerEl) {
            const prevBtn = bannerEl.querySelector('.ad-prev');
            const nextBtn = bannerEl.querySelector('.ad-next');
            if (prevBtn) prevBtn.onclick = (e) => { e.stopPropagation(); prevSlide(); };
            if (nextBtn) nextBtn.onclick = (e) => { e.stopPropagation(); nextSlide(); };

            // Zatrzymanie rotacji podczas najechania kursorem
            bannerEl.addEventListener('mouseenter', () => { isHovered = true; });
            bannerEl.addEventListener('mouseleave', () => { isHovered = false; });
        }

        // Podpięcie kropek
        if (dotsEl) {
            dotsEl.addEventListener('click', (e) => {
                const dot = e.target.closest('.ad-dot-pill');
                if (dot) {
                    const idx = parseInt(dot.getAttribute('data-idx'), 10);
                    if (!isNaN(idx) && idx !== currentIndex) {
                        currentIndex = idx;
                        updateCampaignView(currentIndex, true);
                    }
                }
            });
        }

        // Uruchomienie cyklicznego timera rotacji
        const timer = setInterval(() => {
            if (!isHovered && !isUserProOrAdmin()) {
                nextSlide();
            }
        }, window.ADS_CONFIG.rotationIntervalMs || 7500);

        activeRotators[containerId] = {
            timer,
            update: () => updateCampaignView(currentIndex, false)
        };
    }

    /**
     * Główna funkcja ładująca reklamy i uruchamiająca rotatory we wszystkich slotach
     */
    window.initDropsiteAds = function () {
        // 1. Zabezpieczenie: dla PRO i Admina reklamy są bezwzględnie ukrywane
        if (isUserProOrAdmin()) {
            document.querySelectorAll('.ad-container, .dropsite-ad-banner').forEach(el => {
                el.style.display = 'none';
            });
            Object.values(activeRotators).forEach(r => clearInterval(r.timer));
            return;
        }

        // Upewnij się, że kontenery reklamowe są widoczne
        document.querySelectorAll('.ad-container').forEach(el => {
            el.style.display = '';
        });

        // 2. Uruchomienie staggered rotatora we wszystkich 4 kluczowych punktach aplikacji:
        // Slot 1: Strona Główna (Home) -> startuje od NordVPN (idx 0)
        setupRotatorSlot('homeAdSlot', 0);

        // Slot 2: Strona Pobierania GÓRA (Top) -> startuje od pCloud Lifetime (idx 1)
        setupRotatorSlot('adContentTop', 1);

        // Slot 3: Strona Pobierania DÓŁ (Bottom) -> startuje od Dev Hosting $200 (idx 2)
        setupRotatorSlot('adContentBottom', 2);

        // Slot 4: Ekran Sukcesu po uploadzie (Success Flow) -> startuje od NordPass (idx 3)
        setupRotatorSlot('successAdSlot', 3);
    };

    // Reakcja na zmianę języka w locie (przeładowanie tekstów banerów)
    const onLangChange = () => {
        if (!isUserProOrAdmin()) {
            Object.values(activeRotators).forEach(r => {
                if (typeof r.update === 'function') r.update();
            });
        }
    };
    document.addEventListener('dropsite_language_changed', onLangChange);
    window.addEventListener('languageChanged', onLangChange);

    // Inicjalizacja po starcie DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(window.initDropsiteAds, 200));
    } else {
        setTimeout(window.initDropsiteAds, 200);
    }

})();
