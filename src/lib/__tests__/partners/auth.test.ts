import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { signPartnerSession, verifyPartnerSession, PARTNER_SESSION_COOKIE } from '../../partners/auth'

const SECRET = 'a'.repeat(32)

describe('partners/auth', () => {
  const original = process.env.PARTNER_SESSION_SECRET

  beforeEach(() => {
    process.env.PARTNER_SESSION_SECRET = SECRET
  })

  afterEach(() => {
    process.env.PARTNER_SESSION_SECRET = original
  })

  it('PARTNER_SESSION_COOKIE constant', () => {
    expect(PARTNER_SESSION_COOKIE).toBe('elyo_partner_session')
  })

  it('sign + verify round-trip', () => {
    const token = signPartnerSession('partner-abc')
    const result = verifyPartnerSession(token)
    expect(result).toEqual({ partnerId: 'partner-abc' })
  })

  it('tampered token → null', () => {
    const token = signPartnerSession('partner-abc')
    const parts = token.split('.')
    const tampered = parts[0] + '.' + parts[1] + '.' + 'A'.repeat(parts[2].length)
    expect(verifyPartnerSession(tampered)).toBeNull()
  })

  it('token with different secret → null', () => {
    process.env.PARTNER_SESSION_SECRET = 'z'.repeat(32)
    const token = signPartnerSession('partner-abc')
    process.env.PARTNER_SESSION_SECRET = SECRET
    expect(verifyPartnerSession(token)).toBeNull()
  })

  it('expired token → null', () => {
    // Build an expired token manually
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({ sub: 'p1', iat: 0, exp: 1 })).toString('base64url')
    const { createHmac } = require('crypto')
    const sig = createHmac('sha256', SECRET).update(`${header}.${payload}`).digest('base64url')
    expect(verifyPartnerSession(`${header}.${payload}.${sig}`)).toBeNull()
  })

  it('malformed token → null', () => {
    expect(verifyPartnerSession('not-a-jwt')).toBeNull()
    expect(verifyPartnerSession('only.two')).toBeNull()
  })

  it('signPartnerSession throws when secret missing', () => {
    delete process.env.PARTNER_SESSION_SECRET
    expect(() => signPartnerSession('p1')).toThrow(/PARTNER_SESSION_SECRET/)
  })

  it('verifyPartnerSession returns null when secret missing', () => {
    const token = signPartnerSession('p1')
    delete process.env.PARTNER_SESSION_SECRET
    expect(verifyPartnerSession(token)).toBeNull()
  })
})
