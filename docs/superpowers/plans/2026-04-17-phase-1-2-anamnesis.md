# Phase 1.2 – Anamnesis System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a progressive employee health-profile system ("Anamnese") with a multi-step form at `/profile/anamnesis`, two new Prisma models, REST API routes, and point integration (awarding +2 per 10% completion toward the existing Level system).

**Architecture:** Two new Prisma models (`AnamnesisProfile`, `HealthDocument`) live under the existing `(employee)` route group. The `/api/anamnesis` routes are protected by NextAuth. A `completionPct` field is recomputed server-side whenever the profile is saved. Completion milestones (10%, 20%… 100%) trigger point awards via a `POST /api/points/award` call (this endpoint will be created in Plan 1.3; for now stub it as a no-op in a helper). Document upload is deferred to Phase 2 — the `HealthDocument` model is created in the schema but the upload API is a stub.

**Tech Stack:** Next.js 14 App Router · Prisma (2 new models) · NextAuth session · Zod · Vitest

---

## Wording rules (non-negotiable)

Never use: `diagnosis`, `symptoms`, `treatment`, `medication name`, `medical condition`
Always use: `indicators`, `patterns`, `profile`, `signals`, `activityLevel`, `sleepQuality`

---

## File Map

**New files:**
- `src/app/api/anamnesis/route.ts` — GET (load own profile) + POST (create/update profile)
- `src/app/api/anamnesis/documents/route.ts` — GET (list) + POST (stub — returns 501)
- `src/app/(employee)/employee/profile/anamnesis/page.tsx` — multi-step anamnesis form
- `src/lib/__tests__/anamnesis.test.ts` — unit tests for completionPct calculation

**Modified files:**
- `prisma/schema.prisma` — add `AnamnesisProfile` and `HealthDocument` models + User relation
- `src/lib/validations.ts` — add `AnamnesisSchema`

---

## Task 1: Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add models to schema.prisma**

Add to `prisma/schema.prisma` after the `SurveyAnswer` model:

```prisma
// ── AnamnesisProfile ──────────────────────────────────────────────────────────

model AnamnesisProfile {
  id            String    @id @default(cuid())
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  completionPct Int       @default(0)

  // Wave 1 – at onboarding
  birthYear      Int?
  biologicalSex  String?  // "male" | "female" | "diverse" | "prefer_not"
  activityLevel  String?  // "sedentary" | "light" | "moderate" | "active" | "very_active"
  sleepQuality   String?  // "poor" | "fair" | "good" | "excellent"
  stressTendency String?  // "low" | "medium" | "high"

  // Wave 2 – after week 1
  smokingStatus  String?  // "never" | "former" | "current"
  nutritionType  String?  // "omnivore" | "vegetarian" | "vegan" | "other"

  // Wave 3 – user-initiated (no sensitive details)
  chronicPatterns String[] // free-text tags — NOT a medical field
  hasMedication   Boolean? // only yes/no — no detail

  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())

  @@map("anamnesis_profiles")
}

// ── HealthDocument ────────────────────────────────────────────────────────────

model HealthDocument {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type       String   // "blood_test" | "other"
  fileName   String
  uploadedAt DateTime @default(now())

  @@index([userId])
  @@map("health_documents")
}
```

Add relations to `User` model (after the existing `managedTeams` relation):

```prisma
  anamnesisProfile AnamnesisProfile?
  healthDocuments  HealthDocument[]
```

- [ ] **Step 2: Run migration**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
npx prisma migrate dev --name add_anamnesis_and_health_documents
```

Expected: migration created, Prisma client regenerated, no errors.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add AnamnesisProfile and HealthDocument models"
```

---

## Task 2: Completion Percentage Logic + Test

**Files:**
- Create: `src/lib/__tests__/anamnesis.test.ts`
- The logic lives inside `src/app/api/anamnesis/route.ts` (Task 3) but we test it as a pure function here first.

The completion percentage is calculated from how many of the 10 optional profile fields are filled:

