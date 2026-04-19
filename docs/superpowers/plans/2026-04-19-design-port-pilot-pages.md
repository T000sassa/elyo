# Design-Port: Design-System + 3 Pilot-Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Design-System-Tokens aus `elyo-design/elyo.css` global etablieren und 3 Pilot-Seiten (Partner-Login, Mitarbeiter-Dashboard, Unternehmen-Dashboard) pixel-perfect gegen die Mockup-HTMLs portieren, mit echten Daten in den Dashboards.

**Architecture:** CSS-Variablen in `globals.css` + Tailwind-Config-Extension für Token-Reuse. Pro Pilot-Seite ein CSS-Modul, verbatim aus dem Mockup-`<style>`-Block extrahiert. Pages sind Server-Components mit Prisma-Queries (Dashboards) bzw. Client-Component (Login). Recharts-Client-Components für interaktive Diagramme.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Tailwind CSS, CSS Modules, `next/font/google` (Fraunces + DM Sans), Prisma, Recharts.

**Spec:** [docs/superpowers/specs/2026-04-19-design-port-pilot-pages.md](../specs/2026-04-19-design-port-pilot-pages.md)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/app/globals.css` | Modify | CSS-Variablen aus elyo.css hinzufügen, @import entfernen |
| `tailwind.config.ts` | Modify | `elyo-green/amber`-Farbskalen + fontFamily mit CSS-Vars |
| `src/app/layout.tsx` | Modify | `next/font/google` für Fraunces + DM Sans |
| `src/app/partner/login/page.tsx` | Rewrite | Client-Component mit Split-Layout (Brand-Panel + Form) |
| `src/app/partner/login/partner-login.module.css` | Create | Verbatim aus `partner-login.html <style>` |
| `src/app/(app)/dashboard/page.tsx` | Rewrite | Server-Component mit Prisma-Queries |
| `src/app/(app)/dashboard/DashboardClient.tsx` | Create | Client-Component mit Recharts + Framer |
| `src/app/(app)/dashboard/mitarbeiter.module.css` | Create | Verbatim aus `mitarbeiter.html <style>` |
| `src/app/(company)/company/dashboard/page.tsx` | Rewrite | Server-Component mit Aggregations |
| `src/app/(company)/company/dashboard/TrendChartClient.tsx` | Create | Client-Component mit Recharts Line-Chart |
| `src/app/(company)/company/dashboard/unternehmen.module.css` | Create | Verbatim aus `unternehmen.html <style>` |

---

## Task 1: Design-Token-Foundation

Etabliert Design-Tokens global. Kein UI-Output in dieser Task — Fundament für Tasks 2-4.

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Erweitere `src/app/globals.css`**

Öffne die Datei und ersetze Zeile 1 (der `@import url("https://fonts.googleapis.com/...")`) durch nichts (die komplette Zeile entfernen — Fonts kommen aus `next/font`).

Im `@layer base { :root { ... } }`-Block (aktuell Zeilen 7-33) füge die ELYO-Tokens ein. Der Block wird so aussehen:

```css
@layer base {
  :root {
    /* Existing shadcn tokens — unchanged */
    --background: 40 20% 97%;
    --foreground: 200 25% 10%;
    --card: 0 0% 100%;
    --card-foreground: 200 25% 10%;
    --popover: 0 0% 100%;
    --popover-foreground: 200 25% 10%;
    --primary: 173 75% 39%;
    --primary-foreground: 0 0% 100%;
    --secondary: 173 20% 93%;
    --secondary-foreground: 173 40% 20%;
    --muted: 40 15% 93%;
    --muted-foreground: 200 10% 48%;
    --accent: 173 30% 90%;
    --accent-foreground: 173 60% 20%;
    --destructive: 0 72% 56%;
    --destructive-foreground: 0 0% 100%;
    --border: 200 15% 88%;
    --input: 200 15% 88%;
    --ring: 173 75% 39%;
    --radius: 0.875rem;
    --sidebar-bg: #0a1f1c;
    --sidebar-text: rgba(255,255,255,0.6);
    --sidebar-text-active: #ffffff;
    --sidebar-active-bg: rgba(20, 184, 166, 0.18);

    /* ELYO Design System Tokens (aus elyo-design/elyo.css) */
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
  }
```

Der Rest der Datei (body-Style, scrollbar, layer utilities) bleibt unverändert. Entferne die Zeile `font-family: 'DM Sans', system-ui, sans-serif;` aus dem `body`-Block und ersetze durch `font-family: var(--font-body), system-ui, sans-serif;`.

- [ ] **Step 2: Erweitere `tailwind.config.ts`**

Im `theme.extend.colors`-Objekt ergänze unter `elyo`, `sage`, `warm`, `amber` (vor `background` bei Zeile 73) zwei neue Farb-Skalen:

```typescript
        'elyo-green': {
          50:  '#EEF3F1',
          100: '#D6E3DD',
          200: '#9FBEB1',
          300: '#5C8574',
          500: '#1B4D3E',
          700: '#0F3329',
          900: '#07201A',
        },
        'elyo-amber': {
          50:  '#FBF3E5',
          100: '#F4DFB4',
          300: '#E0B565',
          500: '#C8913A',
          700: '#9A6A22',
        },
        'elyo-bg':      '#F7F6F2',
        'elyo-surface': '#FFFFFF',
        'elyo-line':    '#E6E2D6',
        'elyo-ink': {
          DEFAULT: '#1A1C1A',
          soft:    '#55584F',
          mute:    '#8E8F86',
        },
```

Ersetze den `fontFamily`-Block (Zeilen 12-15) durch:

```typescript
      fontFamily: {
        sans:    ['var(--font-body)', 'DM Sans', 'system-ui', 'sans-serif'],
        body:    ['var(--font-body)', 'DM Sans', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Fraunces', 'Georgia', 'serif'],
      },
```

- [ ] **Step 3: Modifiziere `src/app/layout.tsx`**

Ersetze den gesamten Inhalt durch:

```typescript
import type { Metadata, Viewport } from "next"
import { Fraunces, DM_Sans } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/shared/Providers"
import { ServiceWorkerRegistration } from "@/components/shared/ServiceWorkerRegistration"
import { InstallBanner } from "@/components/ui/InstallBanner"

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "ELYO — Employee Wellbeing",
  description: "Employee Wellbeing Platform — anonym, sicher, menschlich.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ELYO",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1B4D3E",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
        <InstallBanner />
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Run tests + TS check**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run && npx tsc --noEmit
```

Erwartet: 251 Tests passed, TS clean.

- [ ] **Step 5: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/app/globals.css tailwind.config.ts src/app/layout.tsx
git commit -m "$(cat <<'EOF'
feat: add ELYO design tokens + next/font for Fraunces + DM Sans

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Partner-Login Port (pilot 1, statisch)

Portiert `partner-login.html` pixel-perfect nach React. Submit-Logik aus bestehender Version bleibt.

**Files:**
- Create: `src/app/partner/login/partner-login.module.css`
- Rewrite: `src/app/partner/login/page.tsx`

**Voraussetzung:** Task 1 abgeschlossen.

- [ ] **Step 1: Extrahiere CSS aus Mockup**

Öffne `elyo-design/partner-login.html`. Suche den `<style>`-Block (beginnt bei Zeile ~8 mit `/* ================================================================`-Kommentar, endet vor `</style>` vor dem `</head>`-Tag).

Kopiere den kompletten Inhalt des `<style>`-Blocks (zwischen `<style>` und `</style>`, exklusive der Tags selbst) in eine neue Datei `src/app/partner/login/partner-login.module.css`.

**WICHTIG — Zwei Modifikationen am kopierten CSS:**

(a) Entferne falls vorhanden jede Zeile, die mit `@import url(` beginnt (Fonts kommen global aus `layout.tsx`).

(b) CSS-Modules erfordern globale CSS-Var-Referenzen wie `var(--elyo-green-500)` funktionieren ohne Änderung (CSS-Vars sind globaler Scope).

Verify nach dem Extrahieren: `wc -l src/app/partner/login/partner-login.module.css` sollte zwischen 300-500 Zeilen liegen.

- [ ] **Step 2: Rewrite `src/app/partner/login/page.tsx`**

Öffne `elyo-design/partner-login.html` und identifiziere den HTML-Body-Block (zwischen `<body>` und `</body>`). Der Body enthält die visuelle Struktur (login-shell > brand-panel + form-panel mit Form).

Ersetze den kompletten Inhalt von `src/app/partner/login/page.tsx` durch:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './partner-login.module.css'

export default function PartnerLoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/partner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        router.push('/partner/dashboard')
        return
      }
      const data = await res.json()
      setError(data.error === 'rate_limited' ? 'Zu viele Versuche.' : 'E-Mail oder Passwort falsch.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles['login-shell']}>
      {/* === Linke Seite: Brand-Panel === */}
      <aside className={styles['brand-panel']}>
        <header className={styles['brand-head']}>
          <div className={styles['logo-mark']}>E</div>
          <span className={styles['brand-name']}>ELYO</span>
          <span className={styles['brand-sub']}>PARTNER</span>
        </header>

        <section className={styles['brand-hero']}>
          {/* Kopiere hier Inhalte 1:1 aus partner-login.html body > .brand-panel > .brand-hero:
              - span.brand-kicker mit Text
              - h1 mit Headline
              - p mit Description
              - .benefits-list mit items */}
        </section>

        <footer className={styles['brand-trust']}>
          {/* Kopiere .brand-trust-Inhalt aus dem Mockup */}
        </footer>
      </aside>

      {/* === Rechte Seite: Login-Form === */}
      <main className={styles['form-panel']}>
        <div className={styles['form-card']}>
          <h2>{/* Headline aus Mockup */}</h2>
          <p>{/* Subtext aus Mockup */}</p>

          <form onSubmit={onSubmit}>
            <div className={styles['field']}>
              <label htmlFor="partner-email">E-Mail-Adresse</label>
              <input
                id="partner-email"
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className={styles['field']}>
              <label htmlFor="partner-password">Passwort</label>
              <input
                id="partner-password"
                required
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {error && <p className={styles['form-error']}>{error}</p>}

            <button type="submit" disabled={loading} className={styles['submit-btn']}>
              {loading ? 'Login läuft …' : 'Einloggen'}
            </button>
          </form>

          <p className={styles['form-footer']}>
            Noch kein Partner? <a href="/partner/register">Registrieren →</a>
          </p>
        </div>
      </main>
    </div>
  )
}
```

**Wichtig — JSX-Anpassungs-Regel:** Die exakten Tags, Kommentar-Platzhalter in `{/* ... */}` und `className`-Werte müssen durch den HTML-Body aus `partner-login.html` ergänzt werden. Für jedes CSS-Modul-Klasse-Name aus dem `<style>`-Block: in JSX als `styles['original-class-name']` referenzieren. BEM-Selektoren wie `.brand-hero h1` funktionieren automatisch — kein spezielles Mapping nötig. Falls die `.form-card` im Mockup kein explizites `form-error` hat, orientiere dich am visuellen Kontext (rote Farbe unter dem Form).

Falls eine Klasse fehlt oder die Struktur nicht klar ist → implementer darf den Mockup-HTML lesen und JSX daraus 1:1 ableiten.

- [ ] **Step 3: Verify Dev-Server rendert ohne Fehler**

Starte Dev-Server (wenn nicht bereits laufend): `npm run dev`. Öffne `http://localhost:3000/partner/login`. Erwartet: Split-Layout, links grüner Gradient-Panel mit Logo + Headline + Benefits, rechts Login-Form.

