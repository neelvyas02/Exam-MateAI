import crypto from 'crypto';
import { config } from '../../config/index.js';
import { getAIProvider } from '../../infrastructure/ai/ai.factory.js';
import { embeddingService } from '../../infrastructure/ai/embedding.service.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { logger } from '../../infrastructure/logging/logger.js';
import { storageService } from '../../infrastructure/supabase/storage.js';
import { ChunkItem, createDocumentChunks } from './chunker.js';
import { DocumentExtractor, DocumentExtractionResult } from './document-extractor.js';
import { PipelineTracker } from './pipeline-tracker.js';

export class DocumentProcessingService {
  /**
   * Processes an uploaded document end-to-end with high throughput:
   * 1. Download & Text extraction (cached if already extracted)
   * 2. Text cleaning & Chunking
   * 3. Batch Vector Embedding Generation (concurrent)
   * 4. Multi-row Database & pgvector persistence
   * 5. Immediate status transition to 'Ready' (Document is instantly usable for Q&A)
   * 6. Concurrent background metadata & summary generation
   */
  public async processDocument(documentId: string, customRequestId?: string): Promise<void> {
    const tracker = new PipelineTracker(documentId, customRequestId);

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { subject: true, chapter: true, chunks: { select: { id: true }, take: 1 } },
    });

    if (!document) {
      logger.warn({ documentId }, '[DocumentProcessing] Document not found for processing.');
      return;
    }

    try {
      logger.info(
        { requestId: tracker.requestId, documentId, filename: document.originalName },
        '[DocumentProcessing] Starting accelerated document processing pipeline'
      );

      // Fast-path: If document is already Ready and has indexed chunks, avoid duplicate work
      if (document.processingStatus === 'Ready' && document.chunks.length > 0) {
        tracker.startStage('DuplicateCheck');
        tracker.endStage('DuplicateCheck', 'skipped', { reason: 'Already indexed and Ready' });
        tracker.logComplete('Ready');
        return;
      }

      // Stage 1: Text Extraction
      tracker.startStage('TextExtraction');
      await prisma.document.update({
        where: { id: documentId },
        data: {
          processingStatus: 'Processing',
          processingStage: 'ExtractingText',
        },
      });

      const fileBuffer = await storageService.downloadFile(
        document.storagePath || document.fileName
      );

      const extraction: DocumentExtractionResult = await DocumentExtractor.extract(
        fileBuffer,
        document.originalName
      );

      tracker.endStage('TextExtraction', 'success', {
        pageCount: extraction.unitCount,
        extractedLength: extraction.fullText.length,
      });

      // Stage 2: Chunking & Text Cleaning
      tracker.startStage('Chunking');
      await prisma.document.update({
        where: { id: documentId },
        data: {
          processingStage: 'Chunking',
          pageCount: extraction.unitCount > 0 ? extraction.unitCount : 1,
          extractedTextLength: extraction.fullText.length,
          title: document.title || extraction.title || document.originalName,
          author: document.author || extraction.author || 'Academic Material',
        },
      });

      const chunks: ChunkItem[] = createDocumentChunks(
        extraction.sections,
        config.processing.chunkSize,
        config.processing.chunkOverlap
      );

      tracker.endStage('Chunking', 'success', { chunkCount: chunks.length });

      // Clean old chunks if re-processing
      if (document.chunks.length > 0) {
        await prisma.documentChunk.deleteMany({ where: { documentId } });
      }

      // Stage 3: Batch Vector Embedding Generation
      tracker.startStage('EmbeddingGeneration');
      let embeddings: number[][] = [];
      if (embeddingService.isConfigured && chunks.length > 0) {
        try {
          const chunkTexts = chunks.map((c) => c.chunkText);
          embeddings = await embeddingService.generateChunkEmbeddings(chunkTexts);
          tracker.endStage('EmbeddingGeneration', 'success', {
            count: embeddings.length,
            model: embeddingService.embeddingModel,
          });
        } catch (embErr: any) {
          tracker.endStage('EmbeddingGeneration', 'failed', { error: embErr.message });
          logger.warn(
            { error: embErr.message, documentId },
            '[DocumentProcessing] Embedding failed, continuing with lexical chunks'
          );
        }
      } else {
        tracker.endStage('EmbeddingGeneration', 'skipped');
      }

      // Stage 4: High-Performance Multi-Row Database Persistence
      tracker.startStage('VectorStorage');
      await this.saveChunksBatch(documentId, chunks, embeddings);
      tracker.endStage('VectorStorage', 'success', { chunksPersisted: chunks.length });

      // Stage 5: IMMEDIATE READINESS FOR Q&A
      // Once chunks and vectors are stored, the document is 100% indexed and can answer student questions!
      tracker.startStage('MarkReady');
      await prisma.document.update({
        where: { id: documentId },
        data: {
          processingStatus: 'Ready',
          processingStage: 'Ready',
          processingError: null,
        },
      });
      tracker.endStage('MarkReady', 'success');

      tracker.logComplete('Ready');
      logger.info(
        { documentId, totalTimeMs: tracker.getSummary().totalDurationMs },
        '[DocumentProcessing] Document is now READY for AI Q&A and vector search'
      );

      // Stage 6: Non-blocking Background Enrichment (Metadata, Summaries, PYQ Analysis)
      // Runs concurrently in background so user does not wait!
      this.runDocumentEnrichment(document, extraction, tracker).catch((enrichErr: any) => {
        logger.warn(
          { error: enrichErr.message, documentId },
          '[DocumentProcessing] Background enrichment encountered error, document remains Ready'
        );
      });
    } catch (err: any) {
      logger.error({ error: err.message, documentId }, '[DocumentProcessing] Processing failed');
      await prisma.document.update({
        where: { id: documentId },
        data: {
          processingStatus: 'Failed',
          processingStage: 'Failed',
          processingError: err.message,
        },
      });
      tracker.logComplete('Failed');
    }
  }

  /**
   * High performance multi-row batch insert for document chunks.
   * Replaces hundreds of individual round-trips with 2-4 batched SQL queries.
   */
  private async saveChunksBatch(
    documentId: string,
    chunks: ChunkItem[],
    embeddings: number[][]
  ): Promise<void> {
    if (chunks.length === 0) return;

    const batchSize = 50;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const sliceChunks = chunks.slice(i, i + batchSize);
      const sliceEmbeddings = embeddings.slice(i, i + batchSize);

      const valuesClauses: string[] = [];
      const params: any[] = [];
      let pIdx = 1;

      for (let j = 0; j < sliceChunks.length; j++) {
        const c = sliceChunks[j];
        const emb = sliceEmbeddings[j] || null;
        const id = crypto.randomUUID();
        const vectorStr = emb ? `[${emb.join(',')}]` : null;
        const embJson = emb ? JSON.stringify(emb) : null;
        const embModel = emb ? embeddingService.embeddingModel : null;

        valuesClauses.push(
          `($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}::vector, NOW())`
        );

        params.push(
          id,
          documentId,
          c.chunkIndex,
          c.chunkText,
          c.pageNumber,
          c.sectionRef,
          embModel,
          emb !== null,
          embJson,
          vectorStr
        );
      }

      try {
        const sql = `INSERT INTO "DocumentChunk" ("id", "documentId", "chunkIndex", "chunkText", "pageNumber", "sectionRef", "embeddingModel", "embeddingGenerated", "embeddingJson", "embedding", "createdAt") VALUES ${valuesClauses.join(', ')}`;
        await prisma.$executeRawUnsafe(sql, ...params);
      } catch (rawErr: any) {
        logger.warn(
          { error: rawErr.message, batchIndex: i },
          '[DocumentProcessing] Raw vector batch insert failed, using createMany fallback'
        );

        // Fallback: Prisma createMany for portable insertion
        await prisma.documentChunk.createMany({
          data: sliceChunks.map((c, idx) => {
            const emb = sliceEmbeddings[idx] || null;
            return {
              documentId,
              chunkIndex: c.chunkIndex,
              chunkText: c.chunkText,
              pageNumber: c.pageNumber,
              sectionRef: c.sectionRef,
              embeddingModel: emb ? embeddingService.embeddingModel : null,
              embeddingGenerated: emb !== null,
              embeddingJson: emb ? JSON.stringify(emb) : null,
            };
          }),
        });
      }
    }
  }

  /**
   * Concurrently computes metadata, summaries, and PYQ analysis in the background.
   */
  private async runDocumentEnrichment(
    document: any,
    extraction: DocumentExtractionResult,
    tracker: PipelineTracker
  ): Promise<void> {
    tracker.startStage('BackgroundEnrichment');
    try {
      const ai = getAIProvider();

      // Parallel execution of metadata and summaries
      const [aiMetadataRes, shortSummaryRes, detailedSummaryRes, paperAnalysisRes] =
        await Promise.allSettled([
          ai.analyzeDocumentMetadata(document.originalName, extraction.fullText),
          ai.generateSummary(extraction.fullText, 'Short'),
          ai.generateSummary(extraction.fullText, 'Detailed'),
          document.documentType === 'PreviousPaper'
            ? ai.analyzePreviousPapers([extraction.fullText])
            : Promise.resolve(null),
        ]);

      const aiMetadata = aiMetadataRes.status === 'fulfilled' ? aiMetadataRes.value : null;
      const shortSummary = shortSummaryRes.status === 'fulfilled' ? shortSummaryRes.value : null;
      const detailedSummary = detailedSummaryRes.status === 'fulfilled' ? detailedSummaryRes.value : null;
      const paperAnalysis = paperAnalysisRes.status === 'fulfilled' ? paperAnalysisRes.value : null;

      // Update Document Metadata
      if (aiMetadata) {
        await prisma.document.update({
          where: { id: document.id },
          data: {
            materialName: aiMetadata.materialName || document.originalName,
            materialType: aiMetadata.materialType,
            description: aiMetadata.description,
            summary: aiMetadata.summary,
            topicsJson: JSON.stringify(aiMetadata.topics || []),
            keyConceptsJson: JSON.stringify(aiMetadata.keyConcepts || []),
            importantPointsJson: JSON.stringify(aiMetadata.importantPoints || []),
            confidenceJson: JSON.stringify({ topicConfidence: aiMetadata.topicConfidence }),
          },
        });

        // Save Important Topics
        if (document.subjectId && aiMetadata.topics && aiMetadata.topics.length > 0) {
          for (const topic of aiMetadata.topics) {
            const exists = await prisma.importantTopic.findFirst({
              where: {
                subjectId: document.subjectId,
                topic: { equals: topic, mode: 'insensitive' },
              },
            });

            if (!exists) {
              await prisma.importantTopic.create({
                data: {
                  userId: document.userId,
                  subjectId: document.subjectId,
                  topic,
                  frequency: 3,
                  importanceLevel: 'High',
                  supportingDocumentIds: JSON.stringify([document.id]),
                },
              });
            }
          }
        }
      }

      // Save Summaries
      if (shortSummary || detailedSummary) {
        await prisma.summary.deleteMany({ where: { documentId: document.id } });
        const summariesToCreate = [];
        if (shortSummary) {
          summariesToCreate.push({
            userId: document.userId,
            documentId: document.id,
            summaryType: 'Short',
            content: shortSummary,
            aiProvider: config.ai.provider,
          });
        }
        if (detailedSummary) {
          summariesToCreate.push({
            userId: document.userId,
            documentId: document.id,
            summaryType: 'Detailed',
            content: detailedSummary,
            aiProvider: config.ai.provider,
          });
        }
        if (summariesToCreate.length > 0) {
          await prisma.summary.createMany({ data: summariesToCreate });
        }
      }

      // Save PreviousPaper Analysis
      if (paperAnalysis) {
        await prisma.questionAnalysis.deleteMany({ where: { documentId: document.id } });
        await prisma.questionAnalysis.create({
          data: {
            userId: document.userId,
            documentId: document.id,
            repeatedQuestions: JSON.stringify(paperAnalysis.repeatedQuestions || []),
            repeatedTopics: JSON.stringify(paperAnalysis.repeatedTopics || []),
            highWeightageUnits: JSON.stringify(paperAnalysis.highWeightageUnits || []),
            topicFrequency: JSON.stringify(paperAnalysis.questionFrequency || {}),
            analysisJson: JSON.stringify(paperAnalysis),
          },
        });
      }

      tracker.endStage('BackgroundEnrichment', 'success');
    } catch (err: any) {
      tracker.endStage('BackgroundEnrichment', 'failed', { error: err.message });
      logger.warn(
        { error: err.message, documentId: document.id },
        '[DocumentProcessing] Background enrichment partially failed, but document is already Ready'
      );
    }
  }
}

export const documentProcessingService = new DocumentProcessingService();
