import type {
  D1Database,
  DurableObjectNamespace,
  PagesFunction,
} from '@cloudflare/workers-types';
import { getPrismaClient } from '../lib/db';
import { verifyToken } from '../lib/auth';
import { buildRoomName, type ConversationType } from '../lib/realtime';

interface Env {
  DB: D1Database;
  CHAT_ROOM: DurableObjectNamespace;
  JWT_SECRET?: string;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.headers.get('Upgrade') !== 'websocket') {
    return new Response('Expected websocket', { status: 426 });
  }

  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const workspaceId = url.searchParams.get('workspaceId');
  const conversationType = url.searchParams.get('type') as ConversationType | null;
  const conversationId = url.searchParams.get('id');

  if (!token || !workspaceId || !conversationType || !conversationId) {
    return new Response('Missing connection parameters', { status: 400 });
  }

  if (conversationType !== 'direct' && conversationType !== 'group') {
    return new Response('Invalid conversation type', { status: 400 });
  }

  const payload = await verifyToken(token, env.JWT_SECRET);
  if (!payload || payload.type !== 'client') {
    return new Response('Unauthorized', { status: 401 });
  }

  const prisma = getPrismaClient(env.DB);
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: payload.userId,
    },
  });

  if (!membership) {
    return new Response('Not a member of this workspace', { status: 403 });
  }

  if (conversationType === 'group') {
    const group = await prisma.group.findFirst({
      where: {
        id: conversationId,
        workspaceId,
      },
    });

    if (!group) {
      return new Response('Group not found', { status: 404 });
    }

    const groupMember = await prisma.groupMember.findFirst({
      where: {
        groupId: conversationId,
        userId: payload.userId,
      },
    });

    if (!groupMember) {
      return new Response('Not a member of this group', { status: 403 });
    }
  }

  if (conversationType === 'direct') {
    if (conversationId === payload.userId) {
      return new Response('Invalid direct conversation', { status: 400 });
    }

    const receiverMembership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: conversationId,
      },
    });

    if (!receiverMembership) {
      return new Response('Recipient not in workspace', { status: 404 });
    }

    const friendship = await prisma.friendship.findFirst({
      where: {
        workspaceId,
        status: 'accepted',
        OR: [
          { senderId: payload.userId, receiverId: conversationId },
          { senderId: conversationId, receiverId: payload.userId },
        ],
      },
    });

    if (!friendship) {
      return new Response('Not friends', { status: 403 });
    }
  }

  const roomName = buildRoomName({
    workspaceId,
    type: conversationType,
    conversationId,
    userId: payload.userId,
  });

  const forwardUrl = new URL(request.url);
  forwardUrl.searchParams.delete('token');

  const headers = new Headers(request.headers);
  headers.set('x-user-id', payload.userId);
  headers.set('x-room-name', roomName);

  const stub = env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(roomName));
  return stub.fetch(new Request(forwardUrl.toString(), { headers }));
};
