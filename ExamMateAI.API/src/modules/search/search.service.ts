import { documentRetrievalService } from '../../infrastructure/ai/document-retrieval.service.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { logger } from '../../infrastructure/logging/logger.js';

export interface SearchResultItemDto {
  documentId: string;
  documentName: string;
  documentType: string;
  subjectName: string;
  pageNumber: number;
  sectionRef?: string;
  topic: string;
  previewText: string;
  similarity?: number;
}

export interface SearchResponseDto {
  keyword: string;
  totalMatches: number;
  results: SearchResultItemDto[];
}

export class SearchService {
  public async searchDocuments(keyword: string, userId?: string | null): Promise<SearchResponseDto> {
    if (!keyword || !keyword.trim()) {
      return { keyword: '', totalMatches: 0, results: [] };
    }

    const cleanKeyword = keyword.trim();

    // 1. Record search history if user is authenticated
    if (userId) {
      try {
        await prisma.searchHistory.create({
          data: {
            userId,
            keyword: cleanKeyword,
          },
        });
      } catch {
        // Silently continue
      }
    }

    const resultsMap = new Map<string, SearchResultItemDto>();

    // 2. Semantic vector search if user is authenticated
    if (userId) {
      try {
        const semanticHits = await documentRetrievalService.retrieveRelevantChunks({
          userId,
          query: cleanKeyword,
          topK: 15,
          similarityThreshold: 0.25,
        });

        // Fetch document types and subjects for semantic results
        if (semanticHits.length > 0) {
          const docIds = Array.from(new Set(semanticHits.map((h) => h.documentId)));
          const docs = await prisma.document.findMany({
            where: { id: { in: docIds } },
            include: { subject: true },
          });
          const docMap = new Map(docs.map((d) => [d.id, d]));

          for (const hit of semanticHits) {
            const doc = docMap.get(hit.documentId);
            const previewText = hit.chunkText
              .replace(/^---[^-\n]+---\s*/, '')
              .replace(/\n+/g, ' ')
              .substring(0, 200)
              .trim();

            resultsMap.set(hit.chunkId, {
              documentId: hit.documentId,
              documentName: hit.documentName,
              documentType: doc?.documentType || 'StudyMaterial',
              subjectName: doc?.subject?.name || 'General Subject',
              pageNumber: hit.pageNumber,
              sectionRef: hit.sectionRef,
              topic: doc?.materialName || hit.documentName,
              previewText: `...${previewText}...`,
              similarity: hit.similarity,
            });
          }
        }
      } catch (err: any) {
        logger.warn({ error: err.message }, '[SearchService] Semantic search error, using keyword search');
      }
    }

    // 3. Keyword search (to ensure hybrid retrieval)
    try {
      const keywordChunks = await prisma.documentChunk.findMany({
        where: {
          chunkText: { contains: cleanKeyword, mode: 'insensitive' },
          document: {
            isDeleted: false,
            ...(userId ? { userId } : {}),
          },
        },
        include: {
          document: { include: { subject: true } },
        },
        take: 15,
      });

      for (const c of keywordChunks) {
        if (!resultsMap.has(c.id)) {
          const text = c.chunkText;
          const idx = text.toLowerCase().indexOf(cleanKeyword.toLowerCase());
          const start = Math.max(0, idx - 40);
          const end = Math.min(text.length, idx + cleanKeyword.length + 120);
          const previewText = text.substring(start, end).replace(/\n/g, ' ');

          resultsMap.set(c.id, {
            documentId: c.document.id,
            documentName: c.document.originalName,
            documentType: c.document.documentType,
            subjectName: c.document.subject?.name || 'General Subject',
            pageNumber: c.pageNumber,
            sectionRef: c.sectionRef || `Page ${c.pageNumber}`,
            topic: c.document.materialName || c.document.originalName,
            previewText: `...${previewText}...`,
            similarity: 0.85,
          });
        }
      }
    } catch (err: any) {
      logger.warn({ error: err.message }, '[SearchService] Keyword search error');
    }

    const allResults = Array.from(resultsMap.values());
    allResults.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

    return {
      keyword: cleanKeyword,
      totalMatches: allResults.length,
      results: allResults,
    };
  }
}

export const searchService = new SearchService();
