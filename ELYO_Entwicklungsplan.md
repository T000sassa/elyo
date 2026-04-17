# ELYO – Vollständiger Entwicklungsplan
### Produktstrategie · Architektur · Claude Code Prompts

---

## ZUSAMMENFASSUNG: Was ELYO ist

ELYO ist eine **datengetriebene HR-Steuerungsplattform mit persönlichem Gesundheitsbegleiter und kuratiertem Experten-Netzwerk** – unter einer Marke, für zwei Stakeholder.

**Unternehmensseite (zahlt):** Anonymisierte Vitalitäts-KPIs, Risiko-Alerts, Maßnahmen-Steuerung, ESG-Reporting.
**Mitarbeiterseite (nutzt täglich):** Persönliches Dashboard, Datenerfassung, Gamification, Partner-Netzwerk, Privileges.
**Partner-Netzwerk (bindet das Ökosystem):** Qualifizierte lokale und digitale Anbieter, buchbar via App, bewertet von Nutzern.

### Regulatorische Grundregel (nicht verhandelbar)
ELYO aggregiert, visualisiert und erinnert. ELYO diagnostiziert nicht, therapiert nicht, empfiehlt keine Behandlungen. Wording immer: „Muster", „Indikatoren", „Signale" – niemals „Diagnose", „Symptome", „Behandlung".

---

## ARCHITEKTUR-ÜBERSICHT

```
ELYO (eine Marke, eine App)
│
├── ROLLE: EMPLOYEE
│   ├── Dashboard (persönlicher Vitalitäts-Score)
│   ├── Check-in (Mood / Energie / Belastung)
│   ├── Profil & Anamnese (progressiv aufgebaut)
│   ├── Datenquellen (Wearables, Blutwerte, Apps)
│   ├── Partner-Map (lokale & digitale Angebote)
│   ├── Level & Privileges (Gamification)
│   └── Umfragen
│
├── ROLLE: COMPANY_ADMIN / MANAGER
│   ├── KPI-Dashboard (Vitalitäts-Index, anonymisiert)
│   ├── At-Risk-Radar (Team-Belastungsmuster)
│   ├── Maßnahmen-Hub (Interventionen auslösen)
│   ├── ESG-Report (CSV + PDF-Export)
│   ├── Umfrageverwaltung
│   └── Team & User Management
│
└── ROLLE: PARTNER (eigenes Portal)
    ├── Profil & Angebote pflegen
    ├── Verfügbarkeit / Buchungslink
    ├── ELYO-Verified Badge (nach Prüfung)
    └── Analytics (Zugriffe, Reviews)

Daten-Trennung:
  Employee-Rohdaten → niemals im Admin sichtbar
  Admin sieht → nur aggregierte Werte (min. N Einträge)
  Partner sieht → nur eigene Buchungs- und Review-Daten
```

---

## ENTWICKLUNGSPHASEN

```
PHASE 0  →  PHASE 1  →  PHASE 2  →  PHASE 3
Visuelle     MVP mit      Partner-     Skalierung
Shell        Kernfunktion Ökosystem    & Monetar.
(2 Wochen)  (6 Wochen)   (8 Wochen)   (laufend)
```

---

# PHASE 0: VISUELLE SHELL
## „Zeigbar in Kundengesprächen – sofort"
**Ziel:** Eine vollständig gestaltete, klickbare Oberfläche ohne echtes Backend. Dient zur Validierung in Kundengesprächen, Investorenpräsentationen und als Design-Anker für alle weiteren Entwicklungen.

**Ergebnis:** Next.js-App mit Hard-coded Mockdata, vollständigem Design-System, allen 3 Rollen navigierbar.

---

### PROMPT 0.1 – Design System & Globale Shell

```
Du bist Senior UI Engineer. Erstelle das Design System und die globale App-Shell für "ELYO" – eine moderne B2B-Health-Plattform.

MARKEN-RICHTUNG:
- Gefühl: Medizinisch vertrauenswürdig, aber menschlich und warm. Kein kaltes Klinik-Weiß, kein aggressives Startup-Neon.
- Ästhetik: "Refined Health Tech" – präzise, aufgeräumt, mit organischen Akzenten
- Primärfarbe: Tiefes Schiefergrün (#1B4D3E oder ähnlich) als Hauptfarbe
- Akzentfarbe: Warmes Bernstein/Gold für CTAs und Gamification-Elemente
- Hintergrund: Off-White (#F7F6F2) – kein reines Weiß
- Typografie: Display-Font: "Fraunces" (Google Fonts, organisch-charaktervoll), Body: "DM Sans" (klar, modern)
- Keine generischen Inter/Roboto-Fonts

TECH STACK:
- Next.js 14 App Router, TypeScript
- Tailwind CSS mit custom theme extension
- Radix UI für zugängliche Basis-Komponenten
- Framer Motion für Animationen

ERSTELLE:
1. tailwind.config.ts mit vollständigem ELYO-Design-Token-Set:
   - Farben: elyo-green (5 Abstufungen), elyo-amber (5 Abstufungen), neutrals
   - Typografie: fontFamily für display + body
   - borderRadius, shadows, spacing-Erweiterungen

2. src/components/layout/AppShell.tsx:
   - Sidebar-Navigation (kollabierbar, Desktop)
   - Bottom-Navigation (Mobile)
   - Header mit User-Avatar, Rollen-Badge, Notifications-Icon
   - Rolle wird via Props übergeben: 'employee' | 'admin' | 'partner'
   - Navigation-Items ändern sich je nach Rolle automatisch

3. src/components/ui/ (Basis-Komponenten):
   - Button (variants: primary, secondary, ghost, danger)
   - Card (mit optionalem Header, Footer, Hover-State)
   - Badge (für Level-System: STARTER | BRONZE | SILVER | GOLD | PLATINUM)
   - MetricChip (Zahl + Label + Trend-Pfeil)
   - ScoreGauge (SVG-basierter Halbkreis-Gauge, animiert)
   - ProgressBar (mit Label und Milestone-Markers)

4. src/app/layout.tsx mit Font-Integration und globalen CSS-Variablen

QUALITÄTSANSPRUCH:
- Jede Komponente muss "Kundengespräch-würdig" sein
- Animationen: subtil, nie übertrieben (Framer Motion, 200-300ms ease)
- Dark Mode vorbereiten (CSS Variables), aber nicht aktivieren
- Mobile-first, responsive
```

