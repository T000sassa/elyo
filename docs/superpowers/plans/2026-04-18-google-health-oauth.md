# Google Health OAuth Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Google Fitness API per OAuth anbinden: Nutzer verbinden ihr Google-Konto, tägliche Aktivitätsdaten werden automatisch via konsolidiertem Cron-Job synchronisiert.

**Architecture:** `src/lib/googleHealth.ts` kapselt alle OAuth- und Fitness-API-Logik. Vier schlanke API-Routen delegieren an diese Lib. Der konsolidierte Cron unter `/api/cron/route.ts` ersetzt die zwei bestehenden Einzelrouten und ergänzt `wearable-sync`. `awardPoints` für `wearable_connected` wird manuell via `PointTransaction`-Lookup idempotent gemacht (die Engine prüft das nicht selbst).

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma, Node.js `crypto` (HMAC), Vitest

---

## File Map

| Aktion  | Datei                                                              | Verantwortung                                          |
|---------|--------------------------------------------------------------------|--------------------------------------------------------|
| Create  | `src/lib/googleHealth.ts`                                          | OAuth-Flow, Token-Refresh, Fitness-API-Fetcher         |
| Create  | `src/lib/__tests__/googleHealth.test.ts`                           | Unit-Tests für googleHealth (fetch gemockt)            |
| Create  | `src/app/api/wearables/google/connect/route.ts`                    | Redirect zu Google OAuth-Consent                       |
| Create  | `src/app/api/wearables/google/callback/route.ts`                   | Code-Exchange, Redirect nach /profile/data-sources     |
| Create  | `src/app/api/wearables/google/sync/route.ts`                       | Manueller Sync-Trigger (letzte 7 Tage)                 |
| Create  | `src/app/api/wearables/google/disconnect/route.ts`                 | Verbindung trennen                                     |
| Create  | `src/app/api/cron/route.ts`                                        | Konsolidierte Cron-Route mit action-Parameter          |
| Delete  | `src/app/api/cron/checkin-reminder/route.ts`                       | Logik migriert nach route.ts                           |
| Delete  | `src/app/api/cron/weekly-digest/route.ts`                          | Logik migriert nach route.ts                           |
| Modify  | `.env.example`                                                     | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, OAUTH_HMAC_SECRET |

---

## Task 1: `googleHealth.ts` Kern-Bibliothek (TDD)

**Files:**
- Create: `src/lib/__tests__/googleHealth.test.ts`
- Create: `src/lib/googleHealth.ts`

- [ ] **Schritt 1: Failing Tests schreiben**

