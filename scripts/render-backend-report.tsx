import { Document, Page, View, Text, StyleSheet, renderToFile } from '@react-pdf/renderer'
import React from 'react'

const ELYO_GREEN = '#1B4D3E'
const ELYO_GREEN_LIGHT = '#2d6b55'
const AMBER = '#b45309'
const RED = '#b91c1c'
const GRAY_TEXT = '#374151'
const GRAY_MUTED = '#6b7280'
const GRAY_LIGHT = '#e5e7eb'
const BG_ALT = '#f9fafb'

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: 'Helvetica', color: GRAY_TEXT },
  cover: { backgroundColor: ELYO_GREEN, padding: 0, justifyContent: 'center', alignItems: 'center' },
  coverBrand: { fontSize: 14, color: '#a7c4bc', letterSpacing: 4, marginBottom: 24 },
  coverTitle: { fontSize: 38, fontFamily: 'Helvetica-Bold', color: 'white', marginBottom: 8, textAlign: 'center' },
  coverSubtitle: { fontSize: 16, color: '#a7c4bc', marginBottom: 60, textAlign: 'center' },
  coverMetaBox: { borderTop: 1, borderBottom: 1, borderColor: '#2d6b55', paddingVertical: 14, paddingHorizontal: 30 },
  coverMetaLine: { fontSize: 11, color: 'white', marginBottom: 4 },

  h1: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: ELYO_GREEN, marginBottom: 12 },
  h2: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: ELYO_GREEN, marginTop: 16, marginBottom: 6 },
  h3: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: GRAY_TEXT, marginTop: 8, marginBottom: 4 },

  p: { fontSize: 9.5, lineHeight: 1.45, marginBottom: 6, color: GRAY_TEXT },
  muted: { fontSize: 8.5, color: GRAY_MUTED, lineHeight: 1.4 },

  bullet: { fontSize: 9.5, lineHeight: 1.4, marginBottom: 3, marginLeft: 10, color: GRAY_TEXT },

  // KPI-cards row
  kpiRow: { flexDirection: 'row', marginBottom: 10, marginTop: 4 },
  kpiBox: { flex: 1, borderWidth: 1, borderColor: GRAY_LIGHT, borderRadius: 4, padding: 8, marginRight: 6, alignItems: 'center' },
  kpiLabel: { fontSize: 7.5, color: GRAY_MUTED, marginBottom: 3, textAlign: 'center' },
  kpiValue: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: ELYO_GREEN },
  kpiUnit: { fontSize: 8, color: GRAY_MUTED, marginTop: 2 },

  // table
  tHead: { flexDirection: 'row', backgroundColor: ELYO_GREEN, paddingVertical: 4, paddingHorizontal: 5 },
  tHeadCell: { fontSize: 8.5, color: 'white', fontFamily: 'Helvetica-Bold' },
  tRow: { flexDirection: 'row', paddingVertical: 3.5, paddingHorizontal: 5, borderBottom: 0.5, borderColor: GRAY_LIGHT },
  tRowAlt: { backgroundColor: BG_ALT },
  tCell: { fontSize: 8.5, color: GRAY_TEXT, lineHeight: 1.3 },

  // score pill
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 6 },
  scoreLabel: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: GRAY_TEXT, width: 120 },
  scorePill: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10, marginRight: 10 },
  scorePillText: { fontSize: 9, color: 'white', fontFamily: 'Helvetica-Bold' },
  scoreText: { fontSize: 9, color: GRAY_TEXT, flex: 1 },

  footer: { position: 'absolute', bottom: 16, left: 36, right: 36, textAlign: 'center', fontSize: 7.5, color: '#9ca3af' },
})

// ── DATA ─────────────────────────────────────────────────────────────────────

const TODAY = '19. April 2026'

