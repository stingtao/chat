import { type ClassValue, clsx } from "clsx";
import type { Message } from './types';

const DEFAULT_RANDOM_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const UPPERCASE_RANDOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const STORAGE_EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
};

export type ConversationType = 'direct' | 'group';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function generateRandomString(
  length: number,
  alphabet: string = DEFAULT_RANDOM_ALPHABET
): string {
  const safeLength = Math.max(1, length);
  const bytes = new Uint8Array(safeLength);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

export function generateUppercaseCode(length: number): string {
  return generateRandomString(length, UPPERCASE_RANDOM_ALPHABET);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function normalizeLineBreaks(value: string): string {
  return value.replace(/\r\n?/g, '\n');
}

export function normalizeTextInput(
  value: unknown,
  options: { multiline?: boolean; maxLength?: number } = {}
): string {
  if (typeof value !== 'string') return '';

  const normalized = options.multiline
    ? normalizeLineBreaks(value).trim()
    : value.trim().replace(/\s+/g, ' ');

  if (!options.maxLength) {
    return normalized;
  }

  return normalized.slice(0, options.maxLength);
}

export function sanitizeStoragePathSegment(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned || 'file';
}

export function sanitizeFileExtension(fileName: string, mimeType?: string): string {
  const extension = fileName.includes('.') ? fileName.split('.').pop() ?? '' : '';
  const normalized = extension.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (normalized && normalized.length <= 10) {
    return normalized;
  }

  return STORAGE_EXTENSION_BY_MIME[mimeType || ''] || 'bin';
}

export function toDate(value: Date | string | undefined | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function compareMessagesByCreatedAt(a: Message, b: Message): number {
  const aTime = toDate(a.createdAt)?.getTime() ?? 0;
  const bTime = toDate(b.createdAt)?.getTime() ?? 0;

  if (aTime !== bTime) {
    return aTime - bTime;
  }

  return a.id.localeCompare(b.id);
}

export function mergeMessagesById(
  existing: Message[],
  incoming: Message[] | Message
): Message[] {
  const nextMessages = Array.isArray(incoming) ? incoming : [incoming];
  const messageMap = new Map(existing.map((message) => [message.id, message]));

  for (const message of nextMessages) {
    messageMap.set(message.id, message);
  }

  return Array.from(messageMap.values()).sort(compareMessagesByCreatedAt);
}

export function buildConversationKey(type: ConversationType, id: string): string {
  return `${type}:${id}`;
}

export function parseConversationNotificationData(
  raw: string | Record<string, unknown> | null | undefined
): { conversationId?: string; conversationType?: ConversationType } | null {
  if (!raw) return null;

  const data =
    typeof raw === 'string'
      ? (() => {
          try {
            return JSON.parse(raw) as Record<string, unknown>;
          } catch {
            return null;
          }
        })()
      : raw;

  if (!data) return null;

  const conversationId =
    typeof data.conversationId === 'string' ? data.conversationId : undefined;
  const conversationType =
    data.conversationType === 'direct' || data.conversationType === 'group'
      ? data.conversationType
      : undefined;

  if (!conversationId || !conversationType) {
    return null;
  }

  return { conversationId, conversationType };
}

export function parseReadBy(
  raw: string[] | string | null | undefined
): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((value): value is string => typeof value === 'string');
  }

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
}

export function appendReadByUser(
  raw: string[] | string | null | undefined,
  userId: string
): string[] {
  const readBy = parseReadBy(raw);
  if (readBy.includes(userId)) {
    return readBy;
  }

  return [...readBy, userId];
}

export function serializeReadBy(raw: string[] | string | null | undefined): string {
  return JSON.stringify(parseReadBy(raw));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return d.toLocaleDateString();
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  return { valid: true };
}

export function isUserOnline(lastSeenAt: Date | string | null | undefined): boolean {
  if (!lastSeenAt) return false;

  const lastSeen = typeof lastSeenAt === 'string' ? new Date(lastSeenAt) : lastSeenAt;
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMinutes = diffMs / (1000 * 60);

  // Consider user online if they were active in the last 2 minutes
  return diffMinutes < 2;
}

export function normalizeHexColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback;

  let hex = value.trim();
  if (!hex.startsWith('#')) {
    hex = `#${hex}`;
  }

  const shortMatch = /^#([0-9a-fA-F]{3})$/;
  if (shortMatch.test(hex)) {
    const [, short] = hex.match(shortMatch) || [];
    if (short) {
      hex = `#${short[0]}${short[0]}${short[1]}${short[1]}${short[2]}${short[2]}`;
    }
  }

  if (!/^#([0-9a-fA-F]{6})$/.test(hex)) {
    return fallback;
  }

  return hex.toLowerCase();
}

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = normalizeHexColor(hex, '#000000');
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  const safeAlpha = Math.min(Math.max(alpha, 0), 1);

  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}

export function getContrastColor(hex: string): string {
  const normalized = normalizeHexColor(hex, '#000000');
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111827' : '#ffffff';
}
