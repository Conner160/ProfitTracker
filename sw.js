const CACHE_NAME = 'profittracker-v1.3.4';

// Make cache name available globally
self.CACHE_NAME = CACHE_NAME;
if (typeof window !== 'undefined') {
  window.CACHE_NAME = CACHE_NAME;
}

// Assets to cache for offline functionality - currently disabled for performance
// TODO: Add assets here when implementing full offline capabilities
const ASSETS = [
  // './',
  // './manifest.json',
  // './scripts/app.js',
  // './scripts/db.js',
  // './styles/base.css',
  // './styles/forms.css',
  // './styles/entries.css',
  // './styles/locations.css',
  // './styles/controls.css',
  // './styles/maps.css',
  // './styles/utilities.css',
  // './images/icon-192x192.png',
  // './images/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache:', CACHE_NAME);
        return Promise.all(
          ASSETS.map((asset) => {
            return cache.add(asset).catch(err => {
              console.log(`Failed to cache ${asset}:`, err);
            });
          })
        );
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        console.log('Fetching:', event.request.url);
        return response || fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Handle messages from main thread (e.g., requesting cache name)
self.addEventListener('message', (event) => {
  if (event.data.type === 'GET_CACHE_NAME') {
    event.ports[0].postMessage({
      type: 'CACHE_NAME_RESPONSE',
      cacheName: CACHE_NAME
    });
  }
});
