import { NextFunction, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { BadRequestError } from '../common/errors.js';
import { config } from '../config/index.js';

const storage = multer.memoryStorage();

const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.md', '.markdown', '.csv', '.pptx', '.ppt'];

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const url = (req.originalUrl || req.url || '').toLowerCase();

  if (url.includes('upload-pdf') && ext !== '.pdf') {
    return cb(new BadRequestError('Invalid file type. Only PDF documents (.pdf) are supported.'));
  }

  if (!allowedExtensions.includes(ext)) {
    return cb(
      new BadRequestError(
        `Invalid file type '${ext}'. Supported formats: PDF, DOCX, TXT, Markdown, CSV, PPTX.`
      )
    );
  }

  cb(null, true);
};

const maxSizeBytes = config.processing.maxUploadSizeMb * 1024 * 1024;

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: maxSizeBytes,
    files: 1,
  },
  fileFilter,
});

export function validateDocumentSignature(req: Request, res: Response, next: NextFunction): void {
  if (!req.file) {
    return next(new BadRequestError('No document file provided in request.'));
  }

  const buffer = req.file.buffer;
  if (!buffer || buffer.length < 4) {
    return next(new BadRequestError('Corrupt or empty file upload.'));
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  const url = (req.originalUrl || req.url || '').toLowerCase();

  if (url.includes('upload-pdf') && ext !== '.pdf') {
    return next(new BadRequestError('Invalid file type. Only PDF documents (.pdf) are supported.'));
  }

  // Validate PDF magic bytes: "%PDF-"
  if (ext === '.pdf') {
    const header = buffer.subarray(0, 5).toString('ascii');
    if (!header.startsWith('%PDF-')) {
      return next(new BadRequestError('Invalid file format. File does not contain a valid PDF binary signature.'));
    }
  }

  // Validate DOCX / PPTX magic bytes: PK\x03\x04 (ZIP format)
  if (ext === '.docx' || ext === '.pptx') {
    const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b;
    if (!isZip) {
      return next(new BadRequestError(`Invalid file format for ${ext.toUpperCase()}. Missing valid archive container.`));
    }
  }

  next();
}

// Backward compatibility alias for existing tests
export const validatePdfSignature = validateDocumentSignature;
