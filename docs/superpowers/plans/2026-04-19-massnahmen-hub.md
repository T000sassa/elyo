# Maßnahmen-Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** COMPANY_ADMINs können auf `/company/measures` automatisch generierte Maßnahmen-Vorschläge aktivieren/verwerfen und eigene Maßnahmen erstellen. At-Risk-Signale aus anonymisierten Metriken lösen täglich Vorschläge via Cron aus.

**Architecture:** `Measure`-Prisma-Modell + statischer Template-Katalog in `measures.ts` + Vorschlags-Engine in `measureEngine.ts`. Drei API-Routes (LIST/CREATE, PATCH) + Client-Component-UI mit Tabs. Cron erweitert um `measure-engine` Action.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma, Vitest, `getAggregatedMetrics()` aus `anonymize.ts`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `Measure` model + `Company.measures` relation |
| `src/lib/measures.ts` | Create | Static template catalog keyed by trigger type |
| `src/lib/measureEngine.ts` | Create | `generateSuggestionsForCompany` + `generateSuggestionsForAllCompanies` |
| `src/lib/__tests__/measureEngine.test.ts` | Create | 6 unit tests for suggestion logic |
| `src/app/api/measures/route.ts` | Create | GET (list) + POST (create custom) |
| `src/app/api/measures/__tests__/route.test.ts` | Create | 6 API route tests |
| `src/app/api/measures/[id]/route.ts` | Create | PATCH (activate/complete/dismiss) |
| `src/app/api/measures/[id]/__tests__/route.test.ts` | Create | 5 PATCH tests |
| `src/app/api/cron/route.ts` | Modify | Add `measure-engine` action + import |
| `src/app/(app)/company/measures/page.tsx` | Create | Client Component with tabs + form |

---

## Task 1: Prisma Schema + Measures Catalog

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/measures.ts`

- [ ] **Step 1: Add `Measure` model to `prisma/schema.prisma`**

Add before the final closing line of the schema (after the last existing model):

```prisma
model Measure {
  id          String    @id @default(cuid())
  companyId   String
  company     Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  teamId      String?
  title       String
  category    String
  description String
  status      String    @default("SUGGESTED")
  suggestedAt DateTime  @default(now())
  startedAt   DateTime?
  completedAt DateTime?
  createdBy   String

  @@index([companyId, status])
}
```

Also add to the `Company` model (find `Company` model, add relation field after last existing relation):

```prisma
  measures      Measure[]
```

- [ ] **Step 2: Run Prisma migration**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx prisma migrate dev --name add_measure_model
```

Expected: Migration created and applied, `prisma generate` runs automatically.

- [ ] **Step 3: Create `src/lib/measures.ts`**

