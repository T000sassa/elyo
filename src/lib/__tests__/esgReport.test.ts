import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockAggregate, mockGroupBy, mockUserCount, mockTeamFindMany, mockCompanyFindUnique } =
  vi.hoisted(() => ({
    mockAggregate: vi.fn(),
    mockGroupBy: vi.fn(),
    mockUserCount: vi.fn(),
    mockTeamFindMany: vi.fn(),
    mockCompanyFindUnique: vi.fn(),
  }))

vi.mock('../prisma', () => ({
  prisma: {
    wellbeingEntry: {
      aggregate: mockAggregate,
      groupBy: mockGroupBy,
    },
    user: {
      count: mockUserCount,
    },
    team: {
      findMany: mockTeamFindMany,
    },
    company: {
      findUnique: mockCompanyFindUnique,
    },
  },
}))

// getPeriodBounds is exported from esgReport for testing
import { getPeriodBounds, getIndustryBenchmark, getReportData } from '../esgReport'

describe('getPeriodBounds', () => {
  it('returns full year bounds and label for annual report', () => {
    const { from, to, label } = getPeriodBounds({ year: 2026 })
    expect(from.getFullYear()).toBe(2026)
    expect(from.getMonth()).toBe(0)
    expect(from.getDate()).toBe(1)
    expect(to.getFullYear()).toBe(2026)
    expect(to.getMonth()).toBe(11)
    expect(to.getDate()).toBe(31)
    expect(to.getHours()).toBe(23)
    expect(label).toBe('2026')
  })

  it('returns Q1 bounds: Jan 1 to Mar 31', () => {
    const { from, to, label } = getPeriodBounds({ year: 2026, quarter: 1 })
    expect(from.getMonth()).toBe(0)
    expect(from.getDate()).toBe(1)
    expect(to.getMonth()).toBe(2)
    expect(to.getDate()).toBe(31)
    expect(label).toBe('Q1 2026')
  })

  it('returns Q2 bounds: Apr 1 to Jun 30', () => {
    const { from, to, label } = getPeriodBounds({ year: 2026, quarter: 2 })
    expect(from.getMonth()).toBe(3)
    expect(from.getDate()).toBe(1)
    expect(to.getMonth()).toBe(5)
    expect(to.getDate()).toBe(30)
    expect(label).toBe('Q2 2026')
  })

  it('returns Q3 bounds: Jul 1 to Sep 30', () => {
    const { from, to } = getPeriodBounds({ year: 2026, quarter: 3 })
    expect(from.getMonth()).toBe(6)
    expect(to.getMonth()).toBe(8)
    expect(to.getDate()).toBe(30)
  })

  it('returns Q4 bounds: Oct 1 to Dec 31', () => {
    const { from, to, label } = getPeriodBounds({ year: 2026, quarter: 4 })
    expect(from.getMonth()).toBe(9)
    expect(from.getDate()).toBe(1)
    expect(to.getMonth()).toBe(11)
    expect(to.getDate()).toBe(31)
    expect(label).toBe('Q4 2026')
  })
})

describe('getIndustryBenchmark', () => {
  it('returns correct values for known industry', () => {
    expect(getIndustryBenchmark('tech')).toEqual({ avgVitalityIndex: 7.1, avgParticipationRate: 0.68 })
    expect(getIndustryBenchmark('healthcare')).toEqual({ avgVitalityIndex: 6.8, avgParticipationRate: 0.72 })
    expect(getIndustryBenchmark('retail')).toEqual({ avgVitalityIndex: 6.2, avgParticipationRate: 0.61 })
  })

  it('normalizes input to lowercase', () => {
    expect(getIndustryBenchmark('TECH')).toEqual(getIndustryBenchmark('tech'))
    expect(getIndustryBenchmark('  Tech  ')).toEqual(getIndustryBenchmark('tech'))
  })

  it('returns default benchmark for unknown industry', () => {
    expect(getIndustryBenchmark('aerospace')).toEqual({ avgVitalityIndex: 6.5, avgParticipationRate: 0.65 })
  })

  it('returns default benchmark for null', () => {
    expect(getIndustryBenchmark(null)).toEqual({ avgVitalityIndex: 6.5, avgParticipationRate: 0.65 })
  })
})

