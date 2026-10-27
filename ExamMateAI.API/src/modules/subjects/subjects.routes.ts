import { Router } from 'express';
import { z } from 'zod';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { subjectsController } from './subjects.controller.js';

const createSubjectSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Subject name is required'),
    semester: z.string().optional().default(''),
    description: z.string().optional(),
  }),
});

const updateSubjectSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Subject name is required'),
    semester: z.string().optional().default(''),
    description: z.string().optional(),
  }),
});

export const subjectsRoutes = Router();

subjectsRoutes.get('/', optionalAuthenticate, subjectsController.getSubjects);
subjectsRoutes.get('/:id', optionalAuthenticate, subjectsController.getSubjectById);
subjectsRoutes.post('/', authenticate, validate(createSubjectSchema), subjectsController.createSubject);
subjectsRoutes.put('/:id', authenticate, validate(updateSubjectSchema), subjectsController.updateSubject);
subjectsRoutes.delete('/:id', authenticate, subjectsController.deleteSubject);
