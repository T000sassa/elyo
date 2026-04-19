# Partner-Ökosystem (Phase 1.4 Kern) – Design Spec

**Status:** Approved — ready for implementation plan
**Phase:** 1.4 Kern (Basis für 1.5 Stripe-Company-Billing und 3.2 Partner-Monetarisierung)
**Scope:** Data-Models + Partner-Self-Service-Registrierung + Nachweis-Upload + ELYO-Admin-Approval + Employee-Discovery-API + Seed-Replacement der bestehenden Phase-0-Mock-Partner-UI.

**Explizit nicht im Scope** (Follow-up):
- Offer-Model (mehrere Angebote pro Partner). Für den Kern nur `Partner.minimumLevel`.
- Partner-Reviews (`PartnerReview`-Model).
- Quality-Automation (Cron, Auto-Suspend bei Low-Score).
- Ranking-Algorithmus (für Phase 3.2).
- Echte Geolocation-Abfrage im Employee-App (nur Stadt-Name).

---

## Context

Phase 0.5 liefert eine vollständig designte Partner-Map-UI (`src/app/(app)/partners/page.tsx`) mit 8 hardcoded Mock-Partnern. Phase 1.4 ersetzt diese Mock-Datenbasis durch ein vollständiges Backend: Partner registrieren sich selbst, laden einen Nachweis hoch, ELYO-Admins prüfen und aktivieren.

Die Wahl für getrennte Auth-Systeme (User bleibt unverändert bis auf `ELYO_ADMIN` + `companyId` nullable, Partner bekommt eigenes Signed-JWT-Cookie) hält das Multi-Tenancy-Modell sauber: ein Partner ist keine Company und soll keine werden.

---

## Goals / Non-Goals

**Goals:**
- Partner kann sich öffentlich registrieren, Nachweis hochladen, Profil pflegen.
- ELYO-Admin hat ein dediziertes internes Tool zur Qualifizierung (`/admin/partners`).
- Employee-App zeigt ausschließlich verifizierte Partner, gelesen aus der DB.
- Neue User-Rolle `ELYO_ADMIN` mit `companyId = null` — Zod-Layer erzwingt companyId für alle anderen Rollen.

**Non-Goals:**
- Monetarisierung / Stripe-Integration für Partner (Phase 3.2).
- Multiple Offers pro Partner (Follow-up 1.4b).
- Review-Dimensions (Accessibility / Competence / Atmosphere / Relevance).
- Automatisches Suspend bei Bewertung unter Schwellwert.
- Partner-Analytics-Dashboard.

---

## Architecture

### Drei Auth-Welten

1. **NextAuth-User-Session** (existing) — `EMPLOYEE | COMPANY_MANAGER | COMPANY_ADMIN | ELYO_ADMIN`. ELYO_ADMIN darf als einzige Rolle `companyId = null` haben.
2. **Partner-Session** (neu) — Signed HS256-JWT im Cookie `elyo_partner_session`, 7 Tage Lifetime, keine NextAuth-Integration.
3. **Public / Unauthenticated** — nur `/api/partner/register`, `/api/partner/login` und statische Assets.

### Frontend-Bereiche

| Pfad | Auth | Rolle |
|---|---|---|
| `/partner/register` | public | — |
| `/partner/login` | public | — |
| `/partner/dashboard` | Partner-Session | registrierter Partner |
| `/partner/documents` | Partner-Session | registrierter Partner |
| `/admin/partners` | NextAuth | ELYO_ADMIN |
| `/admin/partners/[id]` | NextAuth | ELYO_ADMIN |
| `/(app)/partners` | NextAuth | EMPLOYEE |

### File-Struktur

```
src/lib/
  partners/
    auth.ts              # Partner-Session (JWT)
    password.ts          # bcrypt-Wrapper
    seed.ts              # 8 Seed-Partner
  admin-auth.ts          # requireElyoAdmin helper

src/app/
  partner/
    register/page.tsx
    login/page.tsx
    dashboard/page.tsx
    documents/page.tsx
  admin/
    partners/
      page.tsx           # Review-Queue
      [id]/page.tsx      # Partner-Detail + Actions
  api/
    partner/
      register/route.ts
      login/route.ts
      logout/route.ts
      me/route.ts
      documents/route.ts
    admin/
      partners/
        route.ts         # GET list
        [id]/route.ts    # PATCH status
    partners/
      route.ts           # GET public (Employee)
  (app)/
    partners/
      page.tsx           # MODIFY: real data, mock entfernen

prisma/
  schema.prisma          # MODIFY: Partner + enums + User.companyId nullable
  migrations/20260420000000_add_partner_and_elyo_admin/migration.sql
  seed.ts                # MODIFY: seed ELYO_ADMIN + 8 Partner

src/lib/__tests__/
  partners/
    auth.test.ts
    password.test.ts
  admin-auth.test.ts

src/app/api/__tests__/
  partner-register.test.ts
  partner-login.test.ts
  admin-partners.test.ts
```

