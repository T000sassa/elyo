# ESG PDF Rendering & Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an ESG Vitalitätsbericht PDF that COMPANY_ADMINs can download from `/company/reports` by selecting a year/quarter and clicking a button.

**Architecture:** `@react-pdf/renderer` renders a 4-page PDF document server-side in a Next.js API route. The reports page is a Client Component with a period picker (`useState`) and a download button that calls `window.open(url)`. `generateComment` is a pure exported function tested independently; the PDF component is smoke-tested with `renderToBuffer`.

**Tech Stack:** Next.js 14 App Router, TypeScript, `@react-pdf/renderer`, Vitest (`@vitejs/plugin-react` for TSX support), `@/lib/esgReport.ts` (Phase 2.4)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/components/reports/EsgReportPdf.tsx` | Create | 4-page React-PDF document + `generateComment` export |
| `src/components/reports/__tests__/EsgReportPdf.test.tsx` | Create | `generateComment` unit tests + `renderToBuffer` smoke test |
| `src/app/api/reports/esg/pdf/route.ts` | Create | GET route: auth, param validation, renderToBuffer, PDF response |
| `src/app/api/reports/esg/pdf/__tests__/route.test.ts` | Create | API route tests (auth, validation, 200, 500) |
| `src/app/(app)/company/reports/page.tsx` | Replace | Period picker + download button (Client Component) |
| `vitest.config.ts` | Modify | Add `@vitejs/plugin-react` for TSX support |
| `package.json` | Modify | Add `@react-pdf/renderer` dependency |

---

## Task 1: Install Dependencies + Configure Vitest

**Files:**
- Modify: `package.json`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Install `@react-pdf/renderer`**

```bash
npm install @react-pdf/renderer
```

Expected: Package added to `dependencies` in `package.json`.

- [ ] **Step 2: Install `@vitejs/plugin-react` (devDependency — needed for TSX in Vitest)**

```bash
npm install --save-dev @vitejs/plugin-react
```

Expected: Package added to `devDependencies`.

- [ ] **Step 3: Update `vitest.config.ts` to add the React plugin**

Current content of `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/auth.ts', 'src/lib/prisma.ts'],
      reporter: ['text', 'lcov'],
    },
  },
})
```

Replace with:
```typescript
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/auth.ts', 'src/lib/prisma.ts'],
      reporter: ['text', 'lcov'],
    },
  },
})
```

- [ ] **Step 4: Verify existing tests still pass**

```bash
npx vitest run
```

Expected: All existing tests pass (156 tests). If any fail due to the React plugin, check for conflicting transform configurations.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: install @react-pdf/renderer + configure vitest for TSX"
```

---

## Task 2: `generateComment` + Shell `EsgReportPdf.tsx`

**Files:**
- Create: `src/components/reports/EsgReportPdf.tsx` (shell with `generateComment` only)
- Create: `src/components/reports/__tests__/EsgReportPdf.test.tsx`

- [ ] **Step 1: Write failing tests for `generateComment`**

Create `src/components/reports/__tests__/EsgReportPdf.test.tsx`:

```typescript
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/components/reports/__tests__/EsgReportPdf.test.tsx
```

Expected: FAIL with `Cannot find module '../EsgReportPdf'`

- [ ] **Step 3: Create shell `src/components/reports/EsgReportPdf.tsx` with `generateComment`**

```typescript
import { Document, Page } from '@react-pdf/renderer'
import type { ReportData } from '@/lib/esgReport'

export function generateComment(kpis: ReportData['kpis']): string {
  let text: string
  if (kpis.vitalityIndex >= 7.5) {
    text = 'Sehr guter Vitalitätszustand im Berichtszeitraum.'
  } else if (kpis.vitalityIndex >= 6.0) {
    text = 'Solider Vitalitätszustand im Berichtszeitraum.'
  } else if (kpis.vitalityIndex > 0) {
    text = 'Verbesserungspotenzial beim Vitalitätszustand.'
  } else {
    text = 'Keine Daten für den Berichtszeitraum vorhanden.'
  }
  if (kpis.participationRate > 0 && kpis.participationRate < 0.6) {
    text += ' Partizipationsrate unter 60 % – Engagement der Mitarbeiter fördern.'
  }
  return text
}

export default function EsgReportPdf({ data: _data }: { data: ReportData }) {
  return <Document><Page size="A4" /></Document>
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/reports/__tests__/EsgReportPdf.test.tsx
```

