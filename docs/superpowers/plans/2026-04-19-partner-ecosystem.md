# Partner-Ökosystem (Phase 1.4 Kern) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Partner-Ökosystem als Fundament für Phase 1.5/3.2: Self-Service-Registrierung mit Nachweis-Upload, ELYO-Admin-Approval, Employee-Discovery-API aus DB statt Mockdata.

**Architecture:** Separates Partner-Auth-System (Signed-JWT-Cookie, komplett getrennt von NextAuth). Neue Rolle `ELYO_ADMIN` nutzt NextAuth mit `User.companyId = null`. `Partner`-Model mit `verificationStatus`-Enum steuert den 5-stufigen Lifecycle (PENDING_DOCS → PENDING_REVIEW → VERIFIED, oder SUSPENDED/REJECTED).

**Tech Stack:** Next.js 14 App Router, Prisma, PostgreSQL, TypeScript strict, NextAuth v5, bcryptjs, jsonwebtoken ersetzt durch Node-crypto (HMAC-SHA256, bestehender Pattern aus `googleHealth.ts`), Zod, @vercel/blob, vitest.

**Spec:** [docs/superpowers/specs/2026-04-19-partner-ecosystem-design.md](../specs/2026-04-19-partner-ecosystem-design.md)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | Modify | Partner-Model, Enums, `User.companyId` nullable |
| `prisma/migrations/20260420000000_add_partner_and_elyo_admin/migration.sql` | Create | Migration SQL |
| `prisma/seed.ts` | Modify | ELYO_ADMIN + 8 Seed-Partner |
| `src/types/next-auth.d.ts` | Modify | `companyId` typedef bleibt `string` (empty for ELYO_ADMIN) |
| `src/lib/auth.ts` | Modify | `companyId: user.companyId ?? ''` coercion |
| `src/lib/validations.ts` | Modify | Zod-Schemas für Partner-Register + Status-Update |
| `src/lib/email.ts` | Modify | 3 Partner-Lifecycle-E-Mail-Templates |
| `src/lib/partners/password.ts` | Create | bcrypt-Wrapper |
| `src/lib/partners/auth.ts` | Create | HMAC-signierte Partner-Session |
| `src/lib/partners/seed.ts` | Create | 8 Seed-Partner-Export |
| `src/lib/admin-auth.ts` | Create | `requireElyoAdmin` Helper |
| `src/lib/__tests__/partners/password.test.ts` | Create | Unit-Tests |
| `src/lib/__tests__/partners/auth.test.ts` | Create | Unit-Tests |
| `src/lib/__tests__/admin-auth.test.ts` | Create | Unit-Tests |
| `src/app/api/partner/register/route.ts` | Create | POST public |
| `src/app/api/partner/login/route.ts` | Create | POST public |
| `src/app/api/partner/logout/route.ts` | Create | POST partner-session |
| `src/app/api/partner/me/route.ts` | Create | GET partner-session |
| `src/app/api/partner/documents/route.ts` | Create | POST Upload Nachweis |
| `src/app/api/admin/partners/route.ts` | Create | GET Admin-Liste |
| `src/app/api/admin/partners/[id]/route.ts` | Create | PATCH Status-Update |
| `src/app/api/partners/route.ts` | Create | GET Employee-Discovery |
| `src/app/partner/register/page.tsx` | Create | Public-Registrierung |
| `src/app/partner/login/page.tsx` | Create | Public-Login |
| `src/app/partner/dashboard/page.tsx` | Create | Partner-Home |
| `src/app/partner/documents/page.tsx` | Create | Upload-Seite |
| `src/app/admin/partners/page.tsx` | Create | Review-Queue |
| `src/app/admin/partners/[id]/page.tsx` | Create | Detail + Actions |
| `src/app/(app)/partners/page.tsx` | Modify | Mock raus, DB rein |
| `src/components/partners/PartnerCard.tsx` | Modify | Rating optional machen |

---

## Task 1: Schema-Migration + TypeScript-Coercion

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260420000000_add_partner_and_elyo_admin/migration.sql`
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Erweitere `prisma/schema.prisma`**

Ergänze den `Role`-Enum um `ELYO_ADMIN`:

```prisma
enum Role {
  COMPANY_ADMIN
  COMPANY_MANAGER
  EMPLOYEE
  ELYO_ADMIN
}
```

Füge einen neuen Enum nach `CheckinFrequency` hinzu:

```prisma
enum PartnerVerificationStatus {
  PENDING_DOCS
  PENDING_REVIEW
  VERIFIED
  SUSPENDED
  REJECTED
}
```

Im `User`-Model: ändere `companyId String` zu `companyId String?` und `company Company @relation(...)` zu `company Company? @relation(...)`. Die Zeilen:

```prisma
  companyId String
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
```

werden zu:

```prisma
  companyId String?
  company   Company? @relation(fields: [companyId], references: [id], onDelete: Cascade)
```

Am Ende der Datei (vor der letzten schließenden Klammer) ergänze das Partner-Model:

```prisma
// ── Partner ───────────────────────────────────────────────────────────────────

model Partner {
  id                 String                    @id @default(cuid())

  email              String                    @unique
  passwordHash       String

  name               String
  type               String
  categories         String[]
  description        String                    @db.Text

  address            String?
  city               String?
  lat                Float?
  lng                Float?

  website            String?
  phone              String?

  minimumLevel       String                    @default("STARTER")

  nachweisUrl        String?

  verificationStatus PartnerVerificationStatus @default(PENDING_DOCS)
  rejectionReason    String?
  reviewedAt         DateTime?
  reviewedById       String?

  createdAt          DateTime                  @default(now())
  updatedAt          DateTime                  @updatedAt

  @@index([verificationStatus])
  @@index([categories])
  @@index([lat, lng])
  @@map("partners")
}
```

- [ ] **Step 2: Erstelle Migration-SQL**

Erstelle Datei `prisma/migrations/20260420000000_add_partner_and_elyo_admin/migration.sql`:

```sql
-- Add ELYO_ADMIN to Role enum
ALTER TYPE "Role" ADD VALUE 'ELYO_ADMIN';

-- Create PartnerVerificationStatus enum
CREATE TYPE "PartnerVerificationStatus" AS ENUM (
  'PENDING_DOCS',
  'PENDING_REVIEW',
  'VERIFIED',
  'SUSPENDED',
  'REJECTED'
);

-- Make User.companyId nullable
ALTER TABLE "users" ALTER COLUMN "companyId" DROP NOT NULL;

-- Create partners table
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "categories" TEXT[] NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "website" TEXT,
    "phone" TEXT,
    "minimumLevel" TEXT NOT NULL DEFAULT 'STARTER',
    "nachweisUrl" TEXT,
    "verificationStatus" "PartnerVerificationStatus" NOT NULL DEFAULT 'PENDING_DOCS',
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partners_email_key" ON "partners"("email");
CREATE INDEX "partners_verificationStatus_idx" ON "partners"("verificationStatus");
CREATE INDEX "partners_categories_idx" ON "partners" USING GIN ("categories");
CREATE INDEX "partners_lat_lng_idx" ON "partners"("lat", "lng");
```

- [ ] **Step 3: Modifiziere `src/lib/auth.ts`**

In der `authorize`-Funktion, im Return-Objekt ändere die Zeile:

```typescript
          companyId: user.companyId,
```

zu:

```typescript
          // ELYO_ADMIN has no companyId — coerce to empty string for session typing.
          // Routes that need a real companyId gate on role first (e.g. role !== 'EMPLOYEE' → 403).
          companyId: user.companyId ?? '',
```

- [ ] **Step 4: Regeneriere Prisma-Client**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx prisma generate
```

Erwartet: `✔ Generated Prisma Client`. Keine Fehler.

