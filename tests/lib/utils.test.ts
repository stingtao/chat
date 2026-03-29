import { describe, expect, it } from 'vitest';
import {
  appendReadByUser,
  buildConversationKey,
  normalizeHexColor,
  parseConversationNotificationData,
  parseReadBy,
  sanitizeFileExtension,
  sanitizeStoragePathSegment,
  validatePassword,
} from '../../lib/utils';

describe('lib/utils', () => {
  it('sanitizes storage segments and file extensions', () => {
    expect(sanitizeStoragePathSegment('user:123/../../x')).toBe('user123x');
    expect(sanitizeStoragePathSegment('')).toBe('file');
    expect(sanitizeFileExtension('photo.PNG')).toBe('png');
    expect(sanitizeFileExtension('no-extension', 'image/webp')).toBe('webp');
    expect(sanitizeFileExtension('bad.$$$$', 'application/pdf')).toBe('pdf');
  });

  it('parses notification payloads and conversation keys', () => {
    expect(buildConversationKey('group', 'group_1')).toBe('group:group_1');
    expect(
      parseConversationNotificationData(
        JSON.stringify({
          conversationType: 'direct',
          conversationId: 'user_123',
        })
      )
    ).toEqual({
      conversationType: 'direct',
      conversationId: 'user_123',
    });
    expect(parseConversationNotificationData('{"bad":true}')).toBeNull();
  });

  it('parses and appends read receipts safely', () => {
    expect(parseReadBy('["user_1"]')).toEqual(['user_1']);
    expect(parseReadBy('not-json')).toEqual([]);
    expect(appendReadByUser('["user_1"]', 'user_2')).toEqual(['user_1', 'user_2']);
    expect(appendReadByUser('["user_1"]', 'user_1')).toEqual(['user_1']);
  });

  it('validates passwords and normalizes hex colors', () => {
    expect(validatePassword('short')).toEqual({
      valid: false,
      error: 'Password must be at least 8 characters',
    });
    expect(validatePassword('StrongPass123')).toEqual({ valid: true });
    expect(normalizeHexColor('#abc', '#000000')).toBe('#aabbcc');
    expect(normalizeHexColor('123456', '#000000')).toBe('#123456');
    expect(normalizeHexColor('bad-color', '#112233')).toBe('#112233');
  });
});
