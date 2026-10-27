import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs for auth
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
    data: null,
    errors: ['Rate limit exceeded on authentication endpoint.'],
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 uploads per minute
  message: {
    success: false,
    message: 'Upload rate limit reached. Please wait before uploading more files.',
    data: null,
    errors: ['Rate limit exceeded on document upload.'],
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 AI requests per minute
  message: {
    success: false,
    message: 'AI query rate limit reached. Please wait a moment before sending another query.',
    data: null,
    errors: ['Rate limit exceeded on AI endpoint.'],
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 search queries per minute
  message: {
    success: false,
    message: 'Search rate limit reached.',
    data: null,
    errors: ['Rate limit exceeded on search endpoint.'],
  },
  standardHeaders: true,
  legacyHeaders: false,
});
