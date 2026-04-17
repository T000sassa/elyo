CREATE TABLE "anamnesis_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completionPct" INTEGER NOT NULL DEFAULT 0,
    "birthYear" INTEGER,
    "biologicalSex" TEXT,
    "activityLevel" TEXT,
    "sleepQuality" TEXT,
    "stressTendency" TEXT,
    "smokingStatus" TEXT,
    "nutritionType" TEXT,
    "chronicPatterns" TEXT[],
    "hasMedication" BOOLEAN,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anamnesis_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "anamnesis_profiles_userId_key" ON "anamnesis_profiles"("userId");

CREATE TABLE "health_documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "health_documents_userId_idx" ON "health_documents"("userId");

ALTER TABLE "anamnesis_profiles" ADD CONSTRAINT "anamnesis_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "health_documents" ADD CONSTRAINT "health_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
