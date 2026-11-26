// Family Alert service worker: saves the app on the device so it opens with no signal.
// Bump CACHE when you want every device to drop the old copy.
const CACHE = 'family-alert-v8';
const ASSETS = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Open instantly from the saved copy, and refresh it quietly in the background
// when a connection exists. Updates appear the next time the app is opened.
async function handle(event) {
  const req = event.request;
  const cache = await caches.open(CACHE);
  const isPage = req.mode === 'navigate';
  const cached = (await cache.match(req, { ignoreSearch: true })) ||
                 (isPage ? await cache.match('./index.html') : undefined);

  const refresh = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(isPage ? './index.html' : req, res.clone());
      return res;
    })
    .catch(() => cached);

  if (cached) {
    event.waitUntil(refresh.catch(() => {}));
    return cached;
  }
  return refresh;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(handle(event));
});
