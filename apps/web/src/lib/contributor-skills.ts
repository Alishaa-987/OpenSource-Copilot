import type { BackendProfileStats, BackendResumeProfile } from "./backend-types";

/* -------------------------------------------------------------------------
 * Skill levels
 *
 * The old labels ("Intermediate", "Learning") did not tell a contributor what
 * the label was based on, which made the list read as if a number had been
 * invented for them. Every level now has a one-line meaning that is shown
 * next to the list, and the rule that produces it is written out below.
 * Nothing here is estimated and no model is called.
 * ---------------------------------------------------------------------- */

export type SkillLevel = "Strong" | "Practising" | "Familiar" | "Exploring";

export interface SkillLevelMeta {
  level: SkillLevel;
  /** Plain-language meaning, shown in the legend. */
  meaning: string;
  tone: "success" | "info" | "secondary" | "warning";
  /** Filled segments out of 4, for the small strength meter. */
  filled: number;
}

export const SKILL_LEVELS: readonly SkillLevelMeta[] = [
  { level: "Strong", meaning: "On your resume and you have finished issues using it", tone: "success", filled: 4 },
  { level: "Practising", meaning: "You have finished real work with it here", tone: "info", filled: 3 },
  { level: "Familiar", meaning: "On your resume, no finished work here yet", tone: "secondary", filled: 2 },
  { level: "Exploring", meaning: "Appears in repositories you opened, new for you", tone: "warning", filled: 1 },
];

export const LEVEL_META: Record<SkillLevel, SkillLevelMeta> = SKILL_LEVELS.reduce(
  (acc, meta) => ({ ...acc, [meta.level]: meta }),
  {} as Record<SkillLevel, SkillLevelMeta>,
);

export interface ContributorSkill {
  name: string;
  level: SkillLevel;
  /** Why this level, in one short sentence. */
  evidence: string;
  fromResume: boolean;
  repositories: number;
  issuesCompleted: number;
}

const LEVEL_ORDER: Record<SkillLevel, number> = { Strong: 0, Practising: 1, Familiar: 2, Exploring: 3 };

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Resume parsing can pick up contact lines and stray fragments. Anything that
 * is plainly not a technology is dropped rather than shown as a "skill" - a
 * profile listing an email address as a skill is worse than showing nothing.
 */
function isRealSkill(value: string): boolean {
  const text = value.trim();
  if (text.length < 2 || text.length > 28) return false;
  if (/[@|]/.test(text)) return false;                 // emails, table pipes
  if (/https?:\/\/|www\.|\.com|\.org|\.net|\.io/i.test(text)) return false;
  if (/^\+?\d[\d\s()-]{5,}$/.test(text)) return false; // phone numbers
  if (!/[a-z]/i.test(text)) return false;              // pure digits / symbols
  if (text.split(/\s+/).length > 4) return false;      // sentences, not skills
  return true;
}

