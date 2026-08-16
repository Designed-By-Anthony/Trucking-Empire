// Called when a route dispatches. Stores departure time + manifest snapshot
// so the server can fast-forward state if the player returns after being away.
export default defineEventHandler(async (event) => {
  const cf = (event.context as any).cloudflare
  const db = cf?.env?.FREIGHT_DB as D1Database | undefined
  if (!db) return { ok: true }

  const body = await readBody(event)
  const { playerId, launchedAt, manifest } = body ?? {}

  if (!playerId || !launchedAt) {
    throw createError({ statusCode: 400, message: 'Missing playerId or launchedAt' })
  }

  await db.prepare(
    `UPDATE player_state
     SET route_launched_at   = ?,
         route_manifest_json = ?,
         last_seen_at        = ?
     WHERE id = ?`
  ).bind(launchedAt, manifest ? JSON.stringify(manifest) : null, Date.now(), playerId).run()

  return { ok: true }
})
