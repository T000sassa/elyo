# Design Spec: PWA Setup & Mobile Optimierung (Prompt 2.8)

**Datum:** 2026-04-19
**Phase:** 2 – Partner-Ökosystem & Wearables
**Scope:** `public/manifest.json`, `public/sw.js` (Erweiterung), `public/offline.html`, `src/components/ui/InstallBanner.tsx`, `src/components/shared/ServiceWorkerRegistration.tsx`, `next.config.ts`, Layout-Anpassungen

---

## Ziel

ELYO wird zur installierbaren PWA. Mitarbeiter können die App zum Homescreen hinzufügen. Beim Offline-Zustand erscheint eine gebrandete Seite mit Offline-Check-in-Formular (speichert in IndexedDB, sendet via Background Sync). Ein Install-Banner erscheint nach 3 Besuchen.

---

## Voraussetzungen

- `public/sw.js` existiert bereits (Phase 2.7 Push Notification Handler)
- `framer-motion` ^12 installiert
- `src/app/layout.tsx` existiert (wird für Manifest-Link + SW-Registration erweitert)

---

## Entscheidungen

### Service Worker: Manuell (kein next-pwa Plugin)

`next-pwa` würde den bestehenden `public/sw.js` überschreiben oder einen Konflikt verursachen. Stattdessen wird `public/sw.js` direkt um Caching + Background Sync erweitert. Die Registrierung erfolgt via Client Component `ServiceWorkerRegistration.tsx`.

### next.config.ts: Minimal

Nur Headers + `output: 'standalone'` nicht notwendig für diese Phase. Minimal-Config ohne Plugin-Overhead.

---

## Dateistruktur

| File | Action | Responsibility |
|---|---|---|
| `public/manifest.json` | Create | PWA Manifest |
| `public/sw.js` | Modify | Caching-Strategien + Background Sync hinzufügen (Push-Handler bleibt) |
| `public/offline.html` | Create | Offline-Fallback mit Offline-Check-in-Formular |
| `src/components/shared/ServiceWorkerRegistration.tsx` | Create | Client Component: SW registrieren |
| `src/components/ui/InstallBanner.tsx` | Create | Install-Prompt-Banner |
| `src/app/layout.tsx` | Modify | Manifest-Link + SW-Registration + SafeArea Meta-Tags |
| `next.config.ts` | Create | Minimal Next.js Config |

---

## `public/manifest.json`

```json
{
  "name": "ELYO",
  "short_name": "ELYO",
  "description": "Dein persönlicher Vitalitätsbegleiter",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#F7F6F2",
  "theme_color": "#1B4D3E",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

Hinweis: `/icons/icon-192.png` und `/icons/icon-512.png` werden als SVG-basierte Platzhalter-PNGs im Rahmen dieses Plans erzeugt (grüner Kreis mit "E"-Buchstaben).

---

## `public/sw.js` — Erweiterung

Die bestehenden Push-Handler bleiben unverändert. Am Anfang der Datei kommen die Caching-Strategien, am Ende die Background-Sync-Handler.

### Cache-Namen
```javascript
const STATIC_CACHE = 'elyo-static-v1'
const RUNTIME_CACHE = 'elyo-runtime-v1'
const OFFLINE_URL = '/offline.html'
```

### Install-Event: Offline-Seite precachen
```javascript
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll([OFFLINE_URL]))
  )
  self.skipWaiting()
})
```

### Activate-Event: Alte Caches löschen
```javascript
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== STATIC_CACHE && k !== RUNTIME_CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})
```

### Fetch-Event: Network-First für API, Cache-First für Statik, Offline-Fallback
```javascript
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET') return

  if (url.pathname.startsWith('/api/')) {
    // Network-First für API-Calls
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(OFFLINE_URL)
      )
    )
    return
  }

  // Stale-While-Revalidate für Navigation
  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async cache => {
      const cached = await cache.match(event.request)
      const fetchPromise = fetch(event.request).then(res => {
        if (res.ok) cache.put(event.request, res.clone())
        return res
      }).catch(() => null)
      return cached ?? fetchPromise ?? caches.match(OFFLINE_URL)
    })
  )
})
```

### Background Sync für Check-in
```javascript
const CHECKIN_SYNC_TAG = 'checkin-sync'
const CHECKIN_STORE_KEY = 'offline-checkins'

self.addEventListener('sync', (event) => {
  if (event.tag === CHECKIN_SYNC_TAG) {
    event.waitUntil(syncOfflineCheckins())
  }
})

