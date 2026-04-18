# Design Spec: Datenquellen-UI (Prompt 2.3)

**Datum:** 2026-04-18
**Phase:** 2 – Partner-Ökosystem & Wearables
**Scope:** `/profile/data-sources` Seite + Dokument-Backend (Upload, List, Delete via Vercel Blob)

---

## Ziel

Employees können ihre verbundenen Wearable-Quellen verwalten und persönliche Gesundheitsdokumente (PDFs) hochladen und löschen. Die Seite ist der zentrale Einstiegspunkt für den Google-Health-OAuth-Flow und das Dokumenten-Management.

---

## Voraussetzungen

- `WearableConnection` Prisma-Modell aus Prompt 2.1
- `getAuthUrl` aus `src/lib/googleHealth.ts` (Prompt 2.2)
- `@vercel/blob` Package installiert
- Env-Vars: `BLOB_READ_WRITE_TOKEN`, `NEXTAUTH_URL`

---

## Datenmodell

### Neues Prisma-Modell `UserDocument`

```prisma
model UserDocument {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  fileName   String
  blobUrl    String
  blobKey    String
  mimeType   String
  size       Int
  uploadedAt DateTime @default(now())

  @@index([userId])
  @@map("user_documents")
}
```

`User` erhält: `documents UserDocument[]`

### Migration

Manuelle SQL-Datei `prisma/migrations/20260418010000_add_user_documents/migration.sql`:

```sql
CREATE TABLE "user_documents" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "fileName"   TEXT NOT NULL,
  "blobUrl"    TEXT NOT NULL,
  "blobKey"    TEXT NOT NULL,
  "mimeType"   TEXT NOT NULL,
  "size"       INTEGER NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_documents_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "user_documents_userId_idx" ON "user_documents"("userId");
```

---

## API-Routen

Alle Routen: `auth()` + `EMPLOYEE`-Rolle. Nicht-authentifizierte Requests → 401. Andere Rollen → 403.

### `POST /api/documents`

- Body: `multipart/form-data` mit Feld `file`
- Validierung: max 10 MB, nur `application/pdf`
- Upload zu Vercel Blob: `put(fileName, file, { access: 'public' })`
- Metadaten in `UserDocument` speichern
- Response: `{ data: UserDocument }`
- Fehler: 400 bei falschem Typ/Größe, 500 bei Blob-Fehler

### `GET /api/documents`

- Lädt alle `UserDocument`-Einträge des eingeloggten Users, sortiert nach `uploadedAt DESC`
- Response: `{ data: UserDocument[] }`

### `DELETE /api/documents/[id]`

- Lädt `UserDocument` per `id`, prüft `userId === session.user.id`
- Löscht Blob via `del(document.blobKey)`
- Löscht DB-Eintrag
- Response: 204
- Fehler: 404 wenn nicht gefunden oder fremder User

---

## Seiten-Architektur

### `src/app/profile/data-sources/page.tsx` — Server Component

Lädt parallel:
1. `WearableConnection` für `[userId, 'google_health']` (optional)
2. `UserDocument[]` für userId, sortiert nach `uploadedAt DESC`

Gibt Daten als Props an `DataSourcesTabs` weiter.

### `src/app/profile/data-sources/DataSourcesTabs.tsx` — Client Component

- Verwaltet aktiven Tab via `useSearchParams` (`?tab=connected|available|documents`)
- Standard-Tab: `connected`
- Zeigt Punkte-Banner unter den Tabs, wenn keine Quelle verbunden
- Rendert den aktiven Tab-Inhalt

### `src/app/profile/data-sources/ConnectedTab.tsx` — Client Component

Props: `connection: WearableConnection | null`

- Wenn verbunden: Card mit Google-Fit-Logo, Status "✓ Aktiv", `connectedAt`-Datum, Sync-Button, Disconnect-Button
- Wenn nicht verbunden: leerer State mit "Verbinde deine erste Quelle"-CTA → Link zu `/api/wearables/google/connect`
- Sync-Button: `POST /api/wearables/google/sync` → `router.refresh()`
- Disconnect-Button: `DELETE /api/wearables/google/disconnect` → `router.refresh()`
- Bei `?error=oauth_failed` in URL: Toast-Fehlermeldung

### `src/app/profile/data-sources/AvailableTab.tsx` — Client Component (statisch)

Grid mit 4 Cards:
- Google Fit: "Verbunden" Badge wenn bereits verbunden, sonst "Verbinden"-Button → `/api/wearables/google/connect`
- Apple Health: "Bald" (disabled)
- Oura Ring: "Bald" (disabled)
- Garmin: "Bald" (disabled)

Props: `isGoogleConnected: boolean`

### `src/app/profile/data-sources/DocumentsTab.tsx` — Client Component

Props: `documents: UserDocument[]`

- Upload-Dropzone: `<input type="file" accept="application/pdf">`, max 10 MB Client-seitig validiert
- Bei Fehler: Fehlermeldung unter Dropzone ("Nur PDFs bis 10 MB erlaubt")
- Upload: `POST /api/documents` (FormData) → `router.refresh()`
- Liste der Dokumente: Dateiname, Größe in KB/MB, Datum, Delete-Button
- Delete-Button: `DELETE /api/documents/[id]` → `router.refresh()`
- Leerer State: "Noch keine Dokumente hochgeladen"

---

## Punkte-Banner

Grüner Gradient-Strip unter den Tabs:

```
⭐ Verbinde eine Quelle → +10 Punkte · Tägliche Sync → +1 Punkt/Tag
```

Nur sichtbar wenn `connection === null`. Verschwindet nach erfolgreicher Verbindung (via `router.refresh()`).

---

## Fehler- & Ladezustände

| Situation | Verhalten |
|-----------|-----------|
| `?error=oauth_failed` in URL | Toast auf ConnectedTab: "Verbindung fehlgeschlagen" |
| Upload > 10 MB | Client-Validierung, Fehlermeldung unter Dropzone |
| Falscher Dateityp | Gleich wie oben |
| Sync-Fehler (API 502) | Toast: "Sync fehlgeschlagen, bitte erneut versuchen" |
| Delete-Fehler | Toast: "Löschen fehlgeschlagen" |
| Blob-Upload-Fehler (500) | Toast: "Upload fehlgeschlagen" |

Toast-Komponente: bestehende ELYO-Toast-Komponente nutzen (falls vorhanden), sonst einfaches `useState`-Banner.

---

## Design-Token & Stil

- Primärfarbe: `#1B4D3E` (ELYO-Grün)
- Tabs: Pill-Style, aktiver Tab mit grünem Background
- Cards: `border border-gray-200 rounded-lg`, verbundene Quellen mit `bg-emerald-50 border-emerald-200`
- Punkte-Banner: `linear-gradient(135deg, #1B4D3E, #2d6b55)`, weiße Schrift
- Framer Motion: Stagger-Animation beim Tab-Wechsel (Inhalt faded in mit `opacity: 0 → 1`, `y: 8 → 0`)

---

## Nicht in Scope

- Apple Health, Oura, Garmin UI (→ Prompt 3.1 via Terra API)
- Dokument-Vorschau oder -Download-Button (Blob-URL direkt verlinkbar)
- Punkte-Anzeige (aktueller Stand) im Banner (→ Dashboard)
- E-Mail-Benachrichtigung bei Sync-Fehler (→ Prompt 2.7)
