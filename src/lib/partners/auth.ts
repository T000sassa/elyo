import { createHmac, timingSafeEqual } from 'crypto'

export const PARTNER_SESSION_COOKIE = 'elyo_partner_session'
export const PARTNER_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60

function getSecret(): string {
  const s = process.env.PARTNER_SESSION_SECRET
  if (!s || s.length < 16) throw new Error('PARTNER_SESSION_SECRET missing or too short')
  return s
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input
  return buf.toString('base64url')
}

function base64urlDecode(input: string): Buffer {
  return Buffer.from(input, 'base64url')
}

export function signPartnerSession(partnerId: string): string {
  const secret = getSecret()
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const payload = base64url(
    JSON.stringify({ sub: partnerId, iat: now, exp: now + PARTNER_SESSION_TTL_SECONDS }),
  )
  const sig = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${sig}`
}

export function verifyPartnerSession(token: string): { partnerId: string } | null {
  let secret: string
  try {
    secret = getSecret()
  } catch {
    return null
  }

  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, payload, sig] = parts

  const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return null
  if (!timingSafeEqual(a, b)) return null

  let parsed: { sub?: unknown; exp?: unknown }
  try {
    parsed = JSON.parse(base64urlDecode(payload).toString('utf8'))
  } catch {
    return null
  }

  if (typeof parsed.sub !== 'string' || typeof parsed.exp !== 'number') return null
  if (parsed.exp < Math.floor(Date.now() / 1000)) return null

  return { partnerId: parsed.sub }
}
