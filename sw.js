// When you update the app, increment CACHE_NAME (e.g. 1.0 → 1.1 → 1.2)
// so players get the latest version on next load.
// Add any new assets to the ASSETS array.
// Paths are relative (not rooted at '/') so this works whether the app is
// hosted at a domain root or under a GitHub Pages project subpath.

const CACHE_NAME = 'round-log-1.1';

const ASSETS = [
  'round-log.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// Install — cache all assets, bypassing HTTP cache to always get fresh files
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS.map(url => new Request(url, {cache:'no-store'}))))
      .then(() => self.skipWaiting())
  );
});

// Activate — delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — serve only from the current version's cache to prevent stale files after update
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  // Never cache sw.js itself — the in-app update check fetches this fresh to
  // compare against the running version, and a cached copy would permanently
  // mask real updates from that check.
  if(new URL(e.request.url).pathname.endsWith('/sw.js')){
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(
    caches.open(CACHE_NAME).then(cache => cache.match(e.request)).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(response => {
        if(response && response.status === 200 && response.type === 'basic'){
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        if(e.request.mode === 'navigate'){
          return caches.open(CACHE_NAME).then(cache => cache.match('round-log.html'));
        }
      });
    })
  );
});