---

### PROMPT 0.2 – Employee Dashboard (Mockup)

```
Du baust die Employee-Hauptansicht für ELYO. Nutze das Design System aus Prompt 0.1.

DATEI: src/app/(app)/dashboard/page.tsx

MOCK-DATEN (hardcoded, kein API-Call):
- Nutzer: "Sarah M.", Level: SILVER, Score: 72/100
- Streak: 14 Tage
- Letzte 7 Check-ins: [68, 71, 65, 74, 70, 72, 72]
- Nächstes Level: GOLD, Fortschritt: 65%
- 2 offene Umfragen
- 3 Partner in der Nähe

SEITENAUFBAU (von oben nach unten):

1. HERO-BEREICH (persönliche Begrüßung):
   - "Guten Morgen, Sarah 👋" (Tageszeit-abhängig, hardcoded)
   - Streak-Badge: "🔥 14 Tage" (animiertes Flackern)
   - Heutiger Check-in CTA wenn noch nicht erledigt (prominente Karte)

2. VITALITÄTS-SCORE:
   - Großer ScoreGauge: 72/100
   - Darunter: 3 Metrik-Chips (Energie: 7.2, Stimmung: 6.8, Belastung: 4.1)
   - Score-Verlauf: Mini-Linechart der letzten 7 Tage (Recharts)

3. LEVEL & PRIVILEGES CARD:
   - Aktuelles Level: SILVER Badge (in Bernstein-Farbe)
   - Progress zu GOLD: 65% Fortschrittsbalken
   - 3 freigeschaltete Privileges (Icons + Text):
     - ✓ Kostenlose Erstberatung (Ernährung)
     - ✓ 20% Rabatt bei Partner-Studios
     - ✓ Bevorzugter Terminzugang
   - Locked Privilege für GOLD: "⚡ Fast Lane zu Experten – noch 35% zu GOLD"

4. PARTNER IN DEINER NÄHE:
   - Horizontales Scroll-Karussell mit 3 Partner-Cards:
     Card-Inhalt: Logo-Placeholder, Name, Typ (Physiotherapie), Distanz, Rating (4.8⭐), ELYO-Verified Badge
   - "Alle anzeigen" Link

5. OFFENE UMFRAGEN:
   - 2 kompakte Umfrage-Cards mit "Jetzt ausfüllen" Button

ANIMATIONEN:
- Score-Gauge füllt sich beim Page-Load (1s ease-out)
- Progress-Bar füllt sich mit 300ms Delay
- Cards erscheinen gestaffelt (stagger 80ms via Framer Motion)

DESIGN-DETAILS:
- Score-Farbe: Grün wenn >70, Amber wenn 50-70, Rot wenn <50
- Privilege-Cards: Freigeschaltete in Vollfarbe, Locked ausgegraut mit Lock-Icon
```

---

### PROMPT 0.3 – Employee Check-in Flow

```
Erstelle den Check-in-Flow für ELYO-Mitarbeiter. Dies ist die meistgenutzte Funktion – sie muss in unter 30 Sekunden abgeschlossen sein und sich gut anfühlen.

DATEI: src/app/(app)/checkin/page.tsx + src/components/checkin/

FLOW (3 Schritte, kein Page-Reload):
Step 1 → Step 2 → Step 3 → Completion-Animation

STEP 1: "Wie geht's dir heute?"
- Großer, freundlicher Titel
- 3 Slider (keine Standard-HTML-Slider – custom designed):
  - "Energie" (1-10), Icons: 🪫 bis ⚡
  - "Stimmung" (1-10), Icons: 😔 bis 😄
  - "Belastung" (1-10, invertiert – niedrig ist gut), Icons: 😌 bis 🔥
- Slider: Pill-förmig, Thumb springt mit Animation, Wert erscheint groß über dem Thumb
- Farbe des Sliders ändert sich je nach Wert (grün/amber/rot)
- "Weiter" Button

STEP 2: "Optionale Notiz" (bewusst optional kommunizieren)
- Textarea: "Was beschäftigt dich heute? (optional)"
- Placeholder-Beispiele rotieren leicht: "Viel Meetings heute...", "Guter Start in den Tag", "Schlecht geschlafen..."
- Skip-Link prominent: "Überspringen →"
- "Check-in abschließen" Button

STEP 3: COMPLETION
- Konfetti-Animation (canvas-confetti library)
- Großes animiertes Checkmark (SVG, draw-on animation)
- "Check-in gespeichert! 🎉"
- Dein Score heute: [berechneter Wert animiert hochzählen]
- Streak-Update: "🔥 15 Tage – weiter so!"
- Subtile Nachricht: "Deine Daten sind anonym und sicher"
- CTA: "Zum Dashboard" 

TECHNISCHES:
- Zustandsverwaltung: React useState (kein Redux)
- Step-Transition: Framer Motion AnimatePresence (slide-in von rechts)
- Kein Formular-Submit – alles clientseitig (Phase 0 = Mockup)
- Mobile-optimiert: Slider per Touch bedienbar
```

---

