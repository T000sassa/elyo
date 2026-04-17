# Phase 1.4 – Partner-Ökosystem Design Spec

**Datum:** 2026-04-17  
**Status:** Approved  
**Ziel:** Echtes Partner-Ökosystem mit Self-Service-Portal, Admin-Qualifizierung, Employee-Discovery und automatischer Qualitätskontrolle.

---

## Regulatorische Grundregel

Wording im gesamten Partner-Kontext:
- Niemals: „Behandlung", „Therapie", „Heilung", „Diagnose"
- Immer: „Unterstützung", „Begleitung", „Angebot", „Beratung"

---

## Architektur-Übersicht

Vier Schichten über dem bestehenden System:

1. **Schema** — 4 neue Modelle + 2 neue Rollen (`PARTNER`, `SUPER_ADMIN`) im `Role`-Enum
2. **Auth/Routing** — Middleware erweitert: `PARTNER → /partner/dashboard`, `SUPER_ADMIN → /admin/partners`. Partner nutzen `/login` wie alle anderen Rollen — kein separates Auth-System.
3. **API** — Public Registration, PARTNER-Portal-APIs, SUPER_ADMIN-APIs, Employee-Discovery, Cron
4. **UI** — Öffentliche Register-Page, Partner-Portal (4 Seiten), Admin-Tabelle, Employee-Discovery an echte API angebunden

Bestehende Route-Groups `(employee)`, `(company)` bleiben unberührt. Neues: `(partner)`, `(admin)`.

---

## Datenmodelle

### Role-Enum-Erweiterung

```prisma
enum Role {
  COMPANY_ADMIN
  COMPANY_MANAGER
  EMPLOYEE
  PARTNER       // neu
  SUPER_ADMIN   // neu
}
```

### PartnerProfile

1:1 mit `User` (role = PARTNER). Trennung: `User` hält Credentials/Auth, `PartnerProfile` hält Geschäftsdaten.

```prisma
model PartnerProfile {
  id                 String   @id @default(cuid())
  userId             String   @unique
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  name               String
  type               String   // "LOCAL" | "EXPERT" | "DIGITAL"
  categories         String[] // ["physiotherapy","fitness","mental","nutrition","sleep","msk"]
  description        String   @db.Text
  verificationStatus String   @default("PENDING") // "PENDING" | "VERIFIED" | "SUSPENDED"
  qualityScore       Float    @default(0)
  reviewCount        Int      @default(0)
  badReviewStreak    Int      @default(0) // aufeinanderfolgende Reviews mit score < 2.5

  // Kontakt
  website            String?
  contactEmail       String
  phone              String?

  // Lokation (null für DIGITAL)
  address            String?
  city               String?
  lat                Float?
  lng                Float?

  offers             Offer[]
  reviews            PartnerReview[]
  documents          PartnerDocument[]

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@map("partner_profiles")
}
```

### Offer

```prisma
model Offer {
  id           String         @id @default(cuid())
  partnerId    String
  partner      PartnerProfile @relation(fields: [partnerId], references: [id], onDelete: Cascade)

  title        String
  description  String         @db.Text
  priceType    String         // "FREE" | "PAID" | "ELYO_PRIVILEGE"
  price        Float?
  minimumLevel String         @default("STARTER") // "STARTER"|"BRONZE"|"SILVER"|"GOLD"|"PLATINUM"
  bookingUrl   String?
  isActive     Boolean        @default(true)

  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  @@index([partnerId])
  @@map("offers")
}
```

### PartnerReview

```prisma
model PartnerReview {
  id            String         @id @default(cuid())
  partnerId     String
  partner       PartnerProfile @relation(fields: [partnerId], references: [id], onDelete: Cascade)
  userId        String
  user          User           @relation(fields: [userId], references: [id])

  // Bewertungsdimensionen (1–5)
  accessibility Float
  competence    Float
  atmosphere    Float
  relevance     Float
  overall       Float          // Durchschnitt der 4 Dimensionen, server-side berechnet
  textFeedback  String?        @db.Text

  createdAt     DateTime       @default(now())

  @@unique([userId, partnerId]) // ein Review pro Nutzer pro Partner
  @@index([partnerId])
  @@map("partner_reviews")
}
```

### PartnerDocument

