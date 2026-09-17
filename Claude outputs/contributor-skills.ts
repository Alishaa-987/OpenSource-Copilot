import type { BackendProfileStats, BackendResumeProfile } from "./backend-types";

export type SkillLevel = "Strong" | "Intermediate" | "Familiar" | "Learning";

export interface ContributorSkill {
  name: string;
  level: SkillLevel;
  /** Plain-language reason, so a level is never an unexplained label. */
  evidence: string;
  fromResume: boolean;
  repositories: number;
  issuesCompleted: number;
}

const LEVEL_ORDER: Record<SkillLevel, number> = { Strong: 0, Intermediate: 1, Familiar: 2, Learning: 3 };

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Derives skill levels from evidence that already exists - nothing here is
 * guessed and no model is called.
 *
 * The inputs are the parsed resume (what the contributor says they know) and
 * recorded activity (what they have actually worked with in this product):
 *
 *   Strong        resume lists it AND at least one completed issue in it,
 *                 or completed issues in 2+ repositories using it
 *   Intermediate  resume lists it and it appears in repositories worked with,
 *                 or completed work in it without the resume mentioning it
 *   Familiar      resume lists it, no matching activity yet
 *   Learning      seen in repositories worked with, not on the resume
 *
 * A skill with no evidence on either side is simply not shown.
 */
export function deriveContributorSkills(
  stats: BackendProfileStats | undefined,
  resume: BackendResumeProfile | null | undefined,
): ContributorSkill[] {
  const resumeSkills = new Map<string, string>();
  for (const value of [
    ...(resume?.programmingLanguages ?? []),
    ...(resume?.frameworksTools ?? []),
    ...(resume?.skills ?? []),
  ]) {
    if (value.trim()) resumeSkills.set(normalise(value), value.trim());
  }

  // Activity side: languages of repositories worked with, plus their topics.
  const activity = new Map<string, { label: string; repositories: number; issuesCompleted: number }>();
  for (const entry of stats?.languageUsage ?? []) {
    activity.set(normalise(entry.name), { label: entry.name, repositories: entry.repositories, issuesCompleted: entry.issuesCompleted });
  }
  for (const topic of stats?.technologies ?? []) {
    const key = normalise(topic);
    if (!activity.has(key)) activity.set(key, { label: topic, repositories: 1, issuesCompleted: 0 });
  }

  const keys = new Set([...resumeSkills.keys(), ...activity.keys()]);
  const skills: ContributorSkill[] = [];

  for (const key of keys) {
    const fromResume = resumeSkills.has(key);
    const used = activity.get(key);
    const repositories = used?.repositories ?? 0;
    const issuesCompleted = used?.issuesCompleted ?? 0;
    const name = resumeSkills.get(key) ?? used?.label ?? key;

    let level: SkillLevel;
    let evidence: string;
    if (fromResume && issuesCompleted > 0) {
      level = "Strong";
      evidence = `On your resume and ${issuesCompleted} completed issue${issuesCompleted === 1 ? "" : "s"}`;
    } else if (issuesCompleted > 0 && repositories > 1) {
      level = "Strong";
      evidence = `${issuesCompleted} completed issue${issuesCompleted === 1 ? "" : "s"} across ${repositories} repositories`;
    } else if (fromResume && repositories > 0) {
      level = "Intermediate";
      evidence = `On your resume and used in ${repositories} repositor${repositories === 1 ? "y" : "ies"} you work with`;
    } else if (issuesCompleted > 0) {
      level = "Intermediate";
      evidence = `${issuesCompleted} completed issue${issuesCompleted === 1 ? "" : "s"}, not yet on your resume`;
    } else if (fromResume) {
      level = "Familiar";
      evidence = "On your resume, no completed work here yet";
    } else {
      level = "Learning";
      evidence = `Used in ${repositories} repositor${repositories === 1 ? "y" : "ies"} you work with, not on your resume`;
    }

    skills.push({ name, level, evidence, fromResume, repositories, issuesCompleted });
  }

  return skills.sort((a, b) =>
    LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] ||
    b.issuesCompleted - a.issuesCompleted ||
    b.repositories - a.repositories ||
    a.name.localeCompare(b.name),
  );
}

export interface Milestone {
  label: string;
  achieved: boolean;
  progress: number;
  target: number;
  hint: string;
}

/**
 * Milestones are plain thresholds over counts we already hold, kept in one
 * list so new ones can be added without touching the page.
 */
export function deriveMilestones(stats: BackendProfileStats | undefined): Milestone[] {
  const totals = stats?.totals;
  const definitions: Array<{ label: string; value: number; target: number; hint: string }> = [
    { label: "First repository analysed", value: totals?.repositoriesAnalyzed ?? 0, target: 1, hint: "Import a repository to start" },
    { label: "Explored 5 repositories", value: totals?.repositoriesAnalyzed ?? 0, target: 5, hint: "Import and analyse five repositories" },
    { label: "First issue studied", value: totals?.issuesViewed ?? 0, target: 1, hint: "Open any issue workspace" },
    { label: "Studied 10 issues", value: totals?.issuesViewed ?? 0, target: 10, hint: "Keep exploring issues" },
    { label: "First issue started", value: totals?.issuesStarted ?? 0, target: 1, hint: 'Use "Start working" on an issue' },
    { label: "First issue completed", value: totals?.issuesCompleted ?? 0, target: 1, hint: "Mark an issue complete once your work is done" },
    { label: "Completed 5 issues", value: totals?.issuesCompleted ?? 0, target: 5, hint: "Five completed issues" },
    { label: "Active 7 days", value: stats?.streak.activeDays ?? 0, target: 7, hint: "Work on something across seven days" },
  ];
  return definitions.map((definition) => ({
    label: definition.label,
    achieved: definition.value >= definition.target,
    progress: Math.min(definition.value, definition.target),
    target: definition.target,
    hint: definition.hint,
  }));
}
