import { getAIProvider } from './ai.factory.js';
import { documentRetrievalService, RetrievedChunk } from './document-retrieval.service.js';

export interface RAGSourceCitation {
  documentId: string;
  documentName: string;
  pageNumber: number;
  sectionRef: string;
  excerpt: string;
}

export interface RAGResponse {
  answer: string;
  sources: RAGSourceCitation[];
  sourceCitation: string;
  pageNumber?: number;
  confidence: number;
  provider: string;
}

export class RAGService {
  public async answerQuestion(options: {
    userId: string;
    question: string;
    documentIds?: string[];
    conversationHistory?: Array<{ role: string; message: string }>;
  }): Promise<RAGResponse> {
    const { userId, question, documentIds, conversationHistory } = options;

    // 1. Retrieve the most relevant chunks using semantic vector search
    const retrievedChunks: RetrievedChunk[] = await documentRetrievalService.retrieveRelevantChunks({
      userId,
      query: question,
      documentIds,
      topK: 5,
      similarityThreshold: 0.25,
    });

    // 2. Format context with document and page citations
    let contextBuilder = '';
    const sources: RAGSourceCitation[] = [];

    for (const chunk of retrievedChunks) {
      contextBuilder += `[Document: ${chunk.documentName} | ${chunk.sectionRef}]\n${chunk.chunkText}\n\n`;

      // Extract brief excerpt (first 140 chars)
      const cleanExcerpt = chunk.chunkText
        .replace(/^---[^-\n]+---\s*/, '')
        .replace(/\n+/g, ' ')
        .substring(0, 160)
        .trim();

      sources.push({
        documentId: chunk.documentId,
        documentName: chunk.documentName,
        pageNumber: chunk.pageNumber,
        sectionRef: chunk.sectionRef,
        excerpt: `${cleanExcerpt}...`,
      });
    }

    // 3. Query the AI Provider (OpenAI) with grounded context
    const ai = getAIProvider();
    const aiResult = await ai.askQuestion(question, contextBuilder, conversationHistory);

    // 4. Build primary source citation text
    let primaryCitation = aiResult.sourceCitation || '';
    let primaryPage = aiResult.pageNumber;

    if (!primaryCitation && sources.length > 0) {
      primaryCitation = `${sources[0].documentName} (${sources[0].sectionRef})`;
      primaryPage = sources[0].pageNumber;
    }

    return {
      answer: aiResult.answer,
      sources,
      sourceCitation: primaryCitation,
      pageNumber: primaryPage,
      confidence: aiResult.confidence,
      provider: 'openai',
    };
  }
}

export const ragService = new RAGService();
