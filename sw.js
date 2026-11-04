/* Gaji Rotasi — service worker (offline cache) */
const CACHE = 'gaji-rotasi-v1.4.3';
const ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k.indexOf('gaji-rotasi-') === 0 && k !== CACHE; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

// Stale-while-revalidate: tampil langsung dari cache (cepat & bisa offline),
// lalu diam-diam ambil versi terbaru untuk pembukaan berikutnya.
self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const network = fetch(req).then(function (res) {
    if (res && res.ok && res.type === 'basic') {
      const copy = res.clone();
      return caches.open(CACHE).then(function (cache) { return cache.put(req, copy); }).then(function () { return res; });
    }
    return res;
  }).catch(function () { return null; });
  event.waitUntil(network.then(function () { return undefined; }));

  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        if (req.mode === 'navigate') {
          return cache.match('./index.html').then(function (shell) {
            if (shell) return shell;
            return network.then(function (res) { return res || offlineResponse(); });
          });
        }
        return network.then(function (res) { return res || offlineResponse(); });
      });
    })
  );
});

function offlineResponse() {
  return new Response('Offline — buka aplikasi sekali saat online supaya tersimpan untuk dipakai offline.', {
    status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}
