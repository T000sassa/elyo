# Test-Infrastruktur Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vitest-Unit-Test-Setup für alle `src/lib/`-Utilities einrichten und vollständige Testabdeckung implementieren.

**Architecture:** Vitest mit `vite-tsconfig-paths` für `@/`-Alias-Auflösung. Prisma und Nodemailer werden pro Testdatei mit `vi.mock` gemockt — kein Refactoring des Produktionscodes außer dem Export von `currentPeriodKey()`. Testdateien liegen in `src/lib/__tests__/`.

**Tech Stack:** Vitest, `@vitest/coverage-v8`, `vite-tsconfig-paths`

---

## Datei-Übersicht

| Aktion | Pfad | Verantwortung |
|---|---|---|
| Create | `vitest.config.ts` | Vitest-Konfiguration, Alias-Auflösung, Coverage |
| Create | `vitest.setup.ts` | Globale Test-Initialisierungen |
| Modify | `package.json` | devDeps + test-Scripts |
| Modify | `src/lib/anonymize.ts` | `currentPeriodKey` exportieren |
| Create | `src/lib/__tests__/utils.test.ts` | Tests für `cn()` |
| Create | `src/lib/__tests__/validations.test.ts` | Tests für Zod-Schemas |
| Create | `src/lib/__tests__/ratelimit.test.ts` | Tests für Rate-Limiter und IP-Extraktion |
| Create | `src/lib/__tests__/anonymize.test.ts` | Tests für Anonymisierungs-Logik |
| Create | `src/lib/__tests__/invites.test.ts` | Tests für Einladungs-Token-Logik |
| Create | `src/lib/__tests__/email.test.ts` | Tests für E-Mail-Versand |

---

## Task 1: Vitest installieren und konfigurieren

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Schritt 1: devDependencies installieren**

```bash
cd elyo-core
npm install --save-dev vitest @vitest/coverage-v8 vite-tsconfig-paths
```

Erwartete Ausgabe: Packages werden in `node_modules` installiert, `package.json` aktualisiert.

- [ ] **Schritt 2: Test-Scripts in `package.json` ergänzen**

Im `"scripts"`-Block folgende drei Einträge hinzufügen (nach `"lint"`):

```json
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

- [ ] **Schritt 3: `vitest.config.ts` erstellen**

```ts
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

- [ ] **Schritt 4: `vitest.setup.ts` erstellen**

```ts
// Global test setup
// SMTP-Env-Vars zurücksetzen, damit kein zufälliger Systemzustand Tests beeinflusst
process.env.SMTP_HOST = ''
process.env.SMTP_USER = ''
process.env.SMTP_PASS = ''
```

- [ ] **Schritt 5: Setup verifizieren**

```bash
npx vitest run --reporter=verbose
```

Erwartete Ausgabe:
```
No test files found
```

Kein Fehler = Konfiguration funktioniert.

- [ ] **Schritt 6: Commit**

```bash
git add vitest.config.ts vitest.setup.ts package.json package-lock.json
git commit -m "chore: add vitest test infrastructure"
```

---

## Task 2: Tests für `lib/utils.ts`

**Files:**
- Create: `src/lib/__tests__/utils.test.ts`

- [ ] **Schritt 1: Testdatei schreiben**

```ts
import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn', () => {
  it('gibt einzelne Klasse zurück', () => {
    expect(cn('px-2')).toBe('px-2')
  })

  it('führt mehrere Klassen zusammen', () => {
    expect(cn('px-2', 'py-4')).toBe('px-2 py-4')
  })

  it('löst Tailwind-Konflikte auf (letzter Wert gewinnt)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('ignoriert undefined', () => {
    expect(cn('px-2', undefined, 'py-4')).toBe('px-2 py-4')
  })

  it('ignoriert false', () => {
    expect(cn('px-2', false, 'py-4')).toBe('px-2 py-4')
  })

  it('gibt leeren String bei leerem Input zurück', () => {
    expect(cn()).toBe('')
  })
})
```

