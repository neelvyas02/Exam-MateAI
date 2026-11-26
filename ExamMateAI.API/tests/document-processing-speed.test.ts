import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { prisma } from '../src/infrastructure/database/prisma.js';
import { storageService } from '../src/infrastructure/supabase/storage.js';
import { documentProcessingService } from '../src/modules/document-processing/document-processing.service.js';
import { ragService } from '../src/infrastructure/ai/rag.service.js';

describe('Document Processing Pipeline Speed & Performance Benchmark', () => {
  const knownUserId = '8589edd4-ddc4-4fa1-a432-29476f735ad1';

  it('Benchmarking: End-to-end processing of academic document finishes with early Ready status and timing logs', async () => {
    // 1. Prepare sample PDF from local uploads
    const sampleFilename = '8589edd4-ddc4-4fa1-a432-29476f735ad1_ddc2ce08-63ad-436e-81c0-ec5997156f2d.pdf';
    const sampleFilePath = path.join(process.cwd(), 'uploads', sampleFilename);
    const pdfBuffer = fs.readFileSync(sampleFilePath);

    // Upload via storage service
    const targetStorageName = `speed_test_${Date.now()}.pdf`;
    const storageResult = await storageService.uploadFile(pdfBuffer, targetStorageName);

    // Create document in Database
    const testDoc = await prisma.document.create({
      data: {
        userId: knownUserId,
        fileName: targetStorageName,
        originalName: 'Unit3_ASPNET_MVC.pdf',
        fileUrl: storageResult.publicUrl,
        storagePath: storageResult.path,
        fileSize: pdfBuffer.length,
        pageCount: 0,
        documentType: 'StudyMaterial',
        processingStatus: 'Uploaded',
        processingStage: 'Uploaded',
        title: 'ASP.NET MVC Lecture Notes',
      },
    });

    try {
      const t0 = performance.now();

      // 2. Run the accelerated document processing pipeline
      await documentProcessingService.processDocument(testDoc.id);

      const processingDurationMs = Math.round(performance.now() - t0);
      console.log(`\n⚡ [Benchmark Result] End-to-end processing completed in: ${processingDurationMs}ms`);

      // 3. Verify Document is marked Ready
      const updatedDoc = await prisma.document.findUnique({
        where: { id: testDoc.id },
        include: { chunks: true },
      });

      expect(updatedDoc).toBeDefined();
      expect(updatedDoc?.processingStatus).toBe('Ready');
      expect(updatedDoc?.chunks.length).toBeGreaterThan(0);
      expect(updatedDoc?.pageCount).toBeGreaterThan(0);

      // Verify speed: previously took ~60,000ms; now should finish early readiness in under 15,000ms
      expect(processingDurationMs).toBeLessThan(15000);

      // 4. Verify dependent feature: AI Q&A is immediately operational
      const qaRes = await ragService.answerQuestion({
        userId: knownUserId,
        question: 'What is ASP.NET MVC?',
        documentIds: [testDoc.id],
      });

      expect(qaRes.isGrounded).toBe(true);
      expect(qaRes.groundingStatus).toBe('GROUNDED');
      expect(qaRes.sources.length).toBeGreaterThan(0);

      // 5. Verify duplicate check optimization (idempotency)
      const tDuplicate = performance.now();
      await documentProcessingService.processDocument(testDoc.id);
      const duplicateDurationMs = Math.round(performance.now() - tDuplicate);

      console.log(`⚡ [Benchmark Result] Duplicate document check finished in: ${duplicateDurationMs}ms`);
      expect(duplicateDurationMs).toBeLessThan(500); // Should be near-instantaneous
    } finally {
      // Clean up test document and its chunks
      await prisma.documentChunk.deleteMany({ where: { documentId: testDoc.id } });
      await prisma.summary.deleteMany({ where: { documentId: testDoc.id } });
      await prisma.document.delete({ where: { id: testDoc.id } });
      await storageService.deleteFile(storageResult.path).catch(() => {});
    }
  }, 45000);
});
