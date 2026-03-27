import { NextRequest, NextResponse } from 'next/server';
import {
  getSessionCookieName,
  parseBearerToken,
  type JWTPayload,
  verifyToken,
} from './auth';
import { getPrismaClientFromContext } from './db';

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type PrismaClient = Awaited<ReturnType<typeof getPrismaClientFromContext>>;

export async function validateSessionPayload(
  prisma: PrismaClient,
  payload: JWTPayload
): Promise<boolean> {
  const currentSessionVersion = payload.type === 'client'
    ? await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { sessionVersion: true },
      })
    : await prisma.host.findUnique({
        where: { id: payload.userId },
        select: { sessionVersion: true },
      });

  if (!currentSessionVersion) {
    return false;
  }

  return (payload.sessionVersion ?? 0) === currentSessionVersion.sessionVersion;
}

export async function authenticateNextRequest(
  request: NextRequest,
  expectedType: JWTPayload['type'],
  prisma?: PrismaClient
): Promise<JWTPayload | null> {
  const headerToken = parseBearerToken(request.headers.get('authorization'));
  const cookieToken = request.cookies.get(getSessionCookieName(expectedType))?.value || null;
  const token = headerToken || cookieToken;

  if (!token) {
    return null;
  }

  const payload = await verifyToken(token);
  if (!payload || payload.type !== expectedType) {
    return null;
  }

  const sessionPrisma = prisma || await getPrismaClientFromContext();
  const isValidSession = await validateSessionPayload(sessionPrisma, payload);
  if (!isValidSession) {
    return null;
  }

  return payload;
}

export async function authenticateNextRequestTypes(
  request: NextRequest,
  expectedTypes: JWTPayload['type'][],
  prisma?: PrismaClient
): Promise<JWTPayload | null> {
  const headerToken = parseBearerToken(request.headers.get('authorization'));
  const sessionPrisma = prisma || await getPrismaClientFromContext();

  for (const expectedType of expectedTypes) {
    const cookieToken =
      request.cookies.get(getSessionCookieName(expectedType))?.value || null;
    const token = headerToken || cookieToken;
    if (!token) {
      continue;
    }

    const payload = await verifyToken(token);
    if (
      payload &&
      expectedTypes.includes(payload.type) &&
      await validateSessionPayload(sessionPrisma, payload)
    ) {
      return payload;
    }
  }

  return null;
}

export function applySessionCookie(
  response: NextResponse,
  type: JWTPayload['type'],
  token: string
) {
  response.cookies.set({
    name: getSessionCookieName(type),
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(
  response: NextResponse,
  type: JWTPayload['type']
) {
  response.cookies.set({
    name: getSessionCookieName(type),
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
