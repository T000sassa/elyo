# Terra Wearable Integration – Design Spec

**Status:** Approved — ready for implementation plan
**Phase:** 3.1 (Premium Wearables)
**Scope:** Oura + Garmin via Terra unified API. Scaffolding + Tests; live-geschaltet via Env-Vars. Whoop + Fitbit bleiben disabled.

---

## Context

Phase 2 hat Google Fit via direktem OAuth integriert (`src/lib/googleHealth.ts`, `/api/wearables/google/*`). Die Datenquellen-UI listet Oura/Garmin/Whoop/Fitbit als "Bald verfügbar". Phase 3.1 aktiviert Oura + Garmin über Terra – einen unified Webhook-basierten Provider für 50+ Wearables.

Das bestehende Datenmodell (`WearableConnection`, `WearableSync`) unterstützt Terra-Quellen bereits als String-Werte (`"oura"`, `"garmin"`). Terra liefert reichere Felder (Recovery, HRV, Readiness), die wir additiv mappen.

---

## Goals / Non-Goals

**Goals:**
- Oura + Garmin in der Daten-Quellen-UI "verbindbar" machen, sobald Terra-Env-Vars gesetzt sind.
- Webhook-Empfang mit HMAC-Signature-Verifikation.
- Mapping von Terra-Payloads (activity/sleep/body/daily) auf erweitertes `WearableSync`.
- Vollständige Unit-Tests gegen gemockte Terra-Responses.

**Non-Goals:**
- Whoop + Fitbit Aktivierung (später, Code-Pfad identisch).
- Historical-Data-Import UI (Terra macht das automatisch beim Connect).
- Raw-Payload-Archiv (keine zusätzlichen Tabellen).
- Dashboard-Widgets für Recovery/HRV/Readiness (separate Spec, nach Datensammlung).

---

## Architecture

### Data Flow

```
User klickt "Oura verbinden" (data-sources UI)
  → GET /api/wearables/terra/connect?provider=OURA
  → terraClient.generateWidgetUrl(userId, provider)
  → 302 Redirect zu Terra-Widget-URL
  → User authentifiziert sich bei Oura via Terra-Widget
  → Terra POST /api/webhooks/terra (event: auth)
     → verifySignature → WearableConnection upsert → Points +10 (einmalig)
  → Terra POST /api/webhooks/terra (events: data, wiederholt)
     → verifySignature → mapTerraToWearableSync → WearableSync upsert
  → User klickt später "Trennen"
     → DELETE /api/wearables/terra/disconnect?provider=OURA
     → deauthorizeTerraUser → WearableConnection.isActive = false
```

### Module Split

```
src/lib/terra/
├── config.ts      — Env-Vars + isTerraEnabled()
├── client.ts      — Terra HTTP-Client (generateWidgetUrl, deauthorizeTerraUser)
├── webhook.ts     — Signature-Verify + Event-Routing
├── mapping.ts     — Terra-Payload → WearableSync-Struktur
└── __tests__/terra/
    ├── config.test.ts
    ├── client.test.ts
    ├── webhook.test.ts
    ├── mapping.test.ts
    └── fixtures/
        ├── auth-event.json
        ├── deauth-event.json
        ├── activity-data.json
        ├── sleep-data.json
        └── daily-data.json
```

**Begründung Split:** Signature-Verify + Mapping sind pure functions mit deterministischen Tests. Client-Calls sind IO und separat mockbar. Split macht Unit-Tests isoliert und begrenzt Datei-Größe.

### API Routes

| Route | Method | Beschreibung |
|---|---|---|
| `/api/wearables/terra/connect` | GET | Generiert Widget-URL, 302 Redirect |
| `/api/wearables/terra/disconnect` | DELETE | Terra deauth + lokales `isActive = false` |
| `/api/webhooks/terra` | POST | Empfängt Terra-Events (auth/data/deauth) |

---

## Data Model

### Schema-Migration: `WearableSync` erweitert

