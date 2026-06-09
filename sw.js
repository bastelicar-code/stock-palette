const CACHE = 'stock-palette-v3';
const BASE = '/stock-palette';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([
      BASE + '/',
      BASE + '/index.html',
      BASE + '/manifest.json'
    ])).catch(() => caches.open(CACHE).then(c => c.add(BASE + '/index.html')))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Réseau prioritaire pour les services externes
  if (
    url.includes('firebasejs') ||
    url.includes('gstatic.com') ||
    url.includes('esm.sh') ||
    url.includes('googleapis.com') ||
    url.includes('openfoodfacts') ||
    url.includes('firebaseio.com') ||
    url.includes('firestore.googleapis')
  ) {
    e.respondWith(fetch(e.request).catch(() => new Response('', {status: 503})));
    return;
  }

  // Cache prioritaire pour les fichiers locaux
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        // Fallback vers index.html pour toute navigation
        if (e.request.mode === 'navigate') {
          return caches.match(BASE + '/index.html');
        }
        return new Response('', {status: 503});
      });
    })
  );
});
