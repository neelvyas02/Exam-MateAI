import { describe, expect, it } from 'vitest';
import { EmbeddingService } from '../src/infrastructure/ai/embedding.service.js';

describe('RAG and Embedding Calculations', () => {
  it('should accurately compute vector cosine similarity', () => {
    // Identical vectors should have similarity 1.0
    const vecA = [1, 2, 3];
    const vecB = [1, 2, 3];
    expect(EmbeddingService.cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0, 5);

    // Orthogonal vectors should have similarity 0.0
    const vecC = [1, 0, 0];
    const vecD = [0, 1, 0];
    expect(EmbeddingService.cosineSimilarity(vecC, vecD)).toBeCloseTo(0.0, 5);

    // Opposite vectors should have similarity -1.0
    const vecE = [1, 1, 1];
    const vecF = [-1, -1, -1];
    expect(EmbeddingService.cosineSimilarity(vecE, vecF)).toBeCloseTo(-1.0, 5);
  });

  it('should return 0 for zero or mismatched vectors', () => {
    expect(EmbeddingService.cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
    expect(EmbeddingService.cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });
});
