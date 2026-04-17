# Phase 1.1 – Company Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 4-step self-service onboarding flow at `/onboarding/company` that creates a company + COMPANY_ADMIN user, saves privacy settings, and optionally sends bulk employee invite emails.

**Architecture:** 4-step React state machine (no page reload between steps). Steps 1–2 collect data in component state. Step 3 submits everything to a new `/api/onboarding/company` endpoint (unauthenticated) that creates the company + user in one Prisma transaction, then auto signs-in via NextAuth credentials. Step 4 (invites) calls the authenticated `/api/onboarding/invites` endpoint.

**Tech Stack:** Next.js 14 App Router · Prisma (2 new Company fields) · NextAuth credentials `signIn` · existing `lib/invites.ts` + `lib/email.ts` · Zod · Vitest

---

## Existing infrastructure reused

- `src/lib/invites.ts` — `createInviteToken()` already works
- `src/lib/email.ts` — `send()` helper already works; we add `sendInviteEmail()`
- `src/lib/ratelimit.ts` — already used in register; reuse here
- `src/app/api/auth/register/route.ts` — NOT changed (keeps existing flow intact)
- `prisma/schema.prisma` — Company already has `industry`, `anonymityThreshold`, `checkinFrequency`

## File Map

**New files:**
- `prisma/migrations/YYYYMMDDHHMMSS_add_company_onboarding_fields/migration.sql` — adds `employee_range`, `country`
- `src/app/(onboarding)/layout.tsx` — bare layout (no AppShell, no auth guard)
- `src/app/(onboarding)/onboarding/company/page.tsx` — 4-step form
- `src/app/api/onboarding/company/route.ts` — POST: create company + admin (unauthenticated)
- `src/app/api/onboarding/invites/route.ts` — POST: bulk invite (authenticated)

**Modified files:**
- `prisma/schema.prisma` — add `employeeRange String?` and `country String?` to Company
- `src/lib/email.ts` — add `sendInviteEmail()`
- `src/lib/validations.ts` — add `OnboardingSchema` and `BulkInviteSchema`
- `src/lib/__tests__/email.test.ts` — extend with `sendInviteEmail` tests
- `src/lib/__tests__/validations.test.ts` — extend with new schema tests

---

## Task 1: Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Run: `npx prisma migrate dev`

- [ ] **Step 1: Add fields to Company model in schema.prisma**

In `prisma/schema.prisma`, inside the `Company` model, add after the `billingEmail` line:

```prisma
  employeeRange String?          // "1-10" | "11-50" | "51-200" | "201-500" | "500+"
  country       String?          // ISO 3166-1 alpha-2, e.g. "DE"
```

Full updated Company model (show only modified section):

```prisma
model Company {
  id                 String           @id @default(cuid())
  name               String
  slug               String           @unique
  logoUrl            String?
  primaryColor       String?
  industry           String?
  employeeRange      String?
  country            String?
  checkinFrequency   CheckinFrequency @default(WEEKLY)
  anonymityThreshold Int              @default(5)
  billingEmail       String?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  users        User[]
  teams        Team[]
  surveys      Survey[]
  inviteTokens InviteToken[]

  @@map("companies")
}
```

- [ ] **Step 2: Run migration**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
npx prisma migrate dev --name add_company_onboarding_fields
```

Expected: migration file created, Prisma client regenerated, no errors.

- [ ] **Step 3: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add employeeRange and country fields to Company"
```

---

## Task 2: Add sendInviteEmail + Test

**Files:**
- Modify: `src/lib/email.ts`
- Modify: `src/lib/__tests__/email.test.ts`

- [ ] **Step 1: Add sendInviteEmail to email.ts**

At the bottom of `src/lib/email.ts`, add:

