# Design: Test-Infrastruktur (Unit Tests)

**Datum:** 2026-04-16  
**Scope:** Unit-Tests für alle `src/lib/`-Utilities  
**Framework:** Vitest + `@vitest/coverage-v8`  
**Ansatz:** Inline-Mocking mit `vi.mock`

---

## Ziel

Alle testbaren Businesslogik-Module in `src/lib/` werden mit Unit-Tests abgedeckt. Kein Refactoring des Produktionscodes — einzige Ausnahme: `currentPeriodKey()` in `anonymize.ts` wird exportiert, damit die Wochenberechnung direkt testbar ist.

---

## Neue Dateien & Änderungen

```
elyo-core/
├── vitest.config.ts           # neu
├── vitest.setup.ts            # neu
├── package.json               # +devDeps, +scripts
└── src/lib/__tests__/
    ├── utils.test.ts
    ├── validations.test.ts
    ├── ratelimit.test.ts
    ├── anonymize.test.ts
    ├── invites.test.ts
    └── email.test.ts
```

---

## Konfiguration

### `vitest.config.ts`

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
    },
  },
})
```

### `vitest.setup.ts`

Globale Env-Variablen für Tests setzen (z.B. `NEXTAUTH_SECRET`), damit Module ohne Fehler importierbar sind.

### `package.json` — neue Scripts

```json
"test":          "vitest",
"test:run":      "vitest run",
"test:coverage": "vitest run --coverage"
```

### Neue devDependencies

- `vitest`
- `@vitest/coverage-v8`
- `vite-tsconfig-paths`

---

## Mock-Strategien

### Prisma (`anonymize.ts`, `invites.ts`)

```ts
vi.mock('@/lib/prisma', () => ({
  prisma: {
    wellbeingEntry: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      count: vi.fn(),
    },
    user: { count: vi.fn() },
    inviteToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))
```

Pro Test wird `mockResolvedValue(...)` auf den jeweiligen `vi.fn()` gesetzt.

### Nodemailer (`email.ts`)

```ts
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({}),
    })),
  },
}))
```

SMTP-Env-Vars werden per `vi.stubEnv()` gesetzt/entfernt.

---

## Testabdeckung pro Modul

### `utils.test.ts` — keine Mocks

| Testfall | Beschreibung |
|---|---|
| `cn()` mit Basis-Klassen | Gibt zusammengeführten String zurück |
| `cn()` mit Tailwind-Konflikt | `px-2 px-4` → `px-4` |
| `cn()` mit leerem Input | Gibt leeren String zurück |
| `cn()` mit `undefined`/`false` | Ignoriert Falsy-Werte |

---

### `validations.test.ts` — keine Mocks

| Schema | Testfälle |
|---|---|
| `LoginSchema` | Valide Daten; zu kurzes Passwort; ungültige E-Mail |
| `RegisterSchema` | Valide Daten; `companyName` < 2 Zeichen; `name` < 2 Zeichen; Passwort < 8 Zeichen |
| `CheckinSchema` | Werte 1–10 valide; Wert 0 scheitert; Wert 11 scheitert; Note optional; Note > 1000 Zeichen scheitert |
| `InviteSchema` | Gültige Rollen; ungültige Rolle scheitert; Default `"EMPLOYEE"` ohne Rollenangabe |

---

### `ratelimit.test.ts` — `vi.spyOn(Date, 'now')`

| Testfall | Beschreibung |
|---|---|
| Erste Anfrage | `allowed: true`, `remaining: limit - 1` |
| Limit erreicht | `allowed: false`, `remaining: 0` |
| Fenster-Reset | Nach `windowMs` ist wieder `allowed: true` |
| `getClientIP()` mit `x-forwarded-for` | Gibt erste IP zurück |
| `getClientIP()` mit `x-real-ip` | Gibt IP zurück |
| `getClientIP()` ohne Header | Gibt `"unknown"` zurück |

---

### `anonymize.test.ts` — `vi.mock('@/lib/prisma')`

| Funktion | Testfälle |
|---|---|
| `getAggregatedMetrics` | Count < Threshold → alle 0, `isAboveThreshold: false` |
| `getAggregatedMetrics` | Count ≥ Threshold → korrekte Rundung auf 1 Dezimalstelle |
| `getAggregatedMetrics` | Aggregat mit `null`-Werten → 0 statt NaN |
| `getTrendData` | Perioden unter Threshold werden gefiltert |
| `getTrendData` | Rückgabe ist aufsteigend sortiert (`.reverse()`) |
| `getContinuityData` | `totalEmployees` < Threshold → Early Return, `isAboveThreshold: false` |
| `getContinuityData` | Continuity-Rate-Berechnung: `continuousUsers / totalEmployees * 100` gerundet |
| `currentPeriodKey()` | Format `YYYY-Www` mit zweistelliger Wochennummer |

---

### `invites.test.ts` — `vi.mock('@/lib/prisma')`

| Funktion | Testfälle |
|---|---|
| `generateToken()` | Gibt 64 Hex-Zeichen zurück |
| `generateToken()` | Zwei Aufrufe → unterschiedliche Werte |
| `verifyInviteToken()` | Token nicht gefunden → `{ valid: false }` |
| `verifyInviteToken()` | `usedAt` gesetzt → `{ valid: false, error: "bereits verwendet" }` |
| `verifyInviteToken()` | `expiresAt` in Vergangenheit → `{ valid: false, error: "abgelaufen" }` |
| `verifyInviteToken()` | Gültiger Token → `{ valid: true, invite }` |

---

### `email.test.ts` — `vi.mock('nodemailer')`

| Funktion | Testfälle |
|---|---|
| `sendCheckinReminder` | Ohne SMTP-Env-Vars → `console.log`, gibt `true` zurück |
| `sendCheckinReminder` | Mit SMTP-Vars → `sendMail` wird mit korrektem `to`/`subject` aufgerufen |
| `sendCheckinReminder` | `sendMail` wirft Fehler → gibt `false` zurück |
| `sendWeeklyDigest` | Ohne SMTP-Env-Vars → gibt `true` zurück |
| `sendWeeklyDigest` | `atRiskTeams > 0` → Warnungs-HTML im Subject/Body |

---

## Abgrenzungen

**Nicht getestet in dieser Iteration:**
- `lib/auth.ts` — NextAuth-Konfiguration ohne testbare Businesslogik
- `lib/prisma.ts` — reine Client-Initialisierung
- API-Routen (`src/app/api/`) — gehören zu Integration-Tests (Priorität 2)
- React-Komponenten — gehören zu Komponenten-Tests (Priorität 3)

**Keine CI-Konfiguration** in diesem Spec — GitHub Actions-Integration ist separater Schritt.
