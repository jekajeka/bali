/* Bali Checklist PWA Service Worker */
/* global self */

const CACHE_VERSION = 'bali-checklist-v1';
const PRECACHE_URLS = [
  './',
  './bali-trip-checklist.html',
  './manifest.webmanifest',
  './service-worker.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function isSameOrigin(requestUrl) {
  try {
    const url = new URL(requestUrl);
    return url.origin === self.location.origin;
  } catch {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Navigation: serve cached HTML if available, fall back to network.
  const isNav =
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');

  if (isNav) {
    event.respondWith(
      caches.match('./bali-trip-checklist.html').then((cached) => {
        const network = fetch(request)
          .then((resp) => {
            const copy = resp.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
            return resp;
          })
          .catch(() => cached);

        return cached || network;
      })
    );
    return;
  }

  // Same-origin assets: cache-first.
  if (isSameOrigin(request.url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return resp;
        });
      })
    );
    return;
  }

  // Cross-origin (e.g. Google Fonts): stale-while-revalidate best effort.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return resp;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

