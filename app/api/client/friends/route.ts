import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const runtime = 'edge';

// Send friend request
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

    const { workspaceId, receiverId } = await request.json();

    if (!workspaceId || !receiverId) {
      return NextResponse.json(
        { success: false, error: 'Workspace ID and receiver ID are required' },
        { status: 400 }
      );
    }

    const senderMembership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: payload.userId,
      },
    });

    if (!senderMembership) {
      return NextResponse.json(
        { success: false, error: 'Not a member of this workspace' },
        { status: 403 }
      );
    }

    const receiverMembership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: receiverId,
      },
    });

    if (!receiverMembership) {
      return NextResponse.json(
        { success: false, error: 'Receiver not in workspace' },
        { status: 404 }
      );
    }

    // Check if trying to add yourself as friend
    if (receiverId === payload.userId) {
      return NextResponse.json(
        { success: false, error: 'You cannot add yourself as a friend' },
        { status: 400 }
      );
    }

    // Check if already friends or request exists
    const existing = await prisma.friendship.findFirst({
      where: {
        workspaceId,
        OR: [
          { senderId: payload.userId, receiverId },
          { senderId: receiverId, receiverId: payload.userId },
        ],
      },
    });

    if (existing) {
      // Provide more specific error message based on status
      if (existing.status === 'accepted') {
        return NextResponse.json(
          { success: false, error: 'You are already friends with this user' },
          { status: 409 }
        );
      } else if (existing.status === 'pending') {
        // Check if current user is the sender or receiver
        if (existing.senderId === payload.userId) {
          return NextResponse.json(
            { success: false, error: 'Friend request already sent. Waiting for approval.' },
            { status: 409 }
          );
        } else {
          return NextResponse.json(
            { success: false, error: 'This user has already sent you a friend request. Please check your requests.' },
            { status: 409 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Friend request already exists' },
          { status: 409 }
        );
      }
    }

    // Create friend request
    const friendship = await prisma.friendship.create({
      data: {
        workspaceId,
        senderId: payload.userId,
        receiverId,
        status: 'pending',
      },
      include: {
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: friendship,
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send friend request' },
      { status: 500 }
    );
  }
}

// Get friends
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

    const friendships = await prisma.friendship.findMany({
      where: {
        workspaceId,
        OR: [
          { senderId: payload.userId },
          { receiverId: payload.userId },
        ],
        status: 'accepted',
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // Get lastSeenAt for all friends
    const friendIds = friendships.map(f =>
      f.senderId === payload.userId ? f.receiverId : f.senderId
    );

    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        userId: { in: friendIds },
      },
      select: {
        userId: true,
        lastSeenAt: true,
      },
    });

    const lastSeenMap = new Map(
      workspaceMembers.map(m => [m.userId, m.lastSeenAt])
    );

    const friends = friendships.map(f => {
      const friend = f.senderId === payload.userId ? f.receiver : f.sender;
      return {
        ...f,
        friend: {
          ...friend,
          lastSeenAt: lastSeenMap.get(friend.id),
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: friends,
    });
  } catch (error) {
    console.error('Get friends error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch friends' },
      { status: 500 }
    );
  }
}

// Accept/reject friend request
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

    const { friendshipId, status } = await request.json();

    if (!friendshipId || !status) {
      return NextResponse.json(
        { success: false, error: 'Friendship ID and status are required' },
        { status: 400 }
      );
    }

    const friendship = await prisma.friendship.updateMany({
      where: {
        id: friendshipId,
        receiverId: payload.userId,
      },
      data: { status },
    });

    if (friendship.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Friend request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: friendshipId, status },
    });
  } catch (error) {
    console.error('Update friend request error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update friend request' },
      { status: 500 }
    );
  }
}
