# Design Spec: WearableSync Datenmodell & Prisma Migration (Prompt 2.1)

**Datum:** 2026-04-18
**Phase:** 2 – Partner-Ökosystem & Wearables
**Scope:** Datenbankschema, Verschlüsselung, Seed-Daten, Unit-Tests. Keine API, keine UI.

---

## Ziel

Datenbankfundament für Wearable-Integrationen legen: zwei neue Prisma-Modelle, Token-Verschlüsselung via `crypto.ts`, Seed-Einträge für Entwicklung und Unit-Tests für die Crypto-Schicht.

---

## Schema-Änderungen

### Neues Modell: `WearableConnection`

Speichert die OAuth-Verbindung eines Users zu einer Datenquelle.

```prisma
model WearableConnection {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  source       String   // "google_health" | "apple_health" | "oura" | "garmin" | "whoop" | "fitbit"
  accessToken  String?  // AES-256-GCM verschlüsselt via lib/crypto.ts
  refreshToken String?  // AES-256-GCM verschlüsselt via lib/crypto.ts
  expiresAt    DateTime?
  isActive     Boolean  @default(true)
  connectedAt  DateTime @default(now())

  @@unique([userId, source])
  @@map("wearable_connections")
}
```

### Neues Modell: `WearableSync`

Ein Dateneintrag pro Tag, User und Quelle. Verhindert Duplikate via Unique-Constraint.

```prisma
model WearableSync {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  source     String   // "google_health" | "apple_health" | "oura" | "garmin" | "whoop" | "fitbit"
  date       DateTime
  steps      Int?
  heartRate  Float?   // interner Feldname OK; in der UI niemals als "Herzrate" anzeigen
  sleepHours Float?
  syncedAt   DateTime @default(now())

  @@unique([userId, source, date])
  @@index([userId, date])
  @@map("wearable_syncs")
}
```

### User-Model-Erweiterung

```prisma
wearableConnections WearableConnection[]
wearableSyncs       WearableSync[]
```

---

## `src/lib/crypto.ts`

AES-256-GCM-Verschlüsselung für OAuth-Tokens ohne externe Dependencies.

**Interface:**
- `encryptToken(plain: string): string` → `"<iv_hex>:<authTag_hex>:<ciphertext_hex>"`
- `decryptToken(cipher: string): string` → Klartext

**Implementierungsdetails:**
- Key: `ENCRYPTION_KEY` env-var (32-Byte hex-String, 64 Zeichen)
- IV: 12 Byte zufällig pro Verschlüsselung (`crypto.randomBytes(12)`)
- Format: Drei colon-separated hex-Segmente in einem einzigen String
- Fehler: `decryptToken` wirft bei ungültigem Format oder falschem Key

---

## Migration

**Neue Datei:** `prisma/migrations/20260418000000_add_wearable_models/migration.sql`

Erstellt beide Tabellen mit allen Constraints und Indizes. Kann ohne laufende DB geschrieben werden; wird mit `prisma migrate deploy` angewendet sobald Supabase-Instanz konfiguriert ist.

`prisma generate` wird lokal ausgeführt um TypeScript-Types sofort verfügbar zu machen.

---

## Seed-Daten

`prisma/seed.ts` erhält 3 zusätzliche `WearableSync`-Einträge für den Test-User:

| date       | source        | steps | sleepHours | heartRate |
|------------|---------------|-------|------------|-----------|
| heute -2   | google_health | 7840  | 7.1        | 68.5      |
| heute -1   | google_health | 9210  | 6.8        | 71.2      |
| heute      | google_health | 4120  | –          | 65.0      |

---

## Unit-Tests: `src/lib/__tests__/crypto.test.ts`

| Test | Beschreibung |
|------|-------------|
| round-trip | `decryptToken(encryptToken(x)) === x` für normalen String |
| round-trip unicode | Funktioniert mit Sonderzeichen / langen Tokens |
| unique ciphertext | Gleicher Input → unterschiedliche Ciphertexte (random IV) |
| tamper detection | Modifizierter Ciphertext wirft Fehler |
| missing env key | `encryptToken` ohne `ENCRYPTION_KEY` wirft konfigurierten Fehler |

---

## Nicht in Scope (explizit ausgeschlossen)

- API-Routes für Wearables (→ Prompt 2.2)
- UI-Seiten (→ Prompt 2.3)
- Google OAuth-Flow (→ Prompt 2.2)
- Wording-Änderungen in der UI (kein Frontend-Code in diesem Schritt)
