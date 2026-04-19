import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = {
  pushSubscription: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
}

vi.mock('../prisma', () => ({ prisma: mockPrisma }))

const mockSendNotification = vi.fn()
const mockSetVapidDetails = vi.fn()

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: mockSetVapidDetails,
    sendNotification: mockSendNotification,
  },
  WebPushError: class WebPushError extends Error {
    statusCode: number
    constructor(message: string, statusCode: number) {
      super(message)
      this.statusCode = statusCode
    }
  },
}))

const { sendPushToUser, saveSubscription, removeSubscription } = await import('../webPush')

const mockSubscription = {
  id: 'sub-1',
  userId: 'user-1',
  endpoint: 'https://push.example.com/sub1',
  p256dh: 'p256dh-key',
  auth: 'auth-key',
  createdAt: new Date(),
  user: null as never,
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.VAPID_PUBLIC_KEY = 'test-public-key'
  process.env.VAPID_PRIVATE_KEY = 'test-private-key'
  process.env.VAPID_SUBJECT = 'mailto:test@elyo.de'
})

describe('sendPushToUser', () => {
  it('returns { sent: 0, failed: 0 } when no subscriptions', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([])
    const result = await sendPushToUser('user-1', { title: 'Test', body: 'Body' })
    expect(result).toEqual({ sent: 0, failed: 0 })
  })

  it('sends push and returns { sent: 1, failed: 0 } on success', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([mockSubscription])
    mockSendNotification.mockResolvedValue(undefined)
    const result = await sendPushToUser('user-1', { title: 'Test', body: 'Body' })
    expect(result).toEqual({ sent: 1, failed: 0 })
    expect(mockSendNotification).toHaveBeenCalledOnce()
  })

  it('deletes expired subscription on 410 Gone error', async () => {
    const { WebPushError } = await import('web-push')
    mockPrisma.pushSubscription.findMany.mockResolvedValue([mockSubscription])
    mockSendNotification.mockRejectedValue(new WebPushError('Gone', 410))
    const result = await sendPushToUser('user-1', { title: 'Test', body: 'Body' })
    expect(result.failed).toBe(1)
    expect(mockPrisma.pushSubscription.delete).toHaveBeenCalledWith({
      where: { endpoint: mockSubscription.endpoint },
    })
  })
})

describe('saveSubscription', () => {
  it('calls prisma upsert with correct data', async () => {
    mockPrisma.pushSubscription.upsert.mockResolvedValue(mockSubscription)
    await saveSubscription('user-1', {
      endpoint: 'https://push.example.com/sub1',
      keys: { p256dh: 'key1', auth: 'auth1' },
    })
    expect(mockPrisma.pushSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { endpoint: 'https://push.example.com/sub1' },
        create: expect.objectContaining({ userId: 'user-1', endpoint: 'https://push.example.com/sub1' }),
      })
    )
  })
})

describe('removeSubscription', () => {
  it('calls prisma deleteMany for user endpoint', async () => {
    mockPrisma.pushSubscription.deleteMany.mockResolvedValue({ count: 1 })
    await removeSubscription('user-1', 'https://push.example.com/sub1')
    expect(mockPrisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', endpoint: 'https://push.example.com/sub1' },
    })
  })
})