Erstelle `src/lib/__tests__/googleHealth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockFindUnique, mockUpsert, mockUpdate, mockUpdateMany, mockFindFirst } = vi.hoisted(() => ({
  mockFindUnique:  vi.fn(),
  mockUpsert:      vi.fn(),
  mockUpdate:      vi.fn(),
  mockUpdateMany:  vi.fn(),
  mockFindFirst:   vi.fn(),
}))

vi.mock('../prisma', () => ({
  prisma: {
    wearableConnection: {
      findUnique:  mockFindUnique,
      upsert:      mockUpsert,
      update:      mockUpdate,
      updateMany:  mockUpdateMany,
    },
    wearableSync: {
      upsert: vi.fn(),
    },
    pointTransaction: {
      findFirst: mockFindFirst,
    },
  },
}))

vi.mock('../crypto', () => ({
  encryptToken: (s: string) => `enc:${s}`,
  decryptToken: (s: string) => s.replace('enc:', ''),
}))

vi.mock('../points', () => ({
  awardPoints: vi.fn(),
}))

import { getAuthUrl, exchangeCode, refreshAccessTokenIfNeeded, disconnectUser } from '../googleHealth'
import { awardPoints } from '../points'

const VALID_KEY = 'a'.repeat(64)

beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID     = 'test-client-id'
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
  process.env.NEXTAUTH_URL         = 'http://localhost:3000'
  process.env.OAUTH_HMAC_SECRET    = 'test-hmac-secret'
  process.env.ENCRYPTION_KEY       = VALID_KEY
  vi.resetAllMocks()
})

afterEach(() => {
  delete process.env.GOOGLE_CLIENT_ID
  delete process.env.GOOGLE_CLIENT_SECRET
  delete process.env.NEXTAUTH_URL
  delete process.env.OAUTH_HMAC_SECRET
  delete process.env.ENCRYPTION_KEY
})

describe('getAuthUrl', () => {
  it('enthält alle drei Fitness-Scopes', () => {
    const url = getAuthUrl('user-123')
    expect(url).toContain('fitness.activity.read')
    expect(url).toContain('fitness.sleep.read')
    expect(url).toContain('fitness.heart_rate.read')
  })

  it('enthält den state-Parameter mit userId', () => {
    const url = getAuthUrl('user-abc')
    const parsed = new URL(url)
    const state = parsed.searchParams.get('state')!
    const decoded = Buffer.from(state, 'base64url').toString('utf8')
    expect(decoded.startsWith('user-abc.')).toBe(true)
  })

  it('enthält access_type=offline und prompt=consent', () => {
    const url = getAuthUrl('user-123')
    expect(url).toContain('access_type=offline')
    expect(url).toContain('prompt=consent')
  })

  it('wirft wenn GOOGLE_CLIENT_ID fehlt', () => {
    delete process.env.GOOGLE_CLIENT_ID
    expect(() => getAuthUrl('user-123')).toThrow('GOOGLE_CLIENT_ID')
  })
})

describe('exchangeCode', () => {
  it('speichert verschlüsselten Token in WearableConnection', async () => {
    const stateUrl = getAuthUrl('user-xyz')
    const state = new URL(stateUrl).searchParams.get('state')!

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token:  'access-abc',
        refresh_token: 'refresh-abc',
        expires_in:    3600,
      }),
    } as Response)

    mockFindFirst.mockResolvedValueOnce(null) // noch kein wearable_connected
    mockUpsert.mockResolvedValueOnce({})

    await exchangeCode('auth-code', state)

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_source: { userId: 'user-xyz', source: 'google_health' } },
      })
    )
  })

  it('ruft awardPoints auf wenn noch nicht vergeben', async () => {
    const state = new URL(getAuthUrl('user-xyz')).searchParams.get('state')!
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'a', refresh_token: 'r', expires_in: 3600 }),
    } as Response)
    mockFindFirst.mockResolvedValueOnce(null)
    mockUpsert.mockResolvedValueOnce({})

    await exchangeCode('code', state)

    expect(awardPoints).toHaveBeenCalledWith('user-xyz', 'wearable_connected')
  })

  it('ruft awardPoints NICHT auf wenn bereits vergeben', async () => {
    const state = new URL(getAuthUrl('user-xyz')).searchParams.get('state')!
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'a', refresh_token: 'r', expires_in: 3600 }),
    } as Response)
    mockFindFirst.mockResolvedValueOnce({ id: 'existing-tx' }) // bereits vergeben
    mockUpsert.mockResolvedValueOnce({})

    await exchangeCode('code', state)

    expect(awardPoints).not.toHaveBeenCalled()
  })

  it('wirft bei manipuliertem State', async () => {
    await expect(exchangeCode('code', 'invalid-state')).rejects.toThrow()
  })
})

describe('refreshAccessTokenIfNeeded', () => {
  it('erneuert Token wenn expiresAt in weniger als 5 Minuten', async () => {
    const soonExpiry = new Date(Date.now() + 2 * 60 * 1000) // in 2 Min
    mockFindUnique.mockResolvedValueOnce({
      isActive:     true,
      accessToken:  'enc:old-access',
      refreshToken: 'enc:refresh-token',
      expiresAt:    soonExpiry,
    })
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'new-access', expires_in: 3600 }),
    } as Response)
    mockUpdate.mockResolvedValueOnce({})

    await refreshAccessTokenIfNeeded('user-123')

    expect(global.fetch).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('no-op wenn Token noch länger als 5 Minuten gültig', async () => {
    const farFuture = new Date(Date.now() + 60 * 60 * 1000) // in 1h
    mockFindUnique.mockResolvedValueOnce({
      isActive:     true,
      accessToken:  'enc:access',
      refreshToken: 'enc:refresh',
      expiresAt:    farFuture,
    })
    global.fetch = vi.fn()

    await refreshAccessTokenIfNeeded('user-123')

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('no-op wenn keine aktive Verbindung', async () => {
    mockFindUnique.mockResolvedValueOnce(null)
    global.fetch = vi.fn()

    await refreshAccessTokenIfNeeded('user-123')

    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('disconnectUser', () => {
  it('setzt isActive=false und löscht Tokens', async () => {
    mockUpdateMany.mockResolvedValueOnce({ count: 1 })

    await disconnectUser('user-123')

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-123', source: 'google_health' },
      data: { isActive: false, accessToken: null, refreshToken: null },
    })
  })
})
```

