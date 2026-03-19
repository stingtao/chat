import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { authenticateNextRequest } from '@/lib/session';
import { normalizeTextInput } from '@/lib/utils';

export const runtime = 'edge';

// Get workspace details
export async function GET(
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

    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
        hostId: payload.userId,
      },
      include: {
        settings: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: true,
            groups: true,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: 'Workspace not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: workspace,
    });
  } catch (error) {
    console.error('Get workspace error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workspace' },
      { status: 500 }
    );
  }
}

// Update workspace
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

    const data = (await request.json()) as { name?: string };
    const name = normalizeTextInput(data.name, { maxLength: 60 });
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Workspace name is required' },
        { status: 400 }
      );
    }

    const workspace = await prisma.workspace.updateMany({
      where: {
        id,
        hostId: payload.userId,
      },
      data: {
        name,
      },
    });

    if (workspace.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Workspace not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error('Update workspace error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update workspace' },
      { status: 500 }
    );
  }
}

// Delete workspace
export async function DELETE(
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

    const workspace = await prisma.workspace.deleteMany({
      where: {
        id,
        hostId: payload.userId,
      },
    });

    if (workspace.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Workspace not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error('Delete workspace error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete workspace' },
      { status: 500 }
    );
  }
}