const TECH_STACK: Array<[string, string, string]> = [
  ['Next.js', '14.2.35', 'App Router, Edge/Node Runtime'],
  ['Prisma', '5.22.0', 'PostgreSQL ORM'],
  ['NextAuth', 'v5 beta', 'JWT-Session, 8 h maxAge'],
  ['Zod', '4.3.6', 'Eingabe-Validierung zentral'],
  ['@react-pdf/renderer', '4.5.1', 'ESG- und Backend-Reports'],
  ['web-push', '3.6.7', 'Web-Push-Notifications'],
  ['Vitest', '4.1.4', 'Unit-Test-Framework'],
  ['@vercel/blob', '2.3.3', 'Dokumenten-Storage'],
  ['bcryptjs', '3.0.3', 'Passwort-Hashing'],
  ['nodemailer', '8.0.1', 'SMTP-E-Mail-Versand'],
]

const MODELS: Array<[string, string]> = [
  ['Company', 'Mandant / Tenant — Einstellungen, Branding, Billing-Konfig'],
  ['User', 'Mitarbeiter + Rollen (EMPLOYEE · MANAGER · ADMIN)'],
  ['Team', 'Optionale Team-Zuordnung innerhalb Company'],
  ['WellbeingEntry', 'Tägliche/wöchentliche Check-ins (Mood · Stress · Energie)'],
  ['Survey + Question + Response + Answer', 'Befragungsmodul (vollständig anonymisierbar)'],
  ['AnamnesisProfile', '3-stufiges Gesundheitsprofil (Wave 1/2/3)'],
  ['HealthDocument + UserDocument', 'Metadaten-Stores für hochgeladene PDFs'],
  ['UserPoints + PointTransaction', 'Gamification-Punkte + Level-Ledger'],
  ['WearableConnection', 'Verschlüsselte Tokens pro Quelle (AES-256-GCM)'],
  ['WearableSync', 'Täglicher Sync: Steps, HR, Sleep, HRV, Readiness, Recovery'],
  ['Measure', 'Maßnahmen-Vorschläge (SUGGESTED/ACTIVE/COMPLETED)'],
  ['PushSubscription + NotificationPreference', 'Web-Push-Abos + Opt-In-Einstellungen'],
  ['InviteToken', 'Einmalige Einladungs-Tokens für Onboarding'],
  ['Account + Session + VerificationToken', 'NextAuth-Standard-Models'],
]

const API_DOMAINS: Array<[string, string, string]> = [
  ['Auth', '5', 'Register, Invite-Accept, Mobile-Login, NextAuth'],
  ['Company', '13', 'Dashboard, Surveys, Teams, Members, Reports, Settings'],
  ['Employee', '7', 'Checkin, Dashboard, History, Profile, Surveys'],
  ['Wearables', '6', 'Google Fit OAuth + Sync, Terra Connect/Disconnect'],
  ['Anamnesis', '2', 'Profile + Document-Upload'],
  ['Documents', '2', 'Vercel-Blob CRUD + Download'],
  ['Measures', '2', 'Listing + Status-Update'],
  ['Points', '3', 'Stand, Privileges, Manual Award'],
  ['Notifications', '1', 'Preferences GET/PATCH'],
  ['Push', '2', 'VAPID Public Key, Subscribe'],
  ['Reports', '2', 'ESG-Daten + ESG-PDF'],
  ['Onboarding', '2', 'Company-Setup, Bulk-Invites'],
  ['Webhooks', '1', 'Terra (HMAC-verifiziert)'],
  ['Cron', '1', 'Secret-geschützter Multi-Action-Handler'],
]

