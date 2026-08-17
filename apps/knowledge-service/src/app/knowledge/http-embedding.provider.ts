import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { TypedConfigService } from '@osc/config';
import { KnowledgeEnv } from '../env';
import { EmbeddingProvider } from './knowledge.types';

interface EmbeddingResponse { data?: Array<{ embedding?: unknown }>; }

@Injectable()
export class HttpEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly config: TypedConfigService<KnowledgeEnv>) {}
  async embed(texts: readonly string[]): Promise<readonly number[][]> {
    if (texts.length === 0) return [];
    const baseUrl = this.config.get('EMBEDDING_BASE_URL');
    const apiKey = this.config.get('EMBEDDING_API_KEY');
    if (!baseUrl || !apiKey) throw new Error('Embedding provider is not configured');
    const response = await axios.post<EmbeddingResponse>(baseUrl.replace(/\/$/, '') + '/embeddings', { model: this.config.get('EMBEDDING_MODEL'), input: texts }, { timeout: this.config.get('EMBEDDING_REQUEST_TIMEOUT_MS'), maxContentLength: 10_000_000, maxBodyLength: 10_000_000, maxRedirects: 0, headers: { authorization: 'Bearer ' + apiKey, 'content-type': 'application/json' } });
    const data = response.data.data;
    const dimensions = this.config.get('EMBEDDING_DIMENSIONS');
    if (!Array.isArray(data) || data.length !== texts.length || data.some((item) => !item || !Array.isArray(item.embedding) || item.embedding.length !== dimensions || item.embedding.some((value) => typeof value !== 'number' || !Number.isFinite(value)))) throw new Error('Embedding provider returned an invalid response');
    return data.map((item) => item.embedding as number[]);
  }
}
