# Design Spec: Push Notifications & Cron Hardening (Prompt 2.7)

**Datum:** 2026-04-19
**Phase:** 2 – Partner-Ökosystem & Wearables
**Scope:** `PushSubscription`-Modell, `NotificationPreference`-Modell, `src/lib/webPush.ts`, Service Worker `public/sw.js`, Push-API-Routes, Notification-Preferences-UI, Cron-Erweiterung (`streak-check`)

---

## Ziel

Mitarbeiter können Web-Push-Benachrichtigungen aktivieren. Level-Ups und Check-in-Erinnerungen werden als Push-Notifications gesendet. Admins erhalten At-Risk-Alerts per Push. Nutzer können Benachrichtigungen granular steuern. Cron erhält `streak-check`-Action für Streak-Boni.

---

## Voraussetzungen

- `UserPoints`-Modell mit `streak`, `level`, `total`
- `User`-Modell mit E-Mail
- `points.ts` mit `POINT_RULES` (streak_7days: 5, streak_30days: 15)
- `awardPoints()` aus `points.ts`
- `web-push` npm-Paket (noch nicht installiert)
- VAPID Keys via Umgebungsvariablen

---

## Neue Umgebungsvariablen

| Variable | Beschreibung |
|---|---|
| `VAPID_PUBLIC_KEY` | VAPID Public Key (Base64Url) |
| `VAPID_PRIVATE_KEY` | VAPID Private Key (Base64Url) |
| `VAPID_SUBJECT` | mailto: oder https: Absender-URL |

Generierung: `npx web-push generate-vapid-keys`

---

## Datenmodell

### `PushSubscription` (neue Migration)

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())

  @@index([userId])
}
```

### `NotificationPreference` (neue Migration)

```prisma
model NotificationPreference {
  userId              String  @id
  user                User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  checkinReminder     Boolean @default(true)
  checkinReminderTime String  @default("09:00")
  weeklySummary       Boolean @default(true)
  partnerUpdates      Boolean @default(false)
}
```

`User` bekommt Relations: `pushSubscriptions PushSubscription[]`, `notificationPreference NotificationPreference?`.

---

## Service Worker `public/sw.js`

Minimaler Service Worker für Push-Empfang:

```javascript
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title ?? 'ELYO'
  const options = {
    body: data.body ?? '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: { url: data.url ?? '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})
```

---

## `src/lib/webPush.ts`

### Exports

```typescript
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
): Promise<{ sent: number; failed: number }>

export async function saveSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<void>

