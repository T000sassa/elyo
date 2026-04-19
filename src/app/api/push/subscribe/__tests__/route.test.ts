import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockSaveSubscription = vi.fn()
const mockRemoveSubscription = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/webPush', () => ({
  saveSubscription: mockSaveSubscription,
  removeSubscription: mockRemoveSubscription,
}))

const { POST, DELETE } = await import('../route')

const mockSession = {
  user: { id: 'user-1', role: 'EMPLOYEE', companyId: 'company-1' },
}

const validSubscriptionBody = {
  endpoint: 'https://push.example.com/sub1',
  keys: { p256dh: 'key123', auth: 'auth123' },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(mockSession)
  mockSaveSubscription.mockResolvedValue(undefined)
  mockRemoveSubscription.mockResolvedValue(undefined)
})

describe('POST /api/push/subscribe', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(new Request('http://localhost/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validSubscriptionBody),
    }))
    expect(res.status).toBe(401)
  })

  it('saves subscription and returns 201', async () => {
    const res = await POST(new Request('http://localhost/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validSubscriptionBody),
    }))
    expect(res.status).toBe(201)
    expect(mockSaveSubscription).toHaveBeenCalledWith('user-1', validSubscriptionBody)
  })
})

describe('DELETE /api/push/subscribe', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await DELETE(new Request('http://localhost/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: 'https://push.example.com/sub1' }),
    }))
    expect(res.status).toBe(401)
  })

  it('removes subscription and returns 200', async () => {
    const res = await DELETE(new Request('http://localhost/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: 'https://push.example.com/sub1' }),
    }))
    expect(res.status).toBe(200)
    expect(mockRemoveSubscription).toHaveBeenCalledWith('user-1', 'https://push.example.com/sub1')
  })
})
