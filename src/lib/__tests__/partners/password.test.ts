import { describe, it, expect } from 'vitest'
import { hashPartnerPassword, verifyPartnerPassword } from '../../partners/password'

describe('partners/password', () => {
  it('hash + verify round-trip', async () => {
    const hash = await hashPartnerPassword('my-secret-42')
    expect(await verifyPartnerPassword('my-secret-42', hash)).toBe(true)
  })

  it('wrong password → false', async () => {
    const hash = await hashPartnerPassword('correct-pw')
    expect(await verifyPartnerPassword('wrong-pw', hash)).toBe(false)
  })

  it('hash differs from plain', async () => {
    const plain = 'my-password'
    const hash = await hashPartnerPassword(plain)
    expect(hash).not.toBe(plain)
    expect(hash.length).toBeGreaterThan(20)
  })

  it('same input produces different hashes (random salt)', async () => {
    const h1 = await hashPartnerPassword('same')
    const h2 = await hashPartnerPassword('same')
    expect(h1).not.toBe(h2)
  })
})
