# WearableSync Datenmodell & Prisma Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Datenbankfundament für Wearable-Integrationen legen: zwei neue Prisma-Modelle, AES-256-GCM Token-Verschlüsselung, Seed-Daten und Unit-Tests. Keine API, keine UI.

**Architecture:** `WearableConnection` speichert OAuth-Tokens (verschlüsselt) pro User+Quelle. `WearableSync` speichert tägliche Aktivitätsdaten mit Unique-Constraint auf `[userId, source, date]`. `crypto.ts` kapselt die Verschlüsselung vollständig ohne externe Dependencies.

**Tech Stack:** TypeScript, Prisma ORM, Node.js `crypto` (built-in), Vitest

---

## File Map

| Aktion   | Datei                                                                              | Verantwortung                                    |
|----------|------------------------------------------------------------------------------------|--------------------------------------------------|
| Modify   | `prisma/schema.prisma`                                                             | Neue Modelle + User-Relations                    |
| Create   | `prisma/migrations/20260418000000_add_wearable_models/migration.sql`               | SQL für beide Tabellen + Indizes + FK-Constraints|
| Create   | `src/lib/crypto.ts`                                                                | encryptToken / decryptToken (AES-256-GCM)        |
| Create   | `src/lib/__tests__/crypto.test.ts`                                                 | Unit-Tests für crypto.ts                         |
| Modify   | `prisma/seed.ts`                                                                   | 3 Mock-WearableSync-Einträge für Test-User       |
| Modify   | `.env.example`                                                                     | ENCRYPTION_KEY Variable dokumentieren            |

---

## Task 1: Schema erweitern

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Schritt 1: WearableConnection und WearableSync Modelle ans Ende von schema.prisma anhängen**

Füge nach dem `PointTransaction`-Block (Zeile ~323) ein:

```prisma
// ── WearableConnection ────────────────────────────────────────────────────────

model WearableConnection {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  source       String   // "google_health" | "apple_health" | "oura" | "garmin" | "whoop" | "fitbit"
  accessToken  String?  // AES-256-GCM encrypted via lib/crypto.ts
  refreshToken String?  // AES-256-GCM encrypted via lib/crypto.ts
  expiresAt    DateTime?
  isActive     Boolean  @default(true)
  connectedAt  DateTime @default(now())

  @@unique([userId, source])
  @@map("wearable_connections")
}

// ── WearableSync ──────────────────────────────────────────────────────────────

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

- [ ] **Schritt 2: User-Modell um Relations erweitern**

Im `User`-Block (nach `pointTransactions PointTransaction[]`, vor `accounts Account[]`) ergänzen:

```prisma
  wearableConnections WearableConnection[]
  wearableSyncs       WearableSync[]
```

- [ ] **Schritt 3: prisma generate ausführen**

```bash
npx prisma generate
```

Erwartete Ausgabe: `✔ Generated Prisma Client` ohne Fehler. TypeScript-Types für `WearableConnection` und `WearableSync` sind jetzt verfügbar.

- [ ] **Schritt 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add WearableConnection and WearableSync models to schema"
```

---

## Task 2: Migration SQL schreiben

**Files:**
- Create: `prisma/migrations/20260418000000_add_wearable_models/migration.sql`

- [ ] **Schritt 1: Migrations-Verzeichnis anlegen und SQL-Datei erstellen**

Erstelle `prisma/migrations/20260418000000_add_wearable_models/migration.sql` mit folgendem Inhalt:

```sql
CREATE TABLE "wearable_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wearable_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wearable_connections_userId_source_key" ON "wearable_connections"("userId", "source");

CREATE TABLE "wearable_syncs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "steps" INTEGER,
    "heartRate" DOUBLE PRECISION,
    "sleepHours" DOUBLE PRECISION,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wearable_syncs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wearable_syncs_userId_source_date_key" ON "wearable_syncs"("userId", "source", "date");

CREATE INDEX "wearable_syncs_userId_date_idx" ON "wearable_syncs"("userId", "date");

ALTER TABLE "wearable_connections" ADD CONSTRAINT "wearable_connections_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wearable_syncs" ADD CONSTRAINT "wearable_syncs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Schritt 2: Commit**

```bash
git add prisma/migrations/20260418000000_add_wearable_models/migration.sql
git commit -m "feat: add migration SQL for wearable_connections and wearable_syncs tables"
```

---

## Task 3: crypto.ts implementieren (TDD)

**Files:**
- Create: `src/lib/__tests__/crypto.test.ts`
- Create: `src/lib/crypto.ts`

- [ ] **Schritt 1: Failing Tests schreiben**

Erstelle `src/lib/__tests__/crypto.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// crypto.ts wird erst in Task 3 Schritt 3 erstellt – bis dahin schlagen diese Tests fehl
import { encryptToken, decryptToken } from '../crypto'

const VALID_KEY = 'a'.repeat(64) // 32 Byte als 64-Zeichen-Hex

