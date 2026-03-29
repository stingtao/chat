import { describe, expect, it } from 'vitest';
import {
  generateInviteCode,
  generateToken,
  generateSlug,
  parseBearerToken,
  verifyToken,
} from '../../lib/auth';

describe('lib/auth', () => {
  it('parses bearer tokens and rejects malformed headers', () => {
    expect(parseBearerToken('Bearer abc123')).toBe('abc123');
    expect(parseBearerToken('Bearer   abc123   ')).toBe('abc123');
    expect(parseBearerToken('Basic abc123')).toBeNull();
    expect(parseBearerToken(null)).toBeNull();
  });

  it('generates and verifies JWT payloads including session version', async () => {
    const token = await generateToken(
      {
        userId: 'user_123',
        email: 'user@example.com',
        type: 'client',
        sessionVersion: 4,
      },
      'test-secret'
    );

    const payload = await verifyToken(token, 'test-secret');
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe('user_123');
    expect(payload?.email).toBe('user@example.com');
    expect(payload?.type).toBe('client');
    expect(payload?.sessionVersion).toBe(4);
  });

  it('rejects verification with the wrong secret', async () => {
    const token = await generateToken(
      {
        userId: 'host_123',
        email: 'host@example.com',
        type: 'host',
      },
      'correct-secret'
    );

    await expect(verifyToken(token, 'wrong-secret')).resolves.toBeNull();
  });

  it('creates invite codes and slugs in the expected format', () => {
    expect(generateInviteCode()).toMatch(/^[A-Z0-9]{8}$/);
    expect(generateSlug('My New Workspace')).toMatch(/^my-new-workspace-[a-z0-9]{4}$/);
  });
});
