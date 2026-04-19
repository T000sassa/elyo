# Design Spec: Maßnahmen-Hub (Prompt 2.6)

**Datum:** 2026-04-19
**Phase:** 2 – Partner-Ökosystem & Wearables
**Scope:** `Measure`-Prisma-Modell, `src/lib/measures.ts` (Katalog), `src/lib/measureEngine.ts` (Vorschlags-Logik), API-Routes `/api/measures`, UI `src/app/(app)/company/measures/page.tsx`, Cron-Erweiterung, Dashboard-Link

---

## Ziel

COMPANY_ADMINs können anstatt nur einen At-Risk-Alert zu sehen strukturierte Maßnahmen-Vorschläge aktivieren, verwerfen oder selbst erstellen. At-Risk-Teams lösen automatisch kontextbezogene Vorschläge aus; Admins steuern deren Umsetzung.

---

## Voraussetzungen

- `getAggregatedMetrics(companyId, { teamId?, threshold? })` aus `src/lib/anonymize.ts`
- Company, Team, User-Modelle in Prisma
- Auth-Session mit `user.companyId` und `user.role`
- Cron-Route `src/app/api/cron/route.ts` mit `action`-Parameter-Muster

---

## Datenmodell

### `Measure` (neue Migration)

```prisma
model Measure {
  id          String    @id @default(cuid())
  companyId   String
  company     Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  teamId      String?
  title       String
  category    String    // "workshop" | "flexibility" | "sport" | "mental" | "nutrition"
  description String
  status      String    @default("SUGGESTED")  // SUGGESTED | ACTIVE | COMPLETED | DISMISSED
  suggestedAt DateTime  @default(now())
  startedAt   DateTime?
  completedAt DateTime?
  createdBy   String    // "system" | userId

  @@index([companyId, status])
}
```

`Company`-Model bekommt `measures Measure[]` Relation.

---

## Maßnahmen-Katalog (`src/lib/measures.ts`)

Statische Templates-Map, Schlüssel ist der Trigger-Typ:

```typescript
type TriggerType = 'high_stress' | 'low_energy' | 'low_participation'

interface MeasureTemplate {
  title: string
  category: 'workshop' | 'flexibility' | 'sport' | 'mental' | 'nutrition'
  description: string
}
```

| Trigger | Templates (je 3–5) |
|---|---|
| `high_stress` | "Teamworkshop Stressmanagement", "Flexible Arbeitszeiten diese Woche", "Tägliches Stand-up verkürzen", "Achtsamkeitspause einführen (10 Min.)", "Aufgabenverteilung im Team besprechen" |
| `low_energy` | "Bewegungspause einführen (10 Min.)", "Outdoor-Meeting vorschlagen", "Gemeinsame Mittagspause aktivieren", "Ergonomie-Check am Arbeitsplatz", "Vitalitäts-Challenge starten" |
| `low_participation` | "Check-in-Reminder-Kampagne starten", "Team-Challenge aktivieren", "Anonymitätsversprechen kommunizieren", "Check-in in Team-Meeting integrieren" |

---

## Vorschlags-Engine (`src/lib/measureEngine.ts`)

### `generateSuggestionsForCompany(companyId: string): Promise<number>`

Gibt Anzahl erstellter Measures zurück.

**Algorithmus:**

1. Lade Company mit `anonymityThreshold`
2. Lade alle aktiven Teams
3. Für jedes Team: `getAggregatedMetrics(companyId, { teamId, threshold })`
4. Trigger-Regeln (nur wenn `isAboveThreshold = true`):
   - `avgStress > 7` → Trigger `high_stress`
   - `avgEnergy < 5` → Trigger `low_energy`
5. Gesamtlevel (company-weite Metrics, `teamId = undefined`):
   - `activeUserRate < 0.5` → Trigger `low_participation` (company-weite Maßnahme, `teamId = null`)