Smoke-Test via Curl:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/partner/login
```
Erwartet: 200.

- [ ] **Step 4: Run tests + TS check**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run && npx tsc --noEmit
```

Erwartet: 251 Tests passed, TS clean.

- [ ] **Step 5: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add src/app/partner/login/
git commit -m "$(cat <<'EOF'
feat: port partner-login mockup pixel-perfect (split-layout + CSS module)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Mitarbeiter-Dashboard Port (pilot 2, mit echten Daten)

Portiert `mitarbeiter.html` nach React als Server-Component mit Prisma-Queries. Recharts in Client-Wrapper.

**Files:**
- Create: `src/app/(app)/dashboard/mitarbeiter.module.css`
- Create: `src/app/(app)/dashboard/DashboardClient.tsx`
- Rewrite: `src/app/(app)/dashboard/page.tsx`

**Voraussetzung:** Task 1 + 2 abgeschlossen.

- [ ] **Step 1: Extrahiere CSS aus Mockup**

Extrahiere analog zu Task 2: öffne `elyo-design/mitarbeiter.html`, kopiere den kompletten `<style>`-Block-Inhalt in die neue Datei `src/app/(app)/dashboard/mitarbeiter.module.css`.

Entferne `@import url(...)`-Zeilen. Verify mit `wc -l` (~400-500 Zeilen erwartet).

