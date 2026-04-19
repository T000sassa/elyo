# Push Notifications & Cron Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web-Push-Benachrichtigungen für Level-Ups und Check-in-Erinnerungen. Nutzer steuern Präferenzen per UI. Cron bekommt `streak-check`-Action für Streak-Boni.

**Architecture:** `web-push` Library + VAPID Keys (env vars). Service Worker in `public/sw.js` empfängt Push-Events. `src/lib/webPush.ts` kapselt alle Push-Operationen. `PushSubscription` + `NotificationPreference` Prisma-Modelle. Level-Up-Push wird in `src/app/api/points/award/route.ts` getriggert.

**Tech Stack:** Next.js 14, TypeScript, `web-push`, Prisma, Vitest

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `PushSubscription` + `NotificationPreference` models |
| `src/lib/webPush.ts` | Create | `sendPushToUser`, `saveSubscription`, `removeSubscription` |
| `src/lib/__tests__/webPush.test.ts` | Create | 5 unit tests |
| `public/sw.js` | Create | Service Worker: push handler + notificationclick handler |
| `src/app/api/push/subscribe/route.ts` | Create | POST (save) + DELETE (remove) push subscription |
| `src/app/api/push/subscribe/__tests__/route.test.ts` | Create | 4 tests |
| `src/app/api/push/vapid-public-key/route.ts` | Create | GET VAPID public key |
| `src/app/api/notifications/preferences/route.ts` | Create | GET + PATCH notification preferences |
| `src/app/api/notifications/preferences/__tests__/route.test.ts` | Create | 5 tests |
| `src/app/api/points/award/route.ts` | Modify | Add level-up push trigger |
| `src/app/api/cron/route.ts` | Modify | Add `streak-check` action |
| `src/app/(app)/profile/notifications/page.tsx` | Create | Notification preferences UI |

---

## Task 1: Prisma Models + `web-push` install

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install `web-push`**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npm install web-push && npm install --save-dev @types/web-push
```

Expected: Both packages added to `package.json`.

- [ ] **Step 2: Add Prisma models**

In `prisma/schema.prisma`, add these two models at the end:

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())

  @@index([userId])
}

model NotificationPreference {
  userId              String  @id
  user                User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  checkinReminder     Boolean @default(true)
  checkinReminderTime String  @default("09:00")
  weeklySummary       Boolean @default(true)
  partnerUpdates      Boolean @default(false)
}
```

Also add to the `User` model (after the last existing relation field):
```prisma
  pushSubscriptions      PushSubscription[]
  notificationPreference NotificationPreference?
```

- [ ] **Step 3: Run migration**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx prisma migrate dev --name add_push_notification_models
```

Expected: Migration created and applied.

- [ ] **Step 4: Update `.env.example`**

Add these lines to `.env.example`:
```
VAPID_PUBLIC_KEY="generate-with: npx web-push generate-vapid-keys"
VAPID_PRIVATE_KEY="generate-with: npx web-push generate-vapid-keys"
VAPID_SUBJECT="mailto:admin@elyo.de"
```

- [ ] **Step 5: Run existing tests**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run
```

Expected: All 189 tests pass.

- [ ] **Step 6: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add prisma/schema.prisma prisma/migrations package.json package-lock.json .env.example
git commit -m "feat: add PushSubscription + NotificationPreference models + web-push dep"
```

---

## Task 2: `webPush.ts` Library + Tests

**Files:**
- Create: `src/lib/webPush.ts`
- Create: `src/lib/__tests__/webPush.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/webPush.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = {
  pushSubscription: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
}

vi.mock('../prisma', () => ({ prisma: mockPrisma }))

const mockSendNotification = vi.fn()
const mockSetVapidDetails = vi.fn()

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: mockSetVapidDetails,
    sendNotification: mockSendNotification,
  },
  WebPushError: class WebPushError extends Error {
    statusCode: number
    constructor(message: string, statusCode: number) {
      super(message)
      this.statusCode = statusCode
    }
  },
}))

const { sendPushToUser, saveSubscription, removeSubscription } = await import('../webPush')

const mockSubscription = {
  id: 'sub-1',
  userId: 'user-1',
  endpoint: 'https://push.example.com/sub1',
  p256dh: 'p256dh-key',
  auth: 'auth-key',
  createdAt: new Date(),
  user: null as never,
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.VAPID_PUBLIC_KEY = 'test-public-key'
  process.env.VAPID_PRIVATE_KEY = 'test-private-key'
  process.env.VAPID_SUBJECT = 'mailto:test@elyo.de'
})

