// Service Worker for RentArc PWA Notification support
const CACHE_NAME = 'rentarc-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Use a Network-First strategy for page navigation (HTML) requests
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          // Update the cache with the fresh response
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          // Offline fallback
          return caches.match(e.request);
        })
    );
    return;
  }

  // Cache-First strategy for static assets
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    }).catch(() => {
      return fetch(e.request);
    })
  );
});

// Listener for custom system notification click
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