- [ ] **Step 5: TypeScript-Check + Tests**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx tsc --noEmit && npx vitest run
```

Erwartet: TS clean, 235 Tests passed.

- [ ] **Step 6: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add prisma/schema.prisma prisma/migrations/20260420000000_add_partner_and_elyo_admin/ src/lib/auth.ts
git commit -m "$(cat <<'EOF'
feat: add Partner model + ELYO_ADMIN role + nullable companyId

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `src/lib/partners/password.ts` (TDD)

**Files:**
- Create: `src/lib/partners/password.ts`
- Create: `src/lib/__tests__/partners/password.test.ts`

- [ ] **Step 1: Schreibe Test-Datei**

Erstelle `src/lib/__tests__/partners/password.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { hashPartnerPassword, verifyPartnerPassword } from '../../partners/password'

describe('partners/password', () => {
  it('hash + verify round-trip', async () => {
    const hash = await hashPartnerPassword('my-secret-42')
    expect(await verifyPartnerPassword('my-secret-42', hash)).toBe(true)
  })

  it('wrong password → false', async () => {
    const hash = await hashPartnerPassword('correct-pw')
    expect(await verifyPartnerPassword('wrong-pw', hash)).toBe(false)
  })

  it('hash differs from plain', async () => {
    const plain = 'my-password'
    const hash = await hashPartnerPassword(plain)
    expect(hash).not.toBe(plain)
    expect(hash.length).toBeGreaterThan(20)
  })

  it('same input produces different hashes (random salt)', async () => {
    const h1 = await hashPartnerPassword('same')
    const h2 = await hashPartnerPassword('same')
    expect(h1).not.toBe(h2)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/lib/__tests__/partners/password.test.ts
```

Erwartet: FAIL — "Cannot find module '../../partners/password'".

- [ ] **Step 3: Implementiere `src/lib/partners/password.ts`**

```typescript
import bcrypt from 'bcryptjs'

const ROUNDS = 12

export async function hashPartnerPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS)
}

export async function verifyPartnerPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
```

- [ ] **Step 4: Run test — expect PASS (4 tests)**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/lib/__tests__/partners/password.test.ts
```

- [ ] **Step 5: Run full suite**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run
```

Erwartet: 239 tests passed.

- [ ] **Step 6: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/lib/partners/password.ts src/lib/__tests__/partners/password.test.ts
git commit -m "$(cat <<'EOF'
feat: add partner password hashing (bcrypt 12 rounds)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `src/lib/partners/auth.ts` (TDD)

**Files:**
- Create: `src/lib/partners/auth.ts`
- Create: `src/lib/__tests__/partners/auth.test.ts`

- [ ] **Step 1: Schreibe Test-Datei**

Erstelle `src/lib/__tests__/partners/auth.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { signPartnerSession, verifyPartnerSession, PARTNER_SESSION_COOKIE } from '../../partners/auth'

const SECRET = 'a'.repeat(32)

describe('partners/auth', () => {
  const original = process.env.PARTNER_SESSION_SECRET

  beforeEach(() => {
    process.env.PARTNER_SESSION_SECRET = SECRET
  })

  afterEach(() => {
    process.env.PARTNER_SESSION_SECRET = original
  })

  it('PARTNER_SESSION_COOKIE constant', () => {
    expect(PARTNER_SESSION_COOKIE).toBe('elyo_partner_session')
  })

  it('sign + verify round-trip', () => {
    const token = signPartnerSession('partner-abc')
    const result = verifyPartnerSession(token)
    expect(result).toEqual({ partnerId: 'partner-abc' })
  })

  it('tampered token → null', () => {
    const token = signPartnerSession('partner-abc')
    const parts = token.split('.')
    const tampered = parts[0] + '.' + parts[1] + '.' + 'A'.repeat(parts[2].length)
    expect(verifyPartnerSession(tampered)).toBeNull()
  })

  it('token with different secret → null', () => {
    process.env.PARTNER_SESSION_SECRET = 'z'.repeat(32)
    const token = signPartnerSession('partner-abc')
    process.env.PARTNER_SESSION_SECRET = SECRET
    expect(verifyPartnerSession(token)).toBeNull()
  })

  it('expired token → null', () => {
    // Build an expired token manually
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({ sub: 'p1', iat: 0, exp: 1 })).toString('base64url')
    const { createHmac } = require('crypto')
    const sig = createHmac('sha256', SECRET).update(`${header}.${payload}`).digest('base64url')
    expect(verifyPartnerSession(`${header}.${payload}.${sig}`)).toBeNull()
  })

  it('malformed token → null', () => {
    expect(verifyPartnerSession('not-a-jwt')).toBeNull()
    expect(verifyPartnerSession('only.two')).toBeNull()
  })

  it('signPartnerSession throws when secret missing', () => {
    delete process.env.PARTNER_SESSION_SECRET
    expect(() => signPartnerSession('p1')).toThrow(/PARTNER_SESSION_SECRET/)
  })

  it('verifyPartnerSession returns null when secret missing', () => {
    const token = signPartnerSession('p1')
    delete process.env.PARTNER_SESSION_SECRET
    expect(verifyPartnerSession(token)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/lib/__tests__/partners/auth.test.ts
```

- [ ] **Step 3: Implementiere `src/lib/partners/auth.ts`**

```typescript
import { createHmac, timingSafeEqual } from 'crypto'

export const PARTNER_SESSION_COOKIE = 'elyo_partner_session'
export const PARTNER_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60

function getSecret(): string {
  const s = process.env.PARTNER_SESSION_SECRET
  if (!s || s.length < 16) throw new Error('PARTNER_SESSION_SECRET missing or too short')
  return s
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input
  return buf.toString('base64url')
}

function base64urlDecode(input: string): Buffer {
  return Buffer.from(input, 'base64url')
}

export function signPartnerSession(partnerId: string): string {
  const secret = getSecret()
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const payload = base64url(
    JSON.stringify({ sub: partnerId, iat: now, exp: now + PARTNER_SESSION_TTL_SECONDS }),
  )
  const sig = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${sig}`
}

export function verifyPartnerSession(token: string): { partnerId: string } | null {
  let secret: string
  try {
    secret = getSecret()
  } catch {
    return null
  }

  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, payload, sig] = parts

  const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return null
  if (!timingSafeEqual(a, b)) return null

  let parsed: { sub?: unknown; exp?: unknown }
  try {
    parsed = JSON.parse(base64urlDecode(payload).toString('utf8'))
  } catch {
    return null
  }

  if (typeof parsed.sub !== 'string' || typeof parsed.exp !== 'number') return null
  if (parsed.exp < Math.floor(Date.now() / 1000)) return null

  return { partnerId: parsed.sub }
}
```

- [ ] **Step 4: Run test — expect PASS (8 tests)**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/lib/__tests__/partners/auth.test.ts
```

- [ ] **Step 5: Run full suite**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run
```

Erwartet: 247 tests passed.

- [ ] **Step 6: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/lib/partners/auth.ts src/lib/__tests__/partners/auth.test.ts
git commit -m "$(cat <<'EOF'
feat: add partner session helpers (HMAC-SHA256 JWT)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `src/lib/admin-auth.ts` (TDD)

**Files:**
- Create: `src/lib/admin-auth.ts`
- Create: `src/lib/__tests__/admin-auth.test.ts`

- [ ] **Step 1: Schreibe Test-Datei**

Erstelle `src/lib/__tests__/admin-auth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import { requireElyoAdmin } from '../admin-auth'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

import { auth } from '@/lib/auth'

describe('requireElyoAdmin', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns session for ELYO_ADMIN', async () => {
    const session = { user: { id: 'u1', role: 'ELYO_ADMIN', email: 'admin@elyo.de', companyId: '' } }
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(session)
    const result = await requireElyoAdmin()
    expect(result).toEqual(session)
  })

  it('throws 403 for EMPLOYEE', async () => {
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'u1', role: 'EMPLOYEE', email: 'e@x.de', companyId: 'c1' },
    })
    await expect(requireElyoAdmin()).rejects.toThrow(/forbidden/)
  })

  it('throws 403 for COMPANY_ADMIN', async () => {
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'u1', role: 'COMPANY_ADMIN', email: 'a@x.de', companyId: 'c1' },
    })
    await expect(requireElyoAdmin()).rejects.toThrow(/forbidden/)
  })

  it('throws 401 for no session', async () => {
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    await expect(requireElyoAdmin()).rejects.toThrow(/unauthorized/)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/lib/__tests__/admin-auth.test.ts
```

- [ ] **Step 3: Implementiere `src/lib/admin-auth.ts`**

```typescript
import { auth } from '@/lib/auth'
import type { Session } from 'next-auth'

export class HttpError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(code)
  }
}

export async function requireElyoAdmin(): Promise<Session> {
  const session = await auth()
  if (!session?.user) throw new HttpError(401, 'unauthorized')
  if (session.user.role !== 'ELYO_ADMIN') throw new HttpError(403, 'forbidden')
  return session
}
```

- [ ] **Step 4: Run test — expect PASS (4 tests)**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run src/lib/__tests__/admin-auth.test.ts
```

- [ ] **Step 5: Run full suite**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run
```

Erwartet: 251 tests passed.

- [ ] **Step 6: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/lib/admin-auth.ts src/lib/__tests__/admin-auth.test.ts
git commit -m "$(cat <<'EOF'
feat: add requireElyoAdmin helper (ELYO_ADMIN role guard)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Zod-Schemas + E-Mail-Templates

**Files:**
- Modify: `src/lib/validations.ts`
- Modify: `src/lib/email.ts`

- [ ] **Step 1: Erweitere `src/lib/validations.ts`**

Am Ende der Datei (nach dem letzten Schema) ergänzen:

```typescript
export const PartnerRegisterSchema = z.object({
  email:        z.string().email('Ungültige E-Mail-Adresse'),
  password:     z.string().min(8, 'Mindestens 8 Zeichen'),
  name:         z.string().min(2, 'Mindestens 2 Zeichen').max(120),
  type:         z.enum(['LOCAL', 'EXPERT', 'DIGITAL']),
  categories:   z.array(z.string().min(1)).min(1, 'Mindestens eine Kategorie').max(6),
  description:  z.string().min(40, 'Mindestens 40 Zeichen').max(2000),
  address:      z.string().max(200).optional(),
  city:         z.string().max(100).optional(),
  website:      z.string().url().optional().or(z.literal('')),
  phone:        z.string().max(40).optional(),
  minimumLevel: z.enum(['STARTER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).default('STARTER'),
})

export const PartnerLoginSchema = z.object({
  email:    z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(1),
})

export const AdminPartnerActionSchema = z.object({
  action:          z.enum(['approve', 'reject', 'suspend', 'unsuspend']),
  rejectionReason: z.string().min(5).max(500).optional(),
}).refine(
  (data) => data.action !== 'reject' || (data.rejectionReason && data.rejectionReason.length >= 5),
  { message: 'rejectionReason required for reject', path: ['rejectionReason'] },
)
```

- [ ] **Step 2: Erweitere `src/lib/email.ts`**

Am Ende der Datei (vor der letzten export-Anweisung oder am absoluten Dateiende) ergänzen — die genauen Zeilen-Positionen findest du per Grep auf `sendCheckinReminder`. Füge folgende Funktionen ein:

```typescript
// ── Partner-Lifecycle-E-Mails ─────────────────────────────────────────────────

const APP_URL = process.env.NEXTAUTH_URL ?? 'https://elyo.app'

export async function sendPartnerApprovedEmail(partner: { email: string; name: string }): Promise<void> {
  const content = `
    <h1 style="font-size:22px;color:#0a1f1c;margin:0 0 12px;">Willkommen bei ELYO, ${partner.name}.</h1>
    <p style="color:#374151;line-height:1.6;">
      Dein Partner-Profil wurde freigeschaltet. Ab sofort sehen ELYO-Mitarbeiter dein Angebot im Partner-Netzwerk.
    </p>
    <p style="margin:24px 0;">
      <a href="${APP_URL}/partner/dashboard" style="background:#14b8a6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Zum Dashboard
      </a>
    </p>
  `
  const html = baseTemplate(content)
  const transport = getTransport()
  if (!transport) {
    console.log('[email:partner_approved:dev]', partner.email)
    return
  }
  await transport.sendMail({ from: FROM, to: partner.email, subject: 'ELYO: Dein Partner-Profil ist freigeschaltet', html })
}

export async function sendPartnerRejectedEmail(
  partner: { email: string; name: string },
  reason: string,
): Promise<void> {
  const content = `
    <h1 style="font-size:22px;color:#0a1f1c;margin:0 0 12px;">Registrierung konnte nicht freigeschaltet werden</h1>
    <p style="color:#374151;line-height:1.6;">Hallo ${partner.name},</p>
    <p style="color:#374151;line-height:1.6;">
      wir haben deine Partner-Registrierung geprüft und sie konnte nicht freigeschaltet werden.
    </p>
    <p style="color:#374151;line-height:1.6;"><strong>Begründung:</strong> ${reason}</p>
    <p style="color:#374151;line-height:1.6;">
      Du kannst deine Angaben korrigieren und erneut einen Nachweis einreichen.
    </p>
    <p style="margin:24px 0;">
      <a href="${APP_URL}/partner/login" style="background:#14b8a6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Zum Login
      </a>
    </p>
  `
  const html = baseTemplate(content)
  const transport = getTransport()
  if (!transport) {
    console.log('[email:partner_rejected:dev]', partner.email, reason)
    return
  }
  await transport.sendMail({ from: FROM, to: partner.email, subject: 'ELYO: Registrierung konnte nicht freigeschaltet werden', html })
}

export async function sendPartnerSuspendedEmail(partner: { email: string; name: string }): Promise<void> {
  const content = `
    <h1 style="font-size:22px;color:#0a1f1c;margin:0 0 12px;">Partner-Profil vorübergehend ausgeblendet</h1>
    <p style="color:#374151;line-height:1.6;">Hallo ${partner.name},</p>
    <p style="color:#374151;line-height:1.6;">
      dein Partner-Profil wurde vorübergehend ausgeblendet. Bei Fragen wende dich bitte an den Support.
    </p>
  `
  const html = baseTemplate(content)
  const transport = getTransport()
  if (!transport) {
    console.log('[email:partner_suspended:dev]', partner.email)
    return
  }
  await transport.sendMail({ from: FROM, to: partner.email, subject: 'ELYO: Partner-Profil ausgeblendet', html })
}
```

- [ ] **Step 3: Run full suite + TS check**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run && npx tsc --noEmit
```

Erwartet: 251 tests passed, TS clean.

- [ ] **Step 4: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/lib/validations.ts src/lib/email.ts
git commit -m "$(cat <<'EOF'
feat: add partner Zod schemas + lifecycle email templates

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Partner-API-Routes (Register, Login, Logout, Me)

**Files:**
- Create: `src/app/api/partner/register/route.ts`
- Create: `src/app/api/partner/login/route.ts`
- Create: `src/app/api/partner/logout/route.ts`
- Create: `src/app/api/partner/me/route.ts`

- [ ] **Step 1: Erstelle `src/app/api/partner/register/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PartnerRegisterSchema } from '@/lib/validations'
import { hashPartnerPassword } from '@/lib/partners/password'
import { signPartnerSession, PARTNER_SESSION_COOKIE, PARTNER_SESSION_TTL_SECONDS } from '@/lib/partners/auth'
import { checkRateLimit } from '@/lib/ratelimit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(`partner-register:${ip}`, 3, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  const parsed = PartnerRegisterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error', issues: parsed.error.flatten() }, { status: 400 })
  }

  const { password, website, ...data } = parsed.data
  const passwordHash = await hashPartnerPassword(password)

  try {
    const partner = await prisma.partner.create({
      data: {
        ...data,
        website: website === '' ? null : website,
        passwordHash,
        verificationStatus: 'PENDING_DOCS',
      },
    })

    const token = signPartnerSession(partner.id)
    const res = NextResponse.json({ partnerId: partner.id }, { status: 201 })
    res.cookies.set(PARTNER_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: PARTNER_SESSION_TTL_SECONDS,
    })
    return res
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'email_taken' }, { status: 409 })
    }
    console.error('partner register failed', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Erstelle `src/app/api/partner/login/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PartnerLoginSchema } from '@/lib/validations'
import { verifyPartnerPassword } from '@/lib/partners/password'
import { signPartnerSession, PARTNER_SESSION_COOKIE, PARTNER_SESSION_TTL_SECONDS } from '@/lib/partners/auth'
import { checkRateLimit } from '@/lib/ratelimit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(`partner-login:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  const parsed = PartnerLoginSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })

  const partner = await prisma.partner.findUnique({ where: { email: parsed.data.email } })
  if (!partner) return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })

  const valid = await verifyPartnerPassword(parsed.data.password, partner.passwordHash)
  if (!valid) return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })

  if (partner.verificationStatus === 'REJECTED' || partner.verificationStatus === 'SUSPENDED') {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const token = signPartnerSession(partner.id)
  const res = NextResponse.json({ partnerId: partner.id, status: partner.verificationStatus })
  res.cookies.set(PARTNER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: PARTNER_SESSION_TTL_SECONDS,
  })
  return res
}
```

- [ ] **Step 3: Erstelle `src/app/api/partner/logout/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { PARTNER_SESSION_COOKIE } from '@/lib/partners/auth'

