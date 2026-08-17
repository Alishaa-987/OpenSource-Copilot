import { TypedConfigService } from "@osc/config";
import { KnowledgeEnv } from "../env";
import { DocumentChunker } from "./document-chunker.service";
import { SourceDocument } from "./knowledge.types";

describe("DocumentChunker", () => {
  const values = { KNOWLEDGE_CHUNK_SIZE: 20, KNOWLEDGE_CHUNK_OVERLAP: 5 };
  const config = { get: (key: string) => values[key as keyof typeof values] } as unknown as TypedConfigService<KnowledgeEnv>;
  const document: SourceDocument = { repositoryId: "repo-1", documentId: "doc-1", path: "README.md", documentType: "readme", url: "https://github.com/example/repo/blob/main/README.md", content: "0123456789abcdefghijABCDEFGHIJ" };

  it("preserves metadata and produces overlapping bounded chunks", () => {
    const chunks = new DocumentChunker(config).chunk([document]);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.content.length <= 20)).toBe(true);
    expect(chunks.every((chunk) => chunk.repositoryId === document.repositoryId && chunk.documentId === document.documentId && chunk.path === document.path)).toBe(true);
    expect(chunks[0]?.chunkIndex).toBe(0);
    expect(chunks[1]?.content.slice(0, 5)).toBe(chunks[0]?.content.slice(-5));
  });

  it("skips empty documents", () => {
    expect(new DocumentChunker(config).chunk([{ ...document, content: "   " }])).toEqual([]);
  });

  it("rejects an overlap that could prevent forward progress", () => {
    const invalid = { get: (key: string) => key === "KNOWLEDGE_CHUNK_SIZE" ? 10 : 10 } as unknown as TypedConfigService<KnowledgeEnv>;
    expect(() => new DocumentChunker(invalid).chunk([document])).toThrow("smaller than chunk size");
  });
});
