import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { authenticateNextRequest } from '@/lib/session';

export const runtime = 'edge';

// Get workspace members
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

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            avatar: true,
            createdAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error('Get members error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}