describe('sendPushToUser', () => {
  it('returns { sent: 0, failed: 0 } when no subscriptions', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([])
    const result = await sendPushToUser('user-1', { title: 'Test', body: 'Body' })
    expect(result).toEqual({ sent: 0, failed: 0 })
  })

  it('sends push and returns { sent: 1, failed: 0 } on success', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([mockSubscription])
    mockSendNotification.mockResolvedValue(undefined)
    const result = await sendPushToUser('user-1', { title: 'Test', body: 'Body' })
    expect(result).toEqual({ sent: 1, failed: 0 })
    expect(mockSendNotification).toHaveBeenCalledOnce()
  })

  it('deletes expired subscription on 410 Gone error', async () => {
    const { WebPushError } = await import('web-push')
    mockPrisma.pushSubscription.findMany.mockResolvedValue([mockSubscription])
    mockSendNotification.mockRejectedValue(new WebPushError('Gone', 410))
    const result = await sendPushToUser('user-1', { title: 'Test', body: 'Body' })
    expect(result.failed).toBe(1)
    expect(mockPrisma.pushSubscription.delete).toHaveBeenCalledWith({
      where: { endpoint: mockSubscription.endpoint },
    })
  })
})

describe('saveSubscription', () => {
  it('calls prisma upsert with correct data', async () => {
    mockPrisma.pushSubscription.upsert.mockResolvedValue(mockSubscription)
    await saveSubscription('user-1', {
      endpoint: 'https://push.example.com/sub1',
      keys: { p256dh: 'key1', auth: 'auth1' },
    })
    expect(mockPrisma.pushSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { endpoint: 'https://push.example.com/sub1' },
        create: expect.objectContaining({ userId: 'user-1', endpoint: 'https://push.example.com/sub1' }),
      })
    )
  })
})

describe('removeSubscription', () => {
  it('calls prisma deleteMany for user endpoint', async () => {
    mockPrisma.pushSubscription.deleteMany.mockResolvedValue({ count: 1 })
    await removeSubscription('user-1', 'https://push.example.com/sub1')
    expect(mockPrisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', endpoint: 'https://push.example.com/sub1' },
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/lib/__tests__/webPush.test.ts
```

Expected: FAIL with `Cannot find module '../webPush'`

- [ ] **Step 3: Create `src/lib/webPush.ts`**

```typescript
import webpush, { WebPushError } from 'web-push'
import { prisma } from './prisma'

function initVapid() {
  const subject = process.env.VAPID_SUBJECT
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (subject && publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey)
  }
}

initVapid()

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  })

  let sent = 0
  let failed = 0

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
      sent++
    } catch (err) {
      failed++
      if (err instanceof WebPushError && err.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } })
      }
    }
  }

  return { sent, failed }
}

export async function saveSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<void> {
  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    update: {
      userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  })
}

export async function removeSubscription(userId: string, endpoint: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint },
  })
}
```

- [ ] **Step 4: Run tests**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/lib/__tests__/webPush.test.ts
```

Expected: 5/5 pass.

- [ ] **Step 5: Run full suite**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/lib/webPush.ts src/lib/__tests__/webPush.test.ts
git commit -m "feat: add webPush library (sendPushToUser, saveSubscription, removeSubscription)"
```

---

## Task 3: Service Worker + Push API Routes + Tests

**Files:**
- Create: `public/sw.js`
- Create: `src/app/api/push/subscribe/route.ts`
- Create: `src/app/api/push/subscribe/__tests__/route.test.ts`
- Create: `src/app/api/push/vapid-public-key/route.ts`

- [ ] **Step 1: Create `public/sw.js`**

```javascript
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title ?? 'ELYO'
  const options = {
    body: data.body ?? '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: { url: data.url ?? '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})
```

- [ ] **Step 2: Write failing tests for subscribe route**

Create `src/app/api/push/subscribe/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockSaveSubscription = vi.fn()
const mockRemoveSubscription = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/webPush', () => ({
  saveSubscription: mockSaveSubscription,
  removeSubscription: mockRemoveSubscription,
}))

const { POST, DELETE } = await import('../route')

