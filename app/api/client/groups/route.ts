import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// Get user's groups in a workspace
export async function GET(request: NextRequest) {
  try {
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

    if (!workspaceId || !name) {
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
        name,
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
