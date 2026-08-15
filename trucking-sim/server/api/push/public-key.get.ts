export default defineEventHandler(async (event) => {
  const cf = (event.context as any).cloudflare
  const raw = cf?.env?.VAPID_PUBLIC_KEY
  if (!raw) return { publicKey: null }
  const publicKey = typeof raw === 'string' ? raw : await raw.get()
  return { publicKey }
})
