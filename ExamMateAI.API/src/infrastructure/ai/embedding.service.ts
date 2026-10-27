import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { logger } from '../logging/logger.js';

export class EmbeddingService {
  private openai: OpenAI | null = null;
  private model: string;
  private dimension: number;

  constructor() {
    this.model = config.ai.openaiEmbeddingModel || 'text-embedding-3-small';
    this.dimension = config.ai.openaiEmbeddingDimension || 1536;

    if (config.ai.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: config.ai.openaiApiKey,
      });
    }
  }

  public get isConfigured(): boolean {
    return this.openai !== null && !!config.ai.openaiApiKey;
  }

  public get embeddingModel(): string {
    return this.model;
  }

  public get embeddingDimension(): number {
    return this.dimension;
  }

  /**
   * Generates embedding vector for a single query text
   */
  public async generateQueryEmbedding(text: string): Promise<number[]> {
    if (!this.isConfigured || !this.openai) {
      throw new Error('OpenAI API key is not configured for embedding generation.');
    }

    const clean = text.replace(/\n+/g, ' ').trim();
    if (!clean) {
      return new Array(this.dimension).fill(0);
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: clean,
        dimensions: this.dimension,
      });

      return response.data[0].embedding;
    } catch (err: any) {
      logger.error({ error: err.message, model: this.model }, '[EmbeddingService] Failed to generate query embedding');
      throw err;
    }
  }

  /**
   * Generates embeddings in batches for document chunks
   */
  public async generateChunkEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.isConfigured || !this.openai) {
      throw new Error('OpenAI API key is not configured for embedding generation.');
    }

    if (texts.length === 0) return [];

    const batchSize = 30; // OpenAI allows up to 2048 inputs per request; 30-50 is safe and fast
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
        logger.error({ error: err.message, batchIndex: i }, '[EmbeddingService] Batch embedding generation error');
        throw err;
      }
    }

    return results;
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
