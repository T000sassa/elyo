# Design-Port: Design-System + 3 Pilot-Pages – Design Spec

**Status:** Approved — ready for implementation plan
**Scope:** Übernahme des `elyo-design/`-Design-Systems (CSS-Variablen + Fonts) global und pixel-perfekter Port von 3 Mockup-Seiten (Partner-Login, Mitarbeiter-Dashboard, Unternehmen-Dashboard) nach React. Datenanbindung der zwei Dashboards an bestehendes Backend; Login bleibt statisch.

**Explizit nicht im Scope:**
- Umschreibung anderer Seiten (Checkin, Level, Partners-Liste, Admin-Panel, Partner-Portal-Register/Dashboard/Documents) auf das neue Design-System. Diese bleiben in bestehender Tailwind-Ausführung. Umbau in Folge-Specs.
- Ablösung bestehender UI-Komponenten (`ScoreGauge`, `MetricChip`, `LevelBadge` etc.) — die Pilot-Seiten nutzen die Mockup-CSS direkt, keine dieser Komponenten.
- Neue Features oder Content-Änderungen in den Pilot-Seiten über den Mockup-Umfang hinaus.

---

## Context

Das Projekt enthält in `elyo-design/` drei hochwertige HTML-Mockups (`partner-login.html`, `mitarbeiter.html`, `unternehmen.html`) und eine `elyo.css` mit Design-Tokens (~560 Zeilen). Bestehende Seiten wurden in Phase 0/1 in generischem Tailwind-Stil umgesetzt, der vom Mockup-Design abweicht. Der Nutzer hat explizit bestätigt, dass das aktuelle Rendering „nicht so aussieht wie in den Mockups".

Ziel: Das Design-System wird als Fundament in Tailwind + `globals.css` übernommen, und drei Pilot-Seiten werden pixel-perfect gegen die Mockups portiert. Die Pilot-Seiten sind strategisch gewählt — sie decken alle drei Rollen ab (Partner, Employee, Company-Admin) und sind die sales-relevantesten Ansichten.

---

## Goals / Non-Goals

**Goals:**
- Design-Tokens (Farben, Fonts, Spacing) global verfügbar via CSS-Variablen + Tailwind-Extension.
- Fraunces + DM Sans via `next/font/google` optimiert geladen.
- 3 Pilot-Seiten pixel-perfect zu den Mockups (Partner-Login als Split-Layout, Mitarbeiter-Dashboard mit Score-Gauge + Sparkline + Partner-Carousel, Unternehmen-Dashboard mit KPI-Leiste + At-Risk-Radar + Trend-Chart).
- Mitarbeiter- und Unternehmen-Dashboard zeigen **echte Daten** aus Prisma/Session. Fallback-Werte nur wo Backend-Feature fehlt (z. B. Krankheitstage).
- Partner-Login bleibt statisch (reine Form ohne Data-Wiring außer Submit zu `/api/partner/login`).

**Non-Goals:**
- Umbau anderer Seiten auf die neuen Tokens.
- Änderung bestehender API-Routes, Business-Logik oder Datenbank-Schemas.
- Dark-Mode, Localization.
- Visual-Regression-Tests (nur manuelle QA-Checkliste).

---

## Architecture

### Design-Token-Layer

**Drei Stellen teilen Tokens:**

1. `src/app/globals.css` — CSS-Variablen (`--elyo-green-500` etc.) auf `:root`. Base-Styles für `body` (Background, Color, Font).
2. `tailwind.config.ts` — `theme.extend.colors.elyo-green/amber` + `fontFamily.display/body`. Erlaubt `className="text-elyo-green-500 font-display"` global.
3. `next/font/google` in `src/app/layout.tsx` — Fraunces + DM Sans werden als CSS-Var `--font-display` / `--font-body` exponiert. Tailwind-Config referenziert diese Variablen.

**Separation of concerns:** Die Pilot-Seiten verwenden ihre eigenen CSS-Modules (verbatim aus Mockups portiert), die direkt auf `var(--elyo-green-500)` zugreifen — kein Tailwind nötig. Andere Seiten verwenden Tailwind-Klassen mit den Tokens, die in späteren Specs portiert werden.

### Pilot-Seite pro Folder

```
src/app/partner/login/
├── page.tsx                     # Client-Component (Form submit)
└── partner-login.module.css     # Verbatim aus partner-login.html <style>

src/app/(app)/dashboard/
├── page.tsx                     # Server-Component (Prisma queries)
├── DashboardClient.tsx          # Client (Recharts + Framer)
└── mitarbeiter.module.css       # Verbatim aus mitarbeiter.html <style>

src/app/(company)/company/dashboard/
├── page.tsx                     # Server-Component (Prisma + anonymize)
├── TrendChartClient.tsx         # Client (Recharts)
└── unternehmen.module.css       # Verbatim aus unternehmen.html <style>
```

