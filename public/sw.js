const CACHE_NAME = 'harmony-memory-v1'
const STATIC_ASSETS = ['/', '/home', '/record', '/feed', '/profile', '/manifest.json']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  // Don't cache Supabase API or audio
  if (url.hostname.includes('supabase')) return
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})
