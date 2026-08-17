import { TypedConfigService } from "@osc/config";
import { KnowledgeEnv } from "../env";
import { KnowledgeIngestionService } from "./knowledge-ingestion.service";
import { RepositorySourceClient } from "./repository-source.client";
import { DocumentChunker } from "./document-chunker.service";
import { EmbeddingProvider, RetrievedChunk, VectorStore } from "./knowledge.types";

describe("KnowledgeIngestionService", () => {
  const config = { get: (key: string) => ({ KNOWLEDGE_RETRIEVAL_LIMIT: 5, KNOWLEDGE_MIN_RELEVANCE: 0.35 }[key]) } as unknown as TypedConfigService<KnowledgeEnv>;
  const source = { assertAccess: jest.fn(), getSource: jest.fn() } as unknown as RepositorySourceClient;
  const chunker = { chunk: jest.fn() } as unknown as DocumentChunker;
  const embeddings = { embed: jest.fn() } as unknown as EmbeddingProvider;
  const vectorStore = { ensureCollection: jest.fn(), upsert: jest.fn(), search: jest.fn() } as unknown as VectorStore;
  const service = new KnowledgeIngestionService(source, chunker, embeddings, vectorStore, config);

  beforeEach(() => { jest.clearAllMocks(); });

  it("filters by the requested repository and relevance threshold", async () => {
    jest.spyOn(source, "assertAccess").mockResolvedValue(undefined);
    jest.spyOn(embeddings, "embed").mockResolvedValue([[0.1, 0.2]]);
    const rows: RetrievedChunk[] = [
      { repositoryId: "repo-1", documentId: "doc-1", path: "README.md", documentType: "readme", url: "https://example/repo/README.md", chunkIndex: 0, content: "good", relevance: 0.91 },
      { repositoryId: "repo-1", documentId: "doc-2", path: "docs/a.md", documentType: "documentation", url: "https://example/repo/docs/a.md", chunkIndex: 0, content: "weak", relevance: 0.2 }
    ];
    jest.spyOn(vectorStore, "search").mockResolvedValue(rows);
    await expect(service.retrieve("repo-1", "question", 5, "osc=1")).resolves.toEqual([rows[0]]);
    expect(source.assertAccess).toHaveBeenCalledWith("repo-1", "osc=1");
    expect(vectorStore.search).toHaveBeenCalledWith("repo-1", [0.1, 0.2], 5);
  });

  it("does not query embeddings or vectors when access is denied", async () => {
    jest.spyOn(source, "assertAccess").mockRejectedValue(new Error("denied"));
    await expect(service.retrieve("repo-2", "question", 5, "osc=1")).rejects.toThrow("denied");
    expect(embeddings.embed).not.toHaveBeenCalled();
    expect(vectorStore.search).not.toHaveBeenCalled();
  });
});