export async function POST() {
  const res = new NextResponse(null, { status: 204 })
  res.cookies.set(PARTNER_SESSION_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
```

- [ ] **Step 4: Erstelle `src/app/api/partner/me/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPartnerSession, PARTNER_SESSION_COOKIE } from '@/lib/partners/auth'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(PARTNER_SESSION_COOKIE)?.value
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const session = verifyPartnerSession(token)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const partner = await prisma.partner.findUnique({ where: { id: session.partnerId } })
  if (!partner || partner.verificationStatus === 'REJECTED') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { passwordHash, ...safe } = partner
  void passwordHash
  return NextResponse.json({ partner: safe })
}
```

- [ ] **Step 5: Run test suite + TS check**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run && npx tsc --noEmit
```

Erwartet: 251 tests passed, TS clean.

- [ ] **Step 6: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/app/api/partner/
git commit -m "$(cat <<'EOF'
feat: add partner auth API routes (register/login/logout/me)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Nachweis-Upload API

**Files:**
- Create: `src/app/api/partner/documents/route.ts`

- [ ] **Step 1: Erstelle Route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { put, del } from '@vercel/blob'
import { prisma } from '@/lib/prisma'
import { verifyPartnerSession, PARTNER_SESSION_COOKIE } from '@/lib/partners/auth'

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_MIME = new Set(['application/pdf', 'image/png', 'image/jpeg'])