- [ ] **Schritt 2: Tests fehlschlagen lassen**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/lib/__tests__/googleHealth.test.ts 2>&1 | head -10
```

Erwartete Ausgabe: `Cannot find module '../googleHealth'`

- [ ] **Schritt 3: `src/lib/googleHealth.ts` implementieren**

Erstelle `src/lib/googleHealth.ts`:

```typescript
import { createHmac } from 'crypto'
import { encryptToken, decryptToken } from './crypto'
import { awardPoints } from './points'
import { prisma } from './prisma'

const GOOGLE_TOKEN_URL    = 'https://oauth2.googleapis.com/token'
const GOOGLE_FITNESS_URL  = 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate'
const SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.sleep.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
]

function getHmacSecret(): string {
  const s = process.env.OAUTH_HMAC_SECRET
  if (!s) throw new Error('OAUTH_HMAC_SECRET environment variable is not set')
  return s
}

function buildState(userId: string): string {
  const hmac = createHmac('sha256', getHmacSecret()).update(userId).digest('hex')
  return Buffer.from(`${userId}.${hmac}`).toString('base64url')
}

function parseState(state: string): string {
  let decoded: string
  try {
    decoded = Buffer.from(state, 'base64url').toString('utf8')
  } catch {
    throw new Error('Invalid OAuth state format')
  }
  const dotIdx = decoded.lastIndexOf('.')
  if (dotIdx === -1) throw new Error('Invalid OAuth state format')
  const userId       = decoded.slice(0, dotIdx)
  const providedHmac = decoded.slice(dotIdx + 1)
  const expectedHmac = createHmac('sha256', getHmacSecret()).update(userId).digest('hex')
  if (providedHmac !== expectedHmac) throw new Error('Invalid OAuth state signature')
  return userId
}

export function getAuthUrl(userId: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID environment variable is not set')
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/wearables/google/callback`
  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         SCOPES.join(' '),
    access_type:   'offline',
    prompt:        'consent',
    state:         buildState(userId),
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeCode(code: string, state: string): Promise<void> {
  const userId      = parseState(state)
  const clientId    = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri  = `${process.env.NEXTAUTH_URL}/api/wearables/google/callback`

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`)
  const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000)
  await prisma.wearableConnection.upsert({
    where:  { userId_source: { userId, source: 'google_health' } },
    create: { userId, source: 'google_health', accessToken: encryptToken(data.access_token), refreshToken: encryptToken(data.refresh_token), expiresAt, isActive: true },
    update: { accessToken: encryptToken(data.access_token), refreshToken: data.refresh_token ? encryptToken(data.refresh_token) : undefined, expiresAt, isActive: true },
  })

  const alreadyAwarded = await prisma.pointTransaction.findFirst({ where: { userId, reason: 'wearable_connected' } })
  if (!alreadyAwarded) await awardPoints(userId, 'wearable_connected')
}

export async function refreshAccessTokenIfNeeded(userId: string): Promise<void> {
  const conn = await prisma.wearableConnection.findUnique({ where: { userId_source: { userId, source: 'google_health' } } })
  if (!conn || !conn.isActive || !conn.refreshToken || !conn.expiresAt) return

  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000)
  if (conn.expiresAt > fiveMinFromNow) return

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({ refresh_token: decryptToken(conn.refreshToken), client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, grant_type: 'refresh_token' }),
  })
  if (!res.ok) {
    await prisma.wearableConnection.update({ where: { userId_source: { userId, source: 'google_health' } }, data: { isActive: false } })
    throw new Error(`Token refresh failed: ${res.status}`)
  }
  const data = await res.json() as { access_token: string; expires_in: number }
  await prisma.wearableConnection.update({
    where: { userId_source: { userId, source: 'google_health' } },
    data:  { accessToken: encryptToken(data.access_token), expiresAt: new Date(Date.now() + data.expires_in * 1000) },
  })
}

