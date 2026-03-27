import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getCloudflareEnv } from '@/lib/cloudflare';
import { getPrismaClientFromContext } from '@/lib/db';
import {
  broadcastToRoom,
  buildRoomName,
} from '@/lib/realtime';
import type { WSMessage } from '@/lib/types';
import {
  sendPushNotificationToMany,
  createMessageNotificationPayload,
  NotificationType,
} from '@/lib/notifications';
import {
  markConversationAsRead,
  syncConversationStatesForMessage,
} from '@/lib/conversations';
import { authenticateNextRequest } from '@/lib/session';
import {
  appendReadByUser,
  buildConversationKey,
  clampNumber,
  normalizeTextInput,
  parseConversationNotificationData,
  parseReadBy,
} from '@/lib/utils';
import { enforceRateLimit } from '@/lib/rate-limit';

export const runtime = 'edge';

const ALLOWED_MESSAGE_TYPES = new Set(['text', 'image', 'file']);
const MAX_MESSAGE_LENGTH = 4000;
const MAX_MESSAGE_FETCH_LIMIT = 100;

async function markConversationNotificationsAsRead(options: {
  prisma: Awaited<ReturnType<typeof getPrismaClientFromContext>>;
  userId: string;
  workspaceId: string;
  conversationType: 'direct' | 'group';
  conversationId: string;
}) {
  const unreadNotifications = await options.prisma.notification.findMany({
    where: {
      userId: options.userId,
      workspaceId: options.workspaceId,
      type: NotificationType.MESSAGE,
      isRead: false,
    },
    select: {
      id: true,
      data: true,
    },
  });

  const targetKey = buildConversationKey(options.conversationType, options.conversationId);
  const notificationIds = unreadNotifications
    .filter((notification) => {
      const data = parseConversationNotificationData(notification.data);
      if (!data?.conversationId || !data.conversationType) {
        return false;
      }

      return buildConversationKey(data.conversationType, data.conversationId) === targetKey;
    })
    .map((notification) => notification.id);

  if (notificationIds.length === 0) {
    return;
  }

  await options.prisma.notification.updateMany({
    where: {
      id: { in: notificationIds },
      userId: options.userId,
    },
    data: {
      isRead: true,
    },
  });
}

function buildConversationWhere(options: {
  workspaceId: string;
  userId: string;
  conversationType: 'direct' | 'group';
  conversationId: string;
}) {
  if (options.conversationType === 'group') {
    return {
      workspaceId: options.workspaceId,
      groupId: options.conversationId,
    };
  }

  return {
    workspaceId: options.workspaceId,
    OR: [
      { senderId: options.userId, receiverId: options.conversationId },
      { senderId: options.conversationId, receiverId: options.userId },
    ],
  };
}

async function broadcastConversationEvent(options: {
  workspaceId: string;
  userId: string;
  conversationType: 'direct' | 'group';
  conversationId: string;
  message: WSMessage;
}) {
  const roomName = buildRoomName({
    workspaceId: options.workspaceId,
    type: options.conversationType,
    conversationId: options.conversationId,
    userId: options.userId,
  });

  await broadcastToRoom({
    roomName,
    message: options.message,
  });
}

async function applyMessageReadReceipts(options: {
  prisma: Awaited<ReturnType<typeof getPrismaClientFromContext>>;
  workspaceId: string;
  userId: string;
  conversationType: 'direct' | 'group';
  conversationId: string;
  messages: Array<{
    id: string;
    senderId: string;
    readBy: string[] | string;
  }>;
}) {
  const updates = options.messages
    .filter((message) => message.senderId !== options.userId)
    .map((message) => {
      const nextReadBy = appendReadByUser(message.readBy, options.userId);
      return {
        id: message.id,
        changed: nextReadBy.length !== parseReadBy(message.readBy).length,
        nextReadBy,
      };
    })
    .filter((message) => message.changed);

  if (updates.length === 0) {
    return [];
  }

  await options.prisma.$transaction(
    updates.map((message) =>
      options.prisma.message.update({
        where: { id: message.id },
        data: {
          readBy: JSON.stringify(message.nextReadBy),
        },
      })
    )
  );

  await broadcastConversationEvent({
    workspaceId: options.workspaceId,
    userId: options.userId,
    conversationType: options.conversationType,
    conversationId: options.conversationId,
    message: {
      type: 'message_read',
      payload: {
        conversationType: options.conversationType,
        conversationId: options.conversationId,
        userId: options.userId,
        messageIds: updates.map((message) => message.id),
      },
      timestamp: Date.now(),
    },
  });

  return updates.map((message) => message.id);
}

