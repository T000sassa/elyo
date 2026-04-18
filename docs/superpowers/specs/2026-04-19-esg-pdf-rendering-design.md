# Design Spec: ESG PDF Rendering & Download (Prompt 2.5)

**Datum:** 2026-04-19
**Phase:** 2 – Partner-Ökosystem & Wearables
**Scope:** `EsgReportPdf.tsx` (React-PDF-Dokument), `GET /api/reports/esg/pdf` (Download-Route), `src/app/(app)/company/reports/page.tsx` (Reports-Seite mit Periode-Picker)

---

## Ziel

COMPANY_ADMINs können auf der Reports-Seite ein Jahr/Quartal wählen und einen ESG-Vitalitätsbericht als PDF herunterladen. Das PDF wird serverseitig aus den Daten von `getReportData()` gerendert.

---

## Voraussetzungen

- `getReportData()` aus `src/lib/esgReport.ts` (Phase 2.4)
- `@react-pdf/renderer` als Dependency installiert
- Auth-Session mit `user.companyId` und `user.role`

---

## Technologie

`@react-pdf/renderer` — serverseitiges Rendering via `renderToBuffer()`. Kein Puppeteer, kein Playwright (zu schwer für Vercel Edge Functions).

---

## Dateistruktur

| Datei | Action | Verantwortlichkeit |
|---|---|---|
| `src/components/reports/EsgReportPdf.tsx` | Create | React-PDF-Dokument mit 4 Seiten |
| `src/components/reports/__tests__/EsgReportPdf.test.ts` | Create | Render-Smoke-Tests |
| `src/app/api/reports/esg/pdf/route.ts` | Create | GET-Route: Auth, Validierung, renderToBuffer |
| `src/app/api/reports/esg/pdf/__tests__/route.test.ts` | Create | API-Route-Tests |
| `src/app/(app)/company/reports/page.tsx` | Replace | Reports-Seite mit Periode-Picker + Download-Button |

---

## PDF-Dokument `EsgReportPdf.tsx`

### Props

```typescript
interface EsgReportPdfProps {
  data: ReportData  // aus src/lib/esgReport.ts
}
```

### Seite 1 — Deckblatt

- Hintergrund: `#1B4D3E` (ELYO-Grün), weiße Schrift
- Vertikal zentriert:
  - "ELYO" — große Schrift (48pt), fett
  - `"Vitalitätsbericht {data.period.label}"` — 24pt
  - `data.company.name` — 18pt, leichter Abstand
  - Erstellungsdatum: `new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })` — 11pt, gedimmt

### Seite 2 — Executive Summary

**4 KPI-Boxen** in einer Reihe (flexDirection: 'row'):

| KPI | Wert | Trend-Pfeil |
|---|---|---|
| Vitalitäts-Index | `kpis.vitalityIndex` | `kpis.vitalityTrend` |
| Partizipationsrate | `${Math.round(kpis.participationRate * 100)}%` | — |
| Ø Energie | `kpis.avgEnergy` | — |
| Ø Belastung | `kpis.avgStress` | — |

Trend-Pfeil-Logik (nur für vitalityIndex):
- `vitalityTrend > 0` → `▲ +{delta}` in Grün
- `vitalityTrend < 0` → `▼ {delta}` in Rot
- `vitalityTrend === 0 || null` → `–` in Grau

**Regelbasierter Kommentar** (`generateComment(kpis: ReportData['kpis']): string`):

```typescript
function generateComment(kpis): string {
  let text: string
  if (kpis.vitalityIndex >= 7.5) {
    text = 'Sehr guter Vitalitätszustand im Berichtszeitraum.'
  } else if (kpis.vitalityIndex >= 6.0) {
    text = 'Solider Vitalitätszustand im Berichtszeitraum.'
  } else if (kpis.vitalityIndex > 0) {
    text = 'Verbesserungspotenzial beim Vitalitätszustand.'
  } else {
    text = 'Keine Daten für den Berichtszeitraum vorhanden.'
  }
  if (kpis.participationRate > 0 && kpis.participationRate < 0.6) {
    text += ' Partizipationsrate unter 60 % – Engagement der Mitarbeiter fördern.'
  }
  return text
}
```

### Seite 3 — Trend & Teams

**Trendtabelle** (12 Zeilen):

| Periode | Vitalitäts-Index | Partizipationsrate |
|---|---|---|
| `point.period` | `point.vitalityIndex ?? '–'` | `point.participationRate !== null ? ${Math.round(rate*100)}% : '–'` |

Header-Zeile: Hintergrund `#1B4D3E`, weiße Schrift.
Alternierende Zeilenhintergründe: weiß / `#f9fafb`.

**Team-Tabelle**:

| Team | Mitglieder | Partizipation | Index |
|---|---|---|---|
| `entry.teamName` | `entry.memberCount` | `${Math.round(entry.participationRate * 100)}%` | `entry.vitalityIndex` |

**Anonymisierungshinweis**: Wenn `teamBreakdown` einen Eintrag enthält, dessen `teamName` mit `"Weitere Teams"` beginnt, wird darunter angezeigt:
> *"Teams unter der Anonymisierungsschwelle wurden zusammengefasst."*

