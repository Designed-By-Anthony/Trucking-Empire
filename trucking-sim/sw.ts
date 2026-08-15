import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare let self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()

// @ts-expect-error __WB_MANIFEST is injected by VitePWA at build time
precacheAndRoute(self.__WB_MANIFEST)

// Cache OSM tiles aggressively — same as before
registerRoute(
  ({ url }) => url.hostname.match(/\.tile\.openstreetmap\.org$/),
  new CacheFirst({
    cacheName: 'osm-tiles',
    plugins: [new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
)

// Push notification: payload has { title, body, tag?, eventId? }
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Trucking Empire', {
      body: data.body ?? 'A dispatch event needs your attention.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag ?? 'dispatch-event',
      requireInteraction: true,
      data: { url: '/', eventId: data.eventId },
    } as NotificationOptions)
  )
})

// Notification click → focus existing tab or open new one
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url: string = event.notification.data?.url ?? '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ('focus' in client) return (client as WindowClient).focus()
        }
        return self.clients.openWindow(url)
      })
  )
})