const LIB_MODULES: Array<[string, string]> = [
  ['auth.ts', 'NextAuth v5 Config, Credentials Provider, JWT-Session'],
  ['prisma.ts', 'Singleton Prisma-Client mit Log-Konfiguration'],
  ['crypto.ts', 'AES-256-GCM Token-Verschlüsselung (OAuth-Tokens, Terra-IDs)'],
  ['ratelimit.ts', 'In-Memory Sliding-Window Rate-Limiter'],
  ['validations.ts', 'Zentrale Zod-Schemas (Login, Checkin, Survey, Team, …)'],
  ['email.ts', 'Nodemailer-Transport + E-Mail-Templates'],
  ['points.ts', 'Gamification-Rules, 5 Level, Privilege-Logik'],
  ['anonymize.ts', 'Aggregation mit Schwellwert (default N≥5)'],
  ['googleHealth.ts', 'Google Fitness OAuth-Flow + Daten-Fetch'],
  ['esgReport.ts', 'ESG-Report-Aggregation (DSGVO-konform)'],
  ['measures.ts + measureEngine.ts', 'Maßnahmen-Katalog + Auto-Suggestion-Logik'],
  ['webPush.ts', 'web-push-Init + Push-Versand (VAPID)'],
  ['anamnesis.ts', 'Anamnese-Wave-Logik (Wave 1/2/3)'],
  ['invites.ts', 'Einladungs-Token-Generierung + Expiry'],
  ['utils.ts', 'Utility-Funktionen (formatDate, cn, etc.)'],
  ['terra/config.ts', 'Terra-API-Credentials + isTerraEnabled()'],
  ['terra/client.ts', 'Terra REST-Client (Widget-URL, Deauth)'],
  ['terra/webhook.ts', 'HMAC-Signature-Verify + Event-Parser'],
  ['terra/mapping.ts', 'Terra-Payload → WearableSync-Mapping'],
]

const CRON_JOBS: Array<[string, string, string]> = [
  ['daily-checkin-reminder', 'E-Mail an Mitarbeiter ohne heutigen Check-in', 'täglich'],
  ['weekly-digest', 'Admin-Zusammenfassung (Scores, At-Risk-Teams)', 'wöchentlich'],
  ['wearable-sync', 'Google-Fit-Sync (Steps, Sleep, HR) 7-Tage-Fenster', 'täglich'],
  ['measure-engine', 'Maßnahmen-Vorschläge aus Team-Metriken generieren', 'wöchentlich'],
  ['streak-check', '7-/30-Tage-Streak-Bonus vergeben', 'täglich'],
]

// Assessment scores (A+ > A > B > C > D)
type Grade = 'A' | 'B' | 'C' | 'D'
const GRADE_COLOR: Record<Grade, string> = {
  A: '#047857',
  B: '#65a30d',
  C: AMBER,
  D: RED,
}

interface Assessment {
  dimension: string
  grade: Grade
  headline: string
  strengths: string[]
  risks: string[]
  actions: string[]
}

