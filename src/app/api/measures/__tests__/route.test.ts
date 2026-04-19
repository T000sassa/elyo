import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockPrisma = {
  measure: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
}

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

const { GET, POST } = await import('../route')

const mockAdminSession = {
  user: { id: 'admin-1', role: 'COMPANY_ADMIN', companyId: 'company-1' },
}

const mockMeasure = {
  id: 'measure-1',
  companyId: 'company-1',
  teamId: null,
  title: 'Bewegungspause',
  category: 'sport',
  description: 'Kurze Pause.',
  status: 'SUGGESTED',
  suggestedAt: new Date('2026-04-19'),
  startedAt: null,
  completedAt: null,
  createdBy: 'system',
  team: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(mockAdminSession)
  mockPrisma.measure.findMany.mockResolvedValue([mockMeasure])
  mockPrisma.measure.create.mockResolvedValue({ ...mockMeasure, id: 'measure-new', status: 'ACTIVE', createdBy: 'admin-1' })
})

describe('GET /api/measures', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(new Request('http://localhost/api/measures'))
    expect(res.status).toBe(401)
  })

  it('returns 403 when role is not COMPANY_ADMIN', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'emp-1', role: 'EMPLOYEE', companyId: 'company-1' } })
    const res = await GET(new Request('http://localhost/api/measures'))
    expect(res.status).toBe(403)
  })

  it('returns all measures for the company', async () => {
    const res = await GET(new Request('http://localhost/api/measures'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.measures).toHaveLength(1)
    expect(body.measures[0].id).toBe('measure-1')
  })
})

describe('POST /api/measures', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(new Request('http://localhost/api/measures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', category: 'sport', description: 'Beschreibung lang genug.' }),
    }))
    expect(res.status).toBe(401)
  })

  it('returns 400 on validation error (title too short)', async () => {
    const res = await POST(new Request('http://localhost/api/measures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'AB', category: 'sport', description: 'Beschreibung lang genug.' }),
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('validation_error')
  })

  it('creates measure with ACTIVE status and returns 201', async () => {
    const res = await POST(new Request('http://localhost/api/measures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Bewegungspause', category: 'sport', description: 'Eine kurze Bewegungspause jeden Tag.' }),
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.measure).toBeDefined()
    expect(mockPrisma.measure.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACTIVE', createdBy: 'admin-1' }),
      })
    )
  })
})
