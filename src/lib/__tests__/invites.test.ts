import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockCreate, mockFindUnique } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindUnique: vi.fn(),
}))

vi.mock('../prisma', () => ({
  prisma: {
    inviteToken: {
      create: mockCreate,
      findUnique: mockFindUnique,
    },
  },
}))

import { generateToken, createInviteToken, verifyInviteToken } from '../invites'

describe('generateToken', () => {
  it('returns a 64-character hex string', () => {
    const token = generateToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('generates a different token on each call', () => {
    const t1 = generateToken()
    const t2 = generateToken()
    expect(t1).not.toBe(t2)
  })
})

describe('createInviteToken', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls prisma.inviteToken.create with correct data', async () => {
    const fakeToken = {
      id: 'invite-1',
      token: 'abc123',
      companyId: 'company-1',
      role: 'EMPLOYEE',
      email: 'new@company.com',
      expiresAt: new Date(),
      createdAt: new Date(),
    }
    mockCreate.mockResolvedValue(fakeToken)

    const result = await createInviteToken('company-1', {
      email: 'new@company.com',
      role: 'EMPLOYEE',
      expiresInDays: 7,
    })

    expect(mockCreate).toHaveBeenCalledOnce()
    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.data.companyId).toBe('company-1')
    expect(callArgs.data.email).toBe('new@company.com')
    expect(callArgs.data.role).toBe('EMPLOYEE')
    // expiresAt should be in the future
    expect(callArgs.data.expiresAt.getTime()).toBeGreaterThan(Date.now())
    expect(result).toEqual(fakeToken)
  })
})

describe('verifyInviteToken', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns valid:false when token is not found', async () => {
    mockFindUnique.mockResolvedValue(null)
    const result = await verifyInviteToken('unknown-token')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Einladungslink nicht gefunden')
  })

  it('returns valid:false when token has already been used', async () => {
    mockFindUnique.mockResolvedValue({
      token: 'used-token',
      usedAt: new Date('2026-01-01'),
      expiresAt: new Date(Date.now() + 86400_000),
      company: { id: 'company-1', name: 'Acme' },
    })
    const result = await verifyInviteToken('used-token')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Einladungslink bereits verwendet')
  })

  it('returns valid:false when token has expired', async () => {
    mockFindUnique.mockResolvedValue({
      token: 'expired-token',
      usedAt: null,
      expiresAt: new Date('2025-01-01'), // in the past
      company: { id: 'company-1', name: 'Acme' },
    })
    const result = await verifyInviteToken('expired-token')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Einladungslink abgelaufen')
  })

  it('returns valid:true and invite object for a valid token', async () => {
    const fakeInvite = {
      token: 'valid-token',
      usedAt: null,
      expiresAt: new Date(Date.now() + 86400_000), // tomorrow
      email: 'user@company.com',
      role: 'EMPLOYEE',
      company: { id: 'company-1', name: 'Acme' },
    }
    mockFindUnique.mockResolvedValue(fakeInvite)
    const result = await verifyInviteToken('valid-token')
    expect(result.valid).toBe(true)
    expect(result.invite).toEqual(fakeInvite)
  })
})
