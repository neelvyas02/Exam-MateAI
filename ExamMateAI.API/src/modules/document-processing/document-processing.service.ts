import { config } from '../../config/index.js';
import { getAIProvider } from '../../infrastructure/ai/ai.factory.js';
import { embeddingService } from '../../infrastructure/ai/embedding.service.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { logger } from '../../infrastructure/logging/logger.js';
import { storageService } from '../../infrastructure/supabase/storage.js';
import { createDocumentChunks } from './chunker.js';
import { DocumentExtractor } from './document-extractor.js';

export class DocumentProcessingService {
  public async processDocument(documentId: string): Promise<void> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { subject: true, chapter: true },
    });

    if (!document) {
      logger.warn({ documentId }, '[DocumentProcessing] Document not found for processing.');
      return;
    }

    try {
      logger.info({ documentId, filename: document.originalName }, '[DocumentProcessing] Starting document processing pipeline.');

      // Stage 1: ExtractingText
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

      const extraction = await DocumentExtractor.extract(fileBuffer, document.originalName);

      await prisma.document.update({
        where: { id: documentId },
        data: {
          pageCount: extraction.unitCount > 0 ? extraction.unitCount : 1,
          extractedTextLength: extraction.fullText.length,
          title: document.title || extraction.title || document.originalName,
          author: document.author || extraction.author || 'Academic Material',
        },
      });

      // Stage 2: Chunking & Embedding Generation
      await prisma.document.update({
        where: { id: documentId },
        data: { processingStage: 'Chunking' },
      });

      const chunks = createDocumentChunks(
        extraction.sections,
        config.processing.chunkSize,
        config.processing.chunkOverlap
      );

      // Clean existing chunks if re-processing
      await prisma.documentChunk.deleteMany({ where: { documentId } });

      // Generate OpenAI embeddings for semantic RAG search
      let embeddings: number[][] = [];
      if (embeddingService.isConfigured && chunks.length > 0) {
        try {
          const chunkTexts = chunks.map((c) => c.chunkText);
          embeddings = await embeddingService.generateChunkEmbeddings(chunkTexts);
          logger.info({ count: embeddings.length, model: embeddingService.embeddingModel }, '[DocumentProcessing] OpenAI embeddings generated.');
        } catch (embErr: any) {
          logger.warn({ error: embErr.message }, '[DocumentProcessing] Failed generating embeddings, continuing with text chunks.');
        }
      }

      // Save chunks to database
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        const emb = embeddings[i] || null;

        const createdChunk = await prisma.documentChunk.create({
          data: {
            documentId,
            chunkIndex: c.chunkIndex,
            chunkText: c.chunkText,
            pageNumber: c.pageNumber,
            sectionRef: c.sectionRef,
            embeddingModel: emb ? embeddingService.embeddingModel : null,
            embeddingGenerated: emb !== null,
            embeddingJson: emb ? JSON.stringify(emb) : null,
          },
        });

        // Store into pgvector column if available
        if (emb) {
          try {
            const vectorStr = `[${emb.join(',')}]`;
            await prisma.$executeRawUnsafe(
              `UPDATE "DocumentChunk" SET embedding = '${vectorStr}'::vector WHERE id = '${createdChunk.id}'`
            );
          } catch {
            // Silently keep embeddingJson if pgvector extension is not yet loaded
          }
        }
      }

      // Stage 3: Analyzing metadata with OpenAI
      await prisma.document.update({
        where: { id: documentId },
        data: { processingStage: 'AnalyzingQuestions' },
      });

      const ai = getAIProvider();
      const aiMetadata = await ai.analyzeDocumentMetadata(
        document.originalName,
        extraction.fullText
      );

      await prisma.document.update({
        where: { id: documentId },
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

      // Stage 4: Generating grounded summaries
      await prisma.document.update({
        where: { id: documentId },
        data: { processingStage: 'GeneratingSummary' },
      });

      const shortSummary = await ai.generateSummary(extraction.fullText, 'Short');
      const detailedSummary = await ai.generateSummary(extraction.fullText, 'Detailed');

      await prisma.summary.deleteMany({ where: { documentId } });

      await prisma.summary.createMany({
        data: [
          {
            userId: document.userId,
            documentId,
            summaryType: 'Short',
            content: shortSummary,
            aiProvider: config.ai.provider,
          },
          {
            userId: document.userId,
            documentId,
            summaryType: 'Detailed',
            content: detailedSummary,
            aiProvider: config.ai.provider,
          },
        ],
      });

      // Stage 5: Save Important Topics
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
                supportingDocumentIds: JSON.stringify([documentId]),
              },
            });
          }
        }
      }

      // Stage 6: If Previous Year Paper, run Question Analysis
      if (document.documentType === 'PreviousPaper') {
        const paperAnalysis = await ai.analyzePreviousPapers([extraction.fullText]);
        await prisma.questionAnalysis.deleteMany({ where: { documentId } });

        await prisma.questionAnalysis.create({
          data: {
            userId: document.userId,
            documentId,
            repeatedQuestions: JSON.stringify(paperAnalysis.repeatedQuestions || []),
            repeatedTopics: JSON.stringify(paperAnalysis.repeatedTopics || []),
            highWeightageUnits: JSON.stringify(paperAnalysis.highWeightageUnits || []),
            topicFrequency: JSON.stringify(paperAnalysis.questionFrequency || {}),
            analysisJson: JSON.stringify(paperAnalysis),
          },
        });
      }

      // Stage 7: Mark Ready
      await prisma.document.update({
        where: { id: documentId },
        data: {
          processingStatus: 'Ready',
          processingStage: 'Ready',
          processingError: null,
        },
      });

      logger.info({ documentId }, '[DocumentProcessing] Completed successfully with OpenAI embeddings.');
    } catch (err: any) {
      logger.error({ error: err.message, documentId }, '[DocumentProcessing] Processing failed.');
      await prisma.document.update({
        where: { id: documentId },
        data: {
          processingStatus: 'Failed',
          processingStage: 'Failed',
          processingError: err.message,
        },
      });
    }
  }
}

export const documentProcessingService = new DocumentProcessingService();
