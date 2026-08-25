import { Injectable } from '@nestjs/common';
import { pipeline } from '@xenova/transformers';
import { EmbeddingProvider } from './knowledge.types';

/**
 * Offline semantic embeddings for local development and provider outages.
 * The model is downloaded once by Transformers.js and then cached locally.
 */
@Injectable()
export class LocalEmbeddingProvider implements EmbeddingProvider {
  private extractorPromise?: Promise<any>;

  private getExtractor(): Promise<any> {
    this.extractorPromise ??= pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true,
    });
    return this.extractorPromise;
  }

  async embed(texts: readonly string[]): Promise<readonly number[][]> {
    if (texts.length === 0) return [];
    const extractor = await this.getExtractor();
    const vectors: number[][] = [];

    for (const text of texts) {
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      const vector = Array.from(output.data as Float32Array, Number);
      if (vector.length !== 384 || vector.some((value) => !Number.isFinite(value))) {
        throw new Error(`Local embedding provider returned an invalid vector of size ${vector.length}`);
      }
      vectors.push(vector);
    }

    return vectors;
  }
}

export const LOCAL_EMBEDDING_DIMENSIONS = 384;