const mockSession = {
  user: { id: 'user-1', role: 'EMPLOYEE', companyId: 'company-1' },
}

const validSubscriptionBody = {
  endpoint: 'https://push.example.com/sub1',
  keys: { p256dh: 'key123', auth: 'auth123' },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(mockSession)
  mockSaveSubscription.mockResolvedValue(undefined)
  mockRemoveSubscription.mockResolvedValue(undefined)
})

describe('POST /api/push/subscribe', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(new Request('http://localhost/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validSubscriptionBody),
    }))
    expect(res.status).toBe(401)
  })

  it('saves subscription and returns 201', async () => {
    const res = await POST(new Request('http://localhost/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validSubscriptionBody),
    }))
    expect(res.status).toBe(201)
    expect(mockSaveSubscription).toHaveBeenCalledWith('user-1', validSubscriptionBody)
  })
})

describe('DELETE /api/push/subscribe', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await DELETE(new Request('http://localhost/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: 'https://push.example.com/sub1' }),
    }))
    expect(res.status).toBe(401)
  })

  it('removes subscription and returns 200', async () => {
    const res = await DELETE(new Request('http://localhost/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: 'https://push.example.com/sub1' }),
    }))
    expect(res.status).toBe(200)
    expect(mockRemoveSubscription).toHaveBeenCalledWith('user-1', 'https://push.example.com/sub1')
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/app/api/push/subscribe/__tests__/route.test.ts
```

Expected: FAIL with `Cannot find module '../route'`

- [ ] **Step 4: Create `src/app/api/push/subscribe/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { saveSubscription, removeSubscription } from '@/lib/webPush'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  await saveSubscription(session.user.id, body)
  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  await removeSubscription(session.user.id, body.endpoint)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Create `src/app/api/push/vapid-public-key/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? '' })
}
```

- [ ] **Step 6: Run tests**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/app/api/push/subscribe/__tests__/route.test.ts
```

Expected: 4/4 pass.

- [ ] **Step 7: Run full suite**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add public/sw.js src/app/api/push/
git commit -m "feat: add service worker + push subscription API routes"
```

---

## Task 4: Notification Preferences API Routes + Tests

**Files:**
- Create: `src/app/api/notifications/preferences/route.ts`
- Create: `src/app/api/notifications/preferences/__tests__/route.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/app/api/notifications/preferences/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockPrisma = {
  notificationPreference: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
}

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

const { GET, PATCH } = await import('../route')

const mockSession = {
  user: { id: 'user-1', role: 'EMPLOYEE', companyId: 'company-1' },
}

const defaultPrefs = {
  userId: 'user-1',
  checkinReminder: true,
  checkinReminderTime: '09:00',
  weeklySummary: true,
  partnerUpdates: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(mockSession)
  mockPrisma.notificationPreference.findUnique.mockResolvedValue(defaultPrefs)
  mockPrisma.notificationPreference.upsert.mockResolvedValue(defaultPrefs)
})

describe('GET /api/notifications/preferences', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns preferences when they exist', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.preferences).toEqual(defaultPrefs)
  })

  it('returns default preferences when none exist', async () => {
    mockPrisma.notificationPreference.findUnique.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.preferences.checkinReminder).toBe(true)
    expect(body.preferences.partnerUpdates).toBe(false)
  })
})

describe('PATCH /api/notifications/preferences', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await PATCH(new Request('http://localhost/api/notifications/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkinReminder: false }),
    }))
    expect(res.status).toBe(401)
  })

  it('upserts preferences and returns 200', async () => {
    const updatedPrefs = { ...defaultPrefs, checkinReminder: false }
    mockPrisma.notificationPreference.upsert.mockResolvedValue(updatedPrefs)
    const res = await PATCH(new Request('http://localhost/api/notifications/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkinReminder: false }),
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.preferences).toBeDefined()
    expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        create: expect.objectContaining({ userId: 'user-1' }),
        update: expect.objectContaining({ checkinReminder: false }),
      })
    )
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/app/api/notifications/preferences/__tests__/route.test.ts
```

Expected: FAIL

- [ ] **Step 3: Create `src/app/api/notifications/preferences/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DEFAULT_PREFERENCES = {
  checkinReminder: true,
  checkinReminderTime: '09:00',
  weeklySummary: true,
  partnerUpdates: false,
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId: session.user.id },
  })

  return NextResponse.json({ preferences: prefs ?? { userId: session.user.id, ...DEFAULT_PREFERENCES } })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { checkinReminder, checkinReminderTime, weeklySummary, partnerUpdates } = body

  const updateData: Record<string, unknown> = {}
  if (checkinReminder !== undefined) updateData.checkinReminder = Boolean(checkinReminder)
  if (checkinReminderTime !== undefined) updateData.checkinReminderTime = String(checkinReminderTime)
  if (weeklySummary !== undefined) updateData.weeklySummary = Boolean(weeklySummary)
  if (partnerUpdates !== undefined) updateData.partnerUpdates = Boolean(partnerUpdates)

  const preferences = await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...DEFAULT_PREFERENCES, ...updateData },
    update: updateData,
  })

  return NextResponse.json({ preferences })
}
```

- [ ] **Step 4: Run preferences tests**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/app/api/notifications/preferences/__tests__/route.test.ts
```

Expected: 5/5 pass.

- [ ] **Step 5: Run full suite**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/app/api/notifications/
git commit -m "feat: add notification preferences API (GET/PATCH)"
```

---

## Task 5: Level-Up Push Trigger + Streak-Check Cron

**Files:**
- Modify: `src/app/api/points/award/route.ts`
- Modify: `src/app/api/cron/route.ts`

- [ ] **Step 1: Add level-up push to `src/app/api/points/award/route.ts`**

Current file content:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { awardPoints, POINT_RULES, type PointReason } from '@/lib/points'
import { z } from 'zod'

const AwardSchema = z.object({
  reason: z.enum(Object.keys(POINT_RULES) as [PointReason, ...PointReason[]]),
  userId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = AwardSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const targetUserId =
    parsed.data.userId && session.user.role !== 'EMPLOYEE'
      ? parsed.data.userId
      : session.user.id

  const result = await awardPoints(targetUserId, parsed.data.reason)
  return NextResponse.json({ data: result })
}
```

Replace with:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { awardPoints, POINT_RULES, type PointReason } from '@/lib/points'
import { sendPushToUser } from '@/lib/webPush'
import { z } from 'zod'

const AwardSchema = z.object({
  reason: z.enum(Object.keys(POINT_RULES) as [PointReason, ...PointReason[]]),
  userId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = AwardSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const targetUserId =
    parsed.data.userId && session.user.role !== 'EMPLOYEE'
      ? parsed.data.userId
      : session.user.id

  const result = await awardPoints(targetUserId, parsed.data.reason)

  if (result.levelChanged && result.newLevel) {
    sendPushToUser(targetUserId, {
      title: '🎉 Neues Level erreicht!',
      body: `Du hast ${result.newLevel} erreicht! Dein neuer Vorteil ist jetzt aktiv.`,
      url: '/level',
    }).catch(err => console.error('[award] push failed:', err))
  }

  return NextResponse.json({ data: result })
}
```

- [ ] **Step 2: Add `streak-check` to `src/app/api/cron/route.ts`**

Read the current cron file first. Then add this import after existing imports:
```typescript
import { awardPoints, calculateStreak } from '@/lib/points'
```

Add this function after `runMeasureEngine`:
```typescript
async function runStreakCheck(): Promise<ActionResult> {
  const start = performance.now()
  const allPoints = await prisma.userPoints.findMany({
    where: { streak: { gte: 7 } },
    select: { userId: true, streak: true },
  })

  let affected = 0
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  for (const { userId, streak } of allPoints) {
    try {
      const currentStreak = await calculateStreak(userId)
      if (currentStreak >= 7) {
        const recent7 = await prisma.pointTransaction.findFirst({
          where: { userId, reason: 'streak_7days', createdAt: { gte: sevenDaysAgo } },
        })
        if (!recent7) {
          await awardPoints(userId, 'streak_7days')
          affected++
        }
      }
      if (currentStreak >= 30) {
        const recent30 = await prisma.pointTransaction.findFirst({
          where: { userId, reason: 'streak_30days', createdAt: { gte: thirtyDaysAgo } },
        })
        if (!recent30) {
          await awardPoints(userId, 'streak_30days')
          affected++
        }
      }
    } catch (err) {
      console.error(`[cron:streak-check] user=${userId}`, err)
    }
    void streak // silence unused var
  }

  return { success: true, duration: Math.round(performance.now() - start), affected }
}
```

Add the action branch before the `else`:
```typescript
    } else if (action === 'measure-engine') {
      results['measure-engine'] = await runMeasureEngine()
    } else if (action === 'streak-check') {
      results['streak-check'] = await runStreakCheck()
    } else {
```

- [ ] **Step 3: Run full suite + TypeScript check**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run && npx tsc --noEmit
```

Expected: All tests pass, no TS errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/app/api/points/award/route.ts src/app/api/cron/route.ts
git commit -m "feat: add level-up push trigger + streak-check cron action"
```

---

## Task 6: Notification Preferences UI Page

**Files:**
- Create: `src/app/(app)/profile/notifications/page.tsx`

- [ ] **Step 1: Create `src/app/(app)/profile/notifications/page.tsx`**

```typescript
'use client'

import { useState, useEffect } from 'react'

interface Preferences {
  checkinReminder: boolean
  checkinReminderTime: string
  weeklySummary: boolean
  partnerUpdates: boolean
}

const DEFAULT: Preferences = {
  checkinReminder: true,
  checkinReminderTime: '09:00',
  weeklySummary: true,
  partnerUpdates: false,
}

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/notifications/preferences')
      .then(r => r.json())
      .then(data => {
        if (data.preferences) setPrefs(data.preferences)
      })
      .finally(() => setIsLoading(false))

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setPushEnabled(sub !== null)
        })
      })
    }
  }, [])

  async function togglePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    const reg = await navigator.serviceWorker.ready
    if (pushEnabled) {
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
      }
      setPushEnabled(false)
    } else {
      const keyRes = await fetch('/api/push/vapid-public-key')
      const { publicKey } = await keyRes.json()
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      setPushEnabled(true)
    }
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="h-6 w-48 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1
        className="text-2xl font-semibold text-gray-900 mb-1"
        style={{ fontFamily: "'Fraunces', Georgia, serif" }}
      >
        Benachrichtigungen
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Steuere, wann und wie du von ELYO benachrichtigt wirst.
      </p>

      {/* Push toggle */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 text-sm">Push-Benachrichtigungen</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {pushEnabled ? 'Aktiv auf diesem Gerät' : 'Inaktiv – tippe zum Aktivieren'}
            </p>
          </div>
          <button
            onClick={togglePush}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              pushEnabled ? 'bg-[#1B4D3E]' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                pushEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Notification types */}
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 mb-6">
        <ToggleRow
          label="Check-in-Erinnerung"
          description="Tägliche Erinnerung zum Check-in"
          checked={prefs.checkinReminder}
          onChange={v => setPrefs(p => ({ ...p, checkinReminder: v }))}
          extra={
            prefs.checkinReminder && (
              <input
                type="time"
                value={prefs.checkinReminderTime}
                onChange={e => setPrefs(p => ({ ...p, checkinReminderTime: e.target.value }))}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#1B4D3E]"
              />
            )
          }
        />
        <ToggleRow
          label="Wöchentliche Zusammenfassung"
          description="Deine Wellbeing-Highlights der Woche"
          checked={prefs.weeklySummary}
          onChange={v => setPrefs(p => ({ ...p, weeklySummary: v }))}
        />
        <ToggleRow
          label="Partner-Neuigkeiten"
          description="Neue Angebote und Aktionen"
          checked={prefs.partnerUpdates}
          onChange={v => setPrefs(p => ({ ...p, partnerUpdates: v }))}
        />
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Level-Up-Benachrichtigung</p>
            <p className="text-xs text-gray-500">Wenn du ein neues Level erreichst</p>
          </div>
          <span className="text-xs bg-[#1B4D3E] text-white rounded-full px-2 py-0.5 font-medium">
            Immer aktiv
          </span>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60 transition-opacity"
        style={{ backgroundColor: '#1B4D3E' }}
      >
        {saved ? '✓ Gespeichert' : isSaving ? 'Speichern…' : 'Einstellungen speichern'}
      </button>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  extra,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  extra?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
        {extra && <div className="mt-1">{extra}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-[#1B4D3E]' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Run full suite + TypeScript check**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run && npx tsc --noEmit
```

Expected: All tests pass, no TS errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add "src/app/(app)/profile/notifications/page.tsx"
git commit -m "feat: add notification preferences UI page"
```
