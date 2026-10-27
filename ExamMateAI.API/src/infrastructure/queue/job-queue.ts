import { logger } from '../logging/logger.js';
import { BullMQDocumentQueue } from './bullmq.queue.js';
import { DatabaseDocumentQueue } from './db.queue.js';
import { DocumentProcessingJobData, IJobQueue } from './queue.interface.js';

export class HybridJobQueue implements IJobQueue {
  private bullMQ: BullMQDocumentQueue;
  private dbQueue: DatabaseDocumentQueue;

  constructor() {
    this.bullMQ = new BullMQDocumentQueue();
    this.dbQueue = new DatabaseDocumentQueue();
  }

  public async addDocumentJob(data: DocumentProcessingJobData): Promise<string> {
    if (this.bullMQ.ready) {
      try {
        return await this.bullMQ.addDocumentJob(data);
      } catch (err: any) {
        logger.warn({ error: err.message }, '[Job Queue] BullMQ push failed, falling back to PostgreSQL persistent queue.');
      }
    }

    return await this.dbQueue.addDocumentJob(data);
  }

  public async close(): Promise<void> {
    await this.bullMQ.close();
    await this.dbQueue.close();
  }
}

export const jobQueue = new HybridJobQueue();
