import { describe, it, expect } from 'vitest'
import { LoginSchema, RegisterSchema, CheckinSchema, InviteSchema } from '../validations'

describe('LoginSchema', () => {
  it('accepts valid credentials', () => {
    expect(() =>
      LoginSchema.parse({ email: 'test@example.com', password: 'geheim' })
    ).not.toThrow()
  })

  it('rejects invalid email', () => {
    expect(() =>
      LoginSchema.parse({ email: 'keine-email', password: 'geheim' })
    ).toThrow()
  })

  it('rejects password shorter than 6 characters', () => {
    expect(() =>
      LoginSchema.parse({ email: 'test@example.com', password: '123' })
    ).toThrow()
  })
})

describe('RegisterSchema', () => {
  const valid = {
    companyName: 'Acme GmbH',
    email: 'admin@acme.de',
    password: 'sicher123',
    name: 'Max Müller',
  }

  it('accepts valid registration data', () => {
    expect(() => RegisterSchema.parse(valid)).not.toThrow()
  })

  it('rejects companyName shorter than 2 characters', () => {
    expect(() => RegisterSchema.parse({ ...valid, companyName: 'A' })).toThrow()
  })

  it('rejects name shorter than 2 characters', () => {
    expect(() => RegisterSchema.parse({ ...valid, name: 'X' })).toThrow()
  })

  it('rejects password shorter than 8 characters', () => {
    expect(() => RegisterSchema.parse({ ...valid, password: '1234567' })).toThrow()
  })
})

describe('CheckinSchema', () => {
  const valid = { mood: 7, stress: 3, energy: 8 }

  it('accepts values between 1 and 10', () => {
    expect(() => CheckinSchema.parse(valid)).not.toThrow()
  })

  it('accepts boundary value 1', () => {
    expect(() => CheckinSchema.parse({ mood: 1, stress: 1, energy: 1 })).not.toThrow()
  })

  it('accepts boundary value 10', () => {
    expect(() => CheckinSchema.parse({ mood: 10, stress: 10, energy: 10 })).not.toThrow()
  })

  it('rejects mood = 0', () => {
    expect(() => CheckinSchema.parse({ ...valid, mood: 0 })).toThrow()
  })

  it('rejects mood = 11', () => {
    expect(() => CheckinSchema.parse({ ...valid, mood: 11 })).toThrow()
  })

  it('accepts optional note', () => {
    expect(() => CheckinSchema.parse({ ...valid, note: 'Good day' })).not.toThrow()
  })

  it('rejects note longer than 1000 characters', () => {
    expect(() =>
      CheckinSchema.parse({ ...valid, note: 'x'.repeat(1001) })
    ).toThrow()
  })
})

describe('InviteSchema', () => {
  it('accepts EMPLOYEE role', () => {
    expect(() => InviteSchema.parse({ role: 'EMPLOYEE' })).not.toThrow()
  })

  it('accepts COMPANY_ADMIN role', () => {
    expect(() => InviteSchema.parse({ role: 'COMPANY_ADMIN' })).not.toThrow()
  })

  it('rejects invalid role', () => {
    expect(() => InviteSchema.parse({ role: 'SUPERADMIN' })).toThrow()
  })

  it('defaults role to EMPLOYEE', () => {
    const result = InviteSchema.parse({})
    expect(result.role).toBe('EMPLOYEE')
  })
})
