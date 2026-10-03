/**
 * Domain model for OpenSource Copilot (Phase 1).
 *
 * These types are the contract shared by the UI and, later, the real API.
 * Mock data in `src/lib/mock/` implements them; swapping to TanStack Query
 * against live endpoints should require no changes here.
 */

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type IssueState = "open" | "closed";

/** Where a repository sits in the analysis lifecycle. */
export type AnalysisStatus = "not-analyzed" | "analyzing" | "analyzed";

export interface GitHubUser {
  login: string;
  name: string;
  avatarUrl: string | null;
}

export interface Label {
  id: string;
  name: string;
  /** Hex color WITHOUT leading '#', mirroring the GitHub labels API. */
  color: string;
  description?: string;
}

/** A language/technology weight derived from repo analysis (0â€“100 share). */
export interface TechShare {
  name: string;
  /** Percentage share of the codebase, 0â€“100. Shares sum to ~100. */
  percent: number;
}

export interface RepositoryHealth {
  /** 0â€“100 composite derived from the signals below. Not a user metric. */
  score: number | null;
  hasReadme: boolean | null;
  hasContributingGuide: boolean | null;
  hasCodeOfConduct: boolean | null;
  hasIssueTemplates: boolean | null;
  hasTests: boolean | null;
  hasCi: boolean | null;
  respondsToIssues: boolean | null;
  /** Median maintainer first-response time in hours, if known. */
  medianResponseHours?: number;
}

export interface Repository {
  id: string;
  owner: string;
  name: string;
  /** "owner/name" convenience. */
  fullName: string;
  description: string;
  readmeSummary: string | null;
  url: string;
  isFork: boolean;
  parentFullName: string | null;
  primaryLanguage: string;
  languages: TechShare[];
  topics: string[];
  stars: number;
  forks: number;
  openIssues: number;
  /** ISO timestamp of last push. */
  lastPushedAt: string;
  license: string | null;
  analysisStatus: AnalysisStatus;
  health: RepositoryHealth;
  /** Number of issues flagged beginner-friendly by deterministic rules. */
  goodFirstIssueCount: number | null;
}

/** A single deterministic reason contributing to a recommendation score. */
export interface RecommendationReason {
  /** Stable key so the UI can pick an icon. */
  kind:
    | "good-first-issue"
    | "language-match"
    | "topic-match"
    | "low-difficulty"
    | "recent-activity"
    | "mentorship"
    | "small-scope"
    | "has-guidance";
  label: string;
  /** Positive weight added to the score for this issue. */
  weight: number;
}

/**
 * Rule-based recommendation attached to an issue. Phase 1 has AI OFF, so this
 * is fully deterministic and explainable â€” every point traces to a reason.
 */
export interface Recommendation {
  /** 0â€“100 suitability score for the current user. */
  score: number;
  difficulty: Difficulty;
  reasons: RecommendationReason[];
  /** Rough hands-on estimate, e.g. "2â€“4 hours". */
  estimatedEffort: string;
}

export interface IssueComment {
  id: string;
  author: GitHubUser;
  createdAt: string;
  body: string;
}

export interface Issue {
  id: string;
  number: number;
  repositoryId: string;
  title: string;
  /** Markdown body as authored upstream. Treated as untrusted content. */
  body: string;
  state: IssueState;
  labels: Label[];
  author: GitHubUser;
  assignee: GitHubUser | null;
  comments: number;
  createdAt: string;
  updatedAt: string;
  url: string;
  isUpstream: boolean;
  recommendation: Recommendation;
}

/** A step in the guided contribution journey (for the dashboard/landing). */
export interface JourneyStep {
  id: string;
  title: string;
  description: string;
  /** Phase in which this step becomes available. */
  phase: number;
  /** Whether this step is reachable in the current phase. */
  available: boolean;
}

/** The signed-in developer's declared skills â€” drives recommendation matching. */
export interface UserSkillProfile {
  languages: string[];
  interests: string[];
  preferredDifficulty: Difficulty;
}


