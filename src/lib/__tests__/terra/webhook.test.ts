import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import { verifySignature } from '../../terra/webhook'

const SECRET = 'test-webhook-secret'

function signBody(body: string, secret: string = SECRET): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}

describe('terra/webhook — verifySignature', () => {
  it('returns true for correctly signed body', () => {
    const body = '{"type":"auth","user":{"reference_id":"u123"}}'
    const sig = signBody(body)
    expect(verifySignature(body, sig, SECRET)).toBe(true)
  })

  it('returns false for modified body', () => {
    const body = '{"type":"auth"}'
    const sig = signBody(body)
    expect(verifySignature('{"type":"deauth"}', sig, SECRET)).toBe(false)
  })

  it('returns false for signature made with different secret', () => {
    const body = '{"type":"auth"}'
    const sig = signBody(body, 'different-secret')
    expect(verifySignature(body, sig, SECRET)).toBe(false)
  })

  it('returns false for null signature header', () => {
    const body = '{"type":"auth"}'
    expect(verifySignature(body, null, SECRET)).toBe(false)
  })

  it('returns false for empty signature header', () => {
    const body = '{"type":"auth"}'
    expect(verifySignature(body, '', SECRET)).toBe(false)
  })

  it('returns false for malformed hex signature', () => {
    const body = '{"type":"auth"}'
    expect(verifySignature(body, 'not-hex-XYZ', SECRET)).toBe(false)
  })
})
