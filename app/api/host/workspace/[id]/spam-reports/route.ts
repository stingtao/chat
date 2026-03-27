import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { broadcastToRoom, buildWorkspaceRoomName } from '@/lib/realtime';
import type { SpamReport, WSMessage } from '@/lib/types';
import { authenticateNextRequest } from '@/lib/session';

export const runtime = 'edge';

const SPAM_REPORT_STATUSES: SpamReport['status'][] = ['pending', 'reviewed', 'resolved'];

async function broadcastWorkspaceEvent(workspaceId: string, message: WSMessage) {
  await broadcastToRoom({
    roomName: buildWorkspaceRoomName(workspaceId),
    message,
  });
}

function toWorkspaceSafeReportPayload<
  T extends {
    reporter?: {
      id: string;
      username: string;
      avatar: string | null;
      email?: string;
    } | null;
  },
>(report: T): T {
  if (!report.reporter) {
    return report;
  }

  return {
    ...report,
    reporter: {
      id: report.reporter.id,
      username: report.reporter.username,
      avatar: report.reporter.avatar,
    },
  };
}

// Get spam reports
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

    const reports = await prisma.spamReport.findMany({
      where: { workspaceId: id },
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

    const { reportId, status } = (await request.json()) as {
      reportId?: string;
      status?: string;
    };

    if (!reportId || !status) {
      return NextResponse.json(
        { success: false, error: 'Report ID and status are required' },
        { status: 400 }
      );
    }

    if (!SPAM_REPORT_STATUSES.includes(status as SpamReport['status'])) {
      return NextResponse.json(
        { success: false, error: 'Invalid spam report status' },
        { status: 400 }
      );
    }

    const existingReport = await prisma.spamReport.findFirst({
      where: {
        id: reportId,
        workspaceId: id,
      },
      select: {
        id: true,
      },
    });

    if (!existingReport) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    const report = await prisma.spamReport.update({
      where: {
        id: reportId,
      },
      data: {
        status,
      },
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
    });

    void broadcastWorkspaceEvent(id, {
      type: 'spam_report_updated',
      payload: {
        workspaceId: id,
        report: toWorkspaceSafeReportPayload(report),
      },
      timestamp: Date.now(),
    }).catch((error) => {
      console.error('Broadcast spam report update error:', error);
    });

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Update spam report error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update spam report' },
      { status: 500 }
    );
  }
}
