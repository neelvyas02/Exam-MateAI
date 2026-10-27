import { apiClient, setStoredAuthToken } from "./api-client";
import {
  AnalysisRequestDto,
  ApiResponse,
  AuthResponseDto,
  ChangePasswordRequestDto,
  ChatMessageDto,
  ChatRequestDto,
  CreateSubjectDto,
  ChapterDto,
  CreateChapterDto,
  UpdateChapterDto,
  DocumentDto,
  GenerateQuizRequestDto,
  HealthStatusDto,
  LoginRequestDto,
  QuestionAnalysisDto,
  QuizDto,
  QuizResultDto,
  RegisterRequestDto,
  SearchResponseDto,
  SubjectDto,
  SubmitQuizRequestDto,
  SummarizeRequestDto,
  SummaryDto,
  SummaryTypeEnum,
  UpdateProfileRequestDto,
  UpdateSubjectDto,
  UserDto,
} from "./types";

export * from "./api-client";
export * from "./types";

// 1. Health API Service
export const healthApi = {
  async getHealthStatus(): Promise<HealthStatusDto> {
    const res = await apiClient.get<HealthStatusDto>("/health");
    return res.data!;
  },

  async isBackendAvailable(): Promise<boolean> {
    try {
      const res = await apiClient.get<HealthStatusDto>("/health");
      return res.success && res.data?.status !== "Disconnected";
    } catch {
      return false;
    }
  },
};

// 2. Auth API Service
export const authApi = {
  async register(data: RegisterRequestDto): Promise<ApiResponse<AuthResponseDto>> {
    const res = await apiClient.post<AuthResponseDto>("/auth/register", data);
    if (res.data?.accessToken) {
      setStoredAuthToken(res.data.accessToken, res.data.refreshToken);
    }
    return res;
  },

  async login(data: LoginRequestDto): Promise<ApiResponse<AuthResponseDto>> {
    const res = await apiClient.post<AuthResponseDto>("/auth/login", data);
    if (res.data?.accessToken) {
      setStoredAuthToken(res.data.accessToken, res.data.refreshToken);
    }
    return res;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      setStoredAuthToken(null);
    }
  },

  async getMe(): Promise<UserDto> {
    const res = await apiClient.get<UserDto>("/auth/me");
    return res.data!;
  },

  async updateProfile(data: UpdateProfileRequestDto): Promise<UserDto> {
    const res = await apiClient.put<UserDto>("/auth/update-profile", data);
    return res.data!;
  },

  async changePassword(data: ChangePasswordRequestDto): Promise<void> {
    await apiClient.post("/auth/change-password", data);
  },
};

// 3. Subjects API Service
export const subjectsApi = {
  async getSubjects(): Promise<SubjectDto[]> {
    const res = await apiClient.get<SubjectDto[]>("/subjects");
    return res.data || [];
  },

  async getSubjectById(id: string): Promise<SubjectDto> {
    const res = await apiClient.get<SubjectDto>(`/subjects/${id}`);
    return res.data!;
  },

  async createSubject(data: CreateSubjectDto): Promise<SubjectDto> {
    const res = await apiClient.post<SubjectDto>("/subjects", data);
    return res.data!;
  },

  async updateSubject(id: string, data: UpdateSubjectDto): Promise<SubjectDto> {
    const res = await apiClient.put<SubjectDto>(`/subjects/${id}`, data);
    return res.data!;
  },

  async deleteSubject(id: string): Promise<void> {
    await apiClient.delete(`/subjects/${id}`);
  },
};

// 3b. Chapters API Service
export const chaptersApi = {
  async getChapters(subjectId: string): Promise<ChapterDto[]> {
    const res = await apiClient.get<ChapterDto[]>("/chapters", { subjectId });
    return res.data || [];
  },

  async getChapterById(id: string): Promise<ChapterDto> {
    const res = await apiClient.get<ChapterDto>(`/chapters/${id}`);
    return res.data!;
  },

  async createChapter(data: CreateChapterDto): Promise<ChapterDto> {
    const res = await apiClient.post<ChapterDto>("/chapters", data);
    return res.data!;
  },

  async updateChapter(id: string, data: UpdateChapterDto): Promise<ChapterDto> {
    const res = await apiClient.put<ChapterDto>(`/chapters/${id}`, data);
    return res.data!;
  },

  async deleteChapter(id: string): Promise<void> {
    await apiClient.delete(`/chapters/${id}`);
  },
};

