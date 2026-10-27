import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { usersController } from './users.controller.js';

export const usersRoutes = Router();

usersRoutes.get('/:id', authenticate, usersController.getUserById);
