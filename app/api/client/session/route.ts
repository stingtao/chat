import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { authenticateNextRequest, clearSessionCookie } from '@/lib/session';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateNextRequest(request, 'client');
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const prisma = await getPrismaClientFromContext();
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
      },
    });

    if (!user) {
      const response = NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
      clearSessionCookie(response, 'client');
      return response;
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get client session error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