### PROMPT 0.4 – Company Admin Dashboard (Mockup)

```
Erstelle das Company-Admin-Dashboard für ELYO. Zielgruppe: HR-Manager und C-Level. Muss auf den ersten Blick "professionell und datengetrieben" wirken.

DATEI: src/app/(app)/company/dashboard/page.tsx

MOCK-DATEN:
- Unternehmen: "Müller Maschinenbau GmbH", 347 Mitarbeiter
- Aktive Nutzer: 218 (63%)
- Unternehmens-Vitalitäts-Index: 71/100 (↑3 vs. Vormonat)
- 2 Teams im At-Risk-Bereich
- Letzter ESG-Export: vor 3 Tagen

SEITENAUFBAU:

1. KPI-LEISTE (4 Kacheln, prominente Zahlen):
   - Vitalitäts-Index: 71/100 (Trend +3)
   - Aktive Nutzer: 218/347 (63%)
   - Ø Energie diese Woche: 6.8
   - Krankheitstage (Vormonat): 24 (↓8%)
   Jede Kachel: große Zahl, kleines Label, Trend-Chip (grün/rot)

2. AT-RISK RADAR (auffälligste Sektion):
   - Roter Alert-Banner: "⚠️ 2 Teams zeigen erhöhte Belastungsindikatoren"
   - Team-Karten (2 Stück):
     - "Produktion – Halle 3": Belastungs-Index 8.2/10, 34 Mitarbeiter, Trend ↑
     - "IT / Entwicklung": Belastungs-Index 7.8/10, 12 Mitarbeiter, Trend →
   - Zu jeder Karte: "Maßnahme vorschlagen" Button (führt zu Maßnahmen-Hub)
   - Hinweis: "Alle Werte sind anonymisiert. Individualdaten sind nicht einsehbar."

3. TREND-CHART (letzte 12 Wochen):
   - Linechart: Vitalitäts-Index Verlauf
   - Recharts, sauber gestylt mit ELYO-Farben
   - Hover-Tooltips

4. TEAM-HEALTH ÜBERSICHT (Tabelle):
   - Spalten: Team | Mitglieder | Aktiv | Vitalitäts-Index | Trend | Aktion
   - 5-6 Teams, je eine Zeile
   - Farbcodierte Index-Spalte

5. QUICK ACTIONS (rechte Sidebar oder untere Leiste):
   - "ESG-Report exportieren (CSV)"
   - "Neue Umfrage erstellen"
   - "Mitarbeiter einladen"
   - "Maßnahmen-Hub öffnen"

DESIGN-DETAILS:
- Deutlich "professioneller" als Employee-Seite (weniger Gamification, mehr Daten)
- Alert-Sektionen: dezentes Rot/Amber, nicht alarmistisch
- Footer-Hinweis permanent sichtbar: "Alle Analysen basieren auf anonymisierten Aggregatdaten (min. 5 Einträge)"
```

---

### PROMPT 0.5 – Partner Map & Discovery (Mockup)

```
Erstelle die Partner-Entdeckungs-Ansicht für ELYO-Mitarbeiter. Ziel: Nutzer sollen lokale und digitale Gesundheitsangebote finden und sich durch ihr Level Zugang verdienen.

DATEIEN: 
- src/app/(app)/partners/page.tsx
- src/components/partners/PartnerCard.tsx
- src/components/partners/PartnerMap.tsx

MOCK-DATEN (8 Partner):
1. "Physiozentrum München Ost" | Physiotherapie | 1.2km | ⭐4.9 | ELYO-Verified | GOLD-Slots verfügbar
2. "YogaFlow Studio" | Bewegung | 2.8km | ⭐4.7 | ELYO-Verified | Für alle Level
3. "Dr. med. Anna Berger" | Präventivmedizin | 0.8km | ⭐5.0 | ELYO-Verified | Nur GOLD+
4. "MindfulNess Online" | Mental Health | digital | ⭐4.6 | ELYO-Verified | SILVER+
5. "Ernährungsberatung Koch" | Ernährung | 3.4km | ⭐4.8 | ELYO-Verified | Erstberatung BRONZE gratis
6. "FitnessFabrik" | Fitness | 1.9km | ⭐4.5 | ELYO-Verified | 20% Rabatt ab SILVER
7. "Rücken-Coach Online" | MSK | digital | ⭐4.7 | ELYO-Verified | Für alle Level
8. "Schlafcoaching Müller" | Schlaf | digital | ⭐4.6 | Pending | Für alle Level

SEITENAUFBAU:

1. FILTER-LEISTE:
   - Tabs: "Alle" | "In der Nähe" | "Digital" | "Meine Level-Vorteile"
   - Kategorie-Filter: Chips (Physiotherapie, Fitness, Mental, Ernährung, Schlaf, MSK)

2. HERO-CARD (persönlicher Privilege-Hinweis):
   - "Du bist SILVER – 3 Vorteile verfügbar" 
   - Highlight-Karten der freischaltbaren Angebote

3. PARTNER-LISTE:
   PartnerCard-Design:
   - Links: Kategorie-Farbstreifen + Icon
   - Mitte: Name, Typ, Distanz, Rating, ELYO-Verified Badge
   - Rechts: Level-Requirement Badge (z.B. "GOLD" in Gold-Farbe, oder "Für alle")
   - Wenn Nutzer-Level ausreicht: "Vorteil nutzen" Button (grün)
   - Wenn Level nicht ausreicht: "Ab GOLD verfügbar" (ausgegraut, mit Lock)
   - GOLD-Fast-Lane-Badge: "⚡ Termin heute noch verfügbar" (nur für GOLD-Partner)

4. INTERAKTIVE KARTE:
   - Leaflet.js oder statische SVG-Karte (Phase 0 = Mockup, echte Karte Phase 2)
   - Pins mit Kategorie-Farben
   - Klick auf Pin = Partner-Card highlight

5. PARTNER-DETAIL (Modal):
   Beim Klick auf eine Karte:
   - Vollbild-Modal mit Partner-Details
   - Beschreibung, Öffnungszeiten (mock), Kontakt
   - Review-Sektion: 3 Mock-Bewertungen mit Bewertungsdimensionen
   - "Termin anfragen" Button (Link zu mock-URL)
   - Level-Hinweis: "Dein SILVER-Vorteil: 20% Rabatt – wird automatisch angewendet"

WICHTIG – Wording:
Nie: "Behandlung", "Therapie", "Heilung"
Immer: "Unterstützung", "Begleitung", "Angebot", "Beratung"
```

