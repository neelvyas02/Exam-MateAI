import { describe, expect, it, beforeEach } from 'vitest';
import { prisma } from '../src/infrastructure/database/prisma.js';
import { ragService } from '../src/infrastructure/ai/rag.service.js';

describe('RAG Pipeline Diagnostic & Regression Suite', () => {
  // Use existing seeded document Unit3_ASPNET_MVC.pdf
  const knownDocId = 'e0d98e47-905e-4a02-842c-1acdcf05bb07';
  const knownUserId = '8589edd4-ddc4-4fa1-a432-29476f735ad1';

  beforeEach(async () => {
    // 2.5s pause between tests to respect Gemini API RPM limits
    await new Promise((r) => setTimeout(r, 2500));
  });

  it('Case 1: Explicitly stated question returns evidence-based answer with citation', async () => {
    const res = await ragService.answerQuestion({
      userId: knownUserId,
      question: 'What sequence is used to add a Model Class in Visual C#?',
      documentIds: [knownDocId],
    });

    console.log('[Test Case 1 Answer]:', res.answer.slice(0, 200));
    console.log('[Test Case 1 Sources]:', res.sources.length, 'Citation:', res.sourceCitation);

    expect(res.sources.length).toBeGreaterThan(0);
    expect(res.isGrounded).toBe(true);
    expect(res.answer.toLowerCase()).toContain('model');
    expect(res.sourceCitation).toBeDefined();
    expect(res.confidence).toBeGreaterThan(0.7);
  }, 25000);

  it('Case 2: Paraphrased / differently worded question returns grounded answer', async () => {
    const res = await ragService.answerQuestion({
      userId: knownUserId,
      question: 'Explain how to create a student entity class in the MVC structure and what fields it has',
      documentIds: [knownDocId],
    });

    console.log('[Test Case 2 Answer]:', res.answer.slice(0, 200));
    console.log('[Test Case 2 Sources]:', res.sources.length);

    expect(res.sources.length).toBeGreaterThan(0);
    expect(res.isGrounded).toBe(true);
    expect(res.answer.toLowerCase()).toMatch(/student|model/);
  }, 25000);

  it('Case 3: Question requiring information across sections combines evidence', async () => {
    const res = await ragService.answerQuestion({
      userId: knownUserId,
      question: 'How does the Controller interact with the Model and View when a user enters a URL?',
      documentIds: [knownDocId],
    });

    console.log('[Test Case 3 Answer]:', res.answer.slice(0, 200));
    console.log('[Test Case 3 Sources]:', res.sources.length);

    expect(res.sources.length).toBeGreaterThan(0);
    expect(res.isGrounded).toBe(true);
    expect(res.answer.toLowerCase()).toMatch(/controller|view|model/);
  }, 25000);

  it('Case 4: Question absent from document identifies missing information and provides separate academic context', async () => {
    const res = await ragService.answerQuestion({
      userId: knownUserId,
      question: 'Explain Quantum Computing Shor factoring algorithm and qubits',
      documentIds: [knownDocId],
    });

    console.log('[Test Case 4 Answer]:', res.answer.slice(0, 200));
    console.log('[Test Case 4 Status]:', res.groundingStatus, 'Unverified:', res.unverifiedContextUsed);

    // Should indicate the information was not in uploaded notes
    expect(res.unverifiedContextUsed).toBe(true);
    expect(res.groundingStatus).not.toBe('GROUNDED');
    expect(res.answer.toLowerCase()).toMatch(/not covered|not found|general academic context|missing/);
  }, 25000);

  it('Case 5: Document that has not finished processing returns informative message rather than misleading refusal', async () => {
    // Create temporary document in Processing state
    const tempDoc = await prisma.document.create({
      data: {
        userId: knownUserId,
        fileName: 'temp-processing.pdf',
        originalName: 'Pending_Lecture_Notes.pdf',
        fileUrl: 'http://localhost/temp.pdf',
        fileSize: 1024,
        processingStatus: 'Processing',
        processingStage: 'ExtractingText',
      },
    });

    try {
      const res = await ragService.answerQuestion({
        userId: knownUserId,
        question: 'What is covered in these notes?',
        documentIds: [tempDoc.id],
      });

      console.log('[Test Case 5 Answer]:', res.answer);
      expect(res.groundingStatus).toBe('PROCESSING');
      expect(res.answer).toContain('currently being processed');
      expect(res.isGrounded).toBe(false);
    } finally {
      await prisma.document.delete({ where: { id: tempDoc.id } });
    }
  }, 20000);

  it('Case 6: User with no uploaded documents receives informative prompt to upload', async () => {
    const nonExistentUserId = '00000000-0000-0000-0000-000000000000';
    const res = await ragService.answerQuestion({
      userId: nonExistentUserId,
      question: 'What are the main exam topics?',
      documentIds: ['00000000-0000-0000-0000-000000000001'],
    });

    console.log('[Test Case 6 Answer]:', res.answer);
    expect(res.groundingStatus).toBe('NO_DOCUMENTS');
    expect(res.answer.toLowerCase()).toContain('upload');
    expect(res.isGrounded).toBe(false);
  }, 20000);
});
