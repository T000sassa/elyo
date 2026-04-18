import { MIN_GROUP_SIZE } from './anonymize'
import { prisma } from './prisma'

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

// ── getReportData ─────────────────────────────────────────────────────────────

export async function getReportData(
  companyId: string,
  period: { year: number; quarter?: number }
): Promise<ReportData> {
  const { from, to, label } = getPeriodBounds(period)
  const prevBounds = getPrevPeriodBounds(period)
  const entryWhere = { companyId, createdAt: { gte: from, lte: to } }

  const [company, employeeCount] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, industry: true, anonymityThreshold: true },
    }),
    prisma.user.count({ where: { companyId, role: 'EMPLOYEE', isActive: true } }),
  ])

  if (!company) throw new Error(`Company ${companyId} not found`)

  const threshold = company.anonymityThreshold ?? MIN_GROUP_SIZE

  const [currentAgg, distinctUsers] = await Promise.all([
    prisma.wellbeingEntry.aggregate({
      where: entryWhere,
      _avg: { score: true, mood: true, stress: true, energy: true },
      _count: { id: true },
    }),
    prisma.wellbeingEntry.groupBy({
      by: ['userId'],
      where: entryWhere,
    }),
  ])

  const checkinsTotal = currentAgg._count.id
  const activeParticipants = distinctUsers.length
  const vitalityIndex = checkinsTotal > 0
    ? Math.round((currentAgg._avg.score ?? 0) * 10) / 10
    : 0

  const prevAgg = await prisma.wellbeingEntry.aggregate({
    where: { companyId, createdAt: { gte: prevBounds.from, lte: prevBounds.to } },
    _avg: { score: true },
    _count: { id: true },
  })
  const prevVitality = prevAgg._count.id > 0
    ? Math.round((prevAgg._avg.score ?? 0) * 10) / 10
    : null
  const vitalityTrend = prevVitality !== null
    ? Math.round((vitalityIndex - prevVitality) * 10) / 10
    : 0

  const participationRate = employeeCount > 0
    ? Math.round((activeParticipants / employeeCount) * 100) / 100
    : 0

  // ── teamBreakdown ────────────────────────────────────────────────────────────
  const teams = await prisma.team.findMany({ where: { companyId } })
  const aboveThresholdTeams: TeamBreakdownEntry[] = []
  let belowMemberCount = 0
  let belowTotalScore = 0
  let belowTotalCount = 0
  let belowDistinctCount = 0

  for (const team of teams) {
    const teamWhere = { companyId, createdAt: { gte: from, lte: to }, user: { teamId: team.id } }
    const [teamAgg, teamDistinct, teamMemberCount] = await Promise.all([
      prisma.wellbeingEntry.aggregate({
        where: teamWhere,
        _avg: { score: true },
        _count: { id: true },
      }),
      prisma.wellbeingEntry.groupBy({ by: ['userId'], where: teamWhere }),
      prisma.user.count({ where: { companyId, teamId: team.id, role: 'EMPLOYEE', isActive: true } }),
    ])

    if (teamAgg._count.id >= threshold) {
      aboveThresholdTeams.push({
        teamName: team.name,
        participationRate: teamMemberCount > 0
          ? Math.round((teamDistinct.length / teamMemberCount) * 100) / 100
          : 0,
        vitalityIndex: Math.round((teamAgg._avg.score ?? 0) * 10) / 10,
        memberCount: teamMemberCount,
      })
    } else {
      belowMemberCount += teamMemberCount
      belowTotalScore += (teamAgg._avg.score ?? 0) * teamAgg._count.id
      belowTotalCount += teamAgg._count.id
      belowDistinctCount += teamDistinct.length
    }
  }

  const belowEntry: TeamBreakdownEntry = {
    teamName: `Weitere Teams (n<${threshold})`,
    participationRate: belowMemberCount > 0
      ? Math.round((belowDistinctCount / belowMemberCount) * 100) / 100
      : 0,
    vitalityIndex: belowTotalCount > 0
      ? Math.round((belowTotalScore / belowTotalCount) * 10) / 10
      : 0,
    memberCount: belowMemberCount,
  }

  // ── trendData ────────────────────────────────────────────────────────────────
  const windows = buildTrendWindows(period, to)
  const trendData: TrendDataPoint[] = []

  for (const w of windows) {
    const windowWhere = { companyId, createdAt: { gte: w.from, lte: w.to } }
    const [windowAgg, windowDistinct] = await Promise.all([
      prisma.wellbeingEntry.aggregate({
        where: windowWhere,
        _avg: { score: true },
        _count: { id: true },
      }),
      prisma.wellbeingEntry.groupBy({ by: ['userId'], where: windowWhere }),
    ])
    const count = windowAgg._count.id
    trendData.push({
      period: w.label,
      vitalityIndex: count >= threshold
        ? Math.round((windowAgg._avg.score ?? 0) * 10) / 10
        : null,
      participationRate: count >= threshold && employeeCount > 0
        ? Math.round((windowDistinct.length / employeeCount) * 100) / 100
        : null,
    })
  }

  // ── csrdMapping ───────────────────────────────────────────────────────────────
  const csrdMapping: CsrdMappingEntry[] = [
    {
      standard: 'ESRS S1-8',
      description: 'Mitarbeiterzufriedenheit',
      elyoMetric: 'vitalityIndex',
      value: `${vitalityIndex}/10`,
    },
    {
      standard: 'ESRS S1-9',
      description: 'Diversität & Inklusion',
      elyoMetric: 'participationRate',
      value: `${Math.round(participationRate * 100)}%`,
    },
    {
      standard: 'ESRS S1-13',
      description: 'Aus- und Weiterbildung',
      elyoMetric: 'checkinsTotal',
      value: `${checkinsTotal} Check-ins`,
    },
  ]

  return {
    company: { name: company.name, employeeCount, industry: company.industry },
    period: { label, from, to },
    kpis: {
      vitalityIndex,
      vitalityTrend,
      activeParticipants,
      participationRate,
      avgEnergy: checkinsTotal > 0 ? Math.round((currentAgg._avg.energy ?? 0) * 10) / 10 : 0,
      avgMood: checkinsTotal > 0 ? Math.round((currentAgg._avg.mood ?? 0) * 10) / 10 : 0,
      avgStress: checkinsTotal > 0 ? Math.round((currentAgg._avg.stress ?? 0) * 10) / 10 : 0,
      checkinsTotal,
    },
    teamBreakdown: [...aboveThresholdTeams, belowEntry],
    trendData,
    csrdMapping,
  }
}
