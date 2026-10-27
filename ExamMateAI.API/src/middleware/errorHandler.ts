import { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { ApiResponseHelper } from '../common/ApiResponse.js';
import { AppError } from '../common/errors.js';
import { config } from '../config/index.js';
import { logger } from '../infrastructure/logging/logger.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  let statusCode = 500;
  let message = 'An unexpected internal server error occurred.';
  let errors: string[] = [];

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    errors = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
  } else if (err instanceof MulterError) {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = `Uploaded file exceeds the maximum allowed size of ${config.processing.maxUploadSizeMb} MB.`;
    } else {
      message = `Upload error: ${err.message}`;
    }
    errors = [message];
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token.';
    errors = [message];
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired.';
    errors = [message];
  } else if (err.code === 'P2002') {
    // Prisma unique constraint violation
    statusCode = 409;
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
    message = `A record with this ${target} already exists.`;
    errors = [message];
  } else if (err.code === 'P2025') {
    // Prisma not found
    statusCode = 404;
    message = 'The requested resource was not found.';
    errors = [message];
  } else {
    // Unexpected error
    logger.error({ err, path: req.path, method: req.method }, '[Unhandled Error]');
    if (config.nodeEnv !== 'production') {
      message = err.message || message;
      errors = [err.stack || err.message];
    }
  }

  res.status(statusCode).json(ApiResponseHelper.failure(message, errors));
}
