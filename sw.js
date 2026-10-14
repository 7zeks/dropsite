/**
 * Dropsite PWA Service Worker (v3.3.3 Production Engine)
 * Cache-First / Stale-While-Revalidate with auto-invalidation.
 */

const CACHE_NAME = 'dropsite-studio-v3.5.1';

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './favicon.png?v=4',
    './dropsite-logo.png?v=4',
    './blik.svg',
    // CSS Stylesheets (Wszystkie istniejące arkusze produkcyjne)
    './css/vars.css',
    './css/layout.css',
    './css/upload.css',
    './css/success.css',
    './css/widgets.css',
    './css/motion.css',
    './css/motion-premium.css',
    './css/my-files.css',
    './css/telemetry.css',
    './css/bento-showcase.css',
    './css/concierge.css',
    './css/omni-dropzone.css',
    './css/pdf-matrix.css',
    './css/watermark-studio.css',
    './css/rodo-guard.css',
    './css/drop-request.css',
    './css/audio-waveform.css',
    './css/code-viewer.css',
    './css/dead-drop.css',
    './css/qr-studio.css',
    './css/video-compress.css',
    './css/media-grabber.css',
    './css/command-palette.css',
    './css/radial-wheel.css',
    './css/pdf-studio-luxury.css',
    './css/cloud-bridge.css',
    './css/xray-studio.css',
    './css/stego-studio.css',
    './css/diff-studio.css',
    './css/ocr-studio.css',
    './css/audio-masker.css',
    './css/hash-studio.css',
    // JS Scripts & RAM Engines
    './app.js',
    './js/motion-engine.js',
    './js/motion-premium.js',
    './js/i18n.js',
    './js/fflate.min.js',
    './js/qrious.min.js',
    './js/ram-engine.js',
    './js/beam.js',
    './js/ads-engine.js',
    './js/telemetry.js',
    './js/concierge.js',
    './js/omni-dropzone.js',
    './js/drop-request.js',
    './js/audio-waveform.js',
    './js/code-viewer.js',
    './js/dead-drop.js',
    './js/qr-studio.js',
    './js/video-compress.js',
    './js/media-grabber.js',
    './js/command-palette.js',
    './js/radial-wheel.js',
    './js/cloud-bridge.js',
    './js/toolbox.js',
    './js/account-vault.js',
    './js/xray-studio.js',
    './js/stego-studio.js',
    './js/diff-studio.js',
    './js/ocr-studio.js',
    './js/audio-masker.js',
    './js/hash-studio.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 0. Na localhost i 127.0.0.1 ZAWSZE pomijaj cache (natychmiastowy live-reload deweloperski!)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return;
    }

    // Nie cache'uj zapytań API, uploadu chunks, zewnętrznych reklam i CDN r2.dev oraz Cloudflare Workers
    if (
        event.request.method !== 'GET' ||
        url.hostname.includes('r2.dev') ||
        url.hostname.includes('workers.dev') ||
        url.hostname.includes('google') ||
        url.hostname.includes('googlesyndication') ||
        url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/upload') ||
        url.pathname.startsWith('/multipart') ||
        url.pathname.startsWith('/verify-pro') ||
        url.pathname.startsWith('/download-metadata') ||
        url.pathname.startsWith('/server-status')
    ) {
        return;
    }

    // 1. DLA GŁÓWNYCH DOKUMENTÓW HTML: Network-First (zawsze bierz najnowszą wersję, z fallbackiem do cache offline)
    if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('index.html')) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
                    }
                    return networkResponse;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // 2. DLA ASSETÓW STATYCZNYCH: Stale-While-Revalidate
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => null);

            return cachedResponse || fetchPromise;
        })
    );
});
