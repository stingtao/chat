import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const runtime = 'edge';

// Update user's last seen status
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

    const { workspaceId } = await request.json();

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

    // Update last seen timestamp for this user in this workspace
    const member = await prisma.workspaceMember.updateMany({
      where: {
        workspaceId,
        userId: payload.userId,
      },
      data: {
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: { lastSeenAt: new Date() },
    });
  } catch (error) {
    console.error('Update status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update status' },
      { status: 500 }
    );
  }
}
