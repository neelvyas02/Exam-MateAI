import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { ApiResponseHelper } from './common/ApiResponse.js';
import { NotFoundError } from './common/errors.js';
import { config } from './config/index.js';
import { logger } from './infrastructure/logging/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiV1Routes } from './routes/index.js';

export const app = express();

// Security and utility middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // For Swagger UI compatibility
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);
      if (
        config.corsOrigin.includes('*') ||
        config.corsOrigin.includes(origin) ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Dev-friendly permissive CORS
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Swagger OpenAPI documentation
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'ExamMate AI Web API',
    version: '1.0.0',
    description:
      'Intelligent Question Paper Analysis and Study Assistant Backend API (Node.js/Express/TypeScript)',
  },
  servers: [{ url: `http://localhost:${config.port}/api/v1`, description: 'Local Development Server' }],
  components: {
    securitySchemes: {
      Bearer: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token.',
      },
    },
  },
  security: [{ Bearer: [] }],
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/swagger/v1/swagger.json', (req: Request, res: Response) => {
  res.json(swaggerSpec);
});

// Request logging in development
if (config.nodeEnv !== 'test') {
  app.use((req, res, next) => {
    logger.debug({ method: req.method, url: req.url }, '[HTTP Request]');
    next();
  });
}

// Health check aliases
app.get('/', (req: Request, res: Response) => {
  res.json(
    ApiResponseHelper.success(
      { name: 'ExamMate AI Web API', status: 'Running', docs: '/api-docs' },
      'ExamMate AI API is online.'
    )
  );
});

// Mount /api/v1 routes
app.use('/api/v1', apiV1Routes);

// Catch-all 404 handler
app.use((req: Request, res: Response, next) => {
  next(new NotFoundError(`Resource not found for route: ${req.method} ${req.originalUrl}`));
});

// Global error handler
app.use(errorHandler);