const ASSESSMENTS: Assessment[] = [
  {
    dimension: 'Skalierbarkeit',
    grade: 'C',
    headline: 'MVP-skalierbar; mehrere Single-Instance-Annahmen begrenzen horizontale Skalierung.',
    strengths: [
      'Prisma-Client als Singleton, PostgreSQL über Connection-Pool nutzbar.',
      'Stateless Next.js-Routes mit JWT-Session – kein Server-State, grundsätzlich Vercel-tauglich.',
      'Saubere Domain-Trennung der 48 API-Routes erlaubt künftige Modularisierung.',
      'Terra-Integration Webhook-basiert (asynchron) – keine Long-Polling-Lasten.',
    ],
    risks: [
      'Rate-Limiter in lib/ratelimit.ts ist In-Memory – in Multi-Instance-Deployments unwirksam.',
      'Listings ohne Pagination in employee/history, company/surveys, company/dashboard.',
      'Weekly-Digest-Cron iteriert sequenziell pro Team – N+1-Risiko ab ~50 Teams pro Company.',
      'Terra-Webhook: O(n)-Decrypt-Scan über aktive Oura-/Garmin-Connections pro Data-Event.',
      'Kein Queue-System für E-Mail-Versand – bei Bulk-Invites blocken lang laufende Requests.',
    ],
    actions: [
      'Upstash Redis (oder @vercel/kv) für Rate-Limiting und kurzlebige Caches einführen.',
      'Cursor-based Pagination (take/skip) in allen Listing-Endpunkten.',
      'Terra: indiziertes terraUserIdHash-Feld ergänzen, sobald Premium-User > 1.000.',
      'Bulk-Invites in Vercel-Queue oder Trigger.dev auslagern.',
    ],
  },
  {
    dimension: 'Wartbarkeit',
    grade: 'B',
    headline: 'Klare Modulgrenzen, konsistente Patterns – aber wenig dokumentierte Conventions.',
    strengths: [
      'Durchgängig kleine, fokussierte Module in src/lib/ (Ø 50–80 LOC, max. 180).',
      'Zentrale Zod-Validierung + wiederverwendete Prisma-Helper reduzieren Duplikation.',
      'Design-Specs + Implementation-Plans in docs/superpowers/ dokumentieren jede Phase.',
      'Konsistente Naming-Conventions (camelCase, source-Strings, lowercase-DB-Enums).',
      'Prisma-Schema zentral versioniert mit additiven Migrations (9 Migrations, keine Destructive Changes).',
    ],
    risks: [
      'Keine strukturierten Log-Patterns (ca. 11 console.error/warn ohne Kontext-Felder).',
      'Wiederkehrender auth()-Boilerplate in 47 Routes statt geteilter Middleware.',
      'Keine CODEOWNERS / Contribution-Guide – Team-Onboarding erschwert.',
      'ratelimit.ts + weitere Libs ohne JSDoc auf exportierten Funktionen.',
      'Test-Utilities fehlen (z. B. createMockSession) – jede neue Integration duplicates vi.mock-Setup.',
    ],
    actions: [
      'Structured-Logger (Pino) mit userId/companyId/route-Feldern in allen Error-Paths.',
      'withAuth(role)-Helper zur Kapselung der Auth-/Rollencheck-Boilerplate.',
      'CONTRIBUTING.md + CODEOWNERS; ADRs für strategische Entscheidungen.',
      'Test-Fixtures/-Factories zentralisieren (src/lib/__tests__/factories.ts).',
    ],
  },
  {
    dimension: 'Zuverlässigkeit',
    grade: 'B',
    headline: 'Solide Security-Primitive, gute Lib-Tests – Gaps in Integration-Tests und Atomicity.',
    strengths: [
      '17 Unit-Test-Files mit fokussierter Lib-Abdeckung (235 Tests, alle grün).',
      'HMAC-Signature-Verification via timingSafeEqual; AES-256-GCM für gespeicherte Tokens.',
      'Idempotenz-Checks bei Punkte-Vergabe (wearable_connected einmalig pro User).',
      'Fail-open-Disconnect in Terra/Google: lokaler State zuverlässig bereinigt, auch bei Provider-Fehlern.',
      'Anonymisierungs-Schwelle (default N≥5) schützt Admin-Views vor Individual-Daten-Leak.',
    ],
    risks: [
      'Keine Integration-Tests für API-Routes – Security-Gates (401/403/503) nur indirekt abgedeckt.',
      'Check-then-act ohne Transaktion bei awardPoints (TOCTOU bei parallelen Webhooks).',
      'wearableSync-Upsert-Loop nicht in $transaction – Partial-Writes bei Fehler mitten in Batch.',
      'Kein CI/CD (keine GitHub-Actions) – Tests laufen nur lokal vor Commit.',
      'Kein zentrales Error-Monitoring (Sentry/Datadog) – console.error reicht nicht produktiv.',
      'Fehlende HEAD/OPTIONS-Health-Endpoints für Uptime-Monitoring.',
    ],
    actions: [
      'GitHub-Actions: vitest + tsc auf jedem PR; Migrations-Check gegen prod-Schema.',
      'Sentry oder Datadog Browser/Node SDK integrieren; critical paths instrumentieren.',
      '$transaction um Point-Award + WearableSync-Batches.',
      'Integration-Tests für kritische Routes (webhook, checkin, onboarding) mit Test-DB.',
      '/api/health-Endpoint + statische Security-Headers (CSP, HSTS) in next.config.ts.',
    ],
  },
]

// ── COMPONENTS ──────────────────────────────────────────────────────────────

function Footer({ pageNr, totalPages }: { pageNr: number; totalPages: number }) {
  return (
    <Text style={s.footer} fixed>
      ELYO · Backend-Assessment · {TODAY} · Seite {pageNr} von {totalPages}
    </Text>
  )
}

