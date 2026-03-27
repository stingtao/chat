import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { broadcastToRoom, buildWorkspaceRoomName } from '@/lib/realtime';
import type { WSMessage } from '@/lib/types';
import { authenticateNextRequest } from '@/lib/session';
import { enforceRateLimit } from '@/lib/rate-limit';

export const runtime = 'edge';

async function broadcastWorkspaceEvent(workspaceId: string, message: WSMessage) {
  await broadcastToRoom({
    roomName: buildWorkspaceRoomName(workspaceId),
    message,
  });
}

// Create a spam report
export async function POST(request: NextRequest) {
  try {
    const prisma = await getPrismaClientFromContext();
    const payload = await authenticateNextRequest(request, 'client', prisma);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { workspaceId, messageId, reason } = (await request.json()) as {
      workspaceId?: string;
      messageId?: string;
      reason?: string;
    };
    const trimmedReason = typeof reason === 'string' ? reason.trim() : '';

    if (!workspaceId || !messageId || !trimmedReason) {
      return NextResponse.json(
        { success: false, error: 'Workspace ID, message ID, and reason are required' },
        { status: 400 }
      );
    }

    const rateLimitResponse = await enforceRateLimit({
      prisma,
      request,
      scope: 'spam_report_create',
      limit: 10,
      windowMs: 60 * 60 * 1000,
      identifierParts: [payload.userId, workspaceId],
      errorMessage: 'Too many spam reports. Please try again later.',
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: payload.userId,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Not a member of this workspace' },
        { status: 403 }
      );
    }

    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        workspaceId,
      },
    });

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    const existingReport = await prisma.spamReport.findFirst({
      where: {
        workspaceId,
        reporterId: payload.userId,
        messageId,
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { success: false, error: 'You already reported this message' },
        { status: 409 }
      );
    }

    const report = await prisma.spamReport.create({
      data: {
        workspaceId,
        reporterId: payload.userId,
        messageId,
        reason: trimmedReason,
        status: 'pending',
      },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    void broadcastWorkspaceEvent(workspaceId, {
      type: 'spam_report_created',
      payload: {
        workspaceId,
        report,
      },
      timestamp: Date.now(),
    }).catch((error) => {
      console.error('Broadcast spam report create error:', error);
    });

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Create spam report error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create spam report' },
      { status: 500 }
    );
  }
}
