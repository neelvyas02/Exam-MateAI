# ExamMate AI — Backend API (Node.js, Express, TypeScript)

Intelligent Question Paper Analysis and Study Assistant Backend API, fully migrated from ASP.NET Core 8 to **Node.js, Express.js, and TypeScript**, integrated with **Prisma ORM**, **Supabase PostgreSQL**, **Supabase Storage**, **Google Gemini AI**, and a persistent background queue.

---

## 🌟 Key Features

- **TypeScript & Express.js Modular Architecture**: Organized by feature modules with thin controllers, strong business services, and typed data models.
- **Prisma ORM with Supabase PostgreSQL**: Full schema definition with migrations and database seeding for users, subjects, chapters, documents, chunks, chats, summaries, quizzes, analysis, and search history.
- **Supabase Storage Integration**: Secure PDF persistence in the private `study-materials` bucket with authenticated signed URLs and disk fallback for offline local development.
- **Multi-Stage Background Document Processing**:
  1. PDF text and metadata extraction with page-level boundary preservation.
  2. Overlapping chunk creation (configurable chunk size and overlap) tagging source citations.
  3. Grounded AI metadata extraction (topics, key concepts, descriptions, material type).
  4. Automatic generation of Short and Detailed grounded summaries.
  5. Previous Year Question (PYQ) paper analysis (recurring questions, repeated topics, high-weightage units, question frequency).
- **Persistent Background Job Queue**:
  - High-performance **BullMQ with Redis** for scalable production background jobs.
  - Automatic persistent fallback via PostgreSQL `JobQueue` table to guarantee zero job loss if Redis is not yet provisioned in development.
- **Enterprise Security**:
  - Passwords hashed using `bcrypt` (10 salt rounds).
  - Short-lived JWT access tokens with rotating refresh tokens (hashed with SHA-256 in the database).
  - Scope-based ownership checks preventing unauthorized document access.
  - Rate limiting on authentication, uploads, search, and AI queries.
  - Strict PDF magic signature validation (`%PDF-`) and MIME type checks.
  - Redaction of sensitive fields in structured Pino logging.
- **Interactive Documentation**: Swagger / OpenAPI UI at `/api-docs` and `/swagger/v1/swagger.json`.
- **Full Compatibility with Existing Frontend**: Directly implements the exact API routes, DTOs, and `ApiResponse<T>` envelope expected by the React + Vite frontend.

---

## 📁 Project Structure