```typescript
export type TriggerType = 'high_stress' | 'low_energy' | 'low_participation'
export type MeasureCategory = 'workshop' | 'flexibility' | 'sport' | 'mental' | 'nutrition'

export interface MeasureTemplate {
  title: string
  category: MeasureCategory
  description: string
}

export const MEASURE_TEMPLATES: Record<TriggerType, MeasureTemplate[]> = {
  high_stress: [
    {
      title: 'Teamworkshop Stressmanagement',
      category: 'workshop',
      description: 'Gemeinsamer Workshop zu Stressbewältigungsstrategien für das Team (90 Min., intern oder extern moderiert).',
    },
    {
      title: 'Flexible Arbeitszeiten diese Woche',
      category: 'flexibility',
      description: 'Flexible Kernarbeitszeiten für eine Woche einführen, um individuelle Erholungsphasen zu ermöglichen.',
    },
    {
      title: 'Tägliches Stand-up verkürzen',
      category: 'flexibility',
      description: 'Stand-up auf max. 10 Minuten begrenzen und optionale Themen in separate Meetings auslagern.',
    },
    {
      title: 'Achtsamkeitspause einführen (10 Min.)',
      category: 'mental',
      description: 'Täglich eine geführte 10-Minuten-Achtsamkeitspause im Team-Kalender blocken.',
    },
    {
      title: 'Aufgabenverteilung im Team besprechen',
      category: 'workshop',
      description: 'Offene Runde zur Überprüfung aktueller Aufgabenlasten und Umverteilung wenn nötig.',
    },
  ],
  low_energy: [
    {
      title: 'Bewegungspause einführen (10 Min.)',
      category: 'sport',
      description: 'Täglich eine kurze Bewegungspause in den Team-Rhythmus integrieren – Spaziergang oder Dehnübungen.',
    },
    {
      title: 'Outdoor-Meeting vorschlagen',
      category: 'sport',
      description: 'Nächstes 1:1 oder kleines Team-Meeting als Walking-Meeting durchführen.',
    },
    {
      title: 'Gemeinsame Mittagspause aktivieren',
      category: 'nutrition',
      description: 'Gemeinsame Mittagspause (mind. 30 Min., bildschirmfrei) im Team-Kalender etablieren.',
    },
    {
      title: 'Ergonomie-Check am Arbeitsplatz',
      category: 'flexibility',
      description: 'Kurzcheck: Stehpulte, Beleuchtung und Sitzhaltung im Team besprechen und optimieren.',
    },
    {
      title: 'Vitalitäts-Challenge starten',
      category: 'sport',
      description: 'Zweiwöchige Team-Challenge: tägliche Schrittanzahl oder gemeinsame Sporteinheit.',
    },
  ],
  low_participation: [
    {
      title: 'Check-in-Reminder-Kampagne starten',
      category: 'workshop',
      description: 'Gezielte Kommunikation im Team zum Nutzen und zur Vertraulichkeit des täglichen Check-ins.',
    },
    {
      title: 'Team-Challenge aktivieren',
      category: 'sport',
      description: 'Gamification-Element nutzen: Team gegen Team in wöchentlicher Vitalitäts-Challenge.',
    },
    {
      title: 'Anonymitätsversprechen kommunizieren',
      category: 'workshop',
      description: 'Transparenter Hinweis an alle Mitarbeiter: Kein Arbeitgeber sieht individuelle Check-in-Daten.',
    },
    {
      title: 'Check-in in Team-Meeting integrieren',
      category: 'flexibility',
      description: '2-Minuten-Check-in am Anfang des wöchentlichen Team-Meetings etablieren.',
    },
  ],
}

export function pickTemplate(trigger: TriggerType): MeasureTemplate {
  const templates = MEASURE_TEMPLATES[trigger]
  return templates[Math.floor(Math.random() * templates.length)]
}
```

- [ ] **Step 4: Run existing tests to verify nothing broke**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run
```

Expected: All 172 tests still pass.

- [ ] **Step 5: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add prisma/schema.prisma prisma/migrations src/lib/measures.ts
git commit -m "feat: add Measure model + measures template catalog"
```

---

## Task 2: Measure Engine + Tests

