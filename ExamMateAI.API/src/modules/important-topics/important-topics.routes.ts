import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.js';
import { importantTopicsController } from './important-topics.controller.js';

export const importantTopicsRoutes = Router();

importantTopicsRoutes.get('/', optionalAuthenticate, importantTopicsController.getTopics);
importantTopicsRoutes.get('/subject/:subjectId', optionalAuthenticate, importantTopicsController.getTopics);

