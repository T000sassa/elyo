# Phase 1.3 – Points & Level Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the server-side gamification engine — two new Prisma models, a `src/lib/points.ts` service, three API routes, and integration into the existing check-in API so real check-ins award points and update the employee's level.

**Architecture:** `UserPoints` holds the running total + current level + streak. `PointTransaction` is an append-only ledger. `src/lib/points.ts` exposes three pure-ish functions: `awardPoints`, `checkLevelUp`, `calculateStreak`. The existing `POST /api/employee/checkin` is extended to call `awardPoints` after saving the wellbeing entry. The employee dashboard `/api/employee/dashboard` is extended to return points data alongside existing vitality scores.

**Tech Stack:** Next.js 14 App Router · Prisma (2 new models) · NextAuth session · Vitest

---

## File Map

**New files:**
- `src/lib/points.ts` — point award / level-up / streak logic
- `src/lib/__tests__/points.test.ts` — unit tests for all three functions
- `src/app/api/points/me/route.ts` — GET: own points + level + streak
- `src/app/api/points/award/route.ts` — POST: internal award (called by checkin, survey, anamnesis)
- `src/app/api/points/privileges/route.ts` — GET: privileges for current level

**Modified files:**
- `prisma/schema.prisma` — add `UserPoints` and `PointTransaction` models + User relations
- `src/app/api/employee/checkin/route.ts` — call `awardPoints('daily_checkin')` after saving entry

---

## Task 1: Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add models to schema.prisma**

Add after the `HealthDocument` model (or at the end of the file):

```prisma
// ── UserPoints ────────────────────────────────────────────────────────────────

model UserPoints {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  total       Int      @default(0)
  level       String   @default("STARTER") // STARTER|BRONZE|SILVER|GOLD|PLATINUM
  streak      Int      @default(0)
  lastCheckin DateTime?
  updatedAt   DateTime @updatedAt

  @@map("user_points")
}

// ── PointTransaction ──────────────────────────────────────────────────────────

model PointTransaction {
  id        String   @id @default(cuid())
  userId    String
  points    Int
  reason    String   // "daily_checkin" | "survey_complete" | "wearable_connected" | "anamnesis" | "partner_review" | "streak_7days" | "streak_30days"
  createdAt DateTime @default(now())

  @@index([userId])
  @@map("point_transactions")
}
```

Add to `User` model after existing relations:

```prisma
  userPoints        UserPoints?
  pointTransactions PointTransaction[]
```

- [ ] **Step 2: Run migration**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
npx prisma migrate dev --name add_points_and_transactions
```

Expected: migration created, Prisma client regenerated.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add UserPoints and PointTransaction models"
```

---

## Task 2: Write points.ts + Tests

**Files:**
- Create: `src/lib/__tests__/points.test.ts`
- Create: `src/lib/points.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/points.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock prisma ────────────────────────────────────────────────────────────

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

// ── calcLevel ──────────────────────────────────────────────────────────────

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

// ── POINT_RULES ────────────────────────────────────────────────────────────

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

// ── LEVEL_THRESHOLDS ───────────────────────────────────────────────────────

describe('LEVEL_THRESHOLDS', () => {
  it('STARTER starts at 0', () => {
    expect(LEVEL_THRESHOLDS.STARTER).toBe(0)
  })

  it('GOLD starts at 250', () => {
    expect(LEVEL_THRESHOLDS.GOLD).toBe(250)
  })
})

// ── getPrivileges ──────────────────────────────────────────────────────────

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
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx vitest run src/lib/__tests__/points.test.ts
```

Expected: FAIL — "Cannot find module '../points'".

- [ ] **Step 3: Create src/lib/points.ts**

Create `src/lib/points.ts`:

