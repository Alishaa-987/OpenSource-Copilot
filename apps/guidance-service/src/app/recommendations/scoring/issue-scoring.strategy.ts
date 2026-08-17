import {
  IssueScore,
  RepositoryIssueInput,
  ScoringConfig,
  ScoreReason,
} from '../recommendation.types';

export interface IssueScoringStrategy {
  score(issue: RepositoryIssueInput, now?: Date): IssueScore;
}

export const ISSUE_SCORING_STRATEGY = Symbol('ISSUE_SCORING_STRATEGY');

export class DefaultIssueScoringStrategy implements IssueScoringStrategy {
  constructor(private readonly config: ScoringConfig) {}

  score(issue: RepositoryIssueInput, now = new Date()): IssueScore {
    const labels = new Set(issue.labels.map((label) => this.normalizeLabel(label)));
    const reasons: ScoreReason[] = [];
    const add = (points: number, text: string) => reasons.push({ points, text });

    if (this.hasAny(labels, ['good-first-issue', 'good-first-issue-label'])) {
      add(10, 'Marked as good first issue');
    }
    if (this.hasAny(labels, ['first-timers-only', 'first-timers'])) {
      add(10, 'Marked for first-time contributors');
    }
    if (this.hasAny(labels, ['help-wanted', 'help-needed'])) {
      add(7, 'Marked as help wanted');
    }
    if (this.hasAny(labels, ['documentation', 'docs'])) {
      add(6, 'Documentation-related');
    }
    if (this.hasAny(labels, ['tests', 'testing', 'test'])) {
      add(5, 'Tests-related');
    }
    if (this.isRecentlyUpdated(issue.updatedAt, now)) {
      add(2, 'Recently updated');
    }
    if (issue.commentsCount <= this.config.lowDiscussionCommentsMax) {
      add(2, 'Low discussion volume');
    }

    if (this.hasAny(labels, ['breaking-change', 'breaking'])) {
      add(-10, 'Breaking change');
    }
    if (this.hasAny(labels, ['major-feature', 'large-feature', 'feature-large'])) {
      add(-5, 'Large feature');
    }
    if (this.hasAny(labels, ['architectural-change', 'architecture'])) {
      add(-5, 'Architectural change');
    }
    if (this.hasAny(labels, ['high-complexity', 'complexity-high', 'complex'])) {
      add(-5, 'High complexity');
    }
    if (issue.commentsCount >= this.config.highDiscussionCommentsMin) {
      add(-5, 'High discussion volume');
    }
    if (this.hasAny(labels, ['dependency-heavy', 'dependencies', 'dependency'])) {
      add(-4, 'Dependency-heavy work');
    }

    return Object.freeze({
      score: reasons.reduce((total, reason) => total + reason.points, 0),
      reasons: Object.freeze(reasons),
    });
  }

  private isRecentlyUpdated(updatedAt: Date, now: Date): boolean {
    const threshold = now.getTime() - this.config.recentActivityDays * 24 * 60 * 60 * 1000;
    return updatedAt.getTime() >= threshold && updatedAt.getTime() <= now.getTime();
  }

  private hasAny(labels: ReadonlySet<string>, candidates: readonly string[]): boolean {
    return candidates.some((candidate) => labels.has(candidate));
  }

  private normalizeLabel(label: string): string {
    return label.trim().toLowerCase().replace(/[ _]+/g, '-');
  }
}
