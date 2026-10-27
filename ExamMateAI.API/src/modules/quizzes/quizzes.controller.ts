import { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../common/ApiResponse.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { quizService } from './quizzes.service.js';

async function resolveUserId(req: Request): Promise<string> {
  if (req.user?.id) return req.user.id;
  const student = await prisma.user.findFirst({ where: { role: 'Student' } });
  if (student) return student.id;
  const firstUser = await prisma.user.findFirst();
  return firstUser ? firstUser.id : 'demo-student';
}

export class QuizController {
  public async generateQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = await resolveUserId(req);
      const quiz = await quizService.generateQuiz(userId, req.body);
      res.status(200).json(ApiResponseHelper.success(quiz, 'Quiz generated successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async getQuizById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = await resolveUserId(req);
      const quiz = await quizService.getQuizById(String(req.params.id), userId);
      res.status(200).json(ApiResponseHelper.success(quiz, 'Quiz retrieved successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async submitQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = await resolveUserId(req);
      const result = await quizService.submitQuiz(userId, req.body);
      res.status(200).json(ApiResponseHelper.success(result, 'Quiz submitted and scored successfully.'));
    } catch (err) {
      next(err);
    }
  }
}

export const quizController = new QuizController();