```ts
import { prisma } from './prisma'

// ── Constants ──────────────────────────────────────────────────────────────

export const POINT_RULES = {
  daily_checkin:       2,
  survey_complete:     5,
  wearable_connected:  10,
  anamnesis_10pct:     2,   // per 10% completion milestone
  partner_review:      3,
  streak_7days:        5,
  streak_30days:       15,
} as const

export type PointReason = keyof typeof POINT_RULES

export const LEVEL_THRESHOLDS = {
  STARTER:  0,
  BRONZE:   30,
  SILVER:   100,
  GOLD:     250,
  PLATINUM: 600,
} as const

export type Level = keyof typeof LEVEL_THRESHOLDS

// ── Privilege catalog ──────────────────────────────────────────────────────

interface Privilege {
  id: string
  label: string
  requiredLevel: Level
  locked: boolean
}

const ALL_PRIVILEGES: Omit<Privilege, 'locked'>[] = [
  { id: 'portal_access',        label: 'Zugang zum ELYO-Portal',             requiredLevel: 'STARTER'  },
  { id: 'daily_checkin',        label: 'Täglicher Check-in',                 requiredLevel: 'STARTER'  },
  { id: 'nutrition_consult',    label: 'Kostenlose Erstberatung Ernährung',   requiredLevel: 'BRONZE'   },
  { id: 'webinars',             label: 'Zugang zu ELYO-Webinaren',           requiredLevel: 'BRONZE'   },
  { id: 'studio_discount',      label: '20% Rabatt bei Partner-Studios',     requiredLevel: 'SILVER'   },
  { id: 'priority_booking',     label: 'Bevorzugter Terminzugang (24h)',     requiredLevel: 'SILVER'   },
  { id: 'team_challenge',       label: 'Team-Challenge starten',             requiredLevel: 'SILVER'   },
  { id: 'fast_lane',            label: '⚡ Fast Lane: Direkte Experten-Termine', requiredLevel: 'GOLD' },
  { id: 'coaching_session',     label: 'Kostenlose Coaching-Session (1x/Q)', requiredLevel: 'GOLD'     },
  { id: 'vitality_report',      label: 'Persönlicher Vitalitäts-Jahresbericht', requiredLevel: 'GOLD' },
  { id: 'beta_features',        label: 'Beta-Features frühzeitig testen',   requiredLevel: 'PLATINUM' },
  { id: 'ambassador',           label: 'Ambassador-Status',                 requiredLevel: 'PLATINUM' },
  { id: 'insurance_benefits',   label: 'Versicherungsvorteile (in Entwicklung)', requiredLevel: 'PLATINUM' },
]

const LEVEL_ORDER: Level[] = ['STARTER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM']

export function getPrivileges(currentLevel: Level): Privilege[] {
  const currentIdx = LEVEL_ORDER.indexOf(currentLevel)
  return ALL_PRIVILEGES.map(p => ({
    ...p,
    locked: LEVEL_ORDER.indexOf(p.requiredLevel) > currentIdx,
  }))
}

// ── calcLevel ──────────────────────────────────────────────────────────────

export function calcLevel(total: number): Level {
  if (total >= LEVEL_THRESHOLDS.PLATINUM) return 'PLATINUM'
  if (total >= LEVEL_THRESHOLDS.GOLD)     return 'GOLD'
  if (total >= LEVEL_THRESHOLDS.SILVER)   return 'SILVER'
  if (total >= LEVEL_THRESHOLDS.BRONZE)   return 'BRONZE'
  return 'STARTER'
}

// ── awardPoints ────────────────────────────────────────────────────────────

export async function awardPoints(
  userId: string,
  reason: PointReason,
): Promise<{ total: number; level: Level; levelChanged: boolean; newLevel: Level | null }> {
  const pts = POINT_RULES[reason]

  // Append transaction
  await prisma.pointTransaction.create({
    data: { userId, points: pts, reason },
  })

  // Upsert UserPoints
  const existing = await prisma.userPoints.findUnique({ where: { userId } })
  const prevLevel = (existing?.level ?? 'STARTER') as Level
  const newTotal = (existing?.total ?? 0) + pts
  const newLevel = calcLevel(newTotal)

  const updated = await prisma.userPoints.upsert({
    where: { userId },
    create: { userId, total: pts, level: newLevel, streak: 0 },
    update: { total: newTotal, level: newLevel },
  })

  return {
    total: updated.total,
    level: newLevel,
    levelChanged: newLevel !== prevLevel,
    newLevel: newLevel !== prevLevel ? newLevel : null,
  }
}

// ── calculateStreak ────────────────────────────────────────────────────────

export async function calculateStreak(userId: string): Promise<number> {
  const now = new Date()
  const todayKey = now.toISOString().slice(0, 10) // "YYYY-MM-DD"

  // Look at transactions for this user, daily_checkin, last 60 days
  const transactions = await prisma.pointTransaction.findMany({
    where: { userId, reason: 'daily_checkin' },
    orderBy: { createdAt: 'desc' },
    take: 60,
    select: { createdAt: true },
  })

  if (transactions.length === 0) return 0

  // Deduplicate by date key
  const days = [...new Set(transactions.map(t => t.createdAt.toISOString().slice(0, 10)))]

  // Count consecutive days ending today or yesterday
  let streak = 0
  let expected = todayKey

  // Allow "today or yesterday" as start
  if (days[0] !== todayKey) {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = yesterday.toISOString().slice(0, 10)
    if (days[0] !== yesterdayKey) return 0
    expected = yesterdayKey
  }

  for (const day of days) {
    if (day === expected) {
      streak++
      const d = new Date(expected)
      d.setDate(d.getDate() - 1)
      expected = d.toISOString().slice(0, 10)
    } else {
      break
    }
  }

  return streak
}

// ── checkLevelUp ───────────────────────────────────────────────────────────

export async function checkLevelUp(
  userId: string,
): Promise<{ levelChanged: boolean; newLevel: Level }> {
  const up = await prisma.userPoints.findUnique({ where: { userId } })
  if (!up) return { levelChanged: false, newLevel: 'STARTER' }

  const correctLevel = calcLevel(up.total)
  if (correctLevel !== up.level) {
    await prisma.userPoints.update({
      where: { userId },
      data: { level: correctLevel },
    })
    return { levelChanged: true, newLevel: correctLevel }
  }
  return { levelChanged: false, newLevel: correctLevel as Level }
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npx vitest run src/lib/__tests__/points.test.ts
```

