import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/lib/cloudflare';
import type { JWTPayload } from '@/lib/auth';
import { getPrismaClientFromContext } from '@/lib/db';
import { authenticateNextRequestTypes } from '@/lib/session';
import { sanitizeStoragePathSegment } from '@/lib/utils';

export const runtime = 'edge';

type PrismaClient = Awaited<ReturnType<typeof getPrismaClientFromContext>>;

interface DecodedStoragePath {
  ownerSegment: string;
  objectKey: string;
  protectedUrl: string;
}

function decodeStoragePath(pathSegments: string[]): DecodedStoragePath | null {
  if (pathSegments.length < 2) {
    return null;
  }

  const decodedSegments: string[] = [];

  for (const segment of pathSegments) {
    let decoded: string;

    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return null;
    }

    if (
      !decoded ||
      decoded === '.' ||
      decoded === '..' ||
      decoded.includes('/') ||
      decoded.includes('\\') ||
      /[\u0000-\u001f]/.test(decoded)
    ) {
      return null;
    }

    decodedSegments.push(decoded);
  }

  const [ownerSegment] = decodedSegments;
  if (ownerSegment !== sanitizeStoragePathSegment(ownerSegment)) {
    return null;
  }

  return {
    ownerSegment,
    objectKey: decodedSegments.join('/'),
    protectedUrl: `/api/files/${decodedSegments
      .map((segment) => encodeURIComponent(segment))
      .join('/')}`,
  };
}

async function canAccessMessageAttachment(
  prisma: PrismaClient,
  payload: JWTPayload,
  protectedUrl: string
): Promise<boolean> {
  if (payload.type === 'host') {
    const message = await prisma.message.findFirst({
      where: {
        fileUrl: protectedUrl,
        workspace: {
          hostId: payload.userId,
        },
      },
      select: {
        id: true,
      },
    });

    return Boolean(message);
  }

  const message = await prisma.message.findFirst({
    where: {
      fileUrl: protectedUrl,
      workspace: {
        members: {
          some: {
            userId: payload.userId,
          },
        },
      },
      OR: [
        {
          senderId: payload.userId,
        },
        {
          receiverId: payload.userId,
        },
        {
          group: {
            members: {
              some: {
                userId: payload.userId,
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  return Boolean(message);
}

async function canAccessUserAvatar(
  prisma: PrismaClient,
  payload: JWTPayload,
  protectedUrl: string
): Promise<boolean> {
  if (payload.type === 'host') {
    const hostAvatar = await prisma.host.findFirst({
      where: {
        id: payload.userId,
        avatar: protectedUrl,
      },
      select: {
        id: true,
      },
    });
    if (hostAvatar) {
      return true;
    }

    const userAvatar = await prisma.user.findFirst({
      where: {
        avatar: protectedUrl,
        workspaces: {
          some: {
            workspace: {
              hostId: payload.userId,
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    return Boolean(userAvatar);
  }

  const userAvatar = await prisma.user.findFirst({
    where: {
      avatar: protectedUrl,
      OR: [
        {
          id: payload.userId,
        },
        {
          workspaces: {
            some: {
              workspace: {
                members: {
                  some: {
                    userId: payload.userId,
                  },
                },
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  return Boolean(userAvatar);
}

async function canAccessWorkspaceLogo(
  prisma: PrismaClient,
  payload: JWTPayload,
  protectedUrl: string
): Promise<boolean> {
  const workspaceSetting = await prisma.workspaceSettings.findFirst({
    where: {
      logo: protectedUrl,
      workspace:
        payload.type === 'host'
          ? {
              hostId: payload.userId,
            }
          : {
              members: {
                some: {
                  userId: payload.userId,
                },
              },
            },
    },
    select: {
      id: true,
    },
  });

  return Boolean(workspaceSetting);
}

async function canAccessGroupAvatar(
  prisma: PrismaClient,
  payload: JWTPayload,
  protectedUrl: string
): Promise<boolean> {
  const group = await prisma.group.findFirst({
    where: {
      avatar: protectedUrl,
      workspace:
        payload.type === 'host'
          ? {
              hostId: payload.userId,
            }
          : {
              members: {
                some: {
                  userId: payload.userId,
                },
              },
            },
    },
    select: {
      id: true,
    },
  });

  return Boolean(group);
}

async function canAccessProtectedFile(
  prisma: PrismaClient,
  payload: JWTPayload,
  storagePath: DecodedStoragePath
): Promise<boolean> {
  if (storagePath.ownerSegment === sanitizeStoragePathSegment(payload.userId)) {
    return true;
  }

  const accessChecks = await Promise.all([
    canAccessMessageAttachment(prisma, payload, storagePath.protectedUrl),
    canAccessUserAvatar(prisma, payload, storagePath.protectedUrl),
    canAccessWorkspaceLogo(prisma, payload, storagePath.protectedUrl),
    canAccessGroupAvatar(prisma, payload, storagePath.protectedUrl),
  ]);

  return accessChecks.some(Boolean);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const prisma = await getPrismaClientFromContext();
  const payload = await authenticateNextRequestTypes(request, ['client', 'host'], prisma);
  if (!payload) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const env = getCloudflareEnv();
  const storage = env?.STORAGE;
  if (!storage) {
    return NextResponse.json(
      { success: false, error: 'Storage not configured' },
      { status: 500 }
    );
  }

  const { path } = await params;
  const storagePath = decodeStoragePath(path);
  if (!storagePath) {
    return NextResponse.json(
      { success: false, error: 'Invalid file path' },
      { status: 400 }
    );
  }

  const canAccess = await canAccessProtectedFile(prisma, payload, storagePath);
  if (!canAccess) {
    return NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: 403 }
    );
  }

  const object = await storage.get(storagePath.objectKey);
  if (!object) {
    return NextResponse.json(
      { success: false, error: 'File not found' },
      { status: 404 }
    );
  }

  const headers = new Headers();
  headers.set(
    'Content-Type',
    object.httpMetadata?.contentType || 'application/octet-stream'
  );
  headers.set('Cache-Control', 'private, max-age=60');
  headers.set('Content-Length', String(object.size));
  if (object.etag) {
    headers.set('ETag', object.etag);
  }

  const fileData = await object.arrayBuffer();

  return new Response(fileData, {
    headers,
  });
}