```prisma
model WearableSync {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  source     String
  date       DateTime
  steps      Int?
  heartRate  Float?
  sleepHours Float?
  // Neu für Terra (alle nullable, additiv):
  recoveryScore Float?   // 0-100 (Oura/Whoop recovery/readiness-score)
  hrv           Float?   // HRV in ms
  readiness     Float?   // 0-100 (Oura readiness)
  syncedAt   DateTime @default(now())

  @@unique([userId, source, date])
  @@index([userId, date])
  @@map("wearable_syncs")
}
```

**Migration-Art:** Additive Spalten, keine Daten-Migration, null-default.

### `WearableConnection` unverändert

Terra-User-ID wird verschlüsselt (AES-256-GCM via `lib/crypto.ts`) im Feld `accessToken` abgelegt. `source` diskriminiert: Für `"google_health"` = OAuth-Token, für `"oura"`/`"garmin"` = Terra-User-ID.

**Gotcha:** Dieses Field-Sharing ist dokumentiert und per `source` konsistent getrennt; keine Logik mischt Google- und Terra-Tokens.

---

## Module Interfaces

### `src/lib/terra/config.ts`

```ts
interface TerraConfig {
  devId: string
  apiKey: string
  webhookSecret: string
}

export function getTerraConfig(): TerraConfig | null
export function isTerraEnabled(): boolean  // = getTerraConfig() !== null
```

### `src/lib/terra/client.ts`

```ts
type TerraProvider = 'OURA' | 'GARMIN'

// POST https://api.tryterra.co/v2/auth/generateWidgetSession
// Body: { reference_id: userId, providers: [provider], auth_success_redirect_url, auth_failure_redirect_url }
// Returns: widget session URL
export async function generateWidgetUrl(
  userId: string,
  provider: TerraProvider,
): Promise<string>

// DELETE https://api.tryterra.co/v2/auth/deauthenticateUser?user_id=...
export async function deauthorizeTerraUser(terraUserId: string): Promise<void>
```

**Fehler:** Beide werfen bei non-2xx mit `{ code: 'terra_widget_failed' | 'terra_deauth_failed', status: number }`.

### `src/lib/terra/webhook.ts`

```ts
export function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean

export type TerraEvent =
  | { type: 'auth'; userId: string; terraUserId: string; provider: string }
  | { type: 'deauth'; terraUserId: string }
  | { type: 'data'; terraUserId: string; dataType: 'activity' | 'sleep' | 'body' | 'daily'; payload: unknown }
  | { type: 'unsupported' }

export function parseWebhookEvent(body: unknown): TerraEvent
```

**`verifySignature`:** HMAC-SHA256 über rawBody mit `secret`, vergleich mit Header `terra-signature` (timing-safe via `crypto.timingSafeEqual`). Null/missing signature → false.

**`parseWebhookEvent`:** Inspiziert `body.type`, extrahiert `reference_id` als `userId` (bei auth). Unbekannte Event-Types → `{ type: 'unsupported' }` (Terra hat dutzende Event-Types – wir mappen nur die vier relevanten).

### `src/lib/terra/mapping.ts`

```ts
export interface WearableSyncFields {
  date: Date
  steps?: number
  heartRate?: number
  sleepHours?: number
  recoveryScore?: number
  hrv?: number
  readiness?: number
}

export function mapTerraToWearableSync(
  event: Extract<TerraEvent, { type: 'data' }>,
  source: 'oura' | 'garmin',
): WearableSyncFields[]
```

**Mapping-Regeln:**
- Activity → `steps` (aus `distance_data.steps` oder `summary.steps`), `heartRate` (aus `heart_rate_data.summary.avg_hr_bpm`)
- Sleep → `sleepHours` (aus `sleep_durations_data.asleep.duration_asleep_state_seconds / 3600`)
- Body/Daily → `recoveryScore`, `hrv`, `readiness` aus entsprechenden Summary-Pfaden
- Mehrere Tage im Payload → eine `WearableSyncFields`-Zeile pro Tag
- Unbekannte Felder → ignorieren (Terra ändert Schemas ohne Notice)
- Leerer Payload → `[]`

---

## API Route Behavior

### `GET /api/wearables/terra/connect?provider=OURA|GARMIN`