---

### PROMPT 0.6 – Level & Gamification Screen

```
Erstelle die Level- und Privileges-Übersichtsseite für ELYO. Dies ist die emotionalste Seite der App – sie muss Motivation und Fortschrittsfreude auslösen.

DATEI: src/app/(app)/level/page.tsx

MOCK-DATEN:
- Aktuelles Level: SILVER
- Score: 72 Punkte von 100 benötigt für GOLD
- Streak: 14 Tage (wird zu Punkte umgerechnet)
- Wearable verbunden: Ja (Apple Health)
- Anamnese: 80% vollständig

SEITENAUFBAU:

1. LEVEL-HERO (visuell stärkstes Element):
   - Großes Level-Symbol (SVG-Emblem, nicht simples Badge)
   - SILVER in glänzender Silber-Optik (CSS gradient + subtle shine-animation)
   - "Sarah – Level SILVER" mit Mitgliedschafts-Dauer: "Seit 47 Tagen dabei"
   - Fortschrittsring um das Emblem (wie Apple Watch Ringe)

2. FORTSCHRITT ZU GOLD:
   - Großer Fortschrittsbalken: 72/100 Punkten
   - Darunter: Was fehlt noch?
     ✓ Streak 30+ Tage (erledigt: 14/30) – Chip
     ✓ Wearable verbunden (erledigt) – Chip grün
     ○ Anamnese 100% vollständig (80% – 20% fehlt) – Chip amber
   - CTA: "Anamnese vervollständigen → 28 Punkte erhalten"

3. ALLE LEVEL (Timeline-Darstellung):
   Vertikale Timeline:
   ✓ STARTER    – Freigeschaltet (grau/ausgefüllt)
   ✓ BRONZE     – Freigeschaltet (bronze/ausgefüllt)  
   ● SILVER     – Aktuell (silber, pulsierend)
   ○ GOLD       – Gesperrt (gold, ausgegraut mit Lock)
   ○ PLATINUM   – Gesperrt (platin, ausgegraut mit Lock)

   Jedes Level aufklappbar – zeigt Privileges:

   BRONZE-Privileges (freigeschaltet, in Farbe):
   - Kostenlose Erstberatung Ernährungsberatung
   - Zugang zu ELYO-Webinaren
   
   SILVER-Privileges (aktuell, hervorgehoben):
   - 20% Rabatt bei Partner-Studios
   - Bevorzugter Terminzugang (24h statt 48h)
   - Team-Challenge starten
   
   GOLD-Privileges (gesperrt, verlockend beschrieben):
   - ⚡ Fast Lane: Direkte Termine bei Top-Experten
   - Kostenlose Coaching-Session (1x/Quartal)
   - Persönlicher Vitalitäts-Jahresbericht
   
   PLATINUM-Privileges (gesperrt):
   - Beta-Features
   - Ambassador-Status
   - [Versicherungsvorteile – in Entwicklung]

4. AKTIVITÄTS-LOG:
   - "Wie du Punkte sammelst" – kompakte Liste:
     🔥 Täglicher Check-in: +2 Punkte
     📊 Umfrage ausfüllen: +5 Punkte
     ⌚ Wearable-Sync aktiv: +1 Punkt/Tag
     📋 Anamnese vervollständigen: bis zu +20 Punkte
     ⭐ Partner bewerten: +3 Punkte

ANIMATIONEN:
- Level-Emblem: Subtle floating animation (transform: translateY, 3s loop)
- Shine-Effekt auf Emblem: CSS keyframe, 4s loop
- Fortschrittsring: Draws on page-load (SVG stroke-dashoffset animation)
- Gesperrte Privileges: Hover zeigt "Noch X Punkte bis GOLD" Tooltip
```

---

### PROMPT 0.7 – Navigation & Routing verbinden

```
Verbinde alle Seiten aus Prompt 0.1–0.6 zu einer funktionierenden Single-Page-Navigation ohne echtes Backend.

AUFGABE:

1. src/app/(app)/layout.tsx:
   - AppShell einbinden
   - Role-Context via React Context bereitstellen
   - Mock-User-State: { name: "Sarah M.", role: "employee", level: "SILVER" }

2. Rollen-Switcher (nur für Demo-Zwecke, in Entwicklung sichtbar):
   - Floating Button unten rechts: "🎭 Rolle wechseln"
   - Dropdown: Employee | Company Admin | Partner
   - Wechselt die Navigation und den sichtbaren Inhalt sofort
   - Mit Hinweis: "Demo-Modus" Badge

3. Navigation-Struktur:
   EMPLOYEE:
   - Dashboard (/)
   - Check-in (/checkin) – mit "Heute erledigt" Badge wenn mock-done
   - Partner (/partners)
   - Level (/level)
   - Profil (/profile)

   COMPANY ADMIN:
   - Übersicht (/company/dashboard)
   - Teams (/company/teams)
   - Umfragen (/company/surveys)
   - Berichte (/company/reports)
   - Einstellungen (/company/settings)

   PARTNER:
   - Mein Profil (/partner/profile)
   - Meine Angebote (/partner/offers)
   - Bewertungen (/partner/reviews)
   - Analytics (/partner/analytics) – einfache Mock-Zahlen

4. Loading States:
   - Skeleton-Loader für alle Karten (shimmer animation)
   - 800ms simuliertes Laden beim Seitenwechsel (setTimeout, damit es "echt" wirkt)

5. README.md aktualisieren:
   - Wie man das Projekt startet
   - Wie man zwischen Rollen wechselt
   - Hinweis: Phase 0 = Demo, kein echtes Backend
```

