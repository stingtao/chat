-- Add missing OAuth/profile fields for Host
ALTER TABLE "Host" ADD COLUMN "avatar" TEXT;
ALTER TABLE "Host" ADD COLUMN "googleId" TEXT;
ALTER TABLE "Host" ADD COLUMN "lineId" TEXT;
ALTER TABLE "Host" ADD COLUMN "authProvider" TEXT NOT NULL DEFAULT 'email';

-- Add missing OAuth fields for User
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;
ALTER TABLE "User" ADD COLUMN "lineId" TEXT;
ALTER TABLE "User" ADD COLUMN "authProvider" TEXT NOT NULL DEFAULT 'email';

-- Add memberTag to WorkspaceMember (nullable for existing rows)
ALTER TABLE "WorkspaceMember" ADD COLUMN "memberTag" TEXT;

-- Indexes for OAuth identifiers
CREATE UNIQUE INDEX IF NOT EXISTS "Host_googleId_key" ON "Host"("googleId");
CREATE UNIQUE INDEX IF NOT EXISTS "Host_lineId_key" ON "Host"("lineId");
CREATE INDEX IF NOT EXISTS "Host_googleId_idx" ON "Host"("googleId");
CREATE INDEX IF NOT EXISTS "Host_lineId_idx" ON "Host"("lineId");

CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_lineId_key" ON "User"("lineId");
CREATE INDEX IF NOT EXISTS "User_googleId_idx" ON "User"("googleId");
CREATE INDEX IF NOT EXISTS "User_lineId_idx" ON "User"("lineId");

-- Indexes for memberTag
CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceMember_workspaceId_memberTag_key" ON "WorkspaceMember"("workspaceId", "memberTag");
CREATE INDEX IF NOT EXISTS "WorkspaceMember_memberTag_idx" ON "WorkspaceMember"("memberTag");
