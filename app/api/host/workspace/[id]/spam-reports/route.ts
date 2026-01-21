import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const runtime = 'edge';

// Get spam reports
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

    const reports = await prisma.spamReport.findMany({
      where: { workspaceId: params.id },
      include: {
        reporter: {
          select: {
            id: true,
            email: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error('Get spam reports error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch spam reports' },
      { status: 500 }
    );
  }
}

// Update spam report status
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

    const { reportId, status } = await request.json();

    if (!reportId || !status) {
      return NextResponse.json(
        { success: false, error: 'Report ID and status are required' },
        { status: 400 }
      );
    }

    const report = await prisma.spamReport.updateMany({
      where: {
        id: reportId,
        workspaceId: params.id,
      },
      data: { status },
    });

    if (report.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: reportId, status },
    });
  } catch (error) {
    console.error('Update spam report error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update spam report' },
      { status: 500 }
    );
  }
}
