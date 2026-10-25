// ZooQuest offline cache: app shell + park data always; map tiles the
// family has already looked at are kept for the visit (weak signal in
// houses and under trees). No bulk tile pre-download – that would break
// the OpenStreetMap tile usage policy (ChatGPT's round-2 correction).
const SHELL = 'zq-shell-v1'
const TILES = 'zq-tiles-v1'
const MAX_TILES = 600

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['./', './index.html'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => ![SHELL, TILES].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET') return

  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    e.respondWith(
      caches.open(TILES).then(async (c) => {
        const hit = await c.match(e.request)
        if (hit) return hit
        try {
          const res = await fetch(e.request)
          if (res.ok) {
            c.put(e.request, res.clone())
            c.keys().then((k) => k.length > MAX_TILES && c.delete(k[0]))
          }
          return res
        } catch {
          return new Response('', { status: 504 })
        }
      }),
    )
    return
  }

  if (url.origin === self.location.origin) {
    // network first, cache fallback – fresh programmes when online, still works offline
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) caches.open(SHELL).then((c) => c.put(e.request, res.clone()))
          return res
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))),
    )
  }
})
