import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const runtime = 'edge';

// Get workspace details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: params.id,
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
  { params }: { params: { id: string } }
) {
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

    const data = await request.json();

    const workspace = await prisma.workspace.updateMany({
      where: {
        id: params.id,
        hostId: payload.userId,
      },
      data: {
        name: data.name,
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
      data: { id: params.id },
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
  { params }: { params: { id: string } }
) {
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

    const workspace = await prisma.workspace.deleteMany({
      where: {
        id: params.id,
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
      data: { id: params.id },
    });
  } catch (error) {
    console.error('Delete workspace error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete workspace' },
      { status: 500 }
    );
  }
}
