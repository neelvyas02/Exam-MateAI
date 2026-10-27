import { NextFunction, Request, Response } from 'express';
import { ApiResponseHelper } from '../../common/ApiResponse.js';
import { BadRequestError } from '../../common/errors.js';
import { documentsService } from './documents.service.js';

export class DocumentsController {
  public async uploadMaterial(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new BadRequestError('PDF file is required.');
      }
      const userId = req.user!.id;
      const { subjectId, chapterId, documentType } = req.body;

      const doc = await documentsService.uploadDocument(userId, req.file, {
        subjectId,
        chapterId,
        documentType: documentType || 'StudyMaterial',
      });

      res
        .status(200)
        .json(
          ApiResponseHelper.success(
            doc,
            'Study material uploaded successfully and enqueued for AI background processing.'
          )
        );
    } catch (err) {
      next(err);
    }
  }

  public async uploadPreviousPaper(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new BadRequestError('PDF file is required.');
      }
      const userId = req.user!.id;
      const { subjectId, chapterId } = req.body;

      const doc = await documentsService.uploadDocument(userId, req.file, {
        subjectId,
        chapterId,
        documentType: 'PreviousPaper',
      });

      res
        .status(200)
        .json(
          ApiResponseHelper.success(
            doc,
            'Previous question paper uploaded successfully and enqueued for AI processing.'
          )
        );
    } catch (err) {
      next(err);
    }
  }

  public async getUserDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const docs = await documentsService.getUserDocuments(req.user!.id);
      res.status(200).json(ApiResponseHelper.success(docs, 'User documents retrieved successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async getPreviousPapers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subjectId = req.query.subjectId as string | undefined;
      const docs = await documentsService.getPreviousPapers(subjectId);
      res.status(200).json(ApiResponseHelper.success(docs, 'Previous papers retrieved successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async getDocumentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doc = await documentsService.getDocumentById(String(req.params.id), req.user?.id);
      res.status(200).json(ApiResponseHelper.success(doc, 'Document details retrieved successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async getDocumentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await documentsService.getDocumentStatus(String(req.params.id));
      res.status(200).json(ApiResponseHelper.success(status, 'Document status retrieved successfully.'));
    } catch (err) {
      next(err);
    }
  }

  public async viewDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const isAdmin = req.user?.role === 'Admin';
      const fileData = await documentsService.getDocumentStream(String(req.params.id), userId, isAdmin);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileData.filename)}"`);
      res.send(fileData.buffer);
    } catch (err) {
      next(err);
    }
  }

  public async downloadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const isAdmin = req.user?.role === 'Admin';
      const fileData = await documentsService.getDocumentStream(String(req.params.id), userId, isAdmin);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileData.filename)}"`);
      res.send(fileData.buffer);
    } catch (err) {
      next(err);
    }
  }

  public async deleteDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const isAdmin = req.user?.role === 'Admin';
      await documentsService.deleteDocument(String(req.params.id), userId, isAdmin);
      res.status(200).json(ApiResponseHelper.success(null, 'Document deleted successfully.'));
    } catch (err) {
      next(err);
    }
  }
}

export const documentsController = new DocumentsController();