export async function POST(req: NextRequest) {
  const token = req.cookies.get(PARTNER_SESSION_COOKIE)?.value
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const session = verifyPartnerSession(token)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const partner = await prisma.partner.findUnique({ where: { id: session.partnerId } })
  if (!partner || partner.verificationStatus === 'REJECTED') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'no_file' }, { status: 400 })

  if (!ALLOWED_MIME.has(file.type)) return NextResponse.json({ error: 'invalid_file' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'too_large' }, { status: 413 })

  // Delete existing nachweis (best-effort)
  if (partner.nachweisUrl) {
    try {
      const url = new URL(partner.nachweisUrl)
      await del(url.pathname.replace(/^\//, ''))
    } catch (err) {
      console.warn('partner documents: old blob delete failed', err)
    }
  }

  const extMatch = file.name.match(/\.(pdf|png|jpe?g)$/i)
  const ext = extMatch ? extMatch[0] : ''

  let blob: Awaited<ReturnType<typeof put>> | null = null
  try {
    blob = await put(
      `partners/${partner.id}/nachweis-${Date.now()}${ext}`,
      file,
      { access: 'public' },
    )
    await prisma.partner.update({
      where: { id: partner.id },
      data: {
        nachweisUrl: blob.url,
        verificationStatus: partner.verificationStatus === 'PENDING_DOCS' ? 'PENDING_REVIEW' : partner.verificationStatus,
      },
    })
    return NextResponse.json({ nachweisUrl: blob.url })
  } catch (err) {
    if (blob) await del(blob.pathname).catch(() => {})
    console.error('partner nachweis upload failed', err)
    return NextResponse.json({ error: 'storage_failed' }, { status: 502 })
  }
}
```

- [ ] **Step 2: Run suite + TS check**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/app/api/partner/documents/
git commit -m "$(cat <<'EOF'
feat: add partner Nachweis upload API (Vercel Blob)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Admin-API-Routes (Liste + Status-Update)

**Files:**
- Create: `src/app/api/admin/partners/route.ts`
- Create: `src/app/api/admin/partners/[id]/route.ts`

- [ ] **Step 1: Erstelle `src/app/api/admin/partners/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireElyoAdmin, HttpError } from '@/lib/admin-auth'

const VALID_STATUS = ['PENDING_DOCS', 'PENDING_REVIEW', 'VERIFIED', 'SUSPENDED', 'REJECTED'] as const

export async function GET(req: NextRequest) {
  try {
    await requireElyoAdmin()
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.code }, { status: err.status })
    throw err
  }

  const statusParam = req.nextUrl.searchParams.get('status')
  const cursor = req.nextUrl.searchParams.get('cursor')
  const take = 50

  const where = statusParam && (VALID_STATUS as readonly string[]).includes(statusParam)
    ? { verificationStatus: statusParam as (typeof VALID_STATUS)[number] }
    : {}

  const partners = await prisma.partner.findMany({
    where,
    orderBy: [{ verificationStatus: 'asc' }, { createdAt: 'desc' }],
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: {
      id: true, name: true, type: true, email: true, city: true, categories: true,
      verificationStatus: true, nachweisUrl: true, createdAt: true,
    },
  })

  const nextCursor = partners.length > take ? partners[take - 1].id : null
  return NextResponse.json({ partners: partners.slice(0, take), nextCursor })
}
```

- [ ] **Step 2: Erstelle `src/app/api/admin/partners/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireElyoAdmin, HttpError } from '@/lib/admin-auth'
import { AdminPartnerActionSchema } from '@/lib/validations'
import {
  sendPartnerApprovedEmail,
  sendPartnerRejectedEmail,
  sendPartnerSuspendedEmail,
} from '@/lib/email'

type Status = 'PENDING_DOCS' | 'PENDING_REVIEW' | 'VERIFIED' | 'SUSPENDED' | 'REJECTED'

const TRANSITIONS: Record<string, { from: Status[]; to: Status }> = {
  approve:   { from: ['PENDING_REVIEW'], to: 'VERIFIED' },
  reject:    { from: ['PENDING_REVIEW'], to: 'REJECTED' },
  suspend:   { from: ['VERIFIED'],        to: 'SUSPENDED' },
  unsuspend: { from: ['SUSPENDED'],       to: 'VERIFIED' },
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let session
  try {
    session = await requireElyoAdmin()
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.code }, { status: err.status })
    throw err
  }

  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  const parsed = AdminPartnerActionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'validation_error', issues: parsed.error.flatten() }, { status: 400 })

  const partner = await prisma.partner.findUnique({ where: { id } })
  if (!partner) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const transition = TRANSITIONS[parsed.data.action]
  if (!transition.from.includes(partner.verificationStatus as Status)) {
    return NextResponse.json({ error: 'invalid_transition' }, { status: 400 })
  }

  const updated = await prisma.partner.update({
    where: { id },
    data: {
      verificationStatus: transition.to,
      reviewedAt: new Date(),
      reviewedById: session.user.id,
      rejectionReason: parsed.data.action === 'reject' ? parsed.data.rejectionReason : null,
    },
  })

  let warning: string | undefined
  try {
    if (parsed.data.action === 'approve')        await sendPartnerApprovedEmail(updated)
    else if (parsed.data.action === 'reject')    await sendPartnerRejectedEmail(updated, parsed.data.rejectionReason!)
    else if (parsed.data.action === 'suspend')   await sendPartnerSuspendedEmail(updated)
  } catch (err) {
    console.error('partner email send failed', err)
    warning = 'email_send_failed'
  }

  return NextResponse.json({ partner: updated, ...(warning ? { warning } : {}) })
}
```

- [ ] **Step 3: Run suite + TS check**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/app/api/admin/
git commit -m "$(cat <<'EOF'
feat: add admin partner API routes (list + status transitions)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Employee-Discovery-API + Partners-Page-Integration

**Files:**
- Create: `src/app/api/partners/route.ts`
- Modify: `src/components/partners/PartnerCard.tsx`
- Modify: `src/app/(app)/partners/page.tsx`

- [ ] **Step 1: Erstelle `src/app/api/partners/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (session.user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const category = sp.get('category')
  const type = sp.get('type')
  const lat = sp.get('lat')
  const lng = sp.get('lng')
  const radiusKm = sp.get('radiusKm')
  const take = 20
  const cursor = sp.get('cursor')

  const where: Record<string, unknown> = { verificationStatus: 'VERIFIED' }
  if (category) where.categories = { has: category }
  if (type && ['LOCAL', 'EXPERT', 'DIGITAL'].includes(type)) where.type = type

  let partners = await prisma.partner.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: {
      id: true, name: true, type: true, categories: true, description: true,
      city: true, lat: true, lng: true, website: true, phone: true,
      minimumLevel: true, verificationStatus: true,
    },
  })

  if (lat && lng && radiusKm) {
    const la = parseFloat(lat), ln = parseFloat(lng), rk = parseFloat(radiusKm)
    if (!Number.isNaN(la) && !Number.isNaN(ln) && !Number.isNaN(rk)) {
      partners = partners
        .filter((p) => p.lat !== null && p.lng !== null && haversineKm(la, ln, p.lat, p.lng) <= rk)
        .sort((a, b) => {
          const da = haversineKm(la, ln, a.lat!, a.lng!)
          const db = haversineKm(la, ln, b.lat!, b.lng!)
          return da - db
        })
    }
  }

  const nextCursor = partners.length > take ? partners[take - 1].id : null
  return NextResponse.json({ partners: partners.slice(0, take), nextCursor })
}
```

- [ ] **Step 2: Modifiziere `src/components/partners/PartnerCard.tsx`**

Zwei minimale Änderungen:

(a) Im `Partner`-Interface oben in der Datei: ändere die Zeile
```tsx
  rating: number
