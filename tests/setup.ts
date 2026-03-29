import { vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@cloudflare/next-on-pages', () => ({
  getRequestContext: () => {
    throw new Error('No Cloudflare request context in unit tests');
  },
}));
