import crypto from 'crypto';
import { BadRequestError, NotFoundError } from '../../common/errors.js';
import { getAIProvider } from '../../infrastructure/ai/ai.factory.js';
import {
  DetailedPaperAnalysisResponse,
  PaperInputData,
} from '../../infrastructure/ai/ai.interface.js';
import { prisma } from '../../infrastructure/database/prisma.js';

export interface QuestionAnalysisDto {
  id: string;
  documentId: string;
  repeatedQuestions: string[];
  repeatedTopics: string[];
  highWeightageUnits: string[];
  questionFrequency: Record<string, number>;
  createdAt: string;
  analysis?: DetailedPaperAnalysisResponse;
}

export class QuestionAnalysisService {
  public async analyzePreviousPapers(
    userId: string,
    paperIds: string[],
    subjectId?: string
  ): Promise<QuestionAnalysisDto> {
    if (!paperIds || paperIds.length === 0) {
      throw new BadRequestError('At least one previous paper ID must be specified.');
    }

    const documents = await prisma.document.findMany({
      where: {
        id: { in: paperIds },
        isDeleted: false,
      },
      include: {
        chunks: { orderBy: { chunkIndex: 'asc' } },
        subject: true,
      },
    });

    if (documents.length === 0) {
      throw new NotFoundError('None of the specified previous papers were found.');
    }

    // Try to get year from document name or metadata if present
    const papersInput: PaperInputData[] = documents.map((doc) => {
      const yearMatch = (doc.originalName || doc.fileName).match(/\b(19\d\d|20\d\d)\b/);
      const text =
        doc.chunks.length > 0
          ? doc.chunks.map((c) => c.chunkText).join('\n')
          : doc.originalName;

      return {
        paperName: doc.originalName || doc.fileName,
        year: yearMatch ? yearMatch[1] : undefined,
        text,
      };
    });

    // Optionally fetch syllabus / notes context to assist topic classification
    let notesContext = '';
    const targetSubjectId = subjectId || documents[0].subjectId;
    if (targetSubjectId) {
      const studyNotes = await prisma.document.findMany({
        where: {
          subjectId: targetSubjectId,
          documentType: 'StudyMaterial',
          isDeleted: false,
        },
        include: { chunks: { take: 5 } },
        take: 3,
      });

      if (studyNotes.length > 0) {
        notesContext = studyNotes
          .map((n) => `[Study Note: ${n.originalName}]\n` + n.chunks.map((c) => c.chunkText).join('\n'))
          .join('\n\n');
      }
    }

    const ai = getAIProvider();
    const result = await ai.analyzePreviousPapers(papersInput, notesContext);
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

    // Persist ImportantTopics extracted from the PYQ analysis
    if (primaryDoc.subjectId && result.importantTopics) {
      for (const item of result.importantTopics) {
        const existing = await prisma.importantTopic.findFirst({
          where: {
            subjectId: primaryDoc.subjectId,
            topic: { equals: item.topic, mode: 'insensitive' },
          },
        });

        if (!existing) {
          await prisma.importantTopic.create({
            data: {
              userId,
              subjectId: primaryDoc.subjectId,
              analysisGroupId,
              topic: item.topic,
              frequency: item.frequency,
              importanceLevel: item.importanceLevel,
              supportingDocumentIds: JSON.stringify(paperIds),
            },
          });
        }
      }
    }

    const repeatedQStrings = result.repeatedQuestions?.map((rq) => rq.canonicalQuestion) || [];
    const repeatedTopicStrings = result.topicFrequency?.map((t) => t.topic) || [];
    const highWeightage = result.topicFrequency?.filter((t) => t.priority === 'High').map((t) => t.topic) || [];
    const freqMap: Record<string, number> = {};
    result.topicFrequency?.forEach((t) => {
      freqMap[t.topic] = t.count;
    });

    return {
      id: record.id,
      documentId: primaryDoc.id,
      repeatedQuestions: repeatedQStrings,
      repeatedTopics: repeatedTopicStrings,
      highWeightageUnits: highWeightage,
      questionFrequency: freqMap,
      createdAt: record.createdAt.toISOString(),
      analysis: result,
    };
  }

  public async getLatestAnalysis(userId: string, subjectId?: string): Promise<QuestionAnalysisDto | null> {
    const whereClause: any = { userId };
    if (subjectId) {
      whereClause.document = { subjectId };
    }

    const analysis = await prisma.questionAnalysis.findFirst({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    if (!analysis) return null;

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
      analysis: parseJson(analysis.analysisJson, undefined),
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
      analysis: parseJson(analysis.analysisJson, undefined),
    };
  }
}

export const questionAnalysisService = new QuestionAnalysisService();

