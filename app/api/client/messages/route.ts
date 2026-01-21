import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { broadcastToRoom, buildRoomName } from '@/lib/realtime';
import type { WSMessage } from '@/lib/types';
import {
  sendPushNotificationToMany,
  createMessageNotificationPayload,
  NotificationType,
} from '@/lib/notifications';

export const runtime = 'edge';

// Send message
export async function POST(request: NextRequest) {
  try {
    const prisma = await getPrismaClientFromContext();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload || payload.type !== 'client') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { workspaceId, content, receiverId, groupId, type = 'text', fileUrl } = await request.json();

    if (!workspaceId || !content) {
      return NextResponse.json(
        { success: false, error: 'Workspace ID and content are required' },
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

    if (hasGroup) {
      const group = await prisma.group.findFirst({
        where: {
          id: groupId,
          workspaceId,
        },
      });

      if (!group) {
        return NextResponse.json(
          { success: false, error: 'Group not found' },
          { status: 404 }
        );
      }

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
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        workspaceId,
        senderId: payload.userId,
        receiverId,
        groupId,
        content,
        type,
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
      conversationId: hasGroup ? groupId : receiverId,
      userId: payload.userId,
    });

    const wsMessage: WSMessage = {
      type: 'new_message',
      payload: messagePayload,
      timestamp: Date.now(),
    };

    void broadcastToRoom({ roomName, message: wsMessage }).catch((error) => {
      console.error('Broadcast message error:', error);
    });

    // Send push notifications to offline recipients
    void (async () => {
      try {
        let recipientUserIds: string[] = [];
        let groupName: string | undefined;

        if (hasGroup) {
          // Get all group members except sender
          const groupMembers = await prisma.groupMember.findMany({
            where: {
              groupId,
              userId: { not: payload.userId },
            },
            select: { userId: true },
          });
          recipientUserIds = groupMembers.map(m => m.userId);

          // Get group name
          const group = await prisma.group.findUnique({
            where: { id: groupId },
            select: { name: true },
          });
          groupName = group?.name;
        } else if (receiverId) {
          recipientUserIds = [receiverId];
        }

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
          content,
          workspaceId,
          hasGroup ? 'group' : 'direct',
          hasGroup ? groupId : receiverId!,
          groupName
        );

        // Get FCM config from environment (placeholder - need actual env access)
        const fcmEnv = {
          FCM_PROJECT_ID: process.env.FCM_PROJECT_ID,
          FCM_SERVER_KEY: process.env.FCM_SERVER_KEY,
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
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload || payload.type !== 'client') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const receiverId = searchParams.get('receiverId');
    const groupId = searchParams.get('groupId');
    const limit = parseInt(searchParams.get('limit') || '50');

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
    const where: any = { workspaceId };

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
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: messages.reverse().map(({ sender, ...rest }) => ({
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
