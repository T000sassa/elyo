import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockPrisma = {
  measure: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

const { PATCH } = await import('../route')

const mockAdminSession = {
  user: { id: 'admin-1', role: 'COMPANY_ADMIN', companyId: 'company-1' },
}

function makeRequest(id: string, body: object) {
  return new Request(`http://localhost/api/measures/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(mockAdminSession)
  mockPrisma.measure.findUnique.mockResolvedValue({
    id: 'measure-1',
    companyId: 'company-1',
    status: 'SUGGESTED',
  })
  mockPrisma.measure.update.mockResolvedValue({ id: 'measure-1', status: 'ACTIVE', startedAt: new Date() })
})

describe('PATCH /api/measures/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await PATCH(makeRequest('measure-1', { status: 'ACTIVE' }), { params: Promise.resolve({ id: 'measure-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when measure belongs to another company', async () => {
    mockPrisma.measure.findUnique.mockResolvedValue({ id: 'measure-1', companyId: 'other-company', status: 'SUGGESTED' })
    const res = await PATCH(makeRequest('measure-1', { status: 'ACTIVE' }), { params: Promise.resolve({ id: 'measure-1' }) })
    expect(res.status).toBe(403)
  })

  it('transitions SUGGESTED → ACTIVE and sets startedAt', async () => {
    const res = await PATCH(makeRequest('measure-1', { status: 'ACTIVE' }), { params: Promise.resolve({ id: 'measure-1' }) })
    expect(res.status).toBe(200)
    expect(mockPrisma.measure.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACTIVE', startedAt: expect.any(Date) }),
      })
    )
  })

  it('transitions ACTIVE → COMPLETED and sets completedAt', async () => {
    mockPrisma.measure.findUnique.mockResolvedValue({ id: 'measure-1', companyId: 'company-1', status: 'ACTIVE' })
    mockPrisma.measure.update.mockResolvedValue({ id: 'measure-1', status: 'COMPLETED', completedAt: new Date() })
    const res = await PATCH(makeRequest('measure-1', { status: 'COMPLETED' }), { params: Promise.resolve({ id: 'measure-1' }) })
    expect(res.status).toBe(200)
    expect(mockPrisma.measure.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'COMPLETED', completedAt: expect.any(Date) }),
      })
    )
  })

  it('returns 400 for invalid_transition (COMPLETED → ACTIVE)', async () => {
    mockPrisma.measure.findUnique.mockResolvedValue({ id: 'measure-1', companyId: 'company-1', status: 'COMPLETED' })
    const res = await PATCH(makeRequest('measure-1', { status: 'ACTIVE' }), { params: Promise.resolve({ id: 'measure-1' }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_transition')
  })
})
