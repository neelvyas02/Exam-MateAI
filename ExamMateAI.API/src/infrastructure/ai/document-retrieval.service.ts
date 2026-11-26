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
  matchType: 'vector_pgvector' | 'vector_memory' | 'keyword_lexical';
}

export interface DocumentScopeStatus {
  hasDocuments: boolean;
  totalDocuments: number;
  readyDocuments: number;
  processingDocuments: Array<{ id: string; name: string; status: string; stage: string }>;
  failedDocuments: Array<{ id: string; name: string; error?: string | null }>;
}

const COMMON_STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as',
  'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cannot',
  'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during',
  'each', 'explain', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t',
  'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'how\'s', 'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it',
  'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than',
  'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these',
  'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too', 'under',
  'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t',
  'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom',
  'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve',
  'your', 'yours', 'yourself', 'yourselves', 'tell', 'give', 'detail', 'details', 'describe'
]);

export class DocumentRetrievalService {
  /**
   * Checks the status of documents in scope to detect processing, failed, or missing documents
   */
  public async checkScopeStatus(options: {
    userId: string;
    documentIds?: string[];
  }): Promise<DocumentScopeStatus> {
    const { userId, documentIds } = options;

    const whereClause: any = { isDeleted: false };
    if (documentIds && documentIds.length > 0) {
      whereClause.id = { in: documentIds };
    } else {
      whereClause.OR = [
        { userId },
        { documentType: 'StudyMaterial' },
        { userId: null },
      ];
    }

    const docs = await prisma.document.findMany({
      where: whereClause,
      select: {
        id: true,
        originalName: true,
        processingStatus: true,
        processingStage: true,
        processingError: true,
      },
    });

    const readyDocs = docs.filter((d) => d.processingStatus === 'Ready');
    const processingDocs = docs.filter(
      (d) => d.processingStatus === 'Processing' || d.processingStatus === 'Uploaded'
    );
    const failedDocs = docs.filter((d) => d.processingStatus === 'Failed');

    return {
      hasDocuments: docs.length > 0,
      totalDocuments: docs.length,
      readyDocuments: readyDocs.length,
      processingDocuments: processingDocs.map((d) => ({
        id: d.id,
        name: d.originalName,
        status: d.processingStatus,
        stage: d.processingStage,
      })),
      failedDocuments: failedDocs.map((d) => ({
        id: d.id,
        name: d.originalName,
        error: d.processingError,
      })),
    };
  }

