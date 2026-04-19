# Terra Wearable Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold Terra API integration (Oura + Garmin) via Widget + Webhook flow, vollständig unit-getestet, via Env-Vars live-schaltbar.

**Architecture:** Neue `src/lib/terra/` mit 4 fokussierten Modulen (config, client, webhook, mapping). 3 neue API-Routes (`/api/wearables/terra/connect`, `/api/wearables/terra/disconnect`, `/api/webhooks/terra`). Additive Schema-Migration (3 nullable Felder auf `WearableSync`). UI-Update in `AvailableTab` für Oura/Garmin-Cards.

**Tech Stack:** Next.js 14 App Router, Prisma, TypeScript, vitest, Node `crypto` (HMAC-SHA256), AES-256-GCM via bestehendem `lib/crypto.ts`.

**Spec:** [docs/superpowers/specs/2026-04-19-terra-integration-design.md](../specs/2026-04-19-terra-integration-design.md)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `recoveryScore`, `hrv`, `readiness` to `WearableSync` |
| `prisma/migrations/20260419020000_add_terra_sync_fields/migration.sql` | Create | SQL migration |
| `src/lib/terra/config.ts` | Create | Env-Vars + `isTerraEnabled()` |
| `src/lib/terra/client.ts` | Create | Terra HTTP client (widget URL, deauth) |
| `src/lib/terra/webhook.ts` | Create | HMAC-Verify + Event-Parser |
| `src/lib/terra/mapping.ts` | Create | Terra payload → `WearableSync` fields |
| `src/lib/__tests__/terra/config.test.ts` | Create | Unit tests for config |
| `src/lib/__tests__/terra/webhook.test.ts` | Create | Unit tests for verify + parse |
| `src/lib/__tests__/terra/mapping.test.ts` | Create | Unit tests for mapping |
| `src/lib/__tests__/terra/client.test.ts` | Create | Unit tests for client (mocked fetch) |
| `src/lib/__tests__/terra/fixtures/auth-event.json` | Create | Auth-event fixture |
| `src/lib/__tests__/terra/fixtures/deauth-event.json` | Create | Deauth-event fixture |
| `src/lib/__tests__/terra/fixtures/activity-data.json` | Create | Activity-data fixture |
| `src/lib/__tests__/terra/fixtures/sleep-data.json` | Create | Sleep-data fixture |
| `src/lib/__tests__/terra/fixtures/daily-data.json` | Create | Daily/recovery-data fixture |
| `src/app/api/wearables/terra/connect/route.ts` | Create | GET → 302 widget URL |
| `src/app/api/wearables/terra/disconnect/route.ts` | Create | DELETE connection |
| `src/app/api/webhooks/terra/route.ts` | Create | POST webhook handler |
| `src/app/(app)/profile/data-sources/AvailableTab.tsx` | Modify | Oura + Garmin conditional connect |
| `src/app/(app)/profile/data-sources/DataSourcesTabs.tsx` | Modify | Pass Terra-Connections to children |
| `src/app/(app)/profile/data-sources/page.tsx` | Modify | Load Terra-Connections |

---

## Task 1: Schema-Migration — Terra-Felder auf `WearableSync`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260419020000_add_terra_sync_fields/migration.sql`

- [ ] **Step 1: Erweitere `WearableSync` in `prisma/schema.prisma`**

Suche den bestehenden Block (ungefähr Zeile 370):

```prisma
model WearableSync {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  source     String   // "google_health" | "apple_health" | "oura" | "garmin" | "whoop" | "fitbit"
  date       DateTime
  steps      Int?
  heartRate  Float?
  sleepHours Float?
  syncedAt   DateTime @default(now())

  @@unique([userId, source, date])
  @@index([userId, date])
  @@map("wearable_syncs")
}
```

Ersetze ihn durch:

```prisma
model WearableSync {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  source     String   // "google_health" | "apple_health" | "oura" | "garmin" | "whoop" | "fitbit"
  date       DateTime
  steps      Int?
  heartRate  Float?
  sleepHours Float?
  recoveryScore Float?
  hrv           Float?
  readiness     Float?
  syncedAt   DateTime @default(now())

  @@unique([userId, source, date])
  @@index([userId, date])
  @@map("wearable_syncs")
}
```

- [ ] **Step 2: Erstelle Migration-SQL**

Erstelle Datei `prisma/migrations/20260419020000_add_terra_sync_fields/migration.sql`:

```sql
ALTER TABLE "wearable_syncs" ADD COLUMN "recoveryScore" DOUBLE PRECISION;
ALTER TABLE "wearable_syncs" ADD COLUMN "hrv" DOUBLE PRECISION;
ALTER TABLE "wearable_syncs" ADD COLUMN "readiness" DOUBLE PRECISION;
```

- [ ] **Step 3: Regeneriere Prisma-Client**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx prisma generate
```

Erwartet: `✔ Generated Prisma Client`. Keine Fehler.

- [ ] **Step 4: Run existing tests**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run
```

Erwartet: Alle 203 Tests passed.

- [ ] **Step 5: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add prisma/schema.prisma prisma/migrations/20260419020000_add_terra_sync_fields/
git commit -m "feat: add Terra sync fields (recoveryScore, hrv, readiness) to WearableSync"
```

---

## Task 2: `src/lib/terra/config.ts` — Env-Check (TDD)

**Files:**
- Create: `src/lib/terra/config.ts`
- Create: `src/lib/__tests__/terra/config.test.ts`

- [ ] **Step 1: Schreibe Test-Datei `src/lib/__tests__/terra/config.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getTerraConfig, isTerraEnabled } from '../../terra/config'

