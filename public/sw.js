// Danusan POS Service Worker v5 (Low-Speed Network Optimized + Cross-OS PWA)
const CACHE_NAME = 'danusan-pos-v5';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './favicon.png',
  './apple-touch-icon.png',
  './pwa-192x192.png',
  './pwa-512x512.png',
  './pwa-maskable-512x512.png',
  './qris-default.webp',
  './qris-default.png'
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

  // 1. Never intercept external API calls (e.g. Google Apps Script / Drive) or non-GET requests
  if (url.hostname.includes('google') || url.hostname.includes('googleapis') || event.request.method !== 'GET') {
    return;
  }

  // 2. Navigation Requests (index.html / root): Network with fast 1.8s timeout fallback to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      new Promise((resolve) => {
        let isResolved = false;

        const timeoutId = setTimeout(() => {
          if (!isResolved) {
            caches.match('./index.html').then((cached) => {
              if (cached) {
                isResolved = true;
                resolve(cached);
              }
            });
          }
        }, 1800);

        fetch(event.request)
          .then((networkResponse) => {
            clearTimeout(timeoutId);
            if (!isResolved) {
              isResolved = true;
              if (networkResponse && networkResponse.status === 200) {
                const clone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
              }
              resolve(networkResponse);
            }
          })
          .catch(() => {
            clearTimeout(timeoutId);
            if (!isResolved) {
              isResolved = true;
              caches.match('./index.html').then((cached) => {
                resolve(cached || caches.match('/index.html'));
              });
            }
          });
      })
    );
    return;
  }

  // 3. Static & Hashed Assets (JS, CSS, Images, Icons, WebP): Cache-First with background revalidation
  const isStaticAsset =
    url.pathname.includes('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webmanifest');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Serve immediately from cache, update in background if online
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        // Not in cache yet: fetch and cache
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 4. Default: Network with Cache fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
