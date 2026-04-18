CREATE TABLE "wearable_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wearable_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wearable_connections_userId_source_key" ON "wearable_connections"("userId", "source");

CREATE TABLE "wearable_syncs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "steps" INTEGER,
    "heartRate" DOUBLE PRECISION,
    "sleepHours" DOUBLE PRECISION,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wearable_syncs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wearable_syncs_userId_source_date_key" ON "wearable_syncs"("userId", "source", "date");

CREATE INDEX "wearable_syncs_userId_date_idx" ON "wearable_syncs"("userId", "date");

ALTER TABLE "wearable_connections" ADD CONSTRAINT "wearable_connections_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wearable_syncs" ADD CONSTRAINT "wearable_syncs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