describe('terra/config', () => {
  const original = {
    devId: process.env.TERRA_DEV_ID,
    apiKey: process.env.TERRA_API_KEY,
    webhookSecret: process.env.TERRA_WEBHOOK_SECRET,
  }

  beforeEach(() => {
    delete process.env.TERRA_DEV_ID
    delete process.env.TERRA_API_KEY
    delete process.env.TERRA_WEBHOOK_SECRET
  })

  afterEach(() => {
    process.env.TERRA_DEV_ID = original.devId
    process.env.TERRA_API_KEY = original.apiKey
    process.env.TERRA_WEBHOOK_SECRET = original.webhookSecret
  })

  it('getTerraConfig() returns config when all 3 vars set', () => {
    process.env.TERRA_DEV_ID = 'dev-123'
    process.env.TERRA_API_KEY = 'api-abc'
    process.env.TERRA_WEBHOOK_SECRET = 'whs-xyz'
    expect(getTerraConfig()).toEqual({ devId: 'dev-123', apiKey: 'api-abc', webhookSecret: 'whs-xyz' })
  })

  it('getTerraConfig() returns null when TERRA_DEV_ID missing', () => {
    process.env.TERRA_API_KEY = 'api-abc'
    process.env.TERRA_WEBHOOK_SECRET = 'whs-xyz'
    expect(getTerraConfig()).toBeNull()
  })

  it('getTerraConfig() returns null when TERRA_API_KEY missing', () => {
    process.env.TERRA_DEV_ID = 'dev-123'
    process.env.TERRA_WEBHOOK_SECRET = 'whs-xyz'
    expect(getTerraConfig()).toBeNull()
  })

  it('getTerraConfig() returns null when TERRA_WEBHOOK_SECRET missing', () => {
    process.env.TERRA_DEV_ID = 'dev-123'
    process.env.TERRA_API_KEY = 'api-abc'
    expect(getTerraConfig()).toBeNull()
  })

  it('isTerraEnabled() is true when config complete', () => {
    process.env.TERRA_DEV_ID = 'dev-123'
    process.env.TERRA_API_KEY = 'api-abc'
    process.env.TERRA_WEBHOOK_SECRET = 'whs-xyz'
    expect(isTerraEnabled()).toBe(true)
  })

  it('isTerraEnabled() is false when any var missing', () => {
    process.env.TERRA_DEV_ID = 'dev-123'
    expect(isTerraEnabled()).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/lib/__tests__/terra/config.test.ts
```

Erwartet: FAIL — "Cannot find module '../../terra/config'".

- [ ] **Step 3: Implementiere `src/lib/terra/config.ts`**

```typescript
export interface TerraConfig {
  devId: string
  apiKey: string
  webhookSecret: string
}

export function getTerraConfig(): TerraConfig | null {
  const devId = process.env.TERRA_DEV_ID
  const apiKey = process.env.TERRA_API_KEY
  const webhookSecret = process.env.TERRA_WEBHOOK_SECRET
  if (!devId || !apiKey || !webhookSecret) return null
  return { devId, apiKey, webhookSecret }
}

export function isTerraEnabled(): boolean {
  return getTerraConfig() !== null
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/lib/__tests__/terra/config.test.ts
```

Erwartet: PASS (6 tests).

- [ ] **Step 5: Run full test suite (regression check)**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run
```

Erwartet: 209 tests passed (203 bestehende + 6 neue).

- [ ] **Step 6: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/lib/terra/config.ts src/lib/__tests__/terra/config.test.ts
git commit -m "feat: add Terra config module with env-based enablement check"
```

---

## Task 3: `src/lib/terra/webhook.ts` — `verifySignature` (TDD)

**Files:**
- Create: `src/lib/terra/webhook.ts`
- Create: `src/lib/__tests__/terra/webhook.test.ts`

- [ ] **Step 1: Schreibe Test-Datei**

Erstelle `src/lib/__tests__/terra/webhook.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import { verifySignature } from '../../terra/webhook'

const SECRET = 'test-webhook-secret'

function signBody(body: string, secret: string = SECRET): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}

describe('terra/webhook — verifySignature', () => {
  it('returns true for correctly signed body', () => {
    const body = '{"type":"auth","user":{"reference_id":"u123"}}'
    const sig = signBody(body)
    expect(verifySignature(body, sig, SECRET)).toBe(true)
  })

  it('returns false for modified body', () => {
    const body = '{"type":"auth"}'
    const sig = signBody(body)
    expect(verifySignature('{"type":"deauth"}', sig, SECRET)).toBe(false)
  })

  it('returns false for signature made with different secret', () => {
    const body = '{"type":"auth"}'
    const sig = signBody(body, 'different-secret')
    expect(verifySignature(body, sig, SECRET)).toBe(false)
  })

  it('returns false for null signature header', () => {
    const body = '{"type":"auth"}'
    expect(verifySignature(body, null, SECRET)).toBe(false)
  })

  it('returns false for empty signature header', () => {
    const body = '{"type":"auth"}'
    expect(verifySignature(body, '', SECRET)).toBe(false)
  })

  it('returns false for malformed hex signature', () => {
    const body = '{"type":"auth"}'
    expect(verifySignature(body, 'not-hex-XYZ', SECRET)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/lib/__tests__/terra/webhook.test.ts
```

Erwartet: FAIL — "Cannot find module '../../terra/webhook'".

- [ ] **Step 3: Implementiere `src/lib/terra/webhook.ts` (nur `verifySignature`)**

```typescript
import { createHmac, timingSafeEqual } from 'crypto'

export function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false
  if (!/^[0-9a-f]+$/i.test(signatureHeader)) return false

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(signatureHeader, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/lib/__tests__/terra/webhook.test.ts
```

Erwartet: PASS (6 tests).

- [ ] **Step 5: Run full test suite**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run
```

Erwartet: 215 tests passed.

- [ ] **Step 6: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/lib/terra/webhook.ts src/lib/__tests__/terra/webhook.test.ts
git commit -m "feat: add Terra webhook signature verification (HMAC-SHA256)"
```

---

## Task 4: Fixtures + `parseWebhookEvent` (TDD)

**Files:**
- Create: `src/lib/__tests__/terra/fixtures/auth-event.json`
- Create: `src/lib/__tests__/terra/fixtures/deauth-event.json`
- Create: `src/lib/__tests__/terra/fixtures/activity-data.json`
- Create: `src/lib/__tests__/terra/fixtures/sleep-data.json`
- Create: `src/lib/__tests__/terra/fixtures/daily-data.json`
- Create: `src/lib/__tests__/terra/fixtures/unknown-event.json`
- Modify: `src/lib/terra/webhook.ts`
- Modify: `src/lib/__tests__/terra/webhook.test.ts`

- [ ] **Step 1: Erstelle Fixture `auth-event.json`**

Inhalt:

```json
{
  "type": "auth",
  "status": "success",
  "user": {
    "user_id": "terra-user-abc-123",
    "provider": "OURA",
    "reference_id": "user-cuid-xyz"
  }
}
```

- [ ] **Step 2: Erstelle Fixture `deauth-event.json`**

Inhalt:

```json
{
  "type": "deauth",
  "user": {
    "user_id": "terra-user-abc-123",
    "provider": "OURA"
  }
}
```

- [ ] **Step 3: Erstelle Fixture `activity-data.json`**

Inhalt:

```json
{
  "type": "activity",
  "user": {
    "user_id": "terra-user-abc-123",
    "provider": "GARMIN"
  },
  "data": [
    {
      "metadata": { "start_time": "2026-04-18T00:00:00Z", "end_time": "2026-04-18T23:59:59Z" },
      "distance_data": { "steps": 9420 },
      "heart_rate_data": { "summary": { "avg_hr_bpm": 68.5 } }
    }
  ]
}
```

- [ ] **Step 4: Erstelle Fixture `sleep-data.json`**

Inhalt:

```json
{
  "type": "sleep",
  "user": {
    "user_id": "terra-user-abc-123",
    "provider": "OURA"
  },
  "data": [
    {
      "metadata": { "start_time": "2026-04-18T22:00:00Z", "end_time": "2026-04-19T06:30:00Z" },
      "sleep_durations_data": {
        "asleep": { "duration_asleep_state_seconds": 25200 }
      }
    }
  ]
}
```

- [ ] **Step 5: Erstelle Fixture `daily-data.json`**

Inhalt:

```json
{
  "type": "daily",
  "user": {
    "user_id": "terra-user-abc-123",
    "provider": "OURA"
  },
  "data": [
    {
      "metadata": { "start_time": "2026-04-18T00:00:00Z", "end_time": "2026-04-18T23:59:59Z" },
      "scores": {
        "recovery": 82,
        "readiness": 78
      },
      "heart_rate_data": { "summary": { "avg_hrv_rmssd": 46.2 } }
    }
  ]
}
```

- [ ] **Step 6: Erstelle Fixture `unknown-event.json`**

Inhalt:

```json
{
  "type": "request_processing",
  "message": "User data is being fetched"
}
```

- [ ] **Step 7: Ergänze Tests in `webhook.test.ts`**

Füge am Ende der Datei (vor `})`  des `describe('terra/webhook — verifySignature', …)` ist außerhalb) hinzu:

Ersetze den gesamten Inhalt von `src/lib/__tests__/terra/webhook.test.ts` mit:

```typescript
import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import { verifySignature, parseWebhookEvent } from '../../terra/webhook'
import authFixture from './fixtures/auth-event.json'
import deauthFixture from './fixtures/deauth-event.json'
import activityFixture from './fixtures/activity-data.json'
import sleepFixture from './fixtures/sleep-data.json'
import dailyFixture from './fixtures/daily-data.json'
import unknownFixture from './fixtures/unknown-event.json'

const SECRET = 'test-webhook-secret'

function signBody(body: string, secret: string = SECRET): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}

describe('terra/webhook — verifySignature', () => {
  it('returns true for correctly signed body', () => {
    const body = '{"type":"auth","user":{"reference_id":"u123"}}'
    const sig = signBody(body)
    expect(verifySignature(body, sig, SECRET)).toBe(true)
  })

  it('returns false for modified body', () => {
    const body = '{"type":"auth"}'
    const sig = signBody(body)
    expect(verifySignature('{"type":"deauth"}', sig, SECRET)).toBe(false)
  })

  it('returns false for signature made with different secret', () => {
    const body = '{"type":"auth"}'
    const sig = signBody(body, 'different-secret')
    expect(verifySignature(body, sig, SECRET)).toBe(false)
  })

  it('returns false for null signature header', () => {
    const body = '{"type":"auth"}'
    expect(verifySignature(body, null, SECRET)).toBe(false)
  })

  it('returns false for empty signature header', () => {
    const body = '{"type":"auth"}'
    expect(verifySignature(body, '', SECRET)).toBe(false)
  })

  it('returns false for malformed hex signature', () => {
    const body = '{"type":"auth"}'
    expect(verifySignature(body, 'not-hex-XYZ', SECRET)).toBe(false)
  })
})

describe('terra/webhook — parseWebhookEvent', () => {
  it('auth fixture → discriminant "auth" with userId, terraUserId, provider', () => {
    const event = parseWebhookEvent(authFixture)
    expect(event).toEqual({
      type: 'auth',
      userId: 'user-cuid-xyz',
      terraUserId: 'terra-user-abc-123',
      provider: 'OURA',
    })
  })

  it('deauth fixture → discriminant "deauth" with terraUserId', () => {
    const event = parseWebhookEvent(deauthFixture)
    expect(event).toEqual({
      type: 'deauth',
      terraUserId: 'terra-user-abc-123',
    })
  })

  it('activity fixture → discriminant "data" with dataType "activity"', () => {
    const event = parseWebhookEvent(activityFixture)
    expect(event.type).toBe('data')
    if (event.type === 'data') {
      expect(event.dataType).toBe('activity')
      expect(event.terraUserId).toBe('terra-user-abc-123')
      expect(event.payload).toBeTruthy()
    }
  })

  it('sleep fixture → discriminant "data" with dataType "sleep"', () => {
    const event = parseWebhookEvent(sleepFixture)
    expect(event.type).toBe('data')
    if (event.type === 'data') expect(event.dataType).toBe('sleep')
  })

  it('daily fixture → discriminant "data" with dataType "daily"', () => {
    const event = parseWebhookEvent(dailyFixture)
    expect(event.type).toBe('data')
    if (event.type === 'data') expect(event.dataType).toBe('daily')
  })

  it('unknown event type → discriminant "unsupported"', () => {
    const event = parseWebhookEvent(unknownFixture)
    expect(event).toEqual({ type: 'unsupported' })
  })

  it('malformed body (no type field) → discriminant "unsupported"', () => {
    expect(parseWebhookEvent({ foo: 'bar' })).toEqual({ type: 'unsupported' })
  })

  it('null body → discriminant "unsupported"', () => {
    expect(parseWebhookEvent(null)).toEqual({ type: 'unsupported' })
  })
})
```

- [ ] **Step 8: Ergänze `parseWebhookEvent` in `src/lib/terra/webhook.ts`**

Ersetze den Inhalt von `src/lib/terra/webhook.ts` mit:

```typescript
import { createHmac, timingSafeEqual } from 'crypto'

export function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false
  if (!/^[0-9a-f]+$/i.test(signatureHeader)) return false

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(signatureHeader, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export type TerraDataType = 'activity' | 'sleep' | 'body' | 'daily'

export type TerraEvent =
  | { type: 'auth'; userId: string; terraUserId: string; provider: string }
  | { type: 'deauth'; terraUserId: string }
  | { type: 'data'; terraUserId: string; dataType: TerraDataType; payload: unknown }
  | { type: 'unsupported' }

const DATA_TYPES: TerraDataType[] = ['activity', 'sleep', 'body', 'daily']

export function parseWebhookEvent(body: unknown): TerraEvent {
  if (!body || typeof body !== 'object') return { type: 'unsupported' }
  const b = body as Record<string, unknown>
  const type = typeof b.type === 'string' ? b.type : null
  const user = (typeof b.user === 'object' && b.user !== null) ? b.user as Record<string, unknown> : null
  const terraUserId = typeof user?.user_id === 'string' ? user.user_id : null

  if (type === 'auth') {
    const referenceId = typeof user?.reference_id === 'string' ? user.reference_id : null
    const provider = typeof user?.provider === 'string' ? user.provider : null
    if (!referenceId || !terraUserId || !provider) return { type: 'unsupported' }
    return { type: 'auth', userId: referenceId, terraUserId, provider }
  }

  if (type === 'deauth') {
    if (!terraUserId) return { type: 'unsupported' }
    return { type: 'deauth', terraUserId }
  }

  if (type && (DATA_TYPES as string[]).includes(type)) {
    if (!terraUserId) return { type: 'unsupported' }
    return { type: 'data', terraUserId, dataType: type as TerraDataType, payload: body }
  }

  return { type: 'unsupported' }
}
```

- [ ] **Step 9: Run tests — expect PASS**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/lib/__tests__/terra/webhook.test.ts
```

Erwartet: PASS (14 tests: 6 verifySignature + 8 parseWebhookEvent).

Hinweis: JSON-Imports brauchen evtl. `"resolveJsonModule": true` in `tsconfig.json`. Wenn Fehler: check `tsconfig.json` und füge `"resolveJsonModule": true` unter `compilerOptions` hinzu.

- [ ] **Step 10: Run full test suite**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run
```

Erwartet: 223 tests passed.

- [ ] **Step 11: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/lib/terra/webhook.ts src/lib/__tests__/terra/
git commit -m "feat: add Terra webhook event parser with fixtures"
```

---

## Task 5: `src/lib/terra/mapping.ts` (TDD)

**Files:**
- Create: `src/lib/terra/mapping.ts`
- Create: `src/lib/__tests__/terra/mapping.test.ts`

- [ ] **Step 1: Schreibe Test-Datei**

Erstelle `src/lib/__tests__/terra/mapping.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mapTerraToWearableSync } from '../../terra/mapping'
import activityFixture from './fixtures/activity-data.json'
import sleepFixture from './fixtures/sleep-data.json'
import dailyFixture from './fixtures/daily-data.json'

describe('terra/mapping — mapTerraToWearableSync', () => {
  it('maps activity fixture → steps + heartRate', () => {
    const result = mapTerraToWearableSync(
      { type: 'data', terraUserId: 'tu1', dataType: 'activity', payload: activityFixture },
      'garmin',
    )
    expect(result).toHaveLength(1)
    expect(result[0].steps).toBe(9420)
    expect(result[0].heartRate).toBeCloseTo(68.5)
    expect(result[0].date.toISOString().startsWith('2026-04-18')).toBe(true)
  })

  it('maps sleep fixture → sleepHours', () => {
    const result = mapTerraToWearableSync(
      { type: 'data', terraUserId: 'tu1', dataType: 'sleep', payload: sleepFixture },
      'oura',
    )
    expect(result).toHaveLength(1)
    expect(result[0].sleepHours).toBeCloseTo(7, 1) // 25200s / 3600 = 7.0
  })

  it('maps daily fixture → recoveryScore, hrv, readiness', () => {
    const result = mapTerraToWearableSync(
      { type: 'data', terraUserId: 'tu1', dataType: 'daily', payload: dailyFixture },
      'oura',
    )
    expect(result).toHaveLength(1)
    expect(result[0].recoveryScore).toBe(82)
    expect(result[0].readiness).toBe(78)
    expect(result[0].hrv).toBeCloseTo(46.2)
  })

  it('returns [] for empty data array', () => {
    const result = mapTerraToWearableSync(
      { type: 'data', terraUserId: 'tu1', dataType: 'activity', payload: { data: [] } },
      'oura',
    )
    expect(result).toEqual([])
  })

  it('returns [] when payload has no data field', () => {
    const result = mapTerraToWearableSync(
      { type: 'data', terraUserId: 'tu1', dataType: 'activity', payload: { foo: 'bar' } },
      'oura',
    )
    expect(result).toEqual([])
  })

  it('handles multi-day payload → array with N entries', () => {
    const multi = {
      data: [
        { metadata: { start_time: '2026-04-17T00:00:00Z' }, distance_data: { steps: 5000 } },
        { metadata: { start_time: '2026-04-18T00:00:00Z' }, distance_data: { steps: 7000 } },
      ],
    }
    const result = mapTerraToWearableSync(
      { type: 'data', terraUserId: 'tu1', dataType: 'activity', payload: multi },
      'garmin',
    )
    expect(result).toHaveLength(2)
    expect(result[0].steps).toBe(5000)
    expect(result[1].steps).toBe(7000)
  })

  it('ignores entries without start_time metadata', () => {
    const result = mapTerraToWearableSync(
      {
        type: 'data',
        terraUserId: 'tu1',
        dataType: 'activity',
        payload: { data: [{ distance_data: { steps: 100 } }] },
      },
      'oura',
    )
    expect(result).toEqual([])
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/lib/__tests__/terra/mapping.test.ts
```

Erwartet: FAIL — "Cannot find module '../../terra/mapping'".

- [ ] **Step 3: Implementiere `src/lib/terra/mapping.ts`**

```typescript
import type { TerraEvent } from './webhook'

export interface WearableSyncFields {
  date: Date
  steps?: number
  heartRate?: number
  sleepHours?: number
  recoveryScore?: number
  hrv?: number
  readiness?: number
}

type DataEvent = Extract<TerraEvent, { type: 'data' }>

interface TerraDataEntry {
  metadata?: { start_time?: string }
  distance_data?: { steps?: number }
  heart_rate_data?: { summary?: { avg_hr_bpm?: number; avg_hrv_rmssd?: number } }
  sleep_durations_data?: { asleep?: { duration_asleep_state_seconds?: number } }
  scores?: { recovery?: number; readiness?: number }
}

function startOfDay(iso: string): Date {
  const d = new Date(iso)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function mapEntry(entry: TerraDataEntry, dataType: DataEvent['dataType']): WearableSyncFields | null {
  const start = entry.metadata?.start_time
  if (!start) return null
  const out: WearableSyncFields = { date: startOfDay(start) }

  if (dataType === 'activity') {
    if (typeof entry.distance_data?.steps === 'number') out.steps = entry.distance_data.steps
    if (typeof entry.heart_rate_data?.summary?.avg_hr_bpm === 'number') out.heartRate = entry.heart_rate_data.summary.avg_hr_bpm
  }

  if (dataType === 'sleep') {
    const secs = entry.sleep_durations_data?.asleep?.duration_asleep_state_seconds
    if (typeof secs === 'number') out.sleepHours = Math.round((secs / 3600) * 10) / 10
  }

  if (dataType === 'daily' || dataType === 'body') {
    if (typeof entry.scores?.recovery === 'number') out.recoveryScore = entry.scores.recovery
    if (typeof entry.scores?.readiness === 'number') out.readiness = entry.scores.readiness
    if (typeof entry.heart_rate_data?.summary?.avg_hrv_rmssd === 'number') out.hrv = entry.heart_rate_data.summary.avg_hrv_rmssd
  }

  return out
}

export function mapTerraToWearableSync(
  event: DataEvent,
  _source: 'oura' | 'garmin',
): WearableSyncFields[] {
  const payload = event.payload as { data?: unknown } | null
  if (!payload || !Array.isArray(payload.data)) return []
  const entries = payload.data as TerraDataEntry[]
  return entries.map((e) => mapEntry(e, event.dataType)).filter((e): e is WearableSyncFields => e !== null)
}
```

Hinweis: Der `_source`-Parameter wird in dieser Iteration nicht fürs Mapping verwendet (Terra normalisiert Feldnamen über Provider hinweg), bleibt aber im Interface für zukünftige provider-spezifische Mappings und weil die aufrufende Route ihn weitergibt.

- [ ] **Step 4: Run test — expect PASS**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/lib/__tests__/terra/mapping.test.ts
```

Erwartet: PASS (7 tests).

- [ ] **Step 5: Run full test suite + TypeScript check**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run && npx tsc --noEmit
```

Erwartet: 230 tests passed, keine TS-Fehler.

- [ ] **Step 6: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/lib/terra/mapping.ts src/lib/__tests__/terra/mapping.test.ts
git commit -m "feat: add Terra payload-to-WearableSync mapping"
```

---

## Task 6: `src/lib/terra/client.ts` (TDD)

**Files:**
- Create: `src/lib/terra/client.ts`
- Create: `src/lib/__tests__/terra/client.test.ts`

- [ ] **Step 1: Schreibe Test-Datei**

Erstelle `src/lib/__tests__/terra/client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateWidgetUrl, deauthorizeTerraUser } from '../../terra/client'

describe('terra/client', () => {
  const original = {
    devId: process.env.TERRA_DEV_ID,
    apiKey: process.env.TERRA_API_KEY,
    webhookSecret: process.env.TERRA_WEBHOOK_SECRET,
    baseUrl: process.env.NEXTAUTH_URL,
  }

  beforeEach(() => {
    process.env.TERRA_DEV_ID = 'dev-test'
    process.env.TERRA_API_KEY = 'api-test'
    process.env.TERRA_WEBHOOK_SECRET = 'whs-test'
    process.env.NEXTAUTH_URL = 'https://elyo.test'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    process.env.TERRA_DEV_ID = original.devId
    process.env.TERRA_API_KEY = original.apiKey
    process.env.TERRA_WEBHOOK_SECRET = original.webhookSecret
    process.env.NEXTAUTH_URL = original.baseUrl
    vi.unstubAllGlobals()
  })

  describe('generateWidgetUrl', () => {
    it('calls Terra auth endpoint with correct headers + body and returns widget URL', async () => {
      const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ url: 'https://widget.tryterra.co/session/abc123' }),
      })

      const url = await generateWidgetUrl('user-xyz', 'OURA')
      expect(url).toBe('https://widget.tryterra.co/session/abc123')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [calledUrl, init] = fetchMock.mock.calls[0]
      expect(calledUrl).toBe('https://api.tryterra.co/v2/auth/generateWidgetSession')
      expect(init.method).toBe('POST')
      expect(init.headers['dev-id']).toBe('dev-test')
      expect(init.headers['x-api-key']).toBe('api-test')
      expect(init.headers['Content-Type']).toBe('application/json')

      const body = JSON.parse(init.body as string)
      expect(body.reference_id).toBe('user-xyz')
      expect(body.providers).toEqual(['OURA'])
      expect(body.auth_success_redirect_url).toBe('https://elyo.test/profile/data-sources?connected=oura')
      expect(body.auth_failure_redirect_url).toBe('https://elyo.test/profile/data-sources?error=terra')
    })

    it('throws on non-2xx response', async () => {
      const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })

      await expect(generateWidgetUrl('user-xyz', 'OURA')).rejects.toThrow(/terra_widget_failed/)
    })

    it('throws when Terra not configured', async () => {
      delete process.env.TERRA_DEV_ID
      await expect(generateWidgetUrl('user-xyz', 'OURA')).rejects.toThrow(/not configured/)
    })
  })

  describe('deauthorizeTerraUser', () => {
    it('calls Terra deauth endpoint with DELETE + user_id', async () => {
      const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })

      await deauthorizeTerraUser('terra-user-123')

      const [calledUrl, init] = fetchMock.mock.calls[0]
      expect(calledUrl).toBe('https://api.tryterra.co/v2/auth/deauthenticateUser?user_id=terra-user-123')
      expect(init.method).toBe('DELETE')
      expect(init.headers['dev-id']).toBe('dev-test')
      expect(init.headers['x-api-key']).toBe('api-test')
    })

    it('throws on non-2xx response', async () => {
      const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) })
      await expect(deauthorizeTerraUser('terra-user-123')).rejects.toThrow(/terra_deauth_failed/)
    })
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/lib/__tests__/terra/client.test.ts
```

Erwartet: FAIL — "Cannot find module '../../terra/client'".

- [ ] **Step 3: Implementiere `src/lib/terra/client.ts`**

```typescript
import { getTerraConfig } from './config'

