import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { generateInviteCode, generateSlug } from '@/lib/auth';
import { authenticateNextRequest } from '@/lib/session';
import { normalizeTextInput } from '@/lib/utils';

export const runtime = 'edge';

// Get all workspaces for a host
export async function GET(request: NextRequest) {
  try {
    const prisma = await getPrismaClientFromContext();
    const payload = await authenticateNextRequest(request, 'host');
    if (!payload) {
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
    const payload = await authenticateNextRequest(request, 'host');
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name } = (await request.json()) as { name?: string };
    const normalizedName = normalizeTextInput(name, { maxLength: 60 });

    if (!normalizedName) {
      return NextResponse.json(
        { success: false, error: 'Workspace name is required' },
        { status: 400 }
      );
    }

    const slug = generateSlug(normalizedName);
    const inviteCode = generateInviteCode();

    const workspace = await prisma.workspace.create({
      data: {
        hostId: payload.userId,
        name: normalizedName,
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
