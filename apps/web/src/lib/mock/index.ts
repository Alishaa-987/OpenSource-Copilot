/**
 * Mock data access layer — the single seam between the UI and its data.
 *
 * Pages and components import ONLY from here, never from the individual mock
 * files. Each accessor mirrors the shape a real API/TanStack Query hook would
 * return, so migrating to live data means reimplementing these functions (or
 * replacing their call sites with `useQuery`) without touching components.
 *
 * Recommendations are computed here via the deterministic engine so no
 * suitability score is ever hand-authored (Phase 1: AI OFF).
 */

import type { Issue, Repository, UserSkillProfile } from "@/lib/types";
import { buildRecommendation, scoreTier } from "@/lib/recommendation";
import { mockRepositories } from "./repositories";
import { mockRawIssues } from "./issues";
import { mockCurrentUser, mockSkillProfile } from "./user";
import { journeySteps } from "./journey";
import { repositoryGuidance, type RepositoryGuidance } from "./guidance";

export function getCurrentUser() {
  return mockCurrentUser;
}

export function getSkillProfile(): UserSkillProfile {
  return mockSkillProfile;
}

export function getRepositories(): Repository[] {
  return mockRepositories;
}

export function getRepository(id: string): Repository | undefined {
  return mockRepositories.find((r) => r.id === id);
}

export function getRepositoryByFullName(
  fullName: string,
): Repository | undefined {
  return mockRepositories.find(
    (r) => r.fullName.toLowerCase() === fullName.toLowerCase(),
  );
}

const repoById = new Map(mockRepositories.map((r) => [r.id, r]));

/**
 * Attach a deterministic recommendation to a raw issue using its repo and the
 * given skill profile.
 */
function withRecommendation(
  raw: (typeof mockRawIssues)[number],
  profile: UserSkillProfile,
): Issue {
  const repo = repoById.get(raw.repositoryId);
  if (!repo) {
    throw new Error(`Mock issue ${raw.id} references unknown repo`);
  }
  return { ...raw, recommendation: buildRecommendation(raw, repo, profile) };
}

/** All issues with recommendations, highest score first. */
export function getRecommendedIssues(
  profile: UserSkillProfile = mockSkillProfile,
): Issue[] {
  return mockRawIssues
    .map((raw) => withRecommendation(raw, profile))
    .sort((a, b) => b.recommendation.score - a.recommendation.score);
}

/** Issues for one repository, highest score first. */
export function getIssuesForRepository(
  repositoryId: string,
  profile: UserSkillProfile = mockSkillProfile,
): Issue[] {
  return getRecommendedIssues(profile).filter(
    (i) => i.repositoryId === repositoryId,
  );
}

export function getIssue(
  id: string,
  profile: UserSkillProfile = mockSkillProfile,
): Issue | undefined {
  const raw = mockRawIssues.find((i) => i.id === id);
  return raw ? withRecommendation(raw, profile) : undefined;
}

export function getGuidance(repositoryId: string): RepositoryGuidance | undefined {
  return repositoryGuidance[repositoryId];
}

export function getJourney() {
  return journeySteps;
}

/**
 * Aggregate figures for the dashboard. Derived live from mock data — these are
 * illustrative platform stats, NOT tracked user analytics.
 */
export function getDashboardSummary(profile: UserSkillProfile = mockSkillProfile) {
  const repositories = getRepositories();
  const issues = getRecommendedIssues(profile);

  const analyzedRepos = repositories.filter(
    (r) => r.analysisStatus === "analyzed",
  ).length;

  const beginnerIssues = issues.filter(
    (i) => i.recommendation.difficulty === "beginner",
  ).length;

  const strongMatches = issues.filter(
    (i) => scoreTier(i.recommendation.score) !== "fair",
  ).length;

  const difficultyBreakdown = {
    beginner: issues.filter((i) => i.recommendation.difficulty === "beginner")
      .length,
    intermediate: issues.filter(
      (i) => i.recommendation.difficulty === "intermediate",
    ).length,
    advanced: issues.filter((i) => i.recommendation.difficulty === "advanced")
      .length,
  };

  // Language distribution across accessible repositories (issue-weighted).
  const languageWeights = new Map<string, number>();
  for (const issue of issues) {
    const repo = repoById.get(issue.repositoryId);
    if (!repo) continue;
    languageWeights.set(
      repo.primaryLanguage,
      (languageWeights.get(repo.primaryLanguage) ?? 0) + 1,
    );
  }
  const topLanguages = [...languageWeights.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    accessibleRepos: repositories.length,
    analyzedRepos,
    recommendedIssues: issues.length,
    beginnerIssues,
    strongMatches,
    difficultyBreakdown,
    topLanguages,
  };
}

export type DashboardSummary = ReturnType<typeof getDashboardSummary>;
export type { RepositoryGuidance, ContributionRule } from "./guidance";
