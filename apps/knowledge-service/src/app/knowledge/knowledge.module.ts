import { Module } from '@nestjs/common';
import { DocumentChunker } from './document-chunker.service';
import { HttpEmbeddingProvider } from './http-embedding.provider';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeIngestionService } from './knowledge-ingestion.service';
import { QdrantVectorStore } from './qdrant-vector.store';
import { RepositorySourceClient } from './repository-source.client';

@Module({ controllers: [KnowledgeController], providers: [DocumentChunker, RepositorySourceClient, KnowledgeIngestionService, QdrantVectorStore, HttpEmbeddingProvider, { provide: 'EMBEDDING_PROVIDER', useExisting: HttpEmbeddingProvider }], exports: [KnowledgeIngestionService, QdrantVectorStore] })
export class KnowledgeModule {}
