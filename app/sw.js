// Service Worker for offline support
const CACHE_NAME = 'noises-v10';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/components.css',
  './css/animations.css',
  './js/app.js',
  './js/audio/engine.js',
  './js/audio/binaural.js',
  './js/audio/noise.js',
  './js/audio/foley.js',
  './js/audio/musical.js',
  './js/ui/controls.js',
  './js/ui/mixer.js',
  './js/ui/presets.js',
  './js/ui/timer.js',
  './js/ui/orb.js',
  './js/utils/storage.js',
  './js/utils/wake-lock.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