### Daten-Fluss

- **Partner-Login**: Formular → `fetch('/api/partner/login')` → Redirect. Keine Server-Side-Daten.
- **Mitarbeiter-Dashboard**: RSC lädt `session`, `UserPoints`, `WellbeingEntry` (letzte 7), `Partner` (top 3), `Survey` (offen). Daten als Props an `DashboardClient` für Recharts.
- **Unternehmen-Dashboard**: RSC lädt `session.user.company`, `getAggregatedMetrics`, `getTrendData`, Team-Aggregationen, alle respektieren `anonymityThreshold`. Trend-Daten an `TrendChartClient`.

---

## Design Tokens (aus elyo.css)

### CSS-Variablen in `globals.css`

```css
:root {
  --elyo-green-50:  #EEF3F1;
  --elyo-green-100: #D6E3DD;
  --elyo-green-200: #9FBEB1;
  --elyo-green-300: #5C8574;
  --elyo-green-500: #1B4D3E;
  --elyo-green-700: #0F3329;
  --elyo-green-900: #07201A;
  --elyo-amber-50:  #FBF3E5;
  --elyo-amber-100: #F4DFB4;
  --elyo-amber-300: #E0B565;
  --elyo-amber-500: #C8913A;
  --elyo-amber-700: #9A6A22;
  --elyo-bg:        #F7F6F2;
  --elyo-surface:   #FFFFFF;
  --elyo-surface-2: #FBFAF6;
  --elyo-line:      #E6E2D6;
  --elyo-ink:       #1A1C1A;
  --elyo-ink-soft:  #55584F;
  --elyo-ink-mute:  #8E8F86;
  --elyo-ok:        #2E7D5B;
  --elyo-warn:      #C8913A;
  --elyo-risk:      #B64A3A;
  --elyo-info:      #3A6DA8;
  --elyo-level-starter:  #9FBEB1;
  --elyo-level-bronze:   #B08968;
  --elyo-level-silver:   #9CA3AF;
  --elyo-level-gold:     #E0B565;
  --elyo-level-platinum: #334155;
  --font-display: 'Fraunces', Georgia, serif;
  --font-body:    'DM Sans', system-ui, sans-serif;
}

body {
  background: var(--elyo-bg);
  color: var(--elyo-ink);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}
```

### Tailwind-Extension in `tailwind.config.ts`

```ts
theme: {
  extend: {
    colors: {
      'elyo-green': { 50: '#EEF3F1', 100: '#D6E3DD', 200: '#9FBEB1', 300: '#5C8574', 500: '#1B4D3E', 700: '#0F3329', 900: '#07201A' },
      'elyo-amber': { 50: '#FBF3E5', 100: '#F4DFB4', 300: '#E0B565', 500: '#C8913A', 700: '#9A6A22' },
      'elyo-bg': '#F7F6F2',
      'elyo-surface': '#FFFFFF',
      'elyo-surface-2': '#FBFAF6',
      'elyo-line': '#E6E2D6',
      'elyo-ink': { DEFAULT: '#1A1C1A', soft: '#55584F', mute: '#8E8F86' },
    },
    fontFamily: {
      display: ['var(--font-display)', 'Georgia', 'serif'],
      body:    ['var(--font-body)', 'system-ui', 'sans-serif'],
    },
  },
}
```

### Next/Font-Setup in `layout.tsx`

```ts
import { Fraunces, DM_Sans } from 'next/font/google'

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap', weight: ['400','500','600','700'] })
const dmSans   = DM_Sans({ subsets: ['latin'], variable: '--font-body',    display: 'swap', weight: ['400','500','600','700'] })

// <html lang="de" className={`${fraunces.variable} ${dmSans.variable}`}>
```

---

## Pilot 1: Partner-Login (`/partner/login`)

**Ziel:** Split-Layout aus `partner-login.html` pixel-perfect, mit bestehender Submit-Logik.

### Content aus Mockup (links, Brand-Panel)

- Logo-Mark „E" + „ELYO" + „PARTNER"-Kicker
- Headline: „Zugang zu echten Lebensverbesserungen"
- Kicker: „Experten-Netzwerk"
- Description: „ELYO verbindet geprüfte Experten mit Menschen, die Unterstützung suchen."
- Benefits-Liste (3 Items aus Mockup)
- Trust-Row am Fuß (Verified-Badge etc.)

### Form (rechts)