// 4. Documents API Service
export const documentsApi = {
  async uploadPdf(file: File, subjectId: string, chapterId?: string | null, documentType: "StudyMaterial" | "PreviousPaper" = "StudyMaterial"): Promise<DocumentDto> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("subjectId", subjectId);
    if (chapterId) {
      formData.append("chapterId", chapterId);
    }
    formData.append("documentType", documentType === "PreviousPaper" ? "1" : "0");
    const res = await apiClient.postForm<DocumentDto>("/documents/upload-material", formData);
    return res.data!;
  },

  async uploadPreviousPaper(file: File, subjectId: string, chapterId?: string | null): Promise<DocumentDto> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("subjectId", subjectId);
    if (chapterId) {
      formData.append("chapterId", chapterId);
    }
    const res = await apiClient.postForm<DocumentDto>("/documents/upload-previous-paper", formData);
    return res.data!;
  },

  async getUserDocuments(): Promise<DocumentDto[]> {
    const res = await apiClient.get<DocumentDto[]>("/documents/user-documents");
    return res.data || [];
  },

  async getPreviousPapers(subjectId?: string): Promise<DocumentDto[]> {
    const res = await apiClient.get<DocumentDto[]>("/documents/previous-papers", subjectId ? { subjectId } : undefined);
    return res.data || [];
  },

  async getDocumentById(id: string): Promise<DocumentDto> {
    const res = await apiClient.get<DocumentDto>(`/documents/${id}`);
    return res.data!;
  },

  async deleteDocument(id: string): Promise<void> {
    await apiClient.delete(`/documents/${id}`);
  },

  getViewUrl(id: string): string {
    const envUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5137/api/v1";
    return `${envUrl.replace(/\/+$/, "")}/documents/view/${id}`;
  },

  getDownloadUrl(id: string): string {
    const envUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5137/api/v1";
    return `${envUrl.replace(/\/+$/, "")}/documents/download/${id}`;
  },
};

// 5. Analysis API Service
export const analysisApi = {
  async analyzePreviousPapers(paperIds: string[]): Promise<QuestionAnalysisDto> {
    const res = await apiClient.post<QuestionAnalysisDto>("/analysis", {
      previousPaperIds: paperIds,
    } as AnalysisRequestDto);
    return res.data!;
  },

  async getAnalysisByDocumentId(documentId: string): Promise<QuestionAnalysisDto> {
    const res = await apiClient.get<QuestionAnalysisDto>(`/analysis/document/${documentId}`);
    return res.data!;
  },
};

// 6. Chat API Service
export const chatApi = {
  async askQuestion(question: string, documentId?: string | null, conversationId?: string | null): Promise<ChatMessageDto> {
    const dto: ChatRequestDto = { question, documentId, conversationId };
    const res = await apiClient.post<ChatMessageDto>("/chat", dto);
    return res.data!;
  },

  async getConversationHistory(conversationId: string): Promise<ChatMessageDto[]> {
    const res = await apiClient.get<ChatMessageDto[]>(`/chat/history/${conversationId}`);
    return res.data || [];
  },
};

// 7. Summary API Service
export const summaryApi = {
  async summarizeDocument(documentId: string, summaryType: SummaryTypeEnum = 0): Promise<SummaryDto> {
    let numericSummaryType: number = 0;
    if (typeof summaryType === "string") {
      if (summaryType.toLowerCase() === "medium") numericSummaryType = 1;
      else if (summaryType.toLowerCase() === "detailed") numericSummaryType = 2;
      else numericSummaryType = 0;
    } else {
      numericSummaryType = summaryType;
    }

    const dto: SummarizeRequestDto = {
      documentId,
      summaryType: numericSummaryType,
    };

    const res = await apiClient.post<SummaryDto>("/summary", dto);
    return res.data!;
  },

  async getDocumentSummaries(documentId: string): Promise<SummaryDto[]> {
    const res = await apiClient.get<SummaryDto[]>(`/summary/document/${documentId}`);
    return res.data || [];
  },
};

// 8. Quiz API Service
export const quizApi = {
  async generateQuiz(subjectId: string, difficulty: string = "Medium", questionCount: number = 5): Promise<QuizDto> {
    const dto: GenerateQuizRequestDto = {
      subjectId,
      difficulty,
      questionCount,
    };
    const res = await apiClient.post<QuizDto>("/quiz/generate", dto);
    return res.data!;
  },

  async getQuizById(id: string): Promise<QuizDto> {
    const res = await apiClient.get<QuizDto>(`/quiz/${id}`);
    return res.data!;
  },

  async submitQuiz(dto: SubmitQuizRequestDto): Promise<QuizResultDto> {
    const res = await apiClient.post<QuizResultDto>("/quiz/submit", dto);
    return res.data!;
  },
};

// 9. Search API Service
export const searchApi = {
  async search(keyword: string): Promise<SearchResponseDto> {
    const res = await apiClient.get<SearchResponseDto>("/search", { keyword });
    return res.data || { keyword, totalMatches: 0, results: [] };
  },
};