### Seite 4 — CSRD-Mapping

**Tabelle** mit 4 Spalten: ESRS-Standard | Beschreibung | ELYO-Kennzahl | Wert

- Header-Zeile: Hintergrund `#f3f4f6`, fette Schrift
- Inhalt aus `data.csrdMapping`

**Footer-Hinweis** am Ende der Seite:
> *"Methodik: Anonymisierte Aggregation via ELYO Wellbeing Engine. Daten werden nicht an Dritte weitergegeben."*

### Jede Seite — Footer

Fest unten auf jeder Seite (absolute Positionierung):
> `"Erstellt mit ELYO · Alle Daten anonymisiert und DSGVO-konform · elyo.de"`

Schriftgröße 8pt, Farbe `#9ca3af`.

### Fonts

`@react-pdf/renderer` registriert keine externen Fonts — Helvetica (Standard-PDF-Font) wird verwendet. "Fraunces" ist in PDF-Rendering nicht verfügbar ohne eigene TTF-Datei; daher Helvetica für alle Texte.

---

## API-Route `GET /api/reports/esg/pdf`

**Datei:** `src/app/api/reports/esg/pdf/route.ts`

### Auth & Validierung

Identisch mit `/api/reports/esg/data`:
- Nicht authentifiziert → 401
- `role !== 'COMPANY_ADMIN'` → 403
- `year` fehlt/NaN → 400 `{ error: 'year_required' }`
- `quarter` außerhalb 1–4 → 400 `{ error: 'invalid_quarter' }`

### Rendering

```typescript
const reportData = await getReportData(session.user.companyId, { year, quarter })
const buffer = await renderToBuffer(<EsgReportPdf data={reportData} />)
```

### Response

```typescript
return new Response(buffer, {
  headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="elyo-esg-${reportData.period.label.replace(/\s/g, '-')}.pdf"`,
  },
})
```

### Fehlerbehandlung

```typescript
} catch (err) {
  console.error('[ESG PDF] render failed:', err)
  return NextResponse.json({ error: 'render_failed' }, { status: 500 })
}
```

---

## Reports-Seite `src/app/(app)/company/reports/page.tsx`

**Client Component** (`'use client'`)

### State

```typescript
const currentYear = new Date().getFullYear()
const [year, setYear] = useState(currentYear)
const [quarter, setQuarter] = useState<number | undefined>(undefined)
const [isLoading, setIsLoading] = useState(false)
```

### UI

- Überschrift: "Berichte" (Fraunces)
- Subtext: "Lade deinen ESG-Vitalitätsbericht als PDF herunter."

**Periode-Picker:**
- Jahr-Dropdown: Optionen `[currentYear, currentYear-1, currentYear-2]`
- Quartal-Dropdown: "Ganzes Jahr" (undefined), Q1, Q2, Q3, Q4

**Download-Button:**
```typescript
function handleDownload() {
  const params = new URLSearchParams({ year: String(year) })
  if (quarter) params.set('quarter', String(quarter))
  setIsLoading(true)
  window.open(`/api/reports/esg/pdf?${params}`, '_blank')
  setTimeout(() => setIsLoading(false), 3000)
}
```

- Button-Text: "PDF herunterladen" / "Wird generiert…" (wenn `isLoading`)
- Button disabled während `isLoading`
- Stil: ELYO-Grün (`bg-[#1B4D3E]`), weiße Schrift, `rounded-lg`

---

## Tests

### `EsgReportPdf.test.ts`

Smoke-Test: prüft dass `renderToBuffer(<EsgReportPdf data={mockData} />)` keinen Fehler wirft und einen Buffer zurückgibt.

```typescript
it('renders to a non-empty PDF buffer without errors', async () => {
  const buffer = await renderToBuffer(<EsgReportPdf data={mockReportData} />)
  expect(Buffer.isBuffer(buffer)).toBe(true)
  expect(buffer.length).toBeGreaterThan(0)
})

it('generateComment returns correct text for high vitality', () => {
  // Direkter Unit-Test der reinen Funktion
})

it('generateComment appends participation warning when rate < 0.6', () => { ... })
```

`generateComment` wird aus `EsgReportPdf.tsx` exportiert für direkte Tests.

### `pdf/route.test.ts`

Mocks: `vi.mock('@/lib/esgReport')`, `vi.mock('@react-pdf/renderer')`

- 401 unauthentifiziert
- 403 falsche Rolle
- 400 fehlendes year
- 400 ungültiger quarter
- 200: `renderToBuffer` gibt Buffer zurück → Response hat `Content-Type: application/pdf`
- 500: `getReportData` wirft → `{ error: 'render_failed' }`

---

## Nicht in Scope

- PDF-Vorschau im Browser (nur Download)
- E-Mail-Versand des PDFs (→ Phase 2.7)
- Gespeicherte Reports / Report-Historie
- CSV-Export (separates Feature)
- Echte Font-Integration (Fraunces als TTF)
