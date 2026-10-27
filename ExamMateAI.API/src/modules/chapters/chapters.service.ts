import { NotFoundError } from '../../common/errors.js';
import { prisma } from '../../infrastructure/database/prisma.js';

export interface ChapterDto {
  id: string;
  subjectId: string;
  subjectName: string;
  number: string;
  name: string;
  description?: string | null;
  documentCount: number;
  createdAt: string;
}

export class ChapterService {
  public async getChaptersBySubject(subjectId: string): Promise<ChapterDto[]> {
    const chapters = await prisma.chapter.findMany({
      where: { subjectId },
      include: {
        subject: true,
        _count: {
          select: { documents: { where: { isDeleted: false } } },
        },
      },
      orderBy: { number: 'asc' },
    });

    return chapters.map((c) => ({
      id: c.id,
      subjectId: c.subjectId,
      subjectName: c.subject.name,
      number: c.number,
      name: c.name,
      description: c.description,
      documentCount: c._count.documents,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  public async getChapterById(id: string): Promise<ChapterDto> {
    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: {
        subject: true,
        _count: {
          select: { documents: { where: { isDeleted: false } } },
        },
      },
    });

    if (!chapter) {
      throw new NotFoundError('Chapter not found.');
    }

    return {
      id: chapter.id,
      subjectId: chapter.subjectId,
      subjectName: chapter.subject.name,
      number: chapter.number,
      name: chapter.name,
      description: chapter.description,
      documentCount: chapter._count.documents,
      createdAt: chapter.createdAt.toISOString(),
    };
  }

  public async createChapter(data: {
    subjectId: string;
    number: string;
    name: string;
    description?: string;
  }): Promise<ChapterDto> {
    const subject = await prisma.subject.findUnique({ where: { id: data.subjectId } });
    if (!subject) throw new NotFoundError('Subject not found.');

    const chapter = await prisma.chapter.create({
      data: {
        subjectId: data.subjectId,
        number: data.number,
        name: data.name,
        description: data.description,
      },
      include: { subject: true },
    });

    return {
      id: chapter.id,
      subjectId: chapter.subjectId,
      subjectName: chapter.subject.name,
      number: chapter.number,
      name: chapter.name,
      description: chapter.description,
      documentCount: 0,
      createdAt: chapter.createdAt.toISOString(),
    };
  }

  public async updateChapter(
    id: string,
    data: { number?: string; name?: string; description?: string }
  ): Promise<ChapterDto> {
    const chapter = await prisma.chapter.update({
      where: { id },
      data: {
        number: data.number,
        name: data.name,
        description: data.description,
      },
      include: {
        subject: true,
        _count: {
          select: { documents: { where: { isDeleted: false } } },
        },
      },
    });

    return {
      id: chapter.id,
      subjectId: chapter.subjectId,
      subjectName: chapter.subject.name,
      number: chapter.number,
      name: chapter.name,
      description: chapter.description,
      documentCount: chapter._count.documents,
      createdAt: chapter.createdAt.toISOString(),
    };
  }

  public async deleteChapter(id: string): Promise<void> {
    await prisma.chapter.delete({ where: { id } });
  }
}

export const chapterService = new ChapterService();
