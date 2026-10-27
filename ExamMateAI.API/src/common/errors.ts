export class AppError extends Error {
  public statusCode: number;
  public errors: string[];
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, errors: string[] = []) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errors = errors.length > 0 ? errors : [message];
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', errors: string[] = []) {
    super(message, 400, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access.') {
    super(message, 401, [message]);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden: You do not have permission to access this resource.') {
    super(message, 403, [message]);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Requested resource not found.') {
    super(message, 404, [message]);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict: Resource already exists.') {
    super(message, 409, [message]);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message: string = 'Validation failed', errors: string[] = []) {
    super(message, 422, errors);
  }
}
