import type { PrismaClient as NodePrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import type { D1Database } from '@cloudflare/workers-types';
import { getCloudflareEnv } from './cloudflare';

type PrismaClient = NodePrismaClient;

const isEdgeRuntime = typeof process !== 'undefined' && process.env.NEXT_RUNTIME === 'edge';

async function getPrismaConstructor() {
  const module = await import('@prisma/client');
  return module.PrismaClient;
}

async function getNodePrisma(): Promise<NodePrismaClient> {
  const globalForPrisma = globalThis as unknown as {
    prismaPromise: Promise<NodePrismaClient> | undefined;
  };

  if (!globalForPrisma.prismaPromise) {
    globalForPrisma.prismaPromise = getPrismaConstructor().then((PrismaClient) => new PrismaClient());
  }

  return globalForPrisma.prismaPromise;
}

export async function getPrismaClient(d1?: D1Database): Promise<PrismaClient> {
  if (d1) {
    const adapter = new PrismaD1(d1);
    const PrismaClient = await getPrismaConstructor();
    return new PrismaClient({ adapter });
  }
  if (isEdgeRuntime) {
    throw new Error('D1 binding is required in edge runtime.');
  }

  return getNodePrisma();
}

export async function getPrismaClientFromContext(): Promise<PrismaClient> {
  const env = getCloudflareEnv();
  return getPrismaClient(env?.DB);
}