function Table({ headers, rows, columnWidths }: { headers: string[]; rows: string[][]; columnWidths: number[] }) {
  return (
    <View>
      <View style={s.tHead}>
        {headers.map((h, i) => (
          <Text key={i} style={[s.tHeadCell, { width: `${columnWidths[i]}%` }]}>{h}</Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={[s.tRow, ri % 2 === 1 ? s.tRowAlt : {}]} wrap={false}>
          {row.map((cell, ci) => (
            <Text key={ci} style={[s.tCell, { width: `${columnWidths[ci]}%` }]}>{cell}</Text>
          ))}
        </View>
      ))}
    </View>
  )
}

function GradePill({ grade }: { grade: Grade }) {
  return (
    <View style={[s.scorePill, { backgroundColor: GRADE_COLOR[grade] }]}>
      <Text style={s.scorePillText}>Note {grade}</Text>
    </View>
  )
}

function AssessmentSection({ a }: { a: Assessment }) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 4 }}>
        <Text style={[s.h2, { marginTop: 0, marginBottom: 0, flexGrow: 0 }]}>{a.dimension}</Text>
        <View style={{ width: 10 }} />
        <GradePill grade={a.grade} />
      </View>
      <Text style={[s.p, { fontFamily: 'Helvetica-Oblique' }]}>{a.headline}</Text>

      <Text style={s.h3}>Stärken</Text>
      {a.strengths.map((x, i) => <Text key={i} style={s.bullet}>• {x}</Text>)}

      <Text style={s.h3}>Risiken</Text>
      {a.risks.map((x, i) => <Text key={i} style={s.bullet}>• {x}</Text>)}

      <Text style={s.h3}>Empfohlene Maßnahmen</Text>
      {a.actions.map((x, i) => <Text key={i} style={s.bullet}>• {x}</Text>)}
    </View>
  )
}

// ── DOCUMENT ────────────────────────────────────────────────────────────────

