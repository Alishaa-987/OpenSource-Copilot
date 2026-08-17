import axios, { AxiosInstance } from 'axios';
import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { TypedConfigService } from '@osc/config';
import { KnowledgeEnv } from '../env';
import { DocumentChunk, RetrievedChunk, VectorStore } from './knowledge.types';

@Injectable()
export class QdrantVectorStore implements VectorStore {
  private readonly client: AxiosInstance;
  private initialized = false;
  constructor(private readonly config: TypedConfigService<KnowledgeEnv>) {
    this.client = axios.create({ baseURL: this.config.get('QDRANT_URL').replace(/\/$/, ''), timeout: this.config.get('KNOWLEDGE_REQUEST_TIMEOUT_MS'), maxContentLength: 8_000_000, maxBodyLength: 8_000_000, headers: this.config.get('QDRANT_API_KEY') ? { 'api-key': this.config.get('QDRANT_API_KEY') } : undefined, maxRedirects: 0 });
  }
  private collection() { return this.config.get('QDRANT_COLLECTION'); }
  private pointId(chunk: DocumentChunk) {
    const digest = createHash('sha256').update(chunk.repositoryId + '|' + chunk.documentId + '|' + chunk.chunkIndex).digest('hex').slice(0, 32);
    return digest.slice(0, 8) + '-' + digest.slice(8, 12) + '-4' + digest.slice(13, 16) + '-a' + digest.slice(17, 20) + '-' + digest.slice(20);
  }
  async ensureCollection(): Promise<void> {
    if (this.initialized) return;
    const name = this.collection();
    try { await this.client.get('/collections/' + encodeURIComponent(name)); }
    catch (error: unknown) {
      if (!axios.isAxiosError(error) || error.response?.status !== 404) throw error;
      await this.client.put('/collections/' + encodeURIComponent(name), { vectors: { size: this.config.get('EMBEDDING_DIMENSIONS'), distance: 'Cosine' } });
    }
    this.initialized = true;
  }
  async upsert(chunks: readonly DocumentChunk[], vectors: readonly number[][]): Promise<void> {
    if (chunks.length !== vectors.length) throw new Error('Chunk/vector count mismatch');
    await this.ensureCollection();
    if (chunks.length === 0) return;
    await this.client.put('/collections/' + encodeURIComponent(this.collection()) + '/points?wait=true', { points: chunks.map((chunk, index) => ({ id: this.pointId(chunk), vector: vectors[index], payload: { repositoryId: chunk.repositoryId, documentId: chunk.documentId, path: chunk.path, documentType: chunk.documentType, url: chunk.url, chunkIndex: chunk.chunkIndex, content: chunk.content } })) });
  }
  async search(repositoryId: string, vector: readonly number[], limit: number): Promise<RetrievedChunk[]> {
    await this.ensureCollection();
    const response = await this.client.post<{ result?: Array<{ score?: number; payload?: Record<string, unknown> }> }>('/collections/' + encodeURIComponent(this.collection()) + '/points/search', { vector, limit, with_payload: true, filter: { must: [{ key: 'repositoryId', match: { value: repositoryId } }] } });
    const rows = response.data.result;
    if (!Array.isArray(rows)) throw new Error('Vector store returned an invalid search response');
    return rows.flatMap((row) => {
      const p = row.payload;
      if (!p || typeof row.score !== 'number' || typeof p['repositoryId'] !== 'string' || typeof p['documentId'] !== 'string' || typeof p['path'] !== 'string' || typeof p['documentType'] !== 'string' || typeof p['url'] !== 'string' || typeof p['chunkIndex'] !== 'number' || typeof p['content'] !== 'string') return [];
      return [{ repositoryId: p['repositoryId'], documentId: p['documentId'], path: p['path'], documentType: p['documentType'] as RetrievedChunk['documentType'], url: p['url'], chunkIndex: p['chunkIndex'], content: p['content'], relevance: Math.max(0, Math.min(1, row.score)) }];
    });
  }
}
