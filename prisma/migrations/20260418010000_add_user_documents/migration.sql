-- CreateTable "user_documents"
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

-- CreateIndex
CREATE INDEX "user_documents_userId_idx" ON "user_documents"("userId");
