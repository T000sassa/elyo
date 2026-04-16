import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted ensures these are available when the vi.mock factory runs (which is hoisted)
const { mockAggregate, mockGroupBy, mockCountEntry, mockCountUser } = vi.hoisted(() => ({
  mockAggregate: vi.fn(),
  mockGroupBy: vi.fn(),
  mockCountEntry: vi.fn(),
  mockCountUser: vi.fn(),
}))

vi.mock('../prisma', () => ({
  prisma: {
    wellbeingEntry: {
      aggregate: mockAggregate,
      groupBy: mockGroupBy,
      count: mockCountEntry,
    },
    user: {
      count: mockCountUser,
    },
  },
}))

import {
  getAggregatedMetrics,
  getTrendData,
  getContinuityData,
  currentPeriodKey,
} from '../anonymize'

describe('currentPeriodKey', () => {
  it('returns YYYY-Www format', () => {
    expect(currentPeriodKey()).toMatch(/^\d{4}-W\d{2}$/)
  })

  it('contains the current year', () => {
    const year = new Date().getFullYear().toString()
    expect(currentPeriodKey().startsWith(year)).toBe(true)
  })
})

describe('getAggregatedMetrics', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns isAboveThreshold:false when count is below threshold', async () => {
    mockAggregate.mockResolvedValue({
      _avg: { mood: 7, stress: 3, energy: 8, score: 6 },
      _count: { id: 3 },
    })
    const result = await getAggregatedMetrics('company-1', { threshold: 5 })
    expect(result.isAboveThreshold).toBe(false)
    expect(result.avgScore).toBe(0)
    expect(result.avgMood).toBe(0)
    expect(result.responseCount).toBe(3)
  })

  it('returns rounded averages when count meets threshold', async () => {
    mockAggregate.mockResolvedValue({
      _avg: { mood: 7.15, stress: 3.26, energy: 8.14, score: 6.28 },
      _count: { id: 10 },
    })
    const result = await getAggregatedMetrics('company-1', { threshold: 5 })
    expect(result.isAboveThreshold).toBe(true)
    expect(result.avgScore).toBe(6.3)
    expect(result.avgMood).toBe(7.2)
    expect(result.avgStress).toBe(3.3)
    expect(result.avgEnergy).toBe(8.1)
    expect(result.responseCount).toBe(10)
  })

  it('handles null averages without producing NaN (falls back to 0)', async () => {
    mockAggregate.mockResolvedValue({
      _avg: { mood: null, stress: null, energy: null, score: null },
      _count: { id: 10 },
    })
    const result = await getAggregatedMetrics('company-1', { threshold: 5 })
    expect(result.avgMood).toBe(0)
    expect(result.avgScore).toBe(0)
    expect(isNaN(result.avgMood)).toBe(false)
  })

  it('uses default threshold of 5 when no threshold is provided', async () => {
    mockAggregate.mockResolvedValue({
      _avg: { mood: 7, stress: 3, energy: 8, score: 6 },
      _count: { id: 4 }, // below default threshold of 5
    })
    const result = await getAggregatedMetrics('company-1')
    expect(result.isAboveThreshold).toBe(false)
  })
})

describe('getTrendData', () => {
  beforeEach(() => vi.clearAllMocks())

  it('filters out periods below threshold', async () => {
    mockGroupBy.mockResolvedValue([
      { periodKey: '2026-W16', _avg: { score: 7.5, mood: 8.0, stress: 3.0, energy: 8.5 }, _count: { id: 10 } },
      { periodKey: '2026-W15', _avg: { score: 6.5, mood: 7.0, stress: 4.0, energy: 7.0 }, _count: { id: 8 } },
      { periodKey: '2026-W14', _avg: { score: 5.0, mood: 6.0, stress: 5.0, energy: 5.0 }, _count: { id: 3 } },
    ])
    const result = await getTrendData('company-1', { threshold: 5 })
    expect(result).toHaveLength(2)
    expect(result.find(p => p.period === '2026-W14')).toBeUndefined()
  })

  it('returns periods in ascending order', async () => {
    // Prisma returns descending order; getTrendData reverses it
    mockGroupBy.mockResolvedValue([
      { periodKey: '2026-W16', _avg: { score: 7.5, mood: 8.0, stress: 3.0, energy: 8.5 }, _count: { id: 10 } },
      { periodKey: '2026-W15', _avg: { score: 6.5, mood: 7.0, stress: 4.0, energy: 7.0 }, _count: { id: 8 } },
    ])
    const result = await getTrendData('company-1', { threshold: 5 })
    expect(result[0].period).toBe('2026-W15')
    expect(result[1].period).toBe('2026-W16')
  })

  it('returns empty array when all periods are below threshold', async () => {
    mockGroupBy.mockResolvedValue([
      { periodKey: '2026-W16', _avg: { score: 7.5, mood: 8.0, stress: 3.0, energy: 8.5 }, _count: { id: 2 } },
    ])
    const result = await getTrendData('company-1', { threshold: 5 })
    expect(result).toHaveLength(0)
  })
})

describe('getContinuityData', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns isAboveThreshold:false when totalEmployees is below threshold', async () => {
    mockCountUser.mockResolvedValue(3) // below threshold of 5
    const result = await getContinuityData('company-1', { threshold: 5 })
    expect(result.isAboveThreshold).toBe(false)
    expect(result.continuityRate).toBe(0)
    expect(result.activeUserRate).toBe(0)
    expect(result.totalEmployees).toBe(3)
  })

  it('calculates continuityRate and activeUserRate correctly', async () => {
    mockCountUser.mockResolvedValue(10)   // 10 employees
    mockCountEntry.mockResolvedValue(7)   // 7 checked in this period
    // First groupBy: last 4 periods
    mockGroupBy.mockResolvedValueOnce([
      { periodKey: '2026-W16' },
      { periodKey: '2026-W15' },
      { periodKey: '2026-W14' },
      { periodKey: '2026-W13' },
    ])
    // Second groupBy: users who checked in 3+ of those periods
    mockGroupBy.mockResolvedValueOnce([
      { userId: 'u1', _count: { periodKey: 4 } },
      { userId: 'u2', _count: { periodKey: 3 } },
      { userId: 'u3', _count: { periodKey: 3 } },
    ])

    const result = await getContinuityData('company-1', { threshold: 5 })

    expect(result.isAboveThreshold).toBe(true)
    expect(result.totalEmployees).toBe(10)
    expect(result.checkedInThisPeriod).toBe(7)
    expect(result.continuityRate).toBe(30)  // Math.round(3/10 * 100)
    expect(result.activeUserRate).toBe(70)  // Math.round(7/10 * 100)
  })
})
