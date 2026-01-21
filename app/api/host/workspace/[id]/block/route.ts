import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const runtime = 'edge';

// Block a user
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    if (!payload || payload.type !== 'host') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify ownership
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: params.id,
        hostId: payload.userId,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: 'Workspace not found' },
        { status: 404 }
      );
    }

    const { userId, reason } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Block user
    const blocked = await prisma.blockedUser.create({
      data: {
        workspaceId: params.id,
        userId,
        reason,
      },
    });

    // Remove from workspace members
    await prisma.workspaceMember.deleteMany({
      where: {
        workspaceId: params.id,
        userId,
      },
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
  { params }: { params: { id: string } }
) {
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
    if (!payload || payload.type !== 'host') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: params.id,
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
      where: { workspaceId: params.id },
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
  { params }: { params: { id: string } }
) {
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
    if (!payload || payload.type !== 'host') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: params.id,
        hostId: payload.userId,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: 'Workspace not found' },
        { status: 404 }
      );
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const unblocked = await prisma.blockedUser.deleteMany({
      where: {
        workspaceId: params.id,
        userId,
      },
    });

    if (unblocked.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Blocked user not found' },
        { status: 404 }
      );
    }

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
