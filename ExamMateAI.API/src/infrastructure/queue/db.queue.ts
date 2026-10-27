import { prisma } from '../database/prisma.js';
import { logger } from '../logging/logger.js';
import { DocumentProcessingJobData, IJobQueue } from './queue.interface.js';

export class DatabaseDocumentQueue implements IJobQueue {
  public async addDocumentJob(data: DocumentProcessingJobData): Promise<string> {
    // Check if an active job already exists to maintain idempotency
    const existing = await prisma.jobQueue.findFirst({
      where: {
        type: 'PROCESS_DOCUMENT',
        status: { in: ['pending', 'processing'] },
        payload: { contains: data.documentId },
      },
    });

    if (existing) {
      logger.info({ jobId: existing.id, documentId: data.documentId }, '[DB Queue] Existing active job found.');
      return existing.id;
    }

    const job = await prisma.jobQueue.create({
      data: {
        type: 'PROCESS_DOCUMENT',
        payload: JSON.stringify(data),
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
      },
    });

    logger.info({ jobId: job.id, documentId: data.documentId }, '[DB Queue] Document processing job persisted in PostgreSQL.');
    return job.id;
  }

  public async close(): Promise<void> {
    // Nothing required for database queue disconnect
  }
}
