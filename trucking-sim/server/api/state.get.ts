export default defineEventHandler(async (event) => {
  const cf = (event.context as any).cloudflare
  const db = cf?.env?.FREIGHT_DB as D1Database | undefined
  const kv = cf?.env?.FREIGHT_STATE as KVNamespace | undefined

  const id = String(getQuery(event).id ?? '')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  // Primary: D1
  if (db) {
    const row = await db.prepare(
      'SELECT state_json FROM player_state WHERE id = ?'
    ).bind(id).first<{ state_json: string }>()

    if (row) {
      // Update last_seen
      await db.prepare(
        'UPDATE player_state SET last_seen_at = ? WHERE id = ?'
      ).bind(Date.now(), id).run()
      return { state: JSON.parse(row.state_json) }
    }

    // Not in D1 yet — check KV for a one-time migration
    if (kv) {
      const raw = await kv.get(id)
      if (raw) {
        const state = JSON.parse(raw)
        const email = id.startsWith('email:') ? id.slice(6) : null
        const now = Date.now()
        await db.prepare(
          `INSERT INTO player_state (id, email, state_json, last_seen_at, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(id) DO NOTHING`
        ).bind(id, email, raw, now, now).run()
        return { state }
      }
    }

    return { state: null }
  }

  // Fallback: KV only
  if (!kv) return { state: null }
  const raw = await kv.get(id)
  return { state: raw ? JSON.parse(raw) : null }
})
