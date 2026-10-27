import crypto from 'crypto';
import { BadRequestError, NotFoundError } from '../../common/errors.js';
import { getAIProvider } from '../../infrastructure/ai/ai.factory.js';
import { prisma } from '../../infrastructure/database/prisma.js';

export interface QuestionAnalysisDto {
  id: string;
  documentId: string;
  repeatedQuestions: string[];
  repeatedTopics: string[];
  highWeightageUnits: string[];
  questionFrequency: Record<string, number>;
  createdAt: string;
}

export class QuestionAnalysisService {
  public async analyzePreviousPapers(userId: string, paperIds: string[]): Promise<QuestionAnalysisDto> {
    if (!paperIds || paperIds.length === 0) {
      throw new BadRequestError('At least one previous paper ID must be specified.');
    }

    const documents = await prisma.document.findMany({
      where: {
        id: { in: paperIds },
        isDeleted: false,
      },
      include: { chunks: true },
    });

    if (documents.length === 0) {
      throw new NotFoundError('None of the specified previous papers were found.');
    }

    const paperTexts = documents.map((doc) => {
      if (doc.chunks.length > 0) {
        return doc.chunks.map((c) => c.chunkText).join('\n');
      }
      return doc.originalName;
    });

    const ai = getAIProvider();
    const result = await ai.analyzePreviousPapers(paperTexts);
    const analysisGroupId = crypto.randomUUID();

    // Persist analysis for the primary document or each document
    const primaryDoc = documents[0];
    const record = await prisma.questionAnalysis.create({
      data: {
        userId,
        analysisGroupId,
        documentId: primaryDoc.id,
        repeatedQuestions: JSON.stringify(result.repeatedQuestions || []),
        repeatedTopics: JSON.stringify(result.repeatedTopics || []),
        highWeightageUnits: JSON.stringify(result.highWeightageUnits || []),
        topicFrequency: JSON.stringify(result.questionFrequency || {}),
        analysisJson: JSON.stringify(result),
      },
    });

    // Also persist ImportantTopics extracted from the PYQ analysis
    if (primaryDoc.subjectId && result.repeatedTopics) {
      for (const topic of result.repeatedTopics) {
        const existing = await prisma.importantTopic.findFirst({
          where: {
            subjectId: primaryDoc.subjectId,
            topic: { equals: topic, mode: 'insensitive' },
          },
        });

        if (!existing) {
          await prisma.importantTopic.create({
            data: {
              userId,
              subjectId: primaryDoc.subjectId,
              analysisGroupId,
              topic,
              frequency: result.questionFrequency?.[topic] || 3,
              importanceLevel: 'High',
              supportingDocumentIds: JSON.stringify(paperIds),
            },
          });
        }
      }
    }

    return {
      id: record.id,
      documentId: primaryDoc.id,
      repeatedQuestions: result.repeatedQuestions || [],
      repeatedTopics: result.repeatedTopics || [],
      highWeightageUnits: result.highWeightageUnits || [],
      questionFrequency: result.questionFrequency || {},
      createdAt: record.createdAt.toISOString(),
    };
  }

  public async getAnalysisByDocumentId(documentId: string): Promise<QuestionAnalysisDto> {
    const analysis = await prisma.questionAnalysis.findFirst({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });

    if (!analysis) {
      throw new NotFoundError('No question analysis found for this document.');
    }

    const parseJson = (str: string, fallback: any) => {
      try {
        return JSON.parse(str);
      } catch {
        return fallback;
      }
    };

    return {
      id: analysis.id,
      documentId: analysis.documentId,
      repeatedQuestions: parseJson(analysis.repeatedQuestions, []),
      repeatedTopics: parseJson(analysis.repeatedTopics, []),
      highWeightageUnits: parseJson(analysis.highWeightageUnits, []),
      questionFrequency: parseJson(analysis.topicFrequency, {}),
      createdAt: analysis.createdAt.toISOString(),
    };
  }
}

export const questionAnalysisService = new QuestionAnalysisService();
