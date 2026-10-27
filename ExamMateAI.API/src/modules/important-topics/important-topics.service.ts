import { prisma } from '../../infrastructure/database/prisma.js';

export interface ImportantTopicDto {
  id: string;
  subjectId?: string | null;
  subjectName?: string | null;
  topic: string;
  frequency: number;
  importanceLevel: string;
  supportingDocumentIds: string[];
  createdAt: string;
}

export class ImportantTopicsService {
  public async getTopicsBySubject(subjectId?: string): Promise<ImportantTopicDto[]> {
    const topics = await prisma.importantTopic.findMany({
      where: subjectId ? { subjectId } : undefined,
      include: { subject: true },
      orderBy: { frequency: 'desc' },
    });

    return topics.map((t) => {
      let docIds: string[] = [];
      try {
        docIds = t.supportingDocumentIds ? JSON.parse(t.supportingDocumentIds) : [];
      } catch {
        docIds = [];
      }

      return {
        id: t.id,
        subjectId: t.subjectId,
        subjectName: t.subject?.name || null,
        topic: t.topic,
        frequency: t.frequency,
        importanceLevel: t.importanceLevel,
        supportingDocumentIds: docIds,
        createdAt: t.createdAt.toISOString(),
      };
    });
  }
}

export const importantTopicsService = new ImportantTopicsService();