---

## Data Model

### Neue Enums

```prisma
enum PartnerVerificationStatus {
  PENDING_DOCS     // registriert, kein Nachweis hochgeladen
  PENDING_REVIEW   // Nachweis da, wartet auf Admin
  VERIFIED         // aktiv, Employee-App zeigt ihn
  SUSPENDED        // temporär deaktiviert
  REJECTED         // Admin hat abgelehnt
}
```

### Role-Enum-Erweiterung

```prisma
enum Role {
  COMPANY_ADMIN
  COMPANY_MANAGER
  EMPLOYEE
  ELYO_ADMIN
}
```

### User-Model-Änderung

```prisma
model User {
  // ... bestehende Felder ...
  companyId String?                                              // war required
  company   Company? @relation(fields: [companyId], references: [id], onDelete: Cascade)
  // ...
}
```

**Constraint:** Zod-Validierung in `src/lib/validations.ts` erzwingt `companyId` für alle Rollen außer `ELYO_ADMIN`. Prüfung auch in Register-/Onboarding-Routes.

### Partner-Model

```prisma
model Partner {
  id                 String                     @id @default(cuid())

  // Auth
  email              String                     @unique
  passwordHash       String

  // Profil
  name               String
  type               String                     // "LOCAL" | "EXPERT" | "DIGITAL"
  categories         String[]                   // ["physiotherapy","fitness","mental","nutrition","sleep","msk"]
  description        String                     @db.Text

  // Ort (null = digitaler Anbieter)
  address            String?
  city               String?
  lat                Float?
  lng                Float?

  // Kontakt
  website            String?
  phone              String?

  // Level-Zugang (aus Gamification)
  minimumLevel       String                     @default("STARTER")

  // Nachweis
  nachweisUrl        String?                    // Vercel-Blob-URL, null wenn PENDING_DOCS

  // Status + Audit
  verificationStatus PartnerVerificationStatus  @default(PENDING_DOCS)
  rejectionReason    String?
  reviewedAt         DateTime?
  reviewedById       String?                    // User.id (kein FK, Audit-only)

  createdAt          DateTime                   @default(now())
  updatedAt          DateTime                   @updatedAt

  @@index([verificationStatus])
  @@index([categories])
  @@index([lat, lng])
  @@map("partners")
}
```

**Warum kein FK auf `reviewedById`:** Wenn ein ELYO_ADMIN-User gelöscht wird, soll keiner seiner historischen Reviews verloren gehen oder kaskadieren. Audit-Feld nur als String.

**Migration** (`20260420000000_add_partner_and_elyo_admin/migration.sql`):
1. `ALTER TYPE "Role" ADD VALUE 'ELYO_ADMIN'`
2. `CREATE TYPE "PartnerVerificationStatus" AS ENUM (...)`
3. `ALTER TABLE "users" ALTER COLUMN "companyId" DROP NOT NULL`
4. `CREATE TABLE "partners" (...)` + Indizes

---

## Library Modules

### `src/lib/partners/auth.ts`

```ts
export function signPartnerSession(partnerId: string): string
// HS256 JWT { sub: partnerId, iat, exp (7d) }, signed with PARTNER_SESSION_SECRET

export function verifyPartnerSession(token: string): { partnerId: string } | null
// Verify + decode. Returns null on expired / invalid / missing secret.

export async function getPartnerFromRequest(req: Request): Promise<Partner | null>
// Reads cookie 'elyo_partner_session', verifies, loads Partner from DB.
// Returns null if: no cookie, invalid JWT, partner not found, status === 'REJECTED'.

export const PARTNER_SESSION_COOKIE = 'elyo_partner_session'
export const PARTNER_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60
```

