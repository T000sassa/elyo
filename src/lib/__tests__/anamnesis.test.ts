import { describe, it, expect } from 'vitest'
import { calcCompletionPct } from '../anamnesis'

describe('calcCompletionPct', () => {
  it('returns 0 for empty profile', () => {
    expect(calcCompletionPct({})).toBe(0)
  })

  it('returns 100 for fully filled profile', () => {
    expect(calcCompletionPct({
      birthYear: 1990,
      biologicalSex: 'male',
      activityLevel: 'moderate',
      sleepQuality: 'good',
      stressTendency: 'medium',
      smokingStatus: 'never',
      nutritionType: 'omnivore',
      chronicPatterns: ['lower back'],
      hasMedication: false,
    })).toBe(100)
  })

  it('counts non-null fields proportionally', () => {
    const pct = calcCompletionPct({ birthYear: 1990, biologicalSex: 'female' })
    // 2 out of 9 fields → floor(2/9 * 100) = 22
    expect(pct).toBe(22)
  })

  it('treats empty chronicPatterns array as not filled', () => {
    const pct = calcCompletionPct({ chronicPatterns: [] })
    expect(pct).toBe(0)
  })

  it('treats non-empty chronicPatterns array as filled', () => {
    const pct = calcCompletionPct({ chronicPatterns: ['stress'] })
    // 1 out of 9 → floor(1/9 * 100) = 11
    expect(pct).toBe(11)
  })
})
