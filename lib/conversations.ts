import type { Prisma } from '@prisma/client';
import { getPrismaClientFromContext } from './db';
import type { ConversationType } from './utils';

type PrismaClient = Awaited<ReturnType<typeof getPrismaClientFromContext>>;

type ConversationStateIdentity = {
  workspaceId: string;
  userId: string;
  conversationType: ConversationType;
  conversationId: string;
};

type ConversationStateMutation = ConversationStateIdentity & {
  lastMessageId?: string | null;
  lastMessageAt?: Date | string | null;
  incrementUnreadBy?: number;
  markRead?: boolean;
};

function getConversationLookup(identity: ConversationStateIdentity) {
  return {
    conversation_lookup: {
      workspaceId: identity.workspaceId,
      userId: identity.userId,
      conversationType: identity.conversationType,
      conversationId: identity.conversationId,
    },
  } satisfies Prisma.ConversationStateWhereUniqueInput;
}

function normalizeDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
}

function buildConversationMessageWhere(identity: ConversationStateIdentity) {
  if (identity.conversationType === 'group') {
    return {
      workspaceId: identity.workspaceId,
      groupId: identity.conversationId,
    };
  }

  return {
    workspaceId: identity.workspaceId,
    OR: [
      { senderId: identity.userId, receiverId: identity.conversationId },
      { senderId: identity.conversationId, receiverId: identity.userId },
    ],
  };
}

export async function applyConversationStateMutations(
  prisma: PrismaClient,
  mutations: ConversationStateMutation[]
) {
  if (mutations.length === 0) {
    return;
  }

  await prisma.$transaction(
    mutations.map((mutation) => {
      const identity: ConversationStateIdentity = {
        workspaceId: mutation.workspaceId,
        userId: mutation.userId,
        conversationType: mutation.conversationType,
        conversationId: mutation.conversationId,
      };
      const lastMessageAt = normalizeDate(mutation.lastMessageAt);
      const update: Prisma.ConversationStateUpdateInput = {};
      const create: Prisma.ConversationStateUncheckedCreateInput = {
        workspaceId: identity.workspaceId,
        userId: identity.userId,
        conversationType: identity.conversationType,
        conversationId: identity.conversationId,
        unreadCount: mutation.markRead ? 0 : Math.max(0, mutation.incrementUnreadBy ?? 0),
      };

      if (mutation.lastMessageId) {
        update.lastMessageId = mutation.lastMessageId;
        create.lastMessageId = mutation.lastMessageId;
      }

      if (lastMessageAt) {
        update.lastMessageAt = lastMessageAt;
        create.lastMessageAt = lastMessageAt;
      }

      if (mutation.markRead) {
        update.unreadCount = 0;
        update.lastReadAt = lastMessageAt || new Date();
        create.lastReadAt = lastMessageAt || new Date();

        if (mutation.lastMessageId) {
          update.lastReadMessageId = mutation.lastMessageId;
          create.lastReadMessageId = mutation.lastMessageId;
        }
      } else if ((mutation.incrementUnreadBy ?? 0) > 0) {
        update.unreadCount = {
          increment: mutation.incrementUnreadBy,
        };
      }

      return prisma.conversationState.upsert({
        where: getConversationLookup(identity),
        update,
        create,
      });
    })
  );
}

export async function markConversationAsRead(
  prisma: PrismaClient,
  identity: ConversationStateIdentity
) {
  const latestMessage = await prisma.message.findFirst({
    where: buildConversationMessageWhere(identity),
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      createdAt: true,
    },
  });

  await applyConversationStateMutations(prisma, [
    {
      ...identity,
      lastMessageId: latestMessage?.id,
      lastMessageAt: latestMessage?.createdAt,
      markRead: true,
    },
  ]);

  return latestMessage;
}

export async function syncConversationStatesForMessage(
  prisma: PrismaClient,
  options: {
    workspaceId: string;
    messageId: string;
    messageCreatedAt: Date | string;
    senderId: string;
    receiverId?: string | null;
    groupId?: string | null;
    recipientUserIds: string[];
  }
) {
  const lastMessageAt = normalizeDate(options.messageCreatedAt);
  if (!lastMessageAt) {
    return;
  }

  if (options.groupId) {
    await applyConversationStateMutations(prisma, [
      {
        workspaceId: options.workspaceId,
        userId: options.senderId,
        conversationType: 'group',
        conversationId: options.groupId,
        lastMessageId: options.messageId,
        lastMessageAt,
        markRead: true,
      },
      ...options.recipientUserIds.map((userId) => ({
        workspaceId: options.workspaceId,
        userId,
        conversationType: 'group' as const,
        conversationId: options.groupId!,
        lastMessageId: options.messageId,
        lastMessageAt,
        incrementUnreadBy: 1,
      })),
    ]);
    return;
  }

  if (!options.receiverId) {
    return;
  }

  await applyConversationStateMutations(prisma, [
    {
      workspaceId: options.workspaceId,
      userId: options.senderId,
      conversationType: 'direct',
      conversationId: options.receiverId,
      lastMessageId: options.messageId,
      lastMessageAt,
      markRead: true,
    },
    {
      workspaceId: options.workspaceId,
      userId: options.receiverId,
      conversationType: 'direct',
      conversationId: options.senderId,
      lastMessageId: options.messageId,
      lastMessageAt,
      incrementUnreadBy: 1,
    },
  ]);
}