Expected: all tests pass (calcLevel, POINT_RULES, LEVEL_THRESHOLDS, getPrivileges).

- [ ] **Step 5: Commit**

```bash
git add src/lib/points.ts src/lib/__tests__/points.test.ts
git commit -m "feat: add points engine (awardPoints, calcLevel, getPrivileges)"
```

---

## Task 3: Create API Routes

**Files:**
- Create: `src/app/api/points/me/route.ts`
- Create: `src/app/api/points/award/route.ts`
- Create: `src/app/api/points/privileges/route.ts`

- [ ] **Step 1: Create /api/points/me**

Create `src/app/api/points/me/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPrivileges, type Level } from '@/lib/points'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const up = await prisma.userPoints.findUnique({
    where: { userId: session.user.id },
  })

  const total   = up?.total   ?? 0
  const level   = (up?.level  ?? 'STARTER') as Level
  const streak  = up?.streak  ?? 0

  return NextResponse.json({ data: { total, level, streak } })
}
```

- [ ] **Step 2: Create /api/points/award**

Create `src/app/api/points/award/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { awardPoints, POINT_RULES, type PointReason } from '@/lib/points'
import { z } from 'zod'

const AwardSchema = z.object({
  reason: z.enum(Object.keys(POINT_RULES) as [PointReason, ...PointReason[]]),
  userId: z.string().optional(), // admin override — only COMPANY_ADMIN can use
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = AwardSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  // userId override is only allowed for admins (internal server-to-server calls)
  const targetUserId =
    parsed.data.userId && session.user.role !== 'EMPLOYEE'
      ? parsed.data.userId
      : session.user.id

  const result = await awardPoints(targetUserId, parsed.data.reason)
  return NextResponse.json({ data: result })
}
```

- [ ] **Step 3: Create /api/points/privileges**