**Files:**
- Create: `src/lib/measureEngine.ts`
- Create: `src/lib/__tests__/measureEngine.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/measureEngine.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = {
  company: { findMany: vi.fn(), findUnique: vi.fn() },
  team: { findMany: vi.fn() },
  measure: { findFirst: vi.fn(), create: vi.fn() },
}

vi.mock('../prisma', () => ({ prisma: mockPrisma }))

const mockGetAggregatedMetrics = vi.fn()
const mockGetContinuityData = vi.fn()

vi.mock('../anonymize', () => ({
  getAggregatedMetrics: mockGetAggregatedMetrics,
  getContinuityData: mockGetContinuityData,
}))

const { generateSuggestionsForCompany } = await import('../measureEngine')

const COMPANY_ID = 'company-1'
const TEAM_ID = 'team-1'

const defaultCompany = {
  id: COMPANY_ID,
  anonymityThreshold: 5,
}

const defaultTeam = { id: TEAM_ID }

const metricsAboveThreshold = {
  avgStress: 5,
  avgEnergy: 7,
  avgScore: 7,
  avgMood: 7,
  responseCount: 10,
  isAboveThreshold: true,
}

const continuityAboveThreshold = {
  continuityRate: 0.8,
  activeUserRate: 0.7,
  totalEmployees: 20,
  checkedInThisPeriod: 14,
  isAboveThreshold: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.company.findUnique.mockResolvedValue(defaultCompany)
  mockPrisma.team.findMany.mockResolvedValue([defaultTeam])
  mockGetAggregatedMetrics.mockResolvedValue(metricsAboveThreshold)
  mockGetContinuityData.mockResolvedValue(continuityAboveThreshold)
  mockPrisma.measure.findFirst.mockResolvedValue(null) // no dedup hit by default
  mockPrisma.measure.create.mockResolvedValue({ id: 'measure-1' })
})

describe('generateSuggestionsForCompany', () => {
  it('creates high_stress measure when avgStress > 7', async () => {
    mockGetAggregatedMetrics.mockResolvedValue({ ...metricsAboveThreshold, avgStress: 7.5 })
    const count = await generateSuggestionsForCompany(COMPANY_ID)
    expect(count).toBeGreaterThan(0)
    expect(mockPrisma.measure.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ companyId: COMPANY_ID, teamId: TEAM_ID, createdBy: 'system' }),
      })
    )
  })

  it('creates low_energy measure when avgEnergy < 5', async () => {
    mockGetAggregatedMetrics.mockResolvedValue({ ...metricsAboveThreshold, avgEnergy: 4.5 })
    const count = await generateSuggestionsForCompany(COMPANY_ID)
    expect(count).toBeGreaterThan(0)
  })

  it('creates low_participation measure when activeUserRate < 0.5', async () => {
    mockGetContinuityData.mockResolvedValue({ ...continuityAboveThreshold, activeUserRate: 0.4 })
    const count = await generateSuggestionsForCompany(COMPANY_ID)
    expect(count).toBeGreaterThan(0)
    // company-wide measure has teamId = null
    expect(mockPrisma.measure.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ teamId: null }),
      })
    )
  })

  it('skips measure when dedup check finds recent match', async () => {
    mockGetAggregatedMetrics.mockResolvedValue({ ...metricsAboveThreshold, avgStress: 8 })
    mockPrisma.measure.findFirst.mockResolvedValue({ id: 'existing-measure' })
    const count = await generateSuggestionsForCompany(COMPANY_ID)
    expect(count).toBe(0)
    expect(mockPrisma.measure.create).not.toHaveBeenCalled()
  })

  it('skips all measures when team metrics are below threshold', async () => {
    mockGetAggregatedMetrics.mockResolvedValue({ ...metricsAboveThreshold, isAboveThreshold: false })
    mockGetContinuityData.mockResolvedValue({ ...continuityAboveThreshold, isAboveThreshold: false })
    const count = await generateSuggestionsForCompany(COMPANY_ID)
    expect(count).toBe(0)
  })

  it('returns 0 when no triggers fire', async () => {
    // all metrics in healthy range
    mockGetAggregatedMetrics.mockResolvedValue({ ...metricsAboveThreshold, avgStress: 5, avgEnergy: 7 })
    mockGetContinuityData.mockResolvedValue({ ...continuityAboveThreshold, activeUserRate: 0.7 })
    const count = await generateSuggestionsForCompany(COMPANY_ID)
    expect(count).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/lib/__tests__/measureEngine.test.ts
```

Expected: FAIL with `Cannot find module '../measureEngine'`

- [ ] **Step 3: Create `src/lib/measureEngine.ts`**

```typescript
import { prisma } from './prisma'
import { getAggregatedMetrics, getContinuityData } from './anonymize'
import { MEASURE_TEMPLATES, pickTemplate, type TriggerType } from './measures'

const DEDUP_WINDOW_MS = 14 * 24 * 60 * 60 * 1000 // 14 days

async function isDuplicate(companyId: string, teamId: string | null, title: string): Promise<boolean> {
  const since = new Date(Date.now() - DEDUP_WINDOW_MS)
  const existing = await prisma.measure.findFirst({
    where: {
      companyId,
      teamId: teamId ?? null,
      title,
      status: { in: ['SUGGESTED', 'ACTIVE'] },
      suggestedAt: { gte: since },
    },
  })
  return existing !== null
}

async function createMeasureIfNew(companyId: string, teamId: string | null, trigger: TriggerType): Promise<boolean> {
  const template = pickTemplate(trigger)
  if (await isDuplicate(companyId, teamId, template.title)) return false
  await prisma.measure.create({
    data: {
      companyId,
      teamId,
      title: template.title,
      category: template.category,
      description: template.description,
      createdBy: 'system',
    },
  })
  return true
}

export async function generateSuggestionsForCompany(companyId: string): Promise<number> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, anonymityThreshold: true },
  })
  if (!company) return 0

  const threshold = company.anonymityThreshold ?? 5
  const teams = await prisma.team.findMany({
    where: { companyId },
    select: { id: true },
  })

  let created = 0

  // Per-team triggers
  for (const team of teams) {
    const metrics = await getAggregatedMetrics(companyId, { teamId: team.id, threshold })
    if (!metrics.isAboveThreshold) continue

    if (metrics.avgStress > 7) {
      if (await createMeasureIfNew(companyId, team.id, 'high_stress')) created++
    }
    if (metrics.avgEnergy < 5) {
      if (await createMeasureIfNew(companyId, team.id, 'low_energy')) created++
    }
  }

  // Company-wide trigger
  const continuity = await getContinuityData(companyId, { threshold })
  if (continuity.isAboveThreshold && continuity.activeUserRate < 0.5) {
    if (await createMeasureIfNew(companyId, null, 'low_participation')) created++
  }

  return created
}

export async function generateSuggestionsForAllCompanies(): Promise<{ companyId: string; created: number }[]> {
  const companies = await prisma.company.findMany({ select: { id: true } })
  const results = []
  for (const company of companies) {
    const created = await generateSuggestionsForCompany(company.id)
    results.push({ companyId: company.id, created })
  }
  return results
}
```

