const CACHE_NAME = 'samathi-clock-v1.3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './apple-touch-icon.png',
  './bell-v2.mp3',
  './bounce-v2.mp3',
  './walk-start.mp3',
  './walk-end.mp3',
  './sit-start.mp3',
  './sit-end.mp3',
  './js/NoSleep.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => {
        console.error('Failed to cache static assets during install', err);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Notify all open tabs that a new version is active
      return self.clients.matchAll();
    }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
      });
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests and google analytics
  if (event.request.method !== 'GET' || event.request.url.includes('google-analytics') || event.request.url.includes('googletagmanager')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit
        if (response) {
          return response;
        }

        // Cache miss: fetch from network and dynamically cache
        return fetch(event.request).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // Don't cache SDKs if they are meant to be dynamic, but since it's an offline app, capturing everything is fine.
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(() => {
          // If network fails and it's navigation, return index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
