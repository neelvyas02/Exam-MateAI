import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import { validate } from '../../middleware/validate.js';
import { authController } from './auth.controller.js';
import {
  changePasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  updateProfileSchema,
} from './auth.validation.js';

export const authRoutes = Router();

authRoutes.post('/register', authLimiter, validate(registerSchema), authController.register);
authRoutes.post('/login', authLimiter, validate(loginSchema), authController.login);
authRoutes.post('/logout', authenticate, authController.logout);
authRoutes.post('/refresh-token', authLimiter, validate(refreshTokenSchema), authController.refreshToken);
authRoutes.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
authRoutes.get('/me', authenticate, authController.getMe);
authRoutes.put('/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);
authRoutes.put('/update-profile', authenticate, validate(updateProfileSchema), authController.updateProfile);
