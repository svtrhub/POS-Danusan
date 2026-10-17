// Danusan POS Service Worker (Network-First for instant updates)
const CACHE_NAME = 'danusan-pos-v3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './favicon.png',
  './apple-touch-icon.png',
  './pwa-192x192.png',
  './pwa-512x512.png',
  './pwa-maskable-512x512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('SW pre-cache note:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  self.skipWaiting();
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

  // Never intercept Google Apps Script or non-GET requests
  if (url.hostname.includes('google') || event.request.method !== 'GET') {
    return;
  }

  // Network-First strategy: Always fetch freshest version from server.
  // Fall back to cache only when network fails / offline.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html').then((indexFallback) => {
              return indexFallback || caches.match('/index.html');
            });
          }
        });
      })
  );
});
