export default defineEventHandler(async (event) => {
  const cf = (event.context as any).cloudflare
  const db = cf?.env?.FREIGHT_DB as D1Database | undefined
  const kv = cf?.env?.FREIGHT_STATE as KVNamespace | undefined

  const body = await readBody(event)
  const { id, state } = body ?? {}
  if (!id || !state) throw createError({ statusCode: 400, message: 'Missing id or state' })

  const stateJson = JSON.stringify(state)
  const email = id.startsWith('email:') ? id.slice(6) : null
  const now = Date.now()

  // Primary: D1 upsert
  if (db) {
    await db.prepare(
      `INSERT INTO player_state (id, email, state_json, last_seen_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         state_json   = excluded.state_json,
         last_seen_at = excluded.last_seen_at,
         updated_at   = excluded.updated_at`
    ).bind(id, email, stateJson, now, now).run()
  }

  // Mirror to KV during transition so existing clients still have fallback
  if (kv) {
    await kv.put(id, stateJson, { expirationTtl: 7_776_000 })
    await kv.put(`fe:${id}:seen`, String(now), { expirationTtl: 86_400 })
  }

  return { ok: true }
})