const TERRA_API_BASE = 'https://api.tryterra.co/v2'

export type TerraProvider = 'OURA' | 'GARMIN'

function configOrThrow() {
  const cfg = getTerraConfig()
  if (!cfg) throw new Error('Terra not configured: TERRA_DEV_ID / TERRA_API_KEY / TERRA_WEBHOOK_SECRET missing')
  return cfg
}

function baseUrl(): string {
  const url = process.env.NEXTAUTH_URL
  if (!url) throw new Error('NEXTAUTH_URL not set')
  return url
}

export async function generateWidgetUrl(userId: string, provider: TerraProvider): Promise<string> {
  const cfg = configOrThrow()
  const providerLower = provider.toLowerCase()
  const body = {
    reference_id: userId,
    providers: [provider],
    auth_success_redirect_url: `${baseUrl()}/profile/data-sources?connected=${providerLower}`,
    auth_failure_redirect_url: `${baseUrl()}/profile/data-sources?error=terra`,
    language: 'de',
  }

  const res = await fetch(`${TERRA_API_BASE}/auth/generateWidgetSession`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'dev-id': cfg.devId,
      'x-api-key': cfg.apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`terra_widget_failed: status=${res.status}`)
  const data = await res.json() as { url?: string }
  if (!data.url) throw new Error('terra_widget_failed: no url in response')
  return data.url
}

