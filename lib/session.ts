import { NextRequest, NextResponse } from 'next/server';
import {
  getSessionCookieName,
  parseBearerToken,
  type JWTPayload,
  verifyToken,
} from './auth';

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function authenticateNextRequest(
  request: NextRequest,
  expectedType: JWTPayload['type']
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

  return payload;
}

export async function authenticateNextRequestTypes(
  request: NextRequest,
  expectedTypes: JWTPayload['type'][]
): Promise<JWTPayload | null> {
  const headerToken = parseBearerToken(request.headers.get('authorization'));

  for (const expectedType of expectedTypes) {
    const cookieToken =
      request.cookies.get(getSessionCookieName(expectedType))?.value || null;
    const token = headerToken || cookieToken;
    if (!token) {
      continue;
    }

    const payload = await verifyToken(token);
    if (payload && expectedTypes.includes(payload.type)) {
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