- [ ] **Step 4: Run tests**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/lib/__tests__/measureEngine.test.ts
```

Expected: 6/6 pass.

- [ ] **Step 5: Run full suite**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/lib/measureEngine.ts src/lib/__tests__/measureEngine.test.ts
git commit -m "feat: add measureEngine with suggestion logic + tests"
```

---

## Task 3: API Routes + Tests

**Files:**
- Create: `src/app/api/measures/route.ts`
- Create: `src/app/api/measures/__tests__/route.test.ts`
- Create: `src/app/api/measures/[id]/route.ts`
- Create: `src/app/api/measures/[id]/__tests__/route.test.ts`

- [ ] **Step 1: Write failing tests for LIST/CREATE route**

Create `src/app/api/measures/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockPrisma = {
  measure: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
}

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

const { GET, POST } = await import('../route')

const mockAdminSession = {
  user: { id: 'admin-1', role: 'COMPANY_ADMIN', companyId: 'company-1' },
}

const mockMeasure = {
  id: 'measure-1',
  companyId: 'company-1',
  teamId: null,
  title: 'Bewegungspause',
  category: 'sport',
  description: 'Kurze Pause.',
  status: 'SUGGESTED',
  suggestedAt: new Date('2026-04-19'),
  startedAt: null,
  completedAt: null,
  createdBy: 'system',
  team: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(mockAdminSession)
  mockPrisma.measure.findMany.mockResolvedValue([mockMeasure])
  mockPrisma.measure.create.mockResolvedValue({ ...mockMeasure, id: 'measure-new', status: 'ACTIVE', createdBy: 'admin-1' })
})

describe('GET /api/measures', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(new Request('http://localhost/api/measures'))
    expect(res.status).toBe(401)
  })

  it('returns 403 when role is not COMPANY_ADMIN', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'emp-1', role: 'EMPLOYEE', companyId: 'company-1' } })
    const res = await GET(new Request('http://localhost/api/measures'))
    expect(res.status).toBe(403)
  })

  it('returns all measures for the company', async () => {
    const res = await GET(new Request('http://localhost/api/measures'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.measures).toHaveLength(1)
    expect(body.measures[0].id).toBe('measure-1')
  })
})

describe('POST /api/measures', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(new Request('http://localhost/api/measures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', category: 'sport', description: 'Beschreibung lang genug.' }),
    }))
    expect(res.status).toBe(401)
  })

  it('returns 400 on validation error (title too short)', async () => {
    const res = await POST(new Request('http://localhost/api/measures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'AB', category: 'sport', description: 'Beschreibung lang genug.' }),
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('validation_error')
  })

  it('creates measure with ACTIVE status and returns 201', async () => {
    const res = await POST(new Request('http://localhost/api/measures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Bewegungspause', category: 'sport', description: 'Eine kurze Bewegungspause jeden Tag.' }),
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.measure).toBeDefined()
    expect(mockPrisma.measure.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACTIVE', createdBy: 'admin-1' }),
      })
    )
  })
})
```

- [ ] **Step 2: Write failing tests for PATCH route**

