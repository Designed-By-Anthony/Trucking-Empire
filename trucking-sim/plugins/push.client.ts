// Provides $pushSubscribe() — call after user interaction (e.g. first dispatch)
// to request notification permission and register with the server.

export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return

  const subscribe = async (): Promise<boolean> => {
    try {
      // Request permission only on explicit user gesture
      if (Notification.permission === 'denied') return false
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return false

      // Get VAPID public key from server
      const { publicKey } = await $fetch<{ publicKey: string | null }>('/api/push/public-key')
      if (!publicKey) return false

      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
      }

      const playerId = localStorage.getItem('fe:pid')
      if (!playerId) return false

      await $fetch('/api/push/subscribe', {
        method: 'POST',
        body: { playerId, subscription: sub.toJSON() },
      })

      // Track last-seen on visibility change so the cron knows when player left
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          // Fire-and-forget — best effort
          navigator.sendBeacon(
            `/api/state?ping=1&id=${encodeURIComponent(playerId)}`,
            JSON.stringify({ seen: Date.now() })
          )
        }
      })

      return true
    } catch {
      return false
    }
  }

  // Silently attempt to restore an existing subscription (no permission prompt)
  const restore = async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return

      const { publicKey } = await $fetch<{ publicKey: string | null }>('/api/push/public-key')
      if (!publicKey) return

      const playerId = localStorage.getItem('fe:pid')
      if (!playerId) return

      await $fetch('/api/push/subscribe', {
        method: 'POST',
        body: { playerId, subscription: sub.toJSON() },
      })
    } catch { /* ignore */ }
  }

  // Restore on every page load (re-registers in case Worker redeployed)
  restore()

  return {
    provide: {
      pushSubscribe: subscribe,
    },
  }
})

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from({ length: raw.length }, (_, i) => raw.charCodeAt(i))
}
