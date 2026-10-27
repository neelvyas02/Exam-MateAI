import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../../config/index.js';
import { logger } from '../logging/logger.js';
import { DocumentProcessingJobData, IJobQueue } from './queue.interface.js';

export class BullMQDocumentQueue implements IJobQueue {
  private queue: Queue | null = null;
  private redisConnection: Redis | null = null;
  private isAvailable: boolean = false;

  constructor() {
    try {
      this.redisConnection = new Redis(config.redis.url, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times) => {
          if (times > 3) {
            // Stop aggressive retries if Redis is not running
            return null;
          }
          return Math.min(times * 500, 2000);
        },
      });

      this.redisConnection.on('connect', () => {
        this.isAvailable = true;
        logger.info('[BullMQ] Redis connection established for document processing queue.');
      });

      this.redisConnection.on('error', (err) => {
        this.isAvailable = false;
        logger.warn({ error: err.message }, '[BullMQ] Redis unavailable, fallback queue will be utilized.');
      });

      this.queue = new Queue('document-processing', {
        connection: this.redisConnection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      });
    } catch (err: any) {
      logger.warn({ error: err.message }, '[BullMQ] Failed to initialize BullMQ queue.');
      this.isAvailable = false;
    }
  }

  public get ready(): boolean {
    return this.isAvailable && this.queue !== null;
  }

  public async addDocumentJob(data: DocumentProcessingJobData): Promise<string> {
    if (!this.ready || !this.queue) {
      throw new Error('BullMQ is not connected to Redis');
    }

    const job = await this.queue.add('process-document', data, {
      jobId: `doc-${data.documentId}`, // Prevent duplicate jobs for same document
    });

    logger.info({ jobId: job.id, documentId: data.documentId }, '[BullMQ] Document processing job queued.');
    return String(job.id);
  }

  public async close(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
    if (this.redisConnection) {
      this.redisConnection.disconnect();
    }
  }
}