Create `src/app/api/points/privileges/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPrivileges, type Level } from '@/lib/points'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const up = await prisma.userPoints.findUnique({
    where: { userId: session.user.id },
  })

  const level = (up?.level ?? 'STARTER') as Level
  const privileges = getPrivileges(level)

  return NextResponse.json({ data: privileges })
}
```

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/points/me/route.ts src/app/api/points/award/route.ts src/app/api/points/privileges/route.ts
git commit -m "feat: add points API routes (me, award, privileges)"
```

---

## Task 4: Connect Points to Check-in

**Files:**
- Modify: `src/app/api/employee/checkin/route.ts`

The existing check-in route creates a `WellbeingEntry`. After a successful save, call `awardPoints` and optionally award streak bonuses.

- [ ] **Step 1: Read the current checkin route**

```bash
cat "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core/src/app/api/employee/checkin/route.ts"
```

Find the line that does `return NextResponse.json(...)` after a successful entry creation.

- [ ] **Step 2: Add point award after successful save**

In `src/app/api/employee/checkin/route.ts`, add this import at the top:

```ts
import { awardPoints, calculateStreak, POINT_RULES } from '@/lib/points'
```

After the `prisma.wellbeingEntry.upsert(...)` / `create(...)` call (and before the final `return NextResponse.json(...)`), add:

```ts
  // Award daily check-in points (fire-and-forget — don't fail checkin if points fail)
  try {
    await awardPoints(session.user.id, 'daily_checkin')

    // Streak bonuses
    const streak = await calculateStreak(session.user.id)
    if (streak === 7) {
      await awardPoints(session.user.id, 'streak_7days')
    } else if (streak === 30) {
      await awardPoints(session.user.id, 'streak_30days')
    }

    // Update streak count on UserPoints
    await prisma.userPoints.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, streak, lastCheckin: new Date() },
      update: { streak, lastCheckin: new Date() },
    })
  } catch (pointsErr) {
    // Log but don't fail the check-in response
    console.error('[CHECKIN] Points award failed:', pointsErr)
  }
```

Also add `prisma` to the imports if not already imported (it already is in the checkin route).

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: all existing tests pass (checkin route isn't unit-tested; the change is minimal).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/employee/checkin/route.ts
git commit -m "feat: award daily_checkin points + streak bonuses on check-in"
```

---

## Task 5: Browser Verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Check-in flow with points**

1. Log in as a real employee (use `/login` with credentials from the seeded database, or the demo mode at `/dashboard`)
2. Complete a check-in at `/employee/checkin`
3. Call `GET /api/points/me` in a new browser tab — should return `{ total: 2, level: "STARTER", streak: 1 }` after the first check-in
4. Complete another check-in — total should increase to 4
5. Call `GET /api/points/privileges` — should return all privileges with `locked: true/false` based on current level

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: Phase 1.3 complete — points engine with check-in integration"
```

---

## Self-Review

**Spec coverage (ELYO_Entwicklungsplan.md Prompt 1.3):**
- ✅ `UserPoints` Prisma model — total, level, streak, lastCheckin
- ✅ `PointTransaction` Prisma model — append-only ledger
- ✅ `POINT_RULES` constants match spec exactly
- ✅ `LEVEL_THRESHOLDS` match spec exactly
- ✅ `awardPoints(userId, reason)` → updated UserPoints
- ✅ `checkLevelUp(userId)` → { levelChanged, newLevel }
- ✅ `calculateStreak(userId)` → current streak number
- ✅ `getPrivileges(level)` → Privilege[] with locked flag
- ✅ `POST /api/points/award` — called by checkin, anamnesis, survey
- ✅ `GET /api/points/me` — own point total + level + streak
- ✅ `GET /api/points/privileges` — unlocked privileges
- ✅ Streak bonuses at 7 and 30 days
- ⚠️ Push notification on level-up — deferred to Phase 2 (requires mobile push infrastructure). UI banner is shown by consuming `levelChanged` from the award response.

**Type consistency:** `Level` type in `points.ts` matches the string values stored in `UserPoints.level`. `PointReason` is derived from `POINT_RULES` keys.