describe('encryptToken / decryptToken', () => {
  const originalKey = process.env.ENCRYPTION_KEY

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = VALID_KEY
  })

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey
  })

  it('round-trip: decryptToken(encryptToken(x)) === x', () => {
    const plain = 'my-secret-oauth-token'
    expect(decryptToken(encryptToken(plain))).toBe(plain)
  })

  it('round-trip: funktioniert mit langen Tokens und Sonderzeichen', () => {
    const plain = 'ya29.A0ARrdaM-Ü_ö-ä/+==longtoken' + 'x'.repeat(200)
    expect(decryptToken(encryptToken(plain))).toBe(plain)
  })

  it('gleicher Input erzeugt unterschiedliche Ciphertexte (random IV)', () => {
    const plain = 'same-input'
    const c1 = encryptToken(plain)
    const c2 = encryptToken(plain)
    expect(c1).not.toBe(c2)
  })

  it('ciphertext hat Format iv:authTag:ciphertext (3 Segmente)', () => {
    const cipher = encryptToken('test')
    const parts = cipher.split(':')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toMatch(/^[0-9a-f]+$/) // hex IV
    expect(parts[1]).toMatch(/^[0-9a-f]+$/) // hex authTag
    expect(parts[2]).toMatch(/^[0-9a-f]+$/) // hex ciphertext
  })

  it('wirft bei manipuliertem Ciphertext', () => {
    const cipher = encryptToken('test')
    const parts = cipher.split(':')
    parts[2] = parts[2].slice(0, -2) + 'ff' // letzten Bytes verfälschen
    expect(() => decryptToken(parts.join(':'))).toThrow()
  })

  it('wirft bei falschem Format (zu wenige Segmente)', () => {
    expect(() => decryptToken('invalid-no-colons')).toThrow()
  })

  it('wirft wenn ENCRYPTION_KEY nicht gesetzt ist', () => {
    delete process.env.ENCRYPTION_KEY
    expect(() => encryptToken('test')).toThrow('ENCRYPTION_KEY')
  })
})
```

- [ ] **Schritt 2: Tests fehlschlagen lassen**

```bash
npx vitest run src/lib/__tests__/crypto.test.ts
```

Erwartete Ausgabe: Fehler wie `Cannot find module '../crypto'` – das ist korrekt.

- [ ] **Schritt 3: crypto.ts implementieren**

Erstelle `src/lib/crypto.ts`:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex) throw new Error('ENCRYPTION_KEY environment variable is not set')
  return Buffer.from(hex, 'hex')
}

export function encryptToken(plain: string): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptToken(cipher: string): string {
  const parts = cipher.split(':')
  if (parts.length !== 3) throw new Error('Invalid cipher format')
  const [ivHex, authTagHex, dataHex] = parts
  const key = getKey()
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(data).toString('utf8') + decipher.final('utf8')
}
```

- [ ] **Schritt 4: Tests laufen lassen**

```bash
npx vitest run src/lib/__tests__/crypto.test.ts
```

Erwartete Ausgabe: `7 passed` – alle Tests grün.

- [ ] **Schritt 5: Commit**

```bash
git add src/lib/crypto.ts src/lib/__tests__/crypto.test.ts
git commit -m "feat: add AES-256-GCM token encryption in crypto.ts"
```

---

## Task 4: .env.example erweitern

**Files:**
- Modify: `.env.example`

- [ ] **Schritt 1: ENCRYPTION_KEY zur .env.example hinzufügen**

Ergänze am Ende von `.env.example`:

```
ENCRYPTION_KEY="generate-with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
```

- [ ] **Schritt 2: Commit**

```bash
git add .env.example
git commit -m "docs: add ENCRYPTION_KEY to .env.example"
```

---

## Task 5: Seed-Daten erweitern

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Schritt 1: WearableSync-Einträge für den ersten Employee hinzufügen**

Füge am Ende der `main()`-Funktion, vor dem abschließenden `console.log("\n🎉 Seed complete!")`, folgenden Block ein:

```typescript
  // WearableSync mock data for first employee
  const firstEmployee = allEmployees[0]
  if (firstEmployee) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const syncEntries = [
      { daysAgo: 2, steps: 7840, sleepHours: 7.1, heartRate: 68.5 },
      { daysAgo: 1, steps: 9210, sleepHours: 6.8, heartRate: 71.2 },
      { daysAgo: 0, steps: 4120, sleepHours: null, heartRate: 65.0 },
    ]
    for (const entry of syncEntries) {
      const date = new Date(today)
      date.setDate(date.getDate() - entry.daysAgo)
      await prisma.wearableSync.upsert({
        where: { userId_source_date: { userId: firstEmployee.id, source: 'google_health', date } },
        update: {},
        create: {
          userId: firstEmployee.id,
          source: 'google_health',
          date,
          steps: entry.steps,
          sleepHours: entry.sleepHours,
          heartRate: entry.heartRate,
        },
      })
    }
    console.log('✅ 3 WearableSync entries created for first employee')
  }
```

- [ ] **Schritt 2: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: add mock WearableSync seed entries for first employee"
```

---

## Task 6: Gesamte Test-Suite prüfen

- [ ] **Schritt 1: Alle Tests ausführen**

```bash
npx vitest run
```

Erwartete Ausgabe: Alle bestehenden Tests weiterhin grün, `crypto.test.ts` 7 passed. Keine Regressions.

- [ ] **Schritt 2: Coverage prüfen**

```bash
npx vitest run --coverage
```

Erwartung: `src/lib/crypto.ts` erscheint in der Coverage-Tabelle mit hoher Abdeckung (alle Branches getestet).
