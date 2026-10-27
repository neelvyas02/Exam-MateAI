import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../config/index.js';
import { prisma } from '../infrastructure/database/prisma.js';
import { logger } from '../infrastructure/logging/logger.js';
import { DocumentProcessingJobData } from '../infrastructure/queue/queue.interface.js';
import { documentProcessingService } from '../modules/document-processing/document-processing.service.js';

export class DocumentWorker {
  private bullWorker: Worker | null = null;
  private redisConnection: Redis | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private isProcessingDbQueue = false;

  public start(): void {
    logger.info('[Worker] Starting background document processing worker...');

    // 1. Try starting BullMQ worker
    try {
      this.redisConnection = new Redis(config.redis.url, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 500, 2000);
        },
      });

      this.redisConnection.on('connect', () => {
        logger.info('[Worker] Connected to Redis for BullMQ processing.');
      });

      this.bullWorker = new Worker(
        'document-processing',
        async (job) => {
          const data = job.data as DocumentProcessingJobData;
          logger.info({ jobId: job.id, documentId: data.documentId }, '[BullMQ Worker] Processing job');
          await documentProcessingService.processDocument(data.documentId);
        },
        {
          connection: this.redisConnection,
          concurrency: 3,
        }
      );

      this.bullWorker.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, error: err.message }, '[BullMQ Worker] Job failed');
      });

      this.bullWorker.on('completed', (job) => {
        logger.info({ jobId: job?.id }, '[BullMQ Worker] Job completed');
      });
    } catch (err: any) {
      logger.warn({ error: err.message }, '[Worker] BullMQ setup failed. Will rely on DB persistent queue.');
    }

    // 2. Start PostgreSQL Persistent Queue Processor (Runs every 3 seconds)
    this.pollInterval = setInterval(async () => {
      await this.processNextDbJob();
    }, 3000);
  }

  public async processNextDbJob(): Promise<void> {
    if (this.isProcessingDbQueue) return;
    this.isProcessingDbQueue = true;

    try {
      // Find oldest pending job
      const job = await prisma.jobQueue.findFirst({
        where: {
          type: 'PROCESS_DOCUMENT',
          status: 'pending',
          attempts: { lt: 3 },
        },
        orderBy: { scheduledAt: 'asc' },
      });

      if (!job) {
        this.isProcessingDbQueue = false;
        return;
      }

      // Mark as processing
      await prisma.jobQueue.update({
        where: { id: job.id },
        data: {
          status: 'processing',
          startedAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      try {
        const payload = JSON.parse(job.payload) as DocumentProcessingJobData;
        logger.info({ jobId: job.id, documentId: payload.documentId }, '[DB Queue Worker] Processing document job');

        await documentProcessingService.processDocument(payload.documentId);

        await prisma.jobQueue.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });
      } catch (err: any) {
        logger.error({ jobId: job.id, error: err.message }, '[DB Queue Worker] Error executing job');
        await prisma.jobQueue.update({
          where: { id: job.id },
          data: {
            status: job.attempts >= 2 ? 'failed' : 'pending',
            error: err.message,
          },
        });
      }
    } catch {
      // Database connection transient error handled silently
    } finally {
      this.isProcessingDbQueue = false;
    }
  }

  public async stop(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    if (this.bullWorker) {
      await this.bullWorker.close();
    }
    if (this.redisConnection) {
      this.redisConnection.disconnect();
    }
    logger.info('[Worker] Background worker stopped.');
  }
}

export const documentWorker = new DocumentWorker();

// Allow running standalone from CLI
if (process.argv[1] && process.argv[1].endsWith('document-worker.ts')) {
  documentWorker.start();
}