- Session required (401 wenn keine User-Session).
- Query-Param `provider` validieren: nur `OURA`|`GARMIN` erlaubt (400 sonst).
- Wenn `!isTerraEnabled()` → 503 `{ error: 'terra_disabled' }`.
- `const widgetUrl = await generateWidgetUrl(session.userId, provider)`
- 302 Redirect zu `widgetUrl`.
- Kein Schreibzugriff auf DB an dieser Stelle – die `WearableConnection` entsteht erst durch den `auth`-Webhook.

### `DELETE /api/wearables/terra/disconnect?provider=OURA|GARMIN`

- Session required.
- Lookup `WearableConnection` via `(userId, source)` mit `source = provider.toLowerCase()`.
- Wenn nicht existent → 404.
- Terra-User-ID entschlüsseln via `decryptToken(conn.accessToken)`.
- Call `deauthorizeTerraUser(terraUserId)` — **fail-open**: bei Fehler nur `console.warn`, keine Exception propagieren.
- DB-Update: `isActive = false`, `accessToken = null`, `refreshToken = null`.
- Response: `{ success: true }`.

### `POST /api/webhooks/terra`

- KEINE Session-Auth.
- Raw-Body als String lesen (Next.js: `request.text()`), nicht `.json()` – wir brauchen das Original für HMAC.
- `verifySignature(rawBody, req.headers.get('terra-signature'), config.webhookSecret)` → false → 401 ohne Body-Detail.
- Parse: `const event = parseWebhookEvent(JSON.parse(rawBody))`
- Switch:
  - `auth` → `WearableConnection.upsert` (source ableiten aus `event.provider`), `accessToken = encryptToken(event.terraUserId)`, `isActive = true`. Dann Points awarden: `awardPoints(userId, 'wearable_connected')` (existing helper, idempotent via `@@unique`).
  - `data` → `mapTerraToWearableSync(event, source)` → für jede Zeile `WearableSync.upsert` mit `where: { userId_source_date: ... }`.
  - `deauth` → Lookup Connection via Terra-User-ID (verschlüsselt vergleichen ist nicht effizient; Alternative: `WearableConnection.findFirst` wo `source IN ['oura','garmin']` AND entschlüsselter Token = terraUserId). **Trade-off:** O(n) scan über aktive Premium-Connections. Akzeptabel da Zahl klein. Falls später bottleneck: separates Feld `terraUserIdHash` ergänzen.
  - `unsupported` → no-op.
- Response: immer 200 bei verifizierter Signatur (damit Terra nicht retried).
- Wenn `!isTerraEnabled()` → 503 (Terra wird dann erst gar nicht angebunden, defensive).

---

## UI Changes

### `src/app/(app)/profile/data-sources/page.tsx`

**Nur minimal:** Die bestehenden "Bald verfügbar"-Cards für Oura + Garmin erhalten bedingte Behandlung:

```tsx
const terraEnabled = process.env.NEXT_PUBLIC_TERRA_ENABLED === '1'

// Pro Card:
{terraEnabled ? (
  <Button onClick={() => window.location.href = '/api/wearables/terra/connect?provider=OURA'}>
    Verbinden
  </Button>
) : (
  <Button disabled>Bald verfügbar</Button>
)}
```

Whoop + Fitbit bleiben hart disabled.

**Verbundener Zustand:** Wenn `WearableConnection` mit `source = 'oura'` existiert und `isActive = true` → Card zeigt Sync-Status (wie Google Fit), "Trennen"-Button → `DELETE /api/wearables/terra/disconnect?provider=OURA`.

**Env-Flag:** `NEXT_PUBLIC_TERRA_ENABLED=1` wird vom Deployer parallel zu den Server-Vars gesetzt. Pragmatisch, keine zusätzliche Status-API nötig.

---

## Testing

### Unit-Tests

**`terra/config.test.ts`**
- `isTerraEnabled()` → true wenn alle 3 env-vars gesetzt
- `isTerraEnabled()` → false wenn eine fehlt
- `getTerraConfig()` → null wenn unvollständig, Objekt wenn vollständig

