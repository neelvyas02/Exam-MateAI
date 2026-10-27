// Generic API Response wrapper returned by ASP.NET Core backend
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T | null;
  errors?: string[];
}

// Authentication DTOs
export interface RegisterRequestDto {
  fullName: string;
  email: string;
  password: string;
  role?: "Student" | "Admin";
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RefreshTokenRequestDto {
  accessToken: string;
  refreshToken: string;
}

export interface ChangePasswordRequestDto {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequestDto {
  fullName: string;
  profilePhoto?: string | null;
}

export interface UserDto {
  id: string;
  fullName: string;
  email: string;
  profilePhoto?: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponseDto {
  user: UserDto;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiration: string;
}

// Health Status DTO
export interface HealthStatusDto {
  status: string;
  timestamp: string;
  database: {
    status: string;
    provider: string;
  };
  supabaseStorage: {
    status: string;
    bucket: string;
    fallbackToLocal: boolean;
  };
  aiProvider: {
    provider: string;
    status: string;
  };
}

// Subject DTOs
export interface SubjectDto {
  id: string;
  name: string;
  semester: string;
  description?: string | null;
  documentCount: number;
  createdAt: string;
}

export interface CreateSubjectDto {
  name: string;
  semester: string;
  description?: string;
}

export interface UpdateSubjectDto {
  name: string;
  semester: string;
  description?: string;
}

// Chapter DTOs
export interface ChapterDto {
  id: string;
  subjectId: string;
  subjectName: string;
  number: string;
  name: string;
  description?: string | null;
  documentCount: number;
  createdAt: string;
}

export interface CreateChapterDto {
  subjectId: string;
  number: string;
  name: string;
  description?: string;
}

export interface UpdateChapterDto {
  number: string;
  name: string;
  description?: string;
}

// Document DTOs
export type DocumentTypeEnum = "StudyMaterial" | "PreviousPaper";

export interface DocumentDto {
  id: string;
  userId: string;
  subjectId: string;
  subjectName: string;
  chapterId?: string | null;
  chapterName?: string | null;
  chapterNumber?: string | null;
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileSize: number;
  pageCount: number;
  documentType: string; // "StudyMaterial" or "PreviousPaper"
  status: string; // "Uploaded", "ExtractingText", "Chunking", "GeneratingSummary", "AnalyzingQuestions", "Ready", "Failed"
  statusMessage?: string | null;
  author?: string | null;
  title?: string | null;
  materialName?: string | null;
  materialType?: string | null;
  description?: string | null;
  summary?: string | null;
  topics?: string[];
  keyConcepts?: string[];
  importantPoints?: string[];
  extractedTextLength: number;
  uploadedAt: string;
}

// Analysis DTOs
export interface AnalysisRequestDto {
  previousPaperIds: string[];
}

export interface QuestionAnalysisDto {
  id: string;
  documentId: string;
  repeatedQuestions: string[];
  repeatedTopics: string[];
  highWeightageUnits: string[];
  questionFrequency: Record<string, number>;
  createdAt: string;
}

// Chat DTOs
export interface ChatRequestDto {
  question: string;
  documentId?: string | null;
  subjectId?: string | null;
  chapterId?: string | null;
  conversationId?: string | null;
}

export interface ChatMessageDto {
  id: string;
  conversationId: string;
  userId: string;
  documentId?: string | null;
  role: "user" | "assistant" | "system" | string;
  message: string;
  sourceDocument?: string | null;
  sourceCitation?: string | null;
  pageNumber?: number | null;
  confidence: number;
  createdAt: string;
}

// Summary DTOs
export type SummaryTypeEnum = 0 | 1 | 2 | "Short" | "Medium" | "Detailed";

export interface SummarizeRequestDto {
  documentId: string;
  summaryType: number;
}

export interface SummaryDto {
  id: string;
  documentId: string;
  userId: string;
  summaryType: string;
  content: string;
  aiModel: string;
  generatedAt: string;
}

// Quiz DTOs
export interface GenerateQuizRequestDto {
  subjectId: string;
  difficulty?: "Easy" | "Medium" | "Hard" | string;
  questionCount?: number;
}

export interface SubmitQuizAnswerDto {
  questionId: string;
  selectedOption: string; // "A", "B", "C", "D"
}

export interface SubmitQuizRequestDto {
  quizId: string;
  answers: SubmitQuizAnswerDto[];
}

export interface QuizQuestionDto {
  id: string;
  quizId: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  selectedOption?: string | null;
}

export interface QuizDto {
  id: string;
  userId: string;
  subjectId: string;
  subjectName: string;
  title: string;
  difficulty: string;
  score?: number | null;
  totalQuestions: number;
  questions: QuizQuestionDto[];
  createdAt: string;
}

export interface QuizResultDto {
  quizId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  questions: QuizQuestionDto[];
}

// Search DTOs
export interface SearchResultItemDto {
  documentId: string;
  documentName: string;
  documentType: string;
  subjectName: string;
  pageNumber: number;
  topic: string;
  previewText: string;
}

export interface SearchResponseDto {
  keyword: string;
  totalMatches: number;
  results: SearchResultItemDto[];
}
