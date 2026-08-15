export default defineEventHandler(async (event) => {
  const cf = (event.context as any).cloudflare
  const kv = cf?.env?.FREIGHT_STATE as { put(key: string, val: string, opts?: { expirationTtl?: number }): Promise<void> } | undefined

  if (!kv) return { ok: true }

  const body = await readBody(event)
  const { id, state } = body ?? {}

  if (!id || !state) throw createError({ statusCode: 400, message: 'Missing id or state' })

  await kv.put(id, JSON.stringify(state), { expirationTtl: 7_776_000 }) // 90 days

  // Update last-seen so the push cron can detect when player left
  await kv.put(`fe:${id}:seen`, String(Date.now()), { expirationTtl: 86_400 })

  return { ok: true }
})