// Default mock setup used by all getReportData tests.
// Individual tests override with mockResolvedValueOnce for specific calls.
function setupDefaultMocks() {
  mockCompanyFindUnique.mockResolvedValue({
    name: 'ACME GmbH',
    industry: 'tech',
    anonymityThreshold: 5,
  })
  mockUserCount.mockResolvedValue(10)
  mockTeamFindMany.mockResolvedValue([])
  // default aggregate: 6 entries, all scores 6.0 (used by prev period + trend windows)
  mockAggregate.mockResolvedValue({
    _avg: { score: 6.0, mood: 6.0, stress: 4.0, energy: 6.0 },
    _count: { id: 6 },
  })
  // default groupBy: 4 distinct users (used by trend windows)
  mockGroupBy.mockResolvedValue([
    { userId: 'u1' }, { userId: 'u2' }, { userId: 'u3' }, { userId: 'u4' },
  ])
}

describe('getReportData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('returns correct company info', async () => {
    mockAggregate.mockResolvedValueOnce({
      _avg: { score: 7.0, mood: 7.5, stress: 3.0, energy: 8.0 },
      _count: { id: 8 },
    })
    mockGroupBy.mockResolvedValueOnce(
      Array.from({ length: 8 }, (_, i) => ({ userId: `u${i}` }))
    )
    const result = await getReportData('company-1', { year: 2026, quarter: 1 })
    expect(result.company.name).toBe('ACME GmbH')
    expect(result.company.industry).toBe('tech')
    expect(result.company.employeeCount).toBe(10)
  })

  it('returns correct period label and bounds for quarterly report', async () => {
    mockAggregate.mockResolvedValueOnce({
      _avg: { score: 7.0, mood: 7.5, stress: 3.0, energy: 8.0 },
      _count: { id: 8 },
    })
    mockGroupBy.mockResolvedValueOnce([{ userId: 'u1' }])
    const result = await getReportData('company-1', { year: 2026, quarter: 1 })
    expect(result.period.label).toBe('Q1 2026')
    expect(result.period.from.getMonth()).toBe(0)
    expect(result.period.to.getMonth()).toBe(2)
  })

  it('calculates KPIs correctly from aggregated entries', async () => {
    // Call 1: current period aggregate
    mockAggregate.mockResolvedValueOnce({
      _avg: { score: 7.0, mood: 7.5, stress: 3.2, energy: 8.1 },
      _count: { id: 8 },
    })
    // Call 1: current period distinct users
    mockGroupBy.mockResolvedValueOnce(
      Array.from({ length: 8 }, (_, i) => ({ userId: `u${i}` }))
    )
    // Call 2 (aggregate): prev period — score 6.5
    mockAggregate.mockResolvedValueOnce({
      _avg: { score: 6.5 },
      _count: { id: 5 },
    })
    // Remaining calls (trend windows) use defaults from setupDefaultMocks

    const result = await getReportData('company-1', { year: 2026, quarter: 1 })

    expect(result.kpis.vitalityIndex).toBe(7.0)
    expect(result.kpis.vitalityTrend).toBe(0.5)       // 7.0 - 6.5
    expect(result.kpis.activeParticipants).toBe(8)
    expect(result.kpis.participationRate).toBe(0.80)   // 8 / 10
    expect(result.kpis.avgMood).toBe(7.5)
    expect(result.kpis.avgStress).toBe(3.2)
    expect(result.kpis.avgEnergy).toBe(8.1)
    expect(result.kpis.checkinsTotal).toBe(8)
  })

  it('returns all zeros when no entries exist in period', async () => {
    mockAggregate.mockResolvedValueOnce({
      _avg: { score: null, mood: null, stress: null, energy: null },
      _count: { id: 0 },
    })
    mockGroupBy.mockResolvedValueOnce([])
    // prev period also 0
    mockAggregate.mockResolvedValueOnce({
      _avg: { score: null },
      _count: { id: 0 },
    })

    const result = await getReportData('company-1', { year: 2026, quarter: 1 })

    expect(result.kpis.vitalityIndex).toBe(0)
    expect(result.kpis.vitalityTrend).toBe(0)
    expect(result.kpis.activeParticipants).toBe(0)
    expect(result.kpis.participationRate).toBe(0)
    expect(result.kpis.checkinsTotal).toBe(0)
  })

  it('vitalityTrend is 0 when prev period has no entries', async () => {
    mockAggregate.mockResolvedValueOnce({
      _avg: { score: 7.0, mood: 7.5, stress: 3.0, energy: 8.0 },
      _count: { id: 8 },
    })
    mockGroupBy.mockResolvedValueOnce(Array.from({ length: 8 }, (_, i) => ({ userId: `u${i}` })))
    // prev period: 0 entries
    mockAggregate.mockResolvedValueOnce({ _avg: { score: null }, _count: { id: 0 } })

    const result = await getReportData('company-1', { year: 2026, quarter: 1 })

    expect(result.kpis.vitalityIndex).toBe(7.0)
    expect(result.kpis.vitalityTrend).toBe(0)  // no baseline → no trend
  })

  it('teamBreakdown: team above threshold appears individually', async () => {
    mockTeamFindMany.mockResolvedValue([
      { id: 'team-1', name: 'Engineering', companyId: 'company-1' },
    ])
    // KPI current period
    mockAggregate.mockResolvedValueOnce({ _avg: { score: 7.0, mood: 7.5, stress: 3.0, energy: 8.0 }, _count: { id: 8 } })
    mockGroupBy.mockResolvedValueOnce(Array.from({ length: 8 }, (_, i) => ({ userId: `u${i}` })))
    // prev period
    mockAggregate.mockResolvedValueOnce({ _avg: { score: 6.5 }, _count: { id: 5 } })
    // team-1 aggregate: 6 entries (>= threshold 5) → appears individually
    mockAggregate.mockResolvedValueOnce({ _avg: { score: 7.5 }, _count: { id: 6 } })
    mockGroupBy.mockResolvedValueOnce([{ userId: 'u1' }, { userId: 'u2' }, { userId: 'u3' }])
    // team-1 member count
    mockUserCount
      .mockResolvedValueOnce(10)  // employeeCount
      .mockResolvedValueOnce(4)   // team-1 memberCount
    // remaining calls: default (trend windows)

    const result = await getReportData('company-1', { year: 2026, quarter: 1 })

    const engineering = result.teamBreakdown.find(t => t.teamName === 'Engineering')
    expect(engineering).toBeDefined()
    expect(engineering!.vitalityIndex).toBe(7.5)
    expect(engineering!.memberCount).toBe(4)
    expect(engineering!.participationRate).toBe(0.75) // 3 distinct / 4 members
  })

  it('teamBreakdown: team below threshold goes into Sammel-Eintrag', async () => {
    mockTeamFindMany.mockResolvedValue([
      { id: 'team-1', name: 'Marketing', companyId: 'company-1' },
    ])
    // KPI current period
    mockAggregate.mockResolvedValueOnce({ _avg: { score: 7.0, mood: 7.5, stress: 3.0, energy: 8.0 }, _count: { id: 8 } })
    mockGroupBy.mockResolvedValueOnce(Array.from({ length: 8 }, (_, i) => ({ userId: `u${i}` })))
    // prev period
    mockAggregate.mockResolvedValueOnce({ _avg: { score: 6.5 }, _count: { id: 5 } })
    // team-1 aggregate: 3 entries (< threshold 5) → goes to Sammel-Eintrag
    mockAggregate.mockResolvedValueOnce({ _avg: { score: 6.0 }, _count: { id: 3 } })
    mockGroupBy.mockResolvedValueOnce([{ userId: 'u1' }, { userId: 'u2' }])
    mockUserCount
      .mockResolvedValueOnce(10)  // employeeCount
      .mockResolvedValueOnce(3)   // team-1 memberCount
    // remaining: default (trend)

    const result = await getReportData('company-1', { year: 2026, quarter: 1 })

    const sammel = result.teamBreakdown.find(t => t.teamName.startsWith('Weitere Teams'))
    expect(sammel).toBeDefined()
    expect(sammel!.memberCount).toBe(3)
    const marketing = result.teamBreakdown.find(t => t.teamName === 'Marketing')
    expect(marketing).toBeUndefined()
  })

  it('teamBreakdown: Sammel-Eintrag is always present even with 0 teams below threshold', async () => {
    mockTeamFindMany.mockResolvedValue([])
    mockAggregate.mockResolvedValueOnce({ _avg: { score: 7.0, mood: 7.5, stress: 3.0, energy: 8.0 }, _count: { id: 8 } })
    mockGroupBy.mockResolvedValueOnce([{ userId: 'u1' }])
    mockAggregate.mockResolvedValueOnce({ _avg: { score: 6.5 }, _count: { id: 5 } })

    const result = await getReportData('company-1', { year: 2026, quarter: 1 })

    const sammel = result.teamBreakdown.find(t => t.teamName.startsWith('Weitere Teams'))
    expect(sammel).toBeDefined()
    expect(sammel!.memberCount).toBe(0)
  })

  it('trendData: annual report produces 12 monthly points', async () => {
    mockAggregate.mockResolvedValueOnce({ _avg: { score: 7.0, mood: 7.5, stress: 3.0, energy: 8.0 }, _count: { id: 8 } })
    mockGroupBy.mockResolvedValueOnce([{ userId: 'u1' }])
    mockAggregate.mockResolvedValueOnce({ _avg: { score: 6.5 }, _count: { id: 5 } })

    const result = await getReportData('company-1', { year: 2026 })

    expect(result.trendData).toHaveLength(12)
    expect(result.trendData[0].period).toBe('Jan 2026')
    expect(result.trendData[11].period).toBe('Dec 2026')
  })

  it('trendData: quarterly report produces 12 weekly points with ISO week labels', async () => {
    mockAggregate.mockResolvedValueOnce({ _avg: { score: 7.0, mood: 7.5, stress: 3.0, energy: 8.0 }, _count: { id: 8 } })
    mockGroupBy.mockResolvedValueOnce([{ userId: 'u1' }])
    mockAggregate.mockResolvedValueOnce({ _avg: { score: 6.5 }, _count: { id: 5 } })

    const result = await getReportData('company-1', { year: 2026, quarter: 1 })

    expect(result.trendData).toHaveLength(12)
    expect(result.trendData[0].period).toMatch(/^\d{4}-W\d{2}$/)
  })

  it('trendData: points with fewer entries than threshold have null vitalityIndex', async () => {
    mockAggregate.mockResolvedValueOnce({ _avg: { score: 7.0, mood: 7.5, stress: 3.0, energy: 8.0 }, _count: { id: 8 } })
    mockGroupBy.mockResolvedValueOnce([{ userId: 'u1' }])
    mockAggregate.mockResolvedValueOnce({ _avg: { score: 6.5 }, _count: { id: 5 } })
    // Make all trend window aggregates return below-threshold count
    mockAggregate.mockResolvedValue({ _avg: { score: 6.0 }, _count: { id: 2 } })

    const result = await getReportData('company-1', { year: 2026, quarter: 1 })

    expect(result.trendData.every(p => p.vitalityIndex === null)).toBe(true)
    expect(result.trendData.every(p => p.participationRate === null)).toBe(true)
  })

  it('csrdMapping contains 3 ESRS entries with dynamic values', async () => {
    mockAggregate.mockResolvedValueOnce({ _avg: { score: 7.2, mood: 7.5, stress: 3.0, energy: 8.0 }, _count: { id: 10 } })
    mockGroupBy.mockResolvedValueOnce(Array.from({ length: 8 }, (_, i) => ({ userId: `u${i}` })))
    mockAggregate.mockResolvedValueOnce({ _avg: { score: 6.5 }, _count: { id: 5 } })

    const result = await getReportData('company-1', { year: 2026, quarter: 1 })

    expect(result.csrdMapping).toHaveLength(3)
    expect(result.csrdMapping[0].standard).toBe('ESRS S1-8')
    expect(result.csrdMapping[0].value).toBe('7.2/10')
    expect(result.csrdMapping[1].standard).toBe('ESRS S1-9')
    expect(result.csrdMapping[1].value).toBe('80%')   // 8/10 = 0.80 → 80%
    expect(result.csrdMapping[2].standard).toBe('ESRS S1-13')
    expect(result.csrdMapping[2].value).toBe('10 Check-ins')
  })
})
