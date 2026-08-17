export interface RepositoryIssueInput {
  id: string;
  repositoryId: string;
  number: number;
  title: string;
  state: string;
  commentsCount: number;
  updatedAt: Date;
  labels: readonly string[];
  url: string;
}

export interface ScoringConfig {
  recentActivityDays: number;
  lowDiscussionCommentsMax: number;
  highDiscussionCommentsMin: number;
}

export interface ScoreReason {
  readonly points: number;
  readonly text: string;
}

export interface IssueScore {
  readonly score: number;
  readonly reasons: readonly ScoreReason[];
}

export interface RankedRecommendation {
  readonly issueId: string;
  readonly repositoryId: string;
  readonly number: number;
  readonly title: string;
  readonly url: string;
  readonly score: number;
  readonly rank: number;
  readonly reasons: readonly string[];
  readonly updatedAt: string;
  readonly labels: readonly string[];
}

export interface RecommendationPage {
  readonly repositoryId: string;
  readonly items: readonly RankedRecommendation[];
  readonly page: number;
  readonly perPage: number;
  readonly total: number;
}

export interface FirstContributionRecommendationPage extends RecommendationPage {
  readonly method: 'deterministic-heuristic';
  readonly fallbackAvailable: true;
  readonly notice: string;
}
