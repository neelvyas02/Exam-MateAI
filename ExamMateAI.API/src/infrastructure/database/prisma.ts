import { PrismaClient } from '@prisma/client';
import { config } from '../../config/index.js';
import { logger } from '../logging/logger.js';

declare global {
  // eslint-disable-next-line no-var
  var prismaClientGlobal: PrismaClient | undefined;
}

// Mask sensitive credentials for safe logging
const getMaskedDbHost = (url: string): string => {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.username}:***@${parsed.host}${parsed.pathname}`;
  } catch {
    return 'configured DATABASE_URL';
  }
};

export const prisma =
  global.prismaClientGlobal ||
  new PrismaClient({
    datasources: {
      db: {
        url: config.databaseUrl,
      },
    },
    log: [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

prisma.$on('error' as never, (e: any) => {
  logger.error({ err: e }, '[Prisma Database Error]');
});

prisma.$on('warn' as never, (e: any) => {
  logger.warn({ warning: e }, '[Prisma Database Warning]');
});

if (process.env.NODE_ENV !== 'production') {
  global.prismaClientGlobal = prisma;
}

export async function testDatabaseConnection(): Promise<boolean> {
  const target = getMaskedDbHost(config.databaseUrl);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      logger.info(`[Database] Successfully connected to PostgreSQL database at ${target}`);
      return true;
    } catch (err: any) {
      if (attempt === 3) {
        logger.warn({ error: err.message, target }, '[Database Warning] PostgreSQL connection check failed. Ensure DATABASE_URL is reachable.');
        return false;
      }
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
  return false;
}
