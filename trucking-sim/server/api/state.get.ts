export default defineEventHandler(async (event) => {
  const cf = (event.context as any).cloudflare
  const kv = cf?.env?.FREIGHT_STATE as { get(key: string): Promise<string | null> } | undefined

  if (!kv) return { state: null }

  const id = String(getQuery(event).id ?? '')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const raw = await kv.get(id)
  return { state: raw ? JSON.parse(raw) : null }
})
