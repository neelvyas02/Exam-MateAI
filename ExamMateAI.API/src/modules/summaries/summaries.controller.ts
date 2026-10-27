import { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../common/ApiResponse.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { summaryService } from './summaries.service.js';

async function resolveUserId(req: Request): Promise<string> {
  if (req.user?.id) return req.user.id;
  const student = await prisma.user.findFirst({ where: { role: 'Student' } });
  if (student) return student.id;
  const firstUser = await prisma.user.findFirst();
  return firstUser ? firstUser.id : 'demo-student';
}

export class SummaryController {
  public async summarizeDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { documentId, summaryType } = req.body;
      const userId = await resolveUserId(req);
      const result = await summaryService.summarizeDocument(userId, documentId, summaryType);
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
