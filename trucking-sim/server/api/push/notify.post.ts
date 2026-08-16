// Queue a push notification to fire at a specific game time.
// Called by the client when a route launches or a line haul departs.
export default defineEventHandler(async (event) => {
  const cf = (event.context as any).cloudflare
  const db = cf?.env?.FREIGHT_DB as D1Database | undefined
  if (!db) return { ok: true } // silently no-op if D1 not bound yet

  const body = await readBody(event)
  const { playerId, eventType, title, body: notifBody, eventId, firesAt } = body ?? {}

  if (!playerId || !eventType || !title || !notifBody || !firesAt) {
    throw createError({ statusCode: 400, message: 'Missing required fields' })
  }

  await db.prepare(
    `INSERT INTO pending_notifications (player_id, event_type, title, body, event_id, fires_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(playerId, eventType, title, notifBody, eventId ?? null, firesAt).run()

  return { ok: true }
})
