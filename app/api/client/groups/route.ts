import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { applyConversationStateMutations } from '@/lib/conversations';
import { broadcastToRoom, buildWorkspaceRoomName } from '@/lib/realtime';
import type { GroupRealtimeEventPayload, WSMessage } from '@/lib/types';
import {
  normalizeTextInput,
  parseConversationNotificationData,
} from '@/lib/utils';
import { NotificationType } from '@/lib/notifications';
import { authenticateNextRequest } from '@/lib/session';

export const runtime = 'edge';

const MAX_GROUP_NAME_LENGTH = 80;

async function broadcastWorkspaceEvent(workspaceId: string, message: WSMessage) {
  await broadcastToRoom({
    roomName: buildWorkspaceRoomName(workspaceId),
    message,
  });
}

async function loadGroupRealtimeSnapshot(
  prisma: Awaited<ReturnType<typeof getPrismaClientFromContext>>,
  groupId: string
) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      _count: {
        select: { members: true },
      },
      members: {
        select: { userId: true },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });

  if (!group) {
    return null;
  }

  const { _count, members, ...groupData } = group;
  return {
    group: {
      ...groupData,
      memberCount: _count.members,
    },
    memberIds: members.map((member) => member.userId),
  };
}

async function broadcastGroupRealtimeEvent(options: {
  prisma: Awaited<ReturnType<typeof getPrismaClientFromContext>>;
  workspaceId: string;
  groupId: string;
  type: 'group_created' | 'group_updated';
  action: GroupRealtimeEventPayload['action'];
}) {
  const snapshot = await loadGroupRealtimeSnapshot(options.prisma, options.groupId);
  if (!snapshot) {
    return null;
  }

  await broadcastWorkspaceEvent(options.workspaceId, {
    type: options.type,
    payload: {
      action: options.action,
      workspaceId: options.workspaceId,
      group: snapshot.group,
      memberIds: snapshot.memberIds,
    },
    timestamp: Date.now(),
  });

  return snapshot;
}

