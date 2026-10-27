import http from 'http';
import { app } from './app.js';
import { config, validateAIConfiguration } from './config/index.js';
import { prisma, testDatabaseConnection } from './infrastructure/database/prisma.js';
import { logger } from './infrastructure/logging/logger.js';
import { jobQueue } from './infrastructure/queue/job-queue.js';
import { documentWorker } from './workers/document-worker.js';

const server = http.createServer(app);

async function startServer(): Promise<void> {
  try {
    // 0. Validate required AI configuration
    const aiValidation = validateAIConfiguration();
    if (!aiValidation.valid) {
      logger.warn(`[AI Configuration Warning] ${aiValidation.message}`);
    } else {
      logger.info(`[AI Configuration] Active AI Provider: ${config.ai.provider} (Model: ${config.ai.openaiModel}, Embedding: ${config.ai.openaiEmbeddingModel})`);
    }

    // 1. Verify database connection
    await testDatabaseConnection();

    // 2. Start background document processing worker
    documentWorker.start();

    // 3. Listen on configured port
    server.listen(config.port, () => {
      logger.info(`🚀 ExamMate AI API server listening on http://localhost:${config.port}`);
      logger.info(`📚 Swagger UI documentation available at http://localhost:${config.port}/api-docs`);
      logger.info(`🌐 API Base URL configured at http://localhost:${config.port}/api/v1`);
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to start ExamMate AI API server');
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`[Server] Received ${signal}. Initiating graceful shutdown...`);

  server.close(async () => {
    logger.info('[Server] HTTP server closed.');

    try {
      await documentWorker.stop();
      await jobQueue.close();
      await prisma.$disconnect();
      logger.info('[Server] Cleanup complete. Process exiting gracefully.');
      process.exit(0);
    } catch (err: any) {
      logger.error({ error: err.message }, '[Server] Error during shutdown cleanup');
      process.exit(1);
    }
  });

  // Force shutdown if cleanup hangs
  setTimeout(() => {
    logger.error('[Server] Forcefully shutting down after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