export async function deauthorizeTerraUser(terraUserId: string): Promise<void> {
  const cfg = configOrThrow()
  const res = await fetch(`${TERRA_API_BASE}/auth/deauthenticateUser?user_id=${encodeURIComponent(terraUserId)}`, {
    method: 'DELETE',
    headers: {
      'dev-id': cfg.devId,
      'x-api-key': cfg.apiKey,
    },
  })
  if (!res.ok) throw new Error(`terra_deauth_failed: status=${res.status}`)
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/lib/__tests__/terra/client.test.ts
```

Erwartet: PASS (5 tests).

- [ ] **Step 5: Run full test suite + TS check**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run && npx tsc --noEmit
```

Erwartet: 235 tests passed, keine TS-Fehler.

- [ ] **Step 6: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/lib/terra/client.ts src/lib/__tests__/terra/client.test.ts
git commit -m "feat: add Terra HTTP client (widget URL + deauth)"
```

---

## Task 7: API-Route `/api/wearables/terra/connect`

**Files:**
- Create: `src/app/api/wearables/terra/connect/route.ts`

- [ ] **Step 1: Erstelle Route-Datei**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isTerraEnabled } from '@/lib/terra/config'
import { generateWidgetUrl, type TerraProvider } from '@/lib/terra/client'

const VALID_PROVIDERS: TerraProvider[] = ['OURA', 'GARMIN']

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!isTerraEnabled()) return NextResponse.json({ error: 'terra_disabled' }, { status: 503 })

  const providerParam = req.nextUrl.searchParams.get('provider')
  if (!providerParam || !(VALID_PROVIDERS as string[]).includes(providerParam)) {
    return NextResponse.json({ error: 'invalid_provider' }, { status: 400 })
  }
  const provider = providerParam as TerraProvider

  try {
    const widgetUrl = await generateWidgetUrl(session.user.id, provider)
    return NextResponse.redirect(widgetUrl)
  } catch (err) {
    console.error('Terra connect error', err)
    return NextResponse.json({ error: 'terra_widget_failed' }, { status: 502 })
  }
}
```

- [ ] **Step 2: Run test suite + TS check**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run && npx tsc --noEmit
```

Erwartet: 235 tests passed (unverändert), keine TS-Fehler.

- [ ] **Step 3: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/app/api/wearables/terra/connect/
git commit -m "feat: add Terra connect API route with provider validation"
```

---

## Task 8: API-Route `/api/wearables/terra/disconnect`

**Files:**
- Create: `src/app/api/wearables/terra/disconnect/route.ts`

- [ ] **Step 1: Erstelle Route-Datei**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decryptToken } from '@/lib/crypto'
import { isTerraEnabled } from '@/lib/terra/config'
import { deauthorizeTerraUser } from '@/lib/terra/client'

