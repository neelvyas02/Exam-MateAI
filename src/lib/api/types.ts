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

export interface ChapterDto {
  id: string;
  subjectId: string;
  subjectName?: string;
  number: string;
  name: string;
  description?: string | null;
  documentCount?: number;
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
  processingStatus?: string; // "Ready", "Processing", "Failed"
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

// Detailed PYQ Analysis DTOs
export interface ExtractedQuestionDto {
  number: string;
  text: string;
  marks: number | "Not specified";
  section?: string;
  topic: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  sourcePaper: string;
  year: string | "Not specified";
}

export interface RepeatedQuestionGroupDto {
  canonicalQuestion: string;
  topic: string;
  occurrencesCount: number;
  similarityPercentage: number;
  marks: number | "Not specified";
  occurrences: Array<{
    paperName: string;
    year: string | "Not specified";
    questionNumber: string;
    exactMatch: boolean;
    similarityScore: number;
  }>;
}

export interface TopicFrequencyItemDto {
  topic: string;
  count: number;
  totalMarks: number | "Not specified";
  papers: string[];
  priority: "High" | "Medium" | "Low";
  rationale: string;
}

export interface PaperBreakdownItemDto {
  paperName: string;
  year: string | "Not specified";
  totalMarks: number | "Not specified";
  questionsCount: number;
  topics: string[];
  questions: ExtractedQuestionDto[];
}

export interface RevisionPlanItemDto {
  step: number;
  topic: string;
  priority: "High" | "Medium" | "Low";
  rationale: string;
  suggestedAction: string;
  paperReferences: string[];
}

export interface DetailedPaperAnalysisDto {
  summary: {
    papersProcessed: number;
    totalQuestions: number;
    topicsIdentified: number;
    repeatedCount: number;
  };
  papers: PaperBreakdownItemDto[];
  topicFrequency: TopicFrequencyItemDto[];
  repeatedQuestions: RepeatedQuestionGroupDto[];
  importantTopics: Array<{
    topic: string;
    frequency: number;
    importanceLevel: "High" | "Medium" | "Low";
    reasons: string[];
    totalMarks: number | "Not specified";
  }>;
  revisionPlan: RevisionPlanItemDto[];
}

// Analysis DTOs
export interface AnalysisRequestDto {
  previousPaperIds?: string[];
  paperIds?: string[];
  subjectId?: string;
}

export interface QuestionAnalysisDto {
  id: string;
  documentId: string;
  repeatedQuestions: string[];
  repeatedTopics: string[];
  highWeightageUnits: string[];
  questionFrequency: Record<string, number>;
  createdAt: string;
  analysis?: DetailedPaperAnalysisDto;
}

// Chat DTOs
export interface ChatRequestDto {
  question: string;
  documentId?: string | null;
  subjectId?: string | null;
  chapterId?: string | null;
  conversationId?: string | null;
  context?: string | null;
}

export interface ChatMessageDto {
  id: string;
  conversationId: string;
  userId: string;
  documentId?: string | null;
  role: "user" | "assistant" | "system" | string;
  message: string;
  answer?: string;
  sourceDocument?: string | null;
  sourceCitation?: string | null;
  pageNumber?: number | null;
  confidence: number;
  sources?: any[];
  citations?: Array<{
    documentId: string;
    documentName: string;
    pageNumber?: number;
    pageDisplay: string;
    topic: string;
    excerpt: string;
  }>;
  groundingStatus?: string;
  isGrounded?: boolean;
  unverifiedContextUsed?: boolean;
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
  subjectId?: string;
  documentId?: string;
  documentIds?: string[];
  topic?: string;
  difficulty?: "Easy" | "Medium" | "Hard" | "Mixed" | string;
  questionType?: "MCQ" | "TrueFalse" | "Mixed";
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
  questionType?: "MCQ" | "TrueFalse";
  options?: string[];
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  selectedOption?: string | null;
  sourceCitation?: string;
  pageNumber?: number;
}

export interface QuizDto {
  id: string;
  userId: string;
  subjectId: string;
  subjectName: string;
  title: string;
  difficulty: string;
  questionType?: string;
  sourceDocName?: string;
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