---

# PHASE 1: MVP MIT ECHTEM BACKEND
## „Erster zahlender Pilotkunde möglich"
**Ziel:** Echte Datenpersistenz, Self-Service-Onboarding für Unternehmen, Stripe-Integration, funktionierender Check-in-Loop.

---

### PROMPT 1.1 – Self-Service Company Onboarding

```
Implementiere den vollständigen Self-Service-Onboarding-Flow für Unternehmen in ELYO. Kein manuelles Seeding mehr.

FLOW:
/onboarding/company → Schritt 1–4 → /company/dashboard

SCHRITT 1: "Unternehmen anlegen"
- Felder: Firmenname, Branche (Dropdown), Mitarbeiteranzahl (Range), Land
- Zod-Validierung
- Prisma: Company-Record anlegen

SCHRITT 2: "Admin-Account"  
- Felder: Vorname, Nachname, E-Mail (=Login), Passwort (mit Stärke-Anzeige), Telefon (optional)
- Prisma: User mit Rolle COMPANY_ADMIN anlegen, verknüpft mit Company

SCHRITT 3: "Datenschutz & Betriebsvereinbarung"
- Anonymitätsschwelle wählen: 3 / 5 / 10 Mitarbeiter (Radio-Buttons mit Erklärung)
- Check-in-Frequenz: täglich / wöchentlich
- Checkbox: DSGVO-Bestätigung (required)
- Checkbox: AGB (required)
- Prisma: Company-Settings speichern

SCHRITT 4: "Team einladen"
- Textarea: E-Mail-Adressen (eine pro Zeile oder kommasepariert)
- Parse und validiere jede E-Mail
- Generiere InviteToken für jede E-Mail (bestehende invites.ts nutzen)
- Sende Einladungs-E-Mail via bestehende email.ts
- "Einladungen senden" oder "Überspringen, später einladen"

COMPLETION: Weiterleitung zu /company/dashboard mit Welcome-Banner

TECHNISCHES:
- Bestehende Prisma-Models nutzen (Company, User, InviteToken)
- Progress-Indicator (1/4, 2/4...) prominent anzeigen
- Jeder Schritt speichert in sessionStorage – Nutzer kann zurückgehen
- E-Mail-Template für Einladung: "Du wurdest zu ELYO eingeladen" mit ELYO-Branding
```

---

### PROMPT 1.2 – Mitarbeiter Anamnese-System

```
Implementiere das progressive Anamnese-System für ELYO-Mitarbeiter (ELYO Health Datenbasis).

KONZEPT: "Onion-Strategie" – Daten werden in Wellen gesammelt, nie alles auf einmal.

DATENMODELL (Prisma-Migration erstellen):
model AnamnesisProfile {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])
  completedAt   DateTime?
  completionPct Int      @default(0)
  
  // Basis (Welle 1 – beim Onboarding)
  birthYear     Int?
  biologicalSex String?  // "male" | "female" | "diverse" | "prefer_not"
  activityLevel String?  // "sedentary" | "light" | "moderate" | "active" | "very_active"
  sleepQuality  String?  // "poor" | "fair" | "good" | "excellent"
  stressTendency String? // "low" | "medium" | "high"
  
  // Vertiefung (Welle 2 – nach Woche 1)
  smokingStatus String?
  nutritionType String?  // "omnivore" | "vegetarian" | "vegan" | "other"
  
  // Optional (Welle 3 – User-initiiert)
  chronicConditions String[] // Freitext-Tags, KEIN medizinisches Feld
  medications       Boolean? // Nur: ja/nein, KEIN Detail
  
  updatedAt     DateTime @updatedAt
  createdAt     DateTime @default(now())
}

model HealthDocument {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  type        String   // "blood_test" | "other"
  fileName    String
  uploadedAt  DateTime @default(now())
  // KEINE Parsing-Logik – reiner Dokumentenspeicher
  // KEIN KI-Analyse-Feature – regulatorisch kritisch
}

WICHTIGE WORDING-REGEL IM CODE:
- Keine Variablennamen wie "diagnosis", "symptoms", "treatment"
- Stattdessen: "indicators", "patterns", "profile", "signals"

API-ROUTES:
- POST /api/anamnesis – Anamnese speichern/updaten
- GET /api/anamnesis – eigene Anamnese laden
- POST /api/documents – Dokument hochladen (S3 oder Vercel Blob)
- GET /api/documents – eigene Dokumente auflisten

UI:
- src/app/(app)/profile/anamnesis/page.tsx
- Mehrstufiges Formular, gleiche UX wie Check-in (kein Page-Reload zwischen Steps)
- Fortschrittsbalken: "Profil zu X% vollständig"
- Completion erhöht Punkte für Level-System (+20 Punkte bei 100%)
- Datenschutz-Hinweis prominent: "Deine Daten gehören dir. Kein Arbeitgeber sieht diese Informationen."
```

---

### PROMPT 1.3 – Level & Punkte Engine

