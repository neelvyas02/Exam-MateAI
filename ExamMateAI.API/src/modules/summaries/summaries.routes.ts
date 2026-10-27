import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { aiLimiter } from '../../middleware/rateLimiter.js';
import { validate } from '../../middleware/validate.js';
import { summaryController } from './summaries.controller.js';

const summarizeSchema = z.object({
  body: z.object({
    documentId: z.string().min(1, 'documentId is required'),
    summaryType: z.union([z.number(), z.string()]).optional().default(0),
  }),
});

export const summaryRoutes = Router();

summaryRoutes.post('/', authenticate, aiLimiter, validate(summarizeSchema), summaryController.summarizeDocument);
summaryRoutes.get('/document/:documentId', authenticate, summaryController.getDocumentSummaries);
