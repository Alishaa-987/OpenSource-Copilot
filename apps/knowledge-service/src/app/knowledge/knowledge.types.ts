export type KnowledgeDocumentType = 'readme' | 'contributing' | 'code-of-conduct' | 'security' | 'documentation' | 'issue';
export interface SourceDocument { repositoryId: string; documentId: string; path: string; documentType: KnowledgeDocumentType; url: string; content: string; }
export interface DocumentChunk { repositoryId: string; documentId: string; path: string; documentType: KnowledgeDocumentType; url: string; chunkIndex: number; content: string; }
export interface RetrievedChunk extends DocumentChunk { relevance: number; }
export interface RepositoryKnowledgeSource { repositoryId: string; documents: SourceDocument[]; }
export interface EmbeddingProvider { embed(texts: readonly string[]): Promise<readonly number[][]>; }
export interface VectorStore { ensureCollection(): Promise<void>; upsert(chunks: readonly DocumentChunk[], vectors: readonly number[][]): Promise<void>; search(repositoryId: string, vector: readonly number[], limit: number): Promise<RetrievedChunk[]>; }
