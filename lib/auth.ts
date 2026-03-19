import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { getCloudflareEnv } from './cloudflare';
import { generateRandomString, generateUppercaseCode, slugify } from './utils';

export interface JWTPayload {
  userId: string;
  email: string;
  type: 'host' | 'client';
}

export const SESSION_COOKIE_NAMES = {
  client: 'client_session',
  host: 'host_session',
} as const;

export function getSessionCookieName(type: JWTPayload['type']): string {
  return SESSION_COOKIE_NAMES[type];
}

export function parseBearerToken(header: string | null | undefined): string | null {
  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  return header.slice(7).trim() || null;
}

function getJwtSecret(secretOverride?: string): Uint8Array {
  const envSecret = getCloudflareEnv()?.JWT_SECRET;
  const secret = secretOverride || envSecret || process.env.JWT_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be configured in production.');
    }

    return new TextEncoder().encode('development-only-secret-change-me');
  }

  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generateToken(payload: JWTPayload, secretOverride?: string): Promise<string> {
  const JWT_SECRET = getJwtSecret(secretOverride);
  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(JWT_SECRET);

  return token;
}

export async function verifyToken(
  token: string,
  secretOverride?: string
): Promise<JWTPayload | null> {
  try {
    const JWT_SECRET = getJwtSecret(secretOverride);
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export function generateInviteCode(): string {
  return generateUppercaseCode(8);
}

export function generateSlug(name: string): string {
  return `${slugify(name)}-${generateRandomString(4)}`;
}
