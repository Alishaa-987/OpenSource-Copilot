import type { GitHubUser, Issue, Label, Recommendation, Repository } from "./types";
import type { BackendImportedRepository, BackendIssue, BackendRecommendation, BackendRepository, BackendUser } from "./backend-types";
import type { TechShare } from "./types";

const UNKNOWN_TIMESTAMP = "1970-01-01T00:00:00.000Z";

function toLanguageShares(languageBytes: Record<string, number> | undefined, primaryLanguage: string | null): TechShare[] {
  const entries = Object.entries(languageBytes ?? {}).filter(([, bytes]) => Number.isFinite(bytes) && bytes > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (total <= 0) return primaryLanguage ? [{ name: primaryLanguage, percent: 100 }] : [];
  return entries.map(([name, bytes]) => ({ name, percent: Number(((bytes / total) * 100).toFixed(1)) }));
}

export function toUiUser(user: BackendUser): GitHubUser {
  return { login: user.username, name: user.displayName ?? user.username, avatarUrl: user.avatarUrl };
}

export function toUiRepository(repository: BackendRepository | BackendImportedRepository): Repository {
  // NOTE: this must not test for the *presence* of `repositoryId`. The list
  // response now always carries that key (null when the repository has not
  // been imported), so a key-presence check marks every repository as
  // imported - which is what made the whole list claim "Analyzed".
  // `readmeSummary` only exists on the full imported-repository payload.
  const importedRepo = "readmeSummary" in repository ? (repository as BackendImportedRepository) : null;
  const imported = importedRepo !== null || repository.imported === true;
  const internalId = importedRepo?.repositoryId ?? repository.repositoryId ?? null;
  return {
    // An imported repository keeps its internal id so links go straight to the
    // workspace; anything else keeps its GitHub id for the analyse flow.
    id: internalId ?? repository.id,
    owner: repository.owner,
    name: repository.name,
    fullName: repository.fullName,
    description: repository.description ?? "No description provided.",
    readmeSummary: importedRepo?.readmeSummary ?? null,
    url: repository.url,
    isFork: importedRepo?.isFork ?? false,
    parentFullName: importedRepo?.parentFullName ?? null,
    primaryLanguage: repository.language ?? "Unknown",
    languages: toLanguageShares(repository.languages, repository.language),
    topics: repository.topics,
    stars: repository.stars,
    forks: repository.forks,
    openIssues: repository.openIssuesCount,
    lastPushedAt: importedRepo?.lastSyncedAt ?? UNKNOWN_TIMESTAMP,
    license: repository.license,
    // Real state from the backend rather than a hardcoded placeholder.
    analysisStatus: imported ? "analyzed" : "not-analyzed",
    goodFirstIssueCount: null,
    health: {
      score: null,
      hasReadme: null,
      hasContributingGuide: null,
      hasCodeOfConduct: null,
      hasIssueTemplates: null,
      hasTests: null,
      hasCi: null,
      respondsToIssues: null,
    },
  };
}

function toRecommendation(recommendation?: BackendRecommendation): Recommendation {
  return {
    score: recommendation?.score ?? 0,
    difficulty: "beginner",
    estimatedEffort: "Not estimated in Phase 1",
    reasons: (recommendation?.reasons ?? []).map((label, index) => ({
      kind: index === 0 ? "good-first-issue" : "has-guidance",
      label,
      weight: 0,
    })),
  };
}

export function toUiIssue(issue: BackendIssue, recommendation?: BackendRecommendation): Issue {
  const labels: Label[] = issue.labels.map((label) => ({ id: label.id, name: label.name, color: label.color }));
  return {
    id: issue.id,
    number: issue.number,
    repositoryId: issue.repositoryId,
    title: issue.title,
    body: issue.body ?? "",
    state: issue.state === "closed" ? "closed" : "open",
    labels,
    author: { login: issue.author ?? "unknown", name: issue.author ?? "Unknown contributor", avatarUrl: null },
    assignee: null,
    comments: issue.commentsCount,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    url: issue.url,
    isUpstream: issue.isUpstream,
    recommendation: toRecommendation(recommendation),
  };
}

export function mergeRecommendations(issues: BackendIssue[], recommendations: BackendRecommendation[]): Issue[] {
  const byIssueId = new Map(recommendations.map((recommendation) => [recommendation.issueId, recommendation]));
  return issues.map((issue) => toUiIssue(issue, byIssueId.get(issue.id)));
}