Expected: 7/7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/reports/EsgReportPdf.tsx src/components/reports/__tests__/EsgReportPdf.test.tsx
git commit -m "feat: add generateComment helper + EsgReportPdf shell"
```

---

## Task 3: Full `EsgReportPdf.tsx` + Smoke Test

**Files:**
- Modify: `src/components/reports/EsgReportPdf.tsx` — replace stub with full 4-page component
- Modify: `src/components/reports/__tests__/EsgReportPdf.test.tsx` — add smoke test

- [ ] **Step 1: Add smoke test to the test file**

Add this `describe` block after the existing `generateComment` describe block in `src/components/reports/__tests__/EsgReportPdf.test.tsx`:

```typescript
import { renderToBuffer } from '@react-pdf/renderer'
import type { ReportData } from '@/lib/esgReport'
import EsgReportPdf from '../EsgReportPdf'

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
  }, 15000) // PDF rendering can be slow
})
```

- [ ] **Step 2: Run smoke test to confirm it fails (stub renders an empty page)**

```bash
npx vitest run src/components/reports/__tests__/EsgReportPdf.test.tsx
```

Expected: The `generateComment` tests pass, the smoke test may pass with the stub (empty buffer is still a buffer) or fail due to `length > 100` — either way, note the result and proceed to implement the full component.

- [ ] **Step 3: Implement the full `EsgReportPdf.tsx`**

Replace the entire content of `src/components/reports/EsgReportPdf.tsx`:

```typescript
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { ReportData } from '@/lib/esgReport'

export function generateComment(kpis: ReportData['kpis']): string {
  let text: string
  if (kpis.vitalityIndex >= 7.5) {
    text = 'Sehr guter Vitalitätszustand im Berichtszeitraum.'
  } else if (kpis.vitalityIndex >= 6.0) {
    text = 'Solider Vitalitätszustand im Berichtszeitraum.'
  } else if (kpis.vitalityIndex > 0) {
    text = 'Verbesserungspotenzial beim Vitalitätszustand.'
  } else {
    text = 'Keine Daten für den Berichtszeitraum vorhanden.'
  }
  if (kpis.participationRate > 0 && kpis.participationRate < 0.6) {
    text += ' Partizipationsrate unter 60 % – Engagement der Mitarbeiter fördern.'
  }
  return text
}

function trendArrow(trend: number | null): { symbol: string; color: string } {
  if (trend === null || trend === 0) return { symbol: '–', color: '#9ca3af' }
  if (trend > 0) return { symbol: `\u25b2 +${trend}`, color: '#059669' }
  return { symbol: `\u25bc ${trend}`, color: '#dc2626' }
}

const ELYO_GREEN = '#1B4D3E'
const FOOTER_TEXT = 'Erstellt mit ELYO \u00b7 Alle Daten anonymisiert und DSGVO-konform \u00b7 elyo.de'

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10 },
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
  },
  // Cover
  coverPage: { backgroundColor: ELYO_GREEN, justifyContent: 'center', alignItems: 'center' },
  coverTitle: { fontSize: 48, fontFamily: 'Helvetica-Bold', color: 'white', marginBottom: 16 },
  coverSubtitle: { fontSize: 24, color: 'white', marginBottom: 12 },
  coverCompany: { fontSize: 18, color: 'white', marginBottom: 8 },
  coverDate: { fontSize: 11, color: '#a7c4bc' },
  // KPI boxes
  kpiRow: { flexDirection: 'row', marginBottom: 16 },
  kpiBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 10,
    alignItems: 'center',
    marginRight: 6,
  },
  kpiLabel: { fontSize: 8, color: '#6b7280', marginBottom: 4, textAlign: 'center' },
  kpiValue: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: ELYO_GREEN },
  kpiTrend: { fontSize: 9, marginTop: 2 },
  commentText: { fontSize: 10, color: '#374151', lineHeight: 1.5, marginTop: 8 },
  // Section
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: ELYO_GREEN,
    marginBottom: 6,
    marginTop: 14,
  },
  // Tables
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: ELYO_GREEN,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableHeaderCell: { fontSize: 9, color: 'white', fontFamily: 'Helvetica-Bold' },
  tableRow: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 4 },
  tableRowAlt: { backgroundColor: '#f9fafb' },
  tableCell: { fontSize: 9, color: '#374151' },
  anonymityNote: { fontSize: 8, color: '#6b7280', marginTop: 6 },
  // CSRD
  csrdHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  csrdHeaderCell: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#374151' },
  methodNote: { fontSize: 8, color: '#6b7280', marginTop: 14, lineHeight: 1.4 },
})

