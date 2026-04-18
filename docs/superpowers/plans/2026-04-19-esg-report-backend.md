# ESG Report Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `src/lib/esgReport.ts` with `getReportData()` and `getIndustryBenchmark()`, plus a `GET /api/reports/esg/data` route that serves ESG report data for COMPANY_ADMIN users.

**Architecture:** Pure helpers (`getPeriodBounds`, `getPrevPeriodBounds`, `buildTrendWindows`, `getIndustryBenchmark`) are implemented first with direct tests. `getReportData()` uses direct Prisma date-range queries (not `anonymize.ts` helpers) to aggregate KPIs, team breakdown, and trend data. The API route delegates entirely to `getReportData()`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma (PostgreSQL), Vitest

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/lib/esgReport.ts` | Create | All types + pure helpers + `getReportData` + `getIndustryBenchmark` |
| `src/lib/__tests__/esgReport.test.ts` | Create | Unit tests for lib (vi.mock prisma) |
| `src/app/api/reports/esg/data/route.ts` | Create | GET handler: auth, validation, delegate to `getReportData` |
| `src/app/api/reports/esg/data/__tests__/route.test.ts` | Create | API route tests |

---

## Task 1: Types + Pure Helpers

**Files:**
- Create: `src/lib/esgReport.ts`
- Create: `src/lib/__tests__/esgReport.test.ts`

- [ ] **Step 1: Write failing tests for `getPeriodBounds` and `getIndustryBenchmark`**

Create `src/lib/__tests__/esgReport.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/__tests__/esgReport.test.ts
```

Expected: FAIL with `Cannot find module '../esgReport'`

- [ ] **Step 3: Create `src/lib/esgReport.ts` with types and pure helpers**

```typescript
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
  return Array.from({ length: 12 }, (_, i) => {
    const weeksBack = 11 - i
    const windowTo = new Date(to)
    windowTo.setDate(windowTo.getDate() - weeksBack * 7)
    windowTo.setHours(23, 59, 59, 0)
    const windowFrom = new Date(windowTo)
    windowFrom.setDate(windowFrom.getDate() - 6)
    windowFrom.setHours(0, 0, 0, 0)
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
```

- [ ] **Step 4: Run tests — pure helper tests should pass, getReportData stub is fine**

```bash
npx vitest run src/lib/__tests__/esgReport.test.ts
```

Expected: PASS (9 tests pass, `getReportData` tests not written yet)

- [ ] **Step 5: Commit**

```bash
git add src/lib/esgReport.ts src/lib/__tests__/esgReport.test.ts
git commit -m "feat: add esgReport types + pure helpers (getPeriodBounds, getIndustryBenchmark)"
```

---

## Task 2: `getReportData` Implementation + Tests

**Files:**
- Modify: `src/lib/esgReport.ts` — replace stub with full implementation
- Modify: `src/lib/__tests__/esgReport.test.ts` — add getReportData tests

- [ ] **Step 1: Add mock setup and getReportData tests to the test file**

Add to the top of `src/lib/__tests__/esgReport.test.ts` (before the existing imports):

```typescript
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
```

Replace the existing `import { getPeriodBounds, getIndustryBenchmark } from '../esgReport'` with:

```typescript
import { getPeriodBounds, getIndustryBenchmark, getReportData } from '../esgReport'
```

Add `beforeEach` and `getReportData` describe blocks after the existing `getIndustryBenchmark` describe block:

```typescript
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/lib/__tests__/esgReport.test.ts
```

Expected: FAIL — `getReportData` throws `'Not implemented'`

- [ ] **Step 3: Implement `getReportData` in `src/lib/esgReport.ts`**

Replace the stub `getReportData` at the bottom of `src/lib/esgReport.ts` with the full implementation:

```typescript
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
    : 0
  const vitalityTrend = Math.round((vitalityIndex - prevVitality) * 10) / 10

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
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/lib/__tests__/esgReport.test.ts
```

Expected: PASS (all tests pass)

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
npx vitest run
```

Expected: All tests pass, no TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/esgReport.ts src/lib/__tests__/esgReport.test.ts
git commit -m "feat: implement getReportData + getIndustryBenchmark with full test suite"
```

---

## Task 3: API Route + Tests

**Files:**
- Create: `src/app/api/reports/esg/data/route.ts`
- Create: `src/app/api/reports/esg/data/__tests__/route.test.ts`

- [ ] **Step 1: Write failing API route tests**

Create `src/app/api/reports/esg/data/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockGetReportData = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/esgReport', () => ({ getReportData: mockGetReportData }))

const { GET } = await import('../route')

const mockAdminSession = { user: { id: 'admin-1', role: 'COMPANY_ADMIN', companyId: 'company-1' } }

const mockReportData = {
  company: { name: 'ACME GmbH', employeeCount: 10, industry: 'tech' },
  period: { label: 'Q1 2026', from: new Date('2026-01-01'), to: new Date('2026-03-31') },
  kpis: {
    vitalityIndex: 7.0, vitalityTrend: 0.5, activeParticipants: 8,
    participationRate: 0.80, avgEnergy: 8.0, avgMood: 7.5, avgStress: 3.0, checkinsTotal: 8,
  },
  teamBreakdown: [],
  trendData: [],
  csrdMapping: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(mockAdminSession)
  mockGetReportData.mockResolvedValue(mockReportData)
})

describe('GET /api/reports/esg/data', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new Request('http://localhost/api/reports/esg/data?year=2026')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when role is not COMPANY_ADMIN', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'emp-1', role: 'EMPLOYEE', companyId: 'company-1' } })
    const req = new Request('http://localhost/api/reports/esg/data?year=2026')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 when year is missing', async () => {
    const req = new Request('http://localhost/api/reports/esg/data')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('year_required')
  })

  it('returns 400 when year is not a valid integer', async () => {
    const req = new Request('http://localhost/api/reports/esg/data?year=abc')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('year_required')
  })

  it('returns 400 when quarter is outside 1-4', async () => {
    const req = new Request('http://localhost/api/reports/esg/data?year=2026&quarter=5')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_quarter')
  })

  it('returns 400 when quarter is 0', async () => {
    const req = new Request('http://localhost/api/reports/esg/data?year=2026&quarter=0')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 with report data for valid annual request', async () => {
    const req = new Request('http://localhost/api/reports/esg/data?year=2026')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.company.name).toBe('ACME GmbH')
    expect(mockGetReportData).toHaveBeenCalledWith('company-1', { year: 2026 })
  })

  it('returns 200 with report data for valid quarterly request', async () => {
    const req = new Request('http://localhost/api/reports/esg/data?year=2026&quarter=1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockGetReportData).toHaveBeenCalledWith('company-1', { year: 2026, quarter: 1 })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/app/api/reports/esg/data/__tests__/route.test.ts
```

Expected: FAIL with `Cannot find module '../route'`

- [ ] **Step 3: Create the API route**

Create `src/app/api/reports/esg/data/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getReportData } from '@/lib/esgReport'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'COMPANY_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get('year')
  const year = yearParam ? parseInt(yearParam, 10) : NaN
  if (!yearParam || isNaN(year)) {
    return NextResponse.json({ error: 'year_required' }, { status: 400 })
  }

  const quarterParam = searchParams.get('quarter')
  let quarter: number | undefined
  if (quarterParam !== null) {
    quarter = parseInt(quarterParam, 10)
    if (isNaN(quarter) || quarter < 1 || quarter > 4) {
      return NextResponse.json({ error: 'invalid_quarter' }, { status: 400 })
    }
  }

  const data = await getReportData(session.user.companyId, { year, quarter })
  return NextResponse.json({ data })
}
```

- [ ] **Step 4: Run API route tests**

```bash
npx vitest run src/app/api/reports/esg/data/__tests__/route.test.ts
```

Expected: PASS (9 tests pass)

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/app/api/reports/esg/data/route.ts src/app/api/reports/esg/data/__tests__/route.test.ts
git commit -m "feat: add GET /api/reports/esg/data route (COMPANY_ADMIN only)"
```
