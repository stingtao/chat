import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// Update workspace settings
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // Verify ownership
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: params.id,
        hostId: payload.userId,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: 'Workspace not found' },
        { status: 404 }
      );
    }

    const data = await request.json();

    const settings = await prisma.workspaceSettings.upsert({
      where: { workspaceId: params.id },
      update: {
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        logo: data.logo,
        welcomeMessage: data.welcomeMessage,
        allowGroupChat: data.allowGroupChat,
        maxGroupSize: data.maxGroupSize,
      },
      create: {
        workspaceId: params.id,
        primaryColor: data.primaryColor || '#3b82f6',
        secondaryColor: data.secondaryColor || '#10b981',
        logo: data.logo,
        welcomeMessage: data.welcomeMessage,
        allowGroupChat: data.allowGroupChat !== false,
        maxGroupSize: data.maxGroupSize || 100,
      },
    });

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
