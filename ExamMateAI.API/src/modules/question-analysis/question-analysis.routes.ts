import { Router } from 'express';
import { z } from 'zod';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.js';
import { aiLimiter } from '../../middleware/rateLimiter.js';
import { validate } from '../../middleware/validate.js';
import { questionAnalysisController } from './question-analysis.controller.js';

const analysisSchema = z.object({
  body: z.object({
    previousPaperIds: z.array(z.string()).optional(),
    paperIds: z.array(z.string()).optional(),
    subjectId: z.string().optional(),
  }).refine((data) => (data.previousPaperIds && data.previousPaperIds.length > 0) || (data.paperIds && data.paperIds.length > 0), {
    message: 'At least one paper ID must be provided in previousPaperIds or paperIds',
  }),
});

export const questionAnalysisRoutes = Router();

questionAnalysisRoutes.post('/', optionalAuthenticate, aiLimiter, validate(analysisSchema), questionAnalysisController.analyze);
questionAnalysisRoutes.post('/analyze', optionalAuthenticate, aiLimiter, validate(analysisSchema), questionAnalysisController.analyze);
questionAnalysisRoutes.get('/latest', optionalAuthenticate, questionAnalysisController.getLatest);
questionAnalysisRoutes.get('/document/:documentId', optionalAuthenticate, questionAnalysisController.getByDocumentId);


