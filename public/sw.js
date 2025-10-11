const CACHE_NAME = 'bill-splitter-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  // Add build artifacts - these paths may vary based on your build output
  '/assets/index.css',
  '/assets/index.js',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, response.clone());
      } catch (_) {
        // Cache update failed (quota, storage, etc.) – proceed with network response
      }
      return response;
    } catch (err) {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      return new Response(null, { status: 504, statusText: 'Gateway Timeout' });
    }
  })());
});
