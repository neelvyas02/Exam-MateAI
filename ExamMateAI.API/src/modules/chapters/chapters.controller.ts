import { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../common/ApiResponse.js';
import { BadRequestError } from '../../common/errors.js';
import { chapterService } from './chapters.service.js';

export class ChaptersController {
  public async getChapters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subjectId = req.query.subjectId as string;
      if (!subjectId) {
        throw new BadRequestError('Query parameter subjectId is required.');
      }
      const chapters = await chapterService.getChaptersBySubject(subjectId);
      res.status(200).json(ApiResponseHelper.success(chapters, 'Chapters retrieved successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async getChapterById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chapter = await chapterService.getChapterById(String(req.params.id));
      res.status(200).json(ApiResponseHelper.success(chapter, 'Chapter retrieved successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async createChapter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chapter = await chapterService.createChapter(req.body);
      res.status(201).json(ApiResponseHelper.success(chapter, 'Chapter created successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async updateChapter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chapter = await chapterService.updateChapter(String(req.params.id), req.body);
      res.status(200).json(ApiResponseHelper.success(chapter, 'Chapter updated successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async deleteChapter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await chapterService.deleteChapter(String(req.params.id));
      res.status(200).json(ApiResponseHelper.success(null, 'Chapter deleted successfully.'));
    } catch (err) {
      next(err);
    }
  }
}

export const chaptersController = new ChaptersController();