Verwendet Node-`crypto` (HMAC-SHA256), keine Lib wie `jsonwebtoken` — bestehender Pattern (siehe `googleHealth.ts` state-Signing).

### `src/lib/partners/password.ts`

```ts
export async function hashPartnerPassword(plain: string): Promise<string>
// bcryptjs, 12 rounds

export async function verifyPartnerPassword(plain: string, hash: string): Promise<boolean>
```

### `src/lib/admin-auth.ts`

```ts
export async function requireElyoAdmin(): Promise<Session>
// Wraps auth() from NextAuth. Throws 403 Response if session.user.role !== 'ELYO_ADMIN'.
// Throws 401 if no session. Returns Session on success.
```

### `src/lib/partners/seed.ts`

Exports Funktion `seedPartners(prisma)` — idempotent, erstellt 8 Beispiel-Partner mit `verificationStatus = 'VERIFIED'` und zufälligen bcrypt-Passwörtern (nicht gespeichert, Partner müssen Passwort-Reset nutzen).

---

## API Routes

### Partner-Facing (Signed-Cookie-Session)

**POST `/api/partner/register`** (public)
- Ratelimit: 3 / IP / 15 min
- Zod-Schema:
  ```ts
  { email: string().email(), password: string().min(8), name: string().min(2),
    type: enum(['LOCAL','EXPERT','DIGITAL']), categories: array(string()).min(1),
    description: string().min(40), address: string().optional(),
    city: string().optional(), website: string().url().optional(),
    phone: string().optional(), minimumLevel: enum([...levels]).default('STARTER') }
  ```
- Flow:
  1. Validate.
  2. `Partner.create({ ...data, passwordHash, verificationStatus: 'PENDING_DOCS' })` — bei unique-constraint violation → 409.
  3. `signPartnerSession` + Cookie setzen.
  4. 201 `{ partnerId }`.
- Errors: 400 validation, 409 email_taken, 429 rate_limited.

**POST `/api/partner/login`** (public)
- Ratelimit: 5 / IP / 15 min
- Verify password + prüfe Status.
- Flow: 401 wenn `!partner || !validPw || status ∈ {REJECTED, SUSPENDED}`. Sonst Cookie + 200.

**POST `/api/partner/logout`** (partner-session)
- Löscht Cookie, 204.

**GET `/api/partner/me`** (partner-session)
- Liefert `{ partner: PartnerSelfView }` (ohne `passwordHash`, mit allen anderen Fields für Dashboard).
- 401 wenn keine Session.

**POST `/api/partner/documents`** (partner-session)
- multipart/form-data, field `file`, max 5 MB, MIME ∈ {application/pdf, image/png, image/jpeg}.
- Flow:
  1. Load current Partner.
  2. Wenn `nachweisUrl` gesetzt: alten Blob via `@vercel/blob.del` löschen (best-effort, Fehler loggen).
  3. Upload neuen Blob: `partners/{partnerId}/nachweis-{timestamp}.{ext}`.
  4. Update `Partner.nachweisUrl`, setze `verificationStatus = 'PENDING_REVIEW'`.
  5. 200 `{ nachweisUrl }`.
- Errors: 400 invalid_file, 413 too_large, 401 unauthorized, 502 storage_failed.

### Admin-Facing (NextAuth + ELYO_ADMIN)

**GET `/api/admin/partners?status=PENDING_REVIEW&cursor=...`**
- Guard: `requireElyoAdmin()`.
- Filter by `status` query (default: `!REJECTED`).
- Sort: PENDING_REVIEW → VERIFIED → SUSPENDED → REJECTED, dann `createdAt DESC`.
- Pagination: 50 / page, cursor = last partner.id.
- Response: `{ partners: [...], nextCursor: string | null }`.

**PATCH `/api/admin/partners/[id]`**
- Guard: `requireElyoAdmin()`.
- Body: `{ action: 'approve' | 'reject' | 'suspend' | 'unsuspend', rejectionReason?: string }`.
- Transitions (alle anderen → 400 invalid_transition):
  - `approve`: PENDING_REVIEW → VERIFIED. Setze `reviewedAt = now`, `reviewedById = session.user.id`. Trigger E-Mail.
  - `reject`: PENDING_REVIEW → REJECTED. `rejectionReason` required. E-Mail.
  - `suspend`: VERIFIED → SUSPENDED. E-Mail.
  - `unsuspend`: SUSPENDED → VERIFIED.
