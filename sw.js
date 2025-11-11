const CACHE_NAME = 'profittracker-v2.5.3-secure';

// 🔒 PRODUCTION MODE TOGGLE - Set to false for production deployment
const IS_DEVELOPMENT = true; // Change to false for production

// 🛡️ Secure Console Logging
const secureLog = {
  log: (...args) => IS_DEVELOPMENT && console.log('[SW]', ...args),
  warn: (...args) => IS_DEVELOPMENT && console.warn('[SW]', ...args),
  error: (...args) => console.error('[SW]', ...args), // Always log errors
  info: (...args) => IS_DEVELOPMENT && console.info('[SW]', ...args)
};

// Security: Validate origin for all requests
const ALLOWED_ORIGINS = [
  self.location.origin,
  'https://www.gstatic.com',
  'https://cdn.jsdelivr.net',
  'https://firebaseapp.com',
  'https://firestore.googleapis.com',
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com'
];

// 🔒 Restricted Files - Block access to sensitive file
const RESTRICTED_FILES = [
  '/CCC_Travel_Sheet.xlsx',
  '/.htaccess',
  '/nginx.conf',
  '/SECURITY_REPORT.md',
  '/.env',
  '/.git',
  '/package.json',
  '/package-lock.json',
  '/config/.env',
  '/config/firebase-admin.json',
  '/config/secrets.js'
];

// Make cache name available globally
self.CACHE_NAME = CACHE_NAME;
if (typeof window !== 'undefined') {
  window.CACHE_NAME = CACHE_NAME;
  window.IS_DEVELOPMENT = IS_DEVELOPMENT;
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
        secureLog.log('Opened cache:', CACHE_NAME);
        return Promise.all(
          ASSETS.map((asset) => {
            return cache.add(asset).catch(err => {
              secureLog.error(`Failed to cache ${asset}:`, err);
            });
          })
        );
      })
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // 🔒 Security: Block access to restricted files
  const pathname = requestUrl.pathname;
  if (RESTRICTED_FILES.some(file => pathname.endsWith(file) || pathname.includes(file))) {
    secureLog.warn('Blocked access to restricted file:', pathname);
    event.respondWith(new Response('Access Denied', {
      status: 403,
      statusText: 'Forbidden'
    }));
    return;
  }

  // 🔒 Security: Validate request origin
  const isAllowedOrigin = ALLOWED_ORIGINS.some(origin =>
    requestUrl.origin === origin || requestUrl.origin === new URL(origin).origin
  );

  if (!isAllowedOrigin && !requestUrl.origin.includes(self.location.hostname)) {
    secureLog.warn('Blocked request to unauthorized origin:', requestUrl.origin);
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        secureLog.log('Fetching:', event.request.url);
        return response || fetch(event.request).catch(err => {
          secureLog.error('Fetch failed:', err);
          throw err;
        });
      })
  );
}); self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            secureLog.log('Deleting old cache:', cache);
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

  // Handle cache clearing request
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            secureLog.log('Clearing cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        secureLog.log('✅ All service worker caches cleared');
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({
            type: 'CACHE_CLEARED',
            success: true
          });
        }
      }).catch((error) => {
        secureLog.error('❌ Error clearing caches:', error);
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({
            type: 'CACHE_CLEARED',
            success: false,
            error: error.message
          });
        }
      })
    );
  }

  // 🔧 Development Mode Toggle (only in development)
  if (event.data.type === 'TOGGLE_DEV_MODE' && IS_DEVELOPMENT) {
    secureLog.info('Development mode toggle requested (dev only)');
    // This could be extended to dynamically change logging levels
  }
});