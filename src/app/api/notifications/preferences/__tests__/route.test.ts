import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockPrisma = {
  notificationPreference: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
}

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

const { GET, PATCH } = await import('../route')

const mockSession = {
  user: { id: 'user-1', role: 'EMPLOYEE', companyId: 'company-1' },
}

const defaultPrefs = {
  userId: 'user-1',
  checkinReminder: true,
  checkinReminderTime: '09:00',
  weeklySummary: true,
  partnerUpdates: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(mockSession)
  mockPrisma.notificationPreference.findUnique.mockResolvedValue(defaultPrefs)
  mockPrisma.notificationPreference.upsert.mockResolvedValue(defaultPrefs)
})

describe('GET /api/notifications/preferences', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns preferences when they exist', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.preferences).toEqual(defaultPrefs)
  })

  it('returns default preferences when none exist', async () => {
    mockPrisma.notificationPreference.findUnique.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.preferences.checkinReminder).toBe(true)
    expect(body.preferences.partnerUpdates).toBe(false)
  })
})

describe('PATCH /api/notifications/preferences', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await PATCH(new Request('http://localhost/api/notifications/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkinReminder: false }),
    }))
    expect(res.status).toBe(401)
  })

  it('upserts preferences and returns 200', async () => {
    const updatedPrefs = { ...defaultPrefs, checkinReminder: false }
    mockPrisma.notificationPreference.upsert.mockResolvedValue(updatedPrefs)
    const res = await PATCH(new Request('http://localhost/api/notifications/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkinReminder: false }),
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.preferences).toBeDefined()
    expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        create: expect.objectContaining({ userId: 'user-1' }),
        update: expect.objectContaining({ checkinReminder: false }),
      })
    )
  })
})
