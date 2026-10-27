import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { aiLimiter } from '../../middleware/rateLimiter.js';
import { validate } from '../../middleware/validate.js';
import { chatController } from './chat.controller.js';

const chatRequestSchema = z.object({
  body: z.object({
    question: z.string().min(1, 'Question is required'),
    documentId: z.string().nullable().optional(),
    documentIds: z.array(z.string()).optional(),
    conversationId: z.string().nullable().optional(),
    subjectId: z.string().nullable().optional(),
    chapterId: z.string().nullable().optional(),
  }),
});

export const chatRoutes = Router();

chatRoutes.post('/', authenticate, aiLimiter, validate(chatRequestSchema), chatController.askQuestion);
chatRoutes.post('/message', authenticate, aiLimiter, validate(chatRequestSchema), chatController.askQuestion);
chatRoutes.get('/history/:conversationId', authenticate, chatController.getHistory);

