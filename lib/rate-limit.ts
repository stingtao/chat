import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClientFromContext } from './db';

type PrismaClient = Awaited<ReturnType<typeof getPrismaClientFromContext>>;

interface EnforceRateLimitOptions {
  prisma?: PrismaClient;
  request: NextRequest;
  scope: string;
  limit: number;
  windowMs: number;
  identifierParts?: Array<string | number | null | undefined>;
  errorMessage?: string;
}

function getClientIpAddress(request: NextRequest): string {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp.trim();
  }

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return 'unknown';
}

function normalizeIdentifierParts(
  parts: Array<string | number | null | undefined> | undefined
): string[] {
  return (parts || [])
    .map((part) => (part === null || part === undefined ? '' : String(part).trim()))
    .filter(Boolean);
}

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function pruneExpiredBuckets(prisma: PrismaClient, now: Date) {
  await prisma.rateLimitBucket.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  });
}

export async function enforceRateLimit(
  options: EnforceRateLimitOptions
): Promise<NextResponse | null> {
  const prisma = options.prisma || await getPrismaClientFromContext();
  const nowMs = Date.now();
  const windowStartMs = Math.floor(nowMs / options.windowMs) * options.windowMs;
  const windowStartAt = new Date(windowStartMs);
  const expiresAt = new Date(windowStartMs + options.windowMs);
  const identifierSource = [
    getClientIpAddress(options.request),
    ...normalizeIdentifierParts(options.identifierParts),
  ].join('|');
  const identifierHash = await sha256Hex(identifierSource || 'unknown');

  const bucket = await prisma.rateLimitBucket.upsert({
    where: {
      scope_identifierHash_windowStartAt: {
        scope: options.scope,
        identifierHash,
        windowStartAt,
      },
    },
    create: {
      scope: options.scope,
      identifierHash,
      windowStartAt,
      expiresAt,
      count: 1,
    },
    update: {
      count: {
        increment: 1,
      },
      expiresAt,
    },
  });

  if (Math.random() < 0.02) {
    void pruneExpiredBuckets(prisma, new Date(nowMs)).catch((error) => {
      console.error('Rate-limit bucket cleanup error:', error);
    });
  }

  if (bucket.count <= options.limit) {
    return null;
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowStartMs + options.windowMs - nowMs) / 1000)
  );

  return NextResponse.json(
    {
      success: false,
      error: options.errorMessage || 'Too many requests. Please try again later.',
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}