```ts
export async function sendInviteEmail(opts: {
  to: string
  companyName: string
  inviteUrl: string
}): Promise<boolean> {
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700;">Du wurdest zu ELYO eingeladen 🎉</h1>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
      <strong>${opts.companyName}</strong> nutzt ELYO Wellbeing, um das Wohlbefinden im Team zu stärken.
      Du wurdest eingeladen, mitzumachen.
    </p>
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
      ELYO ist anonym, sicher und dauert weniger als 60 Sekunden täglich.
    </p>
    <a
      href="${opts.inviteUrl}"
      style="display:inline-block;background:linear-gradient(135deg,#14b8a6,#0d9488);color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:600;"
    >
      Einladung annehmen →
    </a>
    <p style="margin:24px 0 0;font-size:11px;color:#9ca3af;">
      Dieser Link ist 14 Tage gültig. Du kannst jederzeit ablehnen oder dein Konto löschen.
    </p>
  `
  return send(
    opts.to,
    `${opts.companyName} lädt dich zu ELYO Wellbeing ein`,
    baseTemplate(content),
  )
}
```

- [ ] **Step 2: Write failing tests**

Add a new `describe('sendInviteEmail')` block to `src/lib/__tests__/email.test.ts`. Add `sendInviteEmail` to the import on line 17:

```ts
import { sendCheckinReminder, sendWeeklyDigest, sendInviteEmail } from '../email'
```

Then add at the end of the file:

```ts
describe('sendInviteEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('SMTP_HOST', '')
    vi.stubEnv('SMTP_USER', '')
    vi.stubEnv('SMTP_PASS', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns true and logs in dev mode', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const result = await sendInviteEmail({
      to: 'employee@acme.de',
      companyName: 'Acme GmbH',
      inviteUrl: 'http://localhost:3000/auth/invite/abc123',
    })
    expect(result).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[EMAIL DEV]'))
    consoleSpy.mockRestore()
  })

  it('calls sendMail with correct recipient when SMTP is configured', async () => {
    vi.stubEnv('SMTP_HOST', 'smtp.example.com')
    vi.stubEnv('SMTP_USER', 'user@example.com')
    vi.stubEnv('SMTP_PASS', 'secret')
    sendMailMock.mockResolvedValue({ messageId: 'invite-id' })

    const result = await sendInviteEmail({
      to: 'employee@acme.de',
      companyName: 'Acme GmbH',
      inviteUrl: 'http://localhost:3000/auth/invite/abc123',
    })

    expect(result).toBe(true)
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'employee@acme.de',
        subject: expect.stringContaining('Acme GmbH'),
      }),
    )
  })

  it('returns false when sendMail throws', async () => {
    vi.stubEnv('SMTP_HOST', 'smtp.example.com')
    vi.stubEnv('SMTP_USER', 'user@example.com')
    vi.stubEnv('SMTP_PASS', 'secret')
    sendMailMock.mockRejectedValue(new Error('SMTP error'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await sendInviteEmail({
      to: 'employee@acme.de',
      companyName: 'Acme GmbH',
      inviteUrl: 'http://localhost:3000/auth/invite/abc123',
    })
    expect(result).toBe(false)
    consoleSpy.mockRestore()
  })
})
```

- [ ] **Step 3: Run tests — expect 3 new failures**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
npx vitest run src/lib/__tests__/email.test.ts
```

Expected: existing tests pass, 3 new `sendInviteEmail` tests fail with "is not a function".

- [ ] **Step 4: Run tests again — expect all pass**

After adding the implementation in Step 1, run:

```bash
npx vitest run src/lib/__tests__/email.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts src/lib/__tests__/email.test.ts
git commit -m "feat: add sendInviteEmail function"
```

---

## Task 3: Add Validation Schemas + Test

**Files:**
- Modify: `src/lib/validations.ts`
- Modify: `src/lib/__tests__/validations.test.ts`

- [ ] **Step 1: Write failing tests**

Open `src/lib/__tests__/validations.test.ts`. Add to the imports at the top:

```ts
import { LoginSchema, RegisterSchema, CheckinSchema, TeamSchema, InviteSchema, OnboardingSchema, BulkInviteSchema } from '../validations'
```

Add at the end of the file:

