import { describe, it, expect } from 'vitest'
import { generateComment } from '../EsgReportPdf'

const baseKpis = {
  vitalityIndex: 0,
  vitalityTrend: 0,
  activeParticipants: 0,
  participationRate: 0,
  avgEnergy: 0,
  avgMood: 0,
  avgStress: 0,
  checkinsTotal: 0,
}

describe('generateComment', () => {
  it('returns high-vitality message when index >= 7.5', () => {
    const result = generateComment({ ...baseKpis, vitalityIndex: 7.5, participationRate: 0.8 })
    expect(result).toBe('Sehr guter Vitalitätszustand im Berichtszeitraum.')
  })

  it('returns solid message when index is 6.0–7.4', () => {
    const result = generateComment({ ...baseKpis, vitalityIndex: 7.0, participationRate: 0.8 })
    expect(result).toBe('Solider Vitalitätszustand im Berichtszeitraum.')
  })

  it('returns improvement message when index is 0.1–5.9', () => {
    const result = generateComment({ ...baseKpis, vitalityIndex: 5.5, participationRate: 0.8 })
    expect(result).toBe('Verbesserungspotenzial beim Vitalitätszustand.')
  })

  it('returns no-data message when index is 0', () => {
    const result = generateComment({ ...baseKpis, vitalityIndex: 0, participationRate: 0 })
    expect(result).toBe('Keine Daten für den Berichtszeitraum vorhanden.')
  })

  it('appends participation warning when rate is > 0 and < 0.6', () => {
    const result = generateComment({ ...baseKpis, vitalityIndex: 7.0, participationRate: 0.55 })
    expect(result).toBe(
      'Solider Vitalitätszustand im Berichtszeitraum. Partizipationsrate unter 60 % – Engagement der Mitarbeiter fördern.'
    )
  })

  it('does not append participation warning when rate is exactly 0.6', () => {
    const result = generateComment({ ...baseKpis, vitalityIndex: 7.0, participationRate: 0.6 })
    expect(result).toBe('Solider Vitalitätszustand im Berichtszeitraum.')
  })

  it('does not append participation warning when rate is 0 (no data)', () => {
    const result = generateComment({ ...baseKpis, vitalityIndex: 0, participationRate: 0 })
    expect(result).not.toContain('Partizipationsrate')
  })
})