6. **Dedup-Check**: Für jeden Trigger: kein `Measure` erstellen, wenn bereits ein Measure mit gleichem `title` + `companyId` + `teamId` im Status `SUGGESTED` oder `ACTIVE` existiert, das in den letzten **14 Tagen** erstellt wurde.
7. Je Trigger: zufällig 1 Template aus der Templates-Liste auswählen (via `Math.floor(Math.random() * templates.length)`)
8. `prisma.measure.create(...)` mit `createdBy: 'system'`

### `generateSuggestionsForAllCompanies(): Promise<{ companyId: string; created: number }[]>`

Iteriert über alle Companies, ruft `generateSuggestionsForCompany` auf, gibt Ergebnisse zurück.

---

## API-Routes

### `GET /api/measures`

**Auth:** COMPANY_ADMIN

**Query-Params:**
- `status` (optional): `SUGGESTED` | `ACTIVE` | `COMPLETED` | `DISMISSED`
- Wenn kein `status`: alle Measures der Company zurückgeben

**Response:**
```json
{ "measures": [{ "id", "teamId", "title", "category", "description", "status", "suggestedAt", "startedAt", "completedAt", "createdBy", "team": { "name" } | null }] }
```

Team-Name wird per Join eingeschlossen (nullable).

### `POST /api/measures`

**Auth:** COMPANY_ADMIN

**Body:**
```typescript
{ title: string; category: string; description: string; teamId?: string }
```

Validierung mit Zod:
- `title`: min 3, max 100 Zeichen
- `category`: enum `workshop | flexibility | sport | mental | nutrition`
- `description`: min 10, max 500 Zeichen
- `teamId`: optional string

Erstellt Measure mit `status: 'ACTIVE'`, `createdBy: session.user.id`, `startedAt: new Date()`.

**Response:** `{ measure: { ...created } }` mit Status 201.

### `PATCH /api/measures/[id]`

**Auth:** COMPANY_ADMIN

**Body:**
```typescript
{ status: 'ACTIVE' | 'COMPLETED' | 'DISMISSED' }
```

Validiert: Measure gehört zur Company des Admins (sonst 403).

Status-Übergänge erlaubt:
- `SUGGESTED → ACTIVE`: setzt `startedAt = new Date()`
- `ACTIVE → COMPLETED`: setzt `completedAt = new Date()`
- `SUGGESTED → DISMISSED`: nur `status` ändern
- `ACTIVE → DISMISSED`: nur `status` ändern

Alles andere → 400 `{ error: 'invalid_transition' }`.

**Response:** `{ measure: { ...updated } }`

---

## Cron-Erweiterung

In `src/app/api/cron/route.ts` neuen Action-Handler `measure-engine` hinzufügen:

```typescript
} else if (action === 'measure-engine') {
  results['measure-engine'] = await runMeasureEngine()
}
```

`runMeasureEngine()` ruft `generateSuggestionsForAllCompanies()` auf und gibt Ergebnis zurück.

---

## UI `src/app/(app)/company/measures/page.tsx`

**Client Component** (`'use client'`)

### State

```typescript
const [activeTab, setActiveTab] = useState<'suggested' | 'active' | 'archive'>('suggested')
const [measures, setMeasures] = useState<MeasureWithTeam[]>([])
const [isLoading, setIsLoading] = useState(true)
const [showCreateForm, setShowCreateForm] = useState(false)
```

Beim Mount: `GET /api/measures` → alle Measures laden.

### UI-Struktur

**Header:**
- "Maßnahmen-Hub" (Fraunces)
- Subtext: "Steuere Interventionen basierend auf anonymisierten Wellbeing-Signalen."

**Tab-Navigation:**
- "Vorschläge" — Anzahl SUGGESTED
- "Aktiv" — Anzahl ACTIVE
- "Archiv" — COMPLETED + DISMISSED