```
Implementiere die Level- und Punkte-Engine als Server-Side-Service in ELYO.

DATENMODELL:
model UserPoints {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id])
  total     Int      @default(0)
  level     String   @default("STARTER") // STARTER|BRONZE|SILVER|GOLD|PLATINUM
  streak    Int      @default(0)
  lastCheckin DateTime?
  updatedAt DateTime @updatedAt
}

model PointTransaction {
  id        String   @id @default(cuid())
  userId    String
  points    Int
  reason    String   // "daily_checkin" | "survey_complete" | "wearable_sync" | "anamnesis" | "review"
  createdAt DateTime @default(now())
}

PUNKTE-REGELN (src/lib/points.ts):
const POINT_RULES = {
  daily_checkin: 2,
  survey_complete: 5,
  wearable_connected: 10,  // einmalig
  anamnesis_10pct: 2,      // pro 10% Vervollständigung
  partner_review: 3,
  streak_7days: 5,         // Bonus bei 7-Tage-Streak
  streak_30days: 15,       // Bonus bei 30-Tage-Streak
}

LEVEL-SCHWELLEN:
const LEVEL_THRESHOLDS = {
  STARTER: 0,
  BRONZE: 30,    // ~2 Wochen aktive Nutzung
  SILVER: 100,   // ~6-8 Wochen
  GOLD: 250,     // ~4-5 Monate
  PLATINUM: 600, // ~1 Jahr
}

FUNCTIONS:
- awardPoints(userId, reason) → updated UserPoints
- checkLevelUp(userId) → { levelChanged: boolean, newLevel: string }
- calculateStreak(userId) → current streak number
- getPrivileges(level) → Privilege[] (was ist freigeschaltet)

API:
- POST /api/points/award – intern aufgerufen nach Check-in, Survey, etc.
- GET /api/points/me – eigener Punktestand + Level + Streak
- GET /api/points/privileges – freigeschaltete Privileges

LEVEL-UP-NOTIFICATION:
Wenn Level steigt → Push-Notification + In-App-Banner
"🎉 Du hast GOLD erreicht! Dein Fast-Lane-Zugang ist jetzt aktiv."
```

---

### PROMPT 1.4 – Partner-Datenbank & Self-Service Portal

```
Implementiere das Partner-Ökosystem für ELYO: Datenbank, Self-Service-Portal und Anzeige in der App.

PRISMA-MIGRATIONS:
model Partner {
  id                 String   @id @default(cuid())
  name               String
  type               String   // "LOCAL" | "EXPERT" | "DIGITAL"
  categories         String[] // ["physiotherapy", "fitness", "mental", "nutrition", "sleep", "msk"]
  description        String
  verificationStatus String   @default("PENDING") // PENDING | VERIFIED | SUSPENDED
  qualityScore       Float    @default(0)
  reviewCount        Int      @default(0)
  
  // Lokation (null für digitale Angebote)
  address   String?
  city      String?
  lat       Float?
  lng       Float?
  radiusKm  Float?
  
  // Kontakt
  website   String?
  email     String
  phone     String?
  
  // Auth
  partnerEmail    String @unique
  partnerPassword String
  
  offers    Offer[]
  reviews   PartnerReview[]
  createdAt DateTime @default(now())
}

model Offer {
  id              String  @id @default(cuid())
  partnerId       String
  partner         Partner @relation(fields: [partnerId], references: [id])
  title           String
  description     String
  priceType       String  // "FREE" | "PAID" | "ELYO_PRIVILEGE"
  price           Float?
  minimumLevel    String  @default("STARTER") // welches Level braucht man mindestens
  bookingUrl      String?
  isActive        Boolean @default(true)
  createdAt       DateTime @default(now())
}

model PartnerReview {
  id           String   @id @default(cuid())
  partnerId    String
  partner      Partner  @relation(fields: [partnerId], references: [id])
  userId       String
  // Dimensionen (1-5)
  accessibility Float
  competence    Float
  atmosphere    Float
  relevance     Float
  overall       Float    // berechnet
  textFeedback  String?
  createdAt     DateTime @default(now())
}

PARTNER SELF-SERVICE PORTAL (src/app/partner/):
1. /partner/register – Registrierung (Name, Typ, Kategorie, Adresse, Nachweis-Upload)
2. /partner/dashboard – Übersicht (Profil-Status, Angebote, Reviews, Seitenaufrufe)
3. /partner/offers – Angebote erstellen/bearbeiten/pausieren
4. /partner/reviews – Bewertungen lesen (anonymisierter Nutzername)

ELYO-ADMIN-QUALIFIZIERUNG (src/app/admin/ – internes Tool):
- Liste aller PENDING-Partner
- Dokumente einsehen
- Freischalten / Ablehnen mit Kommentar
- E-Mail-Benachrichtigung an Partner bei Status-Änderung

MITARBEITER-APP (Anzeige):
- GET /api/partners – gefiltert nach Koordinaten, Kategorie, Level
- Partner-Karte zeigt Level-Requirement visuell
- Level-Check: Nutzer-Level vs. Offer.minimumLevel
- Wenn berechtigt: "Vorteil nutzen" Button
- Wenn nicht berechtigt: "Ab [LEVEL] verfügbar – noch X Punkte"
- Buchung: öffnet Offer.bookingUrl in externem Browser (keine native Buchung Phase 1)

QUALITÄTS-AUTOMATION:
- Nach jedem Review: qualityScore neu berechnen (gewichteter Durchschnitt)
- Cron-Job: Täglich Partner mit Score < 2.5 flaggen → E-Mail an ELYO-Admin
- Automatisch auf SUSPENDED wenn 3 Mal in Folge Score < 2.5 nach Review-Prüfung
```

---

### PROMPT 1.5 – Stripe Billing Integration

