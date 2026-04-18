import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockFindUnique, mockUpsert, mockUpdate, mockUpdateMany, mockFindFirst, mockWearableSyncUpsert } = vi.hoisted(() => ({
  mockFindUnique:        vi.fn(),
  mockUpsert:            vi.fn(),
  mockUpdate:            vi.fn(),
  mockUpdateMany:        vi.fn(),
  mockFindFirst:         vi.fn(),
  mockWearableSyncUpsert: vi.fn(),
}))

vi.mock('../prisma', () => ({
  prisma: {
    wearableConnection: {
      findUnique:  mockFindUnique,
      upsert:      mockUpsert,
      update:      mockUpdate,
      updateMany:  mockUpdateMany,
    },
    wearableSync: {
      upsert: mockWearableSyncUpsert,
    },
    pointTransaction: {
      findFirst: mockFindFirst,
    },
  },
}))

vi.mock('../crypto', () => ({
  encryptToken: (s: string) => `enc:${s}`,
  decryptToken: (s: string) => s.replace('enc:', ''),
}))

vi.mock('../points', () => ({
  awardPoints: vi.fn(),
}))

import { getAuthUrl, exchangeCode, refreshAccessTokenIfNeeded, disconnectUser } from '../googleHealth'
import { awardPoints } from '../points'

const VALID_KEY = 'a'.repeat(64)

beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID     = 'test-client-id'
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
  process.env.NEXTAUTH_URL         = 'http://localhost:3000'
  process.env.OAUTH_HMAC_SECRET    = 'test-hmac-secret'
  process.env.ENCRYPTION_KEY       = VALID_KEY
  vi.resetAllMocks()
})

afterEach(() => {
  delete process.env.GOOGLE_CLIENT_ID
  delete process.env.GOOGLE_CLIENT_SECRET
  delete process.env.NEXTAUTH_URL
  delete process.env.OAUTH_HMAC_SECRET
  delete process.env.ENCRYPTION_KEY
})

describe('getAuthUrl', () => {
  it('enthält alle drei Fitness-Scopes', () => {
    const url = getAuthUrl('user-123')
    expect(url).toContain('fitness.activity.read')
    expect(url).toContain('fitness.sleep.read')
    expect(url).toContain('fitness.heart_rate.read')
  })

  it('enthält den state-Parameter mit userId', () => {
    const url = getAuthUrl('user-abc')
    const parsed = new URL(url)
    const state = parsed.searchParams.get('state')!
    const decoded = Buffer.from(state, 'base64url').toString('utf8')
    expect(decoded.startsWith('user-abc.')).toBe(true)
  })

  it('enthält access_type=offline und prompt=consent', () => {
    const url = getAuthUrl('user-123')
    expect(url).toContain('access_type=offline')
    expect(url).toContain('prompt=consent')
  })

  it('wirft wenn GOOGLE_CLIENT_ID fehlt', () => {
    delete process.env.GOOGLE_CLIENT_ID
    expect(() => getAuthUrl('user-123')).toThrow('GOOGLE_CLIENT_ID')
  })
})

describe('exchangeCode', () => {
  it('speichert verschlüsselten Token in WearableConnection', async () => {
    const stateUrl = getAuthUrl('user-xyz')
    const state = new URL(stateUrl).searchParams.get('state')!

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token:  'access-abc',
        refresh_token: 'refresh-abc',
        expires_in:    3600,
      }),
    } as Response)

    mockFindFirst.mockResolvedValueOnce(null)
    mockUpsert.mockResolvedValueOnce({})

    await exchangeCode('auth-code', state)

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_source: { userId: 'user-xyz', source: 'google_health' } },
      })
    )
  })

  it('ruft awardPoints auf wenn noch nicht vergeben', async () => {
    const state = new URL(getAuthUrl('user-xyz')).searchParams.get('state')!
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'a', refresh_token: 'r', expires_in: 3600 }),
    } as Response)
    mockFindFirst.mockResolvedValueOnce(null)
    mockUpsert.mockResolvedValueOnce({})

    await exchangeCode('code', state)

    expect(awardPoints).toHaveBeenCalledWith('user-xyz', 'wearable_connected')
  })

  it('ruft awardPoints NICHT auf wenn bereits vergeben', async () => {
    const state = new URL(getAuthUrl('user-xyz')).searchParams.get('state')!
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'a', refresh_token: 'r', expires_in: 3600 }),
    } as Response)
    mockFindFirst.mockResolvedValueOnce({ id: 'existing-tx' })
    mockUpsert.mockResolvedValueOnce({})

    await exchangeCode('code', state)

    expect(awardPoints).not.toHaveBeenCalled()
  })

  it('wirft bei manipuliertem State', async () => {
    await expect(exchangeCode('code', 'invalid-state')).rejects.toThrow()
  })
})

describe('refreshAccessTokenIfNeeded', () => {
  it('erneuert Token wenn expiresAt in weniger als 5 Minuten', async () => {
    const soonExpiry = new Date(Date.now() + 2 * 60 * 1000)
    mockFindUnique.mockResolvedValueOnce({
      isActive:     true,
      accessToken:  'enc:old-access',
      refreshToken: 'enc:refresh-token',
      expiresAt:    soonExpiry,
    })
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'new-access', expires_in: 3600 }),
    } as Response)
    mockUpdate.mockResolvedValueOnce({})

    await refreshAccessTokenIfNeeded('user-123')

    expect(global.fetch).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('no-op wenn Token noch länger als 5 Minuten gültig', async () => {
    const farFuture = new Date(Date.now() + 60 * 60 * 1000)
    mockFindUnique.mockResolvedValueOnce({
      isActive:     true,
      accessToken:  'enc:access',
      refreshToken: 'enc:refresh',
      expiresAt:    farFuture,
    })
    global.fetch = vi.fn()

    await refreshAccessTokenIfNeeded('user-123')

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('no-op wenn keine aktive Verbindung', async () => {
    mockFindUnique.mockResolvedValueOnce(null)
    global.fetch = vi.fn()

    await refreshAccessTokenIfNeeded('user-123')

    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('disconnectUser', () => {
  it('setzt isActive=false und löscht Tokens', async () => {
    mockUpdateMany.mockResolvedValueOnce({ count: 1 })

    await disconnectUser('user-123')

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-123', source: 'google_health' },
      data: { isActive: false, accessToken: null, refreshToken: null },
    })
  })
})