```prisma
model PartnerDocument {
  id         String         @id @default(cuid())
  partnerId  String
  partner    PartnerProfile @relation(fields: [partnerId], references: [id], onDelete: Cascade)

  type       String         // "QUALIFICATION" | "CERTIFICATE" | "OTHER"
  fileName   String
  blobUrl    String
  uploadedAt DateTime       @default(now())

  @@index([partnerId])
  @@map("partner_documents")
}
```

### User-Model Erweiterung

```prisma
// in User model, after existing relations:
partnerProfile PartnerProfile?
partnerReviews PartnerReview[]
```

---

## API-Design

### Public (rate-limited, kein Auth)

| Method | Path | Beschreibung |
|--------|------|--------------|
| POST | `/api/partner/register` | User (role=PARTNER) + PartnerProfile anlegen. Rate-limit: 3 req / 15 min per IP. Erstellt keinen Offer — das folgt im Portal. |

### PARTNER-geschützt

| Method | Path | Beschreibung |
|--------|------|--------------|
| GET | `/api/partner/profile` | Eigenes Profil laden |
| PATCH | `/api/partner/profile` | Name, Beschreibung, Kontakt, Kategorien bearbeiten |
| GET | `/api/partner/offers` | Eigene Angebote auflisten |
| POST | `/api/partner/offers` | Neues Angebot anlegen |
| PATCH | `/api/partner/offers/[id]` | Angebot bearbeiten oder pausieren (`isActive`) |
| DELETE | `/api/partner/offers/[id]` | Angebot löschen |
| GET | `/api/partner/reviews` | Eigene Reviews lesen (Reviewer-Name anonymisiert: „Nutzer #4f2a") |
| POST | `/api/partner/documents` | Dokument via Vercel Blob hochladen (max. 10 MB, PDF/JPG/PNG) |
| GET | `/api/partner/documents` | Eigene Dokumente auflisten |

### EMPLOYEE-geschützt

| Method | Path | Beschreibung |
|--------|------|--------------|
| GET | `/api/partners` | Discovery: Query-Params `type`, `categories` (kommasepariert), `city`. Gibt nur `VERIFIED`-Partner zurück. Includes aktive Offers. |
| GET | `/api/partners/[id]` | Partner-Detail + alle aktiven Angebote + aggregierte Review-Scores |
| POST | `/api/employee/partner-reviews` | Review einreichen (body: `partnerId`, 4 Dimensionen, optionaler Text). Ruft `recalculateScore()` auf. Awards +3 Punkte via `awardPoints('partner_review')`. |

### SUPER_ADMIN-geschützt

| Method | Path | Beschreibung |
|--------|------|--------------|
| GET | `/api/admin/partners` | Alle Partner, filterbar nach `status` (PENDING/VERIFIED/SUSPENDED). Includes Dokumente. |
| PATCH | `/api/admin/partners/[id]` | Status setzen: `{ status: "VERIFIED" \| "SUSPENDED", note?: string }`. Sendet E-Mail an Partner via `sendPartnerStatusEmail()`. |

### Cron (Vercel Cron, täglich 02:00 UTC)

| Method | Path | Beschreibung |
|--------|------|--------------|
| GET | `/api/cron/partner-quality-check` | Prüft alle VERIFIED-Partner: Score < 2.5 → E-Mail an ELYO-Admin (`SUPER_ADMIN`-User). `badReviewStreak` ≥ 3 → Status = SUSPENDED + E-Mail an Partner und Admin. |

---

## Qualitäts-Logik (`src/lib/partnerQuality.ts`)

```typescript
// Aufgerufen synchron nach jedem neuen Review
recalculateScore(partnerId: string): Promise<void>
  → overall = (accessibility + competence + atmosphere + relevance) / 4
  → qualityScore = Ø aller `overall`-Werte dieses Partners
  → reviewCount aktualisieren
  → badReviewStreak: wenn letzter overall < 2.5 → streak++, sonst → streak = 0
  → prisma.partnerProfile.update(...)

// Aufgerufen vom Cron
checkAndSuspendLowQualityPartners(): Promise<{ suspended: string[]; flagged: string[] }>
  → findet alle VERIFIED-Partner mit badReviewStreak >= 3 → suspended
  → findet alle VERIFIED-Partner mit qualityScore < 2.5 und streak < 3 → flagged
  → für suspended: Status = SUSPENDED, E-Mail an Partner + Admin
  → für flagged: E-Mail an Admin (kein Auto-Suspend)
```

---

## UI-Seiten

### Öffentlich: `/partner/register`

3-Step-Form (kein Page-Reload):
1. **Profil** — Name, Typ (LOCAL/EXPERT/DIGITAL), Kategorien (Multi-Select), Beschreibung, Kontakt, Stadt/Adresse (optional für DIGITAL)
2. **Account** — E-Mail, Passwort (mit Stärke-Anzeige)
3. **Dokumente** — 1–3 Dateien via Vercel Blob, Typ-Auswahl (QUALIFICATION/CERTIFICATE/OTHER)

Nach Submit: Auto-Login via `signIn('credentials', ...)` → Redirect zu `/partner/dashboard` mit Pending-Banner.

### Partner-Portal `(partner)`

**`/partner/dashboard`**
- Verifikations-Status-Banner (PENDING: gelb, VERIFIED: grün, SUSPENDED: rot)
- KPI-Kacheln: Anzahl Angebote, Ø Rating, Review-Anzahl
- Letzte 3 Reviews (anonymisiert)
- Quick-Actions: „Angebot erstellen", „Profil bearbeiten"

**`/partner/profile`**
- Inline-Edit-Form für alle Profilfelder
- Dokumente-Sektion: Upload + Liste bestehender Dokumente

**`/partner/offers`**
- Tabelle aller Angebote mit Status-Toggle (isActive)
- „Neues Angebot"-Button → Inline-Form oder Modal

**`/partner/reviews`**
- Tabelle: Datum, Ø Score, Dimensionen, Freitext (Reviewer anonymisiert)

### Admin `(admin)`

**`/admin/partners`**
- Filter-Tabs: PENDING / VERIFIED / SUSPENDED
- Tabelle: Name, Typ, Stadt, Kategorien, Score, Datum, Dokumente-Links
- Pro Zeile: „Freischalten"- und „Ablehnen"-Button mit optionalem Kommentar-Feld
- Bestätigung vor Status-Änderung (Modal)

### Employee (bestehend, an echte API angebunden)

**`/employee/partners`** (bisher Mock)
- Fetch-Call zu `GET /api/partners` ersetzt hardcoded MOCK_PARTNERS
- Level-Check gegen `Offer.minimumLevel` via bestehende `calcLevel()`-Logik
- „Review schreiben"-Button öffnet Sheet mit 4 Slider-Dimensionen + optionalem Text
- Für nicht-verifizierte Partner: kein „Vorteil nutzen"-Button

---

## Middleware-Ergänzung

```typescript
// src/middleware.ts — bestehende Logik erweitern:
if (role === 'PARTNER') redirect('/partner/dashboard')
if (role === 'SUPER_ADMIN') redirect('/admin/partners')

// Route-Schutz:
/partner/* → nur PARTNER
/admin/*   → nur SUPER_ADMIN
```

---

## Validierungs-Schemas (`src/lib/validations.ts`)

Neue Exports:
- `PartnerRegisterSchema` — Profil + Account-Felder
- `OfferSchema` — title, description, priceType, minimumLevel, bookingUrl?
- `PartnerReviewSchema` — partnerId, accessibility, competence, atmosphere, relevance (je 1–5), textFeedback?
- `AdminStatusSchema` — status enum, note?

---

## E-Mail-Templates (`src/lib/email.ts`)

Neue Funktionen:
- `sendPartnerStatusEmail({ to, partnerName, status, note? })` — „Dein ELYO-Partnerprofil wurde freigeschalten / abgelehnt"
- `sendPartnerQualityAlertEmail({ to, partnerName, score })` — an SUPER_ADMIN bei Score < 2.5

---

## Nicht in Phase 1.4 (bewusst ausgelassen)

- Geolocation/Karten-Integration (Partner werden nach Stadt gefiltert, nicht per Koordinaten)
- Native Buchung (Buchungen öffnen `bookingUrl` im externen Browser)
- Partner-Monetarisierung / Stripe für Partner (Phase 3)
- Terra/Wearables (Phase 2)
