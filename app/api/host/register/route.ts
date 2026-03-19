import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { normalizeTextInput, validateEmail, validatePassword } from '@/lib/utils';
import { applySessionCookie } from '@/lib/session';

const MAX_HOST_NAME_LENGTH = 80;

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const prisma = await getPrismaClientFromContext();
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };
    const email = normalizeTextInput(body.email).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    const rawName = typeof body.name === 'string' ? body.name.trim() : '';
    const name = normalizeTextInput(body.name, { maxLength: MAX_HOST_NAME_LENGTH });

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

    if (rawName.length > MAX_HOST_NAME_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Name must be ${MAX_HOST_NAME_LENGTH} characters or fewer` },
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
    console.error('Host registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    );
  }
}