```text
ExamMateAI.API/
├── src/
│   ├── app.ts                         # Express application setup & middleware pipeline
│   ├── server.ts                      # HTTP server entry point & graceful shutdown
│   ├── config/                        # Strongly typed environment configuration
│   ├── common/                        # Standard ApiResponse wrapper and AppError hierarchy
│   ├── middleware/                    # Auth, validation (Zod), rate limiters, upload, error handling
│   ├── infrastructure/
│   │   ├── database/                  # Prisma client & connection validation
│   │   ├── supabase/                  # Supabase Storage client (private bucket study-materials)
│   │   ├── queue/                     # BullMQ (Redis) + DB persistent job queue
│   │   ├── ai/                        # Google Gemini AI & OpenAI provider implementations
│   │   └── logging/                   # Structured Pino logger with secret redaction
│   ├── modules/
│   │   ├── auth/                      # Register, login, refresh-token, change-password, me, profile
│   │   ├── users/                     # User management
│   │   ├── subjects/                  # Student & Admin subject organization
│   │   ├── chapters/                  # Subject chapter management
│   │   ├── documents/                 # PDF upload, download, status, list, delete
│   │   ├── document-processing/       # PDF parsing, chunking with overlap, AI enrichment
│   │   ├── chat/                      # Grounded RAG multi-turn conversational study assistant
│   │   ├── summaries/                 # Short and Detailed AI summaries
│   │   ├── question-analysis/         # Previous year paper PYQ pattern analysis
│   │   ├── quizzes/                   # MCQ generation, scoring, and hidden-answer validation
│   │   ├── important-topics/          # High-weightage topics per subject
│   │   ├── search/                    # Keyword search across document chunks with preview
│   │   └── health/                    # Health check status endpoint matching frontend DTO
│   ├── workers/                       # Background document processing worker
│   └── routes/                        # Aggregated /api/v1 router
├── prisma/
│   ├── schema.prisma                  # PostgreSQL schema with relations & indexes
│   └── seed.ts                        # Seed script with default users & academic subjects
├── tests/                             # Automated tests with Vitest & Supertest
├── .env.example                       # Documented environment variables
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Runtime | Node.js LTS (v20+) |
| Framework | Express.js |
| Language | TypeScript 5.7+ |
| Database ORM | Prisma ORM 5.22+ |
| Primary Database | Supabase PostgreSQL |
| File Storage | Supabase Storage (`study-materials` bucket) |
| Queue / Background Jobs | BullMQ + Redis (with PostgreSQL fallback) |
| AI Providers | Google Gemini API (`gemini-1.5-flash`), OpenAI API |
| Authentication | JWT Access & Refresh Tokens, bcrypt |
| Validation | Zod |
| Documentation | Swagger UI & OpenAPI 3.0 |
| Logging | Pino & Pino Pretty |
| Testing | Vitest & Supertest |

---

## ⚙️ Environment Variables

Create a `.env` file in `ExamMateAI.API/` using `.env.example`:

| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | API server listen port | `5137` |
| `NODE_ENV` | Environment mode | `development` / `production` |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:5173,http://localhost:3000` |
| `DATABASE_URL` | Supabase PostgreSQL connection string | `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres` |
| `JWT_SECRET` | Secret key for signing JWTs | Minimum 256-bit secure secret |
| `JWT_EXPIRES_IN` | Access token lifespan | `2h` |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | Refresh token lifespan | `7` |
| `SUPABASE_URL` | Supabase project URL | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role secret key | `your-supabase-service-role-key` |
| `SUPABASE_BUCKET_NAME` | Storage bucket name | `study-materials` |
| `USE_LOCAL_STORAGE_FALLBACK` | Local filesystem fallback if offline | `true` |
| `AI_PROVIDER` | AI provider choice | `gemini` or `openai` |
| `GEMINI_API_KEY` | Google Gemini API key | `AQ.Ab8RN6...` |
| `GEMINI_MODEL` | Google Gemini model ID | `gemini-1.5-flash` |
| `REDIS_URL` | Redis URL for BullMQ | `redis://localhost:6379` |
| `CHUNK_SIZE` | Chunk size in characters | `1000` |
| `CHUNK_OVERLAP` | Overlap between chunks | `200` |
| `MAX_UPLOAD_SIZE_MB` | Maximum allowed upload size | `25` |

---

## 🚀 Quickstart Guide

### 1. Install Dependencies

```bash
cd ExamMateAI.API
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your Supabase connection strings and Gemini API key:

```bash
cp .env.example .env
```

### 3. Generate Prisma Client & Run Migrations

```bash
# Generate the Prisma TypeScript client
npm run prisma:generate

# Apply migrations to your Supabase PostgreSQL database
npm run prisma:migrate

# Seed default test users, subjects, and sample chapters
npm run prisma:seed
```

### 4. Run Development Server

```bash
npm run dev
```

The API will start at **`http://localhost:5137`**.
- API Base: `http://localhost:5137/api/v1`
- Swagger UI Docs: `http://localhost:5137/api-docs`
- Health check: `http://localhost:5137/api/v1/health`

### 5. Running the Background Worker

The server automatically starts the background worker in-process during development. For dedicated production worker containers, run:

```bash
npm run worker
```

---

## 🐘 Redis & Queue Configuration

The background worker utilizes **BullMQ** with Redis for distributing PDF processing jobs:

