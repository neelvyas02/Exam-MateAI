import { Request, Response } from 'express';
import { ApiResponseHelper } from '../../common/ApiResponse.js';
import { config } from '../../config/index.js';
import { prisma, testDatabaseConnection } from '../../infrastructure/database/prisma.js';
import { storageService } from '../../infrastructure/supabase/storage.js';

export class HealthController {
  public async getHealthStatus(req: Request, res: Response): Promise<void> {
    let dbStatus = 'Disconnected';
    try {
      const isConnected = await testDatabaseConnection();
      dbStatus = isConnected ? 'Connected' : 'Degraded';
    } catch {
      dbStatus = 'Disconnected';
    }

    const storageStatus = storageService.getStatus();

    const healthData = {
      status: dbStatus === 'Connected' ? 'Healthy' : 'Degraded',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        provider: 'Supabase PostgreSQL (Prisma)',
      },
      supabaseStorage: {
        status: storageStatus.status,
        bucket: storageStatus.bucket,
        fallbackToLocal: storageStatus.fallbackToLocal,
      },
      aiProvider: {
        provider:
          config.ai.provider === 'openai'
            ? `OpenAI (${config.ai.openaiModel} / ${config.ai.openaiEmbeddingModel})`
            : `Google Gemini (${config.ai.geminiModel})`,
        status:
          config.ai.provider === 'openai'
            ? config.ai.openaiApiKey
              ? 'Operational'
              : 'Configured (Awaiting OPENAI_API_KEY)'
            : config.ai.geminiApiKey
            ? 'Operational'
            : 'Needs API Key',
      },
    };

    res.status(200).json(ApiResponseHelper.success(healthData, 'Health check performed successfully.'));
  }
}

export const healthController = new HealthController();
