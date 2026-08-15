import { sendWebPush } from '~/server/utils/webpush'

async function getSecret(raw: any): Promise<string | null> {
  if (!raw) return null
  return typeof raw === 'string' ? raw : raw.get()
}

// Runs every 2 minutes via Cloudflare Cron Trigger
// Sends push notifications to players who have pending dispatch events and have been away > 60s
export default defineTask({
  meta: {
    name: 'push:check',
    description: 'Send push notifications for pending mid-day dispatch events',
  },
  async run({ payload, context }) {
    const cf = (context as any).cloudflare
    const kv = cf?.env?.FREIGHT_STATE
    const vapidPublicKey = await getSecret(cf?.env?.VAPID_PUBLIC_KEY)
    const vapidPrivateKey = await getSecret(cf?.env?.VAPID_PRIVATE_KEY)

    if (!kv || !vapidPublicKey || !vapidPrivateKey) {
      return { result: 'Missing env bindings' }
    }

    const listed = await kv.list({ prefix: 'fe:', limit: 100 })
    const eventKeys = listed.keys.filter((k: { name: string }) => k.name.endsWith(':event'))

    let sent = 0

    for (const { name } of eventKeys) {
      const playerId = name.replace(/^fe:/, '').replace(/:event$/, '')

      const lastSeen = await kv.get(`fe:${playerId}:seen`)
      if (Date.now() - Number(lastSeen ?? 0) < 60_000) continue

      const subRaw = await kv.get(`fe:${playerId}:push`)
      if (!subRaw) continue

      const eventRaw = await kv.get(name)
      if (!eventRaw) continue

      const ev = JSON.parse(eventRaw) as { title?: string; body?: string; eventId?: string }
      const { ok } = await sendWebPush(
        JSON.parse(subRaw),
        {
          title: ev.title ?? 'Pickup Request',
          body: ev.body ?? 'A customer is waiting — can you squeeze in a pickup?',
          tag: 'dispatch-event',
          eventId: ev.eventId,
        },
        vapidPublicKey,
        vapidPrivateKey
      )

      if (ok) {
        await kv.delete(name)
        sent++
      }
    }

    return { result: `Sent ${sent} push notification${sent !== 1 ? 's' : ''}` }
  },
})
