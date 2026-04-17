import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUpsert, mockCreate, mockFindFirst, mockFindUnique } = vi.hoisted(() => ({
  mockUpsert:     vi.fn(),
  mockCreate:     vi.fn(),
  mockFindFirst:  vi.fn(),
  mockFindUnique: vi.fn(),
}))

vi.mock('../prisma', () => ({
  prisma: {
    userPoints:       { upsert: mockUpsert, findUnique: mockFindUnique },
    pointTransaction: { create: mockCreate, findFirst: mockFindFirst },
  },
}))

import { POINT_RULES, LEVEL_THRESHOLDS, calcLevel, getPrivileges } from '../points'

describe('calcLevel', () => {
  it('returns STARTER for 0 points', () => {
    expect(calcLevel(0)).toBe('STARTER')
  })

  it('returns STARTER for 29 points', () => {
    expect(calcLevel(29)).toBe('STARTER')
  })

  it('returns BRONZE for 30 points', () => {
    expect(calcLevel(30)).toBe('BRONZE')
  })

  it('returns SILVER for 100 points', () => {
    expect(calcLevel(100)).toBe('SILVER')
  })

  it('returns GOLD for 250 points', () => {
    expect(calcLevel(250)).toBe('GOLD')
  })

  it('returns PLATINUM for 600 points', () => {
    expect(calcLevel(600)).toBe('PLATINUM')
  })

  it('returns PLATINUM for very high points', () => {
    expect(calcLevel(9999)).toBe('PLATINUM')
  })
})

describe('POINT_RULES', () => {
  it('awards 2 for daily_checkin', () => {
    expect(POINT_RULES.daily_checkin).toBe(2)
  })

  it('awards 5 for survey_complete', () => {
    expect(POINT_RULES.survey_complete).toBe(5)
  })

  it('awards 10 for wearable_connected', () => {
    expect(POINT_RULES.wearable_connected).toBe(10)
  })
})

describe('LEVEL_THRESHOLDS', () => {
  it('STARTER starts at 0', () => {
    expect(LEVEL_THRESHOLDS.STARTER).toBe(0)
  })

  it('GOLD starts at 250', () => {
    expect(LEVEL_THRESHOLDS.GOLD).toBe(250)
  })
})

describe('getPrivileges', () => {
  it('STARTER has at least 2 privileges', () => {
    expect(getPrivileges('STARTER').length).toBeGreaterThanOrEqual(2)
  })

  it('SILVER has more privileges than STARTER', () => {
    expect(getPrivileges('SILVER').length).toBeGreaterThan(getPrivileges('STARTER').length)
  })

  it('all privilege objects have id, label, locked fields', () => {
    const privs = getPrivileges('SILVER')
    for (const p of privs) {
      expect(p).toHaveProperty('id')
      expect(p).toHaveProperty('label')
      expect(p).toHaveProperty('locked')
    }
  })

  it('GOLD privileges not locked for GOLD level', () => {
    const goldPrivs = getPrivileges('GOLD').filter(p => p.requiredLevel === 'GOLD')
    expect(goldPrivs.every(p => !p.locked)).toBe(true)
  })

  it('GOLD privileges are locked for SILVER level', () => {
    const silverView = getPrivileges('SILVER').filter(p => p.requiredLevel === 'GOLD')
    expect(silverView.every(p => p.locked)).toBe(true)
  })
})
