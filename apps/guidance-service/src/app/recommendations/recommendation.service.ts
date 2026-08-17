import { Inject, Injectable, Logger } from '@nestjs/common';
import { getCorrelationId } from '@osc/observability';
import { ISSUE_SCORING_STRATEGY, IssueScoringStrategy } from './scoring/issue-scoring.strategy';
import { RepositoryIssuesClient } from './repository-issues.client';
import { FirstContributionRecommendationPage, RankedRecommendation, RecommendationPage, RepositoryIssueInput } from './recommendation.types';

export interface RecommendationQuery {
  page: number;
  perPage: number;
  label?: string;
  minScore?: number;
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    private readonly issuesClient: RepositoryIssuesClient,
    @Inject(ISSUE_SCORING_STRATEGY)
    private readonly scoringStrategy: IssueScoringStrategy,
  ) {}

  async getRecommendations(repositoryId: string, query: RecommendationQuery, cookieHeader?: string): Promise<RecommendationPage> {
    const issues = await this.issuesClient.listOpenIssues(repositoryId, cookieHeader);
    const now = new Date();
    const normalizedFilter = query.label ? this.normalizeLabel(query.label) : undefined;

    const ranked = issues
      .filter((issue) => issue.state.toLowerCase() === 'open')
      .filter((issue) => normalizedFilter ? issue.labels.some((label) => this.normalizeLabel(label) === normalizedFilter) : true)
      .map((issue) => ({ issue, score: this.scoringStrategy.score(issue, now) }))
      .filter(({ score }) => query.minScore === undefined || score.score >= query.minScore)
      .sort((left, right) => this.compare(left.issue, right.issue, left.score.score, right.score.score));

    const start = (query.page - 1) * query.perPage;
    const items: RankedRecommendation[] = ranked.slice(start, start + query.perPage).map(({ issue, score }, index) => ({
      issueId: issue.id,
      repositoryId: issue.repositoryId,
      number: issue.number,
      title: issue.title,
      url: issue.url,
      score: score.score,
      rank: start + index + 1,
      reasons: score.reasons.map((reason) => reason.text),
      updatedAt: issue.updatedAt.toISOString(),
      labels: [...issue.labels],
    }));

    this.logger.log(JSON.stringify({
      event: 'recommendations-generated',
      repositoryId,
      resultCount: items.length,
      total: ranked.length,
      page: query.page,
      perPage: query.perPage,
      correlationId: getCorrelationId() ?? 'not-set',
    }));

    return { repositoryId, items, page: query.page, perPage: query.perPage, total: ranked.length };
  }

  async getFirstContributionRecommendations(repositoryId: string, query: RecommendationQuery, cookieHeader?: string): Promise<FirstContributionRecommendationPage> {
    const page = await this.getRecommendations(repositoryId, query, cookieHeader);
    return { ...page, method: 'deterministic-heuristic', fallbackAvailable: true, notice: 'Recommendations are explainable heuristics, not machine-learning predictions. The deterministic engine remains the fallback.' };
  }

  private compare(left: RepositoryIssueInput, right: RepositoryIssueInput, leftScore: number, rightScore: number): number {
    if (leftScore !== rightScore) return rightScore - leftScore;
    const updatedDifference = right.updatedAt.getTime() - left.updatedAt.getTime();
    if (updatedDifference !== 0) return updatedDifference;
    if (left.number !== right.number) return left.number - right.number;
    return left.id.localeCompare(right.id);
  }

  private normalizeLabel(label: string): string {
    return label.trim().toLowerCase().replace(/[ _]+/g, '-');
  }
}


