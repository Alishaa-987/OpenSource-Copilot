import { ForbiddenException } from '@nestjs/common';
import { RepositoryAnalysisService } from './repository-analysis.service';
import type { RetrievedChunk } from '../knowledge/knowledge.types';

const chunk: RetrievedChunk = {
  repositoryId: 'repo-1',
  documentId: 'doc-1',
  path: 'README.md',
  documentType: 'readme',
  url: 'https://github.com/acme/repo/blob/main/README.md',
  chunkIndex: 0,
  content: '# Acme repository\n\nA repository for building reliable open-source tooling.',
  relevance: 0.9,
};

describe('RepositoryAnalysisService', () => {
  it('returns grounded fallback when the LLM and fallback retrieval both fail', async () => {
    const knowledge = { retrieveRepositoryOverview: jest.fn().mockResolvedValueOnce([chunk]).mockRejectedValueOnce(new Error('session expired')) };
    const llm = { complete: jest.fn().mockRejectedValue(new Error('Request failed with status code 404')) };
    const service = new RepositoryAnalysisService(knowledge as never, llm as never);

    await expect(service.analyze('repo-1', 'session=valid')).resolves.toMatchObject({
      repositoryId: 'repo-1',
      method: 'grounded-fallback',
      confidence: 'low',
      evidence: [{ path: 'README.md' }],
    });
    expect(knowledge.retrieveRepositoryOverview).toHaveBeenCalledTimes(2);
  });

  it('preserves authorization errors from repository retrieval', async () => {
    const knowledge = { retrieveRepositoryOverview: jest.fn().mockRejectedValue(new ForbiddenException('Repository access was not granted')) };
    const llm = { complete: jest.fn() };
    const service = new RepositoryAnalysisService(knowledge as never, llm as never);

    await expect(service.analyze('repo-1', 'session=expired')).rejects.toBeInstanceOf(ForbiddenException);
    expect(llm.complete).not.toHaveBeenCalled();
  });
});
