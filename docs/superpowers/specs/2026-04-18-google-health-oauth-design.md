# Design Spec: Google Health OAuth Integration (Prompt 2.2)

**Datum:** 2026-04-18
**Phase:** 2 – Partner-Ökosystem & Wearables
**Scope:** Backend only. Keine UI. lib-Funktion, vier API-Routen, konsolidierte Cron-Route, Unit-Tests.

---

## Ziel

Google Fitness API per OAuth anbinden: Nutzer verbinden ihr Google-Konto, tägliche Aktivitätsdaten (Schritte, Schlaf, Herzrate) werden automatisch synchronisiert und in `WearableSync` gespeichert. Die bestehenden Cron-Einzelrouten werden in eine konsolidierte Route migriert (vorgezogen aus Prompt 2.7).

---

## Voraussetzungen

- `WearableConnection` und `WearableSync` Prisma-Modelle aus Prompt 2.1
- `encryptToken` / `decryptToken` aus `src/lib/crypto.ts`
- Env-Vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL`, `CRON_SECRET`, `ENCRYPTION_KEY`, `OAUTH_HMAC_SECRET`

---

## `src/lib/googleHealth.ts`

### Sieben Funktionen

**`getAuthUrl(userId: string): string`**
Erzeugt die Google OAuth-Consent-URL. State-Parameter = `base64(userId + "." + hmac(userId, OAUTH_HMAC_SECRET))` — verhindert CSRF. Scopes:
- `https://www.googleapis.com/auth/fitness.activity.read`
- `https://www.googleapis.com/auth/fitness.sleep.read`
- `https://www.googleapis.com/auth/fitness.heart_rate.read`

**`exchangeCode(code: string, state: string): Promise<void>`**
1. State dekodieren und HMAC validieren → userId extrahieren
2. POST an `https://oauth2.googleapis.com/token` → `access_token`, `refresh_token`, `expires_in`
3. Tokens verschlüsselt via `encryptToken` in `WearableConnection` speichern (`upsert` auf `[userId, "google_health"]`)
4. `awardPoints(userId, "wearable_connected")` auslösen — einmalig, idempotent (Points-Engine prüft bereits ob Reason schon vergeben)

**`refreshAccessTokenIfNeeded(userId: string): Promise<void>`**
Lädt `WearableConnection` für `[userId, "google_health"]`. Wenn `expiresAt < now + 5min`: POST an Token-Endpoint mit `refresh_token`, aktualisiert `accessToken` + `expiresAt` in DB. Sonst no-op.

**`fetchSteps(userId: string, from: Date, to: Date): Promise<void>`**
Ruft intern `refreshAccessTokenIfNeeded` auf. POST an `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate` mit `com.google.step_count.delta`. Ergebnis: `upsert` in `WearableSync` pro Tag.

**`fetchSleepSessions(userId: string, from: Date, to: Date): Promise<void>`**
Analog zu `fetchSteps`. DataType: `com.google.sleep.segment`. Schlafstunden pro Tag aggregiert.

**`fetchHeartRateAvg(userId: string, from: Date, to: Date): Promise<void>`**
Analog. DataType: `com.google.heart_rate.bpm`. Tagesdurchschnitt.

**`disconnectUser(userId: string): Promise<void>`**
Setzt `isActive = false`, löscht `accessToken` und `refreshToken` aus `WearableConnection`. `WearableSync`-Daten bleiben erhalten (User-Daten gehören dem User; Löschung auf separaten Wunsch via DSGVO-Flow).

### Fehlerbehandlung

Bei Token-Fehler (401 von Google während Sync): `WearableConnection.isActive = false` setzen. Caller (Cron-Job) loggt den Fehler. E-Mail an Nutzer wird in Prompt 2.7 ergänzt.

---

## API-Routen

Alle unter `src/app/api/wearables/google/`.

### `GET /api/wearables/google/connect`

Auth via `auth()`. Nur `EMPLOYEE`. Redirect zu `getAuthUrl(session.user.id)`.

### `GET /api/wearables/google/callback`

**Keine Session-Auth** — kommt von Google-Redirect. Absicherung via State-Validierung in `exchangeCode`. Query-Params: `code`, `state`. Ruft `exchangeCode(code, state)` auf. Bei Erfolg: Redirect nach `/profile/data-sources`. Bei Fehler: Redirect nach `/profile/data-sources?error=oauth_failed`.

### `POST /api/wearables/google/sync`

Auth via `auth()`. Nur `EMPLOYEE`. Ruft `fetchSteps`, `fetchSleepSessions`, `fetchHeartRateAvg` für die letzten 7 Tage auf. Response: `{ data: { synced: true } }`.

### `DELETE /api/wearables/google/disconnect`

Auth via `auth()`. Nur `EMPLOYEE`. Ruft `disconnectUser(session.user.id)` auf. Response: 204.

---

## Konsolidierte Cron-Route

**Neue Datei:** `src/app/api/cron/route.ts`

Ersetzt die zwei bestehenden Routen:
- `src/app/api/cron/checkin-reminder/route.ts` → wird gelöscht
- `src/app/api/cron/weekly-digest/route.ts` → wird gelöscht

Gleiche Auth: `x-cron-secret` Header, Timing-Safe-Vergleich.

Query-Parameter `action` steuert welcher Job läuft:

| action | Logik |
|---|---|
| `daily-checkin-reminder` | Bisherige Logik aus `checkin-reminder/route.ts` |
| `weekly-digest` | Bisherige Logik aus `weekly-digest/route.ts` |
| `wearable-sync` | Alle `WearableConnection` mit `isActive = true` und `source = "google_health"` → `fetchSteps/Sleep/HeartRate` letzte 7 Tage |

Response-Format für alle Actions:
```json
{
  "results": {
    "wearable-sync": {
      "success": true,
      "duration": 1234,
      "affected": 12
    }
  }
}
```

Jeder Job ist in `try/catch` gewrappt — ein fehlgeschlagener Job blockt nicht die anderen. Laufzeit-Messung via `performance.now()`.

---

## Unit-Tests

**Datei:** `src/lib/__tests__/googleHealth.test.ts`

Tests verwenden `vi.mock` für `fetch` (kein echter Google API-Call).

| Test | Beschreibung |
|---|---|
| `getAuthUrl` enthält korrekte Scopes | URL enthält alle drei Fitness-Scopes |
| `getAuthUrl` State enthält userId | State dekodiert zu korrektem Format |
| `exchangeCode` speichert verschlüsselten Token | Mock-Token-Response → DB-Upsert aufgerufen |
| `exchangeCode` wirft bei falschem State | Manipulierter HMAC → Error |
| `exchangeCode` ruft awardPoints auf | Mock für awardPoints verifiziert |
| `refreshAccessTokenIfNeeded` erneuert bei abgelaufenem Token | `expiresAt` in Vergangenheit → Token-Refresh-Call |
| `refreshAccessTokenIfNeeded` no-op bei gültigem Token | `expiresAt` weit in Zukunft → kein HTTP-Call |
| `disconnectUser` setzt isActive = false | DB-Update verifiziert |

---

## Nicht in Scope

- Apple Health, Oura, Garmin, Whoop (→ Prompt 3.1 via Terra API)
- UI für Datenquellen-Verwaltung (→ Prompt 2.3)
- E-Mail bei Sync-Fehler (→ Prompt 2.7)
- Push Notifications (→ Prompt 2.7)