- [ ] **Step 2: Erstelle `src/app/(app)/dashboard/DashboardClient.tsx`**

Dies ist die Client-Component für Recharts-Interaktivität. Server-Component übergibt ihr Daten als Props.

```typescript
'use client'

import { motion } from 'framer-motion'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import styles from './mitarbeiter.module.css'

export interface DashboardData {
  greeting: string
  userName: string
  streak: number
  hasCheckinToday: boolean
  score: number | null
  scoreHistory: Array<{ day: string; score: number }>
  metrics: { energy: number | null; mood: number | null; stress: number | null }
  level: { current: string; total: number; threshold: number; nextLevel: string | null }
  privileges: Array<{ id: string; label: string; locked: boolean }>
  partners: Array<{ id: string; name: string; type: string; city: string | null }>
  surveys: Array<{ id: string; title: string; minutes: number }>
}

export function DashboardClient({ data }: { data: DashboardData }) {
  const { greeting, userName, streak, hasCheckinToday, score, scoreHistory, metrics, level, privileges, partners, surveys } = data

  // JSX-Struktur folgt der mitarbeiter.html body 1:1.
  // Ersetze alle hardcoded Werte ("Sarah", "72", "14") durch {greeting}, {userName}, {score}, {streak} etc.
  //
  // Kritische Punkte für den Implementer:
  // - Der Sparkline-SVG im Mockup wird durch <ResponsiveContainer><LineChart data={scoreHistory}>...</LineChart></ResponsiveContainer> ersetzt
  // - score === null → zeige "–" statt Zahl + setze Gauge-Prozentwert auf 0
  // - streak === 0 → Streak-Badge verbergen
  // - hasCheckinToday === true → Check-in-CTA wird zu "✓ Heute erledigt"-Badge
  // - level.threshold === 0 → Next-Level-Text verbergen (wir sind auf PLATINUM)
  // - partners.length === 0 → "Bald mehr Partner in deiner Region" als Empty-State
  // - surveys.length === 0 → Umfragen-Section komplett ausblenden
  //
  // Motion.div-Wrapper für Stagger-Animation bleibt wie im Mockup.

  return (
    <motion.div className={styles['dashboard-root']} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header: Greeting + Streak + Check-in-CTA */}
      <section className={styles['hero']}>
        <p className={styles['hero-kicker']}>{greeting}</p>
        <h1 className={styles['hero-title']}>{userName}</h1>
        {streak > 0 && (
          <span className={styles['streak-badge']}>🔥 {streak} Tage</span>
        )}
        {hasCheckinToday ? (
          <span className={styles['checkin-done']}>✓ Heute erledigt</span>
        ) : (
          <a href="/checkin" className={styles['checkin-cta']}>Zum Check-in →</a>
        )}
      </section>

      {/* Vitalitäts-Score-Card */}
      <section className={styles['score-card']}>
        {/* Gauge (SVG-basiert aus Mockup) — Inner-SVG aus mitarbeiter.html kopieren */}
        {/* Value-Anzeige */}
        <span className={styles['score-value']}>{score ?? '–'}</span>
        <span className={styles['score-unit']}>/100</span>

        {/* Metrik-Chips */}
        <div className={styles['metric-chips']}>
          <div className={styles['chip']}>
            <span className={styles['chip-label']}>Energie</span>
            <span className={styles['chip-value']}>{metrics.energy ?? '–'}</span>
          </div>
          <div className={styles['chip']}>
            <span className={styles['chip-label']}>Stimmung</span>
            <span className={styles['chip-value']}>{metrics.mood ?? '–'}</span>
          </div>
          <div className={styles['chip']}>
            <span className={styles['chip-label']}>Belastung</span>
            <span className={styles['chip-value']}>{metrics.stress ?? '–'}</span>
          </div>
        </div>

        {/* Sparkline */}
        {scoreHistory.length > 0 && (
          <div className={styles['sparkline']}>
            <ResponsiveContainer width="100%" height={60}>
              <LineChart data={scoreHistory}>
                <XAxis dataKey="day" hide />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="var(--elyo-green-500)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Level-Card */}
      <section className={styles['level-card']}>
        <span className={styles['level-current']}>{level.current}</span>
        {level.nextLevel && (
          <>
            <div className={styles['level-progress']}>
              <div className={styles['level-progress-fill']} style={{ width: `${Math.min(100, (level.total / level.threshold) * 100)}%` }} />
            </div>
            <p className={styles['level-next']}>Nächstes Level: {level.nextLevel}</p>
          </>
        )}

        <ul className={styles['privileges-list']}>
          {privileges.map(p => (
            <li key={p.id} className={p.locked ? styles['priv-locked'] : styles['priv-unlocked']}>
              {p.locked ? '🔒 ' : '✓ '}{p.label}
            </li>
          ))}
        </ul>
      </section>

      {/* Partner-Carousel */}
      <section className={styles['partners-section']}>
        <h2>Partner in deiner Nähe</h2>
        {partners.length === 0 ? (
          <p className={styles['empty-state']}>Bald mehr Partner in deiner Region.</p>
        ) : (
          <div className={styles['partner-carousel']}>
            {partners.map(p => (
              <div key={p.id} className={styles['partner-card']}>
                <p className={styles['partner-name']}>{p.name}</p>
                <p className={styles['partner-meta']}>{p.type === 'DIGITAL' ? 'digital' : (p.city ?? 'vor Ort')}</p>
                <span className={styles['partner-verified']}>ELYO Verified</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Offene Umfragen */}
      {surveys.length > 0 && (
        <section className={styles['surveys-section']}>
          <h2>Offene Umfragen <span className={styles['surveys-count']}>{surveys.length}</span></h2>
          <ul>
            {surveys.map(s => (
              <li key={s.id} className={styles['survey-item']}>
                <span>{s.title}</span>
                <span className={styles['survey-minutes']}>{s.minutes} Min.</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </motion.div>
  )
}
```