const VALID_PROVIDERS = ['OURA', 'GARMIN'] as const
type Provider = typeof VALID_PROVIDERS[number]

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!isTerraEnabled()) return NextResponse.json({ error: 'terra_disabled' }, { status: 503 })

  const providerParam = req.nextUrl.searchParams.get('provider')
  if (!providerParam || !(VALID_PROVIDERS as readonly string[]).includes(providerParam)) {
    return NextResponse.json({ error: 'invalid_provider' }, { status: 400 })
  }
  const source = (providerParam as Provider).toLowerCase()

  const conn = await prisma.wearableConnection.findUnique({
    where: { userId_source: { userId: session.user.id, source } },
  })
  if (!conn) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Fail-open: if Terra API call fails, still clear local connection
  if (conn.accessToken) {
    try {
      const terraUserId = decryptToken(conn.accessToken)
      await deauthorizeTerraUser(terraUserId)
    } catch (err) {
      console.warn('Terra deauth failed, proceeding with local disconnect', err)
    }
  }

  await prisma.wearableConnection.update({
    where: { userId_source: { userId: session.user.id, source } },
    data: { isActive: false, accessToken: null, refreshToken: null },
  })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Run test suite + TS check**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run && npx tsc --noEmit
```

Erwartet: 235 tests passed, keine TS-Fehler.

- [ ] **Step 3: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/app/api/wearables/terra/disconnect/
git commit -m "feat: add Terra disconnect API route with fail-open behavior"
```

