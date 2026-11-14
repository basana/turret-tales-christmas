const CACHE = 'rhine-design-test-v306';
const APP_CACHE_PREFIX = 'rhine-design-test-';
const ASSETS = ['./index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(APP_CACHE_PREFIX) && key !== CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// HTML: network first, own app cache as fallback.
// Other resources: own app cache first, then network.
// Always use this app's cache explicitly: Cache Storage is shared by origin.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  let isHtmlPath = false;
  try { isHtmlPath = new URL(req.url).pathname.endsWith('.html'); } catch (e) {}
  const isHtml = req.mode === 'navigate' || isHtmlPath || req.url.endsWith('/');

  if (isHtml) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((fresh) => {
          if (fresh && fresh.ok) {
            caches.open(CACHE).then((cache) => cache.put(req, fresh.clone()));
          }
          return fresh;
        })
        .catch(() => caches.open(CACHE).then((cache) => cache.match(req)))
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((cached) => cached || fetch(req))
    )
  );
});
