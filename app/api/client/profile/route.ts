import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const runtime = 'edge';

// Update client profile
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

    const { username, avatar } = await request.json();
    const updates: { username?: string; avatar?: string | null } = {};

    if (typeof username === 'string') {
      const trimmed = username.trim();
      if (!trimmed) {
        return NextResponse.json(
          { success: false, error: 'Username is required' },
          { status: 400 }
        );
      }
      if (trimmed.length > 30) {
        return NextResponse.json(
          { success: false, error: 'Username is too long' },
          { status: 400 }
        );
      }
      updates.username = trimmed;
    }

    if (typeof avatar === 'string') {
      updates.avatar = avatar || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No changes provided' },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: payload.userId },
      data: updates,
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