- E-Mail-Versand fail-open: bei SMTP-Error 200 mit `{ warning: 'email_send_failed' }`, Status-Change bleibt.

### Employee-Facing (NextAuth)

**GET `/api/partners?category=&type=&lat=&lng=&radiusKm=&minimumLevel=&cursor=`**
- Auth: session required, role = EMPLOYEE.
- Filter: immer `verificationStatus = 'VERIFIED'`. Optionale Query-Params verfeinern.
- Distanz: Haversine-Berechnung in JS bei gegebenen `lat/lng/radiusKm`. Sortierung by Distanz, sonst by `createdAt DESC`.
- Pagination: 20 / page, cursor-basiert.
- Response-Shape `PartnerPublic`:
  ```ts
  { id, name, type, categories, description, city, lat, lng,
    website, phone, minimumLevel, verificationStatus }
  ```
- **Nicht** im Response: `email, passwordHash, nachweisUrl, rejectionReason, reviewedById`.

---

## E-Mail-Templates

Erweiterung von `src/lib/email.ts`:

- `sendPartnerApprovedEmail(partner)` — „Dein Partner-Profil ist freigeschaltet" + Link zu `/partner/dashboard`.
- `sendPartnerRejectedEmail(partner, reason)` — „Registrierung konnte nicht freigeschaltet werden" + Begründung + Link zu `/partner/login` für Korrektur.
- `sendPartnerSuspendedEmail(partner)` — „Partner-Profil vorübergehend ausgeblendet" + Support-Kontakt.

Absender-Name / E-Mail aus bestehenden Env-Vars (`SMTP_FROM`).

---

## UI Details

