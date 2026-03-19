import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { authenticateNextRequest } from '@/lib/session';

export const runtime = 'edge';

// Update workspace settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = await getPrismaClientFromContext();
    const payload = await authenticateNextRequest(request, 'host');
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const { id } = await params;

    // Verify ownership
    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
        hostId: payload.userId,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: 'Workspace not found' },
        { status: 404 }
      );
    }

    const data = (await request.json()) as {
      primaryColor?: string;
      secondaryColor?: string;
      logo?: string | null;
      welcomeMessage?: string | null;
      allowGroupChat?: boolean;
      maxGroupSize?: number;
    };

    const settings = await prisma.workspaceSettings.upsert({
      where: { workspaceId: id },
      update: {
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        logo: data.logo,
        welcomeMessage: data.welcomeMessage,
        allowGroupChat: data.allowGroupChat,
        maxGroupSize: data.maxGroupSize,
      },
      create: {
        workspaceId: id,
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
