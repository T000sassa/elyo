// ── Types ────────────────────────────────────────────────────────────────────

export interface ReportData {
  company: {
    name: string
    employeeCount: number
    industry: string | null
  }
  period: {
    label: string
    from: Date
    to: Date
  }
  kpis: {
    vitalityIndex: number
    vitalityTrend: number
    activeParticipants: number
    participationRate: number
    avgEnergy: number
    avgMood: number
    avgStress: number
    checkinsTotal: number
  }
  teamBreakdown: TeamBreakdownEntry[]
  trendData: TrendDataPoint[]
  csrdMapping: CsrdMappingEntry[]
}

export interface TeamBreakdownEntry {
  teamName: string
  participationRate: number
  vitalityIndex: number
  memberCount: number
}

export interface TrendDataPoint {
  period: string
  vitalityIndex: number | null
  participationRate: number | null
}

export interface CsrdMappingEntry {
  standard: string
  description: string
  elyoMetric: string
  value: string
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

export function getPeriodBounds(period: { year: number; quarter?: number }): {
  from: Date
  to: Date
  label: string
} {
  if (period.quarter === undefined) {
    return {
      from: new Date(period.year, 0, 1, 0, 0, 0),
      to: new Date(period.year, 11, 31, 23, 59, 59),
      label: String(period.year),
    }
  }
  if (period.quarter < 1 || period.quarter > 4) {
    throw new RangeError(`quarter must be 1–4, got ${period.quarter}`)
  }
  const qStart = (period.quarter - 1) * 3
  return {
    from: new Date(period.year, qStart, 1, 0, 0, 0),
    // day 0 of month qStart+3 = last day of month qStart+2
    to: new Date(period.year, qStart + 3, 0, 23, 59, 59),
    label: `Q${period.quarter} ${period.year}`,
  }
}

function getPrevPeriodBounds(period: { year: number; quarter?: number }): {
  from: Date
  to: Date
} {
  if (period.quarter === undefined) {
    return getPeriodBounds({ year: period.year - 1 })
  }
  const prevQ = period.quarter === 1 ? 4 : period.quarter - 1
  const prevYear = period.quarter === 1 ? period.year - 1 : period.year
  return getPeriodBounds({ year: prevYear, quarter: prevQ })
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function buildTrendWindows(
  period: { year: number; quarter?: number },
  to: Date
): Array<{ from: Date; to: Date; label: string }> {
  if (period.quarter === undefined) {
    return Array.from({ length: 12 }, (_, m) => ({
      from: new Date(period.year, m, 1, 0, 0, 0),
      to: new Date(period.year, m + 1, 0, 23, 59, 59),
      label: `${MONTHS[m]} ${period.year}`,
    }))
  }
  // Quarterly: rolling 12 weeks (84 days) ending at the period's `to` date.
  // The first few days of the quarter may not be covered — by design.
  return Array.from({ length: 12 }, (_, i) => {
    const weeksBack = 11 - i
    const windowTo = new Date(to)
    windowTo.setDate(windowTo.getDate() - weeksBack * 7)
    windowTo.setHours(23, 59, 59, 0)
    const windowFrom = new Date(windowTo)
    windowFrom.setDate(windowFrom.getDate() - 6)
    windowFrom.setHours(0, 0, 0, 0)
    // Simple ordinal week number (not ISO 8601) — consistent with anonymize.ts
    const year = windowFrom.getFullYear()
    const startOfYear = new Date(year, 0, 1)
    const week = Math.ceil(
      ((windowFrom.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
    )
    return {
      from: windowFrom,
      to: windowTo,
      label: `${year}-W${String(week).padStart(2, '0')}`,
    }
  })
}

const BENCHMARKS: Record<string, { avgVitalityIndex: number; avgParticipationRate: number }> = {
  healthcare: { avgVitalityIndex: 6.8, avgParticipationRate: 0.72 },
  tech: { avgVitalityIndex: 7.1, avgParticipationRate: 0.68 },
  retail: { avgVitalityIndex: 6.2, avgParticipationRate: 0.61 },
  default: { avgVitalityIndex: 6.5, avgParticipationRate: 0.65 },
}

export function getIndustryBenchmark(industry: string | null): {
  avgVitalityIndex: number
  avgParticipationRate: number
} {
  const key = industry?.toLowerCase().trim() ?? 'default'
  return BENCHMARKS[key] ?? BENCHMARKS.default
}

// ── getReportData (stub — implemented in Task 2) ──────────────────────────────

export async function getReportData(
  _companyId: string,
  _period: { year: number; quarter?: number }
): Promise<ReportData> {
  throw new Error('Not implemented')
}
