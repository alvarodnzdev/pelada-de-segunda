// Guarda o app no aparelho para abrir sem internet.
// Com internet, busca sempre a versão nova; sem sinal (ou sinal lento), usa a guardada.
const CACHE = 'pelada-v8';
const SHELL = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // versões fixas (Firebase e fontes): podem vir sempre do aparelho
  if (/^https:\/\/(www\.gstatic\.com\/firebasejs\/|fonts\.googleapis\.com\/|fonts\.gstatic\.com\/)/.test(req.url)) {
    e.respondWith(caches.open(CACHE).then(async c =>
      (await c.match(req)) || fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; })));
    return;
  }
  if (new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await cache.match('./') : undefined);
    const fresh = fetch(req).then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    });
    if (!cached) return fresh;
    fresh.catch(() => {});
    const slow = new Promise(r => setTimeout(() => r(cached), 3000));
    return Promise.race([fresh.catch(() => cached), slow]);
  })());
});
