/**
 * Dropsite PWA Service Worker (v2.5.0 Production Offline Engine)
 * Cache-First / Stale-While-Revalidate for zero-latency in-RAM tools.
 */

const CACHE_NAME = 'dropsite-studio-v3.0.0';

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './favicon.png?v=2',
    './dropsite-logo-8k.png',
    './blik.svg',
    // CSS Stylesheets
    './css/layout.css',
    './css/components.css',
    './css/widgets.css',
    './css/hero.css',
    './css/modals.css',
    './css/views.css',
    './css/custom.css',
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
    // JS Scripts & RAM Engines
    './app.js',
    './js/i18n.js',
    './js/pdf-lib.min.js',
    './js/pdf.min.js',
    './js/pdf.worker.min.js',
    './js/fflate.min.js',
    './js/qrious.min.js',
    './js/toolbox.js',
    './js/ram-engine.js',
    './js/beam.js',
    './js/concierge.js',
    './js/omni-dropzone.js',
    './js/pdf-matrix.js',
    './js/watermark-studio.js',
    './js/rodo-guard.js',
    './js/drop-request.js',
    './js/audio-waveform.js',
    './js/code-viewer.js',
    './js/dead-drop.js',
    './js/qr-studio.js',
    './js/video-compress.js',
    './js/media-grabber.js',
    './js/command-palette.js',
    './js/radial-wheel.js'
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
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                    });
                }
                return networkResponse;
            }).catch(() => null);

            return cachedResponse || fetchPromise;
        })
    );
});
