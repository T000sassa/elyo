-- CreateTable "PushSubscription"
CREATE TABLE "PushSubscription" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "endpoint"  TEXT NOT NULL,
  "p256dh"    TEXT NOT NULL,
  "auth"      TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PushSubscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable "NotificationPreference"
CREATE TABLE "NotificationPreference" (
  "userId"              TEXT NOT NULL,
  "checkinReminder"     BOOLEAN NOT NULL DEFAULT true,
  "checkinReminderTime" TEXT NOT NULL DEFAULT '09:00',
  "weeklySummary"       BOOLEAN NOT NULL DEFAULT true,
  "partnerUpdates"      BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "NotificationPreference_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");