```
zu
```tsx
  rating?: number
```

(b) Finde im JSX den Block, der `partner.rating` rendert (suche nach `partner.rating` im File — er ist typischerweise neben dem Star-Icon). Wickle den gesamten JSX-Block, der `partner.rating` liest, in eine Conditional:

```tsx
{partner.rating !== undefined && (
  <>...bestehendes JSX unverändert...</>
)}
```

Falls das Rating-JSX direkt in einem Flex-Container sitzt und nicht ausgelagert werden kann, ersetze den Text-Content durch:
```tsx
{partner.rating !== undefined ? partner.rating.toFixed(1) : '–'}
```
und lasse das umgebende Layout unverändert. Beide Varianten sind akzeptabel — wähle die minimal-invasive.

- [ ] **Step 3: Modifiziere `src/app/(app)/partners/page.tsx` komplett**

Ersetze den Inhalt der Datei (sie ist aktuell `'use client'`) komplett mit einer Server-Component:

```tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Partner as UiPartner } from '@/components/partners/PartnerCard'
import { PartnersPageClient } from './PartnersPageClient'

const CATEGORY_LABELS: Record<string, string> = {
  physiotherapy: 'Physiotherapie',
  fitness:       'Fitness',
  mental:        'Mental Health',
  nutrition:     'Ernährung',
  sleep:         'Schlaf',
  msk:           'MSK',
  prevention:    'Präventivmedizin',
  movement:      'Bewegung',
}

function toUiPartner(p: {
  name: string
  type: string
  categories: string[]
  city: string | null
  minimumLevel: string
  verificationStatus: string
}, currentLevel: UiPartner['currentLevel']): UiPartner {
  const cat = p.categories[0]
  return {
    name:         p.name,
    type:         cat ? (CATEGORY_LABELS[cat] ?? cat) : '',
    distance:     p.type === 'DIGITAL' ? 'digital' : (p.city ?? 'vor Ort'),
    verified:     p.verificationStatus === 'VERIFIED',
    minLevel:     (p.minimumLevel === 'STARTER' ? 'all' : p.minimumLevel) as UiPartner['minLevel'],
    currentLevel,
  }
}

export default async function PartnersPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')
  if (session.user.role !== 'EMPLOYEE') redirect('/dashboard')

  const userPoints = await prisma.userPoints.findUnique({ where: { userId: session.user.id } })
  const currentLevel = (userPoints?.level ?? 'STARTER') as UiPartner['currentLevel']

  const dbPartners = await prisma.partner.findMany({
    where: { verificationStatus: 'VERIFIED' },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true, name: true, type: true, categories: true,
      city: true, minimumLevel: true, verificationStatus: true,
    },
  })

  const partners = dbPartners.map((p) => toUiPartner(p, currentLevel))

  return <PartnersPageClient partners={partners} currentLevel={currentLevel} />
}
```

- [ ] **Step 4: Erstelle `src/app/(app)/partners/PartnersPageClient.tsx`**

Extrahiere die bestehende Filter-/Tab-/UI-Logik in eine Client-Component:

```tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { PartnerCard, type Partner } from '@/components/partners/PartnerCard'
import { LevelBadge, type Level } from '@/components/ui/level-badge'

const CATEGORIES = ['Alle', 'Physiotherapie', 'Fitness', 'Mental Health', 'Ernährung', 'Schlaf', 'MSK']
type Tab = 'alle' | 'nahe' | 'digital' | 'vorteile'

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item:      { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
}

const LEVEL_ORDER: Level[] = ['STARTER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM']

