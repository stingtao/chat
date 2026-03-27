import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { authenticateNextRequest, clearSessionCookie } from '@/lib/session';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const prisma = await getPrismaClientFromContext();
  const payload = await authenticateNextRequest(request, 'host', prisma);

  if (payload) {
    await prisma.host.update({
      where: { id: payload.userId },
      data: {
        sessionVersion: {
          increment: 1,
        },
      },
    }).catch((error) => {
      console.error('Host logout session revocation error:', error);
    });
  }

  const response = NextResponse.json({
    success: true,
  });

  clearSessionCookie(response, 'host');
  return response;
}
