import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
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
