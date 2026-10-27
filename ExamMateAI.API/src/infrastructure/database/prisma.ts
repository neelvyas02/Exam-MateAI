import { PrismaClient } from '@prisma/client';
import { logger } from '../logging/logger.js';

declare global {
  // eslint-disable-next-line no-var
  var prismaClientGlobal: PrismaClient | undefined;
}

export const prisma =
  global.prismaClientGlobal ||
  new PrismaClient({
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
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('[Database] Successfully connected to PostgreSQL database.');
    return true;
  } catch (err: any) {
    logger.warn({ error: err.message }, '[Database Warning] PostgreSQL connection check failed. Ensure DATABASE_URL is reachable.');
    return false;
  }
}