---

## Task 9: API-Route `/api/webhooks/terra`

**Files:**
- Create: `src/app/api/webhooks/terra/route.ts`

- [ ] **Step 1: Erstelle Route-Datei**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encryptToken, decryptToken } from '@/lib/crypto'
import { awardPoints } from '@/lib/points'
import { getTerraConfig } from '@/lib/terra/config'
import { verifySignature, parseWebhookEvent } from '@/lib/terra/webhook'
import { mapTerraToWearableSync } from '@/lib/terra/mapping'

function providerToSource(provider: string): 'oura' | 'garmin' | null {
  const lower = provider.toLowerCase()
  if (lower === 'oura' || lower === 'garmin') return lower
  return null
}

async function findConnectionByTerraUserId(terraUserId: string) {
  const candidates = await prisma.wearableConnection.findMany({
    where: { source: { in: ['oura', 'garmin'] }, isActive: true, accessToken: { not: null } },
  })
  for (const c of candidates) {
    if (!c.accessToken) continue
    try {
      if (decryptToken(c.accessToken) === terraUserId) return c
    } catch {
      // skip malformed
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  const cfg = getTerraConfig()
  if (!cfg) return NextResponse.json({ error: 'terra_disabled' }, { status: 503 })

  const rawBody = await req.text()
  const signature = req.headers.get('terra-signature')
  if (!verifySignature(rawBody, signature, cfg.webhookSecret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ ok: true })
  }

  const event = parseWebhookEvent(parsedBody)

  try {
    if (event.type === 'auth') {
      const source = providerToSource(event.provider)
      if (!source) return NextResponse.json({ ok: true })

      await prisma.wearableConnection.upsert({
        where: { userId_source: { userId: event.userId, source } },
        create: {
          userId: event.userId,
          source,
          accessToken: encryptToken(event.terraUserId),
          isActive: true,
        },
        update: {
          accessToken: encryptToken(event.terraUserId),
          isActive: true,
        },
      })

      const already = await prisma.pointTransaction.findFirst({
        where: { userId: event.userId, reason: 'wearable_connected' },
      })
      if (!already) await awardPoints(event.userId, 'wearable_connected')
    }

    if (event.type === 'data') {
      const conn = await findConnectionByTerraUserId(event.terraUserId)
      if (!conn) return NextResponse.json({ ok: true })
      const source = conn.source as 'oura' | 'garmin'

      const entries = mapTerraToWearableSync(event, source)
      for (const entry of entries) {
        await prisma.wearableSync.upsert({
          where: { userId_source_date: { userId: conn.userId, source, date: entry.date } },
          create: { userId: conn.userId, source, date: entry.date, ...entry },
          update: { ...entry },
        })
      }
    }

    if (event.type === 'deauth') {
      const conn = await findConnectionByTerraUserId(event.terraUserId)
      if (conn) {
        await prisma.wearableConnection.update({
          where: { id: conn.id },
          data: { isActive: false, accessToken: null, refreshToken: null },
        })
      }
    }
  } catch (err) {
    console.error('Terra webhook processing error', err)
    // Return 200 so Terra does not retry on application-level errors
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Run test suite + TS check**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run && npx tsc --noEmit
```

Erwartet: 235 tests passed, keine TS-Fehler.

- [ ] **Step 3: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/app/api/webhooks/terra/
git commit -m "feat: add Terra webhook handler (auth/data/deauth events)"
```

---

## Task 10: UI — Oura + Garmin Connect-Flow + Terra-Connections laden

**Files:**
- Modify: `src/app/(app)/profile/data-sources/page.tsx`
- Modify: `src/app/(app)/profile/data-sources/DataSourcesTabs.tsx`
- Modify: `src/app/(app)/profile/data-sources/AvailableTab.tsx`

- [ ] **Step 1: Modify `src/app/(app)/profile/data-sources/page.tsx`**

Ersetze die `Promise.all`-Sektion. Aktuell:

```typescript
const [connection, documents] = await Promise.all([
  prisma.wearableConnection.findUnique({
    where: { userId_source: { userId: session.user.id, source: 'google_health' } },
  }),
  prisma.userDocument.findMany({
    where: { userId: session.user.id },
    orderBy: { uploadedAt: 'desc' },
  }),
])
```

Ersetzen durch:

```typescript
const [connection, ouraConnection, garminConnection, documents] = await Promise.all([
  prisma.wearableConnection.findUnique({
    where: { userId_source: { userId: session.user.id, source: 'google_health' } },
  }),
  prisma.wearableConnection.findUnique({
    where: { userId_source: { userId: session.user.id, source: 'oura' } },
  }),
  prisma.wearableConnection.findUnique({
    where: { userId_source: { userId: session.user.id, source: 'garmin' } },
  }),
  prisma.userDocument.findMany({
    where: { userId: session.user.id },
    orderBy: { uploadedAt: 'desc' },
  }),
])
```

Und passe den JSX-Prop-Pass an:

```tsx
<DataSourcesTabs
  connection={connection}
  ouraConnection={ouraConnection}
  garminConnection={garminConnection}
  documents={documents}
/>
```

- [ ] **Step 2: Modify `src/app/(app)/profile/data-sources/DataSourcesTabs.tsx`**

Erweitere die `Props`-Interface und die Weitergabe an `AvailableTab`.

Ersetze:

```typescript
interface Props {
  connection: WearableConnection | null
  documents: UserDocument[]
}

export function DataSourcesTabs({ connection, documents }: Props) {
```

Durch:

```typescript
interface Props {
  connection: WearableConnection | null
  ouraConnection: WearableConnection | null
  garminConnection: WearableConnection | null
  documents: UserDocument[]
}

export function DataSourcesTabs({ connection, ouraConnection, garminConnection, documents }: Props) {
```

Und im JSX-Block für `AvailableTab`:

Ersetze:

```tsx
<AvailableTab isGoogleConnected={isConnected} />
```

Durch:

```tsx
<AvailableTab
  isGoogleConnected={isConnected}
  isOuraConnected={ouraConnection?.isActive === true}
  isGarminConnected={garminConnection?.isActive === true}
/>
```

- [ ] **Step 3: Replace `src/app/(app)/profile/data-sources/AvailableTab.tsx` entirely**

```tsx
'use client'

interface Props {
  isGoogleConnected: boolean
  isOuraConnected: boolean
  isGarminConnected: boolean
}

interface Source {
  id: 'google' | 'apple' | 'oura' | 'garmin'
  name: string
  icon: string
  iconBg: string
  available: boolean
}

const TERRA_ENABLED = process.env.NEXT_PUBLIC_TERRA_ENABLED === '1'

const SOURCES: Source[] = [
  { id: 'google', name: 'Google Fit', icon: 'G', iconBg: '#4285F4', available: true },
  { id: 'apple',  name: 'Apple Health', icon: '🍎', iconBg: '#e5e7eb', available: false },
  { id: 'oura',   name: 'Oura Ring', icon: '💍', iconBg: '#e5e7eb', available: TERRA_ENABLED },
  { id: 'garmin', name: 'Garmin', icon: '⌚', iconBg: '#e5e7eb', available: TERRA_ENABLED },
]

export function AvailableTab({ isGoogleConnected, isOuraConnected, isGarminConnected }: Props) {
  function isConnected(id: Source['id']): boolean {
    if (id === 'google') return isGoogleConnected
    if (id === 'oura') return isOuraConnected
    if (id === 'garmin') return isGarminConnected
    return false
  }

  function connectHref(id: Source['id']): string {
    if (id === 'google') return '/api/wearables/google/connect'
    if (id === 'oura') return '/api/wearables/terra/connect?provider=OURA'
    if (id === 'garmin') return '/api/wearables/terra/connect?provider=GARMIN'
    return '#'
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {SOURCES.map(source => {
        const connectable = source.available
        const connected = isConnected(source.id)
        return (
          <div
            key={source.id}
            className="rounded-xl border border-gray-200 p-4 text-center space-y-2"
            style={connectable ? {} : { opacity: 0.5, pointerEvents: 'none' as const }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mx-auto text-sm font-bold"
              style={{ background: source.iconBg, color: source.id === 'google' ? 'white' : undefined }}
            >
              {source.icon}
            </div>
            <div className="text-sm font-medium text-gray-800">{source.name}</div>
            {connectable ? (
              connected ? (
                <span className="inline-block text-xs font-medium text-emerald-600">✓ Verbunden</span>
              ) : (
                <a
                  href={connectHref(source.id)}
                  className="inline-block text-xs font-semibold text-white px-3 py-1 rounded-full transition-opacity hover:opacity-90"
                  style={{ background: '#1B4D3E' }}
                >
                  Verbinden
                </a>
              )
            ) : (
              <span className="inline-block text-xs text-gray-400">Bald</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run test suite + TS check**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run && npx tsc --noEmit
```

Erwartet: 235 tests passed, keine TS-Fehler.

- [ ] **Step 5: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/app/\(app\)/profile/data-sources/page.tsx src/app/\(app\)/profile/data-sources/DataSourcesTabs.tsx src/app/\(app\)/profile/data-sources/AvailableTab.tsx
git commit -m "feat: enable Oura + Garmin connect flow via Terra in data-sources UI"
```

---

## Completion Checklist

Nach Task 10:

- [ ] `npx vitest run` — 235 Tests passed
- [ ] `npx tsc --noEmit` — keine Fehler
- [ ] 10 neue Commits auf `main`
- [ ] `/api/wearables/terra/connect?provider=OURA` → 503 ohne Env-Vars, 302 mit
- [ ] `/api/webhooks/terra` → 401 ohne korrekte Signature, 200 mit
- [ ] UI-Cards Oura/Garmin zeigen "Verbinden" wenn `NEXT_PUBLIC_TERRA_ENABLED=1`, sonst "Bald"

Nachdem alle Tasks fertig sind: Nutze `superpowers:finishing-a-development-branch` zum Abschließen.
