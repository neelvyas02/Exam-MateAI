import { Router } from 'express';
import { z } from 'zod';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.js';
import { aiLimiter } from '../../middleware/rateLimiter.js';
import { validate } from '../../middleware/validate.js';
import { questionAnalysisController } from './question-analysis.controller.js';

const analysisSchema = z.object({
  body: z.object({
    previousPaperIds: z.array(z.string()).min(1, 'previousPaperIds array must contain at least 1 ID'),
  }),
});

export const questionAnalysisRoutes = Router();

questionAnalysisRoutes.post('/', optionalAuthenticate, aiLimiter, validate(analysisSchema), questionAnalysisController.analyze);
questionAnalysisRoutes.get('/document/:documentId', optionalAuthenticate, questionAnalysisController.getByDocumentId);