**`terra/client.test.ts`** (mit `vi.mock('fetch')`)
- `generateWidgetUrl` → ruft `POST /v2/auth/generateWidgetSession`, sendet `reference_id: userId`, `providers: [provider]`, returned URL aus Response
- `generateWidgetUrl` → wirft bei non-2xx
- `deauthorizeTerraUser` → ruft `DELETE /v2/auth/deauthenticateUser?user_id=...`

**`terra/webhook.test.ts`**
- `verifySignature` round-trip mit selbst-berechnetem HMAC
- `verifySignature` false bei falscher Signatur
- `verifySignature` false bei null/undefined header
- `parseWebhookEvent` für 4 Fixtures → korrekte Diskriminante
- `parseWebhookEvent` für unbekannten Type → `unsupported`

**`terra/mapping.test.ts`**
- Activity-Fixture → `steps` + `heartRate`
- Sleep-Fixture → `sleepHours`
- Daily-Fixture mit Recovery → `recoveryScore`, `hrv`, `readiness`
- Multi-day Payload → Array mit N Einträgen
- Leerer Payload → `[]`

### Fixtures

`src/lib/__tests__/terra/fixtures/*.json` – repräsentative (nicht vollständige) Terra-Payload-Strukturen aus der öffentlichen Doku. Fokus auf die Felder, die wir extrahieren.

### Coverage-Erwartung

Neue Terra-Module: > 90% (reine Unit-Tests, pure-function-dominated).
API-Routes: Integration-Tests optional, können in späterer Iteration folgen — in dieser Phase reichen Unit-Tests der lib-Module.

---

## Error Handling

| Szenario | Verhalten |
|---|---|
| Terra-API 5xx bei Widget-Gen | 502 an Client, User sieht Error-Message |
| Terra-API 4xx bei Widget-Gen | 502, Log-Error |
| Webhook Signature fail | 401 ohne Body-Detail |
| Webhook Unknown Event | 200, no-op |
| Webhook Mapping-Error (Zod/TypeScript) | 200 (nicht 5xx → Terra würde retried), Log-Error |
| Disconnect: Terra-Fehler | Lokales `isActive = false` trotzdem, Log-Warning (fail-open) |
| `!isTerraEnabled()` auf geschützten Routes | 503 `{ error: 'terra_disabled' }` |
| User hat bereits verbundene Quelle | auth-Webhook upserted idempotent |

---

## Wording-Regel (aus Entwicklungsplan §4)

- Keine Kommentare/Log-Messages mit "medical"/"health data"/"diagnosis".
- Stattdessen: "activity data", "sync data", "movement pattern", "recovery indicator".
- UI-Strings für Terra-Felder:
  - `recoveryScore` → "Erholungsindikator"
  - `hrv` → "Herzraten-Variabilität"
  - `readiness` → "Tagesbereitschaft"

---

## Env-Vars (Deployment)

| Var | Wert-Beispiel | Scope |
|---|---|---|
| `TERRA_DEV_ID` | `dev-abc123` | Server |
| `TERRA_API_KEY` | `...` | Server |
| `TERRA_WEBHOOK_SECRET` | `...` | Server (für HMAC-Verify) |
| `NEXT_PUBLIC_TERRA_ENABLED` | `1` | Client (UI-Gate) |

Alle vier müssen gemeinsam gesetzt werden. Abwesenheit einer der Server-Vars → `isTerraEnabled()` = false → Routes antworten 503. Abwesenheit von `NEXT_PUBLIC_TERRA_ENABLED` → UI zeigt "Bald verfügbar".

---

## Open Questions / Future Work

- **Whoop + Fitbit-Freischaltung:** Gleicher Code-Pfad; nur UI-Flag umschalten + Provider-Validierung im Connect-Route erweitern.
- **Recovery/HRV im Dashboard/Score:** Daten werden gespeichert, aber nicht im Vitalitäts-Score verrechnet. Separate Produktentscheidung, eigene Spec.
- **Performance Deauth-Lookup:** Wenn Premium-User-Zahl wächst: `terraUserIdHash`-Feld in `WearableConnection` ergänzen, indexieren.
- **Integration-Tests für Routes:** In späterer Härtungsphase ergänzen, sobald eine `createAuthenticatedRequest`-Utility verfügbar ist.