```ts
describe('OnboardingSchema', () => {
  const VALID = {
    companyName: 'Acme GmbH',
    adminName: 'Max Müller',
    email: 'admin@acme.de',
    password: 'secret1234',
  }

  it('accepts minimal valid data', () => {
    expect(OnboardingSchema.safeParse(VALID).success).toBe(true)
  })

  it('applies defaults: anonymityThreshold=5, checkinFrequency=WEEKLY, country=DE', () => {
    const result = OnboardingSchema.safeParse(VALID)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.anonymityThreshold).toBe(5)
      expect(result.data.checkinFrequency).toBe('WEEKLY')
      expect(result.data.country).toBe('DE')
    }
  })

  it('rejects company name shorter than 2 chars', () => {
    expect(OnboardingSchema.safeParse({ ...VALID, companyName: 'A' }).success).toBe(false)
  })

  it('rejects invalid email', () => {
    expect(OnboardingSchema.safeParse({ ...VALID, email: 'not-an-email' }).success).toBe(false)
  })

  it('rejects password shorter than 8 chars', () => {
    expect(OnboardingSchema.safeParse({ ...VALID, password: 'short' }).success).toBe(false)
  })

  it('rejects anonymityThreshold below 3', () => {
    expect(OnboardingSchema.safeParse({ ...VALID, anonymityThreshold: 2 }).success).toBe(false)
  })
})

describe('BulkInviteSchema', () => {
  it('accepts list of valid emails', () => {
    expect(BulkInviteSchema.safeParse({ emails: ['a@b.de', 'c@d.de'] }).success).toBe(true)
  })

  it('rejects invalid email in list', () => {
    expect(BulkInviteSchema.safeParse({ emails: ['a@b.de', 'not-valid'] }).success).toBe(false)
  })

  it('rejects empty array', () => {
    expect(BulkInviteSchema.safeParse({ emails: [] }).success).toBe(false)
  })

  it('rejects array with more than 500 entries', () => {
    const emails = Array.from({ length: 501 }, (_, i) => `user${i}@company.de`)
    expect(BulkInviteSchema.safeParse({ emails }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx vitest run src/lib/__tests__/validations.test.ts
```

Expected: new tests fail with "OnboardingSchema is not exported".

- [ ] **Step 3: Add schemas to validations.ts**

Append to `src/lib/validations.ts`:

```ts
export const OnboardingSchema = z.object({
  companyName:        z.string().min(2, 'Mindestens 2 Zeichen').max(120),
  industry:           z.string().max(80).optional(),
  employeeRange:      z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional(),
  country:            z.string().length(2).default('DE'),
  adminName:          z.string().min(2, 'Mindestens 2 Zeichen').max(100),
  email:              z.string().email('Ungültige E-Mail-Adresse'),
  password:           z.string().min(8, 'Mindestens 8 Zeichen'),
  anonymityThreshold: z.number().int().min(3).max(20).default(5),
  checkinFrequency:   z.enum(['DAILY', 'WEEKLY']).default('WEEKLY'),
})

export const BulkInviteSchema = z.object({
  emails: z.array(z.string().email('Ungültige E-Mail-Adresse')).min(1).max(500),
})
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npx vitest run src/lib/__tests__/validations.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations.ts src/lib/__tests__/validations.test.ts
git commit -m "feat: add OnboardingSchema and BulkInviteSchema"
```

---

## Task 4: Create /api/onboarding/company Route

**Files:**
- Create: `src/app/api/onboarding/company/route.ts`

This endpoint is **unauthenticated** — it creates the company + admin user before any session exists.

- [ ] **Step 1: Create the route file**

Create `src/app/api/onboarding/company/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { OnboardingSchema } from '@/lib/validations'
import { rateLimit, getClientIP } from '@/lib/ratelimit'

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base)
  let i = 0
  while (await prisma.company.findUnique({ where: { slug } })) {
    slug = `${slugify(base)}-${++i}`
  }
  return slug
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req.headers)
  const { allowed, resetAt } = rateLimit(`onboarding:${ip}`, 3, 15 * 60_000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)) } },
    )
  }

  const body = await req.json()
  const parsed = OnboardingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const {
    companyName, industry, employeeRange, country,
    adminName, email, password,
    anonymityThreshold, checkinFrequency,
  } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'E-Mail bereits registriert.' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const slug = await uniqueSlug(companyName)

  const company = await prisma.company.create({
    data: {
      name: companyName,
      slug,
      industry: industry ?? null,
      employeeRange: employeeRange ?? null,
      country,
      anonymityThreshold,
      checkinFrequency,
      users: {
        create: {
          email,
          name: adminName,
          passwordHash,
          role: 'COMPANY_ADMIN',
        },
      },
    },
    select: { id: true },
  })

  return NextResponse.json({ success: true, companyId: company.id }, { status: 201 })
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/onboarding/company/route.ts
git commit -m "feat: add /api/onboarding/company endpoint"
```

---

## Task 5: Create /api/onboarding/invites Route

**Files:**
- Create: `src/app/api/onboarding/invites/route.ts`

This endpoint is **authenticated** — called after auto sign-in in step 3.

- [ ] **Step 1: Create the route file**

