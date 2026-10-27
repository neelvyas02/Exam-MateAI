import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { chaptersController } from './chapters.controller.js';

const createChapterSchema = z.object({
  body: z.object({
    subjectId: z.string().min(1, 'subjectId is required'),
    number: z.string().min(1, 'Chapter number is required'),
    name: z.string().min(1, 'Chapter name is required'),
    description: z.string().optional(),
  }),
});

const updateChapterSchema = z.object({
  body: z.object({
    number: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const chaptersRoutes = Router();

chaptersRoutes.get('/', authenticate, chaptersController.getChapters);
chaptersRoutes.get('/:id', authenticate, chaptersController.getChapterById);
chaptersRoutes.post('/', authenticate, validate(createChapterSchema), chaptersController.createChapter);
chaptersRoutes.put('/:id', authenticate, validate(updateChapterSchema), chaptersController.updateChapter);
chaptersRoutes.delete('/:id', authenticate, chaptersController.deleteChapter);
