import { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../common/ApiResponse.js';
import { summaryService } from './summaries.service.js';

export class SummaryController {
  public async summarizeDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { documentId, summaryType } = req.body;
      const result = await summaryService.summarizeDocument(req.user!.id, documentId, summaryType);
      res.status(200).json(ApiResponseHelper.success(result, 'Document summary generated successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async getDocumentSummaries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summaries = await summaryService.getDocumentSummaries(String(req.params.documentId));
      res.status(200).json(ApiResponseHelper.success(summaries, 'Document summaries retrieved successfully.'));
    } catch (err) {
      next(err);
    }
  }
}

export const summaryController = new SummaryController();
