import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';

let prisma: PrismaClient;

// For development (local SQLite)
if (process.env.NODE_ENV !== 'production') {
  const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
  };

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  prisma = globalForPrisma.prisma;
} else {
  // For production (Cloudflare D1)
  // This will be initialized per-request with the D1 binding
  prisma = new PrismaClient();
}

export function getPrismaClient(d1?: D1Database): PrismaClient {
  if (d1) {
    const adapter = new PrismaD1(d1);
    return new PrismaClient({ adapter });
  }
  return prisma;
}

export default prisma;