### `/partner/register`
- Felder: email, password (min 8, Stärke-Anzeige), name, type (Radio-Group), categories (Multi-Select-Chips aus festem Katalog), description (Textarea, Zeichen-Counter), city + address optional, website optional, phone optional, minimumLevel (Radio-Select mit Erklärung „Ab welchem Level dürfen Mitarbeiter dein Angebot nutzen?").
- Submit → POST `/api/partner/register`.
- Nach 201: Redirect zu `/partner/dashboard`.

### `/partner/dashboard`
- Status-Banner groß:
  - PENDING_DOCS → Amber „Lade jetzt einen Nachweis hoch" + CTA zu `/partner/documents`.
  - PENDING_REVIEW → Blau „Wir prüfen deinen Nachweis" + Datum Upload.
  - VERIFIED → Grün „Du bist sichtbar für Mitarbeiter".
  - SUSPENDED → Rot „Vorübergehend ausgeblendet" + Support-Hinweis.
  - REJECTED → Rot „Abgelehnt. Grund: {reason}" + CTA „Korrigieren und neu einreichen" (wechselt Status zurück zu PENDING_DOCS, löscht Nachweis).
- Profil-Card mit Quick-Edit-Link (für Kern: nur read-only view; Edit-Form ist Follow-up).

### `/partner/documents`
- File-Drop + Progress.
- Zeigt aktuellen Nachweis (Download-Link), wenn vorhanden.
- Hint: "PDF, PNG oder JPG. Max 5 MB. Beispiele: Register-Auszug, Zertifikat, Gewerbeanmeldung."

### `/admin/partners`
- Server-Component, lädt per Prisma direkt.
- Tabs mit Count-Badges: "Warten auf Prüfung", "Aktiv", "Suspendiert", "Abgelehnt".
- Tabelle: Name | Typ | Stadt | Kategorien | Status | Erstellt | „Prüfen →".

### `/admin/partners/[id]`
- Partner-Vollprofil.
- Link zu `nachweisUrl` (öffnet neuem Tab).
- Action-Bar:
  - `PENDING_REVIEW` → Buttons „Freischalten" (grün), „Ablehnen" (rot, öffnet Modal für Begründung).
  - `VERIFIED` → Button „Pausieren" (amber).
  - `SUSPENDED` → Button „Wieder aktivieren" (grün).
  - `REJECTED` → nur Read-only-Ansicht mit Begründung.
- Audit-Log: Registriert am, Nachweis hochgeladen am, Status-Wechsel mit User-ID + Datum.

### `/(app)/partners` (modifiziert)

Ersetzt die Mock-Daten-Source durch RSC-Prisma-Call (schneller als API-Hop, da gleiche Next-App):
```tsx
const partners = await prisma.partner.findMany({
  where: { verificationStatus: 'VERIFIED' },
  orderBy: { createdAt: 'desc' },
  take: 20,
})
```

Empty-State: "Bald mehr Partner in deiner Region" statt leerem Grid.

---

## Testing

### Unit-Tests

`src/lib/partners/__tests__/auth.test.ts`:
- `signPartnerSession` + `verifyPartnerSession` round-trip
- Expired token → null
- Tampered signature → null
- Missing `PARTNER_SESSION_SECRET` → throw

`src/lib/partners/__tests__/password.test.ts`:
- Hash + verify round-trip
- Wrong password → false
- Hash ≠ plain

`src/lib/__tests__/admin-auth.test.ts`:
- `requireElyoAdmin` returns session for role ELYO_ADMIN
- Throws 403 for role EMPLOYEE / MANAGER / COMPANY_ADMIN
- Throws 401 for no session

### Integration-Tests (neues Pattern)

Ort: `src/app/api/__tests__/`. Helper `createTestRequest(method, body?, cookies?)` + Vitest-global-setup `vitest.setup.ts` erweitert um Test-DB-Reset (separate Test-Schema, `vi.stubEnv('DATABASE_URL', TEST_DATABASE_URL)`).

Scope dieser Spec: 4 Integration-Tests als Beispielmuster.
- `POST /api/partner/register` happy path + email_taken
- `POST /api/partner/login` happy path + 401 wrong creds
- `PATCH /api/admin/partners/[id]` approve-path
- `GET /api/partners` only returns VERIFIED

**Fallback:** Wenn Test-DB-Setup sich im Plan-Schritt als zu aufwendig zeigt, reduzieren wir auf Unit-Tests + verschieben Integration-Tests in separaten Spec. Diese Entscheidung wird im Plan-Kontext getroffen.

---

## Error-Handling-Matrix

| Szenario | Response | Logging |
|---|---|---|
| Register: DB-Unique-Violation | 409 `email_taken` | info |
| Register: Validation Error | 400 `validation_error` + field-Details | info |
| Register: Rate-Limit | 429 `rate_limited` | warn + IP |
| Login: unbekannte Email / falsches PW | 401 `invalid_credentials` | warn + IP (anon) |
| Login: Rate-Limit | 429 `rate_limited` | warn + IP |
| Upload: > 5 MB | 413 `too_large` | info |
| Upload: falscher MIME | 400 `invalid_file` | info |
| Upload: Vercel-Blob-Fehler | 502 `storage_failed` | error + context |
| Admin-Action: invalid Transition | 400 `invalid_transition` | info |
| Admin-Action: E-Mail-Fehler | 200 + `{ warning: 'email_send_failed' }` | error — Status-Change bleibt |
| Partner-Route ohne Session | 401 `unauthorized` | — |
| Admin-Route ohne ELYO_ADMIN | 403 `forbidden` | warn + userId |
| Fehlendes `PARTNER_SESSION_SECRET` | App-Boot-Error | fatal |

---

## Env-Vars (Deployment)

| Var | Zweck |
|---|---|
| `PARTNER_SESSION_SECRET` | HMAC-Key für Partner-JWT (≥ 32 Zeichen) |
| `ELYO_INITIAL_ADMIN_EMAIL` | Seed-ELYO-Admin-Account |
| `ELYO_INITIAL_ADMIN_PASSWORD` | Seed-ELYO-Admin-Passwort |
| `SMTP_FROM` | (existing) — Partner-Mails nutzen diesen Absender |
| `BLOB_READ_WRITE_TOKEN` | (existing) — Vercel Blob |

---

## Open Questions / Future Work

- **Offer-Model** und multiple Angebote pro Partner — eigener Spec, sobald Use-Case validiert.
- **Reviews + Quality-Automation** — eigener Spec (kombiniert mit `measureEngine`-Patterns).
- **Partner-Profil-Edit** — Kern liefert Read-only-View; ein kleines Edit-Form ist Follow-up.
- **Geolocation im Employee-App** — echte Browser-Position statt hardcoded Stadt; separate Spec mit Consent-Flow.
- **Partner-Analytics-Dashboard** — kommt zusammen mit Phase 3.2 Monetarisierung.
- **Test-DB-Pipeline** — falls im Plan-Schritt als aufwendig erkannt, Integration-Tests in eigenen Spec verschieben.