Create `src/app/api/measures/[id]/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockPrisma = {
  measure: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

const { PATCH } = await import('../route')

const mockAdminSession = {
  user: { id: 'admin-1', role: 'COMPANY_ADMIN', companyId: 'company-1' },
}

function makeRequest(id: string, body: object) {
  return new Request(`http://localhost/api/measures/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(mockAdminSession)
  mockPrisma.measure.findUnique.mockResolvedValue({
    id: 'measure-1',
    companyId: 'company-1',
    status: 'SUGGESTED',
  })
  mockPrisma.measure.update.mockResolvedValue({ id: 'measure-1', status: 'ACTIVE', startedAt: new Date() })
})

describe('PATCH /api/measures/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await PATCH(makeRequest('measure-1', { status: 'ACTIVE' }), { params: Promise.resolve({ id: 'measure-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when measure belongs to another company', async () => {
    mockPrisma.measure.findUnique.mockResolvedValue({ id: 'measure-1', companyId: 'other-company', status: 'SUGGESTED' })
    const res = await PATCH(makeRequest('measure-1', { status: 'ACTIVE' }), { params: Promise.resolve({ id: 'measure-1' }) })
    expect(res.status).toBe(403)
  })

  it('transitions SUGGESTED → ACTIVE and sets startedAt', async () => {
    const res = await PATCH(makeRequest('measure-1', { status: 'ACTIVE' }), { params: Promise.resolve({ id: 'measure-1' }) })
    expect(res.status).toBe(200)
    expect(mockPrisma.measure.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACTIVE', startedAt: expect.any(Date) }),
      })
    )
  })

  it('transitions ACTIVE → COMPLETED and sets completedAt', async () => {
    mockPrisma.measure.findUnique.mockResolvedValue({ id: 'measure-1', companyId: 'company-1', status: 'ACTIVE' })
    mockPrisma.measure.update.mockResolvedValue({ id: 'measure-1', status: 'COMPLETED', completedAt: new Date() })
    const res = await PATCH(makeRequest('measure-1', { status: 'COMPLETED' }), { params: Promise.resolve({ id: 'measure-1' }) })
    expect(res.status).toBe(200)
    expect(mockPrisma.measure.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'COMPLETED', completedAt: expect.any(Date) }),
      })
    )
  })

  it('returns 400 for invalid_transition (COMPLETED → ACTIVE)', async () => {
    mockPrisma.measure.findUnique.mockResolvedValue({ id: 'measure-1', companyId: 'company-1', status: 'COMPLETED' })
    const res = await PATCH(makeRequest('measure-1', { status: 'ACTIVE' }), { params: Promise.resolve({ id: 'measure-1' }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_transition')
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/app/api/measures
```

Expected: FAIL (modules not found)

- [ ] **Step 4: Create `src/app/api/measures/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const createSchema = z.object({
  title: z.string().min(3).max(100),
  category: z.enum(['workshop', 'flexibility', 'sport', 'mental', 'nutrition']),
  description: z.string().min(10).max(500),
  teamId: z.string().optional(),
})

export async function GET(_req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'COMPANY_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const measures = await prisma.measure.findMany({
    where: { companyId: session.user.companyId },
    include: { team: { select: { name: true } } },
    orderBy: { suggestedAt: 'desc' },
  })

  return NextResponse.json({ measures })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'COMPANY_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'validation_error', details: parsed.error.flatten() }, { status: 400 })

  const measure = await prisma.measure.create({
    data: {
      companyId: session.user.companyId,
      teamId: parsed.data.teamId ?? null,
      title: parsed.data.title,
      category: parsed.data.category,
      description: parsed.data.description,
      status: 'ACTIVE',
      startedAt: new Date(),
      createdBy: session.user.id,
    },
  })

  return NextResponse.json({ measure }, { status: 201 })
}
```

- [ ] **Step 5: Create `src/app/api/measures/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const patchSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'DISMISSED']),
})