/**
 * Derives skill levels from evidence that already exists.
 *
 * Inputs are the parsed resume (what the contributor says they know) and the
 * activity recorded in this product (what they have actually worked with).
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
    if (isRealSkill(value)) resumeSkills.set(normalise(value), value.trim());
  }

  const activity = new Map<string, { label: string; repositories: number; issuesCompleted: number }>();
  for (const entry of stats?.languageUsage ?? []) {
    if (!isRealSkill(entry.name)) continue;
    activity.set(normalise(entry.name), { label: entry.name, repositories: entry.repositories, issuesCompleted: entry.issuesCompleted });
  }
  for (const topic of stats?.technologies ?? []) {
    if (!isRealSkill(topic)) continue;
    const key = normalise(topic);
    if (!activity.has(key)) activity.set(key, { label: topic, repositories: 1, issuesCompleted: 0 });
  }

  const skills: ContributorSkill[] = [];
  for (const key of new Set([...resumeSkills.keys(), ...activity.keys()])) {
    const fromResume = resumeSkills.has(key);
    const used = activity.get(key);
    const repositories = used?.repositories ?? 0;
    const issuesCompleted = used?.issuesCompleted ?? 0;
    const name = resumeSkills.get(key) ?? used?.label ?? key;

    let level: SkillLevel;
    let evidence: string;
    if (fromResume && issuesCompleted > 0) {
      level = "Strong";
      evidence = `On your resume · ${issuesCompleted} issue${issuesCompleted === 1 ? "" : "s"} finished`;
    } else if (issuesCompleted > 0 && repositories > 1) {
      level = "Strong";
      evidence = `${issuesCompleted} issue${issuesCompleted === 1 ? "" : "s"} finished across ${repositories} repositories`;
    } else if (fromResume && repositories > 0) {
      level = "Practising";
      evidence = `On your resume · used in ${repositories} repositor${repositories === 1 ? "y" : "ies"} you opened`;
    } else if (issuesCompleted > 0) {
      level = "Practising";
      evidence = `${issuesCompleted} issue${issuesCompleted === 1 ? "" : "s"} finished · not on your resume yet`;
    } else if (fromResume) {
      level = "Familiar";
      evidence = "On your resume · no finished work here yet";
    } else {
      level = "Exploring";
      evidence = `Seen in ${repositories} repositor${repositories === 1 ? "y" : "ies"} you opened`;
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

export interface SkillGroup {
  meta: SkillLevelMeta;
  skills: ContributorSkill[];
}

/** Groups skills by level so the list reads as four short sections, not one long dump. */
export function groupSkillsByLevel(skills: ContributorSkill[]): SkillGroup[] {
  return SKILL_LEVELS
    .map((meta) => ({ meta, skills: skills.filter((skill) => skill.level === meta.level) }))
    .filter((group) => group.skills.length > 0);
}

/* -------------------------------------------------------------------------
 * Rank
 * ---------------------------------------------------------------------- */

export interface Rank {
  title: string;
  points: number;
  /** Points needed for the next rank, or null once the top rank is reached. */
  nextAt: number | null;
  nextTitle: string | null;
  /** 0-100, progress towards the next rank. */
  percent: number;
  blurb: string;
}

const RANKS: Array<{ at: number; title: string; blurb: string }> = [
  { at: 0, title: "Newcomer", blurb: "You have just arrived - import a repository to begin." },
  { at: 10, title: "Explorer", blurb: "You are reading real codebases and real issues." },
  { at: 30, title: "Contributor", blurb: "You are picking up issues and working through them." },
  { at: 75, title: "Builder", blurb: "You finish what you start, repeatedly." },
  { at: 150, title: "Maintainer", blurb: "You move through open source like it is home." },
];

/** Weighted so that finishing work counts for far more than browsing does. */
export function derivePoints(stats: BackendProfileStats | undefined): number {
  const totals = stats?.totals;
  return (totals?.repositoriesAnalyzed ?? 0) * 2
    + (totals?.issuesViewed ?? 0) * 1
    + (totals?.issuesStarted ?? 0) * 3
    + (totals?.issuesCompleted ?? 0) * 6;
}

export function deriveRank(stats: BackendProfileStats | undefined): Rank {
  const points = derivePoints(stats);
  let index = 0;
  for (let i = 0; i < RANKS.length; i += 1) if (points >= RANKS[i].at) index = i;
  const current = RANKS[index];
  const next = RANKS[index + 1] ?? null;
  const span = next ? next.at - current.at : 1;
  return {
    title: current.title,
    points,
    nextAt: next?.at ?? null,
    nextTitle: next?.title ?? null,
    percent: next ? Math.min(100, Math.round(((points - current.at) / span) * 100)) : 100,
    blurb: current.blurb,
  };
}

/* -------------------------------------------------------------------------
 * Badges
 * ---------------------------------------------------------------------- */

export type BadgeTier = "bronze" | "silver" | "gold";
export type BadgeIcon = "rocket" | "compass" | "book" | "play" | "check" | "trophy" | "flame" | "layers";

