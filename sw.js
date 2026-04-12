/* ============================================
   MathBattle PRO — Service Worker (v1)
   ============================================ */

const CACHE_NAME = 'mathbattle-v1';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/config.js',
  './js/ui.js',
  './js/sounds.js',
  './js/effects.js',
  './js/api.js',
  './js/auth.js',
  './js/practice.js',
  './js/quiz.js',
  './js/leaderboard.js',
  './js/app.js'
];

// Install: Cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Fetch: Network first, then cache (for simulation/offline support)
self.addEventListener('fetch', event => {
  // Simple strategy: try network, fallback to cache
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});
