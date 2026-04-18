# Design Spec: ESG PDF Daten-Aggregation Backend (Prompt 2.4)

**Datum:** 2026-04-19
**Phase:** 2 – Partner-Ökosystem & Wearables
**Scope:** `src/lib/esgReport.ts` + `GET /api/reports/esg/data` — reine Backend-Logik, kein PDF-Rendering

---

## Ziel

Einen Daten-Aggregations-Service implementieren, der auf Basis von `WellbeingEntry`-Daten einen strukturierten ESG-Report für einen definierten Zeitraum (Jahr oder Quartal) liefert. Die Daten werden vom PDF-Renderer (Phase 2.5) und direkt über die API genutzt.

---

## Voraussetzungen

- `WellbeingEntry`-Modell mit `score`, `mood`, `stress`, `energy`, `createdAt`, `userId`, `companyId`
- `Team`-Modell mit `companyId`
- `Company`-Modell mit `anonymityThreshold`, `industry`
- `User`-Modell mit `teamId`, `companyId`, `role`, `isActive`
- `MIN_GROUP_SIZE` aus `src/lib/anonymize.ts`

---

## Architektur-Entscheidung

`esgReport.ts` schreibt eigene date-range-basierte Prisma-Queries (kein Aufruf von `getAggregatedMetrics()` / `getTrendData()` aus `anonymize.ts`). Importiert nur `MIN_GROUP_SIZE` als Fallback-Konstante. Begründung: `anonymize.ts` ist auf wöchentliche `periodKey`-Logik ausgerichtet; ESG-Reports brauchen Monats-/Quartals-Ranges — andere Granularität, anderer Scope.

---

## Period-Logik

### Datums-Grenzen

```typescript
function getPeriodBounds(period: { year: number; quarter?: number }): {
  from: Date;
  to: Date;
  label: string;
} 
```

| Input | from | to | label |
|---|---|---|---|
| `{ year: 2026 }` | 2026-01-01 00:00:00 | 2026-12-31 23:59:59 | `"2026"` |
| `{ year: 2026, quarter: 1 }` | 2026-01-01 00:00:00 | 2026-03-31 23:59:59 | `"Q1 2026"` |
| `{ year: 2026, quarter: 2 }` | 2026-04-01 00:00:00 | 2026-06-30 23:59:59 | `"Q2 2026"` |
| `{ year: 2026, quarter: 3 }` | 2026-07-01 00:00:00 | 2026-09-30 23:59:59 | `"Q3 2026"` |
| `{ year: 2026, quarter: 4 }` | 2026-10-01 00:00:00 | 2026-12-31 23:59:59 | `"Q4 2026"` |

### Vorperiode (für `vitalityTrend`)

Gleichlange Periode unmittelbar vor `from`:
- Jahresreport: vorheriges Kalenderjahr
- Quartalsreport: vorheriges Quartal (Q1 → Q4 des Vorjahres)

---

## `getReportData()`

```typescript
export async function getReportData(
  companyId: string,
  period: { year: number; quarter?: number }
): Promise<ReportData>
```

### Rückgabe-Typ

```typescript
export interface ReportData {
  company: {
    name: string;
    employeeCount: number;
    industry: string | null;
  };
  period: {
    label: string;
    from: Date;
    to: Date;
  };
  kpis: {
    vitalityIndex: number;
    vitalityTrend: number;
    activeParticipants: number;
    participationRate: number;
    avgEnergy: number;
    avgMood: number;
    avgStress: number;
    checkinsTotal: number;
  };
  teamBreakdown: TeamBreakdownEntry[];
  trendData: TrendDataPoint[];
  csrdMapping: CsrdMappingEntry[];
}

export interface TeamBreakdownEntry {
  teamName: string;
  participationRate: number;
  vitalityIndex: number;
  memberCount: number;
}

export interface TrendDataPoint {
  period: string;
  vitalityIndex: number | null;  // null wenn unter anonymityThreshold
  participationRate: number | null;
}

export interface CsrdMappingEntry {
  standard: string;
  description: string;
  elyoMetric: string;
  value: string;
}
```

### KPI-Berechnung

Alle `WellbeingEntry`-Zeilen mit `companyId` und `createdAt` in `[from, to]`:

| KPI | Berechnung |
|---|---|
| `vitalityIndex` | `AVG(score)`, gerundet auf 1 Dezimalstelle |
| `vitalityTrend` | `vitalityIndex` − `AVG(score)` der Vorperiode, gerundet auf 1 Dezimalstelle |
| `activeParticipants` | `COUNT(DISTINCT userId)` |
| `participationRate` | `activeParticipants / employeeCount`, gerundet auf 2 Dezimalstellen |
| `avgEnergy` | `AVG(energy)`, gerundet auf 1 Dezimalstelle |
| `avgMood` | `AVG(mood)`, gerundet auf 1 Dezimalstelle |
| `avgStress` | `AVG(stress)`, gerundet auf 1 Dezimalstelle |
| `checkinsTotal` | `COUNT(id)` |

`employeeCount` = `prisma.user.count({ where: { companyId, role: 'EMPLOYEE', isActive: true } })`

Bei 0 Einträgen in der Periode: alle numerischen KPIs = 0, `vitalityTrend` = 0.

### teamBreakdown

