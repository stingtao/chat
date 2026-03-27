import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { authenticateNextRequest, clearSessionCookie } from '@/lib/session';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateNextRequest(request, 'host');
    if (!payload) {
      const response = NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
      clearSessionCookie(response, 'host');
      return response;
    }

    const prisma = await getPrismaClientFromContext();
    const host = await prisma.host.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
    });

    if (!host) {
      const response = NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
      clearSessionCookie(response, 'host');
      return response;
    }

    return NextResponse.json({
      success: true,
      data: host,
    });
  } catch (error) {
    console.error('Get host session error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
