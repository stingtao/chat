import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

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
    const isValid = await verifyPassword(password, host.password);
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

    return NextResponse.json({
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
  } catch (error) {
    console.error('Host login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
