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
    const isValid = await verifyPassword(password, user.password);
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
    });

    return NextResponse.json({
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
  } catch (error) {
    console.error('Client login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
