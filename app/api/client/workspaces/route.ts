import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { authenticateNextRequest } from '@/lib/session';

export const runtime = 'edge';

// Get all workspaces user is a member of
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

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: payload.userId },
      include: {
        workspace: {
          include: {
            settings: true,
          },
        },
      },
      orderBy: { lastSeenAt: 'desc' },
    });

    const workspaces = memberships.map(m => ({
      ...m.workspace,
      memberSince: m.joinedAt,
    }));

    return NextResponse.json({
      success: true,
      data: workspaces,
    });
  } catch (error) {
    console.error('Get workspaces error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workspaces' },
      { status: 500 }
    );
  }
}
