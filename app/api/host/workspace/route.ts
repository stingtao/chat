import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { verifyToken, generateInviteCode, generateSlug } from '@/lib/auth';

export const runtime = 'edge';

// Get all workspaces for a host
export async function GET(request: NextRequest) {
  try {
    const prisma = await getPrismaClientFromContext();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload || payload.type !== 'host') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const workspaces = await prisma.workspace.findMany({
      where: { hostId: payload.userId },
      include: {
        settings: true,
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: workspaces,
    });
  } catch (error) {
    console.error('Get workspaces error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workspaces' },
      { status: 500 }
    );
  }
}

// Create a new workspace
export async function POST(request: NextRequest) {
  try {
    const prisma = await getPrismaClientFromContext();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    console.log('Received token:', token ? 'exists' : 'missing');

    if (!token) {
      console.log('No token provided');
      return NextResponse.json(
        { success: false, error: 'Unauthorized - No token' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    console.log('Token payload:', payload);

    if (!payload || payload.type !== 'host') {
      console.log('Invalid token or wrong user type');
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const { name } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Workspace name is required' },
        { status: 400 }
      );
    }

    const slug = generateSlug(name);
    const inviteCode = generateInviteCode();

    const workspace = await prisma.workspace.create({
      data: {
        hostId: payload.userId,
        name,
        slug,
        inviteCode,
        settings: {
          create: {
            primaryColor: '#3b82f6',
            secondaryColor: '#10b981',
            allowGroupChat: true,
            maxGroupSize: 100,
          },
        },
      },
      include: {
        settings: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: workspace,
    });
  } catch (error) {
    console.error('Create workspace error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create workspace' },
      { status: 500 }
    );
  }
}
