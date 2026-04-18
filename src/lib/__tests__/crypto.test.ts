import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { encryptToken, decryptToken } from '../crypto'

const VALID_KEY = 'a'.repeat(64) // 32 Byte als 64-Zeichen-Hex

describe('encryptToken / decryptToken', () => {
  const originalKey = process.env.ENCRYPTION_KEY

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = VALID_KEY
  })

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey
  })

  it('round-trip: decryptToken(encryptToken(x)) === x', () => {
    const plain = 'my-secret-oauth-token'
    expect(decryptToken(encryptToken(plain))).toBe(plain)
  })

  it('round-trip: funktioniert mit langen Tokens und Sonderzeichen', () => {
    const plain = 'ya29.A0ARrdaM-Ü_ö-ä/+==longtoken' + 'x'.repeat(200)
    expect(decryptToken(encryptToken(plain))).toBe(plain)
  })

  it('gleicher Input erzeugt unterschiedliche Ciphertexte (random IV)', () => {
    const plain = 'same-input'
    const c1 = encryptToken(plain)
    const c2 = encryptToken(plain)
    expect(c1).not.toBe(c2)
  })

  it('ciphertext hat Format iv:authTag:ciphertext (3 Segmente)', () => {
    const cipher = encryptToken('test')
    const parts = cipher.split(':')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toMatch(/^[0-9a-f]+$/) // hex IV
    expect(parts[1]).toMatch(/^[0-9a-f]+$/) // hex authTag
    expect(parts[2]).toMatch(/^[0-9a-f]+$/) // hex ciphertext
  })

  it('wirft bei manipuliertem Ciphertext', () => {
    const cipher = encryptToken('test')
    const parts = cipher.split(':')
    parts[2] = parts[2].slice(0, -2) + 'ff' // letzten Bytes verfälschen
    expect(() => decryptToken(parts.join(':'))).toThrow()
  })

  it('wirft bei falschem Format (zu wenige Segmente)', () => {
    expect(() => decryptToken('invalid-no-colons')).toThrow()
  })

  it('wirft wenn ENCRYPTION_KEY nicht gesetzt ist', () => {
    delete process.env.ENCRYPTION_KEY
    expect(() => encryptToken('test')).toThrow('ENCRYPTION_KEY')
  })
})
