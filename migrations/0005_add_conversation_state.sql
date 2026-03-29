-- Per-user conversation state for direct and group chats
CREATE TABLE IF NOT EXISTS "ConversationState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationType" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "lastMessageId" TEXT,
    "lastMessageAt" DATETIME,
    "lastReadMessageId" TEXT,
    "lastReadAt" DATETIME,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationState_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConversationState_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "conversation_lookup"
ON "ConversationState"("workspaceId", "userId", "conversationType", "conversationId");

CREATE INDEX IF NOT EXISTS "ConversationState_workspaceId_userId_conversationType_idx"
ON "ConversationState"("workspaceId", "userId", "conversationType");

CREATE INDEX IF NOT EXISTS "ConversationState_workspaceId_userId_lastMessageAt_idx"
ON "ConversationState"("workspaceId", "userId", "lastMessageAt");
