import { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../common/ApiResponse.js';
import { importantTopicsService } from './important-topics.service.js';

export class ImportantTopicsController {
  public async getTopics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subjectId = (req.query.subjectId as string) || (req.params.subjectId as string);
      const topics = await importantTopicsService.getTopicsBySubject(subjectId);
      res.status(200).json(ApiResponseHelper.success(topics, 'Important topics retrieved successfully.'));
    } catch (err) {
      next(err);
    }
  }
}

export const importantTopicsController = new ImportantTopicsController();
