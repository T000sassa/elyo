import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = {
  company: { findUnique: vi.fn() },
  team: { findMany: vi.fn() },
  measure: { findFirst: vi.fn(), create: vi.fn() },
}

vi.mock('../prisma', () => ({ prisma: mockPrisma }))

const mockGetAggregatedMetrics = vi.fn()
const mockGetContinuityData = vi.fn()

vi.mock('../anonymize', () => ({
  getAggregatedMetrics: mockGetAggregatedMetrics,
  getContinuityData: mockGetContinuityData,
}))

const { generateSuggestionsForCompany } = await import('../measureEngine')

const COMPANY_ID = 'company-1'
const TEAM_ID = 'team-1'

const defaultCompany = {
  id: COMPANY_ID,
  anonymityThreshold: 5,
}

const defaultTeam = { id: TEAM_ID }

const metricsAboveThreshold = {
  avgStress: 5,
  avgEnergy: 7,
  avgScore: 7,
  avgMood: 7,
  responseCount: 10,
  isAboveThreshold: true,
}

const continuityAboveThreshold = {
  continuityRate: 0.8,
  activeUserRate: 0.7,
  totalEmployees: 20,
  checkedInThisPeriod: 14,
  isAboveThreshold: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.company.findUnique.mockResolvedValue(defaultCompany)
  mockPrisma.team.findMany.mockResolvedValue([defaultTeam])
  mockGetAggregatedMetrics.mockResolvedValue(metricsAboveThreshold)
  mockGetContinuityData.mockResolvedValue(continuityAboveThreshold)
  mockPrisma.measure.findFirst.mockResolvedValue(null) // no dedup hit by default
  mockPrisma.measure.create.mockResolvedValue({ id: 'measure-1' })
})

describe('generateSuggestionsForCompany', () => {
  it('creates high_stress measure when avgStress > 7', async () => {
    mockGetAggregatedMetrics.mockResolvedValue({ ...metricsAboveThreshold, avgStress: 7.5 })
    const count = await generateSuggestionsForCompany(COMPANY_ID)
    expect(count).toBeGreaterThan(0)
    expect(mockPrisma.measure.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ companyId: COMPANY_ID, teamId: TEAM_ID, createdBy: 'system' }),
      })
    )
  })

  it('creates low_energy measure when avgEnergy < 5', async () => {
    mockGetAggregatedMetrics.mockResolvedValue({ ...metricsAboveThreshold, avgEnergy: 4.5 })
    const count = await generateSuggestionsForCompany(COMPANY_ID)
    expect(count).toBeGreaterThan(0)
  })

  it('creates low_participation measure when activeUserRate < 0.5', async () => {
    mockGetContinuityData.mockResolvedValue({ ...continuityAboveThreshold, activeUserRate: 0.4 })
    const count = await generateSuggestionsForCompany(COMPANY_ID)
    expect(count).toBeGreaterThan(0)
    // company-wide measure has teamId = null
    expect(mockPrisma.measure.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ teamId: null }),
      })
    )
  })

  it('skips measure when dedup check finds recent match', async () => {
    mockGetAggregatedMetrics.mockResolvedValue({ ...metricsAboveThreshold, avgStress: 8 })
    mockPrisma.measure.findFirst.mockResolvedValue({ id: 'existing-measure' })
    const count = await generateSuggestionsForCompany(COMPANY_ID)
    expect(count).toBe(0)
    expect(mockPrisma.measure.create).not.toHaveBeenCalled()
  })

  it('skips all measures when team metrics are below threshold', async () => {
    mockGetAggregatedMetrics.mockResolvedValue({ ...metricsAboveThreshold, isAboveThreshold: false })
    mockGetContinuityData.mockResolvedValue({ ...continuityAboveThreshold, isAboveThreshold: false })
    const count = await generateSuggestionsForCompany(COMPANY_ID)
    expect(count).toBe(0)
  })

  it('returns 0 when no triggers fire', async () => {
    mockGetAggregatedMetrics.mockResolvedValue({ ...metricsAboveThreshold, avgStress: 5, avgEnergy: 7 })
    mockGetContinuityData.mockResolvedValue({ ...continuityAboveThreshold, activeUserRate: 0.7 })
    const count = await generateSuggestionsForCompany(COMPANY_ID)
    expect(count).toBe(0)
  })
})
