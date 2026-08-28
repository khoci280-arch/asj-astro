/* ASJ Portal v2 — Service Worker (Aggressive Anti-Cache)
   Strategy:
   - Navigation: network-first (online = fresh, offline = cache fallback)
   - Static assets: stale-while-revalidate
   - API calls: never cache
   - skipWaiting() on install → new SW activates immediately
   - Delete ALL old caches on activate → no stale versions
   - Broadcast ASJ_FORCE_RELOAD → auto-refresh all tabs
*/

const VERSION = 'asj-astro-v1';
const SHELL = [
  '/',
  '/index.html',
  '/candidate/',
  '/admin/',
  '/public/',
];

// ─── INSTALL: Activate immediately + precache shell ───
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await Promise.all(SHELL.map((url) => cache.add(url).catch(() => {})));
    })(),
  );
});

// ─── ACTIVATE: Delete ALL old caches + claim all tabs ───
self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
      // Force reload all tabs
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((c) => c.postMessage({ type: 'ASJ_FORCE_RELOAD' }));
    })(),
  );
});

// ─── MESSAGE: Skip waiting from page ───
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// ─── FETCH: Network-first for navigation, stale-while-revalidate for assets ───
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Skip external origins (Supabase, CDN, etc.)
  if (url.origin !== self.location.origin) return;

  // Skip API calls
  if (url.pathname.startsWith('/.netlify/') || url.pathname.startsWith('/api/')) return;

  // Navigation: network-first
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(req.url, { cache: 'no-cache' })
        .then((res) => {
          if (res?.status === 200) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(() => caches.match(url.pathname).then((m) => m || caches.match('/index.html'))),
    );
    return;
  }

  // Static assets: stale-while-revalidate
  e.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          if (res?.status === 200) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || network;
    }),
  );
});
