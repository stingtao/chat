import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const runtime = 'edge';

// Create a spam report
export async function POST(request: NextRequest) {
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
    if (!payload || payload.type !== 'client') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { workspaceId, messageId, reason } = await request.json();
    const trimmedReason = typeof reason === 'string' ? reason.trim() : '';

    if (!workspaceId || !messageId || !trimmedReason) {
      return NextResponse.json(
        { success: false, error: 'Workspace ID, message ID, and reason are required' },
        { status: 400 }
      );
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
