const CACHE_NAME = 'offline-qr-survey-v2';
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/s/offline',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (e.g. POST submissions handled by IndexedDB queue)
  if (request.method !== 'GET') {
    return;
  }

  // Handle API survey schema requests: NetworkFirst falling back to cache
  if (url.pathname.startsWith('/api/surveys/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Handle static assets (_next/static, fonts, icons): CacheFirst
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(png|jpg|jpeg|svg|css|js|ico)$/)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Handle navigation requests (pages like /s/[id], /s/offline, /admin)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const directMatch = await caches.match(request);
          if (directMatch) return directMatch;

          // For any survey URL (/s/*), serve the precached /s/offline shell or survey shell
          if (url.pathname.startsWith('/s/')) {
            const cache = await caches.open(CACHE_NAME);
            
            // 1. Dedicated universal offline survey shell
            const offlineShell = await cache.match('/s/offline');
            if (offlineShell) return offlineShell;

            // 2. Any previously cached survey route shell
            const keys = await cache.keys();
            const surveyShellKey = keys.find((k) => new URL(k.url).pathname.startsWith('/s/'));
            if (surveyShellKey) {
              const shell = await cache.match(surveyShellKey);
              if (shell) return shell;
            }

            // 3. Fallback: lightweight redirect to /s/offline so it never leaks home/admin data
            return new Response(
              `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Opening Survey...</title><script>window.location.replace('/s/offline' + window.location.search);</script></head><body style="font-family:sans-serif;text-align:center;padding:40px;"><h2>Loading Offline Survey...</h2><p>Please wait a moment while we load your survey.</p></body></html>`,
              { headers: { 'Content-Type': 'text/html' } }
            );
          }

          // For other non-survey pages, fall back to home or offline status
          return (await caches.match('/')) || new Response('Offline', { status: 503 });
        })
    );
    return;
  }
});
