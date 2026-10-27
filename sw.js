const CACHE = 'rhine-design-test-v209';
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
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// HTML (navigations + любой *.html, не только index.html) — сеть в приоритете,
// кэш только как запасной вариант офлайн. Остальные файлы — как раньше,
// кэш в приоритете.
// Раньше тут проверялся только "index.html"/"/", поэтому walks.html,
// partner-map.html и т.п. уходили в cache-first — если первая загрузка на
// мобильной сети прервалась и в кэш попал битый/пустой ответ, страница потом
// висела чёрным экраном даже после "жёсткой" перезагрузки (Service Worker
// не сбрасывается обычным reload).
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
        .catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
