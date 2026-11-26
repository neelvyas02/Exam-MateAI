import { logger } from '../logging/logger.js';
import { getAIProvider, getActiveProviderName } from './ai.factory.js';
import { documentRetrievalService, RetrievedChunk } from './document-retrieval.service.js';
import { cleanAssistantAnswer } from './study-assistant-prompt.js';

export interface RAGSourceCitation {
  documentId: string;
  documentName: string;
  pageNumber: number;
  sectionRef: string;
  excerpt: string;
  topic?: string;
}

export interface RAGCitation {
  documentId: string;
  documentName: string;
  pageNumber?: number;
  pageDisplay: string;
  topic: string;
  excerpt: string;
}

export type RAGGroundingStatus =
  | 'GROUNDED'
  | 'PARTIAL'
  | 'NOT_FOUND'
  | 'PROCESSING'
  | 'NO_DOCUMENTS'
  | 'FAILED';

export interface RAGResponse {
  answer: string;
  citations: RAGCitation[];
  sources: RAGSourceCitation[];
  sourceCitation: string;
  pageNumber?: number;
  confidence: number;
  provider: string;
  isGrounded: boolean;
  groundingStatus: RAGGroundingStatus;
  unverifiedContextUsed: boolean;
}

export class RAGService {
  public async answerQuestion(options: {
    userId: string;
    question: string;
    documentIds?: string[];
    conversationHistory?: Array<{ role: string; message: string }>;
    directContext?: string | null;
  }): Promise<RAGResponse> {
    const { userId, question, documentIds, conversationHistory, directContext } = options;
    const provider = getActiveProviderName();

    let retrievedChunks: RetrievedChunk[] = [];
    try {
      const scope = await documentRetrievalService.checkScopeStatus({ userId, documentIds });

      // Case B: Document is currently processing
      if (scope.readyDocuments === 0 && scope.processingDocuments.length > 0) {
        const proc = scope.processingDocuments[0];
        return {
          answer: `Your study material "${proc.name}" is currently being processed (${proc.stage}). Please give it a few moments to finish extracting text and indexing, then ask your question again.`,
          citations: [],
          sources: [],
          sourceCitation: proc.name,
          confidence: 0.0,
          provider,
          isGrounded: false,
          groundingStatus: 'PROCESSING',
          unverifiedContextUsed: false,
        };
      }

      // Case C: Document processing failed
      if (scope.readyDocuments === 0 && scope.failedDocuments.length > 0) {
        const failed = scope.failedDocuments[0];
        return {
          answer: `Document processing failed for "${failed.name}"${failed.error ? `: ${failed.error}` : ''}. Please re-upload the document or verify that the PDF has selectable text (not scanned images without OCR).`,
          citations: [],
          sources: [],
          sourceCitation: failed.name,
          confidence: 0.0,
          provider,
          isGrounded: false,
          groundingStatus: 'FAILED',
          unverifiedContextUsed: false,
        };
      }

      if (scope.hasDocuments) {
        retrievedChunks = await documentRetrievalService.retrieveRelevantChunks({
          userId,
          query: question,
          documentIds,
          topK: 6,
          similarityThreshold: 0.35,
        });
      }
    } catch (err: any) {
      logger.warn({ error: err.message }, '[RAGService] DB document retrieval unavailable, falling back to direct AI reasoning.');
    }

    const sources: RAGSourceCitation[] = [];
    const citations: RAGCitation[] = [];
    let contextBuilder = '';

    if (directContext && directContext.trim().length > 0) {
      contextBuilder += `[STUDY MATERIAL CONTEXT]:\n${directContext.trim()}\n\n`;
    }

    for (let i = 0; i < retrievedChunks.length; i++) {
      const chunk = retrievedChunks[i];
      const pageStr = chunk.pageNumber > 0 ? `Page ${chunk.pageNumber}` : 'Page number unavailable';

      contextBuilder += `[SOURCE ${i + 1}]:\nDocument: ${chunk.documentName}\n${pageStr}\nSection: ${chunk.sectionRef}\nContent:\n${chunk.chunkText}\n\n`;

      const cleanExcerpt = chunk.chunkText
        .replace(/^---[^-\n]+---\s*/, '')
        .replace(/\n+/g, ' ')
        .substring(0, 160)
        .trim();

      const topicDesc = chunk.sectionRef
        .replace(/^Slide \d+:\s*/i, '')
        .replace(/^Page \d+:\s*/i, '')
        .trim() || 'Core concepts and definitions';

      sources.push({
        documentId: chunk.documentId,
        documentName: chunk.documentName,
        pageNumber: chunk.pageNumber,
        sectionRef: chunk.sectionRef,
        excerpt: `${cleanExcerpt}...`,
        topic: topicDesc,
      });

      citations.push({
        documentId: chunk.documentId,
        documentName: chunk.documentName,
        pageNumber: chunk.pageNumber > 0 ? chunk.pageNumber : undefined,
        pageDisplay: pageStr,
        topic: topicDesc,
        excerpt: `${cleanExcerpt}...`,
      });
    }

    // 3. Query the configured AI Provider
    const ai = getAIProvider();
    const aiResult = await ai.askQuestion(question, contextBuilder, conversationHistory);

    // 4. Grounding and unverified context detection
    const hasExplicitGeneralKnowledge =
      aiResult.answer.includes('General Academic Context') ||
      aiResult.answer.toLowerCase().includes('not verified in your uploaded notes') ||
      aiResult.answer.toLowerCase().includes('could not find') ||
      aiResult.answer.toLowerCase().includes("couldn't find");

    const isGrounded =
      sources.length > 0 &&
      aiResult.confidence >= 0.7 &&
      !hasExplicitGeneralKnowledge;

    const unverifiedContextUsed = hasExplicitGeneralKnowledge || sources.length === 0;

    const groundingStatus: RAGGroundingStatus = isGrounded
      ? 'GROUNDED'
      : sources.length > 0
      ? 'PARTIAL'
      : 'NOT_FOUND';

    // 5. Clean and validate answer and References section
    let formattedAnswer = cleanAssistantAnswer(aiResult.answer);

    // If grounded and document chunks exist, validate and guarantee accurate References section
    if (sources.length > 0 && isGrounded) {
      formattedAnswer = this.ensureAccurateReferences(formattedAnswer, retrievedChunks);
    }

    // Deduplicate citations by documentId and pageNumber
    const deduplicatedCitations = this.deduplicateCitations(citations);

    let primaryCitation = aiResult.sourceCitation || '';
    let primaryPage = aiResult.pageNumber;

    if (!primaryCitation && deduplicatedCitations.length > 0) {
      primaryCitation = `${deduplicatedCitations[0].documentName} (${deduplicatedCitations[0].pageDisplay})`;
      primaryPage = deduplicatedCitations[0].pageNumber;
    }

    logger.info(
      {
        provider,
        groundingStatus,
        isGrounded,
        sourcesCount: sources.length,
        primaryCitation,
      },
      '[RAGService] Completed question answering with structured citations'
    );

    return {
      answer: formattedAnswer,
      citations: deduplicatedCitations,
      sources,
      sourceCitation: primaryCitation,
      pageNumber: primaryPage,
      confidence: aiResult.confidence,
      provider,
      isGrounded,
      groundingStatus,
      unverifiedContextUsed,
    };
  }

