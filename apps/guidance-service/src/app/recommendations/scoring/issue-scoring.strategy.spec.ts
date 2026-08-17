import { DefaultIssueScoringStrategy } from './issue-scoring.strategy';
import { RepositoryIssueInput } from '../recommendation.types';

const config = {
  recentActivityDays: 30,
  lowDiscussionCommentsMax: 3,
  highDiscussionCommentsMin: 20,
};

const issue = (overrides: Partial<RepositoryIssueInput> = {}): RepositoryIssueInput => ({
  id: '11111111-1111-4111-8111-111111111111',
  repositoryId: '22222222-2222-4222-8222-222222222222',
  number: 1,
  title: 'Example issue',
  state: 'open',
  commentsCount: 0,
  updatedAt: new Date('2026-08-14T00:00:00.000Z'),
  labels: [],
  url: 'https://github.com/example/repo/issues/1',
  ...overrides,
});

describe('DefaultIssueScoringStrategy', () => {
  const now = new Date('2026-08-14T12:00:00.000Z');
  const strategy = new DefaultIssueScoringStrategy(config);

  it('applies each positive signal once and explains every contribution', () => {
    const result = strategy.score(issue({
      labels: ['good first issue', 'good-first-issue', 'first-timers-only', 'help wanted', 'documentation', 'tests'],
      commentsCount: 1,
    }), now);

    expect(result.score).toBe(42);
    expect(result.reasons.map((reason) => reason.text)).toEqual([
      'Marked as good first issue',
      'Marked for first-time contributors',
      'Marked as help wanted',
      'Documentation-related',
      'Tests-related',
      'Recently updated',
      'Low discussion volume',
    ]);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('does not double-count duplicate labels or aliases for one rule', () => {
    const result = strategy.score(issue({ labels: ['docs', 'documentation', 'documentation', 'good-first-issue'] }), now);

    expect(result.score).toBe(20);
    expect(result.reasons.filter((reason) => reason.text === 'Documentation-related')).toHaveLength(1);
    expect(result.reasons.filter((reason) => reason.text === 'Marked as good first issue')).toHaveLength(1);
  });

  it('applies negative signals and high discussion penalties', () => {
    const result = strategy.score(issue({
      labels: ['breaking-change', 'large-feature', 'architecture', 'high-complexity', 'dependency-heavy'],
      commentsCount: 25,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    }), now);

    expect(result.score).toBe(-34);
    expect(result.reasons.map((reason) => reason.text)).toEqual([
      'Breaking change',
      'Large feature',
      'Architectural change',
      'High complexity',
      'High discussion volume',
      'Dependency-heavy work',
    ]);
  });

  it('returns a neutral score when labels are missing and activity is old', () => {
    const result = strategy.score(issue({ commentsCount: 10, updatedAt: new Date('2025-01-01T00:00:00.000Z') }), now);

    expect(result).toEqual({ score: 0, reasons: [] });
  });

  it('does not classify future updates as recently updated', () => {
    const result = strategy.score(issue({ updatedAt: new Date('2026-08-15T00:00:00.000Z') }), now);

    expect(result.reasons.map((reason) => reason.text)).not.toContain('Recently updated');
  });
});