- [ ] **Schritt 2: Tests ausführen**

```bash
npx vitest run src/lib/__tests__/utils.test.ts --reporter=verbose
```

Erwartete Ausgabe: 6 Tests PASS.

- [ ] **Schritt 3: Commit**

```bash
git add src/lib/__tests__/utils.test.ts
git commit -m "test: add unit tests for lib/utils"
```

---

## Task 3: Tests für `lib/validations.ts`

**Files:**
- Create: `src/lib/__tests__/validations.test.ts`

- [ ] **Schritt 1: Testdatei schreiben**

```ts
import { describe, it, expect } from 'vitest'
import { LoginSchema, RegisterSchema, CheckinSchema, InviteSchema } from '../validations'

describe('LoginSchema', () => {
  it('akzeptiert valide Zugangsdaten', () => {
    expect(() =>
      LoginSchema.parse({ email: 'test@example.com', password: 'geheim' })
    ).not.toThrow()
  })

  it('lehnt ungültige E-Mail ab', () => {
    expect(() =>
      LoginSchema.parse({ email: 'keine-email', password: 'geheim' })
    ).toThrow()
  })

  it('lehnt Passwort kürzer als 6 Zeichen ab', () => {
    expect(() =>
      LoginSchema.parse({ email: 'test@example.com', password: '123' })
    ).toThrow()
  })
})

describe('RegisterSchema', () => {
  const valid = {
    companyName: 'Acme GmbH',
    email: 'admin@acme.de',
    password: 'sicher123',
    name: 'Max Müller',
  }

  it('akzeptiert valide Registrierungsdaten', () => {
    expect(() => RegisterSchema.parse(valid)).not.toThrow()
  })

  it('lehnt companyName kürzer als 2 Zeichen ab', () => {
    expect(() => RegisterSchema.parse({ ...valid, companyName: 'A' })).toThrow()
  })

  it('lehnt name kürzer als 2 Zeichen ab', () => {
    expect(() => RegisterSchema.parse({ ...valid, name: 'X' })).toThrow()
  })

  it('lehnt Passwort kürzer als 8 Zeichen ab', () => {
    expect(() => RegisterSchema.parse({ ...valid, password: '1234567' })).toThrow()
  })
})

describe('CheckinSchema', () => {
  const valid = { mood: 7, stress: 3, energy: 8 }

  it('akzeptiert Werte zwischen 1 und 10', () => {
    expect(() => CheckinSchema.parse(valid)).not.toThrow()
  })

  it('akzeptiert Grenzwert 1', () => {
    expect(() => CheckinSchema.parse({ mood: 1, stress: 1, energy: 1 })).not.toThrow()
  })

  it('akzeptiert Grenzwert 10', () => {
    expect(() => CheckinSchema.parse({ mood: 10, stress: 10, energy: 10 })).not.toThrow()
  })

  it('lehnt mood = 0 ab', () => {
    expect(() => CheckinSchema.parse({ ...valid, mood: 0 })).toThrow()
  })

  it('lehnt mood = 11 ab', () => {
    expect(() => CheckinSchema.parse({ ...valid, mood: 11 })).toThrow()
  })

  it('akzeptiert optionale Note', () => {
    expect(() => CheckinSchema.parse({ ...valid, note: 'Guter Tag' })).not.toThrow()
  })

  it('lehnt Note länger als 1000 Zeichen ab', () => {
    expect(() =>
      CheckinSchema.parse({ ...valid, note: 'x'.repeat(1001) })
    ).toThrow()
  })
})

describe('InviteSchema', () => {
  it('akzeptiert EMPLOYEE-Rolle', () => {
    expect(() => InviteSchema.parse({ role: 'EMPLOYEE' })).not.toThrow()
  })

  it('akzeptiert COMPANY_ADMIN-Rolle', () => {
    expect(() => InviteSchema.parse({ role: 'COMPANY_ADMIN' })).not.toThrow()
  })

  it('lehnt ungültige Rolle ab', () => {
    expect(() => InviteSchema.parse({ role: 'SUPERADMIN' })).toThrow()
  })

  it('setzt EMPLOYEE als Default-Rolle', () => {
    const result = InviteSchema.parse({})
    expect(result.role).toBe('EMPLOYEE')
  })
})
```