```
Implementiere Stripe-Billing für ELYO B2B (PEPM-Modell – per employee per month).

BILLING-MODELL:
- Preis: konfigurierbar per Company (aktuell: 5€ PEPM als Default)
- Billing-Zyklus: monatlich
- Basis: aktive Nutzer im letzten Monat (nicht Gesamtzahl)
- Setup-Fee: optional, konfigurierbar

PRISMA-ERWEITERUNG:
model Company {
  // bestehende Felder...
  stripeCustomerId     String?
  stripeSubscriptionId String?
  billingEmail         String?
  billingStatus        String  @default("TRIAL") // TRIAL | ACTIVE | PAST_DUE | CANCELLED
  trialEndsAt          DateTime?
  pricePerEmployee     Float   @default(5.0)
  maxEmployees         Int     @default(500)
}

IMPLEMENTATION:
1. src/lib/stripe.ts – Stripe-Client-Initialisierung
2. src/lib/billing.ts:
   - createCustomer(company) → Stripe Customer anlegen
   - createSubscription(companyId) → Subscription mit Usage-Based Billing
   - calculateMonthlyBill(companyId) → aktive User × pricePerEmployee
   - cancelSubscription(companyId)

3. API-ROUTES:
   - POST /api/billing/setup – Stripe-Checkout-Session erstellen
   - GET /api/billing/status – Billing-Status der Company
   - POST /api/billing/webhook – Stripe Webhook Handler:
     * invoice.payment_succeeded → billingStatus = ACTIVE
     * invoice.payment_failed → billingStatus = PAST_DUE + E-Mail
     * customer.subscription.deleted → billingStatus = CANCELLED

4. ONBOARDING-INTEGRATION:
   - Trial: 30 Tage kostenlos, kein Kreditkarte nötig
   - Nach Trial: Stripe Checkout öffnen (redirect)
   - Bei PAST_DUE: Banner in Company-Dashboard + Feature-Einschränkung

5. COMPANY-SETTINGS-SEITE:
   - Aktueller Plan anzeigen
   - Anzahl aktiver Nutzer (billable)
   - Nächste Rechnung: Datum + Betrag
   - Zahlungsmethode ändern (Stripe Customer Portal)
   - Abo kündigen (mit Kündigungsformular)

WICHTIG: Kein Preis oder Betrag dem Mitarbeiter gegenüber sichtbar.
Billing ist ausschließlich im Company-Admin-Bereich.
```

---

# PHASE 2: PARTNER-ÖKOSYSTEM & WEARABLES
## „Retention durch echten Mehrwert"

---

### PROMPT 2.1 – Apple Health & Google Health Integration

```
Implementiere Wearable-Daten-Integration via Apple HealthKit und Google Health Connect für die ELYO Mobile App.

STRATEGIE: Erst native Gratis-Integration (Apple/Google), dann Terra/Rook für Premium-Wearables (Phase 3).

MOBILE: Wenn ELYO als Progressive Web App (PWA) oder React Native:

FÜR PWA (Phase 2a – empfohlen für Speed):
- Apple Health: Nicht direkt via Web verfügbar → Umweg via Shortcuts/Automations
- Google Fit: Web-API verfügbar → OAuth + Fitness REST API
- Empfehlung: Google Health als erste Integration, Apple via nativer App (Phase 3)

IMPLEMENTATION GOOGLE HEALTH (Web):
1. src/lib/googleHealth.ts:
   - OAuth-Flow: Google Fit Scopes (activity.read, sleep.read, heart_rate.read)
   - fetchSteps(userId, dateRange)
   - fetchHeartRate(userId, dateRange) → für HRV-Näherung
   - fetchSleepSessions(userId, dateRange)

2. DATENMODELL:
model WearableSync {
  id         String   @id @default(cuid())
  userId     String
  source     String   // "google_health" | "apple_health" | "oura" | "garmin" | "whoop"
  date       DateTime
  steps      Int?
  heartRate  Float?   // Durchschnitt – KEIN medizinischer Wert, nur "Aktivitätsindikator"
  sleepHours Float?
  syncedAt   DateTime @default(now())
}

3. WORDING IN DER UI:
   NIEMALS: "HRV", "Ruhepuls", "Gesundheitsdaten"
   IMMER: "Aktivitätsdaten", "Bewegungsmuster", "Erholungsindikator"

4. NUTZER-UI:
   src/app/(app)/profile/data-sources/page.tsx
   - Liste aller verfügbaren Quellen
   - Verbinden/Trennen per Toggle
   - Status: "Zuletzt synchronisiert: vor 2 Stunden"
   - Datenschutz-Box: "Nur du siehst diese Daten. Dein Arbeitgeber hat keinen Zugriff."
   - Jede Verbindung ist optional und jederzeit trennbar

5. PUNKTE-INTEGRATION:
   Wearable verbunden → einmalig +10 Punkte
   Tägliche Sync-Daten vorhanden → +1 Punkt/Tag (automatisch)
```

---

### PROMPT 2.2 – ESG Report PDF Export

```
Upgrade den bestehenden ESG CSV-Export zu einem vollständigen PDF-Report für CSRD-Anforderungen.

REPORT-INHALT:
- Deckblatt: Unternehmensname, Berichtszeitraum, ELYO-Logo
- Executive Summary: Kern-KPIs auf einen Blick
- Vitalitäts-Index Verlauf (Grafik)
- Partizipationsrate nach Abteilung/Team
- Maßnahmen-Übersicht: Was wurde implementiert
- Benchmark: Branchenvergleich (anonymisiert)
- CSRD Social Pillar Mapping: Welche ELYO-Kennzahlen welchem Standard entsprechen
- Disclaimer: Methodik und Datenschutz

TECHNISCHES:
- Library: @react-pdf/renderer (React-basiertes PDF)
- Oder: Puppeteer (HTML → PDF, höhere Designfreiheit)
- Empfehlung: Puppeteer via API Route für ELYO-Branding-Qualität

API:
- GET /api/reports/esg/pdf?period=2024-Q1 → PDF-Download
- Authentifizierung: nur COMPANY_ADMIN
- Generierung: on-demand, kein Caching nötig in Phase 2

DESIGN:
- ELYO-Branding konsequent (Farben, Fonts)
- Professionell wie McKinsey-Report, nicht wie generiertes Dokument
- Seite 1: Visuell stark (Grafiken, KPIs groß)
- Seite 2+: Daten-Tabellen, sauber strukturiert
- Footer: "Erstellt mit ELYO – Alle Daten anonymisiert und DSGVO-konform"
```

