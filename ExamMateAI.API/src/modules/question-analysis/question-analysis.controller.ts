import { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../common/ApiResponse.js';
import { questionAnalysisService } from './question-analysis.service.js';

export class QuestionAnalysisController {
  public async analyze(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { previousPaperIds } = req.body;
      const result = await questionAnalysisService.analyzePreviousPapers(req.user!.id, previousPaperIds);
      res.status(200).json(ApiResponseHelper.success(result, 'Question paper analysis performed successfully.'));
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
