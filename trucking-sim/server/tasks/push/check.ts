import { sendWebPush } from '~/server/utils/webpush'

async function getSecret(raw: any): Promise<string | null> {
  if (!raw) return null
  return typeof raw === 'string' ? raw : raw.get()
}

// Runs every 2 minutes via Cloudflare Cron Trigger.
// Queries D1 for pending_notifications that have fired and players who've been away > 60s.
export default defineTask({
  meta: {
    name: 'push:check',
    description: 'Send push notifications for pending game events',
  },
  async run({ payload, context }) {
    const cf = (context as any).cloudflare
    const db = cf?.env?.FREIGHT_DB as D1Database | undefined
    const kv = cf?.env?.FREIGHT_STATE as KVNamespace | undefined
    const vapidPublicKey = await getSecret(cf?.env?.VAPID_PUBLIC_KEY)
    const vapidPrivateKey = await getSecret(cf?.env?.VAPID_PRIVATE_KEY)

    if (!vapidPublicKey || !vapidPrivateKey) return { result: 'Missing VAPID keys' }

    const now = Date.now()
    const awayThreshold = now - 60_000

    // ── D1 path: precise SQL query, no scanning ───────────────────────────────
    if (db) {
      const { results } = await db.prepare(
        `SELECT n.id, n.player_id, n.title, n.body, n.event_id,
                ps.push_subscription_json
         FROM pending_notifications n
         JOIN player_state ps ON ps.id = n.player_id
         WHERE n.fires_at <= ?
           AND n.sent_at IS NULL
           AND ps.push_subscription_json IS NOT NULL
           AND ps.last_seen_at < ?
         LIMIT 50`
      ).bind(now, awayThreshold).all<{
        id: number
        player_id: string
        title: string
        body: string
        event_id: string | null
        push_subscription_json: string
      }>()

      let sent = 0
      for (const row of results) {
        const { ok } = await sendWebPush(
          JSON.parse(row.push_subscription_json),
          { title: row.title, body: row.body, tag: 'game-event', eventId: row.event_id ?? undefined },
          vapidPublicKey,
          vapidPrivateKey,
        )
        if (ok) {
          await db.prepare('UPDATE pending_notifications SET sent_at = ? WHERE id = ?')
            .bind(now, row.id).run()
          sent++
        }
      }
      return { result: `D1: sent ${sent} notification${sent !== 1 ? 's' : ''}` }
    }

    // ── KV fallback (legacy, no D1 yet) ──────────────────────────────────────
    if (!kv) return { result: 'No storage bindings' }

    const listed = await kv.list({ prefix: 'fe:', limit: 100 })
    const eventKeys = listed.keys.filter((k: { name: string }) => k.name.endsWith(':event'))
    let sent = 0

    for (const { name } of eventKeys) {
      const playerId = name.replace(/^fe:/, '').replace(/:event$/, '')
      const lastSeen = await kv.get(`fe:${playerId}:seen`)
      if (now - Number(lastSeen ?? 0) < 60_000) continue

      const subRaw = await kv.get(`fe:${playerId}:push`)
      if (!subRaw) continue

      const eventRaw = await kv.get(name)
      if (!eventRaw) continue

      const ev = JSON.parse(eventRaw) as { title?: string; body?: string; eventId?: string }
      const { ok } = await sendWebPush(
        JSON.parse(subRaw),
        { title: ev.title ?? 'Pickup Request', body: ev.body ?? 'A customer is waiting.', tag: 'dispatch-event', eventId: ev.eventId },
        vapidPublicKey,
        vapidPrivateKey,
      )
      if (ok) { await kv.delete(name); sent++ }
    }
    return { result: `KV: sent ${sent} notification${sent !== 1 ? 's' : ''}` }
  },
})