**Suggested-Tab:**
Jede Karte zeigt:
- Kategorie-Icon (💪 Sport, 🧠 Mental, 🎓 Workshop, 🕐 Flexibilität, 🥗 Ernährung)
- Titel (fett)
- Beschreibung (grau)
- Team-Chip (wenn teamId gesetzt: Team-Name; sonst: "Gesamtes Unternehmen")
- Datum "Vorgeschlagen am ..."
- Buttons: **"Aktivieren"** (ELYO-Grün) | **"Verwerfen"** (ghost, grau)

**Active-Tab:**
Gleiche Karten-Struktur, Button: **"Abschließen"** (grün) | **"Verwerfen"** (ghost)

**Archive-Tab:**
Tabelle: Titel | Team | Status (Badge: Abgeschlossen/Verworfen) | Datum

**"+ Eigene Maßnahme"** Button (immer sichtbar, oben rechts):
- Öffnet Inline-Formular (kein Modal)
- Felder: Titel, Kategorie (Select), Beschreibung (Textarea), Team (Select, optional)
- Buttons: "Speichern" | "Abbrechen"
- `POST /api/measures` → Measure erscheint sofort in Active-Tab

### Status-Aktionen

`PATCH /api/measures/[id]` mit neuem Status → lokalen State aktualisieren (optimistic UI nicht nötig — einfaches re-fetch nach PATCH).

---

## Dashboard-Link

In `src/app/(app)/company/dashboard/page.tsx` bzw. dem At-Risk-Alert-Banner:
Link "Maßnahme vorschlagen" ändert sich zu Link zu `/company/measures`.

---

## Tests

### `src/lib/__tests__/measureEngine.test.ts`

Mock: `vi.mock('../prisma')`, `vi.mock('../anonymize')`

| Test | Was geprüft wird |
|---|---|
| `generateSuggestionsForCompany` — high_stress | Measure wird erstellt wenn avgStress > 7 |
| `generateSuggestionsForCompany` — low_energy | Measure wird erstellt wenn avgEnergy < 5 |
| `generateSuggestionsForCompany` — low_participation | Company-weite Maßnahme wenn activeUserRate < 0.5 |
| `generateSuggestionsForCompany` — dedup | Kein zweites Measure wenn gleiches title+companyId+teamId in letzten 14 Tagen |
| `generateSuggestionsForCompany` — below threshold | Keine Vorschläge wenn isAboveThreshold = false |
| `generateSuggestionsForCompany` — no triggers | Gibt 0 zurück wenn keine Trigger |

### `src/app/api/measures/__tests__/route.test.ts`

Mock: `vi.mock('@/lib/auth')`, `vi.mock('@/lib/prisma')`

| Test | Was geprüft wird |
|---|---|
| GET 401 | Nicht authentifiziert |
| GET 403 | Falsche Rolle |
| GET 200 | Gibt Measures mit Team-Namen zurück |
| POST 201 | Erstellt Measure mit ACTIVE-Status |
| POST 400 | Validierungsfehler (leerer Titel) |
| POST 401/403 | Auth |

### `src/app/api/measures/[id]/__tests__/route.test.ts`

| Test | Was geprüft wird |
|---|---|
| PATCH 200 — SUGGESTED → ACTIVE | startedAt wird gesetzt |
| PATCH 200 — ACTIVE → COMPLETED | completedAt wird gesetzt |
| PATCH 400 — invalid_transition | COMPLETED → ACTIVE |
| PATCH 403 — fremde Company | Maßnahme gehört anderer Company |
| PATCH 401 | Nicht authentifiziert |

---

## Nicht in Scope

- Partner-Verlinkung in Maßnahmen (→ Phase 3)
- E-Mail-Benachrichtigung bei neuen Vorschlägen (→ Phase 2.7 Push Notifications)
- Maßnahmen-Wirksamkeits-Tracking (kein vorher/nachher-KPI-Vergleich)
- Maßnahmen für MANAGER-Rolle (→ Phase T.1)
