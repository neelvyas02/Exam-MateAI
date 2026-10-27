import { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../common/ApiResponse.js';
import { quizService } from './quizzes.service.js';

export class QuizController {
  public async generateQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const quiz = await quizService.generateQuiz(req.user!.id, req.body);
      res.status(200).json(ApiResponseHelper.success(quiz, 'Quiz generated successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async getQuizById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const quiz = await quizService.getQuizById(String(req.params.id), req.user!.id);
      res.status(200).json(ApiResponseHelper.success(quiz, 'Quiz retrieved successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async submitQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await quizService.submitQuiz(req.user!.id, req.body);
      res.status(200).json(ApiResponseHelper.success(result, 'Quiz submitted and scored successfully.'));
    } catch (err) {
      next(err);
    }
  }
}

export const quizController = new QuizController();
