import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { hashPassword } from '@/lib/password';
import { validateEmail, validatePassword } from '@/lib/utils';
import { normalizeTextInput } from '@/lib/utils';
import { applySessionCookie } from '@/lib/session';
import { enforceRateLimit } from '@/lib/rate-limit';

const MAX_USERNAME_LENGTH = 30;

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const prisma = await getPrismaClientFromContext();
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      username?: string;
    };
    const email = normalizeTextInput(body.email).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    const username = normalizeTextInput(body.username, { maxLength: MAX_USERNAME_LENGTH });

    // Validation
    if (!email || !password || !username) {
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

    const rateLimitResponse = await enforceRateLimit({
      prisma,
      request,
      scope: 'client_register',
      limit: 5,
      windowMs: 60 * 60 * 1000,
      identifierParts: [email],
      errorMessage: 'Too many registration attempts. Please try again later.',
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    if (typeof body.username === 'string' && body.username.trim().length > MAX_USERNAME_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Username must be ${MAX_USERNAME_LENGTH} characters or fewer` },
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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
      },
    });

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
    console.error('Client registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    );
  }
}