async function syncOfflineCheckins() {
  const db = await openCheckinDB()
  const items = await getAllCheckins(db)
  for (const item of items) {
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      })
      if (res.ok) await deleteCheckin(db, item.id)
    } catch { /* retry next sync */ }
  }
}
```

IndexedDB-Hilfsfunktionen (`openCheckinDB`, `getAllCheckins`, `deleteCheckin`) werden inline in `sw.js` definiert.

---

## `public/offline.html`

Einfaches HTML mit Inline-CSS und -JS (kein React). Zeigt:

1. ELYO-Logo (Text-basiert, ELYO-Grün)
2. "Du bist gerade offline."
3. Offline-Check-in-Formular: 3 `<input type="range">` (Energie, Stimmung, Belastung), "Speichern"-Button
4. Status-Badge: "Wird gesendet, sobald du wieder online bist."

**Formular-Submit:** Daten werden via `indexedDB` gespeichert + `navigator.serviceWorker.ready.then(reg => reg.sync.register('checkin-sync'))` aufgerufen.

---

## `src/components/shared/ServiceWorkerRegistration.tsx`

```typescript
'use client'
import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error)
    }
  }, [])
  return null
}
```

---

## `src/components/ui/InstallBanner.tsx`

```typescript
'use client'
```

**Logik:**
- `localStorage`-Counter `elyo_visit_count` — bei jedem Mount incrementieren
- Nach `>= 3` Besuchen + `beforeinstallprompt`-Event verfügbar: Banner anzeigen
- `localStorage`-Key `elyo_pwa_installed`: gesetzt nach Install → Banner nie wieder zeigen
- Banner unten fixiert, dismissbar mit "×"

**UI:**
```
[ELYO-Icon] ELYO zum Homescreen hinzufügen          [Installieren] [×]
```
Tailwind: `fixed bottom-0 left-0 right-0 bg-[#1B4D3E] text-white px-4 py-3 flex items-center gap-3`
Wird ÜBER der Bottom-Navigation angezeigt (falls vorhanden) via `bottom-16 lg:bottom-0`.

---

## `src/app/layout.tsx` — Anpassungen

1. Manifest-Link und Theme-Color via Next.js `metadata`:
```typescript
export const metadata: Metadata = {
  title: "ELYO — Employee Wellbeing",
  description: "Employee Wellbeing Platform — anonym, sicher, menschlich.",
  manifest: "/manifest.json",
  themeColor: "#1B4D3E",
  viewport: {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ELYO",
  },
}
```

2. `<ServiceWorkerRegistration />` und `<InstallBanner />` in `<body>` einbinden.

3. Safe-Area-Insets via globales CSS in `globals.css`:
```css
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

## `next.config.ts`

Minimale Konfiguration, die Service Worker und statische Assets nicht interferiert:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Service Worker aus /public bleibt unkompiliert
}

export default nextConfig
```

---

## Icon-Platzhalter

Da keine echten PNG-Icons existieren, werden zwei simple SVG-basierte Icons als PNG-Platzhalter erzeugt:
- `/public/icons/icon-192.png` — 192×192px, grüner Kreis (#1B4D3E) mit weißem "E"
- `/public/icons/icon-512.png` — 512×512px

Da Canvas-Rendering server-seitig nicht möglich ist, werden die Icons als Base64-encoded PNG via Node.js `sharp` oder als static placeholder erstellt. **Alternative:** SVG-Icons plus `purpose: "any"` genügt für die meisten Clients — wir erstellen SVG-Icons in `/public/icons/`.

**Finale Entscheidung:** SVG-Icons (kein PNG-Konvertierungs-Overhead). Manifest referenziert SVG:
```json
{ "src": "/icons/icon.svg", "sizes": "any", "type": "image/svg+xml" }
```

---

## Nicht in Scope

- Vollständige Mobile UX Audit aller bestehenden Seiten (zu viele Seiten für eine sichere Iteration)
- Swipe-Drag-Navigation am Check-in (bereits Framer Motion AnimatePresence vorhanden — Drag würde Slider-Interaktion interferieren)
- iOS APNS Push (gehört zu Phase 2.7 Nicht-in-Scope)
- `next-pwa` Plugin (Konflikt mit bestehendem sw.js)
- Echte PNG-Icons (SVG-Platzhalter sind produktionsreif für moderne Browser)
