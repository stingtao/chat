-- Add session version counters for revocable JWT sessions
ALTER TABLE "Host" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- Persistent rate-limit buckets for edge/API abuse control
CREATE TABLE IF NOT EXISTS "RateLimitBucket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL,
    "identifierHash" TEXT NOT NULL,
    "windowStartAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "RateLimitBucket_scope_identifierHash_windowStartAt_key"
ON "RateLimitBucket"("scope", "identifierHash", "windowStartAt");

CREATE INDEX IF NOT EXISTS "RateLimitBucket_expiresAt_idx"
ON "RateLimitBucket"("expiresAt");

CREATE INDEX IF NOT EXISTS "RateLimitBucket_scope_expiresAt_idx"
ON "RateLimitBucket"("scope", "expiresAt");
