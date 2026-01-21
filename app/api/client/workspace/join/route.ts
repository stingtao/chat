import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const runtime = 'edge';

// Generate unique memberTag for workspace (4 digits)
async function generateUniqueMemberTag(
  prisma: Awaited<ReturnType<typeof getPrismaClientFromContext>>,
  workspaceId: string
): Promise<string> {
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    // Generate random 4-digit tag
    const tag = Math.floor(1000 + Math.random() * 9000).toString();

    // Check if tag is unique in this workspace
    const existing = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        memberTag: tag,
      },
    });

    if (!existing) {
      return tag;
    }

    attempts++;
  }

  // If we can't find a unique 4-digit tag, use 5 digits
  const tag = Math.floor(10000 + Math.random() * 90000).toString();
  return tag;
}

// Join workspace with invite code
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

    const { inviteCode } = await request.json();

    if (!inviteCode) {
      return NextResponse.json(
        { success: false, error: 'Invite code is required' },
        { status: 400 }
      );
    }

    // Find workspace
    const workspace = await prisma.workspace.findUnique({
      where: { inviteCode },
      include: { settings: true },
    });

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: 'Invalid invite code' },
        { status: 404 }
      );
    }

    // Check if user is blocked
    const isBlocked = await prisma.blockedUser.findFirst({
      where: {
        workspaceId: workspace.id,
        userId: payload.userId,
      },
    });

    if (isBlocked) {
      return NextResponse.json(
        { success: false, error: 'You are blocked from this workspace' },
        { status: 403 }
      );
    }

    // Check if already a member
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: workspace.id,
        userId: payload.userId,
      },
    });

  if (existingMember) {
    return NextResponse.json({
      success: true,
      data: workspace,
    });
  }

  // Generate unique memberTag
  const memberTag = await generateUniqueMemberTag(prisma, workspace.id);

    // Add as member
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: payload.userId,
        memberTag,
        role: 'member',
      },
    });

    return NextResponse.json({
      success: true,
      data: workspace,
    });
  } catch (error) {
    console.error('Join workspace error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to join workspace' },
      { status: 500 }
    );
  }
}
