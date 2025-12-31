import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { validateEmail, validatePassword } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.error },
        { status: 400 }
      );
    }

    // Check if host already exists
    const existingHost = await prisma.host.findUnique({
      where: { email },
    });

    if (existingHost) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Create host
    const hashedPassword = await hashPassword(password);
    const host = await prisma.host.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

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
    console.error('Host registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    );
  }
}
