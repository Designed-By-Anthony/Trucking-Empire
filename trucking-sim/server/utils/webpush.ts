// Web Push Protocol (RFC 8030 + RFC 8291 + RFC 8188) using Web Crypto API
// Works in Cloudflare Workers runtime without Node.js dependencies

export interface PushSubscriptionData {
  endpoint: string
  expirationTime?: number | null
  keys: {
    p256dh: string
    auth: string
  }
}

const te = new TextEncoder()

function b64u(buf: Uint8Array | ArrayBuffer): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return btoa(String.fromCharCode(...bytes))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function fromb64u(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad), c => c.charCodeAt(0))
}

function concat(...bufs: Uint8Array[]): Uint8Array {
  const total = bufs.reduce((acc, b) => acc + b.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const b of bufs) { out.set(b, off); off += b.length }
  return out
}

// HKDF-Extract: PRK = HMAC-SHA-256(salt, ikm)
// HKDF-Expand: HMAC-SHA-256(PRK, info || 0x01).slice(0, length)
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const saltKey = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', saltKey, ikm))
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const t = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, concat(info, new Uint8Array([1]))))
  return t.slice(0, length)
}

// RFC 8291 aes128gcm payload encryption
async function encryptPayload(
  subscription: PushSubscriptionData,
  payload: string
): Promise<Uint8Array> {
  const receiverPubKey = fromb64u(subscription.keys.p256dh) // 65 bytes uncompressed P-256
  const authSecret = fromb64u(subscription.keys.auth)       // 16 bytes

  // Random 16-byte salt for this push
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // Ephemeral server EC key pair for ECDH
  const senderKP = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const senderPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', senderKP.publicKey)) // 65 bytes

  // Import receiver public key for ECDH
  const receiverKey = await crypto.subtle.importKey('raw', receiverPubKey, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: receiverKey }, senderKP.privateKey, 256))

  // IKM: HKDF(salt=auth, ikm=ecdh_secret, info="WebPush: info\0" || receiver_pub || sender_pub, 32)
  const keyInfo = concat(te.encode('WebPush: info\x00'), receiverPubKey, senderPubRaw)
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32)

  // CEK and nonce from salt + ikm
  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\x00'), 16)
  const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\x00'), 12)

  // Encrypt with AES-128-GCM; append 0x02 delimiter (last-record marker per RFC 8188)
  const plaintext = concat(te.encode(payload), new Uint8Array([2]))
  const cekKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, cekKey, plaintext))

  // aes128gcm content encoding header (RFC 8188):
  // salt(16) | record_size(4 BE) | keyid_len(1) | keyid/sender_pub(65) | encrypted_record
  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096, false) // record size limit = 4096

  return concat(salt, rs, new Uint8Array([senderPubRaw.length]), senderPubRaw, ciphertext)
}

// Build and sign VAPID JWT (ES256)
async function vapidJwt(
  audience: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<string> {
  const headerB64 = b64u(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payloadB64 = b64u(te.encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 43200, // 12 hours
    sub: 'mailto:amj111394@gmail.com',
  })))
  const signingInput = `${headerB64}.${payloadB64}`

  // Reconstruct P-256 JWK from raw VAPID keys
  const pubBytes = fromb64u(vapidPublicKey) // 65 bytes: 0x04 || x (32) || y (32)
  const jwk = {
    kty: 'EC', crv: 'P-256',
    d: vapidPrivateKey,
    x: b64u(pubBytes.slice(1, 33)),
    y: b64u(pubBytes.slice(33, 65)),
    key_ops: ['sign'],
  }

  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(signingInput)))

  return `${signingInput}.${b64u(sig)}`
}

export async function sendWebPush(
  subscription: PushSubscriptionData,
  payload: { title: string; body: string; tag?: string; eventId?: string },
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ ok: boolean; status: number }> {
  const url = new URL(subscription.endpoint)
  const audience = `${url.protocol}//${url.host}`
  const jwt = await vapidJwt(audience, vapidPublicKey, vapidPrivateKey)
  const body = await encryptPayload(subscription, JSON.stringify(payload))

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt},k=${vapidPublicKey}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      TTL: '3600',
    },
    body,
  })

  return { ok: res.ok || res.status === 201, status: res.status }
}
