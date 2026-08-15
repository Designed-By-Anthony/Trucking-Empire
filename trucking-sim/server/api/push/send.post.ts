import { sendWebPush } from '~/server/utils/webpush'

async function getSecret(raw: any): Promise<string | null> {
  if (!raw) return null
  return typeof raw === 'string' ? raw : raw.get()
}

export default defineEventHandler(async (event) => {
  const cf = (event.context as any).cloudflare
  const kv = cf?.env?.FREIGHT_STATE
  const vapidPublicKey = await getSecret(cf?.env?.VAPID_PUBLIC_KEY)
  const vapidPrivateKey = await getSecret(cf?.env?.VAPID_PRIVATE_KEY)

  if (!kv || !vapidPublicKey || !vapidPrivateKey) {
    return { ok: false, error: 'Missing KV or VAPID keys' }
  }

  const { playerId, title, body, tag, eventId } = await readBody(event)
  if (!playerId) throw createError({ statusCode: 400, message: 'Missing playerId' })

  const raw = await kv.get(`fe:${playerId}:push`)
  if (!raw) return { ok: false, error: 'No push subscription' }

  const subscription = JSON.parse(raw)
  return sendWebPush(
    subscription,
    { title: title ?? 'Trucking Empire', body: body ?? 'A dispatch event needs your attention.', tag, eventId },
    vapidPublicKey,
    vapidPrivateKey
  )
})
