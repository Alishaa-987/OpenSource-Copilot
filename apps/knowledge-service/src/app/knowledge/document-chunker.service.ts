import { Injectable } from '@nestjs/common';
import { TypedConfigService } from '@osc/config';
import { KnowledgeEnv } from '../env';
import { DocumentChunk, SourceDocument } from './knowledge.types';

@Injectable()
export class DocumentChunker {
  constructor(private readonly config: TypedConfigService<KnowledgeEnv>) {}
  chunk(documents: readonly SourceDocument[]): DocumentChunk[] {
    const size = this.config.get('KNOWLEDGE_CHUNK_SIZE');
    const overlap = this.config.get('KNOWLEDGE_CHUNK_OVERLAP');
    if (overlap >= size) throw new Error('KNOWLEDGE_CHUNK_OVERLAP must be smaller than chunk size');
    const chunks: DocumentChunk[] = [];
    for (const document of documents) {
      const content = document.content.trim();
      if (!content) continue;
      let start = 0; let index = 0;
      while (start < content.length) {
        const end = Math.min(start + size, content.length);
        const piece = content.slice(start, end).trim();
        if (piece) chunks.push({ ...document, content: piece, chunkIndex: index++ });
        if (end >= content.length) break;
        start = end - overlap;
      }
    }
    return chunks;
  }
}
