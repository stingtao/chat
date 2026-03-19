import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { applyConversationStateMutations } from '@/lib/conversations';
import { broadcastToRoom, buildWorkspaceRoomName } from '@/lib/realtime';
import type { WSMessage } from '@/lib/types';
import { parseConversationNotificationData } from '@/lib/utils';
import { NotificationType } from '@/lib/notifications';
import { authenticateNextRequest } from '@/lib/session';

export const runtime = 'edge';

const FRIEND_USER_SELECT = {
  id: true,
  username: true,
  avatar: true,
  email: true,
} as const;

async function broadcastWorkspaceEvent(workspaceId: string, message: WSMessage) {
  await broadcastToRoom({
    roomName: buildWorkspaceRoomName(workspaceId),
    message,
  });
}

// Send friend request
export async function POST(request: NextRequest) {
  try {
    const prisma = await getPrismaClientFromContext();
    const payload = await authenticateNextRequest(request, 'client');
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { workspaceId, receiverId } = (await request.json()) as {
      workspaceId?: string;
      receiverId?: string;
    };

    if (!workspaceId || !receiverId) {
      return NextResponse.json(
        { success: false, error: 'Workspace ID and receiver ID are required' },
        { status: 400 }
      );
    }

    const senderMembership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: payload.userId,
      },
    });

    if (!senderMembership) {
      return NextResponse.json(
        { success: false, error: 'Not a member of this workspace' },
        { status: 403 }
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
        { success: false, error: 'Receiver not in workspace' },
        { status: 404 }
      );
    }

    // Check if trying to add yourself as friend
    if (receiverId === payload.userId) {
      return NextResponse.json(
        { success: false, error: 'You cannot add yourself as a friend' },
        { status: 400 }
      );
    }

    // Check if already friends or request exists
    const existing = await prisma.friendship.findFirst({
      where: {
        workspaceId,
        OR: [
          { senderId: payload.userId, receiverId },
          { senderId: receiverId, receiverId: payload.userId },
        ],
      },
    });

    if (existing) {
      // Provide more specific error message based on status
      if (existing.status === 'accepted') {
        return NextResponse.json(
          { success: false, error: 'You are already friends with this user' },
          { status: 409 }
        );
      } else if (existing.status === 'pending') {
        // Check if current user is the sender or receiver
        if (existing.senderId === payload.userId) {
          return NextResponse.json(
            { success: false, error: 'Friend request already sent. Waiting for approval.' },
            { status: 409 }
          );
        } else {
          return NextResponse.json(
            { success: false, error: 'This user has already sent you a friend request. Please check your requests.' },
            { status: 409 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Friend request already exists' },
          { status: 409 }
        );
      }
    }

    // Create friend request
    const friendship = await prisma.friendship.create({
      data: {
        workspaceId,
        senderId: payload.userId,
        receiverId,
        status: 'pending',
      },
      include: {
        sender: {
          select: FRIEND_USER_SELECT,
        },
        receiver: {
          select: FRIEND_USER_SELECT,
        },
      },
    });

    void broadcastWorkspaceEvent(workspaceId, {
      type: 'friend_request',
      payload: {
        action: 'created',
        workspaceId,
        friendship,
      },
      timestamp: Date.now(),
    }).catch((error) => {
      console.error('Broadcast friend request error:', error);
    });

    return NextResponse.json({
      success: true,
      data: friendship,
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send friend request' },
      { status: 500 }
    );
  }
}

// Get friends
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

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'Workspace ID is required' },
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

    const friendships = await prisma.friendship.findMany({
      where: {
        workspaceId,
        OR: [
          { senderId: payload.userId },
          { receiverId: payload.userId },
        ],
        status: 'accepted',
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // Get lastSeenAt for all friends
    const friendIds = friendships.map(f =>
      f.senderId === payload.userId ? f.receiverId : f.senderId
    );

    const [workspaceMembers, conversationStates] = await Promise.all([
      prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          userId: { in: friendIds },
        },
        select: {
          userId: true,
          lastSeenAt: true,
        },
      }),
      friendIds.length > 0
        ? prisma.conversationState.findMany({
            where: {
              workspaceId,
              userId: payload.userId,
              conversationType: 'direct',
              conversationId: { in: friendIds },
            },
            select: {
              conversationId: true,
              unreadCount: true,
              lastMessageId: true,
              lastMessageAt: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const stateByFriendId = new Map(
      conversationStates.map((state) => [state.conversationId, state])
    );
    const lastMessageIds = Array.from(
      new Set(
        conversationStates
          .map((state) => state.lastMessageId)
          .filter((lastMessageId): lastMessageId is string => Boolean(lastMessageId))
      )
    );

    const lastMessages = lastMessageIds.length > 0
      ? await prisma.message.findMany({
        select: {
          id: true,
          workspaceId: true,
          senderId: true,
          groupId: true,
          receiverId: true,
          content: true,
          type: true,
          fileUrl: true,
          readBy: true,
          createdAt: true,
          updatedAt: true,
          sender: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
        where: {
          id: { in: lastMessageIds },
        },
      })
      : [];

    const lastSeenMap = new Map(
      workspaceMembers.map(m => [m.userId, m.lastSeenAt])
    );

    const lastMessageById = new Map(
      lastMessages.map((message) => [
        message.id,
        {
          ...message,
          senderName: message.sender?.username,
          senderAvatar: message.sender?.avatar,
        },
      ])
    );
    const lastMessageByFriendId = new Map<string, Record<string, unknown>>();

    for (const state of conversationStates) {
      if (!state.lastMessageId) {
        continue;
      }

      const lastMessage = lastMessageById.get(state.lastMessageId);
      if (lastMessage) {
        lastMessageByFriendId.set(state.conversationId, lastMessage);
      }
    }

    const missingStateFriendIds = friendIds.filter((friendId) => {
      const state = stateByFriendId.get(friendId);
      if (!state) {
        return true;
      }

      if (!state.lastMessageId) {
        return false;
      }

      return !lastMessageById.has(state.lastMessageId);
    });

    if (missingStateFriendIds.length > 0) {
      const missingStateFriendIdSet = new Set(missingStateFriendIds);
      const [legacyUnreadNotifications, fallbackLastMessages] = await Promise.all([
        prisma.notification.findMany({
          where: {
            userId: payload.userId,
            workspaceId,
            type: NotificationType.MESSAGE,
            isRead: false,
          },
          select: {
            data: true,
          },
        }),
        Promise.all(
          missingStateFriendIds.map((friendId) =>
            prisma.message.findFirst({
              where: {
                workspaceId,
                OR: [
                  { senderId: payload.userId, receiverId: friendId },
                  { senderId: friendId, receiverId: payload.userId },
                ],
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
              orderBy: {
                createdAt: 'desc',
              },
            })
          )
        ),
      ]);

      const legacyUnreadCountByFriendId = new Map<string, number>();
      for (const notification of legacyUnreadNotifications) {
        const data = parseConversationNotificationData(notification.data);
        if (
          !data?.conversationId ||
          data.conversationType !== 'direct' ||
          !missingStateFriendIdSet.has(data.conversationId)
        ) {
          continue;
        }

        legacyUnreadCountByFriendId.set(
          data.conversationId,
          (legacyUnreadCountByFriendId.get(data.conversationId) || 0) + 1
        );
      }

      const seedMutations = missingStateFriendIds.flatMap((friendId, index) => {
        const existingState = stateByFriendId.get(friendId);
        const fallbackMessage = fallbackLastMessages[index];

        if (fallbackMessage) {
          lastMessageByFriendId.set(friendId, {
            ...fallbackMessage,
            senderName: fallbackMessage.sender?.username,
            senderAvatar: fallbackMessage.sender?.avatar,
          });
        }

        const unreadCount = existingState
          ? existingState.unreadCount
          : legacyUnreadCountByFriendId.get(friendId) || 0;

        if (!existingState && !fallbackMessage && unreadCount === 0) {
          return [];
        }

        stateByFriendId.set(friendId, {
          conversationId: friendId,
          unreadCount,
          lastMessageId: fallbackMessage?.id || existingState?.lastMessageId || null,
          lastMessageAt: fallbackMessage?.createdAt || existingState?.lastMessageAt || null,
        });

        return [
          {
            workspaceId,
            userId: payload.userId,
            conversationType: 'direct' as const,
            conversationId: friendId,
            lastMessageId: fallbackMessage?.id || existingState?.lastMessageId,
            lastMessageAt: fallbackMessage?.createdAt || existingState?.lastMessageAt,
            incrementUnreadBy: existingState ? 0 : unreadCount,
          },
        ];
      });

      await applyConversationStateMutations(prisma, seedMutations);
    }

    const friends = friendships.map(f => {
      const friend = f.senderId === payload.userId ? f.receiver : f.sender;
      const conversationState = stateByFriendId.get(friend.id);
      return {
        ...f,
        friend: {
          ...friend,
          lastSeenAt: lastSeenMap.get(friend.id),
        },
        lastMessage: lastMessageByFriendId.get(friend.id),
        unreadCount: conversationState?.unreadCount || 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: friends,
    });
  } catch (error) {
    console.error('Get friends error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch friends' },
      { status: 500 }
    );
  }
}

// Accept/reject friend request
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

    const { friendshipId, status } = (await request.json()) as {
      friendshipId?: string;
      status?: 'accepted' | 'rejected';
    };

    if (!friendshipId || !status) {
      return NextResponse.json(
        { success: false, error: 'Friendship ID and status are required' },
        { status: 400 }
      );
    }

    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        id: friendshipId,
        receiverId: payload.userId,
      },
      include: {
        sender: {
          select: FRIEND_USER_SELECT,
        },
        receiver: {
          select: FRIEND_USER_SELECT,
        },
      },
    });

    if (!existingFriendship) {
      return NextResponse.json(
        { success: false, error: 'Friend request not found' },
        { status: 404 }
      );
    }

    if (existingFriendship.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Friend request has already been handled' },
        { status: 409 }
      );
    }

    const friendship = await prisma.friendship.update({
      where: {
        id: friendshipId,
      },
      data: { status },
      include: {
        sender: {
          select: FRIEND_USER_SELECT,
        },
        receiver: {
          select: FRIEND_USER_SELECT,
        },
      },
    });

    void broadcastWorkspaceEvent(friendship.workspaceId, {
      type: status === 'accepted' ? 'friend_accepted' : 'friend_request',
      payload:
        status === 'accepted'
          ? {
              workspaceId: friendship.workspaceId,
              friendship,
            }
          : {
              action: 'rejected',
              workspaceId: friendship.workspaceId,
              friendship,
            },
      timestamp: Date.now(),
    }).catch((error) => {
      console.error('Broadcast friend request update error:', error);
    });

    return NextResponse.json({
      success: true,
      data: friendship,
    });
  } catch (error) {
    console.error('Update friend request error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update friend request' },
      { status: 500 }
    );
  }
}
