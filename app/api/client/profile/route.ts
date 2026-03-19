import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { broadcastToRoom, buildWorkspaceRoomName } from '@/lib/realtime';
import type { WSMessage } from '@/lib/types';
import { normalizeTextInput } from '@/lib/utils';
import { authenticateNextRequest } from '@/lib/session';

export const runtime = 'edge';

const MAX_USERNAME_LENGTH = 30;

async function broadcastWorkspaceEvent(workspaceId: string, message: WSMessage) {
  await broadcastToRoom({
    roomName: buildWorkspaceRoomName(workspaceId),
    message,
  });
}

// Update client profile
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

    const { username, avatar } = (await request.json()) as {
      username?: string;
      avatar?: string | null;
    };
    const updates: { username?: string; avatar?: string | null } = {};

    if (typeof username === 'string') {
      const trimmed = normalizeTextInput(username, { maxLength: MAX_USERNAME_LENGTH });
      if (!trimmed) {
        return NextResponse.json(
          { success: false, error: 'Username is required' },
          { status: 400 }
        );
      }
      if (username.trim().length > MAX_USERNAME_LENGTH) {
        return NextResponse.json(
          { success: false, error: 'Username is too long' },
          { status: 400 }
        );
      }
      updates.username = trimmed;
    }

    if (typeof avatar === 'string') {
      updates.avatar = avatar || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No changes provided' },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: payload.userId },
      data: updates,
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
      },
    });

    const memberships = await prisma.workspaceMember.findMany({
      where: {
        userId: payload.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    memberships.forEach((member) => {
      void broadcastWorkspaceEvent(member.workspaceId, {
        type: 'workspace_member_updated',
        payload: {
          workspaceId: member.workspaceId,
          member,
        },
        timestamp: Date.now(),
      }).catch((error) => {
        console.error('Broadcast workspace member updated error:', error);
      });
    });

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