function PageFooter() {
  return <Text style={styles.footer}>{FOOTER_TEXT}</Text>
}

function CoverPage({ data }: { data: ReportData }) {
  const createdAt = new Date().toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  return (
    <Page size="A4" style={[styles.page, styles.coverPage]}>
      <Text style={styles.coverTitle}>ELYO</Text>
      <Text style={styles.coverSubtitle}>Vitalit\u00e4tsbericht {data.period.label}</Text>
      <Text style={styles.coverCompany}>{data.company.name}</Text>
      <Text style={styles.coverDate}>{createdAt}</Text>
      <PageFooter />
    </Page>
  )
}

function ExecutiveSummaryPage({ data }: { data: ReportData }) {
  const { kpis } = data
  const arrow = trendArrow(kpis.vitalityTrend)
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Executive Summary</Text>
      <View style={styles.kpiRow}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Vitalit\u00e4ts-Index</Text>
          <Text style={styles.kpiValue}>{kpis.vitalityIndex}</Text>
          <Text style={[styles.kpiTrend, { color: arrow.color }]}>{arrow.symbol}</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Partizipationsrate</Text>
          <Text style={styles.kpiValue}>{Math.round(kpis.participationRate * 100)}%</Text>
          <Text style={styles.kpiTrend}> </Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>\u00d8 Energie</Text>
          <Text style={styles.kpiValue}>{kpis.avgEnergy}</Text>
          <Text style={styles.kpiTrend}> </Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>\u00d8 Belastung</Text>
          <Text style={styles.kpiValue}>{kpis.avgStress}</Text>
          <Text style={styles.kpiTrend}> </Text>
        </View>
      </View>
      <Text style={styles.commentText}>{generateComment(kpis)}</Text>
      <PageFooter />
    </Page>
  )
}

