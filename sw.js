// Service worker: lets the installed app open with no internet.
// App files: network first, saved copy when offline. Photos never change, so once seen they come from the saved copy.
// Bump CACHE on each release.
const CACHE = 'specialist-study-v8';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'lib.js', 'course.js', 'practice.js', 'formulas.js', 'unlock.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'vendor/katex/katex.min.js', 'vendor/katex/katex.min.css', 'vendor/katex/auto-render.min.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('specialist-study-') && k !== CACHE && k !== 'specialist-study-photos').map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/')) return;
  if (url.pathname.includes('/photo/') || url.pathname.includes('/course/')) {
    e.respondWith(caches.open('specialist-study-photos').then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'))));
});
