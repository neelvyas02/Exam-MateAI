import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { logger } from '../logging/logger.js';

export type EmbeddingProviderType = 'openai' | 'gemini' | 'none';

export class EmbeddingService {
  private openai: OpenAI | null = null;
  private geminiApiKey: string = '';
  private model: string;
  private dimension: number;

  constructor() {
    this.geminiApiKey = config.ai.geminiApiKey || '';
    this.dimension = config.ai.openaiEmbeddingDimension || 1536;

    if (config.ai.provider === 'gemini' && this.geminiApiKey) {
      this.model = 'gemini-embedding-001';
    } else {
      this.model = config.ai.openaiEmbeddingModel || 'text-embedding-3-small';
    }

    if (config.ai.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: config.ai.openaiApiKey,
      });
    }
  }

  public get activeProvider(): EmbeddingProviderType {
    if (config.ai.provider === 'gemini' && this.geminiApiKey) {
      return 'gemini';
    }
    if (this.openai && config.ai.openaiApiKey) {
      return 'openai';
    }
    if (this.geminiApiKey) {
      return 'gemini';
    }
    return 'none';
  }

  public get isConfigured(): boolean {
    return this.activeProvider !== 'none';
  }

  public get embeddingModel(): string {
    return this.activeProvider === 'gemini' ? 'gemini-embedding-001' : this.model;
  }

  public get embeddingDimension(): number {
    return this.dimension;
  }

  /**
   * Generates embedding vector for a single query text (1536 dimensions)
   */
  public async generateQueryEmbedding(text: string): Promise<number[]> {
    const clean = text.replace(/\n+/g, ' ').trim();
    if (!clean) {
      return new Array(this.dimension).fill(0);
    }

    const provider = this.activeProvider;

    if (provider === 'gemini') {
      return await this.generateGeminiEmbedding(clean);
    } else if (provider === 'openai') {
      return await this.generateOpenAIEmbedding(clean);
    }

    throw new Error('No AI provider configured for embedding generation.');
  }

  /**
   * Generates embeddings in batches for document chunks (1536 dimensions)
   */
  public async generateChunkEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const provider = this.activeProvider;

    if (provider === 'gemini') {
      return await this.generateGeminiBatchEmbeddings(texts);
    } else if (provider === 'openai') {
      return await this.generateOpenAIBatchEmbeddings(texts);
    }

    throw new Error('No AI provider configured for chunk embeddings.');
  }

  // --- OpenAI Implementations ---
  private async generateOpenAIEmbedding(cleanText: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI client is not initialized.');
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: cleanText,
        dimensions: this.dimension,
      });
      return response.data[0].embedding;
    } catch (err: any) {
      logger.error({ error: err.message, model: this.model }, '[EmbeddingService] Failed to generate OpenAI query embedding');
      throw err;
    }
  }

  private async generateOpenAIBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.openai) {
      throw new Error('OpenAI client is not initialized.');
    }

    const batchSize = 30;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize).map((t) => t.replace(/\n+/g, ' ').trim());

      try {
        const response = await this.openai.embeddings.create({
          model: this.model,
          input: batch,
          dimensions: this.dimension,
        });

        for (const item of response.data) {
          results.push(item.embedding);
        }
      } catch (err: any) {
        logger.error({ error: err.message, batchIndex: i }, '[EmbeddingService] OpenAI Batch embedding generation error');
        throw err;
      }
    }

    return results;
  }

  // --- Gemini Implementations ---
  private async generateGeminiEmbedding(cleanText: string): Promise<number[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${this.geminiApiKey}`;

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text: cleanText }] },
          outputDimensionality: this.dimension,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Gemini embedContent HTTP ${resp.status}: ${errText}`);
      }

      const data = (await resp.json()) as { embedding?: { values?: number[] } };
      if (!data.embedding?.values) {
        throw new Error('Gemini embedContent returned empty values vector');
      }

      return data.embedding.values;
    } catch (err: any) {
      logger.error({ error: err.message }, '[EmbeddingService] Failed to generate Gemini query embedding');
      throw err;
    }
  }

  private async generateGeminiBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const batchSize = 50; // High efficiency batch size for Gemini batchEmbedContents (API supports up to 100)
    const batches: string[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      batches.push(texts.slice(i, i + batchSize).map((t) => t.replace(/\n+/g, ' ').trim()));
    }

    const concurrency = 2; // Process 2 batches concurrently for optimal throughput without hitting 429
    const batchResults: number[][][] = new Array(batches.length);

    for (let i = 0; i < batches.length; i += concurrency) {
      const slice = batches.slice(i, i + concurrency);
      await Promise.all(
        slice.map(async (batch, sliceIdx) => {
          const globalIdx = i + sliceIdx;
          const requests = batch.map((text) => ({
            model: 'models/gemini-embedding-001',
            content: { parts: [{ text }] },
            outputDimensionality: this.dimension,
          }));

          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${this.geminiApiKey}`;

          try {
            const resp = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ requests }),
            });

            if (!resp.ok) {
              const errText = await resp.text();
              throw new Error(`Gemini batchEmbedContents HTTP ${resp.status}: ${errText}`);
            }

            const data = (await resp.json()) as { embeddings?: Array<{ values?: number[] }> };
            if (!data.embeddings || data.embeddings.length === 0) {
              throw new Error('Gemini batchEmbedContents returned no embeddings');
            }

            batchResults[globalIdx] = data.embeddings.map(
              (emb) => emb.values || new Array(this.dimension).fill(0)
            );
          } catch (err: any) {
            logger.error({ error: err.message, batchIndex: globalIdx }, '[EmbeddingService] Gemini Batch embedding error');
            throw err;
          }
        })
      );
    }

    return batchResults.flat();
  }

  /**
   * Helper to compute cosine similarity between two numeric vectors
   */
  public static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const embeddingService = new EmbeddingService();
