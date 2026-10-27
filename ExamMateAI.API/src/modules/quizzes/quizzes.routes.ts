import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { aiLimiter } from '../../middleware/rateLimiter.js';
import { validate } from '../../middleware/validate.js';
import { quizController } from './quizzes.controller.js';

const generateQuizSchema = z.object({
  body: z.object({
    subjectId: z.string().optional(),
    documentId: z.string().optional(),
    documentIds: z.array(z.string()).optional(),
    topic: z.string().optional(),
    difficulty: z.string().optional().default('Medium'),
    questionCount: z.number().int().min(1).max(20).optional().default(5),
  }),
});

const submitQuizSchema = z.object({
  body: z.object({
    quizId: z.string().min(1, 'quizId is required'),
    answers: z.array(
      z.object({
        questionId: z.string(),
        selectedOption: z.string(),
      })
    ),
  }),
});

export const quizRoutes = Router();

quizRoutes.post('/generate', authenticate, aiLimiter, validate(generateQuizSchema), quizController.generateQuiz);
quizRoutes.get('/:id', authenticate, quizController.getQuizById);
quizRoutes.post('/submit', authenticate, validate(submitQuizSchema), quizController.submitQuiz);