---

# PHASE 3: SKALIERUNG & MONETARISIERUNG
## „Partner zahlen, Kassen kooperieren"

### PROMPT 3.1 – Terra/Rook Integration (Premium Wearables)

```
Implementiere Terra API für Premium-Wearable-Support (Oura, Garmin, Whoop, Fitbit).

Terra API: https://tryterra.co
- Unified API für 50+ Wearables
- Webhook-basiert: Terra sendet Daten, wenn verfügbar
- Kosten: pay-per-user

IMPLEMENTATION:
1. src/lib/terra.ts:
   - generateTerraWidget(userId) → Widget-URL für Nutzer zur Verbindung
   - handleTerraWebhook(payload) → Daten empfangen + in WearableSync speichern
   - getTerraConnections(userId) → Welche Wearables verbunden

2. WEBHOOK-HANDLER:
   POST /api/webhooks/terra
   - Signature-Verification (Terra-Secret)
   - Data-Types: ACTIVITY | SLEEP | BODY | DAILY
   - Mapping auf WearableSync-Model
   - Punkte-Award bei täglichem Sync

3. UI-ERWEITERUNG:
   Data-Sources-Seite + Premium-Badge für Terra-Wearables
   "Premium-Wearable verbinden" → Terra-Widget öffnen (Popup)
   Zeigt: Welche Daten kommen (Steps, Erholung, Schlaf) – NIE medizinisches Wording
```

---

### PROMPT 3.2 – Partner Monetarisierung (Listing-Fee)

```
Implementiere das Partner-Monetarisierungs-System (Listing-Gebühren und Premium-Sichtbarkeit).

MODELLE:
- Basic: Kostenlos (weiterhin verfügbar – Netzwerkeffekt)
- Verified+: 49€/Monat → "Top Partner"-Badge, besseres Ranking, Statistiken
- Premium: 149€/Monat → Featured-Platzierung, GOLD-Slot-Kontingent, Analytics-Dashboard

IMPLEMENTATION:
1. Stripe-Integration für Partner (analog Company-Billing)
2. Ranking-Algorithmus: qualityScore × (premium-boost) × recency
3. Featured-Platzierung: In App oben angepinnt, visuell hervorgehoben
4. Partner-Analytics-Dashboard: Profilaufrufe, Angebots-Clicks, Review-Trends
5. Automatische Emails: "Dein Listing läuft in 7 Tagen ab"
```

---

## TECHNISCHE SCHULDEN (parallel abarbeiten)

### PROMPT T.1 – Manager Dashboard
```
Implementiere das Manager-Dashboard: eigenes Team sehen (anonymisiert, min. Schwellwert).
Gleiche Architektur wie Company-Admin, aber beschränkt auf zugeordnete Teams.
Keine Individualdaten – nur aggregierte Team-KPIs.
```

### PROMPT T.2 – Notification Preferences
```
Implementiere E-Mail-Abmelde-Funktion für Mitarbeiter.
Unsubscribe-Link in jeder E-Mail, One-Click-Opt-out, DSGVO-konform.
Granular: Check-in-Reminder an/aus, Weekly Digest an/aus.
```

### PROMPT T.3 – SSO Microsoft Entra
```
Implementiere Microsoft Entra ID (Azure AD) SSO für Enterprise-Kunden.
NextAuth v5 Provider-Erweiterung. Automatisches User-Provisioning bei erstem Login.
Priorisierung: Microsoft vor Google (B2B-Relevanz höher).
```

---

## GESAMTÜBERSICHT: ROADMAP

```
WOCHE 1-2:    PHASE 0 – Visuelle Shell (Prompts 0.1–0.7)
              → Sofort zeigbar in Kundengesprächen

WOCHE 3-6:    PHASE 1 – Echtes Backend (Prompts 1.1–1.5)
              → Erster Pilotkunde technisch möglich

WOCHE 7-10:   PHASE 1 parallel zu Kundengesprächen
              → Feedback einbauen, Onboarding optimieren
              → Erster zahlender Kunde

WOCHE 11-18:  PHASE 2 – Wearables + ESG PDF (Prompts 2.1–2.2)
              → Retention steigt, Upgrade-Argument für Enterprise

WOCHE 19+:    PHASE 3 – Terra + Partner-Monetarisierung
              → Zweites Umsatzbein aktiviert
```

---

## KRITISCHE ENTWICKLUNGSPRINZIPIEN

1. **Wording-Review bei jedem Feature:** Vor jedem Release checken: Kein medizinisches Vokabular im Frontend.
2. **Anonymitätsschwelle niemals umgehen:** Kein Feature darf Individualdaten an Admins leaken – auch nicht versehentlich.
3. **Mobile-First:** Mitarbeiter nutzen primär Smartphone. Jede Seite zuerst für 375px entwickeln.
4. **Testbarkeit:** Bestehende 92% Coverage halten. Für jede neue lib-Funktion Unit-Tests.
5. **Partner-Qualität vor Partner-Quantität:** Lieber 50 echte, geprüfte Partner als 500 ungeprüfte.