- [ ] **Schritt 2: Tests ausführen**

```bash
npx vitest run src/lib/__tests__/validations.test.ts --reporter=verbose
```

Erwartete Ausgabe: 13 Tests PASS.

- [ ] **Schritt 3: Commit**

```bash
git add src/lib/__tests__/validations.test.ts
git commit -m "test: add unit tests for lib/validations"
```

---

## Task 4: Tests für `lib/ratelimit.ts`

**Files:**
- Create: `src/lib/__tests__/ratelimit.test.ts`

Hinweis: `ratelimit.ts` enthält ein `setInterval` auf Modul-Ebene. Da Vitest Worker Threads verwendet, wird das Intervall beim Test-Ende automatisch beendet. Die Tests verwenden eindeutige Keys (Counter-basiert) um Seiteneffekte zwischen Tests zu vermeiden.

- [ ] **Schritt 1: Testdatei schreiben**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { rateLimit, getClientIP } from '../ratelimit'

// Eindeutiger Key-Generator verhindert Interferenz zwischen Tests
let keyCounter = 0
const nextKey = () => `test-key-${++keyCounter}`

describe('rateLimit', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('erlaubt erste Anfrage und gibt korrektes remaining zurück', () => {
    const result = rateLimit(nextKey(), 5, 60_000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('erlaubt Anfragen bis zum Limit', () => {
    const key = nextKey()
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 60_000)
    // Dritte Anfrage ist noch erlaubt, vierte nicht
    const result = rateLimit(key, 3, 60_000)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('setzt Zähler nach Ablauf des Zeitfensters zurück', () => {
    vi.useFakeTimers()
    const key = nextKey()
    // Limit ausschöpfen
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 60_000)
    expect(rateLimit(key, 3, 60_000).allowed).toBe(false)
    // Zeitfenster überschreiten
    vi.advanceTimersByTime(61_000)
    const result = rateLimit(key, 3, 60_000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it('resetAt liegt in der Zukunft', () => {
    const before = Date.now()
    const result = rateLimit(nextKey(), 5, 60_000)
    expect(result.resetAt).toBeGreaterThan(before)
  })
})

describe('getClientIP', () => {
  it('gibt erste IP aus x-forwarded-for zurück', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })
    expect(getClientIP(headers)).toBe('1.2.3.4')
  })

  it('gibt IP aus x-real-ip zurück wenn x-forwarded-for fehlt', () => {
    const headers = new Headers({ 'x-real-ip': '9.10.11.12' })
    expect(getClientIP(headers)).toBe('9.10.11.12')
  })

  it('gibt "unknown" zurück wenn kein IP-Header gesetzt', () => {
    const headers = new Headers()
    expect(getClientIP(headers)).toBe('unknown')
  })
})
```

- [ ] **Schritt 2: Tests ausführen**

```bash
npx vitest run src/lib/__tests__/ratelimit.test.ts --reporter=verbose
```

Erwartete Ausgabe: 7 Tests PASS.

- [ ] **Schritt 3: Commit**

```bash
git add src/lib/__tests__/ratelimit.test.ts
git commit -m "test: add unit tests for lib/ratelimit"
```

---

## Task 5: `currentPeriodKey` exportieren + Tests für `lib/anonymize.ts`

**Files:**
- Modify: `src/lib/anonymize.ts` (Zeile 36: `function` → `export function`)
- Create: `src/lib/__tests__/anonymize.test.ts`

- [ ] **Schritt 1: Failing-Test schreiben (importiert noch nicht-exportierte Funktion)**

```ts
// src/lib/__tests__/anonymize.test.ts
import { describe, it, expect } from 'vitest'
import { currentPeriodKey } from '../anonymize'

describe('currentPeriodKey', () => {
  it('gibt YYYY-Www Format zurück', () => {
    expect(currentPeriodKey()).toMatch(/^\d{4}-W\d{2}$/)
  })
})
```

- [ ] **Schritt 2: Test ausführen — erwartet FAIL**

```bash
npx vitest run src/lib/__tests__/anonymize.test.ts --reporter=verbose
```

Erwartete Ausgabe:
```
FAIL  src/lib/__tests__/anonymize.test.ts
SyntaxError: ... 'currentPeriodKey' is not exported from '../anonymize'
```

- [ ] **Schritt 3: `currentPeriodKey` in `src/lib/anonymize.ts` exportieren**

Zeile 36 in [src/lib/anonymize.ts](src/lib/anonymize.ts#L36) ändern:

```ts
// vorher:
function currentPeriodKey(): string {

// nachher:
export function currentPeriodKey(): string {
```

- [ ] **Schritt 4: Test erneut ausführen — erwartet PASS**

```bash
npx vitest run src/lib/__tests__/anonymize.test.ts --reporter=verbose
```

Erwartete Ausgabe: 1 Test PASS.

- [ ] **Schritt 5: Vollständige Testdatei mit allen Mocks ergänzen**

Die bestehende `src/lib/__tests__/anonymize.test.ts` komplett ersetzen:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock wird von Vitest an den Anfang der Datei gehoisted —
// daher Mocks vor den Importen definieren
const mockAggregate = vi.fn()
const mockGroupBy = vi.fn()
const mockCountEntry = vi.fn()
const mockCountUser = vi.fn()

vi.mock('../prisma', () => ({
  prisma: {
    wellbeingEntry: {
      aggregate: mockAggregate,
      groupBy: mockGroupBy,
      count: mockCountEntry,
    },
    user: {
      count: mockCountUser,
    },
  },
}))

import {
  getAggregatedMetrics,
  getTrendData,
  getContinuityData,
  currentPeriodKey,
} from '../anonymize'

describe('currentPeriodKey', () => {
  it('gibt YYYY-Www Format zurück', () => {
    expect(currentPeriodKey()).toMatch(/^\d{4}-W\d{2}$/)
  })

  it('enthält das aktuelle Jahr', () => {
    const year = new Date().getFullYear().toString()
    expect(currentPeriodKey()).toStartWith(year)
  })
})

describe('getAggregatedMetrics', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gibt isAboveThreshold:false wenn count unter Threshold', async () => {
    mockAggregate.mockResolvedValue({
      _avg: { mood: 7, stress: 3, energy: 8, score: 6 },
      _count: { id: 3 },
    })
    const result = await getAggregatedMetrics('company-1', { threshold: 5 })
    expect(result.isAboveThreshold).toBe(false)
    expect(result.avgScore).toBe(0)
    expect(result.avgMood).toBe(0)
    expect(result.responseCount).toBe(3)
  })

  it('gibt gerundete Durchschnittswerte zurück wenn count >= threshold', async () => {
    mockAggregate.mockResolvedValue({
      _avg: { mood: 7.15, stress: 3.26, energy: 8.14, score: 6.28 },
      _count: { id: 10 },
    })
    const result = await getAggregatedMetrics('company-1', { threshold: 5 })
    expect(result.isAboveThreshold).toBe(true)
    expect(result.avgScore).toBe(6.3)
    expect(result.avgMood).toBe(7.2)
    expect(result.avgStress).toBe(3.3)
    expect(result.avgEnergy).toBe(8.1)
    expect(result.responseCount).toBe(10)
  })

  it('behandelt null-Durchschnittswerte ohne NaN (fallback auf 0)', async () => {
    mockAggregate.mockResolvedValue({
      _avg: { mood: null, stress: null, energy: null, score: null },
      _count: { id: 10 },
    })
    const result = await getAggregatedMetrics('company-1', { threshold: 5 })
    expect(result.avgMood).toBe(0)
    expect(result.avgScore).toBe(0)
    expect(isNaN(result.avgMood)).toBe(false)
  })

  it('verwendet DEFAULT_THRESHOLD von 5 wenn kein threshold angegeben', async () => {
    mockAggregate.mockResolvedValue({
      _avg: { mood: 7, stress: 3, energy: 8, score: 6 },
      _count: { id: 4 }, // unter Default-Threshold 5
    })
    const result = await getAggregatedMetrics('company-1')
    expect(result.isAboveThreshold).toBe(false)
  })
})

describe('getTrendData', () => {
  beforeEach(() => vi.clearAllMocks())

  it('filtert Perioden heraus die unter dem Threshold liegen', async () => {
    // Prisma gibt 3 Perioden zurück, aber eine hat zu wenige Einträge
    mockGroupBy.mockResolvedValue([
      { periodKey: '2026-W16', _avg: { score: 7.5, mood: 8.0, stress: 3.0, energy: 8.5 }, _count: { id: 10 } },
      { periodKey: '2026-W15', _avg: { score: 6.5, mood: 7.0, stress: 4.0, energy: 7.0 }, _count: { id: 8 } },
      { periodKey: '2026-W14', _avg: { score: 5.0, mood: 6.0, stress: 5.0, energy: 5.0 }, _count: { id: 3 } },
    ])
    const result = await getTrendData('company-1', { threshold: 5 })
    // W14 (count: 3) herausgefiltert
    expect(result).toHaveLength(2)
    expect(result.find(p => p.period === '2026-W14')).toBeUndefined()
  })

  it('gibt Perioden in aufsteigender Reihenfolge zurück', async () => {
    // Prisma gibt absteigende Reihenfolge zurück
    mockGroupBy.mockResolvedValue([
      { periodKey: '2026-W16', _avg: { score: 7.5, mood: 8.0, stress: 3.0, energy: 8.5 }, _count: { id: 10 } },
      { periodKey: '2026-W15', _avg: { score: 6.5, mood: 7.0, stress: 4.0, energy: 7.0 }, _count: { id: 8 } },
    ])
    const result = await getTrendData('company-1', { threshold: 5 })
    // Nach .reverse() aufsteigend
    expect(result[0].period).toBe('2026-W15')
    expect(result[1].period).toBe('2026-W16')
  })

  it('gibt leeres Array zurück wenn alle Perioden unter Threshold', async () => {
    mockGroupBy.mockResolvedValue([
      { periodKey: '2026-W16', _avg: { score: 7.5, mood: 8.0, stress: 3.0, energy: 8.5 }, _count: { id: 2 } },
    ])
    const result = await getTrendData('company-1', { threshold: 5 })
    expect(result).toHaveLength(0)
  })
})

describe('getContinuityData', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gibt isAboveThreshold:false zurück wenn totalEmployees unter Threshold', async () => {
    mockCountUser.mockResolvedValue(3) // unter Threshold 5
    const result = await getContinuityData('company-1', { threshold: 5 })
    expect(result.isAboveThreshold).toBe(false)
    expect(result.continuityRate).toBe(0)
    expect(result.activeUserRate).toBe(0)
    expect(result.totalEmployees).toBe(3)
  })

  it('berechnet continuityRate und activeUserRate korrekt', async () => {
    mockCountUser.mockResolvedValue(10)    // 10 Mitarbeiter
    mockCountEntry.mockResolvedValue(7)    // 7 haben diese Periode eingecheckt
    // Erste groupBy: letzte 4 Perioden
    mockGroupBy.mockResolvedValueOnce([
      { periodKey: '2026-W16' },
      { periodKey: '2026-W15' },
      { periodKey: '2026-W14' },
      { periodKey: '2026-W13' },
    ])
    // Zweite groupBy: Users die in >= 3 Perioden eingecheckt haben
    mockGroupBy.mockResolvedValueOnce([
      { userId: 'u1', _count: { periodKey: 4 } },
      { userId: 'u2', _count: { periodKey: 3 } },
      { userId: 'u3', _count: { periodKey: 3 } },
    ])

    const result = await getContinuityData('company-1', { threshold: 5 })

    expect(result.isAboveThreshold).toBe(true)
    expect(result.totalEmployees).toBe(10)
    expect(result.checkedInThisPeriod).toBe(7)
    expect(result.continuityRate).toBe(30)  // Math.round(3/10 * 100)
    expect(result.activeUserRate).toBe(70)  // Math.round(7/10 * 100)
  })
})
```

- [ ] **Schritt 6: Alle anonymize-Tests ausführen**

```bash
npx vitest run src/lib/__tests__/anonymize.test.ts --reporter=verbose
```

Erwartete Ausgabe: 11 Tests PASS.

- [ ] **Schritt 7: Commit**

```bash
git add src/lib/anonymize.ts src/lib/__tests__/anonymize.test.ts
git commit -m "test: add unit tests for lib/anonymize + export currentPeriodKey"
```

---

## Task 6: Tests für `lib/invites.ts`

**Files:**
- Create: `src/lib/__tests__/invites.test.ts`

- [ ] **Schritt 1: Testdatei schreiben**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()
const mockFindUnique = vi.fn()

vi.mock('../prisma', () => ({
  prisma: {
    inviteToken: {
      create: mockCreate,
      findUnique: mockFindUnique,
    },
  },
}))

import { generateToken, createInviteToken, verifyInviteToken } from '../invites'

describe('generateToken', () => {
  it('gibt einen 64-stelligen Hex-String zurück', () => {
    const token = generateToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('generiert bei jedem Aufruf einen anderen Token', () => {
    const t1 = generateToken()
    const t2 = generateToken()
    expect(t1).not.toBe(t2)
  })
})

describe('createInviteToken', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ruft prisma.inviteToken.create mit korrekten Daten auf', async () => {
    const fakeToken = {
      id: 'invite-1',
      token: 'abc123',
      companyId: 'company-1',
      role: 'EMPLOYEE',
      email: 'new@company.com',
      expiresAt: new Date(),
      createdAt: new Date(),
    }
    mockCreate.mockResolvedValue(fakeToken)

    const result = await createInviteToken('company-1', {
      email: 'new@company.com',
      role: 'EMPLOYEE',
      expiresInDays: 7,
    })

    expect(mockCreate).toHaveBeenCalledOnce()
    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.data.companyId).toBe('company-1')
    expect(callArgs.data.email).toBe('new@company.com')
    expect(callArgs.data.role).toBe('EMPLOYEE')
    // expiresAt liegt in der Zukunft
    expect(callArgs.data.expiresAt.getTime()).toBeGreaterThan(Date.now())
    expect(result).toEqual(fakeToken)
  })
})

describe('verifyInviteToken', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gibt valid:false zurück wenn Token nicht gefunden', async () => {
    mockFindUnique.mockResolvedValue(null)
    const result = await verifyInviteToken('unbekannter-token')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Einladungslink nicht gefunden')
  })

  it('gibt valid:false zurück wenn Token bereits verwendet wurde', async () => {
    mockFindUnique.mockResolvedValue({
      token: 'used-token',
      usedAt: new Date('2026-01-01'),
      expiresAt: new Date(Date.now() + 86400_000),
      company: { id: 'company-1', name: 'Acme' },
    })
    const result = await verifyInviteToken('used-token')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Einladungslink bereits verwendet')
  })

  it('gibt valid:false zurück wenn Token abgelaufen ist', async () => {
    mockFindUnique.mockResolvedValue({
      token: 'expired-token',
      usedAt: null,
      expiresAt: new Date('2025-01-01'), // Vergangenheit
      company: { id: 'company-1', name: 'Acme' },
    })
    const result = await verifyInviteToken('expired-token')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Einladungslink abgelaufen')
  })

  it('gibt valid:true und invite-Objekt zurück bei gültigem Token', async () => {
    const fakeInvite = {
      token: 'valid-token',
      usedAt: null,
      expiresAt: new Date(Date.now() + 86400_000), // morgen
      email: 'user@company.com',
      role: 'EMPLOYEE',
      company: { id: 'company-1', name: 'Acme' },
    }
    mockFindUnique.mockResolvedValue(fakeInvite)
    const result = await verifyInviteToken('valid-token')
    expect(result.valid).toBe(true)
    expect(result.invite).toEqual(fakeInvite)
  })
})
```

- [ ] **Schritt 2: Tests ausführen**

```bash
npx vitest run src/lib/__tests__/invites.test.ts --reporter=verbose
```

Erwartete Ausgabe: 7 Tests PASS.

- [ ] **Schritt 3: Commit**

```bash
git add src/lib/__tests__/invites.test.ts
git commit -m "test: add unit tests for lib/invites"
```

---

## Task 7: Tests für `lib/email.ts`

**Files:**
- Create: `src/lib/__tests__/email.test.ts`

- [ ] **Schritt 1: Testdatei schreiben**

`vi.hoisted` stellt sicher, dass `sendMailMock` innerhalb der `vi.mock`-Factory verfügbar ist, da `vi.mock` an den Dateianfang gehoisted wird.

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// vi.hoisted: Variablen die innerhalb von vi.mock() gebraucht werden müssen
// VOR der Hoisting-Grenze definiert sein
const sendMailMock = vi.hoisted(() => vi.fn())

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: sendMailMock,
    })),
  },
}))

import { sendCheckinReminder, sendWeeklyDigest } from '../email'

const BASE_CHECKIN_OPTS = {
  to: 'mitarbeiter@company.de',
  name: 'Max Müller',
  companyName: 'Acme GmbH',
  checkinUrl: 'http://localhost:3000/employee/checkin',
}

const BASE_DIGEST_OPTS = {
  to: 'admin@company.de',
  name: 'Admin',
  companyName: 'Acme GmbH',
  avgScore: 7.2,
  atRiskTeams: 0,
  activeRate: 85,
  dashboardUrl: 'http://localhost:3000/company/dashboard',
}

describe('sendCheckinReminder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Kein SMTP-Config → Dev-Modus
    vi.stubEnv('SMTP_HOST', '')
    vi.stubEnv('SMTP_USER', '')
    vi.stubEnv('SMTP_PASS', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('gibt true zurück und loggt im Dev-Modus (kein SMTP)', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const result = await sendCheckinReminder(BASE_CHECKIN_OPTS)
    expect(result).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[EMAIL DEV]')
    )
    consoleSpy.mockRestore()
  })

  it('ruft sendMail mit korrektem Empfänger auf wenn SMTP konfiguriert', async () => {
    vi.stubEnv('SMTP_HOST', 'smtp.example.com')
    vi.stubEnv('SMTP_USER', 'user@example.com')
    vi.stubEnv('SMTP_PASS', 'geheim')
    vi.stubEnv('SMTP_PORT', '587')
    sendMailMock.mockResolvedValue({ messageId: 'test-id' })

    const result = await sendCheckinReminder(BASE_CHECKIN_OPTS)

    expect(result).toBe(true)
    expect(sendMailMock).toHaveBeenCalledOnce()
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'mitarbeiter@company.de',
        subject: expect.stringContaining('Check-in'),
      })
    )
  })

  it('gibt false zurück wenn sendMail einen Fehler wirft', async () => {
    vi.stubEnv('SMTP_HOST', 'smtp.example.com')
    vi.stubEnv('SMTP_USER', 'user@example.com')
    vi.stubEnv('SMTP_PASS', 'geheim')
    sendMailMock.mockRejectedValue(new Error('SMTP Verbindungsfehler'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await sendCheckinReminder(BASE_CHECKIN_OPTS)
    expect(result).toBe(false)
    consoleSpy.mockRestore()
  })
})

describe('sendWeeklyDigest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('SMTP_HOST', '')
    vi.stubEnv('SMTP_USER', '')
    vi.stubEnv('SMTP_PASS', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('gibt true zurück im Dev-Modus', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const result = await sendWeeklyDigest(BASE_DIGEST_OPTS)
    expect(result).toBe(true)
    consoleSpy.mockRestore()
  })

  it('ruft sendMail mit SMTP-Konfiguration auf wenn atRiskTeams > 0', async () => {
    vi.stubEnv('SMTP_HOST', 'smtp.example.com')
    vi.stubEnv('SMTP_USER', 'user@example.com')
    vi.stubEnv('SMTP_PASS', 'geheim')
    sendMailMock.mockResolvedValue({ messageId: 'digest-id' })

    const result = await sendWeeklyDigest({ ...BASE_DIGEST_OPTS, atRiskTeams: 2 })

    expect(result).toBe(true)
    expect(sendMailMock).toHaveBeenCalledOnce()
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@company.de',
        subject: expect.stringContaining('Digest'),
      })
    )
  })
})
```

