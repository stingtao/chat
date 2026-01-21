import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getPrismaClientFromContext } from '@/lib/db';

export const runtime = 'edge';

// Get user notifications
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);
    if (!payload || payload.type !== 'client') {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const prisma = await getPrismaClientFromContext();

    const whereClause: Record<string, unknown> = {
      userId: payload.userId,
    };

    if (workspaceId) {
      whereClause.workspaceId = workspaceId;
    }

    if (unreadOnly) {
      whereClause.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where: whereClause }),
      prisma.notification.count({
        where: {
          userId: payload.userId,
          isRead: false,
          ...(workspaceId ? { workspaceId } : {}),
        },
      }),
    ]);

    // Parse JSON data field
    const formattedNotifications = notifications.map(n => ({
      ...n,
      data: n.data ? JSON.parse(n.data) : null,
    }));

    return NextResponse.json({
      success: true,
      notifications: formattedNotifications,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + notifications.length < total,
      },
      unreadCount,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get notifications' },
      { status: 500 }
    );
  }
}

// Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);
    if (!payload || payload.type !== 'client') {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAll, workspaceId } = body;

    const prisma = await getPrismaClientFromContext();

    if (markAll) {
      // Mark all notifications as read
      const whereClause: Record<string, unknown> = {
        userId: payload.userId,
        isRead: false,
      };

      if (workspaceId) {
        whereClause.workspaceId = workspaceId;
      }

      await prisma.notification.updateMany({
        where: whereClause,
        data: { isRead: true },
      });

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      });
    }

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'notificationIds array is required' },
        { status: 400 }
      );
    }

    // Mark specific notifications as read
    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: payload.userId, // Ensure user owns these notifications
      },
      data: { isRead: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Notifications marked as read',
    });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}

// Delete old notifications (cleanup)
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);
    if (!payload || payload.type !== 'client') {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    const deleteRead = searchParams.get('deleteRead') === 'true';

    const prisma = await getPrismaClientFromContext();

    if (notificationId) {
      // Delete specific notification
      await prisma.notification.deleteMany({
        where: {
          id: notificationId,
          userId: payload.userId,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Notification deleted',
      });
    }

    if (deleteRead) {
      // Delete all read notifications
      const deleted = await prisma.notification.deleteMany({
        where: {
          userId: payload.userId,
          isRead: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Deleted ${deleted.count} read notifications`,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Specify notification id or deleteRead=true' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Delete notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete notifications' },
      { status: 500 }
    );
  }
}