**Hinweis zum Implementer:** Der obige JSX-Code ist eine strukturelle Vorlage. Die konkreten Klassen-Namen (`hero`, `score-card`, etc.) müssen mit denen im tatsächlichen CSS-Modul aus Step 1 übereinstimmen. Wenn die Mockup-CSS andere Klassen verwendet (z. B. `.hero-section` statt `.hero`), passe die `styles[...]`-Keys an das tatsächliche CSS-Modul an. Lies dazu `mitarbeiter.module.css` aus Step 1 und gleiche ab.

- [ ] **Step 3: Rewrite `src/app/(app)/dashboard/page.tsx`**

Ersetze den kompletten Inhalt durch eine Server-Component mit allen Data-Fetches:

```typescript
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateStreak, getPrivileges, LEVEL_THRESHOLDS, type Level } from '@/lib/points'
import { DashboardClient, type DashboardData } from './DashboardClient'

const DAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}

function nextLevelOf(current: Level): Level | null {
  const order: Level[] = ['STARTER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM']
  const idx = order.indexOf(current)
  return idx < order.length - 1 ? order[idx + 1] : null
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')
  if (session.user.role !== 'EMPLOYEE') redirect('/company/dashboard')

  const userId = session.user.id

  // Today-Key für Check-in-Prüfung
  const today = new Date()
  const todayKey = today.toISOString().slice(0, 10)

  // 7 Tage zurück für Score-History
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [userPoints, entries, todayEntry, partnersRaw, activeSurveys, userResponses, streak] = await Promise.all([
    prisma.userPoints.findUnique({ where: { userId } }),
    prisma.wellbeingEntry.findMany({
      where: { userId, createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.wellbeingEntry.findFirst({
      where: { userId, periodKey: todayKey },
    }),
    prisma.partner.findMany({
      where: { verificationStatus: 'VERIFIED' },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, name: true, type: true, city: true },
    }),
    prisma.survey.findMany({
      where: { companyId: session.user.companyId, status: 'ACTIVE' },
      select: { id: true, title: true },
    }),
    prisma.surveyResponse.findMany({
      where: { userId },
      select: { surveyId: true },
    }),
    calculateStreak(userId),
  ])

  const answeredSurveyIds = new Set(userResponses.map(r => r.surveyId))
  const openSurveys = activeSurveys.filter(s => !answeredSurveyIds.has(s.id))

  const avg = (arr: number[]) => arr.length === 0 ? null : Math.round((arr.reduce((s, n) => s + n, 0) / arr.length) * 10) / 10

  const moods   = entries.map(e => e.mood)
  const stresss = entries.map(e => e.stress)
  const energys = entries.map(e => e.energy)
  const scores  = entries.map(e => e.score)

  const avgScore = avg(scores)
  const currentLevel = (userPoints?.level ?? 'STARTER') as Level
  const total = userPoints?.total ?? 0
  const nextLevel = nextLevelOf(currentLevel)
  const nextThreshold = nextLevel ? LEVEL_THRESHOLDS[nextLevel] : LEVEL_THRESHOLDS.PLATINUM

  const data: DashboardData = {
    greeting: getGreeting(),
    userName: session.user.name ?? session.user.email ?? 'Mitarbeiter',
    streak,
    hasCheckinToday: !!todayEntry,
    score: avgScore === null ? null : Math.round(avgScore * 10),
    scoreHistory: entries.map(e => ({
      day: DAY_LABELS[new Date(e.createdAt).getDay()],
      score: Math.round(e.score * 10),
    })),
    metrics: {
      energy: avg(energys),
      mood:   avg(moods),
      stress: avg(stresss),
    },
    level: {
      current: currentLevel,
      total,
      threshold: nextThreshold,
      nextLevel,
    },
    privileges: getPrivileges(currentLevel).map(p => ({
      id: p.id,
      label: p.label,
      locked: p.locked,
    })),
    partners: partnersRaw,
    surveys: openSurveys.map(s => ({
      id: s.id,
      title: s.title,
      minutes: 3, // statischer Schätzwert; Backend hat kein time-estimate
    })),
  }

  return <DashboardClient data={data} />
}
```