- [ ] **Schritt 2: Tests ausführen**

```bash
npx vitest run src/lib/__tests__/email.test.ts --reporter=verbose
```

Erwartete Ausgabe: 6 Tests PASS.

- [ ] **Schritt 3: Commit**

```bash
git add src/lib/__tests__/email.test.ts
git commit -m "test: add unit tests for lib/email"
```

---

## Task 8: Alle Tests ausführen und Coverage prüfen

**Files:** keine neuen Dateien

- [ ] **Schritt 1: Alle Tests auf einmal ausführen**

```bash
npx vitest run --reporter=verbose
```

Erwartete Ausgabe: alle 50 Tests in 6 Dateien PASS, kein FAIL.

- [ ] **Schritt 2: Coverage-Report generieren**

```bash
npm run test:coverage
```

Erwartete Ausgabe (Beispiel):
```
Coverage report from v8
File                    | % Stmts | % Branch | % Funcs | % Lines
------------------------|---------|----------|---------|--------
src/lib/anonymize.ts    |   ~90%  |    ~85%  |  100%   |   ~90%
src/lib/email.ts        |   ~85%  |    ~80%  |  100%   |   ~85%
src/lib/invites.ts      |   ~90%  |    ~90%  |  100%   |   ~90%
src/lib/ratelimit.ts    |   ~85%  |    ~80%  |  100%   |   ~85%
src/lib/utils.ts        |  100%   |   100%   |  100%   |  100%
src/lib/validations.ts  |  100%   |   100%   |  100%   |  100%
```