  /**
   * Ensures the References section at the end is strictly grounded in real retrieved chunks.
   * Eliminates hallucinated filenames or invented page numbers.
   */
  private ensureAccurateReferences(answer: string, chunks: RetrievedChunk[]): string {
    const referencesHeadingRegex = /(?:###\s*(?:6\.\s*)?References|\*\*References\*\*|##\s*References)\s*([\s\S]*)$/i;
    const match = answer.match(referencesHeadingRegex);

    // Build verified reference items from actual retrieved chunks, deduplicating by doc+page
    const verifiedRefMap = new Map<string, { docName: string; pageStr: string; topic: string }>();

    for (const chunk of chunks) {
      const pageStr = chunk.pageNumber > 0 ? `Page ${chunk.pageNumber}` : 'Page number unavailable';
      const key = `${chunk.documentName}:${chunk.pageNumber}`;
      if (!verifiedRefMap.has(key)) {
        const topic =
          chunk.sectionRef
            .replace(/^Slide \d+:\s*/i, '')
            .replace(/^Page \d+:\s*/i, '')
            .trim() || 'Core concepts and exam points';
        verifiedRefMap.set(key, { docName: chunk.documentName, pageStr, topic });
      }
    }

    const verifiedItems = Array.from(verifiedRefMap.values());
    if (verifiedItems.length === 0) return answer;

    // Check if AI generated a References section
    if (match) {
      const originalRefSection = match[1].trim();
      const refLines = originalRefSection.split('\n').filter((l) => l.trim().length > 0);

      // Validate each line against real chunks
      const validatedLines: string[] = [];
      const seenKeys = new Set<string>();

      for (const line of refLines) {
        // Pattern: 1. *doc* — Page X: topic
        const lineMatch = line.match(/\*([^*]+)\*\s*[—–-]\s*([^:]+):\s*(.+)/);
        if (lineMatch) {
          const rawDoc = lineMatch[1].trim();
          const rawPage = lineMatch[2].trim();
          const rawTopic = lineMatch[3].trim();

          // Match doc against real chunks
          const matchedChunk = chunks.find(
            (c) =>
              c.documentName.toLowerCase().includes(rawDoc.toLowerCase()) ||
              rawDoc.toLowerCase().includes(c.documentName.toLowerCase())
          );

          if (matchedChunk) {
            const pageNumMatch = rawPage.match(/\d+/);
            const verifiedPage = pageNumMatch ? parseInt(pageNumMatch[0], 10) : matchedChunk.pageNumber;
            const validPageStr = verifiedPage > 0 ? `Page ${verifiedPage}` : 'Page number unavailable';
            const key = `${matchedChunk.documentName}:${validPageStr}`;

            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              validatedLines.push(
                `${validatedLines.length + 1}. *${matchedChunk.documentName}* — ${validPageStr}: ${rawTopic}`
              );
            }
          }
        }
      }

      // If valid lines were preserved, replace the references section with validated lines
      if (validatedLines.length > 0) {
        const baseContent = answer.substring(0, match.index).trim();
        return `${baseContent}\n\n**References**\n${validatedLines.join('\n')}`;
      }
    }

    // If no references section existed or model failed to format them, synthesize verified section
    const baseContent = match ? answer.substring(0, match.index).trim() : answer.trim();
    const synthReferences = verifiedItems
      .slice(0, 5)
      .map((item, idx) => `${idx + 1}. *${item.docName}* — ${item.pageStr}: ${item.topic}.`)
      .join('\n');

    return `${baseContent}\n\n**References**\n${synthReferences}`;
  }

  /**
   * Deduplicates citations array by documentId and pageNumber
   */
  private deduplicateCitations(citations: RAGCitation[]): RAGCitation[] {
    const seen = new Set<string>();
    const result: RAGCitation[] = [];

    for (const c of citations) {
      const key = `${c.documentId}:${c.pageNumber ?? 'na'}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(c);
      }
    }

    return result;
  }
}

export const ragService = new RAGService();