- [ ] **Step 4: Verify Dev-Server rendert**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Cookie: <valid-session-cookie>" http://localhost:3000/dashboard
```

Curl ohne Session → 307 (Redirect zu Login). Erwartet-Korrekt: alle Paths rendern, kein 500.

Manueller Browser-Test: Login als `mitarbeiter1@demo.de` / `demo1234`, `/dashboard` sollte den neuen Layout-Stil zeigen mit echten Seed-Daten.

- [ ] **Step 5: Run tests + TS check**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run && npx tsc --noEmit
```

Erwartet: 251 Tests passed, TS clean.

- [ ] **Step 6: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add "src/app/(app)/dashboard/"
git commit -m "$(cat <<'EOF'
feat: port mitarbeiter-dashboard mockup with real-data bindings

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Unternehmen-Dashboard Port (pilot 3, mit Aggregations-Daten)

Portiert `unternehmen.html` nach React als Server-Component mit `anonymize.ts`-Aggregationen.

**Files:**
- Create: `src/app/(company)/company/dashboard/unternehmen.module.css`
- Create: `src/app/(company)/company/dashboard/TrendChartClient.tsx`
- Rewrite: `src/app/(company)/company/dashboard/page.tsx`

**Voraussetzung:** Task 1 + 2 + 3 abgeschlossen.