export interface ContributorBadge {
  id: string;
  label: string;
  /** Shown when earned - what the contributor actually did. */
  earnedNote: string;
  /** Shown when locked - the one next step. */
  hint: string;
  icon: BadgeIcon;
  tier: BadgeTier;
  earned: boolean;
  progress: number;
  target: number;
}

/**
 * Badges are plain thresholds over counts already held, in one list so new
 * ones can be added later without touching the page.
 */
export function deriveBadges(stats: BackendProfileStats | undefined): ContributorBadge[] {
  const totals = stats?.totals;
  const repositories = totals?.repositoriesAnalyzed ?? 0;
  const viewed = totals?.issuesViewed ?? 0;
  const started = totals?.issuesStarted ?? 0;
  const completed = totals?.issuesCompleted ?? 0;
  const activeDays = stats?.streak.activeDays ?? 0;

  const definitions: Array<Omit<ContributorBadge, "earned" | "progress"> & { value: number }> = [
    { id: "first-repo", label: "First Steps", icon: "rocket", tier: "bronze", value: repositories, target: 1,
      earnedNote: "Imported your first repository", hint: "Import one repository" },
    { id: "explorer", label: "Repo Explorer", icon: "compass", tier: "silver", value: repositories, target: 5,
      earnedNote: "Analysed five different repositories", hint: "Analyse five repositories" },
    { id: "reader", label: "Issue Reader", icon: "book", tier: "bronze", value: viewed, target: 5,
      earnedNote: "Studied five issues end to end", hint: "Open five issue workspaces" },
    { id: "deep-reader", label: "Deep Reader", icon: "layers", tier: "silver", value: viewed, target: 25,
      earnedNote: "Studied twenty-five issues", hint: "Keep studying issues" },
    { id: "first-start", label: "Hands On", icon: "play", tier: "bronze", value: started, target: 1,
      earnedNote: 'Started working on an issue', hint: 'Press "Start working" on any issue' },
    { id: "first-done", label: "First Contribution", icon: "check", tier: "gold", value: completed, target: 1,
      earnedNote: "Finished your first issue", hint: "Mark one issue complete" },
    { id: "five-done", label: "Steady Hand", icon: "trophy", tier: "gold", value: completed, target: 5,
      earnedNote: "Finished five issues", hint: "Finish five issues" },
    { id: "consistent", label: "Consistent", icon: "flame", tier: "silver", value: activeDays, target: 7,
      earnedNote: "Active on seven different days", hint: "Come back across seven days" },
  ];

  return definitions.map(({ value, ...rest }) => ({
    ...rest,
    earned: value >= rest.target,
    progress: Math.min(value, rest.target),
  }));
}

/**
 * One honest line of encouragement, chosen from what actually happened.
 * Never congratulates someone for doing nothing.
 */
export function appreciationMessage(stats: BackendProfileStats | undefined, badges: ContributorBadge[]): string | null {
  const totals = stats?.totals;
  const completed = totals?.issuesCompleted ?? 0;
  const started = totals?.issuesStarted ?? 0;
  const viewed = totals?.issuesViewed ?? 0;
  const repositories = totals?.repositoriesAnalyzed ?? 0;
  const earned = badges.filter((badge) => badge.earned).length;

  if (completed >= 5) return `${completed} issues finished. That is a real contribution record - maintainers notice this.`;
  if (completed >= 1) return `You have finished ${completed} issue${completed === 1 ? "" : "s"}. The hardest one is the first, and it is behind you.`;
  if (started >= 1) return "You have an issue in progress. Finishing it is what turns reading into contributing.";
  if (viewed >= 5) return `${viewed} issues studied. Pick the one that felt clearest and press "Start working".`;
  if (repositories >= 1) return `${repositories} repositor${repositories === 1 ? "y" : "ies"} analysed. Open an issue next and see how it maps to the code.`;
  if (earned > 0) return "Good start - keep going.";
  return null;
}