// Send message
export async function POST(request: NextRequest) {
  try {
    const prisma = await getPrismaClientFromContext();
    const env = getCloudflareEnv();
    const payload = await authenticateNextRequest(request, 'client', prisma);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const {
      workspaceId,
      content,
      receiverId,
      groupId,
      type = 'text',
      fileUrl,
    } = (await request.json()) as {
      workspaceId?: string;
      content?: string;
      receiverId?: string;
      groupId?: string;
      type?: string;
      fileUrl?: string;
    };
    const normalizedType =
      typeof type === 'string' && ALLOWED_MESSAGE_TYPES.has(type) ? type : null;
    const normalizedContent = normalizeTextInput(content, {
      multiline: true,
      maxLength: MAX_MESSAGE_LENGTH,
    });

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    if (!normalizedType) {
      return NextResponse.json(
        { success: false, error: 'Invalid message type' },
        { status: 400 }
      );
    }

    if (!normalizedContent && !fileUrl) {
      return NextResponse.json(
        { success: false, error: 'Message content is required' },
        { status: 400 }
      );
    }

    if (normalizedType !== 'text' && !fileUrl) {
      return NextResponse.json(
        { success: false, error: 'Attachment URL is required for this message type' },
        { status: 400 }
      );
    }

    const rateLimitResponse = await enforceRateLimit({
      prisma,
      request,
      scope: 'message_send',
      limit: 40,
      windowMs: 60 * 1000,
      identifierParts: [payload.userId, workspaceId],
      errorMessage: 'You are sending messages too quickly. Please slow down.',
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const hasReceiver = Boolean(receiverId);
    const hasGroup = Boolean(groupId);
    const conversationId = hasGroup ? groupId : receiverId;
    if (hasReceiver === hasGroup) {
      return NextResponse.json(
        { success: false, error: 'Either receiverId or groupId is required' },
        { status: 400 }
      );
    }

    // Verify membership
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: payload.userId,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Not a member of this workspace' },
        { status: 403 }
      );
    }

    let recipientUserIds: string[] = [];
    let groupName: string | undefined;

    if (hasGroup) {
      const group = await prisma.group.findFirst({
        where: {
          id: groupId,
          workspaceId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!group) {
        return NextResponse.json(
          { success: false, error: 'Group not found' },
          { status: 404 }
        );
      }

      groupName = group.name;

      const groupMembers = await prisma.groupMember.findMany({
        where: {
          groupId,
        },
        select: {
          userId: true,
        },
      });

      if (!groupMembers.some((member) => member.userId === payload.userId)) {
        return NextResponse.json(
          { success: false, error: 'Not a member of this group' },
          { status: 403 }
        );
      }

      recipientUserIds = groupMembers
        .map((member) => member.userId)
        .filter((userId) => userId !== payload.userId);
    }

    if (hasReceiver) {
      if (receiverId === payload.userId) {
        return NextResponse.json(
          { success: false, error: 'Cannot send a message to yourself' },
          { status: 400 }
        );
      }

      const receiverMembership = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId: receiverId,
        },
      });

      if (!receiverMembership) {
        return NextResponse.json(
          { success: false, error: 'Recipient not in workspace' },
          { status: 404 }
        );
      }

      const friendship = await prisma.friendship.findFirst({
        where: {
          workspaceId,
          status: 'accepted',
          OR: [
            { senderId: payload.userId, receiverId },
            { senderId: receiverId, receiverId: payload.userId },
          ],
        },
      });

      if (!friendship) {
        return NextResponse.json(
          { success: false, error: 'You are not friends with this user' },
          { status: 403 }
        );
      }

      recipientUserIds = receiverId ? [receiverId] : [];
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        workspaceId,
        senderId: payload.userId,
        receiverId,
        groupId,
        content: normalizedContent,
        type: normalizedType,
        fileUrl,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    const { sender, ...rest } = message;
    const messagePayload = {
      ...rest,
      senderName: sender?.username,
      senderAvatar: sender?.avatar,
    };

    const roomName = buildRoomName({
      workspaceId,
      type: hasGroup ? 'group' : 'direct',
      conversationId: conversationId!,
      userId: payload.userId,
    });

    const wsMessage: WSMessage = {
      type: 'new_message',
      payload: messagePayload,
      timestamp: Date.now(),
    };

    await syncConversationStatesForMessage(prisma, {
      workspaceId,
      messageId: message.id,
      messageCreatedAt: message.createdAt,
      senderId: payload.userId,
      receiverId,
      groupId,
      recipientUserIds,
    });

    void broadcastToRoom({ roomName, message: wsMessage }).catch((error) => {
      console.error('Broadcast message error:', error);
    });
    // Send push notifications to offline recipients
    void (async () => {
      try {
        if (recipientUserIds.length === 0) return;

        // Get device tokens for recipients
        const deviceTokens = await prisma.deviceToken.findMany({
          where: {
            userId: { in: recipientUserIds },
            isActive: true,
          },
          select: { token: true, userId: true },
        });

        if (deviceTokens.length === 0) return;

        // Create notification payload
        const notificationPayload = createMessageNotificationPayload(
          sender?.username || 'Unknown',
          normalizedContent || (normalizedType === 'image' ? 'Sent an image' : 'Sent a file'),
          workspaceId,
          hasGroup ? 'group' : 'direct',
          conversationId!,
          groupName
        );

        const fcmEnv = {
          FCM_PROJECT_ID: env?.FCM_PROJECT_ID || process.env.FCM_PROJECT_ID,
          FCM_SERVER_KEY: env?.FCM_SERVER_KEY || process.env.FCM_SERVER_KEY,
        };

        // Send push notifications
        const tokens = deviceTokens.map(dt => dt.token);
        await sendPushNotificationToMany(tokens, notificationPayload, fcmEnv);

        // Create notification records
        const notificationRecords = recipientUserIds.map(userId => ({
          userId,
          workspaceId,
          type: NotificationType.MESSAGE,
          title: notificationPayload.title,
          body: notificationPayload.body,
          data: JSON.stringify(notificationPayload.data),
        }));

        await prisma.notification.createMany({
          data: notificationRecords,
        });
      } catch (pushError) {
        console.error('Push notification error:', pushError);
      }
    })();

    return NextResponse.json({
      success: true,
      data: messagePayload,
    });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

// Get messages
export async function GET(request: NextRequest) {
  try {
    const prisma = await getPrismaClientFromContext();
    const payload = await authenticateNextRequest(request, 'client');
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const receiverId = searchParams.get('receiverId');
    const groupId = searchParams.get('groupId');
    const after = searchParams.get('after');
    const markRead = searchParams.get('markRead') === 'true';
    const limit = clampNumber(
      parseInt(searchParams.get('limit') || '50', 10),
      1,
      MAX_MESSAGE_FETCH_LIMIT
    );
    const afterDate = after ? new Date(after) : null;

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    const hasReceiver = Boolean(receiverId);
    const hasGroup = Boolean(groupId);
    if (hasReceiver === hasGroup) {
      return NextResponse.json(
        { success: false, error: 'Either receiverId or groupId is required' },
        { status: 400 }
      );
    }

    if (after && (!afterDate || Number.isNaN(afterDate.getTime()))) {
      return NextResponse.json(
        { success: false, error: 'Invalid after cursor' },
        { status: 400 }
      );
    }

    // Verify membership
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: payload.userId,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Not a member of this workspace' },
        { status: 403 }
      );
    }

    // Build query
    const where: Prisma.MessageWhereInput = { workspaceId };
    if (afterDate) {
      where.createdAt = { gt: afterDate };
    }

    if (groupId) {
      const groupMember = await prisma.groupMember.findFirst({
        where: {
          groupId,
          userId: payload.userId,
        },
      });

      if (!groupMember) {
        return NextResponse.json(
          { success: false, error: 'Not a member of this group' },
          { status: 403 }
        );
      }

      where.groupId = groupId;
    } else if (receiverId) {
      const friendship = await prisma.friendship.findFirst({
        where: {
          workspaceId,
          status: 'accepted',
          OR: [
            { senderId: payload.userId, receiverId },
            { senderId: receiverId, receiverId: payload.userId },
          ],
        },
      });

      if (!friendship) {
        return NextResponse.json(
          { success: false, error: 'You are not friends with this user' },
          { status: 403 }
        );
      }

      where.OR = [
        { senderId: payload.userId, receiverId },
        { senderId: receiverId, receiverId: payload.userId },
      ];
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: afterDate ? 'asc' : 'desc' },
      take: limit,
    });
    let responseMessages: Array<
      (typeof messages)[number] | ((typeof messages)[number] & { readBy: string[] })
    > = messages;

    if (markRead) {
      const updatedMessageIds = await applyMessageReadReceipts({
        prisma,
        workspaceId,
        userId: payload.userId,
        conversationType: groupId ? 'group' : 'direct',
        conversationId: groupId || receiverId!,
        messages,
      });

      if (updatedMessageIds.length > 0) {
        const updatedMessageIdSet = new Set(updatedMessageIds);
        responseMessages = messages.map((message) =>
          updatedMessageIdSet.has(message.id)
            ? {
                ...message,
                readBy: appendReadByUser(message.readBy, payload.userId),
              }
            : message
        ) as typeof responseMessages;
      }

      await markConversationAsRead(prisma, {
        workspaceId,
        userId: payload.userId,
        conversationType: groupId ? 'group' : 'direct',
        conversationId: groupId || receiverId!,
      });

      await markConversationNotificationsAsRead({
        prisma,
        userId: payload.userId,
        workspaceId,
        conversationType: groupId ? 'group' : 'direct',
        conversationId: groupId || receiverId!,
      });
    }

    return NextResponse.json({
      success: true,
      data: (afterDate ? responseMessages : responseMessages.reverse()).map(({ sender, ...rest }) => ({
        ...rest,
        senderName: sender?.username,
        senderAvatar: sender?.avatar,
      })),
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// Mark a conversation as read for realtime receipts
export async function PUT(request: NextRequest) {
  try {
    const prisma = await getPrismaClientFromContext();
    const payload = await authenticateNextRequest(request, 'client');
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { workspaceId, receiverId, groupId } = (await request.json()) as {
      workspaceId?: string;
      receiverId?: string;
      groupId?: string;
    };

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    const hasReceiver = Boolean(receiverId);
    const hasGroup = Boolean(groupId);
    if (hasReceiver === hasGroup) {
      return NextResponse.json(
        { success: false, error: 'Either receiverId or groupId is required' },
        { status: 400 }
      );
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: payload.userId,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Not a member of this workspace' },
        { status: 403 }
      );
    }

    const conversationType = groupId ? 'group' : 'direct';
    const conversationId = groupId || receiverId!;

    if (groupId) {
      const groupMember = await prisma.groupMember.findFirst({
        where: {
          groupId,
          userId: payload.userId,
        },
      });

      if (!groupMember) {
        return NextResponse.json(
          { success: false, error: 'Not a member of this group' },
          { status: 403 }
        );
      }
    } else if (receiverId) {
      const friendship = await prisma.friendship.findFirst({
        where: {
          workspaceId,
          status: 'accepted',
          OR: [
            { senderId: payload.userId, receiverId },
            { senderId: receiverId, receiverId: payload.userId },
          ],
        },
      });

      if (!friendship) {
        return NextResponse.json(
          { success: false, error: 'You are not friends with this user' },
          { status: 403 }
        );
      }
    }

    const conversationState = await prisma.conversationState.findUnique({
      where: {
        conversation_lookup: {
          workspaceId,
          userId: payload.userId,
          conversationType,
          conversationId,
        },
      },
      select: {
        lastReadAt: true,
      },
    });

    const unreadWhere: Record<string, unknown> = {
      ...buildConversationWhere({
        workspaceId,
        userId: payload.userId,
        conversationType,
        conversationId,
      }),
      senderId: { not: payload.userId },
    };

    if (conversationState?.lastReadAt) {
      unreadWhere.createdAt = { gt: conversationState.lastReadAt };
    }

    const unreadMessages = await prisma.message.findMany({
      where: unreadWhere as never,
      select: {
        id: true,
        senderId: true,
        readBy: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
      ...(conversationState?.lastReadAt ? {} : { take: MAX_MESSAGE_FETCH_LIMIT }),
    });

    const updatedMessageIds = await applyMessageReadReceipts({
      prisma,
      workspaceId,
      userId: payload.userId,
      conversationType,
      conversationId,
      messages: unreadMessages,
    });

    await markConversationAsRead(prisma, {
      workspaceId,
      userId: payload.userId,
      conversationType,
      conversationId,
    });

    await markConversationNotificationsAsRead({
      prisma,
      userId: payload.userId,
      workspaceId,
      conversationType,
      conversationId,
    });

    return NextResponse.json({
      success: true,
      data: {
        messageIds: updatedMessageIds,
      },
    });
  } catch (error) {
    console.error('Mark messages read error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark messages as read' },
      { status: 500 }
    );
  }
}
