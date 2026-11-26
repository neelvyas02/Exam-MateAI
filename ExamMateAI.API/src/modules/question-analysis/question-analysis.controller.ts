import { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../common/ApiResponse.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { questionAnalysisService } from './question-analysis.service.js';

async function resolveUserId(req: Request): Promise<string> {
  if (req.user?.id) return req.user.id;
  const student = await prisma.user.findFirst({ where: { role: 'Student' } });
  if (student) return student.id;
  const firstUser = await prisma.user.findFirst();
  return firstUser ? firstUser.id : 'demo-student';
}

export class QuestionAnalysisController {
  public async analyze(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { previousPaperIds, paperIds, subjectId } = req.body;
      const ids = previousPaperIds || paperIds || [];
      const userId = await resolveUserId(req);
      const result = await questionAnalysisService.analyzePreviousPapers(userId, ids, subjectId);
      res.status(200).json(ApiResponseHelper.success(result, 'Question paper analysis performed successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async getLatest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = await resolveUserId(req);
      const subjectId = req.query.subjectId as string | undefined;
      const result = await questionAnalysisService.getLatestAnalysis(userId, subjectId);
      res.status(200).json(ApiResponseHelper.success(result, 'Latest question paper analysis retrieved.'));
    } catch (err) {
      next(err);
    }
  }

  public async getByDocumentId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await questionAnalysisService.getAnalysisByDocumentId(String(req.params.documentId));
      res.status(200).json(ApiResponseHelper.success(result, 'Question paper analysis retrieved successfully.'));
    } catch (err) {
      next(err);
    }
  }
}

export const questionAnalysisController = new QuestionAnalysisController();