### Local Redis via Docker

```bash
docker run -d --name exammate-redis -p 6379:6379 redis:alpine
```

### Cloud Redis (Upstash)

Set `REDIS_URL` in your `.env`:
```env
REDIS_URL=rediss://default:[PASSWORD]@[ENDPOINT].upstash.io:6379
```

> **Zero-Loss Hybrid Queue Guarantee**: If Redis is temporarily unavailable or not yet provisioned in a local developer environment, the system automatically persists jobs in the PostgreSQL `JobQueue` table and processes them in order.

---

## 📡 API Endpoints Overview

All endpoints return the standard envelope:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "errors": []
}
```

### Authentication (`/api/v1/auth`)
- `POST /register`: Register a new user (`fullName`, `email`, `password`, `role`)
- `POST /login`: Authenticate and receive `accessToken` & `refreshToken`
- `POST /logout`: Revoke active refresh tokens
- `POST /refresh-token`: Rotate and issue new access & refresh tokens
- `POST /change-password`: Change password with verification
- `GET /me`: Get authenticated user profile
- `PUT /profile` & `PUT /update-profile`: Update full name and profile photo

### Subjects & Chapters (`/api/v1/subjects`, `/api/v1/chapters`)
- `GET /subjects`: List all subjects (with active document counts)
- `GET /subjects/:id`: Get subject details
- `POST /subjects`: Create a new subject (allowed for students & admins)
- `PUT /subjects/:id`: Update subject
- `DELETE /subjects/:id`: Delete subject
- `GET /chapters?subjectId=...`: List chapters for a subject
- `POST /chapters`: Create chapter under a subject

### Documents & Uploads (`/api/v1/documents`)
- `POST /upload-pdf` & `POST /upload-material`: Upload study material PDF (enqueues AI background processing)
- `POST /upload-previous-paper`: Upload Previous Year Question paper PDF
- `GET /user-documents` & `GET /`: Get all documents uploaded by user
- `GET /previous-papers`: Filter question papers by subject
- `GET /:id`: Get document metadata and AI summary
- `GET /:id/status`: Poll processing status and current stage
- `GET /view/:id`: Stream PDF in-browser (inline)
- `GET /download/:id` & `GET /:id/download`: Download PDF attachment
- `DELETE /:id`: Delete document and remove chunks & storage assets

### Study & AI Assistant (`/api/v1/chat`, `/api/v1/summary`, `/api/v1/quiz`, `/api/v1/analysis`, `/api/v1/search`)
- `POST /chat`: Multi-turn conversational study assistant grounded in uploaded document chunks
- `GET /chat/history/:conversationId`: Retrieve message history
- `POST /summary`: Generate Short or Detailed grounded summary
- `GET /summary/document/:documentId`: Retrieve stored summaries for a document
- `POST /quiz/generate`: Generate MCQs for a subject (answers hidden before submission)
- `GET /quiz/:id`: Retrieve quiz (reveals answers only after submission)
- `POST /quiz/submit`: Submit quiz answers and receive score, percentage, and explanations
- `POST /analysis`: Analyze previous-year papers for question repetition and topic frequencies
- `GET /analysis/document/:documentId`: Get PYQ analysis results for a document
- `GET /search?keyword=...`: Fast keyword search across document chunks with page citations

---

## 🧪 Automated Testing

Run the test suite powered by Vitest and Supertest:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Tests verify:
- Response wrapping in standard `ApiResponse<T>` format
- PDF signature validation (blocking corrupted or disguised files)
- Rate limiting and authentication protection
- Zod body and parameter validation
- Password hashing and token security
- Document chunking and page boundary preservation

---

## 🤝 Frontend Integration

The existing React + Vite frontend communicates with this backend without requiring any changes. The frontend's default base URL points to `http://localhost:5137/api/v1`, perfectly aligning with this server's default port and route configuration.
