import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';
import { normalizeTextInput } from '@/lib/utils';
import { applySessionCookie } from '@/lib/session';
import { enforceRateLimit } from '@/lib/rate-limit';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const prisma = await getPrismaClientFromContext();
    const body = (await request.json()) as { email?: string; password?: string };
    const email = normalizeTextInput(body.email).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const rateLimitResponse = await enforceRateLimit({
      prisma,
      request,
      scope: 'client_login',
      limit: 6,
      windowMs: 15 * 60 * 1000,
      identifierParts: [email],
      errorMessage: 'Too many login attempts. Please try again later.',
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if OAuth user trying password login
    if (!user.password && user.authProvider !== 'email') {
      return NextResponse.json(
        {
          success: false,
          error: `This account uses ${user.authProvider} login. Please use the ${user.authProvider} button.`,
        },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password!);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate token
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      type: 'client',
      sessionVersion: user.sessionVersion,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatar: user.avatar,
        },
      },
    });

    applySessionCookie(response, 'client', token);
    return response;
  } catch (error) {
    console.error('Client login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
