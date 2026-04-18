import { describe, it, expect } from 'vitest'

// getPeriodBounds is exported from esgReport for testing
import { getPeriodBounds, getIndustryBenchmark } from '../esgReport'

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
