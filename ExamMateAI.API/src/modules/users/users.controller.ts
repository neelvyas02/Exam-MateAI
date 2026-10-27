import { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../common/ApiResponse.js';
import { usersService } from './users.service.js';

export class UsersController {
  public async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.getUserById(String(req.params.id));
      res.status(200).json(ApiResponseHelper.success(user, 'User details retrieved successfully.'));
    } catch (err) {
      next(err);
    }
  }
}

export const usersController = new UsersController();
