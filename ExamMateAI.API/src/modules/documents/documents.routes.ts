import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { uploadLimiter } from '../../middleware/rateLimiter.js';
import { uploadMiddleware, validatePdfSignature } from '../../middleware/upload.js';
import { documentsController } from './documents.controller.js';

export const documentsRoutes = Router();

documentsRoutes.post(
  '/upload-pdf',
  authenticate,
  uploadLimiter,
  uploadMiddleware.single('file'),
  validatePdfSignature,
  documentsController.uploadMaterial
);

documentsRoutes.post(
  '/upload-material',
  authenticate,
  uploadLimiter,
  uploadMiddleware.single('file'),
  validatePdfSignature,
  documentsController.uploadMaterial
);

documentsRoutes.post(
  '/upload',
  authenticate,
  uploadLimiter,
  uploadMiddleware.single('file'),
  validatePdfSignature,
  documentsController.uploadMaterial
);

documentsRoutes.post(
  '/upload-previous-paper',
  authenticate,
  uploadLimiter,
  uploadMiddleware.single('file'),
  validatePdfSignature,
  documentsController.uploadPreviousPaper
);

documentsRoutes.get('/user-documents', authenticate, documentsController.getUserDocuments);
documentsRoutes.get('/previous-papers', authenticate, documentsController.getPreviousPapers);
documentsRoutes.get('/:id/status', authenticate, documentsController.getDocumentStatus);
documentsRoutes.get('/view/:id', authenticate, documentsController.viewDocument);
documentsRoutes.get('/download/:id', authenticate, documentsController.downloadDocument);
documentsRoutes.get('/:id/download', authenticate, documentsController.downloadDocument);
documentsRoutes.get('/:id', authenticate, documentsController.getDocumentById);
documentsRoutes.get('/', authenticate, documentsController.getUserDocuments);
documentsRoutes.delete('/:id', authenticate, documentsController.deleteDocument);