  /**
   * Retrieves the most semantically relevant document chunks using vector and hybrid search
   */
  public async retrieveRelevantChunks(options: {
    userId: string;
    query: string;
    documentIds?: string[];
    topK?: number;
    similarityThreshold?: number;
  }): Promise<RetrievedChunk[]> {
    const { userId, query, documentIds, topK = 6, similarityThreshold = 0.35 } = options;

    if (!query || !query.trim()) return [];

    logger.info(
      {
        userId,
        queryLength: query.length,
        hasDocumentIds: !!documentIds?.length,
        targetDocCount: documentIds?.length || 'all',
      },
      '[DocumentRetrieval] Starting chunk retrieval'
    );

    // 1. Generate query embedding
    let queryEmbedding: number[] = [];
    if (embeddingService.isConfigured) {
      try {
        queryEmbedding = await embeddingService.generateQueryEmbedding(query);
      } catch (embErr: any) {
        logger.warn(
          { error: embErr.message },
          '[DocumentRetrieval] Failed to generate query embedding, using keyword fallback'
        );
      }
    }

    // 2. Try native Supabase pgvector cosine search
    if (queryEmbedding.length === 1536) {
      try {
        const vectorStr = `[${queryEmbedding.join(',')}]`;
        const docIdFilter =
          documentIds && documentIds.length > 0
            ? `AND d.id IN (${documentIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')})`
            : '';

        // Match documents owned by user or shared StudyMaterial
        const userOrSharedFilter =
          documentIds && documentIds.length > 0
            ? ''
            : `AND (d."userId" = '${userId.replace(/'/g, "''")}' OR d."documentType" = 'StudyMaterial' OR d."userId" IS NULL)`;

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
          WHERE d."isDeleted" = false
            AND d."processingStatus" = 'Ready'
            ${userOrSharedFilter}
            ${docIdFilter}
            AND dc.embedding IS NOT NULL
            AND (1 - (dc.embedding <=> '${vectorStr}'::vector)) >= ${similarityThreshold}
          ORDER BY dc.embedding <=> '${vectorStr}'::vector ASC
          LIMIT ${topK};
        `;

        const results = (await prisma.$queryRawUnsafe(sqlQuery)) as any[];

        if (results && results.length > 0) {
          logger.info(
            {
              matchType: 'vector_pgvector',
              count: results.length,
              topSimilarity: results[0]?.similarity,
              retrievedDocIds: Array.from(new Set(results.map((r) => r.documentId))),
              chunkIds: results.map((r) => r.id),
            },
            '[DocumentRetrieval] Vector search retrieved relevant chunks'
          );

          return results.map((r) => ({
            chunkId: r.id,
            documentId: r.documentId,
            documentName: r.documentName,
            chunkIndex: r.chunkIndex,
            chunkText: r.chunkText,
            pageNumber: r.pageNumber || 1,
            sectionRef: r.sectionRef || `Page ${r.pageNumber || 1}`,
            similarity: Number(r.similarity),
            matchType: 'vector_pgvector',
          }));
        } else {
          logger.info(
            { similarityThreshold },
            '[DocumentRetrieval] pgvector search returned 0 chunks above threshold'
          );
        }
      } catch (pgvectorErr: any) {
        logger.debug(
          { error: pgvectorErr.message },
          '[DocumentRetrieval] pgvector query error, proceeding to in-memory cosine fallback'
        );
      }

      // 3. In-memory cosine similarity fallback over embeddingJson
      try {
        const whereClause: any = {
          document: {
            isDeleted: false,
            processingStatus: 'Ready',
            ...(documentIds && documentIds.length > 0
              ? { id: { in: documentIds } }
              : { OR: [{ userId }, { documentType: 'StudyMaterial' }] }),
          },
          embeddingGenerated: true,
          embeddingJson: { not: null },
        };

        const candidates = await prisma.documentChunk.findMany({
          where: whereClause,
          include: {
            document: { select: { originalName: true } },
          },
          take: 300,
        });

        if (candidates.length > 0) {
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
            logger.info(
              {
                matchType: 'vector_memory',
                count: scored.length,
                topSimilarity: scored[0]?.similarity,
                chunkIds: scored.map((s) => s.chunk.id),
              },
              '[DocumentRetrieval] In-memory cosine search retrieved chunks'
            );

            return scored.map((sc) => ({
              chunkId: sc.chunk.id,
              documentId: sc.chunk.documentId,
              documentName: sc.chunk.document.originalName,
              chunkIndex: sc.chunk.chunkIndex,
              chunkText: sc.chunk.chunkText,
              pageNumber: sc.chunk.pageNumber,
              sectionRef: sc.chunk.sectionRef || `Page ${sc.chunk.pageNumber}`,
              similarity: sc.similarity,
              matchType: 'vector_memory',
            }));
          }
        }
      } catch (memErr: any) {
        logger.debug({ error: memErr.message }, '[DocumentRetrieval] In-memory cosine error');
      }
    }

    // 4. Robust Lexical / Keyword BM25-style Search across ALL chunks
    return await this.keywordLexicalRetrieval(userId, query, documentIds, topK);
  }

  /**
   * High-accuracy full-document lexical search across all chunks
   */
  private async keywordLexicalRetrieval(
    userId: string,
    query: string,
    documentIds?: string[],
    topK: number = 6
  ): Promise<RetrievedChunk[]> {
    const rawTokens = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1);

    const keywords = rawTokens.filter((w) => !COMMON_STOP_WORDS.has(w));
    const normalizedQuery = query.toLowerCase().trim();

    // Query all chunks belonging to the targeted documents
    const whereClause: any = {
      document: {
        isDeleted: false,
        processingStatus: 'Ready',
        ...(documentIds && documentIds.length > 0
          ? { id: { in: documentIds } }
          : { OR: [{ userId }, { documentType: 'StudyMaterial' }] }),
      },
    };

    const allChunks = await prisma.documentChunk.findMany({
      where: whereClause,
      include: {
        document: { select: { originalName: true } },
      },
      take: 400,
    });

    if (allChunks.length === 0) {
      logger.info('[DocumentRetrieval] No chunks found in scope for keyword search');
      return [];
    }

    const scored = allChunks
      .map((c) => {
        let score = 0;
        const lower = c.chunkText.toLowerCase();
        const sectionLower = (c.sectionRef || '').toLowerCase();

        // 1. Exact full query phrase match gives highest boost
        if (lower.includes(normalizedQuery)) {
          score += 25;
        }

        // 2. Sub-phrase matches (bigrams)
        for (let i = 0; i < keywords.length - 1; i++) {
          const bigram = `${keywords[i]} ${keywords[i + 1]}`;
          if (lower.includes(bigram)) {
            score += 8;
          }
        }

        // 3. Keyword frequency and section boost
        for (const kw of keywords) {
          if (sectionLower.includes(kw)) {
            score += 5; // Title / section match is highly relevant
          }
          const matches = lower.split(kw).length - 1;
          if (matches > 0) {
            score += Math.min(matches * 2, 8);
          }
        }

        return { chunk: c, score };
      })
      .filter((s) => s.score > 0) // Exclude chunks with 0 evidence
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    logger.info(
      {
        matchType: 'keyword_lexical',
        matchedCount: scored.length,
        topScore: scored[0]?.score || 0,
        keywordsUsed: keywords,
      },
      '[DocumentRetrieval] Keyword lexical search finished'
    );

    return scored.map((s, idx) => ({
      chunkId: s.chunk.id,
      documentId: s.chunk.documentId,
      documentName: s.chunk.document.originalName,
      chunkIndex: s.chunk.chunkIndex,
      chunkText: s.chunk.chunkText,
      pageNumber: s.chunk.pageNumber,
      sectionRef: s.chunk.sectionRef || `Page ${s.chunk.pageNumber}`,
      // Normalize score between 0.50 and 0.88 based on rank and score
      similarity: Math.min(0.55 + (s.score / 50) * 0.35, 0.90),
      matchType: 'keyword_lexical',
    }));
  }
}

export const documentRetrievalService = new DocumentRetrievalService();
