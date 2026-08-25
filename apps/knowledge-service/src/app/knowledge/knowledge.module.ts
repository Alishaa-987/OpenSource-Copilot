import { Module } from '@nestjs/common';
import { TypedConfigService } from '@osc/config';
import { KnowledgeEnv } from '../env';
import { DocumentChunker } from './document-chunker.service';
import { HttpEmbeddingProvider } from './http-embedding.provider';
import { LocalEmbeddingProvider } from './local-embedding.provider';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeIngestionService } from './knowledge-ingestion.service';
import { QdrantVectorStore } from './qdrant-vector.store';
import { RepositorySourceClient } from './repository-source.client';

@Module({ controllers: [KnowledgeController], providers: [DocumentChunker, RepositorySourceClient, KnowledgeIngestionService, QdrantVectorStore, HttpEmbeddingProvider, LocalEmbeddingProvider, { provide: 'EMBEDDING_PROVIDER', inject: [TypedConfigService, HttpEmbeddingProvider, LocalEmbeddingProvider], useFactory: (config: TypedConfigService<KnowledgeEnv>, http: HttpEmbeddingProvider, local: LocalEmbeddingProvider) => config.get('EMBEDDING_PROVIDER') === 'http' ? http : local }], exports: [KnowledgeIngestionService, QdrantVectorStore] })
export class KnowledgeModule {}
