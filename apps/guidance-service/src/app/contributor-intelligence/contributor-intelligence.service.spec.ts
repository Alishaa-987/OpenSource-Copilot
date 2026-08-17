import { ContributorIntelligenceService } from './contributor-intelligence.service';
import type { ContributorIssue } from './contributor-intelligence.types';

describe('ContributorIntelligenceService', () => {
  const issue: ContributorIssue = { id: '11111111-1111-4111-8111-111111111111', repositoryId: '22222222-2222-4222-8222-222222222222', number: 12, title: 'Add API pagination', body: 'Update the endpoint and add tests', state: 'open', author: 'contributor', commentsCount: 2, createdAt: '2026-08-15T00:00:00.000Z', updatedAt: '2026-08-15T00:00:00.000Z', closedAt: null, labels: [{ name: 'good first issue', color: '7057ff' }], url: 'https://github.com/example/repo/issues/12' };

  function makeService(retrieve: jest.Mock) {
    const issues = { getIssue: jest.fn().mockResolvedValue(issue) };
    const knowledge = { retrieve };
    const prisma = { issueIntelligence: { upsert: jest.fn().mockResolvedValue({}) } };
    return { service: new ContributorIntelligenceService(issues as never, knowledge as never, prisma as never), issues, prisma };
  }

  it('maps retrieved files and documentation with bounded confidence', async () => {
    const { service, prisma } = makeService(jest.fn().mockResolvedValue([
      { path: 'src/users.controller.ts', documentType: 'issue', url: 'https://github.com/example/repo/blob/main/src/users.controller.ts', content: 'pagination', relevance: 0.95 },
      { path: 'docs/api.md', documentType: 'documentation', url: 'https://github.com/example/repo/blob/main/docs/api.md', content: 'pagination', relevance: 0.8 },
    ]));
    const result = await service.getIntelligence(issue.repositoryId, issue.id, 'sid=session');
    expect(result.mapping.relevantFiles).toHaveLength(1);
    expect(result.mapping.relevantDocumentation).toHaveLength(1);
    expect(result.mapping.confidence).toBeGreaterThan(0);
    expect(result.mapping.confidence).toBeLessThanOrEqual(1);
    expect(prisma.issueIntelligence.upsert).toHaveBeenCalledTimes(1);
  });

  it('marks high-risk work as high complexity and not beginner suitable', async () => {
    const risky: ContributorIssue = { ...issue, title: 'Perform database migration for breaking architecture change', labels: [{ name: 'breaking-change', color: 'b60205' }], commentsCount: 20 };
    const { service } = makeService(jest.fn().mockResolvedValue([]));
    (service as unknown as { issues: { getIssue: jest.Mock } }).issues.getIssue.mockResolvedValue(risky);
    const result = await service.getIntelligence(risky.repositoryId, risky.id, 'sid=session');
    expect(result.analysis.complexity).toBe('high');
    expect(result.analysis.effort).toBe('large');
    expect(result.analysis.beginnerSuitable).toBe(false);
    expect(result.analysis.method).toBe('deterministic-heuristic');
  });

  it('falls back to issue-only analysis when retrieval fails', async () => {
    const { service, prisma } = makeService(jest.fn().mockRejectedValue(new Error('unavailable')));
    const result = await service.getIntelligence(issue.repositoryId, issue.id, 'sid=session');
    expect(result.mapping.limitations.join(' ')).toContain('retrieval was unavailable');
    expect(result.mapping.confidence).toBe(0.15);
    expect(prisma.issueIntelligence.upsert).toHaveBeenCalledTimes(1);
  });
});