function ReportDoc() {
  return (
    <Document title="ELYO Backend-Assessment" author="ELYO · Architektur-Review">
      {/* Cover */}
      <Page size="A4" style={[s.page, s.cover]}>
        <Text style={s.coverBrand}>ELYO</Text>
        <Text style={s.coverTitle}>Backend-Assessment</Text>
        <Text style={s.coverSubtitle}>Inventur · Skalierbarkeit · Wartbarkeit · Zuverlässigkeit</Text>
        <View style={s.coverMetaBox}>
          <Text style={s.coverMetaLine}>Stand: {TODAY}</Text>
          <Text style={s.coverMetaLine}>Umfang: 23 Prisma-Models · 48 API-Routes · 20 Lib-Module · 5 Cron-Jobs</Text>
          <Text style={s.coverMetaLine}>Tests: 235 Unit-Tests (25 Files) · TypeScript strict</Text>
        </View>
      </Page>

      {/* Page 2: Executive Summary */}
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Executive Summary</Text>
        <Text style={s.p}>
          Das ELYO-Backend hat einen soliden MVP-Stand erreicht: Die Architektur folgt modernen
          Next.js-14-Patterns mit Prisma und NextAuth v5; Kernfunktionen (Onboarding, Check-in,
          Gamification, Wearable-Integration, ESG-Reports, Push-Notifications, PWA) sind
          funktional implementiert und unit-getestet.
        </Text>
        <Text style={s.p}>
          Gegenüber den drei Qualitäts-Dimensionen zeigt sich ein konsistentes Muster:
          Die Code-Organisation ist sauber, Security-Primitive sind korrekt angewandt, aber
          es fehlen produktionskritische Infrastruktur-Komponenten für horizontale Skalierung,
          zentrale Observability und CI-Gates.
        </Text>

        <View style={s.kpiRow}>
          <View style={s.kpiBox}>
            <Text style={s.kpiLabel}>Skalierbarkeit</Text>
            <Text style={[s.kpiValue, { color: GRADE_COLOR.C }]}>C</Text>
            <Text style={s.kpiUnit}>MVP-tauglich, Infra-Gaps</Text>
          </View>
          <View style={s.kpiBox}>
            <Text style={s.kpiLabel}>Wartbarkeit</Text>
            <Text style={[s.kpiValue, { color: GRADE_COLOR.B }]}>B</Text>
            <Text style={s.kpiUnit}>Klare Struktur, Doku-Lücken</Text>
          </View>
          <View style={s.kpiBox}>
            <Text style={s.kpiLabel}>Zuverlässigkeit</Text>
            <Text style={[s.kpiValue, { color: GRADE_COLOR.B }]}>B</Text>
            <Text style={s.kpiUnit}>Solide Libs, schwache Routes</Text>
          </View>
        </View>

        <Text style={s.h2}>Gesamtbewertung</Text>
        <Text style={s.p}>
          Der aktuelle Stand trägt erste Pilotkunden und niedrige 3-stellige Nutzerzahlen.
          Für produktive Mehrmandanten-Skalierung sind fokussierte Investitionen in
          (1) verteilte Rate-Limiting-Infrastruktur, (2) strukturiertes Logging + Error-Monitoring
          und (3) CI-Automatisierung erforderlich. Diese drei Punkte sind in geringem Aufwand
          (geschätzt 2–3 Engineer-Wochen) umsetzbar und heben die Gesamtnote deutlich.
        </Text>

        <Text style={s.h2}>Top-5 priorisierte Maßnahmen</Text>
        <Text style={s.bullet}>1. Upstash Redis für verteiltes Rate-Limiting (Tag 1–3)</Text>
        <Text style={s.bullet}>2. Sentry- oder Datadog-Integration für Error-Monitoring (Tag 3–5)</Text>
        <Text style={s.bullet}>3. GitHub-Actions: vitest + tsc + Prisma-Check auf jedem PR (Tag 1–2)</Text>
        <Text style={s.bullet}>4. Pagination in allen Listing-Endpunkten + Prisma-$transaction für kritische Writes (Woche 2)</Text>
        <Text style={s.bullet}>5. withAuth-Middleware + strukturiertes Logging (Pino) in allen Routes (Woche 2–3)</Text>

        <Footer pageNr={2} totalPages={7} />
      </Page>

      {/* Page 3: Tech-Stack + Datenmodell */}
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Backend-Inventur (1/3): Tech-Stack &amp; Datenmodell</Text>

        <Text style={s.h2}>Tech-Stack</Text>
        <Table
          headers={['Komponente', 'Version', 'Zweck']}
          rows={TECH_STACK.map(([n, v, p]) => [n, v, p])}
          columnWidths={[25, 18, 57]}
        />

        <Text style={s.h2}>Datenmodell (23 Prisma-Models)</Text>
        <Table
          headers={['Model(s)', 'Zweck']}
          rows={MODELS}
          columnWidths={[38, 62]}
        />
        <Text style={s.muted}>
          9 Migrations (additiv, keine Destructive Changes). Durchgängige onDelete-Cascades von Company →
          Users/Teams/Surveys/Invites und User → alle abhängigen Records. Kritische Indizes:
          @@unique([userId, periodKey]) auf Wellbeing, @@unique([userId, source, date]) auf WearableSync.
        </Text>

        <Footer pageNr={3} totalPages={7} />
      </Page>

      {/* Page 4: API-Routes + Lib-Modules */}
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Backend-Inventur (2/3): API-Routes &amp; Lib-Module</Text>

        <Text style={s.h2}>API-Routes (48 gesamt)</Text>
        <Table
          headers={['Domain', 'Routes', 'Inhalt']}
          rows={API_DOMAINS.map(([d, n, c]) => [d, n, c])}
          columnWidths={[18, 10, 72]}
        />

        <Text style={s.h2}>Lib-Module (20 Dateien, ~1.780 LOC)</Text>
        <Table
          headers={['Modul', 'Verantwortung']}
          rows={LIB_MODULES}
          columnWidths={[28, 72]}
        />

        <Footer pageNr={4} totalPages={7} />
      </Page>

      {/* Page 5: Cron + Observability */}
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Backend-Inventur (3/3): Cron &amp; Observability</Text>

        <Text style={s.h2}>Cron-Jobs (konsolidiert in /api/cron, Secret-geschützt)</Text>
        <Table
          headers={['Action', 'Funktion', 'Frequenz']}
          rows={CRON_JOBS}
          columnWidths={[28, 55, 17]}
        />
        <Text style={s.muted}>
          Trigger durch externen Scheduler (EasyCron / GitHub Actions). Authentifizierung per
          x-cron-secret Header via timingSafeEqual. Kein vercel.json vorhanden.
        </Text>

        <Text style={s.h2}>Observability &amp; Sicherheit</Text>
        <Text style={s.bullet}>• Logging: ca. 11 console.error/warn-Aufrufe ohne strukturierten Kontext</Text>
        <Text style={s.bullet}>• Monitoring: kein Sentry/Datadog aktiv</Text>
        <Text style={s.bullet}>• Health-Endpoint: nicht vorhanden (Empfehlung: /api/health)</Text>
        <Text style={s.bullet}>• Rate-Limiting: In-Memory Sliding Window (5 req / 15 min auf /auth/register)</Text>
        <Text style={s.bullet}>• Auth: NextAuth v5 Credentials, JWT mit 8 h maxAge</Text>
        <Text style={s.bullet}>• Token-Storage: AES-256-GCM mit 12-Byte IV + Auth-Tag (Node crypto)</Text>
        <Text style={s.bullet}>• CORS: permissiv auf /api/* (Origin *) – für MVP akzeptabel</Text>
        <Text style={s.bullet}>• CSP/HSTS: nicht gesetzt (Empfehlung: in next.config.ts ergänzen)</Text>

        <Text style={s.h2}>Test-Coverage</Text>
        <Text style={s.p}>
          25 Test-Files mit 235 Unit-Tests – deckt alle Lib-Module gut ab (crypto, points, anonymize,
          esgReport, googleHealth, measureEngine, webPush, terra/*). API-Route-Integration-Tests sind
          mit 2 Files (measures, documents) unterrepräsentiert. Kein CI/CD-Pipeline, Tests laufen nur
          lokal vor Commit.
        </Text>

        <Footer pageNr={5} totalPages={7} />
      </Page>

      {/* Pages 6 + 7: Assessments */}
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Bewertung: Skalierbarkeit</Text>
        <AssessmentSection a={ASSESSMENTS[0]} />

        <Text style={s.h1}>Bewertung: Wartbarkeit</Text>
        <AssessmentSection a={ASSESSMENTS[1]} />

        <Footer pageNr={6} totalPages={7} />
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Bewertung: Zuverlässigkeit</Text>
        <AssessmentSection a={ASSESSMENTS[2]} />

        <Text style={s.h2}>Zusammenfassung &amp; Ausblick</Text>
        <Text style={s.p}>
          Das ELYO-Backend steht architektonisch stabil: Domain-Klarheit, konsistente Patterns,
          saubere Security-Basis. Die drei Schwerpunkte der nächsten Iteration sollten sein
          (1) Observability-Stack, (2) CI/CD-Automatisierung und (3) verteilte Infrastruktur-
          Primitive (Rate-Limiter, Queue).
        </Text>
        <Text style={s.p}>
          Mit diesen Investitionen hebt sich das System von „MVP mit Pilotkunden“ zu
          „produktionsreif für mittelständische Mehrmandanten-Nutzung“. Die bestehenden
          Domänen-Module (Onboarding, Wearables, Reports, Push) sind dafür ausreichend
          entwickelt und benötigen keine strukturelle Überarbeitung.
        </Text>

        <Text style={s.muted}>
          Hinweis: Diese Analyse basiert auf dem Code-Stand zum {TODAY}. Kein direkter Zugriff auf
          Produktionsdaten, Performance-Metriken oder Betriebsstatistiken – Bewertungen
          reflektieren Code-Analyse und strukturelle Beobachtungen.
        </Text>

        <Footer pageNr={7} totalPages={7} />
      </Page>
    </Document>
  )
}

const OUT = 'docs/reports/2026-04-19-backend-assessment.pdf'

async function main() {
  await renderToFile(<ReportDoc />, OUT)
  console.log('PDF erstellt:', OUT)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