async function getActiveToken(userId: string): Promise<string> {
  await refreshAccessTokenIfNeeded(userId)
  const conn = await prisma.wearableConnection.findUnique({ where: { userId_source: { userId, source: 'google_health' } } })
  if (!conn || !conn.isActive || !conn.accessToken) throw new Error('No active Google Health connection')
  return decryptToken(conn.accessToken)
}

export async function fetchSteps(userId: string, from: Date, to: Date): Promise<void> {
  const token = await getActiveToken(userId)
  const res = await fetch(GOOGLE_FITNESS_URL, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }], bucketByTime: { durationMillis: 86400000 }, startTimeMillis: from.getTime(), endTimeMillis: to.getTime() }),
  })
  if (!res.ok) throw new Error(`fetchSteps failed: ${res.status}`)
  const data = await res.json() as { bucket: Array<{ startTimeMillis: string; dataset: Array<{ point: Array<{ value: Array<{ intVal?: number }> }> }> }> }

  for (const bucket of data.bucket) {
    const date  = new Date(Number(bucket.startTimeMillis))
    date.setHours(0, 0, 0, 0)
    const steps = bucket.dataset[0]?.point[0]?.value[0]?.intVal ?? null
    if (steps === null) continue
    await prisma.wearableSync.upsert({ where: { userId_source_date: { userId, source: 'google_health', date } }, create: { userId, source: 'google_health', date, steps }, update: { steps } })
  }
}

export async function fetchSleepSessions(userId: string, from: Date, to: Date): Promise<void> {
  const token = await getActiveToken(userId)
  const res = await fetch(GOOGLE_FITNESS_URL, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ aggregateBy: [{ dataTypeName: 'com.google.sleep.segment' }], bucketByTime: { durationMillis: 86400000 }, startTimeMillis: from.getTime(), endTimeMillis: to.getTime() }),
  })
  if (!res.ok) throw new Error(`fetchSleepSessions failed: ${res.status}`)
  const data = await res.json() as { bucket: Array<{ startTimeMillis: string; dataset: Array<{ point: Array<{ startTimeNanos: string; endTimeNanos: string }> }> }> }

  for (const bucket of data.bucket) {
    const date   = new Date(Number(bucket.startTimeMillis))
    date.setHours(0, 0, 0, 0)
    const points = bucket.dataset[0]?.point ?? []
    if (points.length === 0) continue
    const totalMs    = points.reduce((sum, p) => sum + (Number(p.endTimeNanos) - Number(p.startTimeNanos)) / 1_000_000, 0)
    const sleepHours = Math.round((totalMs / 3_600_000) * 10) / 10
    await prisma.wearableSync.upsert({ where: { userId_source_date: { userId, source: 'google_health', date } }, create: { userId, source: 'google_health', date, sleepHours }, update: { sleepHours } })
  }
}

export async function fetchHeartRateAvg(userId: string, from: Date, to: Date): Promise<void> {
  const token = await getActiveToken(userId)
  const res = await fetch(GOOGLE_FITNESS_URL, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ aggregateBy: [{ dataTypeName: 'com.google.heart_rate.bpm' }], bucketByTime: { durationMillis: 86400000 }, startTimeMillis: from.getTime(), endTimeMillis: to.getTime() }),
  })
  if (!res.ok) throw new Error(`fetchHeartRateAvg failed: ${res.status}`)
  const data = await res.json() as { bucket: Array<{ startTimeMillis: string; dataset: Array<{ point: Array<{ value: Array<{ fpVal?: number }> }> }> }> }

  for (const bucket of data.bucket) {
    const date      = new Date(Number(bucket.startTimeMillis))
    date.setHours(0, 0, 0, 0)
    const heartRate = bucket.dataset[0]?.point[0]?.value[0]?.fpVal ?? null
    if (heartRate === null) continue
    await prisma.wearableSync.upsert({ where: { userId_source_date: { userId, source: 'google_health', date } }, create: { userId, source: 'google_health', date, heartRate }, update: { heartRate } })
  }
}

export async function disconnectUser(userId: string): Promise<void> {
  await prisma.wearableConnection.updateMany({
    where: { userId, source: 'google_health' },
    data:  { isActive: false, accessToken: null, refreshToken: null },
  })
}
```

- [ ] **Schritt 4: Tests laufen lassen**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/lib/__tests__/googleHealth.test.ts
```

Erwartete Ausgabe: `11 passed`

