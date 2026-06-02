const CACHE = 'omar-daf-v2';

const FILES = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/pages/accueil.html',
  '/pages/devises.html',
  '/pages/carats.html',
  '/pages/alertes.html',
  '/pages/actus.html',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});