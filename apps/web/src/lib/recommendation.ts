import type {
  Difficulty,
  Issue,
  Recommendation,
  RecommendationReason,
  Repository,
  UserSkillProfile,
} from "./types";

/**
 * Deterministic, rule-based recommendation engine.
 *
 * Phase 1 runs with AI OFF (PROJECT_BIBLE §29, §43, §74). Suitability is a pure
 * function of observable issue/repo signals and the user's declared skills — no
 * model, no randomness, fully explainable. Every point added to the score is
 * accompanied by a human-readable reason, so the UI can always answer
 * "why was this recommended to me?".
 *
 * This is intentionally the ONLY place a recommendation score is produced.
 * Mock issues are stored without scores and run through `buildRecommendation`,
 * so nothing in the UI is a hand-invented number.
 */

const BEGINNER_LABELS = [
  "good first issue",
  "good-first-issue",
  "beginner",
  "beginner friendly",
  "easy",
  "starter",
  "first-timers-only",
  "e-easy",
];

const ADVANCED_LABELS = [
  "advanced",
  "hard",
  "complex",
  "architecture",
  "performance",
  "security",
  "breaking change",
  "e-hard",
];

const MENTORSHIP_LABELS = ["help wanted", "help-wanted", "mentored", "mentorship"];

const DOCS_LABELS = ["documentation", "docs", "typo"];

type RawIssue = Omit<Issue, "recommendation">;

function labelSet(issue: RawIssue): Set<string> {
  return new Set(issue.labels.map((l) => l.name.toLowerCase()));
}

function anyLabel(labels: Set<string>, candidates: string[]): boolean {
  return candidates.some((c) => labels.has(c));
}

/** Derive difficulty deterministically from labels, then scope heuristics. */
export function deriveDifficulty(issue: RawIssue): Difficulty {
  const labels = labelSet(issue);

  if (anyLabel(labels, BEGINNER_LABELS) || anyLabel(labels, DOCS_LABELS)) {
    return "beginner";
  }
  if (anyLabel(labels, ADVANCED_LABELS)) {
    return "advanced";
  }

  // Fall back to scope: long threads and long bodies skew harder.
  const bodyLength = issue.body.trim().length;
  if (issue.comments >= 12 || bodyLength > 1600) {
    return "advanced";
  }
  if (issue.comments <= 3 && bodyLength < 700) {
    return "beginner";
  }
  return "intermediate";
}

function effortFor(difficulty: Difficulty): string {
  switch (difficulty) {
    case "beginner":
      return "1–3 hours";
    case "intermediate":
      return "3–6 hours";
    case "advanced":
      return "1–2 days";
  }
}

const DIFFICULTY_ORDER: Record<Difficulty, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

/**
 * Compute a recommendation for an issue given the repo it lives in and the
 * user's skill profile. Pure and deterministic.
 */
export function buildRecommendation(
  issue: RawIssue,
  repo: Repository,
  profile: UserSkillProfile,
): Recommendation {
  const labels = labelSet(issue);
  const difficulty = deriveDifficulty(issue);
  const reasons: RecommendationReason[] = [];

  // 1. Explicit beginner labels are the strongest positive signal.
  if (anyLabel(labels, BEGINNER_LABELS)) {
    reasons.push({
      kind: "good-first-issue",
      label: "Flagged as a good first issue",
      weight: 30,
    });
  }

  // 2. Language match against the repo's primary language.
  const userLanguages = profile.languages.map((l) => l.toLowerCase());
  if (userLanguages.includes(repo.primaryLanguage.toLowerCase())) {
    reasons.push({
      kind: "language-match",
      label: `Uses ${repo.primaryLanguage}, one of your languages`,
      weight: 20,
    });
  }

  // 3. Topic/interest overlap between repo topics and user interests.
  const interests = new Set(profile.interests.map((i) => i.toLowerCase()));
  const topicHit = repo.topics.find((t) => interests.has(t.toLowerCase()));
  if (topicHit) {
    reasons.push({
      kind: "topic-match",
      label: `Matches your interest in ${topicHit}`,
      weight: 12,
    });
  }

  // 4. Difficulty alignment with the user's stated preference.
  const distance = Math.abs(
    DIFFICULTY_ORDER[difficulty] - DIFFICULTY_ORDER[profile.preferredDifficulty],
  );
  if (distance === 0) {
    reasons.push({
      kind: "low-difficulty",
      label: `Difficulty matches your ${profile.preferredDifficulty} preference`,
      weight: 15,
    });
  } else if (distance === 1 && difficulty === "beginner") {
    reasons.push({
      kind: "low-difficulty",
      label: "Beginner-scoped and approachable",
      weight: 8,
    });
  }

  // 5. Recent maintainer/community activity — a sign the issue is live.
  const updated = new Date(issue.updatedAt).getTime();
  const ageDays = (Date.parse("2026-08-11T12:00:00Z") - updated) / 86_400_000;
  if (ageDays <= 30) {
    reasons.push({
      kind: "recent-activity",
      label: "Active in the last 30 days",
      weight: 8,
    });
  }

  // 6. Mentorship availability.
  if (anyLabel(labels, MENTORSHIP_LABELS) || repo.health.respondsToIssues) {
    reasons.push({
      kind: "mentorship",
      label: repo.health.respondsToIssues
        ? "Maintainers respond quickly to issues"
        : "Mentorship offered on this issue",
      weight: 8,
    });
  }

  // 7. Small, well-bounded scope.
  if (
    (issue.comments <= 4 && issue.body.trim().length < 900) ||
    anyLabel(labels, DOCS_LABELS)
  ) {
    reasons.push({
      kind: "small-scope",
      label: "Small, well-bounded scope",
      weight: 7,
    });
  }

  // 8. The repo documents how to contribute.
  if (repo.health.hasContributingGuide) {
    reasons.push({
      kind: "has-guidance",
      label: "Repository has a contributing guide",
      weight: 5,
    });
  }

  const rawScore = reasons.reduce((sum, r) => sum + r.weight, 0);

  // Assigned issues are effectively taken — dampen strongly but keep visible.
  const assignmentFactor = issue.assignee ? 0.4 : 1;

  const score = Math.max(
    0,
    Math.min(100, Math.round(rawScore * assignmentFactor)),
  );

  return {
    score,
    difficulty,
    reasons: reasons.sort((a, b) => b.weight - a.weight),
    estimatedEffort: effortFor(difficulty),
  };
}

/** Human-friendly bucket for a numeric score, used for badges/sorting copy. */
export function scoreTier(score: number): "excellent" | "strong" | "fair" {
  if (score >= 70) return "excellent";
  if (score >= 45) return "strong";
  return "fair";
}