- [ ] **Schritt 5: Commit**

```bash
git add src/lib/googleHealth.ts src/lib/__tests__/googleHealth.test.ts
git commit -m "feat: add Google Health OAuth service (googleHealth.ts)"
```

---

## Task 2: API-Routen

**Files:**
- Create: `src/app/api/wearables/google/connect/route.ts`
- Create: `src/app/api/wearables/google/callback/route.ts`
- Create: `src/app/api/wearables/google/sync/route.ts`
- Create: `src/app/api/wearables/google/disconnect/route.ts`

- [ ] **Schritt 1: connect-Route erstellen**

Erstelle `src/app/api/wearables/google/connect/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAuthUrl } from '@/lib/googleHealth'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = getAuthUrl(session.user.id)
  return NextResponse.redirect(url)
}
```

- [ ] **Schritt 2: callback-Route erstellen**

Erstelle `src/app/api/wearables/google/callback/route.ts`:

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { exchangeCode } from '@/lib/googleHealth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code || !state) {
    return NextResponse.redirect(new URL('/profile/data-sources?error=oauth_failed', req.url))
  }

  try {
    await exchangeCode(code, state)
    return NextResponse.redirect(new URL('/profile/data-sources', req.url))
  } catch {
    return NextResponse.redirect(new URL('/profile/data-sources?error=oauth_failed', req.url))
  }
}
```

- [ ] **Schritt 3: sync-Route erstellen**

Erstelle `src/app/api/wearables/google/sync/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { fetchSteps, fetchSleepSessions, fetchHeartRateAvg } from '@/lib/googleHealth'

export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const to   = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - 7)

  await fetchSteps(session.user.id, from, to)
  await fetchSleepSessions(session.user.id, from, to)
  await fetchHeartRateAvg(session.user.id, from, to)

  return NextResponse.json({ data: { synced: true } })
}
```

- [ ] **Schritt 4: disconnect-Route erstellen**

Erstelle `src/app/api/wearables/google/disconnect/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { disconnectUser } from '@/lib/googleHealth'

export async function DELETE() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await disconnectUser(session.user.id)
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Schritt 5: Commit**

```bash
git add src/app/api/wearables/
git commit -m "feat: add Google Health OAuth API routes (connect/callback/sync/disconnect)"
```

---

## Task 3: Konsolidierte Cron-Route

**Files:**
- Create: `src/app/api/cron/route.ts`
- Delete: `src/app/api/cron/checkin-reminder/route.ts`
- Delete: `src/app/api/cron/weekly-digest/route.ts`

- [ ] **Schritt 1: Konsolidierte Route erstellen**

Erstelle `src/app/api/cron/route.ts`. Die Logik aus beiden bestehenden Routen wird hier inline migriert. Lies vorher die beiden Quelldateien um sicherzustellen dass nichts vergessen wird:
- `src/app/api/cron/checkin-reminder/route.ts`
- `src/app/api/cron/weekly-digest/route.ts`

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendCheckinReminder, sendWeeklyDigest } from '@/lib/email'
import { getAggregatedMetrics, getContinuityData } from '@/lib/anonymize'
import { fetchSteps, fetchSleepSessions, fetchHeartRateAvg } from '@/lib/googleHealth'

type ActionResult = { success: boolean; duration: number; affected: number; error?: string }

