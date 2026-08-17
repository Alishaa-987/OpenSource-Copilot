import { SimilarContextService } from './similar-context.service';

describe('SimilarContextService', () => {
  const target = {
    id: '11111111-1111-4111-8111-111111111111',
    repositoryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    number: 1,
    title: 'Add API pagination',
    body: 'Paginate the user API response',
    state: 'open',
    author: null,
    commentsCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    closedAt: null,
    labels: [{ name: 'good first issue', color: '' }],
    url: 'https://github.com/example/repo/issues/1',
  };

  it('ranks lexical and label-overlap matches with bounded confidence', async () => {
    const detail = { getIssue: jest.fn().mockResolvedValue(target) };
    const matching = { ...target, id: '22222222-2222-4222-8222-222222222222', number: 2, title: 'Paginate the user API', url: 'https://github.com/example/repo/issues/2' };
    const unrelated = { ...target, id: '33333333-3333-4333-8333-333333333333', number: 3, title: 'Update deployment docs', body: 'Document deployment rollback steps', labels: [], url: 'https://github.com/example/repo/issues/3' };
    const issues = { listOpenIssues: jest.fn().mockResolvedValue([target, matching, unrelated]) };
    const service = new SimilarContextService(detail as never, issues as never);
    const result = await service.getSimilarContext(target.repositoryId, target.id, 'sid=session');
    expect(result.similarIssues).toHaveLength(1);
    expect(result.similarIssues[0].issueId).toBe(matching.id);
    expect(result.similarIssues[0].confidence).toBeGreaterThanOrEqual(0.2);
    expect(result.similarIssues[0].confidence).toBeLessThanOrEqual(1);
    expect(result.similarPullRequests.available).toBe(false);
    expect(result.similarPullRequests.results).toEqual([]);
  });

  it('returns an explicit limitation when only unrelated issues are available', async () => {
    const detail = { getIssue: jest.fn().mockResolvedValue(target) };
    const unrelated = { ...target, id: '44444444-4444-4444-8444-444444444444', number: 4, title: 'Change deployment image', body: 'Use a new container image', labels: [], url: 'https://github.com/example/repo/issues/4' };
    const issues = { listOpenIssues: jest.fn().mockResolvedValue([unrelated]) };
    const service = new SimilarContextService(detail as never, issues as never);
    const result = await service.getSimilarContext(target.repositoryId, target.id, 'sid=session');
    expect(result.similarIssues).toEqual([]);
    expect(result.limitations.join(' ')).toContain('lexical heuristic');
  });
});
