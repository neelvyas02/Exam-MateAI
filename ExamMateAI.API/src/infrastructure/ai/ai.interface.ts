export interface DocumentAIMetadata {
  materialName: string;
  description: string;
  materialType: string;
  topics: string[];
  keyConcepts: string[];
  summary: string;
  importantPoints: string[];
  topicConfidence: string;
}

export interface AIChatResponse {
  answer: string;
  sourceCitation?: string;
  pageNumber?: number;
  confidence: number;
}

export interface ExtractedQuestion {
  number: string;
  text: string;
  marks: number | 'Not specified';
  section?: string;
  topic: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  sourcePaper: string;
  year: string | 'Not specified';
}

export interface RepeatedQuestionGroup {
  canonicalQuestion: string;
  topic: string;
  occurrencesCount: number;
  similarityPercentage: number;
  marks: number | 'Not specified';
  occurrences: Array<{
    paperName: string;
    year: string | 'Not specified';
    questionNumber: string;
    exactMatch: boolean;
    similarityScore: number;
  }>;
}

export interface TopicFrequencyItem {
  topic: string;
  count: number;
  totalMarks: number | 'Not specified';
  papers: string[];
  priority: 'High' | 'Medium' | 'Low';
  rationale: string;
}

export interface PaperBreakdownItem {
  paperName: string;
  year: string | 'Not specified';
  totalMarks: number | 'Not specified';
  questionsCount: number;
  topics: string[];
  questions: ExtractedQuestion[];
}

export interface RevisionPlanItem {
  step: number;
  topic: string;
  priority: 'High' | 'Medium' | 'Low';
  rationale: string;
  suggestedAction: string;
  paperReferences: string[];
}

export interface DetailedPaperAnalysisResponse {
  summary: {
    papersProcessed: number;
    totalQuestions: number;
    topicsIdentified: number;
    repeatedCount: number;
  };
  papers: PaperBreakdownItem[];
  topicFrequency: TopicFrequencyItem[];
  repeatedQuestions: RepeatedQuestionGroup[];
  importantTopics: Array<{
    topic: string;
    frequency: number;
    importanceLevel: 'High' | 'Medium' | 'Low';
    reasons: string[];
    totalMarks: number | 'Not specified';
  }>;
  revisionPlan: RevisionPlanItem[];
  repeatedTopics?: string[];
  highWeightageUnits?: string[];
  questionFrequency?: Record<string, number>;
}

export type PaperAnalysisResponse = DetailedPaperAnalysisResponse;

export interface GeneratedQuizItem {
  question: string;
  questionType?: 'MCQ' | 'TrueFalse';
  options?: string[];
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string; // 'A' | 'B' | 'C' | 'D'
  explanation: string;
  topic?: string;
  sourceCitation?: string;
  pageNumber?: number;
}

export interface PaperInputData {
  paperName: string;
  year?: string;
  text: string;
}

export interface IAIProvider {
  analyzeDocumentMetadata(title: string, content: string): Promise<DocumentAIMetadata>;
  askQuestion(question: string, context?: string, history?: Array<{ role: string; message: string }>): Promise<AIChatResponse>;
  generateSummary(content: string, type: 'Short' | 'Detailed'): Promise<string>;
  analyzePreviousPapers(papers: PaperInputData[] | string[], notesContext?: string): Promise<DetailedPaperAnalysisResponse>;
  generateQuizQuestions(
    subjectName: string,
    content: string,
    difficulty: string,
    count?: number,
    questionType?: 'MCQ' | 'TrueFalse' | 'Mixed'
  ): Promise<GeneratedQuizItem[]>;
}

