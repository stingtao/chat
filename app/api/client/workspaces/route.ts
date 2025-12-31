import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// Get all workspaces user is a member of
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
