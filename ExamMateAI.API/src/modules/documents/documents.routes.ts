import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.js';
import { uploadLimiter } from '../../middleware/rateLimiter.js';
import { uploadMiddleware, validatePdfSignature } from '../../middleware/upload.js';
import { documentsController } from './documents.controller.js';

export const documentsRoutes = Router();

documentsRoutes.post(
  '/upload-pdf',
  optionalAuthenticate,
  uploadLimiter,
  uploadMiddleware.single('file'),
  validatePdfSignature,
  documentsController.uploadMaterial
);

documentsRoutes.post(
  '/upload-material',
  optionalAuthenticate,
  uploadLimiter,
  uploadMiddleware.single('file'),
  validatePdfSignature,
  documentsController.uploadMaterial
);

documentsRoutes.post(
  '/upload',
  optionalAuthenticate,
  uploadLimiter,
  uploadMiddleware.single('file'),
  validatePdfSignature,
  documentsController.uploadMaterial
);

documentsRoutes.post(
  '/upload-previous-paper',
  optionalAuthenticate,
  uploadLimiter,
  uploadMiddleware.single('file'),
  validatePdfSignature,
  documentsController.uploadPreviousPaper
);

documentsRoutes.get('/user-documents', optionalAuthenticate, documentsController.getUserDocuments);
documentsRoutes.get('/previous-papers', optionalAuthenticate, documentsController.getPreviousPapers);
documentsRoutes.get('/:id/status', optionalAuthenticate, documentsController.getDocumentStatus);
documentsRoutes.get('/view/:id', optionalAuthenticate, documentsController.viewDocument);
documentsRoutes.get('/download/:id', optionalAuthenticate, documentsController.downloadDocument);
documentsRoutes.get('/:id/download', optionalAuthenticate, documentsController.downloadDocument);
documentsRoutes.get('/:id', optionalAuthenticate, documentsController.getDocumentById);
documentsRoutes.get('/', optionalAuthenticate, documentsController.getUserDocuments);
documentsRoutes.delete('/:id', authenticate, documentsController.deleteDocument);