1. Alle Teams der Company laden (`prisma.team.findMany({ where: { companyId } })`)
2. Pro Team: alle Einträge im Zeitraum aggregieren → `responseCount`, `avgScore`, `memberCount`
3. Teams mit `responseCount >= anonymityThreshold` → einzelner Eintrag
4. Teams mit `responseCount < anonymityThreshold` (inkl. Teams mit 0 Einträgen) → Sammel-Eintrag:
   ```
   {
     teamName: `Weitere Teams (n<${threshold})`,
     participationRate: aggregiert aus allen betroffenen Teams,
     vitalityIndex: aggregiert (oder 0 wenn alle 0 Einträge),
     memberCount: Summe aller betroffenen Team-Mitglieder,
   }
   ```
   Dieser Eintrag wird **immer** hinzugefügt (auch wenn nur 1 Team betroffen).

`anonymityThreshold` kommt aus `company.anonymityThreshold` (DB), Fallback auf `MIN_GROUP_SIZE`.

### trendData

12 Datenpunkte, rückwärts bis `to`:

- **Jahresreport**: 12 Monats-Punkte. Periode `i` = Monat `i` des angegebenen Jahres (Jan bis Dez).
- **Quartalsreport**: 12 Wochen-Punkte. Periode `i` = ISO-Woche, beginnend bei `to - 11 Wochen`.

Pro Datenpunkt:
- Label: `"Jan 2026"` / `"2026-W03"` je nach Granularität
- `vitalityIndex`: `AVG(score)` aller Einträge im Zeitfenster; `null` wenn `COUNT < anonymityThreshold`
- `participationRate`: `COUNT(DISTINCT userId) / employeeCount`; `null` wenn unter Threshold

---

## `getIndustryBenchmark()`

```typescript
export function getIndustryBenchmark(industry: string | null): {
  avgVitalityIndex: number;
  avgParticipationRate: number;
}
```

Synchron, kein DB-Zugriff. Input wird `.toLowerCase().trim()` normalisiert. Unbekannte Industry → `'default'`.

```typescript
const BENCHMARKS: Record<string, { avgVitalityIndex: number; avgParticipationRate: number }> = {
  healthcare: { avgVitalityIndex: 6.8, avgParticipationRate: 0.72 },
  tech:       { avgVitalityIndex: 7.1, avgParticipationRate: 0.68 },
  retail:     { avgVitalityIndex: 6.2, avgParticipationRate: 0.61 },
  default:    { avgVitalityIndex: 6.5, avgParticipationRate: 0.65 },
}
```

---

## CSRD-Mapping

Hardcodierte Liste, Werte dynamisch aus den berechneten KPIs befüllt:

| standard | description | elyoMetric | value |
|---|---|---|---|
| ESRS S1-8 | Mitarbeiterzufriedenheit | vitalityIndex | `"${vitalityIndex}/10"` |
| ESRS S1-9 | Diversität & Inklusion | participationRate | `"${Math.round(participationRate * 100)}%"` |
| ESRS S1-13 | Aus- und Weiterbildung | checkinsTotal | `"${checkinsTotal} Check-ins"` |

---

## API-Route `GET /api/reports/esg/data`

**Datei:** `src/app/api/reports/esg/data/route.ts`

### Auth

- Nicht authentifiziert → 401
- `role !== 'COMPANY_ADMIN'` → 403

### Query-Parameter

| Param | Typ | Pflicht | Validierung |
|---|---|---|---|
| `year` | integer | ja | fehlt oder NaN → 400 |
| `quarter` | integer 1–4 | nein | außerhalb 1–4 → 400 |

### Response

```json
{ "data": { ...ReportData } }
```

Fehler-Format konsistent mit anderen API-Routes: `{ "error": "string" }`.

---

## Tests

`src/lib/__tests__/esgReport.test.ts` mit vi.mock für `../prisma`.

| Test | Was geprüft wird |
|---|---|
| `getPeriodBounds` Jahresreport | `from` = 1. Jan, `to` = 31. Dez, `label` = "2026" |
| `getPeriodBounds` Q1 | `from` = 1. Jan, `to` = 31. Mrz, `label` = "Q1 2026" |
| `getPeriodBounds` Q4 | `from` = 1. Okt, `to` = 31. Dez |
| `getReportData` KPIs | Korrekte Durchschnitte aus Mock-Daten |
| `getReportData` vitalityTrend | Delta zur Vorperiode |
| `getReportData` teamBreakdown — über Threshold | Team erscheint einzeln |
| `getReportData` teamBreakdown — unter Threshold | Team in Sammel-Eintrag |
| `getReportData` teamBreakdown — Sammel-Eintrag immer present | Auch wenn 1 Team betroffen |
| `getReportData` trendData — Jahresreport | 12 Monatspunkte, null bei zu wenig Daten |
| `getReportData` trendData — Quartalsreport | 12 Wochenpunkte |
| `getReportData` 0 Einträge | Alle KPIs = 0 |
| `getIndustryBenchmark` bekannte Industry | Korrekte Mock-Werte |
| `getIndustryBenchmark` unbekannte Industry | Fallback auf default |
| `getIndustryBenchmark` null | Fallback auf default |
| API 401 | Nicht authentifiziert |
| API 403 | Falsche Rolle |
| API 400 | Fehlendes `year` |
| API 400 | `quarter` außerhalb 1–4 |
| API 200 | Korrekte Response-Struktur |

---

## Nicht in Scope

- PDF-Rendering (→ Phase 2.5)
- Echtzeit-Benchmark-Aggregation über mehrere Companies (→ Phase 3)
- CSRD-Felder konfigurierbar per Company (→ Phase 3)
- Caching der Report-Daten
