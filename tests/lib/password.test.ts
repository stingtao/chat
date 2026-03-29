import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../lib/password';

describe('lib/password', () => {
  it('hashes and verifies passwords', async () => {
    const hash = await hashPassword('StrongPass123');

    expect(hash).not.toBe('StrongPass123');
    await expect(verifyPassword('StrongPass123', hash)).resolves.toBe(true);
    await expect(verifyPassword('WrongPass123', hash)).resolves.toBe(false);
  });
});
