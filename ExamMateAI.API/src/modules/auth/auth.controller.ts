import { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../common/ApiResponse.js';
import { authService } from './auth.service.js';

export class AuthController {
  public async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);
      res.status(200).json(ApiResponseHelper.success(result, 'User registered successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      // Also optionally set HTTP-only cookie for secure browser environments
      res.cookie('exammate_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 2 * 60 * 60 * 1000,
      });

      res.status(200).json(ApiResponseHelper.success(result, 'User logged in successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        await authService.revokeToken(req.user.id);
      }
      res.clearCookie('exammate_token');
      res.status(200).json(ApiResponseHelper.success(null, 'Successfully logged out.'));
    } catch (err) {
      next(err);
    }
  }

  public async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.body.refreshToken || req.cookies?.exammate_refresh_token;
      const result = await authService.refreshToken(token);

      res.cookie('exammate_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 2 * 60 * 60 * 1000,
      });

      res.status(200).json(ApiResponseHelper.success(result, 'Token refreshed successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.changePassword(req.user!.id, req.body);
      res.status(200).json(ApiResponseHelper.success(null, 'Password changed successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getMe(req.user!.id);
      res.status(200).json(ApiResponseHelper.success(user, 'Current user fetched successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.updateProfile(req.user!.id, req.body);
      res.status(200).json(ApiResponseHelper.success(user, 'Profile updated successfully.'));
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
