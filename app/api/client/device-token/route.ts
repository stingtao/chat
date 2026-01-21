import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getPrismaClientFromContext } from '@/lib/db';

export const runtime = 'edge';

// Register or update device token for push notifications
export async function POST(request: NextRequest) {
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
    const { deviceToken, platform, deviceName } = body;

    if (!deviceToken || !platform) {
      return NextResponse.json(
        { success: false, error: 'deviceToken and platform are required' },
        { status: 400 }
      );
    }

    // Validate platform
    const validPlatforms = ['ios', 'android', 'web'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { success: false, error: 'Invalid platform. Must be ios, android, or web' },
        { status: 400 }
      );
    }

    const prisma = await getPrismaClientFromContext();

    // Check if token already exists
    const existingToken = await prisma.deviceToken.findUnique({
      where: { token: deviceToken },
    });

    if (existingToken) {
      // Update existing token (might be re-registering or changing user)
      await prisma.deviceToken.update({
        where: { token: deviceToken },
        data: {
          userId: payload.userId,
          platform,
          deviceName: deviceName || existingToken.deviceName,
          isActive: true,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Device token updated',
      });
    }

    // Create new token
    const newToken = await prisma.deviceToken.create({
      data: {
        userId: payload.userId,
        token: deviceToken,
        platform,
        deviceName: deviceName || null,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Device token registered',
      tokenId: newToken.id,
    });
  } catch (error) {
    console.error('Device token registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register device token' },
      { status: 500 }
    );
  }
}

// Get user's device tokens
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

    const prisma = await getPrismaClientFromContext();
    const tokens = await prisma.deviceToken.findMany({
      where: {
        userId: payload.userId,
        isActive: true,
      },
      select: {
        id: true,
        platform: true,
        deviceName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      tokens,
    });
  } catch (error) {
    console.error('Get device tokens error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get device tokens' },
      { status: 500 }
    );
  }
}

// Delete/deactivate device token (for logout)
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
    const deviceToken = searchParams.get('token');

    if (!deviceToken) {
      return NextResponse.json(
        { success: false, error: 'Device token is required' },
        { status: 400 }
      );
    }

    const prisma = await getPrismaClientFromContext();

    // Deactivate the token (soft delete)
    await prisma.deviceToken.updateMany({
      where: {
        userId: payload.userId,
        token: deviceToken,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Device token deactivated',
    });
  } catch (error) {
    console.error('Delete device token error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete device token' },
      { status: 500 }
    );
  }
}
