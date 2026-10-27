import { prisma } from '../database/prisma.js';
import { logger } from '../logging/logger.js';
import { EmbeddingService, embeddingService } from './embedding.service.js';

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  chunkText: string;
  pageNumber: number;
  sectionRef: string;
  similarity: number;
}

export class DocumentRetrievalService {
  /**
   * Retrieves the most semantically relevant document chunks using vector similarity search
   */
  public async retrieveRelevantChunks(options: {
    userId: string;
    query: string;
    documentIds?: string[];
    topK?: number;
    similarityThreshold?: number;
  }): Promise<RetrievedChunk[]> {
    const { userId, query, documentIds, topK = 6, similarityThreshold = 0.2 } = options;

    if (!query || !query.trim()) return [];

    let queryEmbedding: number[] = [];
    try {
      queryEmbedding = await embeddingService.generateQueryEmbedding(query);
    } catch (embErr: any) {
      logger.warn({ error: embErr.message }, '[DocumentRetrievalService] Failed to generate query embedding, using keyword fallback');
      return this.keywordFallbackRetrieval(userId, query, documentIds, topK);
    }

    // 1. Try native Supabase pgvector retrieval
    try {
      const vectorStr = `[${queryEmbedding.join(',')}]`;
      const docIdFilter =
        documentIds && documentIds.length > 0
          ? `AND d.id IN (${documentIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')})`
          : '';

      const sqlQuery = `
        SELECT
          dc.id,
          dc."documentId",
          dc."chunkIndex",
          dc."chunkText",
          dc."pageNumber",
          COALESCE(dc."sectionRef", CONCAT('Page ', dc."pageNumber")) AS "sectionRef",
          d."originalName" AS "documentName",
          (1 - (dc.embedding <=> '${vectorStr}'::vector))::float AS similarity
        FROM "DocumentChunk" dc
        JOIN "Document" d ON dc."documentId" = d.id
        WHERE (d."userId" = '${userId.replace(/'/g, "''")}' OR d."documentType" = 'StudyMaterial' OR d."userId" IS NULL)
          AND d."isDeleted" = false
          AND d."processingStatus" = 'Ready'
          ${docIdFilter}
          AND dc.embedding IS NOT NULL
          AND (1 - (dc.embedding <=> '${vectorStr}'::vector)) >= ${similarityThreshold}
        ORDER BY dc.embedding <=> '${vectorStr}'::vector ASC
        LIMIT ${topK};
      `;

      const results = (await prisma.$queryRawUnsafe(sqlQuery)) as any[];

      if (results && results.length > 0) {
        return results.map((r) => ({
          chunkId: r.id,
          documentId: r.documentId,
          documentName: r.documentName,
          chunkIndex: r.chunkIndex,
          chunkText: r.chunkText,
          pageNumber: r.pageNumber || 1,
          sectionRef: r.sectionRef || `Page ${r.pageNumber || 1}`,
          similarity: Number(r.similarity) || 0.8,
        }));
      }
    } catch (pgvectorErr: any) {
      logger.debug(
        { error: pgvectorErr.message },
        '[DocumentRetrievalService] pgvector query bypassed, evaluating via embeddingJson or keyword'
      );
    }

    // 2. Fallback: In-memory cosine similarity over stored embeddingJson
    try {
      const candidates = await prisma.documentChunk.findMany({
        where: {
          document: {
            OR: [{ userId }, { documentType: 'StudyMaterial' }],
            isDeleted: false,
            processingStatus: 'Ready',
            ...(documentIds && documentIds.length > 0 ? { id: { in: documentIds } } : {}),
          },
        },
        include: {
          document: { select: { originalName: true } },
        },
        take: 80,
      });

      const scored = candidates
        .map((c) => {
          let sim = 0;
          if (c.embeddingJson) {
            try {
              const vector = JSON.parse(c.embeddingJson) as number[];
              sim = EmbeddingService.cosineSimilarity(queryEmbedding, vector);
            } catch {
              sim = 0;
            }
          }
          return { chunk: c, similarity: sim };
        })
        .filter((sc) => sc.similarity >= similarityThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      if (scored.length > 0) {
        return scored.map((sc) => ({
          chunkId: sc.chunk.id,
          documentId: sc.chunk.documentId,
          documentName: sc.chunk.document.originalName,
          chunkIndex: sc.chunk.chunkIndex,
          chunkText: sc.chunk.chunkText,
          pageNumber: sc.chunk.pageNumber,
          sectionRef: sc.chunk.sectionRef || `Page ${sc.chunk.pageNumber}`,
          similarity: sc.similarity,
        }));
      }
    } catch {
      // Continue to keyword fallback
    }

    // 3. Fallback: Keyword search
    return this.keywordFallbackRetrieval(userId, query, documentIds, topK);
  }

  private async keywordFallbackRetrieval(
    userId: string,
    query: string,
    documentIds?: string[],
    topK: number = 5
  ): Promise<RetrievedChunk[]> {
    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const candidates = await prisma.documentChunk.findMany({
      where: {
        document: {
          OR: [{ userId }, { documentType: 'StudyMaterial' }],
          isDeleted: false,
          processingStatus: 'Ready',
          ...(documentIds && documentIds.length > 0 ? { id: { in: documentIds } } : {}),
        },
      },
      include: {
        document: { select: { originalName: true } },
      },
      take: 40,
    });

    const scored = candidates
      .map((c) => {
        let score = 0;
        const lower = c.chunkText.toLowerCase();
        for (const kw of keywords) {
          if (lower.includes(kw)) score++;
        }
        return { chunk: c, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored.map((s) => ({
      chunkId: s.chunk.id,
      documentId: s.chunk.documentId,
      documentName: s.chunk.document.originalName,
      chunkIndex: s.chunk.chunkIndex,
      chunkText: s.chunk.chunkText,
      pageNumber: s.chunk.pageNumber,
      sectionRef: s.chunk.sectionRef || `Page ${s.chunk.pageNumber}`,
      similarity: s.score > 0 ? 0.75 : 0.5,
    }));
  }
}

export const documentRetrievalService = new DocumentRetrievalService();
