import { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../common/ApiResponse.js';
import { subjectService } from './subjects.service.js';

export class SubjectsController {
  public async getSubjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subjects = await subjectService.getAllSubjects(req.user?.id);
      res.status(200).json(ApiResponseHelper.success(subjects, 'Subjects retrieved successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async getSubjectById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subject = await subjectService.getSubjectById(String(req.params.id));
      res.status(200).json(ApiResponseHelper.success(subject, 'Subject details retrieved successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async createSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const subject = await subjectService.createSubject(userId, req.body);
      res.status(201).json(ApiResponseHelper.success(subject, 'Subject created successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async updateSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const isAdmin = req.user?.role === 'Admin';
      const subject = await subjectService.updateSubject(String(req.params.id), userId, isAdmin, req.body);
      res.status(200).json(ApiResponseHelper.success(subject, 'Subject updated successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async deleteSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const isAdmin = req.user?.role === 'Admin';
      await subjectService.deleteSubject(String(req.params.id), userId, isAdmin);
      res.status(200).json(ApiResponseHelper.success(null, 'Subject deleted successfully.'));
    } catch (err) {
      next(err);
    }
  }
}

export const subjectsController = new SubjectsController();
