import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { broadcastToRoom, buildWorkspaceRoomName } from '@/lib/realtime';
import type { GroupRealtimeEventPayload, WSMessage } from '@/lib/types';
import { authenticateNextRequest } from '@/lib/session';

export const runtime = 'edge';

const BLOCKED_USER_PROFILE_SELECT = {
  id: true,
  email: true,
  username: true,
  avatar: true,
} as const;

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
  type: 'group_updated' | 'group_deleted';
  action?: GroupRealtimeEventPayload['action'];
}) {
  if (options.type === 'group_deleted') {
    await broadcastWorkspaceEvent(options.workspaceId, {
      type: 'group_deleted',
      payload: {
        workspaceId: options.workspaceId,
        groupId: options.groupId,
      },
      timestamp: Date.now(),
    });
    return;
  }

  const snapshot = await loadGroupRealtimeSnapshot(options.prisma, options.groupId);
  if (!snapshot || !options.action) {
    return;
  }

  await broadcastWorkspaceEvent(options.workspaceId, {
    type: 'group_updated',
    payload: {
      action: options.action,
      workspaceId: options.workspaceId,
      group: snapshot.group,
      memberIds: snapshot.memberIds,
    },
    timestamp: Date.now(),
  });
}

// Block a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = await getPrismaClientFromContext();
    const payload = await authenticateNextRequest(request, 'host');
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const { id } = await params;

    // Verify ownership
    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
        hostId: payload.userId,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: 'Workspace not found' },
        { status: 404 }
      );
    }

    const { userId, reason } = (await request.json()) as {
      userId?: string;
      reason?: string;
    };

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const existingBlock = await prisma.blockedUser.findFirst({
      where: {
        workspaceId: id,
        userId,
      },
    });

    if (existingBlock) {
      return NextResponse.json(
        { success: false, error: 'User is already blocked' },
        { status: 409 }
      );
    }

    const affectedGroupIds = Array.from(
      new Set(
        (
          await prisma.groupMember.findMany({
            where: {
              userId,
              group: {
                workspaceId: id,
              },
            },
            select: {
              groupId: true,
            },
          })
        ).map((membership) => membership.groupId)
      )
    );

    const [blocked] = await prisma.$transaction([
      prisma.blockedUser.create({
        data: {
          workspaceId: id,
          userId,
          reason,
        },
        include: {
          user: {
            select: BLOCKED_USER_PROFILE_SELECT,
          },
        },
      }),
      prisma.friendship.deleteMany({
        where: {
          workspaceId: id,
          OR: [
            { senderId: userId },
            { receiverId: userId },
          ],
        },
      }),
      prisma.workspaceMember.deleteMany({
        where: {
          workspaceId: id,
          userId,
        },
      }),
      prisma.groupMember.deleteMany({
        where: {
          userId,
          groupId: {
            in: affectedGroupIds,
          },
        },
      }),
      prisma.conversationState.deleteMany({
        where: {
          workspaceId: id,
          OR: [
            { userId },
            {
              conversationType: 'direct',
              conversationId: userId,
            },
          ],
        },
      }),
    ]);

    for (const groupId of affectedGroupIds) {
      const remainingMembers = await prisma.groupMember.findMany({
        where: { groupId },
        orderBy: { joinedAt: 'asc' },
      });

      if (remainingMembers.length === 0) {
        await prisma.conversationState.deleteMany({
          where: {
            workspaceId: id,
            conversationType: 'group',
            conversationId: groupId,
          },
        });
        await prisma.group.delete({
          where: { id: groupId },
        });
        void broadcastGroupRealtimeEvent({
          prisma,
          workspaceId: id,
          groupId,
          type: 'group_deleted',
        }).catch((error) => {
          console.error('Broadcast blocked group delete error:', error);
        });
        continue;
      }

      if (!remainingMembers.some((member) => member.role === 'admin')) {
        await prisma.groupMember.update({
          where: { id: remainingMembers[0].id },
          data: { role: 'admin' },
        });
      }

      void broadcastGroupRealtimeEvent({
        prisma,
        workspaceId: id,
        groupId,
        type: 'group_updated',
        action: 'membership_changed',
      }).catch((error) => {
        console.error('Broadcast blocked group membership update error:', error);
      });
    }

    void broadcastWorkspaceEvent(id, {
      type: 'workspace_member_removed',
      payload: {
        workspaceId: id,
        userId,
      },
      timestamp: Date.now(),
    }).catch((error) => {
      console.error('Broadcast workspace member removed error:', error);
    });

    void broadcastWorkspaceEvent(id, {
      type: 'workspace_member_blocked',
      payload: {
        workspaceId: id,
        blockedUser: blocked,
      },
      timestamp: Date.now(),
    }).catch((error) => {
      console.error('Broadcast workspace member blocked error:', error);
    });

    return NextResponse.json({
      success: true,
      data: blocked,
    });
  } catch (error) {
    console.error('Block user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to block user' },
      { status: 500 }
    );
  }
}

// Get blocked users
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = await getPrismaClientFromContext();
    const payload = await authenticateNextRequest(request, 'host');
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const { id } = await params;

    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
        hostId: payload.userId,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: 'Workspace not found' },
        { status: 404 }
      );
    }

    const blockedUsers = await prisma.blockedUser.findMany({
      where: { workspaceId: id },
      include: {
        user: {
          select: BLOCKED_USER_PROFILE_SELECT,
        },
      },
      orderBy: { blockedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: blockedUsers,
    });
  } catch (error) {
    console.error('Get blocked users error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blocked users' },
      { status: 500 }
    );
  }
}

// Unblock a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = await getPrismaClientFromContext();
    const payload = await authenticateNextRequest(request, 'host');
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const { id } = await params;

    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
        hostId: payload.userId,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: 'Workspace not found' },
        { status: 404 }
      );
    }

    const { userId } = (await request.json()) as { userId?: string };

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const unblocked = await prisma.blockedUser.deleteMany({
      where: {
        workspaceId: id,
        userId,
      },
    });

    if (unblocked.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Blocked user not found' },
        { status: 404 }
      );
    }

    void broadcastWorkspaceEvent(id, {
      type: 'workspace_member_unblocked',
      payload: {
        workspaceId: id,
        userId,
      },
      timestamp: Date.now(),
    }).catch((error) => {
      console.error('Broadcast workspace member unblocked error:', error);
    });

    return NextResponse.json({
      success: true,
      data: { userId },
    });
  } catch (error) {
    console.error('Unblock user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unblock user' },
      { status: 500 }
    );
  }
}
