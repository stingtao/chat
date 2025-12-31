import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// Get friend requests (pending only)
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

    const friendships = await prisma.friendship.findMany({
      where: {
        workspaceId,
        OR: [
          { senderId: payload.userId },
          { receiverId: payload.userId },
        ],
        status: 'pending',
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: friendships,
    });
  } catch (error) {
    console.error('Get friend requests error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch friend requests' },
      { status: 500 }
    );
  }
}