Create `src/app/api/onboarding/invites/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createInviteToken } from '@/lib/invites'
import { sendInviteEmail } from '@/lib/email'
import { BulkInviteSchema } from '@/lib/validations'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = BulkInviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { id: true, name: true },
  })
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  let sent = 0
  const failed: string[] = []

  for (const email of parsed.data.emails) {
    try {
      // Skip if user already exists
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) { failed.push(email); continue }

      const invite = await createInviteToken(company.id, {
        email,
        role: 'EMPLOYEE',
        expiresInDays: 14,
      })
      const inviteUrl = `${baseUrl}/auth/invite/${invite.token}`
      const ok = await sendInviteEmail({ to: email, companyName: company.name, inviteUrl })
      if (ok) sent++
      else failed.push(email)
    } catch {
      failed.push(email)
    }
  }

  return NextResponse.json({ sent, failed })
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/onboarding/invites/route.ts
git commit -m "feat: add /api/onboarding/invites bulk invite endpoint"
```

---

## Task 6: Create (onboarding) Layout + 4-Step Form

**Files:**
- Create: `src/app/(onboarding)/layout.tsx`
- Create: `src/app/(onboarding)/onboarding/company/page.tsx`

- [ ] **Step 1: Create the bare layout**

Create `src/app/(onboarding)/layout.tsx`:

```tsx
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'hsl(40, 20%, 97%)' }}>
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M8 2C8 2 3 5.5 3 9a5 5 0 0010 0C13 5.5 8 2 8 2z" fill="white" fillOpacity="0.9"/>
              <path d="M8 6v4M6 8h4" stroke="#0a4540" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Elyo
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the 4-step onboarding page**

Create `src/app/(onboarding)/onboarding/company/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Eye, EyeOff, Check, Loader2, ChevronRight, Users } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface FormData {
  companyName: string
  industry: string
  employeeRange: string
  country: string
  adminName: string
  email: string
  password: string
  anonymityThreshold: number
  checkinFrequency: 'DAILY' | 'WEEKLY'
  dsgvoAccepted: boolean
  agbAccepted: boolean
}

// ── Constants ──────────────────────────────────────────────────────────────

const INDUSTRIES = [
  'Produktion / Fertigung', 'IT / Software', 'Handel / Retail',
  'Gesundheitswesen', 'Finanzdienstleistungen', 'Logistik / Transport',
  'Bau / Handwerk', 'Dienstleistungen', 'Bildung / Non-Profit', 'Sonstiges',
]

const EMPLOYEE_RANGES = ['1-10', '11-50', '51-200', '201-500', '500+']

const ANONYMITY_OPTIONS = [
  { value: 3,  label: '3 Einträge',  desc: 'Niedriger Schwellwert – mehr Einblick, weniger Datenschutz' },
  { value: 5,  label: '5 Einträge',  desc: 'Empfohlen – ausgewogener Standard' },
  { value: 10, label: '10 Einträge', desc: 'Hoher Schwellwert – maximaler Datenschutz' },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Schwach', color: '#ef4444' }
  if (score <= 3) return { score, label: 'Mittel', color: '#f59e0b' }
  return { score, label: 'Stark', color: '#14b8a6' }
}

// ── Step Indicator ─────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => i + 1).map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all"
            style={
              s < current
                ? { background: '#14b8a6', color: 'white' }
                : s === current
                  ? { background: '#0a1f1c', color: 'white' }
                  : { background: '#e5e7eb', color: '#9ca3af' }
            }
          >
            {s < current ? <Check className="w-3.5 h-3.5" /> : s}
          </div>
          {s < total && (
            <div className="h-0.5 w-8" style={{ background: s < current ? '#14b8a6' : '#e5e7eb' }} />
          )}
        </div>
      ))}
      <span className="ml-2 text-xs text-gray-400">Schritt {current} von {total}</span>
    </div>
  )
}

// ── Field components ───────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

const inputCls = "w-full px-3.5 py-2.5 rounded-xl text-sm border bg-white outline-none transition-all focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
const inputStyle = { borderColor: 'hsl(200, 15%, 88%)' }