- [ ] **Step 1: Extrahiere CSS aus Mockup**

Öffne `elyo-design/unternehmen.html`, kopiere den `<style>`-Block-Inhalt in die neue Datei `src/app/(company)/company/dashboard/unternehmen.module.css`. Entferne `@import url(...)`. Verify mit `wc -l` (~400 Zeilen erwartet).

- [ ] **Step 2: Erstelle `src/app/(company)/company/dashboard/TrendChartClient.tsx`**

```typescript
'use client'

import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'

export function TrendChartClient({ data }: { data: Array<{ period: string; vitalityIndex: number }> }) {
  if (data.length === 0) {
    return <p style={{ padding: 24, textAlign: 'center', color: 'var(--elyo-ink-mute)' }}>Noch keine Daten — Trend erscheint nach den ersten Check-ins.</p>
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--elyo-line)" />
        <XAxis dataKey="period" stroke="var(--elyo-ink-mute)" />
        <YAxis domain={[0, 100]} stroke="var(--elyo-ink-mute)" />
        <Tooltip contentStyle={{ background: 'white', border: '1px solid var(--elyo-line)', borderRadius: 8 }} />
        <Line type="monotone" dataKey="vitalityIndex" stroke="var(--elyo-green-500)" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 3: Rewrite `src/app/(company)/company/dashboard/page.tsx`**

Ersetze den kompletten Inhalt durch:

```typescript
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAggregatedMetrics, getTrendData } from '@/lib/anonymize'
import { TrendChartClient } from './TrendChartClient'
import styles from './unternehmen.module.css'

