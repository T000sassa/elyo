import { describe, it, expect } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import type { ReportData } from '@/lib/esgReport'
import EsgReportPdf from '../EsgReportPdf'
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

const mockReportData: ReportData = {
  company: { name: 'Test GmbH', employeeCount: 20, industry: 'tech' },
  period: {
    label: 'Q1 2026',
    from: new Date('2026-01-01'),
    to: new Date('2026-03-31'),
  },
  kpis: {
    vitalityIndex: 7.2,
    vitalityTrend: 0.3,
    activeParticipants: 16,
    participationRate: 0.8,
    avgEnergy: 7.5,
    avgMood: 7.8,
    avgStress: 3.2,
    checkinsTotal: 80,
  },
  teamBreakdown: [
    { teamName: 'Engineering', participationRate: 0.9, vitalityIndex: 7.5, memberCount: 10 },
    { teamName: 'Weitere Teams (n<5)', participationRate: 0.7, vitalityIndex: 6.9, memberCount: 10 },
  ],
  trendData: Array.from({ length: 12 }, (_, i) => ({
    period: `2026-W${String(i + 1).padStart(2, '0')}`,
    vitalityIndex: 7.0,
    participationRate: 0.75,
  })),
  csrdMapping: [
    { standard: 'ESRS S1-8', description: 'Mitarbeiterzufriedenheit', elyoMetric: 'vitalityIndex', value: '7.2/10' },
    { standard: 'ESRS S1-9', description: 'Diversität & Inklusion', elyoMetric: 'participationRate', value: '80%' },
    { standard: 'ESRS S1-13', description: 'Aus- und Weiterbildung', elyoMetric: 'checkinsTotal', value: '80 Check-ins' },
  ],
}

describe('EsgReportPdf', () => {
  it('renders to a non-empty PDF buffer without errors', async () => {
    const buffer = await renderToBuffer(<EsgReportPdf data={mockReportData} />)
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(100)
  }, 15000)
})
