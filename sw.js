/**
 * Dropsite PWA Service Worker (v3.3.3 Production Engine)
 * Cache-First / Stale-While-Revalidate with auto-invalidation.
 */

const CACHE_NAME = 'dropsite-studio-v3.4.2';

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
    // JS Scripts & RAM Engines
    './app.js',
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
    './js/cloud-bridge.js'
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

    // Nie cache'uj zapytań API, uploadu chunks, zewnętrznych reklam i CDN r2.dev
    if (
        event.request.method !== 'GET' ||
        url.hostname.includes('r2.dev') ||
        url.hostname.includes('google') ||
        url.hostname.includes('googlesyndication') ||
        url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/upload')
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
