import { Router } from 'express';
import { optionalAuthenticate } from '../../middleware/auth.js';
import { searchLimiter } from '../../middleware/rateLimiter.js';
import { searchController } from './search.controller.js';

export const searchRoutes = Router();

searchRoutes.get('/', optionalAuthenticate, searchLimiter, searchController.search);