export function PartnersPageClient({ partners, currentLevel }: { partners: Partner[]; currentLevel: Level }) {
  const [tab, setTab] = useState<Tab>('alle')
  const [category, setCategory] = useState('Alle')

  const filtered = partners.filter((p) => {
    if (tab === 'nahe'    && p.distance === 'digital') return false
    if (tab === 'digital' && p.distance !== 'digital') return false
    if (tab === 'vorteile') {
      const unlocked = p.minLevel === 'all' || LEVEL_ORDER.indexOf(currentLevel) >= LEVEL_ORDER.indexOf(p.minLevel as Level)
      if (!unlocked) return false
    }
    if (category !== 'Alle' && p.type !== category) return false
    return true
  })

  return (
    <div className="space-y-5 pb-24 lg:pb-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
          Partner-Netzwerk
        </h1>
        <p className="text-sm text-gray-400 mt-1">Kuratierte Angebote für dein Wohlbefinden</p>
      </div>

      <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #f0fdf9, #ffffff)', border: '1px solid #d1fae5' }}>
        <div className="flex items-center gap-2 mb-3">
          <LevelBadge level={currentLevel} />
          <span className="text-sm font-semibold text-gray-700">Dein aktuelles Level</span>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#f3f4f6' }}>
        {(['alle', 'nahe', 'digital', 'vorteile'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={tab === t ? { background: 'white', color: '#14b8a6', boxShadow: '0 1px 3px rgb(0,0,0,0.07)' } : { color: '#6b7280' }}
          >
            {t === 'alle' ? 'Alle' : t === 'nahe' ? 'In der Nähe' : t === 'digital' ? 'Digital' : 'Meine Vorteile'}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={category === c ? { background: '#14b8a6', color: 'white' } : { background: '#f3f4f6', color: '#6b7280' }}
          >
            {c}
          </button>
        ))}
      </div>

      <motion.div
        className="space-y-3"
        variants={stagger.container}
        initial="hidden"
        animate="show"
        key={tab + category}
      >
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            Bald mehr Partner in deiner Region.
          </div>
        ) : (
          filtered.map((p) => (
            <motion.div key={p.name} variants={stagger.item}>
              <PartnerCard partner={p} />
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 5: Run suite + TS check**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run && npx tsc --noEmit
```

Erwartet: 251 tests passed, TS clean.

- [ ] **Step 6: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/app/api/partners/ src/components/partners/PartnerCard.tsx "src/app/(app)/partners/"
git commit -m "$(cat <<'EOF'
feat: replace mock partners with real DB-backed discovery

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Partner-Portal UI (Register, Login, Dashboard, Documents)

**Files:**
- Create: `src/app/partner/register/page.tsx`
- Create: `src/app/partner/login/page.tsx`
- Create: `src/app/partner/dashboard/page.tsx`
- Create: `src/app/partner/documents/page.tsx`

- [ ] **Step 1: Erstelle `src/app/partner/register/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  { id: 'physiotherapy', label: 'Physiotherapie' },
  { id: 'fitness',       label: 'Fitness' },
  { id: 'mental',        label: 'Mental Health' },
  { id: 'nutrition',     label: 'Ernährung' },
  { id: 'sleep',         label: 'Schlaf' },
  { id: 'msk',           label: 'MSK' },
  { id: 'prevention',    label: 'Präventivmedizin' },
  { id: 'movement',      label: 'Bewegung' },
]

export default function PartnerRegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    email: '', password: '', name: '',
    type: 'LOCAL', categories: [] as string[],
    description: '', city: '', address: '', website: '', phone: '',
    minimumLevel: 'STARTER',
  })

  function toggleCategory(id: string) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(id) ? f.categories.filter((c) => c !== id) : [...f.categories, id],
    }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/partner/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.status === 201) {
        router.push('/partner/dashboard')
        return
      }
      const data = await res.json()
      setError(
        data.error === 'email_taken' ? 'Diese E-Mail ist bereits registriert.' :
        data.error === 'rate_limited' ? 'Zu viele Versuche. Bitte später erneut.' :
        'Eingaben prüfen und erneut versuchen.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
        Partner werden
      </h1>
      <p className="text-sm text-gray-500 mb-6">Registriere dein Angebot im ELYO-Partner-Netzwerk.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <input required type="email" placeholder="E-Mail" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm" />
        <input required type="password" placeholder="Passwort (min 8 Zeichen)" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm" />
        <input required placeholder="Name des Angebots" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm" />

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Typ</label>
          <div className="flex gap-2">
            {(['LOCAL', 'EXPERT', 'DIGITAL'] as const).map((t) => (
              <button type="button" key={t} onClick={() => setForm({ ...form, type: t })}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={form.type === t ? { background: '#14b8a6', color: 'white' } : { background: '#f3f4f6', color: '#6b7280' }}>
                {t === 'LOCAL' ? 'Lokal' : t === 'EXPERT' ? 'Experte' : 'Digital'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Kategorien (mind. 1)</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button type="button" key={c.id} onClick={() => toggleCategory(c.id)}
                className="px-3 py-1.5 rounded-full text-xs font-medium"
                style={form.categories.includes(c.id) ? { background: '#14b8a6', color: 'white' } : { background: '#f3f4f6', color: '#6b7280' }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <textarea required placeholder="Beschreibung (min 40 Zeichen)" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={4} className="w-full border rounded-lg px-3 py-2 text-sm" />

        <input placeholder="Stadt (optional)" value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm" />

        <input placeholder="Adresse (optional)" value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm" />

        <input type="url" placeholder="Website (optional)" value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm" />

        <input type="tel" placeholder="Telefon (optional)" value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm" />

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mindest-Level (ab welchem Level dürfen Mitarbeiter dein Angebot nutzen)</label>
          <select value={form.minimumLevel} onChange={(e) => setForm({ ...form, minimumLevel: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            {['STARTER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-lg font-semibold text-white disabled:opacity-50"
          style={{ background: '#14b8a6' }}>
          {loading ? 'Registriere …' : 'Registrieren'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Schon registriert? <a href="/partner/login" className="text-emerald-700 font-medium">Hier einloggen</a>
        </p>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Erstelle `src/app/partner/login/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PartnerLoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/partner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        router.push('/partner/dashboard')
        return
      }
      const data = await res.json()
      setError(data.error === 'rate_limited' ? 'Zu viele Versuche.' : 'E-Mail oder Passwort falsch.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
        Partner-Login
      </h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input required type="email" placeholder="E-Mail" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm" />
        <input required type="password" placeholder="Passwort" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} type="submit"
          className="w-full py-3 rounded-lg font-semibold text-white disabled:opacity-50"
          style={{ background: '#14b8a6' }}>
          {loading ? 'Login …' : 'Einloggen'}
        </button>
      </form>
      <p className="text-xs text-gray-500 text-center mt-4">
        Noch kein Partner? <a href="/partner/register" className="text-emerald-700 font-medium">Registrieren</a>
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Erstelle `src/app/partner/dashboard/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyPartnerSession, PARTNER_SESSION_COOKIE } from '@/lib/partners/auth'

const STATUS_META: Record<string, { color: string; bg: string; label: string; hint: string }> = {
  PENDING_DOCS:   { color: '#b45309', bg: '#fef3c7', label: 'Nachweis fehlt',         hint: 'Lade einen Nachweis hoch, damit wir dein Profil prüfen können.' },
  PENDING_REVIEW: { color: '#1d4ed8', bg: '#dbeafe', label: 'In Prüfung',             hint: 'Wir schauen uns deinen Nachweis an. Das dauert in der Regel 1–3 Werktage.' },
  VERIFIED:       { color: '#047857', bg: '#d1fae5', label: 'Freigeschaltet',         hint: 'Dein Profil ist für Mitarbeiter sichtbar.' },
  SUSPENDED:      { color: '#b91c1c', bg: '#fee2e2', label: 'Vorübergehend pausiert', hint: 'Bei Fragen bitte Support kontaktieren.' },
  REJECTED:       { color: '#b91c1c', bg: '#fee2e2', label: 'Abgelehnt',              hint: '' },
}

export default async function PartnerDashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(PARTNER_SESSION_COOKIE)?.value
  if (!token) redirect('/partner/login')
  const session = verifyPartnerSession(token)
  if (!session) redirect('/partner/login')

  const partner = await prisma.partner.findUnique({ where: { id: session.partnerId } })
  if (!partner) redirect('/partner/login')

  const meta = STATUS_META[partner.verificationStatus]

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
        {partner.name}
      </h1>

      <div className="rounded-xl px-4 py-3" style={{ background: meta.bg, color: meta.color }}>
        <p className="font-semibold text-sm">{meta.label}</p>
        {meta.hint && <p className="text-xs mt-1 opacity-80">{meta.hint}</p>}
        {partner.verificationStatus === 'REJECTED' && partner.rejectionReason && (
          <p className="text-xs mt-2"><strong>Grund:</strong> {partner.rejectionReason}</p>
        )}
      </div>

      {(partner.verificationStatus === 'PENDING_DOCS' || partner.verificationStatus === 'REJECTED') && (
        <a href="/partner/documents" className="block rounded-xl px-4 py-3 text-center font-semibold text-white"
          style={{ background: '#14b8a6' }}>
          Nachweis hochladen
        </a>
      )}

      <div className="rounded-xl border border-gray-200 p-4 space-y-2">
        <p className="text-xs uppercase tracking-wide text-gray-500">Profil</p>
        <p className="text-sm text-gray-800"><strong>Typ:</strong> {partner.type}</p>
        <p className="text-sm text-gray-800"><strong>Kategorien:</strong> {partner.categories.join(', ')}</p>
        <p className="text-sm text-gray-800"><strong>Mindest-Level:</strong> {partner.minimumLevel}</p>
        {partner.city && <p className="text-sm text-gray-800"><strong>Stadt:</strong> {partner.city}</p>}
        {partner.website && <p className="text-sm text-gray-800"><strong>Website:</strong> {partner.website}</p>}
      </div>

      <form action="/api/partner/logout" method="post">
        <button type="submit" className="w-full py-2 rounded-lg text-sm text-gray-600 border border-gray-200">
          Abmelden
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Erstelle `src/app/partner/documents/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PartnerDocumentsPage() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setUploading(true)
    try {
      const formData = new FormData(e.currentTarget)
      const res = await fetch('/api/partner/documents', { method: 'POST', body: formData })
      if (res.ok) {
        setSuccess(true)
        setTimeout(() => router.push('/partner/dashboard'), 1500)
        return
      }
      const data = await res.json()
      setError(
        data.error === 'too_large' ? 'Datei ist zu groß (max 5 MB).' :
        data.error === 'invalid_file' ? 'Nur PDF, PNG oder JPG erlaubt.' :
        data.error === 'unauthorized' ? 'Session abgelaufen, bitte neu einloggen.' :
        'Upload fehlgeschlagen.',
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
        Nachweis hochladen
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        PDF, PNG oder JPG. Max 5 MB. Beispiele: Register-Auszug, Zertifikat, Gewerbeanmeldung.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <input required name="file" type="file" accept="application/pdf,image/png,image/jpeg" className="w-full" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">Hochgeladen. Weiterleitung …</p>}
        <button disabled={uploading} type="submit"
          className="w-full py-3 rounded-lg font-semibold text-white disabled:opacity-50"
          style={{ background: '#14b8a6' }}>
          {uploading ? 'Lade hoch …' : 'Hochladen'}
        </button>
      </form>

      <p className="text-xs text-gray-400 text-center mt-4">
        <a href="/partner/dashboard" className="underline">Zurück zum Dashboard</a>
      </p>
    </div>
  )
}
```

- [ ] **Step 5: Run suite + TS check**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/app/partner/
git commit -m "$(cat <<'EOF'
feat: add partner portal UI (register, login, dashboard, upload)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Admin-UI (Liste + Detail + Actions)

**Files:**
- Create: `src/app/admin/partners/page.tsx`
- Create: `src/app/admin/partners/[id]/page.tsx`
- Create: `src/app/admin/partners/[id]/ActionPanel.tsx`

- [ ] **Step 1: Erstelle `src/app/admin/partners/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const STATUS_LABELS: Record<string, string> = {
  PENDING_DOCS:   'Nachweis fehlt',
  PENDING_REVIEW: 'Zu prüfen',
  VERIFIED:       'Aktiv',
  SUSPENDED:      'Pausiert',
  REJECTED:       'Abgelehnt',
}

export default async function AdminPartnersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')
  if (session.user.role !== 'ELYO_ADMIN') redirect('/dashboard')

  const { status: activeStatus = 'PENDING_REVIEW' } = await searchParams

  const [pendingCount, verifiedCount, suspendedCount, rejectedCount, partners] = await Promise.all([
    prisma.partner.count({ where: { verificationStatus: 'PENDING_REVIEW' } }),
    prisma.partner.count({ where: { verificationStatus: 'VERIFIED' } }),
    prisma.partner.count({ where: { verificationStatus: 'SUSPENDED' } }),
    prisma.partner.count({ where: { verificationStatus: 'REJECTED' } }),
    prisma.partner.findMany({
      where: { verificationStatus: activeStatus as 'PENDING_REVIEW' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, name: true, type: true, email: true, city: true, categories: true, verificationStatus: true, createdAt: true },
    }),
  ])

  const TABS: Array<{ id: string; label: string; count: number }> = [
    { id: 'PENDING_REVIEW', label: 'Zu prüfen',  count: pendingCount },
    { id: 'VERIFIED',       label: 'Aktiv',      count: verifiedCount },
    { id: 'SUSPENDED',      label: 'Pausiert',   count: suspendedCount },
    { id: 'REJECTED',       label: 'Abgelehnt',  count: rejectedCount },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
        Partner-Verwaltung
      </h1>
      <p className="text-sm text-gray-500 mb-6">ELYO-interne Partner-Qualifizierung.</p>

      <div className="flex gap-2 mb-6 border-b">
        {TABS.map((t) => (
          <Link key={t.id} href={`/admin/partners?status=${t.id}`}
            className="px-3 py-2 text-sm font-medium"
            style={activeStatus === t.id ? { color: '#14b8a6', borderBottom: '2px solid #14b8a6' } : { color: '#6b7280' }}>
            {t.label} <span className="ml-1 text-xs">({t.count})</span>
          </Link>
        ))}
      </div>

      {partners.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">Keine Partner in diesem Status.</p>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Typ</th>
                <th className="text-left px-4 py-2">Stadt</th>
                <th className="text-left px-4 py-2">Kategorien</th>
                <th className="text-left px-4 py-2">Erstellt</th>
                <th className="text-right px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-sm">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.city ?? '–'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{p.categories.join(', ')}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString('de-DE')}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/partners/${p.id}`} className="text-xs font-medium text-emerald-700">
                      Prüfen →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Erstelle `src/app/admin/partners/[id]/ActionPanel.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ActionPanel({ partnerId, status }: { partnerId: string; status: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function act(action: string, rejectionReason?: string) {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejectionReason }),
      })
      if (res.ok) {
        router.refresh()
        setShowRejectModal(false)
        return
      }
      const data = await res.json()
      setError(data.error ?? 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      {status === 'PENDING_REVIEW' && (
        <>
          <button disabled={loading} onClick={() => act('approve')}
            className="w-full py-2 rounded-lg font-semibold text-white" style={{ background: '#047857' }}>
            Freischalten
          </button>
          <button disabled={loading} onClick={() => setShowRejectModal(true)}
            className="w-full py-2 rounded-lg font-semibold text-white" style={{ background: '#b91c1c' }}>
            Ablehnen
          </button>
        </>
      )}
      {status === 'VERIFIED' && (
        <button disabled={loading} onClick={() => act('suspend')}
          className="w-full py-2 rounded-lg font-semibold text-white" style={{ background: '#b45309' }}>
          Pausieren
        </button>
      )}
      {status === 'SUSPENDED' && (
        <button disabled={loading} onClick={() => act('unsuspend')}
          className="w-full py-2 rounded-lg font-semibold text-white" style={{ background: '#047857' }}>
          Wieder aktivieren
        </button>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-2">Ablehnen</h2>
            <textarea required rows={4} placeholder="Begründung (min 5 Zeichen)" value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2 rounded-lg text-sm border border-gray-200">Abbrechen</button>
              <button disabled={loading || reason.length < 5}
                onClick={() => act('reject', reason)}
                className="flex-1 py-2 rounded-lg font-semibold text-white disabled:opacity-50"
                style={{ background: '#b91c1c' }}>
                Ablehnen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Erstelle `src/app/admin/partners/[id]/page.tsx`**

```tsx
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ActionPanel } from './ActionPanel'

export default async function AdminPartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')
  if (session.user.role !== 'ELYO_ADMIN') redirect('/dashboard')

  const { id } = await params
  const partner = await prisma.partner.findUnique({ where: { id } })
  if (!partner) notFound()

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <a href="/admin/partners" className="text-xs text-emerald-700">← Zurück</a>
      <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
        {partner.name}
      </h1>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-3 rounded-xl border border-gray-200 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Profil</p>
          <p className="text-sm"><strong>E-Mail:</strong> {partner.email}</p>
          <p className="text-sm"><strong>Typ:</strong> {partner.type}</p>
          <p className="text-sm"><strong>Kategorien:</strong> {partner.categories.join(', ')}</p>
          <p className="text-sm"><strong>Mindest-Level:</strong> {partner.minimumLevel}</p>
          {partner.city && <p className="text-sm"><strong>Stadt:</strong> {partner.city}</p>}
          {partner.address && <p className="text-sm"><strong>Adresse:</strong> {partner.address}</p>}
          {partner.website && <p className="text-sm"><strong>Website:</strong> <a href={partner.website} target="_blank" rel="noopener" className="text-emerald-700 underline">{partner.website}</a></p>}
          {partner.phone && <p className="text-sm"><strong>Telefon:</strong> {partner.phone}</p>}
          <p className="text-sm mt-3"><strong>Beschreibung:</strong></p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{partner.description}</p>

          {partner.nachweisUrl && (
            <p className="text-sm mt-3"><strong>Nachweis:</strong> <a href={partner.nachweisUrl} target="_blank" rel="noopener" className="text-emerald-700 underline">Öffnen</a></p>
          )}
          {partner.verificationStatus === 'REJECTED' && partner.rejectionReason && (
            <p className="text-sm text-red-700"><strong>Ablehnungsgrund:</strong> {partner.rejectionReason}</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
            <p className="text-sm font-semibold mt-1">{partner.verificationStatus}</p>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Audit</p>
            <p className="text-xs text-gray-600">Erstellt: {new Date(partner.createdAt).toLocaleString('de-DE')}</p>
            {partner.reviewedAt && (
              <p className="text-xs text-gray-600">Zuletzt geprüft: {new Date(partner.reviewedAt).toLocaleString('de-DE')}</p>
            )}
            {partner.reviewedById && (
              <p className="text-xs text-gray-600">Von User-ID: {partner.reviewedById}</p>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <ActionPanel partnerId={partner.id} status={partner.verificationStatus} />
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run suite + TS check**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/app/admin/
git commit -m "$(cat <<'EOF'
feat: add ELYO admin partner qualification UI (list, detail, actions)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Seed — ELYO_ADMIN + 8 Demo-Partner

**Files:**
- Create: `src/lib/partners/seed.ts`
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Erstelle `src/lib/partners/seed.ts`**

```typescript
import type { PrismaClient } from '@prisma/client'
import { hashPartnerPassword } from './password'

const SEED_PARTNERS = [
  { email: 'physio-muenchen@seed.elyo.de', name: 'Physiozentrum München Ost', type: 'LOCAL',  categories: ['physiotherapy'], description: 'Moderne Physiotherapie-Praxis in München Ost mit Schwerpunkt auf aktiver Rehabilitation und manueller Therapie.', city: 'München', minimumLevel: 'STARTER' },
  { email: 'yogaflow@seed.elyo.de',          name: 'YogaFlow Studio',          type: 'LOCAL',  categories: ['movement', 'fitness'], description: 'Studio für Vinyasa-, Yin- und Hatha-Yoga. Ideal für Einsteiger und Fortgeschrittene, verschiedene Kurszeiten.', city: 'München', minimumLevel: 'STARTER' },
  { email: 'dr-berger@seed.elyo.de',         name: 'Dr. med. Anna Berger',     type: 'EXPERT', categories: ['prevention'], description: 'Fachärztin für Präventivmedizin. Individuelle Check-ups und Gesundheitsberatung, Schwerpunkt Stress-Resilienz.', city: 'München', minimumLevel: 'GOLD' },
  { email: 'mindfulness@seed.elyo.de',       name: 'MindfulNess Online',       type: 'DIGITAL',categories: ['mental'],   description: 'Online-Programme für Achtsamkeit, Meditation und Stressreduktion. Wöchentliche Live-Sessions und geführte Übungen.', city: null,      minimumLevel: 'SILVER' },
  { email: 'ernaehrung-koch@seed.elyo.de',   name: 'Ernährungsberatung Koch',  type: 'EXPERT', categories: ['nutrition'],description: 'Zertifizierte Ernährungsberatung nach DGE-Standard. Individuelle Beratung zu ausgewogener Ernährung, inkl. Blutwert-Analyse auf Wunsch.', city: 'München', minimumLevel: 'BRONZE' },
  { email: 'fitnessfabrik@seed.elyo.de',     name: 'FitnessFabrik',            type: 'LOCAL',  categories: ['fitness'],  description: 'Voll ausgestattetes Fitnessstudio mit Group Fitness, Personal Training und Sauna. 7 Tage die Woche geöffnet.', city: 'München', minimumLevel: 'SILVER' },
  { email: 'ruecken-coach@seed.elyo.de',     name: 'Rücken-Coach Online',      type: 'DIGITAL',categories: ['msk'],      description: 'App-basiertes Rücken-Trainingsprogramm mit individuell angepassten Übungen. Begleitend Video-Coaching.', city: null,      minimumLevel: 'STARTER' },
  { email: 'schlaf-mueller@seed.elyo.de',    name: 'Schlafcoaching Müller',    type: 'DIGITAL',categories: ['sleep'],    description: 'Coaching-Programm zur Optimierung der Schlafqualität. Digitale Schlafbegleitung mit wissenschaftlich fundierten Methoden.', city: null,      minimumLevel: 'STARTER' },
] as const

export async function seedPartners(prisma: PrismaClient): Promise<void> {
  const placeholderHash = await hashPartnerPassword('seed-reset-required-' + Math.random().toString(36).slice(2))
  for (const p of SEED_PARTNERS) {
    await prisma.partner.upsert({
      where:  { email: p.email },
      update: {},
      create: {
        email: p.email,
        passwordHash: placeholderHash,
        name: p.name,
        type: p.type,
        categories: [...p.categories],
        description: p.description,
        city: p.city,
        minimumLevel: p.minimumLevel,
        verificationStatus: 'VERIFIED',
      },
    })
  }
}
```

- [ ] **Step 2: Erweitere `prisma/seed.ts`**

Suche `async function main()` in `prisma/seed.ts`. Vor `console.log("🌱 Seeding ELYO demo data...")` füge importierende Zeile ein:

```typescript
import { seedPartners } from '../src/lib/partners/seed'
```

Füge am Ende der `main`-Funktion (vor `await prisma.$disconnect()` oder am Funktionsende) ein:

```typescript
  // ── ELYO-Staff Seed ────────────────────────────────────────────────────────
  const elyoEmail = process.env.ELYO_INITIAL_ADMIN_EMAIL
  const elyoPassword = process.env.ELYO_INITIAL_ADMIN_PASSWORD
  if (elyoEmail && elyoPassword) {
    const elyoHash = await bcrypt.hash(elyoPassword, 12)
    await prisma.user.upsert({
      where: { email: elyoEmail },
      update: {},
      create: {
        email: elyoEmail,
        name: 'ELYO Admin',
        passwordHash: elyoHash,
        role: 'ELYO_ADMIN',
        companyId: null,
      },
    })
    console.log('✅ ELYO_ADMIN:', elyoEmail)
  } else {
    console.log('ℹ️  Skipped ELYO_ADMIN seed (ELYO_INITIAL_ADMIN_EMAIL/PASSWORD not set)')
  }

  // ── Partner Seed ───────────────────────────────────────────────────────────
  await seedPartners(prisma)
  console.log('✅ Seeded 8 demo partners')
```

- [ ] **Step 3: Run seed (optional; only if local DB is reachable)**

Dieser Schritt ist optional, da lokale DB-Verbindung nicht garantiert ist. Wenn vorhanden:

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npm run db:seed 2>&1 | tail -20
```

Wenn keine DB verfügbar, skippen. Die Seed-Logik ist idempotent (`upsert`), sodass Produktion sicher ist.

- [ ] **Step 4: Run tests + TS check**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run && npx tsc --noEmit
```

Erwartet: 251 tests passed, TS clean.

- [ ] **Step 5: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/lib/partners/seed.ts prisma/seed.ts
git commit -m "$(cat <<'EOF'
feat: seed ELYO_ADMIN user + 8 demo partners

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Completion Checklist

Nach Task 12:

- [ ] `npx vitest run` — 251 Tests passed
- [ ] `npx tsc --noEmit` — keine Fehler
- [ ] 12 neue Commits auf `main`
- [ ] `POST /api/partner/register` → 201 + Cookie (happy path), 409 email_taken, 400 validation_error
- [ ] `POST /api/partner/login` → 200 + Cookie, 401 invalid_credentials
- [ ] `POST /api/partner/documents` → 200 + nachweisUrl, 413 too_large, 400 invalid_file
- [ ] `PATCH /api/admin/partners/[id]` action=approve → 200, E-Mail (dev-log)
- [ ] `GET /api/partners` — liefert nur VERIFIED, mit auth=EMPLOYEE
- [ ] `/partner/register` + `/partner/login` + `/partner/dashboard` im Browser lauffähig
- [ ] `/admin/partners` mit ELYO_ADMIN-Login (via Seed-Env-Vars) lauffähig
- [ ] Employee-App `/partners` zeigt Seed-Partner aus DB

Nachdem alle Tasks fertig sind: Nutze `superpowers:finishing-a-development-branch` zum Abschließen.

**Hinweis zu Integration-Tests:** Die Spec sieht 4 Integration-Tests vor. Diese erfordern Test-DB-Setup (separate schema oder testcontainers). Da diese Infrastruktur-Arbeit den Rahmen dieses Plans sprengen würde, verschieben wir Integration-Tests in einen Folge-Spec. Die Akzeptanz-Kriterien oben (manuelle Prüfung via Browser/curl) ersetzen sie für diesen Plan.