// ── Main component ─────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [inviteText, setInviteText] = useState('')
  const [inviteResult, setInviteResult] = useState<{ sent: number; failed: string[] } | null>(null)

  const [data, setData] = useState<FormData>({
    companyName: '', industry: '', employeeRange: '', country: 'DE',
    adminName: '', email: '', password: '',
    anonymityThreshold: 5, checkinFrequency: 'WEEKLY',
    dsgvoAccepted: false, agbAccepted: false,
  })

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setData(d => ({ ...d, [key]: value }))
    setError(null)
  }

  // ── Step navigation ──────────────────────────────────────────────────────

  function nextStep1() {
    if (data.companyName.trim().length < 2) { setError('Firmenname muss mindestens 2 Zeichen haben'); return }
    setStep(2)
  }

  function nextStep2() {
    if (data.adminName.trim().length < 2) { setError('Name muss mindestens 2 Zeichen haben'); return }
    if (!data.email.includes('@')) { setError('Ungültige E-Mail-Adresse'); return }
    if (data.password.length < 8) { setError('Passwort muss mindestens 8 Zeichen haben'); return }
    setStep(3)
  }

  async function submitStep3() {
    if (!data.dsgvoAccepted) { setError('Bitte bestätige die Datenschutzerklärung'); return }
    if (!data.agbAccepted) { setError('Bitte akzeptiere die AGB'); return }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: data.companyName,
          industry: data.industry || undefined,
          employeeRange: data.employeeRange || undefined,
          country: data.country,
          adminName: data.adminName,
          email: data.email,
          password: data.password,
          anonymityThreshold: data.anonymityThreshold,
          checkinFrequency: data.checkinFrequency,
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        setError(typeof body.error === 'string' ? body.error : 'Ein Fehler ist aufgetreten')
        return
      }

      // Auto sign-in so step 4 can call authenticated endpoints
      const signInResult = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })
      if (signInResult?.error) {
        setError('Anmeldung fehlgeschlagen. Bitte versuche es erneut.')
        return
      }
      setStep(4)
    } finally {
      setLoading(false)
    }
  }

  async function submitStep4(skip = false) {
    if (skip) { router.push('/company/dashboard'); return }

    const emails = inviteText
      .split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))

    if (emails.length === 0) { router.push('/company/dashboard'); return }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'Fehler beim Senden der Einladungen')
        return
      }
      setInviteResult(body)
      setTimeout(() => router.push('/company/dashboard'), 2500)
    } finally {
      setLoading(false)
    }
  }

  const cardStyle = { background: 'white', border: '1px solid hsl(200, 15%, 88%)', borderRadius: 20 }

  // ── Step 1: Company info ───────────────────────────────────────────────

  if (step === 1) return (
    <div className="space-y-5">
      <StepIndicator current={1} total={4} />
      <div style={cardStyle} className="p-6 space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Unternehmen anlegen
          </h1>
          <p className="text-sm text-gray-400 mt-1">Basis-Informationen zu deinem Unternehmen</p>
        </div>

        <Field label="Unternehmensname *">
          <input
            className={inputCls} style={inputStyle}
            placeholder="Müller Maschinenbau GmbH"
            value={data.companyName}
            onChange={e => set('companyName', e.target.value)}
            autoFocus
          />
        </Field>

        <Field label="Branche">
          <select
            className={inputCls} style={inputStyle}
            value={data.industry}
            onChange={e => set('industry', e.target.value)}
          >
            <option value="">Bitte wählen</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Mitarbeiteranzahl">
            <select
              className={inputCls} style={inputStyle}
              value={data.employeeRange}
              onChange={e => set('employeeRange', e.target.value)}
            >
              <option value="">Bitte wählen</option>
              {EMPLOYEE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>

          <Field label="Land">
            <select
              className={inputCls} style={inputStyle}
              value={data.country}
              onChange={e => set('country', e.target.value)}
            >
              <option value="DE">Deutschland</option>
              <option value="AT">Österreich</option>
              <option value="CH">Schweiz</option>
            </select>
          </Field>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

        <button
          onClick={nextStep1}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
        >
          Weiter <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  // ── Step 2: Admin account ──────────────────────────────────────────────

  if (step === 2) {
    const strength = passwordStrength(data.password)
    return (
      <div className="space-y-5">
        <StepIndicator current={2} total={4} />
        <div style={cardStyle} className="p-6 space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              Admin-Account anlegen
            </h1>
            <p className="text-sm text-gray-400 mt-1">Du verwaltest das Unternehmen mit diesem Account</p>
          </div>

          <Field label="Vollständiger Name *">
            <input
              className={inputCls} style={inputStyle}
              placeholder="Max Müller"
              value={data.adminName}
              onChange={e => set('adminName', e.target.value)}
              autoFocus
            />
          </Field>

          <Field label="E-Mail-Adresse *">
            <input
              className={inputCls} style={inputStyle}
              type="email"
              placeholder="admin@unternehmen.de"
              value={data.email}
              onChange={e => set('email', e.target.value)}
            />
          </Field>

          <Field label="Passwort *">
            <div className="relative">
              <input
                className={inputCls} style={inputStyle}
                type={showPassword ? 'text' : 'password'}
                placeholder="Mindestens 8 Zeichen"
                value={data.password}
                onChange={e => set('password', e.target.value)}
              />
              <button
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                type="button"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {data.password.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div
                      key={i}
                      className="h-1 flex-1 rounded-full"
                      style={{ background: i < strength.score ? strength.color : '#e5e7eb' }}
                    />
                  ))}
                </div>
                <p className="text-xs" style={{ color: strength.color }}>{strength.label}</p>
              </div>
            )}
          </Field>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-3 rounded-xl text-sm font-medium text-gray-600 border"
              style={{ borderColor: 'hsl(200, 15%, 88%)' }}
            >
              Zurück
            </button>
            <button
              onClick={nextStep2}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              Weiter <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 3: Privacy & terms ────────────────────────────────────────────

  if (step === 3) return (
    <div className="space-y-5">
      <StepIndicator current={3} total={4} />
      <div style={cardStyle} className="p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Datenschutz & Betriebsvereinbarung
          </h1>
          <p className="text-sm text-gray-400 mt-1">Einstellungen für Anonymitätsschutz und Check-in-Häufigkeit</p>
        </div>

        {/* Anonymity threshold */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Anonymitätsschwelle</p>
          <div className="space-y-2">
            {ANONYMITY_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all"
                style={{
                  border: `1px solid ${data.anonymityThreshold === opt.value ? '#14b8a6' : 'hsl(200, 15%, 88%)'}`,
                  background: data.anonymityThreshold === opt.value ? '#f0fdf9' : 'white',
                }}
              >
                <input
                  type="radio"
                  name="anonymityThreshold"
                  value={opt.value}
                  checked={data.anonymityThreshold === opt.value}
                  onChange={() => set('anonymityThreshold', opt.value)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Check-in frequency */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Check-in-Häufigkeit</p>
          <div className="grid grid-cols-2 gap-3">
            {(['DAILY', 'WEEKLY'] as const).map(freq => (
              <label
                key={freq}
                className="flex items-center justify-center gap-2 p-3 rounded-xl cursor-pointer text-sm font-medium transition-all"
                style={{
                  border: `1px solid ${data.checkinFrequency === freq ? '#14b8a6' : 'hsl(200, 15%, 88%)'}`,
                  background: data.checkinFrequency === freq ? '#f0fdf9' : 'white',
                  color: data.checkinFrequency === freq ? '#0d9488' : '#6b7280',
                }}
              >
                <input
                  type="radio" name="checkinFrequency" value={freq}
                  checked={data.checkinFrequency === freq}
                  onChange={() => set('checkinFrequency', freq)}
                  className="sr-only"
                />
                {freq === 'DAILY' ? 'Täglich' : 'Wöchentlich'}
              </label>
            ))}
          </div>
        </div>

        {/* Legal checkboxes */}
        <div className="space-y-3">
          {[
            { key: 'dsgvoAccepted' as const, label: 'Ich bestätige, dass die Nutzung von ELYO mit unserem Betriebsrat / der DSGVO abgestimmt wurde.' },
            { key: 'agbAccepted' as const, label: 'Ich akzeptiere die Allgemeinen Geschäftsbedingungen und Datenschutzrichtlinien von ELYO.' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                style={{ background: data[key] ? '#14b8a6' : 'white', border: `1.5px solid ${data[key] ? '#14b8a6' : '#d1d5db'}` }}
                onClick={() => set(key, !data[key])}
              >
                {data[key] && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-xs text-gray-600 leading-relaxed">{label}</span>
            </label>
          ))}
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={() => setStep(2)}
            className="px-4 py-3 rounded-xl text-sm font-medium text-gray-600 border"
            style={{ borderColor: 'hsl(200, 15%, 88%)' }}
          >
            Zurück
          </button>
          <button
            onClick={submitStep3}
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Konto erstellen <ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </div>
  )

  // ── Step 4: Invite employees ───────────────────────────────────────────

  return (
    <div className="space-y-5">
      <StepIndicator current={4} total={4} />
      <div style={cardStyle} className="p-6 space-y-5">
        {inviteResult ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#f0fdf9' }}>
              <Check className="w-7 h-7" style={{ color: '#14b8a6' }} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              {inviteResult.sent} Einladungen gesendet!
            </h2>
            {inviteResult.failed.length > 0 && (
              <p className="text-sm text-gray-400 mt-1">{inviteResult.failed.length} E-Mails konnten nicht gesendet werden.</p>
            )}
            <p className="text-xs text-gray-400 mt-3">Weiterleitung zum Dashboard…</p>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-xl font-semibold text-gray-900" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                Team einladen
              </h1>
              <p className="text-sm text-gray-400 mt-1">Du kannst Einladungen jederzeit auch später verschicken.</p>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f0fdf9', border: '1px solid #d1fae5' }}>
              <Users className="w-4 h-4 flex-shrink-0" style={{ color: '#0d9488' }} />
              <p className="text-xs text-gray-600">
                Mitarbeiter erhalten einen persönlichen Einladungslink per E-Mail (gültig 14 Tage).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                E-Mail-Adressen (eine pro Zeile oder kommagetrennt)
              </label>
              <textarea
                className="w-full px-3.5 py-2.5 rounded-xl text-sm border bg-white outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                style={{ borderColor: 'hsl(200, 15%, 88%)', minHeight: 120 }}
                placeholder={"max.mustermann@firma.de\nerika.muster@firma.de\nteam@firma.de"}
                value={inviteText}
                onChange={e => { setInviteText(e.target.value); setError(null) }}
              />
              <p className="text-xs text-gray-400 mt-1">
                {inviteText.split(/[\n,;]+/).filter(e => e.trim().includes('@')).length} E-Mail(s) erkannt
              </p>
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => submitStep4(true)}
                className="px-4 py-3 rounded-xl text-sm font-medium text-gray-500"
              >
                Überspringen →
              </button>
              <button
                onClick={() => submitStep4(false)}
                disabled={loading}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : 'Einladungen senden'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
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
git add "src/app/(onboarding)/layout.tsx" "src/app/(onboarding)/onboarding/company/page.tsx"
git commit -m "feat: 4-step company onboarding flow"
```

---

## Task 7: Run All Tests + Browser Verification

- [ ] **Step 1: Run full test suite**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
npx vitest run
```

Expected: all existing tests pass + new email + validation tests pass. Zero failures.

- [ ] **Step 2: Start dev server**

```bash
npm run dev
```

- [ ] **Step 3: Walk through the onboarding flow**

Open `http://localhost:3001/onboarding/company`.

Check:
- Step 1: Company name validation works (short name shows error), industry/employeeRange dropdowns work
- Step 2: Password strength bar updates live, show/hide password toggle works
- Step 3: Radio buttons highlight correctly, legal checkboxes toggle, "Konto erstellen" creates the company (check database or server logs)
- Step 4: Email parsing shows correct count, "Überspringen" redirects to `/company/dashboard`, sending emails shows success state then redirects

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Phase 1.1 complete — self-service company onboarding"
```

---

## Self-Review

**Spec coverage (ELYO_Entwicklungsplan.md Prompt 1.1):**
- ✅ Schritt 1: Firmenname, Branche (Dropdown), Mitarbeiteranzahl (Range), Land
- ✅ Schritt 2: Name, E-Mail, Passwort (mit Stärke-Anzeige)
- ✅ Schritt 3: Anonymitätsschwelle (3/5/10), Check-in-Frequenz, DSGVO + AGB Checkbox
- ✅ Schritt 4: E-Mail-Textarea, Parse + Validierung, Einladungen senden, Überspringen
- ✅ sessionStorage not needed — React state is sufficient since the page doesn't reload
- ✅ COMPLETION: Weiterleitung zu /company/dashboard
- ✅ Bestehende Prisma-Models genutzt (Company, User, InviteToken)
- ✅ Progress-Indicator (1/4, 2/4...) sichtbar
- ✅ E-Mail-Template mit ELYO-Branding

**Type consistency:** `OnboardingSchema` fields map exactly to the `POST /api/onboarding/company` body. `BulkInviteSchema.emails` is what the invite route expects.
