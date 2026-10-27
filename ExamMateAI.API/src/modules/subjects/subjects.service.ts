import { ForbiddenError, NotFoundError } from '../../common/errors.js';
import { prisma } from '../../infrastructure/database/prisma.js';

export interface SubjectDto {
  id: string;
  name: string;
  semester: string;
  description?: string | null;
  documentCount: number;
  createdAt: string;
}

export class SubjectService {
  public async getAllSubjects(userId?: string): Promise<SubjectDto[]> {
    const subjects = await prisma.subject.findMany({
      where: userId
        ? {
            OR: [{ userId: null }, { userId }],
          }
        : undefined,
      include: {
        _count: {
          select: { documents: { where: { isDeleted: false } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    return subjects.map((s) => ({
      id: s.id,
      name: s.name,
      semester: s.semester || '',
      description: s.description,
      documentCount: s._count.documents,
      createdAt: s.createdAt.toISOString(),
    }));
  }

  public async getSubjectById(id: string): Promise<SubjectDto> {
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        _count: {
          select: { documents: { where: { isDeleted: false } } },
        },
      },
    });

    if (!subject) {
      throw new NotFoundError('Subject not found.');
    }

    return {
      id: subject.id,
      name: subject.name,
      semester: subject.semester || '',
      description: subject.description,
      documentCount: subject._count.documents,
      createdAt: subject.createdAt.toISOString(),
    };
  }

  public async createSubject(
    userId: string,
    data: { name: string; semester?: string; description?: string }
  ): Promise<SubjectDto> {
    const subject = await prisma.subject.create({
      data: {
        name: data.name,
        semester: data.semester || '',
        description: data.description,
        userId,
      },
    });

    return {
      id: subject.id,
      name: subject.name,
      semester: subject.semester || '',
      description: subject.description,
      documentCount: 0,
      createdAt: subject.createdAt.toISOString(),
    };
  }

  public async updateSubject(
    id: string,
    userId: string,
    isAdmin: boolean,
    data: { name: string; semester?: string; description?: string }
  ): Promise<SubjectDto> {
    const existing = await prisma.subject.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Subject not found.');
    }

    if (!isAdmin && existing.userId && existing.userId !== userId) {
      throw new ForbiddenError('You can only update subjects that you created.');
    }

    const updated = await prisma.subject.update({
      where: { id },
      data: {
        name: data.name,
        semester: data.semester,
        description: data.description,
      },
      include: {
        _count: {
          select: { documents: { where: { isDeleted: false } } },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      semester: updated.semester || '',
      description: updated.description,
      documentCount: updated._count.documents,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  public async deleteSubject(id: string, userId: string, isAdmin: boolean): Promise<void> {
    const existing = await prisma.subject.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Subject not found.');
    }

    if (!isAdmin && existing.userId && existing.userId !== userId) {
      throw new ForbiddenError('You can only delete subjects that you created.');
    }

    await prisma.subject.delete({ where: { id } });
  }
}

export const subjectService = new SubjectService();
