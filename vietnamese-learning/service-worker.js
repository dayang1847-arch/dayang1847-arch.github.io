const CACHE_PREFIX = `vietnamese-learning-${encodeURIComponent(self.registration.scope)}-`;
const CACHE = `${CACHE_PREFIX}v9`;
const CORE = [
  './', './index.html', './styles.css', './app.js', './course.js',
  './vocabulary.js', './language-logic.js', './assets/cover-v2.jpg', './explanations.js', './pronunciation.js',
  './ipa-data.js', './word-history.js', './spelling-rules.js',
  './engine.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.open(CACHE).then(cache => cache.match('./index.html'))));
    return;
  }
  event.respondWith(caches.open(CACHE).then(cache => cache.match(request).then(cached => cached || fetch(request))));
});
