/**
 * ============================================================================
 * DROPSITE ADS & SPONSOR ENGINE (PRODUCTION READY MONETIZATION)
 * ============================================================================
 * Obsługuje:
 * 1. Płatne Kampanie Partnerskie / Afiliację High-Ticket (80-160 PLN / konwersja)
 * 2. Google AdSense / EthicalAds (Auto-Script Injection)
 * 3. Ekran sukcesu po uploadzie + Strona pobierania
 * 4. Dźwignia konwersji do Dropsite PRO (1-Click Remove Ads)
 * 5. Automatyczne ukrywanie dla subskrybentów PRO
 */

window.ADS_CONFIG = {
    // Tryb: 'affiliate' (gotowe banery partnerskie), 'adsense' (Google AdSense), 'custom'
    mode: 'affiliate',

    // Konfiguracja Google AdSense
    googleAdSense: {
        enabled: true,
        client: 'ca-pub-5653151226207684',
        slotTop: 'auto',
        slotBottom: 'auto'
    },

    // Linki afiliacyjne (Wklej tutaj swoje linki partnerskie z sieci afiliacyjnych):
    affiliates: {
        nordVpn: {
            title: 'Chroń swoją prywatność i ukryj IP',
            desc: 'Pobierasz wrażliwe pliki? Zaszyfruj swoje łącze z NordVPN (82% rabatu + 3 msc gratis).',
            badge: 'VPN SPONSOR',
            btnText: 'Odbierz zniżkę ➔',
            url: 'https://nordvpn.com', // Zmień na swój link partnerski (np. z CJ Affiliate / Impact)
            iconBg: 'linear-gradient(135deg, #0F91D2 0%, #0052CC 100%)'
        },
        pCloud: {
            title: 'Prywatna chmura dożywotnia (Lifetime Cloud)',
            desc: 'Przechowuj do 10 TB danych z bezpiecznym szyfrowaniem w Szwajcarii bez opłat abonamentowych.',
            badge: 'CLOUD STORAGE',
            btnText: 'Sprawdź Lifetime ➔',
            url: 'https://pcloud.com', // Zmień na swój link partnerski
            iconBg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
        },
        devHosting: {
            title: 'Szybki hosting chmurowy dla twórców',
            desc: 'Zbuduj własne aplikacje w chmurze – odbierz 200$ darmowego kredytu na start.',
            badge: 'HOSTING PROMO',
            btnText: 'Odbierz 200$ ➔',
            url: 'https://digitalocean.com',
            iconBg: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
        }
    }
};

/**
 * Renderuje baner partnerski w stylu Dark Glass
 */
function renderAffiliateBanner(affData, slotId) {
    if (!affData) return '';
    return `
        <div class="dropsite-ad-banner" data-slot="${slotId}">
            <div class="ad-top-meta">
                <span class="ad-tag-badge">${affData.badge}</span>
                <span class="ad-pro-link" onclick="if(window.openProModal) window.openProModal();">
                    ✦ <span data-i18n="ad_remove_with_pro">Wyłącz reklamy z Dropsite PRO</span>
                </span>
            </div>
            <div class="ad-banner-body">
                <div class="ad-icon-box" style="background: ${affData.iconBg}">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                </div>
                <div class="ad-info-text">
                    <h4 class="ad-banner-title">${affData.title}</h4>
                    <p class="ad-banner-desc">${affData.desc}</p>
                </div>
                <a href="${affData.url}" target="_blank" rel="noopener noreferrer nofollow" class="btn-ad-action">
                    ${affData.btnText}
                </a>
            </div>
        </div>
    `;
}

/**
 * Główna funkcja ładująca reklamy we wszystkich slotach
 */
window.initDropsiteAds = function() {
    // 1. Sprawdź, czy użytkownik ma aktywne PRO / Admin
    const isPro = document.body.classList.contains('is-pro') || 
                  document.body.classList.contains('is-admin') ||
                  (typeof isProActive === 'function' && isProActive());

    if (isPro) {
        document.querySelectorAll('.ad-container, .dropsite-ad-banner').forEach(el => {
            el.style.display = 'none';
        });
        return;
    }

    const cfg = window.ADS_CONFIG;

    // 2. Jeśli włączono Google AdSense
    if (cfg.mode === 'adsense' && cfg.googleAdSense && cfg.googleAdSense.enabled) {
        if (!document.getElementById('adsenseScript')) {
            const script = document.createElement('script');
            script.id = 'adsenseScript';
            script.async = true;
            script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${cfg.googleAdSense.client}`;
            script.crossOrigin = 'anonymous';
            document.head.appendChild(script);
        }

        const topContainer = document.getElementById('adContentTop');
        if (topContainer) {
            topContainer.innerHTML = `
                <ins class="adsbygoogle"
                     style="display:block"
                     data-ad-client="${cfg.googleAdSense.client}"
                     data-ad-slot="${cfg.googleAdSense.slotTop}"
                     data-ad-format="auto"
                     data-full-width-responsive="true"></ins>
            `;
            try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
        }

        const btmContainer = document.getElementById('adContentBottom');
        if (btmContainer) {
            btmContainer.innerHTML = `
                <ins class="adsbygoogle"
                     style="display:block"
                     data-ad-client="${cfg.googleAdSense.client}"
                     data-ad-slot="${cfg.googleAdSense.slotBottom}"
                     data-ad-format="auto"
                     data-full-width-responsive="true"></ins>
            `;
            try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
        }
        return;
    }

    // 3. Tryb Domyślny / Afiliacyjny: Renderuj luksusowe banery
    const topContainer = document.getElementById('adContentTop');
    if (topContainer) {
        topContainer.innerHTML = renderAffiliateBanner(cfg.affiliates.nordVpn, 'dl-top');
    }

    const btmContainer = document.getElementById('adContentBottom');
    if (btmContainer) {
        btmContainer.innerHTML = renderAffiliateBanner(cfg.affiliates.pCloud, 'dl-bottom');
    }

    // 4. Baner po wysłaniu pliku na ekranie sukcesu
    const successAdContainer = document.getElementById('successAdSlot');
    if (successAdContainer) {
        successAdContainer.innerHTML = renderAffiliateBanner(cfg.affiliates.devHosting, 'success-ad');
    }
};

// Automatyczna inicjalizacja po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(window.initDropsiteAds, 100);
});