export async function removeSubscription(userId: string, endpoint: string): Promise<void>
```

### Implementierung

`sendPushToUser`:
1. Alle `PushSubscription`s des Users laden
2. Für jede: `webpush.sendNotification(subscription, JSON.stringify(payload))`
3. Bei `webpush.WebPushError` mit Status 410 (Gone): Subscription aus DB löschen
4. Gibt `{ sent, failed }` zurück

Initialisierung:
```typescript
import webpush from 'web-push'
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)
```

---

## API-Routes

### `POST /api/push/subscribe`

**Auth:** Jeder authentifizierte User

**Body:**
```typescript
{ endpoint: string; keys: { p256dh: string; auth: string } }
```

Speichert oder aktualisiert (`upsert` via `endpoint`) die PushSubscription des Users.

**Response:** 201 `{ ok: true }`

### `DELETE /api/push/subscribe`

**Auth:** Jeder authentifizierte User

**Body:** `{ endpoint: string }`

Löscht die Subscription. Gibt 200 zurück.

### `GET /api/push/vapid-public-key`

**Auth:** Jeder authentifizierte User

**Response:** `{ publicKey: process.env.VAPID_PUBLIC_KEY }`

Wird vom Frontend beim Service-Worker-Setup benötigt.

### `GET /api/notifications/preferences`

**Auth:** Jeder authentifizierte User

Gibt `NotificationPreference` des Users zurück. Falls nicht vorhanden: Default-Werte.

**Response:** `{ preferences: { checkinReminder, checkinReminderTime, weeklySummary, partnerUpdates } }`

### `PATCH /api/notifications/preferences`

**Auth:** Jeder authentifizierte User

**Body:**
```typescript
{ checkinReminder?: boolean; checkinReminderTime?: string; weeklySummary?: boolean; partnerUpdates?: boolean }
```

Upsert in `NotificationPreference`. Gibt aktualisierte Preferences zurück.

---

## Push-Trigger-Integration

### Level-Up in `src/app/api/points/award/route.ts`

Nach `awardPoints()`: Wenn sich das Level geändert hat, `sendPushToUser(userId, { title: '🎉 Level erreicht!', body: `Du hast ${newLevel} erreicht! Dein neuer Vorteil ist jetzt aktiv.`, url: '/level' })`.

Da die `award`-Route keine Level-Up-Erkennung hat: Neuen Parameter `levelBefore` merken, nach Award vergleichen.

### Check-in-Reminder in Cron

In `runCheckinReminder`: Statt nur E-Mail auch `sendPushToUser()` aufrufen — aber nur wenn `notificationPreference.checkinReminder = true` (oder Preference nicht vorhanden → Default true).

---

## Cron-Erweiterung: `streak-check`

```typescript
async function runStreakCheck(): Promise<ActionResult>
```

**Logik:**
1. Alle `UserPoints`-Einträge mit `streak >= 7` laden
2. Für `streak >= 7` und nicht bereits bonus vergeben: `awardPoints(userId, 'streak_7days')`
3. Für `streak >= 30`: `awardPoints(userId, 'streak_30days')`
4. **Dedup:** Bonus nur vergeben wenn in `PointTransaction` in den letzten 7 Tagen (`streak_7days`) bzw. 30 Tagen (`streak_30days`) keine entsprechende Transaktion existiert

---

## UI `src/app/(app)/profile/notifications/page.tsx`

**Client Component**

```typescript
interface NotificationPreferences {
  checkinReminder: boolean
  checkinReminderTime: string
  weeklySummary: boolean
  partnerUpdates: boolean
}
```

**Sections:**

1. **Push-Benachrichtigungen aktivieren** (Header-Karte):
   - Toggle + "Push-Benachrichtigungen aktivieren"
   - Registriert Service Worker + `POST /api/push/subscribe`
   - Status: "Aktiv" / "Inaktiv"

2. **Benachrichtigungstypen** (Toggle-Liste):
   - Check-in-Erinnerung: an/aus + Uhrzeitfeld (`checkinReminderTime`, Time-Input)
   - Wöchentliche Zusammenfassung: an/aus
   - Partner-Neuigkeiten: an/aus
   - Level-Up: immer an (Badge "Immer aktiv", nicht deaktivierbar)

3. **Speichern-Button**: `PATCH /api/notifications/preferences`

---

## Tests

### `src/lib/__tests__/webPush.test.ts`

Mock: `vi.mock('web-push')`, `vi.mock('../prisma')`

| Test | Was geprüft wird |
|---|---|
| `sendPushToUser` — erfolgreiche Sends | Gibt `{ sent: 1, failed: 0 }` zurück |
| `sendPushToUser` — 410 Gone entfernt Subscription | `prisma.pushSubscription.delete` aufgerufen |
| `sendPushToUser` — kein Subscription | Gibt `{ sent: 0, failed: 0 }` zurück |
| `saveSubscription` — neu | Upsert wird aufgerufen |
| `removeSubscription` | Delete wird aufgerufen |

### API-Route-Tests

`/api/push/subscribe`: 401, 201
`/api/notifications/preferences` GET: 401, 200 (defaults wenn kein Eintrag)
`/api/notifications/preferences` PATCH: 401, 200

---

## Nicht in Scope

- At-Risk-Alert Push an Admins (würde komplexe Company-Aggregation bei Level-Check erfordern — Phase 3)
- Wearable-Sync-Fehler-Push (würde `googleHealth.ts`-Änderungen erfordern)
- E-Mail-Unsubscribe-Link mit signiertem Token (separates Feature, bleibt für Tech-Schulden T.2)
- iOS Safari Push (erfordert eigene APNS-Integration)
- Background Sync für Offline-Check-ins (→ Phase 2.8 PWA)
