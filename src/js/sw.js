// Service Worker (Offline-first PWA)
const CACHE_NAME = 'profit-tracker-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/src/css/reset.css',
  '/src/css/base.css',
  '/src/css/components/buttons.css',
  '/src/js/db.js',
  '/src/js/app.js',
  '/src/manifest.json'
];

// Install: Cache critical assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .catch(err => console.log("Cache failed:", err))
  );
});

// Fetch: Serve from cache first
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request))
  );
});