- Felder: E-Mail, Passwort (wie bestehende Implementierung)
- Submit → `POST /api/partner/login` (unverändert)
- Loading-State, Error-Display bei `invalid_credentials` / `rate_limited`
- Footer-Link: „Noch kein Partner? Registrieren →" → `/partner/register`

### Port-Regeln

- Kopiere komplettes `<style>` aus `partner-login.html` verbatim in `partner-login.module.css`
- Entferne `@import url(...)` Google-Fonts-Zeile (Fonts kommen via `next/font`)
- JSX-Struktur folgt HTML 1:1 — nur `class="brand-panel"` wird `className={styles.brandPanel}`
- Responsive-Media-Query aus Mockup bleibt (< 900px: Grid-Stack)

---

## Pilot 2: Mitarbeiter-Dashboard (`/dashboard`)

**Ziel:** Employee-Dashboard aus `mitarbeiter.html` mit echten Daten.

### Data-Bindings

| Mockup-Element | Backend | Fallback |
|---|---|---|
| Greeting „Guten Morgen, Sarah" | `session.user.name` + Tageszeit | — |
| Streak-Badge 🔥 N Tage | `calculateStreak(userId)` aus `lib/points.ts` | 0 → Badge hidden |
| Vitalitäts-Score /100 | Ø der letzten 7 `WellbeingEntry.score × 10` | 0 → „–" + Hinweis |
| Score-Sparkline (7 Tage) | `prisma.wellbeingEntry.findMany({userId, orderBy:createdAt desc, take:7})` | [] → Chart hidden |
| Energie/Stimmung/Belastung-Chips | Ø `energy/mood/stress` letzte 7 Tage | 0 → „–" |
| Level + Progress | `UserPoints.findUnique` | STARTER, 0% |
| Privileges | `getPrivileges(level)` | Startermenge |
| Partner-Carousel (3) | `prisma.partner.findMany({verificationStatus:VERIFIED, take:3})` — Map wie in `(app)/partners/page.tsx` | [] → „Bald mehr" |
| Offene Umfragen | `prisma.survey.findMany({companyId, status:ACTIVE})` minus `surveyResponse` des Users | [] → Section hidden |

### Check-in-CTA

- Wenn `WellbeingEntry` mit `periodKey = todayKey` existiert → Badge „✓ Heute erledigt"
- Sonst → Button „Zum Check-in →" → `/checkin`

### Server/Client-Split

- `page.tsx` ist Server-Component, führt alle Queries in `Promise.all` aus
- `DashboardClient.tsx` ist Client-Component, empfängt alle Daten als Props, rendert Recharts + Framer-Animationen

### Port-Regeln wie Pilot 1

- Kopiere `<style>` verbatim aus `mitarbeiter.html` in `mitarbeiter.module.css`
- JSX-Struktur übernehmen, nur mit echten Werten statt Mockup-Strings
- Wording-Regel (Entwicklungsplan §4): keine medizinischen Begriffe; „Indikatoren", „Muster", „Signale"

---

## Pilot 3: Unternehmen-Dashboard (`/company/dashboard`)

**Ziel:** Company-Dashboard aus `unternehmen.html` mit echten aggregierten Daten.

### Auth-Gate

- Keine Session → `redirect('/auth/login')`
- Role ∉ {COMPANY_ADMIN, COMPANY_MANAGER, ELYO_ADMIN} → `redirect('/dashboard')`
- Manager-Scoping: wenn `role === COMPANY_MANAGER`, alle Aggregationen nur für `managedTeamId`

### Data-Bindings

| Mockup-Element | Backend | Fallback |
|---|---|---|
| Company-Name Header | `prisma.company.findUnique({include:user})` | — |
| Vitalitäts-Index /100 | `getAggregatedMetrics(companyId, currentPeriod).vitalityIndex × 10` | 0 → „–" |
| Aktive Nutzer | `prisma.user.count({companyId, isActive:true})` (Total) + Count mit `lastLoginAt` in 14 d | 0/0 |
| Ø Energie diese Woche | `.avgEnergy` aus `getAggregatedMetrics` | 0 |
| Krankheitstage | **nicht im Schema** → statisch „–" + Label „Nicht erfasst" | — |
| At-Risk-Radar Teams | `getAggregatedMetrics` pro Team, filter `avgStress >= 7 && count >= threshold`, top 2 | [] → grünes OK-Banner |
| Trend-Chart 12 Wochen | `getTrendData(companyId, 12)` | [] → Chart hidden |
| Team-Health-Tabelle | `prisma.team.findMany({companyId, include:_count members})` + per-Team Agg mit anonymize | [] → „Keine Teams" |
| Quick-Actions | Statische Links zu `/company/reports`, `/company/surveys/new`, `/company/teams`, `/company/measures` | — |
| Anonymitäts-Footer | `company.anonymityThreshold` | Default 5 |

