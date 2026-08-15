export default defineEventHandler(async (event) => {
  const { id } = getQuery(event)
  if (!id || typeof id !== 'string') {
    throw createError({ statusCode: 400, message: 'id required' })
  }
  const kv = (event.context.cloudflare?.env as any)?.FREIGHT_STATE
  if (kv) await kv.delete(id)
  return { ok: true }
})