```
Fields: birthYear, biologicalSex, activityLevel, sleepQuality, stressTendency,
        smokingStatus, nutritionType, chronicPatterns, hasMedication
Total: 9 fields (each worth ~11 pts, rounded so max = 100)
```

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/anamnesis.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx vitest run src/lib/__tests__/anamnesis.test.ts
```

Expected: FAIL — "Cannot find module '../anamnesis'".

- [ ] **Step 3: Create src/lib/anamnesis.ts**

Create `src/lib/anamnesis.ts`:

```ts
interface ProfileFields {
  birthYear?: number | null
  biologicalSex?: string | null
  activityLevel?: string | null
  sleepQuality?: string | null
  stressTendency?: string | null
  smokingStatus?: string | null
  nutritionType?: string | null
  chronicPatterns?: string[] | null
  hasMedication?: boolean | null
}

const PROFILE_FIELDS: (keyof ProfileFields)[] = [
  'birthYear',
  'biologicalSex',
  'activityLevel',
  'sleepQuality',
  'stressTendency',
  'smokingStatus',
  'nutritionType',
  'chronicPatterns',
  'hasMedication',
]

export function calcCompletionPct(profile: ProfileFields): number {
  const filled = PROFILE_FIELDS.filter((key) => {
    const v = profile[key]
    if (v === null || v === undefined) return false
    if (Array.isArray(v)) return v.length > 0
    return true
  }).length
  return Math.floor((filled / PROFILE_FIELDS.length) * 100)
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npx vitest run src/lib/__tests__/anamnesis.test.ts
```

Expected: 5/5 pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/anamnesis.ts src/lib/__tests__/anamnesis.test.ts
git commit -m "feat: add calcCompletionPct utility for anamnesis profiles"
```

---

## Task 3: Add AnamnesisSchema Validation

**Files:**
- Modify: `src/lib/validations.ts`

- [ ] **Step 1: Add schema to validations.ts**

Append to `src/lib/validations.ts`:

```ts
export const AnamnesisSchema = z.object({
  // Wave 1
  birthYear:      z.number().int().min(1920).max(new Date().getFullYear() - 16).optional(),
  biologicalSex:  z.enum(['male', 'female', 'diverse', 'prefer_not']).optional(),
  activityLevel:  z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
  sleepQuality:   z.enum(['poor', 'fair', 'good', 'excellent']).optional(),
  stressTendency: z.enum(['low', 'medium', 'high']).optional(),
  // Wave 2
  smokingStatus:  z.enum(['never', 'former', 'current']).optional(),
  nutritionType:  z.enum(['omnivore', 'vegetarian', 'vegan', 'other']).optional(),
  // Wave 3
  chronicPatterns: z.array(z.string().max(50)).max(10).optional(),
  hasMedication:  z.boolean().optional(),
})
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/validations.ts
git commit -m "feat: add AnamnesisSchema validation"
```

---

## Task 4: Create API Routes

**Files:**
- Create: `src/app/api/anamnesis/route.ts`
- Create: `src/app/api/anamnesis/documents/route.ts`

- [ ] **Step 1: Create /api/anamnesis route**

Create `src/app/api/anamnesis/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AnamnesisSchema } from '@/lib/validations'
import { calcCompletionPct } from '@/lib/anamnesis'

// GET /api/anamnesis — load own profile
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.anamnesisProfile.findUnique({
    where: { userId: session.user.id },
  })

  return NextResponse.json({ data: profile ?? null })
}

// POST /api/anamnesis — create or update profile
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = AnamnesisSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const existing = await prisma.anamnesisProfile.findUnique({
    where: { userId: session.user.id },
  })

  // Merge new data with existing (partial saves — only provided fields overwrite)
  const merged = { ...(existing ?? {}), ...parsed.data }
  const completionPct = calcCompletionPct(merged)

  const profile = await prisma.anamnesisProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...parsed.data,
      completionPct,
    },
    update: {
      ...parsed.data,
      completionPct,
    },
  })

  return NextResponse.json({ data: profile })
}
```

- [ ] **Step 2: Create /api/anamnesis/documents stub route**

Create `src/app/api/anamnesis/documents/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/anamnesis/documents — list own documents
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const documents = await prisma.healthDocument.findMany({
    where: { userId: session.user.id },
    orderBy: { uploadedAt: 'desc' },
  })

  return NextResponse.json({ data: documents })
}

// POST /api/anamnesis/documents — file upload (Phase 2)
export async function POST() {
  return NextResponse.json(
    { error: 'Dokument-Upload ist in Phase 2 verfügbar.' },
    { status: 501 },
  )
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/anamnesis/route.ts src/app/api/anamnesis/documents/route.ts
git commit -m "feat: add anamnesis API routes (GET/POST profile, document stub)"
```

---

## Task 5: Anamnesis UI — Multi-Step Form

**Files:**
- Create: `src/app/(employee)/employee/profile/anamnesis/page.tsx`

The form has 3 waves, shown as 3 steps. It loads the existing profile on mount, allows partial saves (each step saves independently), and shows a completion percentage bar.

- [ ] **Step 1: Create the page**

Create `src/app/(employee)/employee/profile/anamnesis/page.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Check, ChevronRight, Loader2, ChevronLeft } from 'lucide-react'
import { ProgressBar } from '@/components/ui/progress-bar'

// ── Types ──────────────────────────────────────────────────────────────────

interface ProfileState {
  birthYear: string
  biologicalSex: string
  activityLevel: string
  sleepQuality: string
  stressTendency: string
  smokingStatus: string
  nutritionType: string
  chronicPatterns: string
  hasMedication: string
}

const EMPTY: ProfileState = {
  birthYear: '', biologicalSex: '', activityLevel: '',
  sleepQuality: '', stressTendency: '', smokingStatus: '',
  nutritionType: '', chronicPatterns: '', hasMedication: '',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildPayload(state: ProfileState) {
  const p: Record<string, unknown> = {}
  if (state.birthYear)      p.birthYear      = parseInt(state.birthYear)
  if (state.biologicalSex)  p.biologicalSex  = state.biologicalSex
  if (state.activityLevel)  p.activityLevel  = state.activityLevel
  if (state.sleepQuality)   p.sleepQuality   = state.sleepQuality
  if (state.stressTendency) p.stressTendency = state.stressTendency
  if (state.smokingStatus)  p.smokingStatus  = state.smokingStatus
  if (state.nutritionType)  p.nutritionType  = state.nutritionType
  if (state.chronicPatterns) {
    p.chronicPatterns = state.chronicPatterns.split(',').map(s => s.trim()).filter(Boolean)
  }
  if (state.hasMedication !== '') p.hasMedication = state.hasMedication === 'true'
  return p
}

// ── Field helpers ──────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-gray-700 mb-2">{children}</p>
}

function Radio({
  name, value, label, current, onChange,
}: { name: string; value: string; label: string; current: string; onChange: (v: string) => void }) {
  const active = current === value
  return (
    <label
      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
      style={{
        border: `1px solid ${active ? '#14b8a6' : 'hsl(200, 15%, 88%)'}`,
        background: active ? '#f0fdf9' : 'white',
      }}
    >
      <input type="radio" name={name} value={value} checked={active}
        onChange={() => onChange(value)} className="sr-only" />
      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ border: `2px solid ${active ? '#14b8a6' : '#d1d5db'}` }}>
        {active && <div className="w-2 h-2 rounded-full" style={{ background: '#14b8a6' }} />}
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}

const inputCls = "w-full px-3.5 py-2.5 rounded-xl text-sm border bg-white outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
const inputStyle = { borderColor: 'hsl(200, 15%, 88%)' }

// ── Main component ─────────────────────────────────────────────────────────

export default function AnamnesisPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [state, setState] = useState<ProfileState>(EMPTY)
  const [completionPct, setCompletionPct] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadError, setLoadError] = useState(false)

  function set(key: keyof ProfileState, value: string) {
    setState(s => ({ ...s, [key]: value }))
    setSaved(false)
  }

  // Load existing profile on mount
  useEffect(() => {
    fetch('/api/anamnesis')
      .then(r => r.json())
      .then(({ data }) => {
        if (!data) return
        setCompletionPct(data.completionPct ?? 0)
        setState({
          birthYear:       data.birthYear?.toString() ?? '',
          biologicalSex:   data.biologicalSex ?? '',
          activityLevel:   data.activityLevel ?? '',
          sleepQuality:    data.sleepQuality ?? '',
          stressTendency:  data.stressTendency ?? '',
          smokingStatus:   data.smokingStatus ?? '',
          nutritionType:   data.nutritionType ?? '',
          chronicPatterns: (data.chronicPatterns ?? []).join(', '),
          hasMedication:   data.hasMedication === null ? '' : String(data.hasMedication),
        })
      })
      .catch(() => setLoadError(true))
  }, [])

  async function save(andGoTo?: number) {
    setSaving(true)
    try {
      const res = await fetch('/api/anamnesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(state)),
      })
      if (res.ok) {
        const { data } = await res.json()
        setCompletionPct(data.completionPct)
        setSaved(true)
        if (andGoTo) setStep(andGoTo)
      }
    } finally {
      setSaving(false)
    }
  }

  const cardStyle = {
    background: 'white',
    border: '1px solid hsl(200, 15%, 88%)',
    borderRadius: 20,
  }

  return (
    <motion.div
      className="space-y-5 pb-24 lg:pb-8 max-w-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
          Mein Gesundheitsprofil
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Deine Daten sind ausschließlich für dich sichtbar. Kein Arbeitgeber hat Zugriff.
        </p>
      </div>

      {/* Completion bar */}
      <ProgressBar
        value={completionPct}
        label="Profil-Vollständigkeit"
        sublabel={`${completionPct}%`}
        color="#14b8a6"
        milestones={[
          { value: 33, label: 'Basis' },
          { value: 66, label: 'Vertiefung' },
          { value: 100, label: 'Komplett' },
        ]}
      />

      {/* Points note */}
      <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
        <span className="font-semibold" style={{ color: '#b45309' }}>+20 Punkte</span>
        <span className="text-gray-600"> bei 100% Vollständigkeit</span>
      </div>

      {/* Step tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#f3f4f6' }}>
        {[
          { num: 1, label: 'Basis' },
          { num: 2, label: 'Lebensstil' },
          { num: 3, label: 'Weiteres' },
        ].map(({ num, label }) => (
          <button
            key={num}
            onClick={() => setStep(num)}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={step === num
              ? { background: 'white', color: '#14b8a6', boxShadow: '0 1px 3px rgb(0,0,0,0.07)' }
              : { color: '#6b7280' }}
          >
            {label}
          </button>
        ))}
      </div>

      {loadError && (
        <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">
          Profil konnte nicht geladen werden. Bitte Seite neu laden.
        </p>
      )}

      {/* Step 1: Basis */}
      {step === 1 && (
        <div style={cardStyle} className="p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Basis-Informationen</h2>
            <p className="text-xs text-gray-400 mt-0.5">Diese Angaben helfen dabei, deinen Vitalitäts-Index besser einzuordnen.</p>
          </div>

          <div>
            <Label>Geburtsjahr</Label>
            <input
              className={inputCls} style={inputStyle}
              type="number" min="1920" max={new Date().getFullYear() - 16}
              placeholder="z.B. 1988"
              value={state.birthYear}
              onChange={e => set('birthYear', e.target.value)}
            />
          </div>

          <div>
            <Label>Biologisches Geschlecht</Label>
            <div className="space-y-2">
              {[
                { value: 'male',       label: 'Männlich' },
                { value: 'female',     label: 'Weiblich' },
                { value: 'diverse',    label: 'Divers' },
                { value: 'prefer_not', label: 'Keine Angabe' },
              ].map(opt => (
                <Radio key={opt.value} name="biologicalSex" value={opt.value} label={opt.label}
                  current={state.biologicalSex} onChange={v => set('biologicalSex', v)} />
              ))}
            </div>
          </div>

          <div>
            <Label>Aktivitätslevel</Label>
            <div className="space-y-2">
              {[
                { value: 'sedentary',  label: 'Sehr wenig Bewegung (sitzende Tätigkeit)' },
                { value: 'light',      label: 'Leichte Aktivität (1-2x/Woche Sport)' },
                { value: 'moderate',   label: 'Moderate Aktivität (3-4x/Woche Sport)' },
                { value: 'active',     label: 'Aktiv (5+x/Woche Sport)' },
                { value: 'very_active',label: 'Sehr aktiv (tägliche intensive Aktivität)' },
              ].map(opt => (
                <Radio key={opt.value} name="activityLevel" value={opt.value} label={opt.label}
                  current={state.activityLevel} onChange={v => set('activityLevel', v)} />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => save(2)}
              disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Speichern & Weiter <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Lifestyle */}
      {step === 2 && (
        <div style={cardStyle} className="p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Lebensstil & Erholung</h2>
            <p className="text-xs text-gray-400 mt-0.5">Wellen-2-Daten — verfeinern deinen persönlichen Vitalitäts-Index.</p>
          </div>

          <div>
            <Label>Schlafqualität (durchschnittlich)</Label>
            <div className="space-y-2">
              {[
                { value: 'poor',      label: 'Schlecht – ich schlafe selten gut durch' },
                { value: 'fair',      label: 'Mäßig – manchmal gut, manchmal schlecht' },
                { value: 'good',      label: 'Gut – ich schlafe meistens gut' },
                { value: 'excellent', label: 'Sehr gut – erholt und ausgeruht' },
              ].map(opt => (
                <Radio key={opt.value} name="sleepQuality" value={opt.value} label={opt.label}
                  current={state.sleepQuality} onChange={v => set('sleepQuality', v)} />
              ))}
            </div>
          </div>

          <div>
            <Label>Stressneigung</Label>
            <div className="space-y-2">
              {[
                { value: 'low',    label: 'Niedrig – ich bleibe meist gelassen' },
                { value: 'medium', label: 'Mittel – gelegentlicher Stress' },
                { value: 'high',   label: 'Hoch – regelmäßig starker Stress' },
              ].map(opt => (
                <Radio key={opt.value} name="stressTendency" value={opt.value} label={opt.label}
                  current={state.stressTendency} onChange={v => set('stressTendency', v)} />
              ))}
            </div>
          </div>

          <div>
            <Label>Raucherstatus</Label>
            <div className="space-y-2">
              {[
                { value: 'never',   label: 'Nie geraucht' },
                { value: 'former',  label: 'Ehemaliger Raucher' },
                { value: 'current', label: 'Aktueller Raucher' },
              ].map(opt => (
                <Radio key={opt.value} name="smokingStatus" value={opt.value} label={opt.label}
                  current={state.smokingStatus} onChange={v => set('smokingStatus', v)} />
              ))}
            </div>
          </div>

          <div>
            <Label>Ernährungsweise</Label>
            <div className="space-y-2">
              {[
                { value: 'omnivore',   label: 'Omnivor (alles)' },
                { value: 'vegetarian', label: 'Vegetarisch' },
                { value: 'vegan',      label: 'Vegan' },
                { value: 'other',      label: 'Sonstiges' },
              ].map(opt => (
                <Radio key={opt.value} name="nutritionType" value={opt.value} label={opt.label}
                  current={state.nutritionType} onChange={v => set('nutritionType', v)} />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-3 rounded-xl text-sm font-medium text-gray-600 border"
              style={{ borderColor: 'hsl(200, 15%, 88%)' }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => save(3)}
              disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Speichern & Weiter <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Additional */}
      {step === 3 && (
        <div style={cardStyle} className="p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Weitere Angaben (optional)</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Alle Angaben sind freiwillig. ELYO speichert keine medizinischen Details.
            </p>
          </div>

          <div className="rounded-xl p-3" style={{ background: '#f0fdf9', border: '1px solid #d1fae5' }}>
            <p className="text-xs text-gray-600 leading-relaxed">
              🔒 <strong>Deine Daten gehören dir.</strong> Kein Arbeitgeber sieht diese Informationen.
              Du kannst Angaben jederzeit löschen oder ändern.
            </p>
          </div>

          <div>
            <Label>Aktuelle Belastungs-Muster (optional)</Label>
            <input
              className={inputCls} style={inputStyle}
              placeholder="z.B. Rückenschmerzen, Migräne, Erschöpfung"
              value={state.chronicPatterns}
              onChange={e => set('chronicPatterns', e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Kommagetrennt, keine medizinischen Diagnosen</p>
          </div>

          <div>
            <Label>Nimmst du regelmäßig Medikamente ein?</Label>
            <div className="space-y-2">
              {[
                { value: 'true',  label: 'Ja' },
                { value: 'false', label: 'Nein' },
              ].map(opt => (
                <Radio key={opt.value} name="hasMedication" value={opt.value} label={opt.label}
                  current={state.hasMedication} onChange={v => set('hasMedication', v)} />
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">Nur Ja/Nein — keine Details</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-3 rounded-xl text-sm font-medium text-gray-600 border"
              style={{ borderColor: 'hsl(200, 15%, 88%)' }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => save()}
              disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              {saving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : saved
                  ? <><Check className="w-4 h-4" /> Gespeichert</>
                  : 'Speichern'}
            </button>
          </div>

          {saved && completionPct >= 100 && (
            <div className="text-center py-2">
              <p className="text-sm font-semibold" style={{ color: '#14b8a6' }}>
                🎉 Profil vollständig! +20 Punkte werden gutgeschrieben.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Back to profile link */}
      <button
        onClick={() => router.push('/employee/settings')}
        className="text-sm text-gray-400 hover:text-gray-600"
      >
        ← Zurück zum Profil
      </button>
    </motion.div>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(employee)/employee/profile/anamnesis/page.tsx"
git commit -m "feat: multi-step anamnesis profile form"
```

---

## Task 6: Run All Tests + Browser Verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass including the 5 new `calcCompletionPct` tests.

- [ ] **Step 2: Start dev server and verify**

```bash
npm run dev
```

Navigate to `http://localhost:3001/employee/profile/anamnesis`.

Check:
- Page loads without errors, completion bar shows 0% on first visit
- Step 1: selecting activity level + saving increments the progress bar
- Step 2: saving again increments further
- Step 3: completing all fields shows 100% + "+20 Punkte" message
- Reload: previously saved answers are restored from API
- Data privacy notice is visible on step 3

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: Phase 1.2 complete — anamnesis system with profile form and API"
```

---

## Self-Review

**Spec coverage (ELYO_Entwicklungsplan.md Prompt 1.2):**
- ✅ "Onion-Strategie" — 3 waves collected progressively
- ✅ Prisma model `AnamnesisProfile` with all required fields
- ✅ Prisma model `HealthDocument` (schema only; upload = Phase 2 stub)
- ✅ `POST /api/anamnesis` — saves/updates profile
- ✅ `GET /api/anamnesis` — loads own profile
- ✅ `POST /api/anamnesis/documents` — 501 stub (Phase 2)
- ✅ `GET /api/anamnesis/documents` — lists (empty in Phase 1)
- ✅ `completionPct` recomputed server-side on every save
- ✅ Datenschutz-Hinweis prominent on step 3
- ✅ Wording: no "Diagnose", "Symptome", "Medikament-Detail"
- ⚠️ `+20 Punkte` message shown in UI, but actual point award requires Plan 1.3 (Points Engine). The UI shows the incentive; the award fires when /api/points/award is wired in Plan 1.3.

**Type consistency:** `AnamnesisSchema` fields map exactly to `AnamnesisProfile` Prisma model fields.