function verifyCronSecret(req: NextRequest): boolean {
  const secret   = req.headers.get('x-cron-secret')
  const expected = process.env.CRON_SECRET
  if (!secret || !expected) return false
  const a = Buffer.from(secret)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function runCheckinReminder(baseUrl: string): Promise<ActionResult> {
  const start = performance.now()
  const now   = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const employees = await prisma.user.findMany({
    where: { role: 'EMPLOYEE', isActive: true },
    select: { id: true, email: true, name: true },
  })

  const checkedInIds = new Set(
    (await prisma.wellbeingEntry.findMany({
      where: { createdAt: { gte: weekStart } },
      select: { userId: true },
    })).map(e => e.userId)
  )

  let sent = 0
  for (const emp of employees) {
    if (checkedInIds.has(emp.id)) continue
    const ok = await sendCheckinReminder({ to: emp.email, name: emp.name ?? 'Mitarbeiter', checkinUrl: `${baseUrl}/checkin` })
    if (ok) sent++
  }

  return { success: true, duration: Math.round(performance.now() - start), affected: sent }
}

async function runWeeklyDigest(baseUrl: string): Promise<ActionResult> {
  const start     = performance.now()
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, anonymityThreshold: true },
  })

  let totalSent = 0
  for (const company of companies) {
    const [metrics, teams, continuity, admins] = await Promise.all([
      getAggregatedMetrics(company.id, { threshold: company.anonymityThreshold }),
      prisma.team.findMany({ where: { companyId: company.id }, select: { id: true } }),
      getContinuityData(company.id, { threshold: company.anonymityThreshold }),
      prisma.user.findMany({ where: { companyId: company.id, role: 'COMPANY_ADMIN', isActive: true }, select: { email: true, name: true } }),
    ])

    if (!metrics.isAboveThreshold) continue

    const teamMetrics  = await Promise.all(teams.map(t => getAggregatedMetrics(company.id, { teamId: t.id, threshold: company.anonymityThreshold })))
    const atRiskTeams  = teamMetrics.filter(m => m.isAboveThreshold && m.avgScore < 6).length

    for (const admin of admins) {
      const ok = await sendWeeklyDigest({ to: admin.email, name: admin.name ?? 'Admin', companyName: company.name, avgScore: metrics.avgScore, atRiskTeams, activeRate: continuity.activeUserRate, dashboardUrl: `${baseUrl}/company/dashboard` })
      if (ok) totalSent++
    }
  }

  return { success: true, duration: Math.round(performance.now() - start), affected: totalSent }
}

async function runWearableSync(): Promise<ActionResult> {
  const start = performance.now()
  const to    = new Date()
  const from  = new Date(to)
  from.setDate(from.getDate() - 7)

  const connections = await prisma.wearableConnection.findMany({
    where:  { isActive: true, source: 'google_health' },
    select: { userId: true },
  })

  let affected = 0
  for (const { userId } of connections) {
    try {
      await fetchSteps(userId, from, to)
      await fetchSleepSessions(userId, from, to)
      await fetchHeartRateAvg(userId, from, to)
      affected++
    } catch (err) {
      console.error(`[cron:wearable-sync] user=${userId}`, err)
    }
  }

  return { success: true, duration: Math.round(performance.now() - start), affected }
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const action           = searchParams.get('action')
  const baseUrl          = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  const results: Record<string, ActionResult> = {}

  try {
    if (action === 'daily-checkin-reminder') {
      results['daily-checkin-reminder'] = await runCheckinReminder(baseUrl)
    } else if (action === 'weekly-digest') {
      results['weekly-digest'] = await runWeeklyDigest(baseUrl)
    } else if (action === 'wearable-sync') {
      results['wearable-sync'] = await runWearableSync()
    } else {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    results[action ?? 'unknown'] = { success: false, duration: 0, affected: 0, error: msg }
  }

  return NextResponse.json({ results })
}
```

- [ ] **Schritt 2: Alte Cron-Routen löschen**

```bash
rm "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core/src/app/api/cron/checkin-reminder/route.ts"
rmdir "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core/src/app/api/cron/checkin-reminder"
rm "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core/src/app/api/cron/weekly-digest/route.ts"
rmdir "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core/src/app/api/cron/weekly-digest"
```

- [ ] **Schritt 3: Commit**

```bash
git add src/app/api/cron/
git commit -m "feat: consolidate cron routes + add wearable-sync action"
```

---

## Task 4: `.env.example` erweitern

**Files:**
- Modify: `.env.example`

- [ ] **Schritt 1: Neue Variablen hinzufügen**

Füge am Ende von `.env.example` hinzu:

```
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
OAUTH_HMAC_SECRET="generate-with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
CRON_SECRET="generate-with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
```

- [ ] **Schritt 2: Commit**

```bash
git add .env.example
git commit -m "docs: add Google OAuth and cron env vars to .env.example"
```

---

## Task 5: Gesamte Test-Suite prüfen

- [ ] **Schritt 1: Alle Tests ausführen**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run
```

Erwartete Ausgabe: Alle Tests grün (mindestens 111 Tests: 100 bestehend + 11 neue googleHealth-Tests). Keine Regressions.

- [ ] **Schritt 2: TypeScript-Typen prüfen**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx tsc --noEmit 2>&1 | head -30
```

Erwartete Ausgabe: Keine Fehler.
