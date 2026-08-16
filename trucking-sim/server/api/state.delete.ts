export default defineEventHandler(async (event) => {
  const cf = (event.context as any).cloudflare
  const db = cf?.env?.FREIGHT_DB as D1Database | undefined
  const kv = cf?.env?.FREIGHT_STATE as KVNamespace | undefined

  const { id } = getQuery(event)
  if (!id || typeof id !== 'string') throw createError({ statusCode: 400, message: 'id required' })

  if (db) await db.prepare('DELETE FROM player_state WHERE id = ?').bind(id).run()
  if (kv) await kv.delete(id)

  return { ok: true }
})
