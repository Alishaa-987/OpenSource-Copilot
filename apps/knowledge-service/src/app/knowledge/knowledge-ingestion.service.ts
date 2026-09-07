import { Inject, Injectable, Logger } from '@nestjs/common';
import { TypedConfigService } from '@osc/config';
import { KnowledgeEnv } from '../env';
import { DocumentChunker } from './document-chunker.service';
import { EmbeddingProvider, RetrievedChunk, VectorStore } from './knowledge.types';
import { RepositorySourceClient } from './repository-source.client';
import { QdrantVectorStore } from './qdrant-vector.store';

@Injectable()
export class KnowledgeIngestionService {
  private readonly logger = new Logger(KnowledgeIngestionService.name);
  constructor(private readonly sourceClient: RepositorySourceClient, private readonly chunker: DocumentChunker, @Inject('EMBEDDING_PROVIDER') private readonly embeddings: EmbeddingProvider, @Inject(QdrantVectorStore) private readonly vectorStore: VectorStore, private readonly config: TypedConfigService<KnowledgeEnv>) {}
  async indexRepository(repositoryId: string, cookieHeader?: string): Promise<{ repositoryId: string; chunks: number }> {
    const source = await this.sourceClient.getSource(repositoryId, cookieHeader);
    const chunks = this.chunker.chunk(source.documents);
    if (chunks.length === 0) { await this.vectorStore.ensureCollection(); return { repositoryId, chunks: 0 }; }
    try {
      const vectors = await this.embeddings.embed(chunks.map((chunk) => chunk.content));
      await this.vectorStore.upsert(chunks, vectors);
      this.logger.log(JSON.stringify({ event: 'repository-knowledge-indexed', repositoryId, chunks: chunks.length, mode: 'vector' }));
      return { repositoryId, chunks: chunks.length };
    } catch (error) {
      // Do not poison-skip the RepositoryImported event when the external embedding
      // provider is rate-limited. Retrieval has a grounded lexical fallback below.
      this.logger.warn(JSON.stringify({ event: 'repository-knowledge-index-fallback', repositoryId, reason: error instanceof Error ? error.message : 'embedding failed' }));
      return { repositoryId, chunks: 0 };
    }
  }
  async retrieveRepositoryOverview(repositoryId: string, cookieHeader?: string, limit = 64): Promise<RetrievedChunk[]> {
    await this.sourceClient.assertAccess(repositoryId, cookieHeader);
    try {
      const source = await this.sourceClient.getSource(repositoryId, cookieHeader);
      const chunks = this.chunker.chunk(source.documents);
      const priority: Record<RetrievedChunk['documentType'], number> = {
        readme: 0,
        contributing: 1,
        documentation: 2,
        'code-of-conduct': 3,
        security: 4,
        code: 5,
        issue: 6,
      };
      return chunks
        .sort((left, right) => priority[left.documentType] - priority[right.documentType] || left.path.localeCompare(right.path) || left.chunkIndex - right.chunkIndex)
        .slice(0, limit)
        .map((chunk, index) => ({ ...chunk, relevance: 0.9 - index / Math.max(limit, 1) * 0.2 }));
    } catch (error) {
      this.logger.warn(JSON.stringify({ event: 'repository-overview-retrieval-failed', repositoryId, reason: error instanceof Error ? error.message : 'overview retrieval failed' }));
      throw error;
    }
  }

  async retrieve(repositoryId: string, question: string, limit?: number, cookieHeader?: string): Promise<RetrievedChunk[]> {
    await this.sourceClient.assertAccess(repositoryId, cookieHeader);
    const retrievalLimit = limit ?? this.config.get('KNOWLEDGE_RETRIEVAL_LIMIT');
    try {
      const vectors = await this.embeddings.embed([question]);
      const indexedRows = await this.vectorStore.search(repositoryId, vectors[0], retrievalLimit);
      const indexedMatches = indexedRows.filter((row) => row.relevance >= this.config.get('KNOWLEDGE_MIN_RELEVANCE'));
      if (indexedMatches.length > 0) return indexedMatches;
    } catch (error) {
      this.logger.warn(JSON.stringify({ event: 'repository-knowledge-retrieval-fallback', repositoryId, reason: error instanceof Error ? error.message : 'embedding or vector search failed' }));
    }
    return this.retrieveFromSource(repositoryId, question, retrievalLimit, cookieHeader);
  }

  private async retrieveFromSource(repositoryId: string, question: string, limit: number, cookieHeader?: string): Promise<RetrievedChunk[]> {
    try {
      const source = await this.sourceClient.getSource(repositoryId, cookieHeader, question);
      const chunks = this.chunker.chunk(source.documents);
      if (chunks.length === 0) return [];
      const terms = [...new Set(question.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length >= 3))];
      const ranked = chunks.map((chunk) => {
        const haystack = `${chunk.path} ${chunk.content}`.toLowerCase();
        const matched = terms.filter((term) => haystack.includes(term)).length;
        const pathMatches = terms.filter((term) => chunk.path.toLowerCase().includes(term)).length;
        const documentBoost = chunk.documentType === 'readme' ? 0.12 : chunk.documentType === 'code' ? 0.08 : 0;
        const relevance = Math.min(0.89, 0.34 + documentBoost + (terms.length === 0 ? 0 : matched / terms.length * 0.45) + (terms.length === 0 ? 0 : pathMatches / terms.length * 0.20));
        return { ...chunk, relevance };
      }).sort((left, right) => right.relevance - left.relevance || left.path.localeCompare(right.path));
      return ranked.slice(0, limit);
    } catch (error) {
      this.logger.warn(JSON.stringify({ event: 'repository-knowledge-source-unavailable', repositoryId, reason: error instanceof Error ? error.message : 'source retrieval failed' }));
      return [];
    }
  }
}