function currentPeriodKey(): string {
  // Weekly periodKey — matches the seed.ts weekKey convention
  const now = new Date()
  const year = now.getFullYear()
  const start = new Date(year, 0, 1)
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export default async function CompanyDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')
  if (session.user.role !== 'COMPANY_ADMIN' && session.user.role !== 'COMPANY_MANAGER') {
    redirect('/dashboard')
  }

  const companyId = session.user.companyId
  if (!companyId) redirect('/auth/login')

  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } })

  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const [totalUsers, activeUsers, periodMetrics, trendRaw, teamsRaw] = await Promise.all([
    prisma.user.count({ where: { companyId, isActive: true } }),
    prisma.user.count({ where: { companyId, isActive: true, lastLoginAt: { gte: fourteenDaysAgo } } }),
    getAggregatedMetrics(companyId, currentPeriodKey()),
    getTrendData(companyId, 12),
    prisma.team.findMany({
      where: { companyId },
      include: { _count: { select: { members: true } } },
    }),
  ])

  // Compute per-team aggregations (respecting anonymity threshold)
  const teamAggs = await Promise.all(teamsRaw.map(async (t) => {
    const entries = await prisma.wellbeingEntry.findMany({
      where: { companyId, user: { teamId: t.id }, periodKey: currentPeriodKey() },
      select: { mood: true, stress: true, energy: true, score: true },
    })
    const n = entries.length
    if (n < company.anonymityThreshold) {
      return { id: t.id, name: t.name, memberCount: t._count.members, participation: 0, vitality: null, avgStress: null, hidden: true }
    }
    const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length
    return {
      id: t.id,
      name: t.name,
      memberCount: t._count.members,
      participation: Math.round((n / Math.max(1, t._count.members)) * 100),
      vitality: Math.round(avg(entries.map(e => e.score)) * 10),
      avgStress: Math.round(avg(entries.map(e => e.stress)) * 10) / 10,
      hidden: false,
    }
  }))

  const visibleTeams = teamAggs.filter(t => !t.hidden)
  const hiddenCount = teamAggs.filter(t => t.hidden).length

  // At-Risk: avgStress >= 7.0, top 2
  const atRisk = visibleTeams
    .filter(t => t.avgStress !== null && t.avgStress >= 7.0)
    .sort((a, b) => (b.avgStress ?? 0) - (a.avgStress ?? 0))
    .slice(0, 2)

  const kpis = {
    vitalityIndex: periodMetrics ? Math.round(periodMetrics.vitalityIndex * 10) : null,
    activeUsers,
    totalUsers,
    avgEnergy: periodMetrics ? Math.round(periodMetrics.avgEnergy * 10) / 10 : null,
    sickDays: null, // Backend hat kein Feld dafür
  }

  const trendData = trendRaw.map(t => ({
    period: t.period,
    vitalityIndex: Math.round(t.vitalityIndex * 10),
  }))

  // JSX-Struktur folgt der unternehmen.html body 1:1
  return (
    <div className={styles['dash-root']}>
      <header className={styles['dash-header']}>
        <h1>{company.name}</h1>
        <p className={styles['dash-subtitle']}>Vitalitäts-Übersicht · {totalUsers} Mitarbeiter</p>
      </header>

      {/* KPI-Kacheln */}
      <section className={styles['kpi-row']}>
        <div className={styles['kpi-card']}>
          <p className={styles['kpi-label']}>Vitalitäts-Index</p>
          <p className={styles['kpi-value']}>{kpis.vitalityIndex ?? '–'}<span>/100</span></p>
        </div>
        <div className={styles['kpi-card']}>
          <p className={styles['kpi-label']}>Aktive Nutzer</p>
          <p className={styles['kpi-value']}>{kpis.activeUsers}/{kpis.totalUsers}</p>
        </div>
        <div className={styles['kpi-card']}>
          <p className={styles['kpi-label']}>Ø Energie diese Woche</p>
          <p className={styles['kpi-value']}>{kpis.avgEnergy ?? '–'}</p>
        </div>
        <div className={styles['kpi-card']}>
          <p className={styles['kpi-label']}>Krankheitstage</p>
          <p className={styles['kpi-value']}>–</p>
          <p className={styles['kpi-meta']}>Nicht erfasst</p>
        </div>
      </section>

      {/* At-Risk-Radar */}
      <section className={styles['at-risk-section']}>
        {atRisk.length === 0 ? (
          <div className={styles['at-risk-ok']}>
            ✓ Keine Teams im At-Risk-Bereich
          </div>
        ) : (
          <>
            <div className={styles['at-risk-alert']}>⚠️ {atRisk.length} Team(s) mit erhöhten Belastungsindikatoren</div>
            <div className={styles['at-risk-grid']}>
              {atRisk.map(t => (
                <div key={t.id} className={styles['at-risk-card']}>
                  <p className={styles['at-risk-name']}>{t.name}</p>
                  <p className={styles['at-risk-meta']}>
                    Belastung: {t.avgStress} · {t.memberCount} Mitarbeiter · Partizipation {t.participation}%
                  </p>
                  <a href="/company/measures" className={styles['at-risk-cta']}>Maßnahme vorschlagen →</a>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Trend-Chart */}
      <section className={styles['trend-section']}>
        <h2>Vitalitäts-Trend (12 Wochen)</h2>
        <TrendChartClient data={trendData} />
      </section>

      {/* Team-Health-Tabelle */}
      <section className={styles['teams-section']}>
        <h2>Team-Übersicht</h2>
        {visibleTeams.length === 0 ? (
          <p className={styles['empty-state']}>Keine Teams mit ausreichend Daten.</p>
        ) : (
          <table className={styles['teams-table']}>
            <thead>
              <tr>
                <th>Team</th>
                <th>Mitglieder</th>
                <th>Partizipation</th>
                <th>Vitalität</th>
              </tr>
            </thead>
            <tbody>
              {visibleTeams.map(t => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.memberCount}</td>
                  <td>{t.participation}%</td>
                  <td>{t.vitality ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {hiddenCount > 0 && (
          <p className={styles['teams-hidden']}>
            Weitere {hiddenCount} Team(s) mit &lt; {company.anonymityThreshold} Einträgen werden zum Schutz der Anonymität nicht angezeigt.
          </p>
        )}
      </section>

      {/* Quick Actions */}
      <section className={styles['quick-actions']}>
        <a href="/company/reports">📄 ESG-Report exportieren</a>
        <a href="/company/surveys">📝 Neue Umfrage</a>
        <a href="/company/teams">👥 Teams verwalten</a>
        <a href="/company/measures">🎯 Maßnahmen-Hub</a>
      </section>

      <footer className={styles['anonymity-footer']}>
        Alle Analysen basieren auf anonymisierten Aggregatdaten · mind. {company.anonymityThreshold} Einträge pro Team
      </footer>
    </div>
  )
}
```

**Hinweis zum Implementer:** Wie in Task 3 — die `styles[...]`-Keys müssen mit dem tatsächlichen CSS-Modul-Inhalt übereinstimmen. Falls `anonymize.ts` andere Funktions-Signaturen hat als `getAggregatedMetrics(companyId, periodKey)` oder `getTrendData(companyId, weeks)`, prüfe den tatsächlichen Export und passe den Aufruf an. Fallback: eigene Team-Aggregation ist explizit im Code, da `anonymize.ts` evtl. kein pre-built team-breakdown hat.

- [ ] **Step 4: Verify Dev-Server**

Browser-Test als `admin@demo.de` / `demo1234` → `/company/dashboard`. Erwartet: KPI-Kacheln, At-Risk-Radar (grün oder Team-Karten), Trend-Chart, Team-Tabelle, Quick-Actions.

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/company/dashboard
```
→ 307 (Login-Redirect ohne Session).

- [ ] **Step 5: Run tests + TS check**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core" && npx vitest run && npx tsc --noEmit
```

Erwartet: 251 Tests passed, TS clean.

- [ ] **Step 6: Commit**

```bash
cd "/Users/marcsund/Documents/VS Code/hello-world/ClaudeCode/elyo-core"
git add "src/app/(company)/company/dashboard/"
git commit -m "$(cat <<'EOF'
feat: port unternehmen-dashboard mockup with aggregated data bindings

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Completion Checklist

Nach Task 4:

- [ ] `npx vitest run` — 251 Tests passed
- [ ] `npx tsc --noEmit` — keine Fehler
- [ ] 4 neue Commits auf `main`
- [ ] `/partner/login` rendert Split-Layout mit Brand-Panel + Form (visueller Vergleich zu `partner-login.html`)
- [ ] `/dashboard` rendert (eingeloggt als EMPLOYEE) mit Score-Gauge, Sparkline, Metrik-Chips, Partner-Carousel (3 Seed-Partner), offene Umfragen
- [ ] `/company/dashboard` rendert (eingeloggt als COMPANY_ADMIN) mit KPIs, At-Risk-Radar, Trend-Chart, Team-Tabelle
- [ ] Font im Browser-DevTools ist Fraunces (Display) + DM Sans (Body), nicht System-Default
- [ ] CSS-Custom-Props `--elyo-green-500` im DevTools-Inspector auf `:root` sichtbar

Nachdem alle Tasks fertig sind: Nutze `superpowers:finishing-a-development-branch` zum Abschließen.

**Bekannte Deferred Items:**
- Andere Seiten (Checkin, Level, Partners-Liste, Admin-Panel, Partner-Portal-Register/Dashboard/Documents) nutzen das neue Design-System nicht. Port in separater Spec.
- `ScoreGauge`, `MetricChip`, `LevelBadge` (Tailwind-Komponenten aus Phase 0) werden von den neuen Dashboards nicht mehr genutzt. Bleiben für andere Seiten erhalten.
- Body-Font-Wechsel auf DM Sans via next/font ist global — alle bestehenden Seiten sehen leicht anders aus. Beabsichtigt (Konsistenz).
