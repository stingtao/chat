import { describe, expect, it } from 'vitest';
import {
  buildProtectedFileUrl,
  decodeProtectedStoragePath,
} from '../../lib/storage';

describe('lib/storage', () => {
  it('builds protected file URLs with encoded segments', () => {
    expect(buildProtectedFileUrl('user_123/report final.pdf')).toBe(
      '/api/files/user_123/report%20final.pdf'
    );
  });

  it('decodes valid protected storage paths', () => {
    expect(
      decodeProtectedStoragePath(['user_123', 'report%20final.pdf'])
    ).toEqual({
      ownerSegment: 'user_123',
      objectKey: 'user_123/report final.pdf',
      protectedUrl: '/api/files/user_123/report%20final.pdf',
    });
  });

  it('rejects unsafe paths, including encoded traversal attempts', () => {
    expect(decodeProtectedStoragePath(['..', 'file.txt'])).toBeNull();
    expect(decodeProtectedStoragePath(['user_123', '%2E%2E'])).toBeNull();
    expect(decodeProtectedStoragePath(['user_123', '%2Fetc%2Fpasswd'])).toBeNull();
    expect(decodeProtectedStoragePath(['user/123', 'file.txt'])).toBeNull();
    expect(decodeProtectedStoragePath(['only-owner'])).toBeNull();
  });
});
