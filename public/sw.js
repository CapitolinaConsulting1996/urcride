const CACHE = 'urcride-v1'

const PRECACHE = [
  '/',
  '/dashboard',
  '/events',
  '/rides',
  '/icons/icon.svg',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Ignora richieste non-GET e chiamate a Supabase/API esterne
  if (request.method !== 'GET') return
  if (url.hostname.includes('supabase') || url.pathname.startsWith('/api/')) return

  event.respondWith(
    caches.match(request).then(cached => {
      const fromNetwork = fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(request, clone))
        }
        return response
      }).catch(() => cached)

      // Mostra subito dalla cache, aggiorna in background
      return cached || fromNetwork
    })
  )
})
