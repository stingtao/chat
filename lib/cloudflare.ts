import { getRequestContext } from '@cloudflare/next-on-pages';
import type { D1Database, DurableObjectNamespace, R2Bucket } from '@cloudflare/workers-types';

export interface CloudflareEnv {
  DB: D1Database;
  STORAGE: R2Bucket;
  CHAT_ROOM: DurableObjectNamespace;
  R2_PUBLIC_BASE_URL?: string;
  ENVIRONMENT?: string;
  JWT_SECRET?: string;
}

export function getCloudflareEnv(): CloudflareEnv | undefined {
  try {
    return getRequestContext().env as CloudflareEnv;
  } catch {
    return undefined;
  }
}
