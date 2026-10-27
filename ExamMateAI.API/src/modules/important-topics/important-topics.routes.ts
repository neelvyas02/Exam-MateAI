import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { importantTopicsController } from './important-topics.controller.js';

export const importantTopicsRoutes = Router();

importantTopicsRoutes.get('/', authenticate, importantTopicsController.getTopics);
importantTopicsRoutes.get('/subject/:subjectId', authenticate, importantTopicsController.getTopics);