Minimum-Ziel: >80% Statement-Coverage für alle einbezogenen Dateien.

- [ ] **Schritt 3: Abschluss-Commit**

```bash
git add .
git commit -m "test: complete unit test suite for src/lib — all tests passing"
```

---

## Troubleshooting

**`Cannot find module '@/lib/prisma'`**
→ `vite-tsconfig-paths` nicht installiert oder `vitest.config.ts` nicht gefunden. Prüfen ob `npm install` erfolgreich war.

**`vi.mock` hat keinen Effekt (echter Prisma-Client wird aufgerufen)**
→ Sicherstellen dass `vi.mock(...)` vor allen Imports steht, ODER `vi.fn()`-Definitionen mit `vi.hoisted(() => ...)` wrappen (wie in `email.test.ts` gezeigt).

**Tests hängen / Timeout**
→ Vermutlich offenes Handle von `setInterval` in `ratelimit.ts`. `vitest.config.ts` um `testTimeout: 5000` ergänzen.

**`sendMailMock not called` obwohl SMTP gesetzt**
→ `vi.clearAllMocks()` im `beforeEach` löscht auch `sendMail`-Implementierung. Nach `vi.stubEnv(...)` erneut `sendMailMock.mockResolvedValue(...)` aufrufen (wie im Testcode gezeigt).
