import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockGetReportData = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/esgReport', () => ({ getReportData: mockGetReportData }))

const { GET } = await import('../route')

const mockAdminSession = { user: { id: 'admin-1', role: 'COMPANY_ADMIN', companyId: 'company-1' } }

const mockReportData = {
  company: { name: 'ACME GmbH', employeeCount: 10, industry: 'tech' },
  period: { label: 'Q1 2026', from: new Date('2026-01-01'), to: new Date('2026-03-31') },
  kpis: {
    vitalityIndex: 7.0, vitalityTrend: 0.5, activeParticipants: 8,
    participationRate: 0.80, avgEnergy: 8.0, avgMood: 7.5, avgStress: 3.0, checkinsTotal: 8,
  },
  teamBreakdown: [],
  trendData: [],
  csrdMapping: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(mockAdminSession)
  mockGetReportData.mockResolvedValue(mockReportData)
})

describe('GET /api/reports/esg/data', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new Request('http://localhost/api/reports/esg/data?year=2026')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when role is not COMPANY_ADMIN', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'emp-1', role: 'EMPLOYEE', companyId: 'company-1' } })
    const req = new Request('http://localhost/api/reports/esg/data?year=2026')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 when year is missing', async () => {
    const req = new Request('http://localhost/api/reports/esg/data')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('year_required')
  })

  it('returns 400 when year is not a valid integer', async () => {
    const req = new Request('http://localhost/api/reports/esg/data?year=abc')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('year_required')
  })

  it('returns 400 when quarter is outside 1-4', async () => {
    const req = new Request('http://localhost/api/reports/esg/data?year=2026&quarter=5')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_quarter')
  })

  it('returns 400 when quarter is 0', async () => {
    const req = new Request('http://localhost/api/reports/esg/data?year=2026&quarter=0')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 with report data for valid annual request', async () => {
    const req = new Request('http://localhost/api/reports/esg/data?year=2026')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.company.name).toBe('ACME GmbH')
    expect(mockGetReportData).toHaveBeenCalledWith('company-1', { year: 2026 })
  })

  it('returns 200 with report data for valid quarterly request', async () => {
    const req = new Request('http://localhost/api/reports/esg/data?year=2026&quarter=1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockGetReportData).toHaveBeenCalledWith('company-1', { year: 2026, quarter: 1 })
  })
})
