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
    const vectors = await this.embeddings.embed(chunks.map((chunk) => chunk.content));
    await this.vectorStore.upsert(chunks, vectors);
    this.logger.log(JSON.stringify({ event: 'repository-knowledge-indexed', repositoryId, chunks: chunks.length }));
    return { repositoryId, chunks: chunks.length };
  }
  async retrieve(repositoryId: string, question: string, limit?: number, cookieHeader?: string): Promise<RetrievedChunk[]> {
    await this.sourceClient.assertAccess(repositoryId, cookieHeader);
    const vectors = await this.embeddings.embed([question]);
    const rows = await this.vectorStore.search(repositoryId, vectors[0], limit ?? this.config.get('KNOWLEDGE_RETRIEVAL_LIMIT'));
    return rows.filter((row) => row.relevance >= this.config.get('KNOWLEDGE_MIN_RELEVANCE'));
  }
}
