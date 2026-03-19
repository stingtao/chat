import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/session';

export const runtime = 'edge';

export async function POST(_request: NextRequest) {
  const response = NextResponse.json({
    success: true,
  });

  clearSessionCookie(response, 'host');
  return response;
}