// Get user's groups in a workspace
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

    // Get groups user is a member of
    const groupMemberships = await prisma.groupMember.findMany({
      where: {
        userId: payload.userId,
        group: {
          workspaceId,
        },
      },
      include: {
        group: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
    });

    const groupIds = groupMemberships.map((membership) => membership.group.id);
    const conversationStates = groupIds.length > 0
      ? await prisma.conversationState.findMany({
          where: {
            workspaceId,
            userId: payload.userId,
            conversationType: 'group',
            conversationId: { in: groupIds },
          },
          select: {
            conversationId: true,
            unreadCount: true,
            lastMessageId: true,
            lastMessageAt: true,
          },
        })
      : [];

    const stateByGroupId = new Map(
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
    const lastMessageByGroupId = new Map<string, Record<string, unknown>>();
    for (const state of conversationStates) {
      if (!state.lastMessageId) {
        continue;
      }

      const lastMessage = lastMessageById.get(state.lastMessageId);
      if (lastMessage) {
        lastMessageByGroupId.set(state.conversationId, lastMessage);
      }
    }

    const missingStateGroupIds = groupIds.filter((groupId) => {
      const state = stateByGroupId.get(groupId);
      if (!state) {
        return true;
      }

      if (!state.lastMessageId) {
        return false;
      }

      return !lastMessageById.has(state.lastMessageId);
    });

    if (missingStateGroupIds.length > 0) {
      const missingStateGroupIdSet = new Set(missingStateGroupIds);
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
          missingStateGroupIds.map((conversationId) =>
            prisma.message.findFirst({
              where: {
                workspaceId,
                groupId: conversationId,
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

      const legacyUnreadCountByGroupId = new Map<string, number>();
      for (const notification of legacyUnreadNotifications) {
        const data = parseConversationNotificationData(notification.data);
        if (
          !data?.conversationId ||
          data.conversationType !== 'group' ||
          !missingStateGroupIdSet.has(data.conversationId)
        ) {
          continue;
        }

        legacyUnreadCountByGroupId.set(
          data.conversationId,
          (legacyUnreadCountByGroupId.get(data.conversationId) || 0) + 1
        );
      }

      const seedMutations = missingStateGroupIds.flatMap((groupId, index) => {
        const existingState = stateByGroupId.get(groupId);
        const fallbackMessage = fallbackLastMessages[index];

        if (fallbackMessage) {
          lastMessageByGroupId.set(groupId, {
            ...fallbackMessage,
            senderName: fallbackMessage.sender?.username,
            senderAvatar: fallbackMessage.sender?.avatar,
          });
        }

        const unreadCount = existingState
          ? existingState.unreadCount
          : legacyUnreadCountByGroupId.get(groupId) || 0;

        if (!existingState && !fallbackMessage && unreadCount === 0) {
          return [];
        }

        stateByGroupId.set(groupId, {
          conversationId: groupId,
          unreadCount,
          lastMessageId: fallbackMessage?.id || existingState?.lastMessageId || null,
          lastMessageAt: fallbackMessage?.createdAt || existingState?.lastMessageAt || null,
        });

        return [
          {
            workspaceId,
            userId: payload.userId,
            conversationType: 'group' as const,
            conversationId: groupId,
            lastMessageId: fallbackMessage?.id || existingState?.lastMessageId,
            lastMessageAt: fallbackMessage?.createdAt || existingState?.lastMessageAt,
            incrementUnreadBy: existingState ? 0 : unreadCount,
          },
        ];
      });

      await applyConversationStateMutations(prisma, seedMutations);
    }

    const groups = groupMemberships.map((gm) => {
      const conversationState = stateByGroupId.get(gm.group.id);
      return {
        ...gm.group,
        memberCount: gm.group._count.members,
        lastMessage: lastMessageByGroupId.get(gm.group.id),
        unreadCount: conversationState?.unreadCount || 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: groups,
    });
  } catch (error) {
    console.error('Get groups error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}

// Create a new group
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

    const { workspaceId, name, memberIds } = (await request.json()) as {
      workspaceId?: string;
      name?: string;
      memberIds?: string[];
    };
    const trimmedName = normalizeTextInput(name, { maxLength: MAX_GROUP_NAME_LENGTH });
    if (!workspaceId || !trimmedName) {
      return NextResponse.json(
        { success: false, error: 'Workspace ID and name are required' },
        { status: 400 }
      );
    }

    if (typeof name === 'string' && name.trim().length > MAX_GROUP_NAME_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Group name must be ${MAX_GROUP_NAME_LENGTH} characters or fewer` },
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

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { settings: true },
    });

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: 'Workspace not found' },
        { status: 404 }
      );
    }

    if (workspace.settings?.allowGroupChat === false) {
      return NextResponse.json(
        { success: false, error: 'Group chat is disabled for this workspace' },
        { status: 403 }
      );
    }

    const uniqueMemberIds = Array.from(
      new Set((memberIds || []).filter((id: string) => id && id !== payload.userId))
    );
    if (uniqueMemberIds.length > 0) {
      const members = await prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          userId: { in: uniqueMemberIds },
        },
        select: { userId: true },
      });

      if (members.length !== uniqueMemberIds.length) {
        return NextResponse.json(
          { success: false, error: 'Some members are not in this workspace' },
          { status: 400 }
        );
      }
    }

    const maxGroupSize = workspace.settings?.maxGroupSize ?? 100;
    if (uniqueMemberIds.length + 1 > maxGroupSize) {
      return NextResponse.json(
        { success: false, error: `Group size exceeds limit (${maxGroupSize})` },
        { status: 400 }
      );
    }

    // Create group
    const createdGroup = await prisma.group.create({
      data: {
        workspaceId,
        name: trimmedName,
        createdById: payload.userId,
        members: {
          create: [
            // Add creator as admin
            {
              userId: payload.userId,
              role: 'admin',
            },
            // Add other members
            ...uniqueMemberIds.map((userId: string) => ({
              userId,
              role: 'member',
            })),
          ],
        },
      },
    });

    const groupSnapshot = await loadGroupRealtimeSnapshot(prisma, createdGroup.id);
    if (!groupSnapshot) {
      return NextResponse.json(
        { success: false, error: 'Failed to load group summary' },
        { status: 500 }
      );
    }

    void broadcastWorkspaceEvent(workspaceId, {
      type: 'group_created',
      payload: {
        action: 'created',
        workspaceId,
        group: groupSnapshot.group,
        memberIds: groupSnapshot.memberIds,
      },
      timestamp: Date.now(),
    }).catch((error) => {
      console.error('Broadcast group create error:', error);
    });

    return NextResponse.json({
      success: true,
      data: groupSnapshot.group,
    });
  } catch (error) {
    console.error('Create group error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create group' },
      { status: 500 }
    );
  }
}

// Rename a group
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

    const { workspaceId, groupId, name } = (await request.json()) as {
      workspaceId?: string;
      groupId?: string;
      name?: string;
    };
    const trimmedName = normalizeTextInput(name, { maxLength: MAX_GROUP_NAME_LENGTH });

    if (!workspaceId || !groupId || !trimmedName) {
      return NextResponse.json(
        { success: false, error: 'Workspace ID, group ID, and name are required' },
        { status: 400 }
      );
    }

    if (typeof name === 'string' && name.trim().length > MAX_GROUP_NAME_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Group name must be ${MAX_GROUP_NAME_LENGTH} characters or fewer` },
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

    if (!groupMember || groupMember.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only group admins can rename this group' },
        { status: 403 }
      );
    }

    await prisma.group.update({
      where: { id: groupId },
      data: { name: trimmedName },
    });

    const groupSnapshot = await loadGroupRealtimeSnapshot(prisma, groupId);
    if (!groupSnapshot) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    void broadcastWorkspaceEvent(workspaceId, {
      type: 'group_updated',
      payload: {
        action: 'renamed',
        workspaceId,
        group: groupSnapshot.group,
        memberIds: groupSnapshot.memberIds,
      },
      timestamp: Date.now(),
    }).catch((error) => {
      console.error('Broadcast group rename error:', error);
    });

    return NextResponse.json({
      success: true,
      data: groupSnapshot.group,
    });
  } catch (error) {
    console.error('Rename group error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to rename group' },
      { status: 500 }
    );
  }
}

// Leave a group
export async function DELETE(request: NextRequest) {
  try {
    const prisma = await getPrismaClientFromContext();
    const payload = await authenticateNextRequest(request, 'client');
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { workspaceId, groupId } = (await request.json()) as {
      workspaceId?: string;
      groupId?: string;
    };

    if (!workspaceId || !groupId) {
      return NextResponse.json(
        { success: false, error: 'Workspace ID and group ID are required' },
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
        { status: 404 }
      );
    }

    await prisma.groupMember.delete({
      where: { id: groupMember.id },
    });
    await prisma.conversationState.deleteMany({
      where: {
        workspaceId,
        userId: payload.userId,
        conversationType: 'group',
        conversationId: groupId,
      },
    });

    const remainingMembers = await prisma.groupMember.findMany({
      where: { groupId },
      orderBy: { joinedAt: 'asc' },
    });

    if (remainingMembers.length === 0) {
      await prisma.conversationState.deleteMany({
        where: {
          workspaceId,
          conversationType: 'group',
          conversationId: groupId,
        },
      });
      await prisma.group.delete({ where: { id: groupId } });

      void broadcastWorkspaceEvent(workspaceId, {
        type: 'group_deleted',
        payload: {
          workspaceId,
          groupId,
        },
        timestamp: Date.now(),
      }).catch((error) => {
        console.error('Broadcast group delete error:', error);
      });

      return NextResponse.json({
        success: true,
        data: { groupId, deleted: true },
      });
    }

    const hasAdmin = remainingMembers.some((member) => member.role === 'admin');
    if (!hasAdmin) {
      const nextAdmin = remainingMembers[0];
      await prisma.groupMember.update({
        where: { id: nextAdmin.id },
        data: { role: 'admin' },
      });
    }

    void broadcastGroupRealtimeEvent({
      prisma,
      workspaceId,
      groupId,
      type: 'group_updated',
      action: 'membership_changed',
    }).catch((error) => {
      console.error('Broadcast group membership update error:', error);
    });

    return NextResponse.json({
      success: true,
      data: { groupId, left: true },
    });
  } catch (error) {
    console.error('Leave group error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to leave group' },
      { status: 500 }
    );
  }
}
