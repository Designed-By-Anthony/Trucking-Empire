export default defineEventHandler(async (event) => {
  const cf = (event.context as any).cloudflare
  const db = cf?.env?.FREIGHT_DB as D1Database | undefined
  const kv = cf?.env?.FREIGHT_STATE as KVNamespace | undefined

  const { playerId, subscription } = await readBody(event)
  if (!playerId || !subscription?.endpoint) {
    throw createError({ statusCode: 400, message: 'Missing playerId or subscription' })
  }

  const subJson = JSON.stringify(subscription)
  const now = Date.now()

  if (db) {
    // Ensure the player row exists before writing subscription
    const email = playerId.startsWith('email:') ? playerId.slice(6) : null
    await db.prepare(
      `INSERT INTO player_state (id, email, state_json, push_subscription_json, last_seen_at, updated_at)
       VALUES (?, ?, '{}', ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         push_subscription_json = excluded.push_subscription_json,
         last_seen_at           = excluded.last_seen_at`
    ).bind(playerId, email, subJson, now, now).run()
  }

  // Keep KV mirror during transition
  if (kv) {
    await kv.put(`fe:${playerId}:push`, subJson, { expirationTtl: 7_776_000 })
  }

  return { ok: true }
})
