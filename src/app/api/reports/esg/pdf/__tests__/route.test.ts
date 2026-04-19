import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockGetReportData = vi.fn()
const mockRenderToBuffer = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/esgReport', () => ({ getReportData: mockGetReportData }))
vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: mockRenderToBuffer,
  Document: ({ children }: { children: React.ReactNode }) => children,
  Page: ({ children }: { children?: React.ReactNode }) => children ?? null,
  View: ({ children }: { children?: React.ReactNode }) => children ?? null,
  Text: ({ children }: { children?: React.ReactNode }) => children ?? null,
  StyleSheet: { create: (s: unknown) => s },
}))
vi.mock('@/components/reports/EsgReportPdf', () => ({
  default: () => null,
  generateComment: () => '',
}))

const { GET } = await import('../route')

const mockAdminSession = {
  user: { id: 'admin-1', role: 'COMPANY_ADMIN', companyId: 'company-1' },
}

const mockReportData = {
  company: { name: 'Test GmbH', employeeCount: 10, industry: 'tech' },
  period: { label: 'Q1 2026', from: new Date('2026-01-01'), to: new Date('2026-03-31') },
  kpis: {
    vitalityIndex: 7.0, vitalityTrend: 0.5, activeParticipants: 8,
    participationRate: 0.8, avgEnergy: 8.0, avgMood: 7.5, avgStress: 3.0, checkinsTotal: 8,
  },
  teamBreakdown: [],
  trendData: [],
  csrdMapping: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(mockAdminSession)
  mockGetReportData.mockResolvedValue(mockReportData)
  mockRenderToBuffer.mockResolvedValue(Buffer.from('%PDF-1.4 mock'))
})

describe('GET /api/reports/esg/pdf', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new Request('http://localhost/api/reports/esg/pdf?year=2026')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when role is not COMPANY_ADMIN', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'emp-1', role: 'EMPLOYEE', companyId: 'company-1' } })
    const req = new Request('http://localhost/api/reports/esg/pdf?year=2026')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 when year is missing', async () => {
    const req = new Request('http://localhost/api/reports/esg/pdf')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('year_required')
  })

  it('returns 400 when year is not a valid integer', async () => {
    const req = new Request('http://localhost/api/reports/esg/pdf?year=abc')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('year_required')
  })

  it('returns 400 when quarter is outside 1-4', async () => {
    const req = new Request('http://localhost/api/reports/esg/pdf?year=2026&quarter=5')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_quarter')
  })

  it('returns PDF response with correct headers for annual request', async () => {
    const req = new Request('http://localhost/api/reports/esg/pdf?year=2026')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toContain('attachment')
    expect(res.headers.get('Content-Disposition')).toContain('.pdf')
    expect(mockGetReportData).toHaveBeenCalledWith('company-1', { year: 2026 })
  })

  it('returns PDF response for quarterly request', async () => {
    const req = new Request('http://localhost/api/reports/esg/pdf?year=2026&quarter=1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockGetReportData).toHaveBeenCalledWith('company-1', { year: 2026, quarter: 1 })
  })

  it('returns 500 when rendering fails', async () => {
    mockGetReportData.mockRejectedValue(new Error('DB error'))
    const req = new Request('http://localhost/api/reports/esg/pdf?year=2026')
    const res = await GET(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('render_failed')
  })
})
