import type { DurableObjectNamespace } from '@cloudflare/workers-types';
import { getCloudflareEnv } from './cloudflare';
import type { WSMessage } from './types';

export type ConversationType = 'direct' | 'group';

interface RoomNameInput {
  workspaceId: string;
  type: ConversationType;
  conversationId: string;
  userId?: string;
}

export function buildRoomName({
  workspaceId,
  type,
  conversationId,
  userId,
}: RoomNameInput): string {
  if (type === 'group') {
    return `workspace:${workspaceId}:group:${conversationId}`;
  }

  if (!userId) {
    throw new Error('userId is required for direct rooms');
  }

  const [first, second] = [userId, conversationId].sort();
  return `workspace:${workspaceId}:direct:${first}:${second}`;
}

export async function broadcastToRoom(options: {
  roomName: string;
  message: WSMessage;
  namespace?: DurableObjectNamespace;
}): Promise<void> {
  const namespace = options.namespace ?? getCloudflareEnv()?.CHAT_ROOM;
  if (!namespace) return;

  const stub = namespace.get(namespace.idFromName(options.roomName));
  await stub.fetch('https://chat-room/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options.message),
  });
}
