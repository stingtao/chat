import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const runtime = 'edge';

// Get user's groups in a workspace
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
      where: { userId: payload.userId },
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

    const groups = groupMemberships
      .filter((gm) => gm.group.workspaceId === workspaceId)
      .map((gm) => ({
        ...gm.group,
        memberCount: gm.group._count.members,
      }));

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

    const { workspaceId, name, memberIds } = await request.json();

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!workspaceId || !trimmedName) {
      return NextResponse.json(
        { success: false, error: 'Workspace ID and name are required' },
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
    const group = await prisma.group.create({
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
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...group,
        memberCount: group._count.members,
      },
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

    const { workspaceId, groupId, name } = await request.json();
    const trimmedName = typeof name === 'string' ? name.trim() : '';

    if (!workspaceId || !groupId || !trimmedName) {
      return NextResponse.json(
        { success: false, error: 'Workspace ID, group ID, and name are required' },
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

    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: { name: trimmedName },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updatedGroup,
        memberCount: updatedGroup._count.members,
      },
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

    const { workspaceId, groupId } = await request.json();

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

    const remainingMembers = await prisma.groupMember.findMany({
      where: { groupId },
      orderBy: { joinedAt: 'asc' },
    });

    if (remainingMembers.length === 0) {
      await prisma.group.delete({ where: { id: groupId } });
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
