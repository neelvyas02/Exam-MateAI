import { NotFoundError } from '../../common/errors.js';
import { getAIProvider } from '../../infrastructure/ai/ai.factory.js';
import { prisma } from '../../infrastructure/database/prisma.js';

export interface SummaryDto {
  id: string;
  documentId: string;
  userId: string;
  summaryType: string;
  content: string;
  aiModel: string;
  generatedAt: string;
}

export class SummaryService {
  public async summarizeDocument(
    userId: string,
    documentId: string,
    summaryTypeInput: number | string
  ): Promise<SummaryDto> {
    const document = await prisma.document.findUnique({
      where: { id: documentId, isDeleted: false },
      include: { chunks: true },
    });

    if (!document) {
      throw new NotFoundError('Document not found.');
    }

    let summaryType: 'Short' | 'Detailed' = 'Short';
    if (summaryTypeInput === 2 || summaryTypeInput === 'Detailed' || summaryTypeInput === 1) {
      summaryType = 'Detailed';
    }

    // Check if an existing summary exists
    const existing = await prisma.summary.findFirst({
      where: { documentId, summaryType },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      return {
        id: existing.id,
        documentId: existing.documentId,
        userId: existing.userId,
        summaryType: existing.summaryType,
        content: existing.content,
        aiModel: existing.aiProvider,
        generatedAt: existing.createdAt.toISOString(),
      };
    }

    // Generate summary from document chunks or summary
    const text =
      document.chunks.length > 0
        ? document.chunks.map((c) => c.chunkText).join('\n\n')
        : document.originalName;

    const ai = getAIProvider();
    const content = await ai.generateSummary(text, summaryType);

    const summary = await prisma.summary.create({
      data: {
        userId,
        documentId,
        summaryType,
        content,
        aiProvider: 'Gemini-1.5-Flash',
      },
    });

    return {
      id: summary.id,
      documentId: summary.documentId,
      userId: summary.userId,
      summaryType: summary.summaryType,
      content: summary.content,
      aiModel: summary.aiProvider,
      generatedAt: summary.createdAt.toISOString(),
    };
  }

  public async getDocumentSummaries(documentId: string): Promise<SummaryDto[]> {
    const summaries = await prisma.summary.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });

    return summaries.map((s) => ({
      id: s.id,
      documentId: s.documentId,
      userId: s.userId,
      summaryType: s.summaryType,
      content: s.content,
      aiModel: s.aiProvider,
      generatedAt: s.createdAt.toISOString(),
    }));
  }
}

export const summaryService = new SummaryService();
