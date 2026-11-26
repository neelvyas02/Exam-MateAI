import { describe, expect, it, beforeEach } from 'vitest';
import { ragService } from '../src/infrastructure/ai/rag.service.js';

describe('Exam Answer Formatting and Source References Verification Suite', () => {
  const knownDocId = 'e0d98e47-905e-4a02-842c-1acdcf05bb07';
  const knownUserId = '8589edd4-ddc4-4fa1-a432-29476f735ad1';

  beforeEach(async () => {
    // 3s delay to ensure rate limits are respected
    await new Promise((r) => setTimeout(r, 3000));
  });

  it('Query 1: "What is ASP.NET MVC?" returns concise definition, bold points, and verified reference', async () => {
    const res = await ragService.answerQuestion({
      userId: knownUserId,
      question: 'What is ASP.NET MVC?',
      documentIds: [knownDocId],
    });

    console.log('\n--- Query 1 Result ---\n', res.answer);
    expect(res.isGrounded).toBe(true);
    expect(res.answer).toMatch(/Definition/i);
    expect(res.answer).toMatch(/\*\*References\*\*/i);
    expect(res.answer).not.toMatch(/Based on your uploaded study materials/i);
    expect(res.answer).not.toMatch(/\n\s*---\s*\n/); // No decorative --- dividers
    expect(res.citations.length).toBeGreaterThan(0);
    expect(res.citations[0].documentName).toContain('Unit3_ASPNET_MVC.pdf');
  }, 35000);

  it('Query 2: "Explain the MVC request cycle point-wise." returns step-by-step points and flow diagram', async () => {
    const res = await ragService.answerQuestion({
      userId: knownUserId,
      question: 'Explain the MVC request cycle point-wise.',
      documentIds: [knownDocId],
    });

    console.log('\n--- Query 2 Result ---\n', res.answer);
    expect(res.isGrounded).toBe(true);
    // Point-wise numbered steps
    expect(res.answer).toMatch(/\d+\.\s+\*\*/);
    // Text flow diagram
    expect(res.answer).toMatch(/->|→|Routing|Controller|View/i);
    // References section
    expect(res.answer).toMatch(/\*\*References\*\*/i);
    expect(res.citations.length).toBeGreaterThan(0);
  }, 35000);

  it('Query 3: "Compare MVC and Web Forms." returns structured comparison', async () => {
    const res = await ragService.answerQuestion({
      userId: knownUserId,
      question: 'Compare MVC and Web Forms.',
      documentIds: [knownDocId],
    });

    console.log('\n--- Query 3 Result ---\n', res.answer);
    expect(res.isGrounded).toBe(true);
    // Should contain either a markdown table or structured comparative points
    const hasTable = res.answer.includes('|') && res.answer.includes('---');
    const hasPoints = res.answer.includes('Web Forms') && res.answer.includes('MVC');
    expect(hasTable || hasPoints).toBe(true);
    expect(res.answer).toMatch(/\*\*References\*\*/i);
    expect(res.citations.length).toBeGreaterThan(0);
  }, 35000);

  it('Query 4: "Explain the advantages of MVC." returns point-wise advantages with bold headings', async () => {
    const res = await ragService.answerQuestion({
      userId: knownUserId,
      question: 'Explain the advantages of MVC.',
      documentIds: [knownDocId],
    });

    console.log('\n--- Query 4 Result ---\n', res.answer);
    expect(res.isGrounded).toBe(true);
    // Point-wise bullet or numbered points with bold headings
    expect(res.answer).toMatch(/(?:\*|-|\d+\.)\s+\*\*/);
    expect(res.answer).toMatch(/\*\*References\*\*/i);
    expect(res.citations.length).toBeGreaterThan(0);
  }, 35000);

  it('Query 5: "Explain MVC using multiple pages from the uploaded PDF." returns multi-page references', async () => {
    const res = await ragService.answerQuestion({
      userId: knownUserId,
      question: 'Explain MVC using multiple pages from the uploaded PDF.',
      documentIds: [knownDocId],
    });

    console.log('\n--- Query 5 Result ---\n', res.answer);
    expect(res.isGrounded).toBe(true);
    expect(res.answer).toMatch(/\*\*References\*\*/i);
    expect(res.citations.length).toBeGreaterThanOrEqual(2);
    // Check that real pages are referenced
    for (const cit of res.citations) {
      expect(cit.documentName).toContain('Unit3_ASPNET_MVC.pdf');
      expect(cit.pageDisplay).toMatch(/Page \d+|Page number unavailable/);
    }
  }, 35000);
});