const VALID_TRANSITIONS: Record<string, string[]> = {
  SUGGESTED: ['ACTIVE', 'DISMISSED'],
  ACTIVE: ['COMPLETED', 'DISMISSED'],
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'COMPANY_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const measure = await prisma.measure.findUnique({ where: { id } })
  if (!measure) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (measure.companyId !== session.user.companyId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'validation_error' }, { status: 400 })

  const allowed = VALID_TRANSITIONS[measure.status] ?? []
  if (!allowed.includes(parsed.data.status)) {
    return NextResponse.json({ error: 'invalid_transition' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = { status: parsed.data.status }
  if (parsed.data.status === 'ACTIVE') updateData.startedAt = new Date()
  if (parsed.data.status === 'COMPLETED') updateData.completedAt = new Date()

  const updated = await prisma.measure.update({ where: { id }, data: updateData })
  return NextResponse.json({ measure: updated })
}
```

- [ ] **Step 6: Run API route tests**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/app/api/measures
```

Expected: 3 GET + 3 POST + 5 PATCH = 11 tests pass.

- [ ] **Step 7: Run full suite**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/app/api/measures/
git commit -m "feat: add measures API routes (GET/POST/PATCH) + tests"
```

---

## Task 4: Cron Extension

**Files:**
- Modify: `src/app/api/cron/route.ts`

- [ ] **Step 1: Add `measure-engine` action to `src/app/api/cron/route.ts`**

Current imports at top:
```typescript
import { prisma } from '@/lib/prisma'
import { sendCheckinReminder, sendWeeklyDigest } from '@/lib/email'
import { getAggregatedMetrics, getContinuityData } from '@/lib/anonymize'
import { fetchSteps, fetchSleepSessions, fetchHeartRateAvg } from '@/lib/googleHealth'
```

Add this import after the existing ones:
```typescript
import { generateSuggestionsForAllCompanies } from '@/lib/measureEngine'
```

Add this function after `runWearableSync`:
```typescript
async function runMeasureEngine(): Promise<ActionResult> {
  const start = performance.now()
  const results = await generateSuggestionsForAllCompanies()
  const affected = results.reduce((sum, r) => sum + r.created, 0)
  return { success: true, duration: Math.round(performance.now() - start), affected }
}
```

In the `POST` handler, add the new action branch before the `else` clause:
```typescript
    } else if (action === 'wearable-sync') {
      results['wearable-sync'] = await runWearableSync()
    } else if (action === 'measure-engine') {
      results['measure-engine'] = await runMeasureEngine()
    } else {
```

- [ ] **Step 2: Run full suite**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 3: TypeScript check**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/app/api/cron/route.ts
git commit -m "feat: add measure-engine cron action"
```

---

## Task 5: Measures UI Page

**Files:**
- Create: `src/app/(app)/company/measures/page.tsx`

- [ ] **Step 1: Create `src/app/(app)/company/measures/page.tsx`**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'

type MeasureCategory = 'workshop' | 'flexibility' | 'sport' | 'mental' | 'nutrition'
type MeasureStatus = 'SUGGESTED' | 'ACTIVE' | 'COMPLETED' | 'DISMISSED'

interface MeasureTeam {
  name: string
}

interface Measure {
  id: string
  teamId: string | null
  title: string
  category: MeasureCategory
  description: string
  status: MeasureStatus
  suggestedAt: string
  startedAt: string | null
  completedAt: string | null
  createdBy: string
  team: MeasureTeam | null
}

const CATEGORY_ICONS: Record<MeasureCategory, string> = {
  workshop: '🎓',
  flexibility: '🕐',
  sport: '💪',
  mental: '🧠',
  nutrition: '🥗',
}

const CATEGORY_LABELS: Record<MeasureCategory, string> = {
  workshop: 'Workshop',
  flexibility: 'Flexibilität',
  sport: 'Bewegung',
  mental: 'Mental',
  nutrition: 'Ernährung',
}

export default function MeasuresPage() {
  const [measures, setMeasures] = useState<Measure[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'suggested' | 'active' | 'archive'>('suggested')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({ title: '', category: 'sport' as MeasureCategory, description: '', teamId: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchMeasures = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/measures')
      if (res.ok) {
        const data = await res.json()
        setMeasures(data.measures)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMeasures()
  }, [fetchMeasures])

  async function handleStatusChange(id: string, status: MeasureStatus) {
    await fetch(`/api/measures/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await fetchMeasures()
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const body: Record<string, string> = {
        title: formData.title,
        category: formData.category,
        description: formData.description,
      }
      if (formData.teamId) body.teamId = formData.teamId
      const res = await fetch('/api/measures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setShowCreateForm(false)
        setFormData({ title: '', category: 'sport', description: '', teamId: '' })
        setActiveTab('active')
        await fetchMeasures()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const suggested = measures.filter(m => m.status === 'SUGGESTED')
  const active = measures.filter(m => m.status === 'ACTIVE')
  const archive = measures.filter(m => m.status === 'COMPLETED' || m.status === 'DISMISSED')

  const tabs = [
    { key: 'suggested' as const, label: 'Vorschläge', count: suggested.length },
    { key: 'active' as const, label: 'Aktiv', count: active.length },
    { key: 'archive' as const, label: 'Archiv', count: archive.length },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-semibold text-gray-900 mb-1"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Maßnahmen-Hub
          </h1>
          <p className="text-sm text-gray-500">
            Steuere Interventionen basierend auf anonymisierten Wellbeing-Signalen.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: '#1B4D3E' }}
        >
          + Eigene Maßnahme
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6 space-y-4"
        >
          <h2 className="font-medium text-gray-900">Neue Maßnahme erstellen</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Titel *</label>
              <input
                required
                minLength={3}
                maxLength={100}
                value={formData.title}
                onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
                placeholder="z.B. Bewegungspause einführen"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Kategorie *</label>
              <select
                value={formData.category}
                onChange={e => setFormData(f => ({ ...f, category: e.target.value as MeasureCategory }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Team (optional)</label>
              <input
                value={formData.teamId}
                onChange={e => setFormData(f => ({ ...f, teamId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
                placeholder="Team-ID"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Beschreibung *</label>
              <textarea
                required
                minLength={10}
                maxLength={500}
                rows={3}
                value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E] resize-none"
                placeholder="Kurze Beschreibung der Maßnahme..."
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: '#1B4D3E' }}
            >
              {isSubmitting ? 'Speichern…' : 'Speichern'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? 'text-[#1B4D3E] border-b-2 border-[#1B4D3E] bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-2 text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'suggested' && (
            <div className="space-y-3">
              {suggested.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Keine offenen Vorschläge.</p>
              ) : (
                suggested.map(m => (
                  <MeasureCard
                    key={m.id}
                    measure={m}
                    actions={[
                      { label: 'Aktivieren', status: 'ACTIVE', primary: true },
                      { label: 'Verwerfen', status: 'DISMISSED', primary: false },
                    ]}
                    onAction={handleStatusChange}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'active' && (
            <div className="space-y-3">
              {active.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Keine aktiven Maßnahmen.</p>
              ) : (
                active.map(m => (
                  <MeasureCard
                    key={m.id}
                    measure={m}
                    actions={[
                      { label: 'Abschließen', status: 'COMPLETED', primary: true },
                      { label: 'Verwerfen', status: 'DISMISSED', primary: false },
                    ]}
                    onAction={handleStatusChange}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'archive' && (
            <div className="overflow-x-auto">
              {archive.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Noch keine archivierten Maßnahmen.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Maßnahme</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Team</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Datum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archive.map(m => (
                      <tr key={m.id} className="border-b border-gray-100">
                        <td className="py-2 px-3 text-gray-900">{m.title}</td>
                        <td className="py-2 px-3 text-gray-500">{m.team?.name ?? 'Gesamtes Unternehmen'}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              m.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {m.status === 'COMPLETED' ? 'Abgeschlossen' : 'Verworfen'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-400">
                          {new Date(m.completedAt ?? m.suggestedAt).toLocaleDateString('de-DE')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface MeasureCardAction {
  label: string
  status: MeasureStatus
  primary: boolean
}

function MeasureCard({
  measure,
  actions,
  onAction,
}: {
  measure: Measure
  actions: MeasureCardAction[]
  onAction: (id: string, status: MeasureStatus) => void
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4">
      <div className="text-2xl leading-none mt-0.5">
        {CATEGORY_ICONS[measure.category]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-900 text-sm">{measure.title}</span>
          <span className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
            {CATEGORY_LABELS[measure.category]}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-2">{measure.description}</p>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="bg-gray-100 rounded px-2 py-0.5">
            {measure.team?.name ?? 'Gesamtes Unternehmen'}
          </span>
          <span>
            {new Date(measure.suggestedAt).toLocaleDateString('de-DE')}
          </span>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {actions.map(action => (
          <button
            key={action.status}
            onClick={() => onAction(measure.id, action.status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 ${
              action.primary
                ? 'text-white'
                : 'text-gray-600 border border-gray-300 bg-white'
            }`}
            style={action.primary ? { backgroundColor: '#1B4D3E' } : undefined}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 3: TypeScript check**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add "src/app/(app)/company/measures/page.tsx"
git commit -m "feat: add Maßnahmen-Hub UI with tabs and create form"
```
