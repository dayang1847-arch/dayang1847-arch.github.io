const CACHE_PREFIX = `vietnamese-learning-${encodeURIComponent(self.registration.scope)}-`;
const CACHE = `${CACHE_PREFIX}v10`;
const CORE = [
  './', './index.html', './styles.css?v=10', './app.js?v=10', './course.js',
  './speech.js', './audio-data.js', './audio/manifest.json', './audio/SOURCES.md',
  './vocabulary.js', './language-logic.js', './assets/cover-v2.jpg', './explanations.js', './pronunciation.js',
  './ipa-data.js', './word-history.js', './spelling-rules.js',
  './engine.js', './manifest.webmanifest',
  './audio/tones-v1.m4a',
  './audio/course-01-v1.m4a',
  './audio/course-02-v1.m4a',
  './audio/course-03-v1.m4a',
  './audio/course-04-v1.m4a',
  './audio/course-05-v1.m4a',
  './audio/course-06-v1.m4a',
  './audio/course-07-v1.m4a',
  './audio/course-08-v1.m4a',
  './audio/course-09-v1.m4a',
  './audio/course-10-v1.m4a',
  './audio/course-11-v1.m4a',
  './audio/course-12-v1.m4a',
  './audio/course-13-v1.m4a',
  './audio/course-14-v1.m4a',
  './audio/words-01-v1.m4a',
  './audio/words-02-v1.m4a',
  './audio/words-03-v1.m4a',
  './audio/words-04-v1.m4a',
  './audio/words-05-v1.m4a',
  './audio/words-06-v1.m4a',
  './audio/words-07-v1.m4a',
  './audio/words-08-v1.m4a',
  './audio/examples-v1.m4a',
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
