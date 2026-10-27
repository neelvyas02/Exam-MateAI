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

export interface PaperAnalysisResponse {
  repeatedQuestions: string[];
  repeatedTopics: string[];
  highWeightageUnits: string[];
  questionFrequency: Record<string, number>;
}

export interface GeneratedQuizItem {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string; // 'A' | 'B' | 'C' | 'D'
  explanation: string;
  topic?: string;
  sourceCitation?: string;
}

export interface IAIProvider {
  analyzeDocumentMetadata(title: string, content: string): Promise<DocumentAIMetadata>;
  askQuestion(question: string, context?: string, history?: Array<{ role: string; message: string }>): Promise<AIChatResponse>;
  generateSummary(content: string, type: 'Short' | 'Detailed'): Promise<string>;
  analyzePreviousPapers(paperTexts: string[]): Promise<PaperAnalysisResponse>;
  generateQuizQuestions(
    subjectName: string,
    content: string,
    difficulty: string,
    count?: number
  ): Promise<GeneratedQuizItem[]>;
}