### Anonymisierungs-Garantie

- Alle Aggregationen nutzen bestehende `lib/anonymize.ts`-Funktionen
- Teams < Threshold werden nicht individuell gezeigt, sondern als „Weitere Teams (n<Threshold)" zusammengefasst
- Footer-Hinweis permanent sichtbar

### Port-Regeln wie Pilot 1

- Komplettes `<style>` verbatim aus `unternehmen.html` in `unternehmen.module.css`
- Recharts für Trend-Chart in Client-Component (`TrendChartClient.tsx`)

---

## Error Handling

| Szenario | Verhalten |
|---|---|
| Session abgelaufen auf Dashboard | Redirect zu Login |
| Falsche Rolle auf Dashboard | Redirect zu rollenspezifischem Default |
| Keine Daten vorhanden (frische Company) | Leere States mit freundlichen Hinweisen, keine Crashes |
| Prisma-Error (DB-Unavailable) | Standard Next.js Error-Boundary, Retry via Page-Reload |
| Font-Ladefehler | `display: swap` sorgt für System-Font-Fallback |

---

## Testing / QA

### Automatisierte Tests

- Kein neuer Unit-Test (reine UI-Port, Business-Logik unverändert).
- Bestehende Lib-Tests (`anonymize`, `points`, `esgReport`) bleiben gültig und gelten implizit als Validierung.
- `npx vitest run` → 251 Tests bleiben grün.
- `npx tsc --noEmit` → clean (wichtig: next/font-TS-Types + Tailwind-Theme-Extension).

### Manuelle Visual-QA (Testscript für den Entwickler)

1. **Design-Tokens global:**
   - DevTools → `:root` → alle `--elyo-*`-Vars lesbar
   - `body` in System-Font → DM Sans (oder Fallback)
   - Tailwind: `<div className="bg-elyo-green-500">` rendert korrekt in Dev

2. **Partner-Login (`/partner/login`):**
   - Split-Layout, Brand-Panel links mit grünem Gradient, Form rechts
   - Radial-Glow oben-rechts (amber), textur-Overlay
   - Logo-Mark „E" korrekt gefärbt
   - Submit-Flow funktional (zu Dashboard)
   - Responsive unter 900 px: vertical stacked

3. **Mitarbeiter-Dashboard (`/dashboard`):**
   - Mit Seed-User `mitarbeiter1@demo.de`: Greeting zeigt „Mitarbeiter 1"
   - Score-Gauge zeigt Wert (Seed-Daten haben WellbeingEntries)
   - Sparkline rendert 7 Punkte
   - Partner-Carousel: 3 Seed-Partner mit city/type korrekt
   - Umfragen-Section zeigt die Seed-Survey

4. **Unternehmen-Dashboard (`/company/dashboard`):**
   - Mit Seed-User `admin@demo.de`: „Demo GmbH" Header
   - KPI-Zahlen > 0 (dank Seed)
   - At-Risk-Teams je nach Seed-Stress-Werten
   - Trend-Chart mit Seed-Daten
   - Anonymitäts-Hinweis zeigt „min. 3 Einträge" (Seed-Threshold)

### Regressions-Risiko

- Body-Font auf DM Sans global — alle bestehenden Seiten sehen leicht anders aus. Akzeptiert.
- `(app)/dashboard` und `(company)/company/dashboard` werden komplett rewritten. Der bestehende Dashboard-Mock-Partner-Fetch aus Phase 1.4 wird durch neue Implementierung ersetzt. Kein Funktionsverlust (neuer Mitarbeiter-Dashboard zeigt Partner genauso, nur im neuen Layout).

---

## Env-Vars / Deployment

Keine neuen Env-Vars. Kein Impact auf Deployment-Config (`next.config.mjs` unverändert).

---

## Open Questions / Future Work

- **Andere Seiten** (Checkin, Level, Partners, Admin, Partner-Portal-Folge-Seiten) auf neue Tokens umstellen — separate Spec.
- **Dark Mode** — elyo.css hat Primärfarben definiert, aber kein Dark-Scheme. Produkt-Entscheidung, kein Design-Input.
- **Visual-Regression-Tests** via Playwright + Screenshot-Vergleich — später, wenn CI-Pipeline steht.
- **Icons:** Die Mockups nutzen teils Inline-SVGs, teils Lucide. Port übernimmt, was im Mockup-HTML steht; kein Tausch.
- **Image-Assets:** `elyo-logo.jpeg` ist nur CSS-Text-basiert im Mockup dargestellt — kein Asset-Import nötig.