function TrendAndTeamsPage({ data }: { data: ReportData }) {
  const hasAnonymized = data.teamBreakdown.some(t => t.teamName.startsWith('Weitere Teams'))
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Trend</Text>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Periode</Text>
        <Text style={[styles.tableHeaderCell, { width: '32.5%' }]}>Vitalit\u00e4ts-Index</Text>
        <Text style={[styles.tableHeaderCell, { width: '32.5%' }]}>Partizipationsrate</Text>
      </View>
      {data.trendData.map((point, i) => (
        <View key={point.period} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
          <Text style={[styles.tableCell, { width: '35%' }]}>{point.period}</Text>
          <Text style={[styles.tableCell, { width: '32.5%' }]}>
            {point.vitalityIndex !== null ? String(point.vitalityIndex) : '\u2013'}
          </Text>
          <Text style={[styles.tableCell, { width: '32.5%' }]}>
            {point.participationRate !== null
              ? `${Math.round(point.participationRate * 100)}%`
              : '\u2013'}
          </Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Teams</Text>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Team</Text>
        <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Mitglieder</Text>
        <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Partizipation</Text>
        <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Index</Text>
      </View>
      {data.teamBreakdown.map((entry, i) => (
        <View key={entry.teamName} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
          <Text style={[styles.tableCell, { width: '40%' }]}>{entry.teamName}</Text>
          <Text style={[styles.tableCell, { width: '20%' }]}>{entry.memberCount}</Text>
          <Text style={[styles.tableCell, { width: '20%' }]}>
            {Math.round(entry.participationRate * 100)}%
          </Text>
          <Text style={[styles.tableCell, { width: '20%' }]}>{entry.vitalityIndex}</Text>
        </View>
      ))}
      {hasAnonymized && (
        <Text style={styles.anonymityNote}>
          Teams unter der Anonymisierungsschwelle wurden zusammengefasst.
        </Text>
      )}
      <PageFooter />
    </Page>
  )
}

function CsrdMappingPage({ data }: { data: ReportData }) {
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>CSRD-Mapping</Text>
      <View style={styles.csrdHeaderRow}>
        <Text style={[styles.csrdHeaderCell, { width: '20%' }]}>Standard</Text>
        <Text style={[styles.csrdHeaderCell, { width: '35%' }]}>Beschreibung</Text>
        <Text style={[styles.csrdHeaderCell, { width: '25%' }]}>ELYO-Kennzahl</Text>
        <Text style={[styles.csrdHeaderCell, { width: '20%' }]}>Wert</Text>
      </View>
      {data.csrdMapping.map((entry, i) => (
        <View key={entry.standard} style={[styles.tableRow, i % 2 === 1 ? { backgroundColor: '#f9fafb' } : {}]}>
          <Text style={[styles.tableCell, { width: '20%' }]}>{entry.standard}</Text>
          <Text style={[styles.tableCell, { width: '35%' }]}>{entry.description}</Text>
          <Text style={[styles.tableCell, { width: '25%' }]}>{entry.elyoMetric}</Text>
          <Text style={[styles.tableCell, { width: '20%' }]}>{entry.value}</Text>
        </View>
      ))}
      <Text style={styles.methodNote}>
        Methodik: Anonymisierte Aggregation via ELYO Wellbeing Engine. Daten werden nicht an Dritte weitergegeben.
      </Text>
      <PageFooter />
    </Page>
  )
}

export default function EsgReportPdf({ data }: { data: ReportData }) {
  return (
    <Document>
      <CoverPage data={data} />
      <ExecutiveSummaryPage data={data} />
      <TrendAndTeamsPage data={data} />
      <CsrdMappingPage data={data} />
    </Document>
  )
}
```

- [ ] **Step 4: Run all component tests**

```bash
npx vitest run src/components/reports/__tests__/EsgReportPdf.test.tsx
```

Expected: 8/8 tests pass (7 `generateComment` + 1 smoke test). The smoke test may take 5–10 seconds for PDF rendering.

- [ ] **Step 5: Run full suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/reports/EsgReportPdf.tsx src/components/reports/__tests__/EsgReportPdf.test.tsx
git commit -m "feat: implement EsgReportPdf 4-page document"
```

---

## Task 4: PDF API Route + Tests

**Files:**
- Create: `src/app/api/reports/esg/pdf/route.ts`
- Create: `src/app/api/reports/esg/pdf/__tests__/route.test.ts`

- [ ] **Step 1: Write failing API route tests**

Create `src/app/api/reports/esg/pdf/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockGetReportData = vi.fn()
const mockRenderToBuffer = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/esgReport', () => ({ getReportData: mockGetReportData }))
vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: mockRenderToBuffer,
  Document: ({ children }: { children: React.ReactNode }) => children,
  Page: ({ children }: { children?: React.ReactNode }) => children ?? null,
  View: ({ children }: { children?: React.ReactNode }) => children ?? null,
  Text: ({ children }: { children?: React.ReactNode }) => children ?? null,
  StyleSheet: { create: (s: unknown) => s },
}))
vi.mock('@/components/reports/EsgReportPdf', () => ({
  default: () => null,
  generateComment: () => '',
}))

const { GET } = await import('../route')

const mockAdminSession = {
  user: { id: 'admin-1', role: 'COMPANY_ADMIN', companyId: 'company-1' },
}

const mockReportData = {
  company: { name: 'Test GmbH', employeeCount: 10, industry: 'tech' },
  period: { label: 'Q1 2026', from: new Date('2026-01-01'), to: new Date('2026-03-31') },
  kpis: {
    vitalityIndex: 7.0, vitalityTrend: 0.5, activeParticipants: 8,
    participationRate: 0.8, avgEnergy: 8.0, avgMood: 7.5, avgStress: 3.0, checkinsTotal: 8,
  },
  teamBreakdown: [],
  trendData: [],
  csrdMapping: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(mockAdminSession)
  mockGetReportData.mockResolvedValue(mockReportData)
  mockRenderToBuffer.mockResolvedValue(Buffer.from('%PDF-1.4 mock'))
})

describe('GET /api/reports/esg/pdf', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = new Request('http://localhost/api/reports/esg/pdf?year=2026')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when role is not COMPANY_ADMIN', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'emp-1', role: 'EMPLOYEE', companyId: 'company-1' } })
    const req = new Request('http://localhost/api/reports/esg/pdf?year=2026')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 when year is missing', async () => {
    const req = new Request('http://localhost/api/reports/esg/pdf')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('year_required')
  })

  it('returns 400 when year is not a valid integer', async () => {
    const req = new Request('http://localhost/api/reports/esg/pdf?year=abc')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('year_required')
  })

  it('returns 400 when quarter is outside 1-4', async () => {
    const req = new Request('http://localhost/api/reports/esg/pdf?year=2026&quarter=5')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_quarter')
  })

  it('returns PDF response with correct headers for annual request', async () => {
    const req = new Request('http://localhost/api/reports/esg/pdf?year=2026')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toContain('attachment')
    expect(res.headers.get('Content-Disposition')).toContain('.pdf')
    expect(mockGetReportData).toHaveBeenCalledWith('company-1', { year: 2026 })
  })

  it('returns PDF response for quarterly request', async () => {
    const req = new Request('http://localhost/api/reports/esg/pdf?year=2026&quarter=1')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockGetReportData).toHaveBeenCalledWith('company-1', { year: 2026, quarter: 1 })
  })

  it('returns 500 when rendering fails', async () => {
    mockGetReportData.mockRejectedValue(new Error('DB error'))
    const req = new Request('http://localhost/api/reports/esg/pdf?year=2026')
    const res = await GET(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('render_failed')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/app/api/reports/esg/pdf/__tests__/route.test.ts
```

Expected: FAIL with `Cannot find module '../route'`

- [ ] **Step 3: Create `src/app/api/reports/esg/pdf/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { auth } from '@/lib/auth'
import { getReportData } from '@/lib/esgReport'
import EsgReportPdf from '@/components/reports/EsgReportPdf'

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

  try {
    const reportData = await getReportData(session.user.companyId, { year, quarter })
    const buffer = await renderToBuffer(<EsgReportPdf data={reportData} />)
    const filename = `elyo-esg-${reportData.period.label.replace(/\s/g, '-')}.pdf`
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[ESG PDF] render failed:', err)
    return NextResponse.json({ error: 'render_failed' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run API route tests**

```bash
npx vitest run src/app/api/reports/esg/pdf/__tests__/route.test.ts
```

Expected: 8/8 tests pass.

- [ ] **Step 5: Run full suite**

```bash
npx vitest run
```

Expected: All tests pass. Run `npx tsc --noEmit` — no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/reports/esg/pdf/route.ts src/app/api/reports/esg/pdf/__tests__/route.test.ts
git commit -m "feat: add GET /api/reports/esg/pdf download route"
```

---

## Task 5: Reports Page

**Files:**
- Modify: `src/app/(app)/company/reports/page.tsx` — replace placeholder with period picker + download button

- [ ] **Step 1: Replace `src/app/(app)/company/reports/page.tsx`**

The current file contains only a placeholder. Replace the entire file:

```typescript
'use client'

import { useState } from 'react'

export default function ReportsPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [quarter, setQuarter] = useState<number | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)

  function handleDownload() {
    const params = new URLSearchParams({ year: String(year) })
    if (quarter !== undefined) params.set('quarter', String(quarter))
    setIsLoading(true)
    window.open(`/api/reports/esg/pdf?${params.toString()}`, '_blank')
    setTimeout(() => setIsLoading(false), 3000)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1
        className="text-2xl font-semibold text-gray-900 mb-1"
        style={{ fontFamily: "'Fraunces', Georgia, serif" }}
      >
        Berichte
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Lade deinen ESG-Vitalit&auml;tsbericht als PDF herunter.
      </p>

      <div className="flex gap-3 mb-6">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600" htmlFor="year-select">
            Jahr
          </label>
          <select
            id="year-select"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600" htmlFor="quarter-select">
            Quartal
          </label>
          <select
            id="quarter-select"
            value={quarter ?? ''}
            onChange={(e) => setQuarter(e.target.value === '' ? undefined : Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
          >
            <option value="">Ganzes Jahr</option>
            <option value="1">Q1</option>
            <option value="2">Q2</option>
            <option value="3">Q3</option>
            <option value="4">Q4</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={isLoading}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60"
        style={{ backgroundColor: '#1B4D3E' }}
      >
        {isLoading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Wird generiert&hellip;
          </>
        ) : (
          <>
            <span>&#128196;</span>
            PDF herunterladen
          </>
        )}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass (no new tests for this page — UI-only client component).

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/company/reports/page.tsx
git commit -m "feat: add reports page with period picker and PDF download button"
```
