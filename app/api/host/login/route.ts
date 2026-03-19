import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';
import { normalizeTextInput } from '@/lib/utils';
import { applySessionCookie } from '@/lib/session';

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

    // Find host
    const host = await prisma.host.findUnique({
      where: { email },
    });

    if (!host) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if OAuth user trying password login
    if (!host.password && host.authProvider !== 'email') {
      return NextResponse.json(
        {
          success: false,
          error: `This account uses ${host.authProvider} login. Please use the ${host.authProvider} button.`,
        },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, host.password!);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate token
    const token = await generateToken({
      userId: host.id,
      email: host.email,
      type: 'host',
    });

    const response = NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: host.id,
          email: host.email,
          name: host.name,
        },
      },
    });

    applySessionCookie(response, 'host', token);
    return response;
  } catch (error) {
    console.error('Host login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
