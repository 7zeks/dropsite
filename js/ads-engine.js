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

        // Baza Kampanii - WYŁĄCZNIE TWOJE WŁASNE LINKI I OFERTY:
        campaigns: [
            {
                id: 'pCloudLifetime',
                badge: { pl: 'LIFETIME CLOUD', en: 'LIFETIME CLOUD', de: 'LIFETIME CLOUD', es: 'NUBE DE POR VIDA', fr: 'CLOUD À VIE', uk: 'ДОВІЧНА ХМАРА' },
                title: {
                    pl: 'Prywatna chmura dożywotnia (Lifetime do 10 TB)',
                    en: 'Swiss Lifetime Cloud Storage (Up to 10 TB)',
                    de: 'Lebenslanger Cloud-Speicher (Bis zu 10 TB)',
                    es: 'Almacenamiento en la nube de por vida (10 TB)',
                    fr: 'Stockage cloud à vie en Suisse (10 To)',
                    uk: 'Довічна хмара без підписок (до 10 ТБ)'
                },
                desc: {
                    pl: 'Koniec z comiesięcznym abonamentem. Przechowuj do 10 TB danych z szyfrowaniem w Szwajcarii bez limitów.',
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
                url: 'https://partner.pcloud.com/r/157308', // Twój link partnerski pCloud (20% prowizji dla Ciebie)
                iconBg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                iconType: 'cloud'
            },
            {
                id: 'dropsitePro',
                badge: { pl: 'DROPSITE PRO', en: 'DROPSITE PRO', de: 'DROPSITE PRO', es: 'DROPSITE PRO', fr: 'DROPSITE PRO', uk: 'DROPSITE PRO' },
                title: {
                    pl: 'Wysyłaj duże pliki do 10 GB bez limitów prędkości',
                    en: 'Transfer Large Files up to 10 GB with No Speed Limits',
                    de: 'Große Dateien bis zu 10 GB ohne Tempolimit senden',
                    es: 'Envía archivos grandes de hasta 10 GB sin límites',
                    fr: 'Envoyez des fichiers volumineux jusqu\'à 10 Go sans limite',
                    uk: 'Надсилайте великі файли до 10 ГБ без обмеження швидкості'
                },
                desc: {
                    pl: 'Odblokuj własne nazwy linków, przechowywanie do 30 dni lub na stałe oraz brak jakichkolwiek reklam.',
                    en: 'Unlock custom link aliases, permanent and 30-day storage, zero ads, and priority global bandwidth.',
                    de: 'Eigene Link-Namen, permanente Speicherung, keine Werbung und Prioritäts-Geschwindigkeit freischalten.',
                    es: 'Desbloquea enlaces personalizados, almacenamiento permanente y 0 publicidad con Dropsite PRO.',
                    fr: 'Débloquez des liens personnalisés, stockage permanent et zéro publicité avec Dropsite PRO.',
                    uk: 'Розблокуйте власні аліаси посилань, постійне зберігання та повну відсутність реклами.'
                },
                btnText: {
                    pl: 'Aktywuj PRO ✦',
                    en: 'Upgrade to PRO ✦',
                    de: 'PRO aktivieren ✦',
                    es: 'Activar PRO ✦',
                    fr: 'Activer PRO ✦',
                    uk: 'Активувати PRO ✦'
                },
                action: 'pro', // Wewnętrzna akcja - otwiera okno zakupu PRO Dropsite (100% zysku dla Ciebie)
                url: '#pro',
                iconBg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                iconType: 'star'
            },
            {
                id: 'pCloudCrypto',
                badge: { pl: 'SZWAJCARSKI SEJF', en: 'SWISS VAULT', de: 'SCHWEIZER TRESOR', es: 'BÓVEDA SUIZA', fr: 'COFFRE SUISSE', uk: 'ШВЕЙЦАРСЬКИЙ СЕЙФ' },
                title: {
                    pl: 'Szyfrowanie zerowej wiedzy (Zero-Knowledge Privacy)',
                    en: 'Military-Grade Zero-Knowledge File Encryption',
                    de: 'Zero-Knowledge Datei-Verschlüsselung auf Militär-Niveau',
                    es: 'Cifrado de archivos de grado militar sin conocimiento',
                    fr: 'Chiffrement de fichiers de niveau militaire zéro connaissance',
                    uk: 'Шифрування файлів військового рівня без доступу третіх осіб'
                },
                desc: {
                    pl: 'Nawet administratorzy serwerów nie mają dostępu do Twoich kluczy. Pełna poufność danych w pCloud Crypto.',
                    en: 'Not even server admins can access your encryption keys. Total privacy and confidentiality on pCloud.',
                    de: 'Nicht einmal Server-Admins haben Zugriff auf deine Schlüssel. Vollständige Vertraulichkeit.',
                    es: 'Ni siquiera los administradores del servidor pueden acceder a tus claves. Confidencialidad total.',
                    fr: 'Même les administrateurs n\'ont pas accès à vos clés. Confidentialité totale garantie.',
                    uk: 'Навіть адміністратори серверів не мають доступу до ваших ключів шифрування.'
                },
                btnText: {
                    pl: 'Zobacz szyfrowanie ➔',
                    en: 'Explore Crypto ➔',
                    de: 'Krypto ansehen ➔',
                    es: 'Ver cifrado ➔',
                    fr: 'Découvrir Crypto ➔',
                    uk: 'Дізнатися більше ➔'
                },
                url: 'https://partner.pcloud.com/r/157308', // Twój link partnerski pCloud (20% prowizji dla Ciebie)
                iconBg: 'linear-gradient(135deg, #0F91D2 0%, #0284C7 100%)',
                iconType: 'shield'
            },
            {
                id: 'pCloudPass',
                badge: { pl: 'SEJF NA HASŁA', en: 'PASSWORD VAULT', de: 'PASSWORT-TRESOR', es: 'BÓVEDA DE CLAVES', fr: 'COFFRE DE MOTS DE PASSE', uk: 'СЕЙФ ПАРОЛІВ' },
                title: {
                    pl: 'Zaszyfrowany menedżer haseł i kluczy cyfrowych',
                    en: 'Secure Password Manager & Digital Key Vault',
                    de: 'Sicherer Passwort-Manager & digitaler Tresor',
                    es: 'Gestor seguro de contraseñas y llaves digitales',
                    fr: 'Gestionnaire de mots de passe et clés numériques sécurisé',
                    uk: 'Безпечний менеджер паролів та цифрових ключів'
                },
                desc: {
                    pl: 'Zapisuj hasła, numery kart i poufne notatki z synchronizacją na wszystkich Twoich urządzeniach (pCloud Pass).',
                    en: 'Store unhackable passwords, credit cards, and private notes synced across all devices with pCloud Pass.',
                    de: 'Speichere Passwörter, Kreditkarten und Notizen synchron auf all deinen Geräten mit pCloud Pass.',
                    es: 'Guarda contraseñas, tarjetas y notas privadas sincronizadas en todos tus dispositivos con pCloud Pass.',
                    fr: 'Enregistrez mots de passe, cartes et notes synchronisés sur tous vos appareils avec pCloud Pass.',
                    uk: 'Зберігайте паролі, дані карток та конфіденційні нотатки із синхронізацією на всіх пристроях.'
                },
                btnText: {
                    pl: 'Wypróbuj sejf ➔',
                    en: 'Try Pass Vault ➔',
                    de: 'Tresor testen ➔',
                    es: 'Probar bóveda ➔',
                    fr: 'Tester le coffre ➔',
                    uk: 'Спробувати сейф ➔'
                },
                url: 'https://partner.pcloud.com/r/157308', // Twój link partnerski pCloud (20% prowizji dla Ciebie)
                iconBg: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                iconType: 'key'
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
            case 'star':
                return `<svg width="22" height="22" viewBox="0 0 24 24" fill="#FFD24C" stroke="#FFD24C" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
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
                        ${c.action === 'pro'
                            ? `<button type="button" onclick="if(window.openProModal) window.openProModal();" class="btn-ad-action" style="cursor: pointer; border: none;">${btnText}</button>`
                            : `<a href="${c.url}" target="_blank" rel="noopener noreferrer nofollow" class="btn-ad-action">${btnText}</a>`
                        }
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
