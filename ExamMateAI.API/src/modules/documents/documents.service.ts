import crypto from 'crypto';
import path from 'path';
import { ForbiddenError, NotFoundError } from '../../common/errors.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { jobQueue } from '../../infrastructure/queue/job-queue.js';
import { storageService } from '../../infrastructure/supabase/storage.js';

export interface DocumentDto {
  id: string;
  userId: string;
  subjectId: string;
  subjectName: string;
  chapterId?: string | null;
  chapterName?: string | null;
  chapterNumber?: string | null;
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileSize: number;
  pageCount: number;
  documentType: string;
  status: string;
  statusMessage?: string | null;
  author?: string | null;
  title?: string | null;
  materialName?: string | null;
  materialType?: string | null;
  description?: string | null;
  summary?: string | null;
  topics?: string[];
  keyConcepts?: string[];
  importantPoints?: string[];
  extractedTextLength: number;
  uploadedAt: string;
}

export class DocumentsService {
  public async uploadDocument(
    userId: string,
    file: Express.Multer.File,
    data: {
      subjectId?: string;
      chapterId?: string;
      documentType?: string; // 'StudyMaterial' | 'PreviousPaper' | 'Notes' | '0' | '1'
    }
  ): Promise<DocumentDto> {
    const rawDocType = String(data.documentType || 'StudyMaterial');
    const docType =
      rawDocType === '1' || rawDocType.toLowerCase() === 'previouspaper'
        ? 'PreviousPaper'
        : 'StudyMaterial';

    const fileExt = path.extname(file.originalname) || '.pdf';
    const uniqueFileName = `${crypto.randomUUID()}${fileExt}`;
    const storagePath = `${userId}/${uniqueFileName}`;

    // Upload to Supabase Storage (with safe local fallback)
    const storageResult = await storageService.uploadFile(
      file.buffer,
      storagePath,
      file.mimetype || 'application/pdf'
    );

    let document;
    try {
      document = await prisma.document.create({
        data: {
          userId,
          subjectId: data.subjectId || null,
          chapterId: data.chapterId || null,
          fileName: uniqueFileName,
          originalName: file.originalname,
          fileUrl: storageResult.publicUrl,
          storagePath: storageResult.path,
          fileSize: file.size,
          pageCount: 0,
          documentType: docType,
          processingStatus: 'Uploaded',
          processingStage: 'Uploaded',
          title: file.originalname,
        },
        include: {
          subject: true,
          chapter: true,
        },
      });
    } catch (dbErr) {
      // Clean up uploaded file if database persistence fails
      await storageService.deleteFile(storageResult.path);
      throw dbErr;
    }

    // Enqueue background processing job
    await jobQueue.addDocumentJob({
      documentId: document.id,
      userId,
      documentType: docType,
    });

    return this.toDocumentDto(document);
  }

  public async getUserDocuments(userId: string): Promise<DocumentDto[]> {
    const documents = await prisma.document.findMany({
      where: { userId, isDeleted: false },
      include: { subject: true, chapter: true },
      orderBy: { createdAt: 'desc' },
    });

    return documents.map((d) => this.toDocumentDto(d));
  }

  public async getPreviousPapers(subjectId?: string): Promise<DocumentDto[]> {
    const documents = await prisma.document.findMany({
      where: {
        documentType: 'PreviousPaper',
        isDeleted: false,
        subjectId: subjectId || undefined,
      },
      include: { subject: true, chapter: true },
      orderBy: { createdAt: 'desc' },
    });

    return documents.map((d) => this.toDocumentDto(d));
  }

  public async getDocumentById(id: string, userId?: string): Promise<DocumentDto> {
    const document = await prisma.document.findUnique({
      where: { id, isDeleted: false },
      include: { subject: true, chapter: true },
    });

    if (!document) {
      throw new NotFoundError('Document not found.');
    }

    return this.toDocumentDto(document);
  }

  public async getDocumentStatus(id: string): Promise<{
    id: string;
    processingStatus: string;
    processingStage: string;
    processingError?: string | null;
  }> {
    const document = await prisma.document.findUnique({
      where: { id, isDeleted: false },
      select: {
        id: true,
        processingStatus: true,
        processingStage: true,
        processingError: true,
      },
    });

    if (!document) {
      throw new NotFoundError('Document not found.');
    }

    return document;
  }

  public async getDocumentStream(
    id: string,
    userId: string,
    isAdmin: boolean
  ): Promise<{ buffer: Buffer; filename: string }> {
    const document = await prisma.document.findUnique({
      where: { id, isDeleted: false },
    });

    if (!document) {
      throw new NotFoundError('Document not found.');
    }

    if (!isAdmin && document.userId !== userId) {
      throw new ForbiddenError('You do not have access to view or download this document.');
    }

    const buffer = await storageService.downloadFile(
      document.storagePath || document.fileName
    );

    return {
      buffer,
      filename: document.originalName,
    };
  }

  public async deleteDocument(id: string, userId: string, isAdmin: boolean): Promise<void> {
    const document = await prisma.document.findUnique({
      where: { id, isDeleted: false },
    });

    if (!document) {
      throw new NotFoundError('Document not found.');
    }

    if (!isAdmin && document.userId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this document.');
    }

    await prisma.document.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    // Delete from storage
    if (document.storagePath) {
      await storageService.deleteFile(document.storagePath);
    }
  }

  private toDocumentDto(doc: any): DocumentDto {
    const parseJsonArray = (str?: string | null): string[] => {
      if (!str) return [];
      try {
        const parsed = JSON.parse(str);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    return {
      id: doc.id,
      userId: doc.userId,
      subjectId: doc.subjectId || '',
      subjectName: doc.subject?.name || 'General Subject',
      chapterId: doc.chapterId,
      chapterName: doc.chapter?.name,
      chapterNumber: doc.chapter?.number,
      fileName: doc.fileName,
      originalName: doc.originalName,
      fileUrl: doc.fileUrl,
      fileSize: doc.fileSize,
      pageCount: doc.pageCount,
      documentType: doc.documentType,
      status: doc.processingStage === 'Ready' ? 'Ready' : doc.processingStage || doc.processingStatus,
      statusMessage: doc.processingError
        ? `Error: ${doc.processingError}`
        : doc.processingStage === 'Ready'
        ? 'Processed successfully'
        : `Stage: ${doc.processingStage}`,
      author: doc.author,
      title: doc.title || doc.originalName,
      materialName: doc.materialName || doc.originalName,
      materialType: doc.materialType,
      description: doc.description,
      summary: doc.summary,
      topics: parseJsonArray(doc.topicsJson),
      keyConcepts: parseJsonArray(doc.keyConceptsJson),
      importantPoints: parseJsonArray(doc.importantPointsJson),
      extractedTextLength: doc.extractedTextLength,
      uploadedAt: doc.createdAt.toISOString(),
    };
  }
}

export const documentsService = new DocumentsService();
