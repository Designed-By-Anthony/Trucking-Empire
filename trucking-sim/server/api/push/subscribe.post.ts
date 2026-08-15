export default defineEventHandler(async (event) => {
  const cf = (event.context as any).cloudflare
  const kv = cf?.env?.FREIGHT_STATE
  if (!kv) return { ok: true }

  const { playerId, subscription } = await readBody(event)
  if (!playerId || !subscription?.endpoint) {
    throw createError({ statusCode: 400, message: 'Missing playerId or subscription' })
  }

  // Store push subscription under its own key alongside game state
  await kv.put(`fe:${playerId}:push`, JSON.stringify(subscription), { expirationTtl: 7_776_000 })
  return { ok: true }
})
