-- CreateTable "measures"
CREATE TABLE "measures" (
  "id"          TEXT NOT NULL,
  "companyId"   TEXT NOT NULL,
  "teamId"      TEXT,
  "title"       TEXT NOT NULL,
  "category"    TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'SUGGESTED',
  "suggestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt"   TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdBy"   TEXT NOT NULL,
  CONSTRAINT "measures_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "measures_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "measures_companyId_status_idx" ON "measures"("companyId", "status");
