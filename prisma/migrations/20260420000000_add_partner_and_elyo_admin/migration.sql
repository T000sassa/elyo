-- Add ELYO_ADMIN to Role enum
ALTER TYPE "Role" ADD VALUE 'ELYO_ADMIN';

-- Create PartnerVerificationStatus enum
CREATE TYPE "PartnerVerificationStatus" AS ENUM (
  'PENDING_DOCS',
  'PENDING_REVIEW',
  'VERIFIED',
  'SUSPENDED',
  'REJECTED'
);

-- Make User.companyId nullable
ALTER TABLE "users" ALTER COLUMN "companyId" DROP NOT NULL;

-- Create partners table
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "categories" TEXT[] NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "website" TEXT,
    "phone" TEXT,
    "minimumLevel" TEXT NOT NULL DEFAULT 'STARTER',
    "nachweisUrl" TEXT,
    "verificationStatus" "PartnerVerificationStatus" NOT NULL DEFAULT 'PENDING_DOCS',
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partners_email_key" ON "partners"("email");
CREATE INDEX "partners_verificationStatus_idx" ON "partners"("verificationStatus");
CREATE INDEX "partners_categories_idx" ON "partners" USING GIN ("categories");
CREATE INDEX "partners_lat_lng_idx" ON "partners"("lat", "lng");
