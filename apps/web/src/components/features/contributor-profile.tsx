"use client";

import Link from "next/link";
import {
  Activity, BookOpen, CheckCircle2, CircleDot, Compass, ExternalLink, Flame, FolderGit2,
  Layers, Lock, PlayCircle, Rocket, Sparkles, Trophy,
} from "lucide-react";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackendApiError } from "@/lib/backend-api";
import { useProfileStats, useResumeProfile } from "@/lib/backend-hooks";
import {
  appreciationMessage, deriveBadges, deriveContributorSkills, deriveRank, groupSkillsByLevel,
  SKILL_LEVELS, type BadgeIcon, type BadgeTier, type ContributorBadge, type SkillGroup,
} from "@/lib/contributor-skills";
import { ResumeCard } from "./resume-card";
import type { BackendProfileActivity, BackendProfileIssue, BackendProfileRepository, BackendProfileStats } from "@/lib/backend-types";

/* ---------------------------------------------------------------- helpers */

function initials(name: string): string {
  return name.split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

const BADGE_ICONS: Record<BadgeIcon, ReactNode> = {
  rocket: <Rocket className="size-3.5" />,
  compass: <Compass className="size-3.5" />,
  book: <BookOpen className="size-3.5" />,
  play: <PlayCircle className="size-3.5" />,
  check: <CheckCircle2 className="size-3.5" />,
  trophy: <Trophy className="size-3.5" />,
  flame: <Flame className="size-3.5" />,
  layers: <Layers className="size-3.5" />,
};

const TIER_STYLES: Record<BadgeTier, { ring: string; wash: string; text: string; label: string }> = {
  bronze: { ring: "border-amber-600/40", wash: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", label: "Bronze" },
  silver: { ring: "border-slate-400/50", wash: "bg-slate-400/10", text: "text-slate-600 dark:text-slate-300", label: "Silver" },
  gold: { ring: "border-yellow-500/50", wash: "bg-yellow-400/15", text: "text-yellow-700 dark:text-yellow-400", label: "Gold" },
};

/* ------------------------------------------------------------------- page */

export function ContributorProfile() {
  const stats = useProfileStats();
  // The resume already lives in guidance-service; the profile reads it rather
  // than storing a second copy of the same skills.
  const resume = useResumeProfile();

  if (stats.isLoading) return <State title="Loading your contributor profile…" />;
  if (stats.error) {
    const unauthorized = stats.error instanceof BackendApiError && stats.error.status === 401;
    return <State
      title={unauthorized ? "Your GitHub session has expired" : "Unable to load your profile"}
      detail={stats.error.message}
      action={<Button variant="outline" onClick={() => void stats.refetch()}>Try again</Button>}
    />;
  }
  if (!stats.data) return <State title="Profile unavailable" />;

  const data = stats.data;
  const skills = deriveContributorSkills(data, resume.data?.profile ?? null);
  const groups = groupSkillsByLevel(skills);
  const badges = deriveBadges(data);
  const rank = deriveRank(data);
  const appreciation = appreciationMessage(data, badges);

  return <div className="space-y-6">
    <ProfileHeader data={data} rank={rank} />
    <StatRow totals={data.totals} />
    {appreciation ? <Appreciation message={appreciation} /> : null}
    <ResumeCard />
    <Badges badges={badges} />

    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Skills groups={groups} hasResume={Boolean(resume.data?.profile)} total={skills.length} />
        <Repositories repositories={data.repositories} />
        <Issues issues={data.issues} />
      </div>
      <div className="space-y-6">
        <ActivityCard data={data} />
        <NextUp badges={badges} />
      </div>
    </div>
  </div>;
}

/* ----------------------------------------------------------------- header */

/**
 * Identity only: avatar, name, handle, and how long they have been here.
 * Contact details from the resume (email, links, location) are deliberately
 * not shown - they are not contribution signal and belong to the CV, not to
 * a profile the contributor looks at every day.
 */
function ProfileHeader({ data, rank }: { data: BackendProfileStats; rank: ReturnType<typeof deriveRank> }) {
  const displayName = data.user.displayName ?? data.user.username;
  return <header className="relative overflow-hidden rounded-2xl border border-border bg-card">
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-primary/15 via-info/10 to-transparent" />

    <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar className="size-16 ring-2 ring-primary/30 ring-offset-2 ring-offset-card">
          {data.user.avatarUrl ? <AvatarImage src={data.user.avatarUrl} alt={displayName} referrerPolicy="no-referrer" /> : null}
          <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">{initials(displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{displayName}</h1>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">@{data.user.username}</p>
          <p className="mt-1 text-xs text-subtle-foreground">Contributing since {formatDate(data.user.memberSince)}</p>
        </div>
      </div>
      <Button asChild variant="outline" className="shrink-0">
        <a href={`https://github.com/${data.user.username}`} target="_blank" rel="noreferrer noopener">
          GitHub profile<ExternalLink className="ml-2 size-4" />
        </a>
      </Button>
    </div>

    <div className="relative border-t border-border px-6 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{rank.title}</span>
          <span className="text-xs text-muted-foreground">· {rank.points} pts</span>
        </div>
        {rank.nextTitle ? (
          <span className="text-xs text-muted-foreground">{rank.nextAt! - rank.points} pts to {rank.nextTitle}</span>
        ) : (
          <span className="text-xs text-success">Top rank reached</span>
        )}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-info transition-all" style={{ width: `${rank.percent}%` }} />
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{rank.blurb}</p>
    </div>
  </header>;
}

function StatRow({ totals }: { totals: BackendProfileStats["totals"] }) {
  const items = [
    { label: "Repositories", value: totals.repositoriesAnalyzed, icon: <FolderGit2 className="size-4" />, tone: "text-chart-2" },
    { label: "Issues studied", value: totals.issuesViewed, icon: <CircleDot className="size-4" />, tone: "text-chart-5" },
    { label: "In progress", value: totals.issuesStarted, icon: <PlayCircle className="size-4" />, tone: "text-chart-3" },
    { label: "Completed", value: totals.issuesCompleted, icon: <CheckCircle2 className="size-4" />, tone: "text-chart-1" },
  ];
  return <section aria-label="Contribution statistics" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {items.map((item) => (
      <div key={item.label} className="rounded-xl border border-border bg-card p-4">
        <span className={`flex size-8 items-center justify-center rounded-lg bg-muted/60 ${item.tone}`}>{item.icon}</span>
        <p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">{item.value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.label}</p>
      </div>
    ))}
  </section>;
}

function Appreciation({ message }: { message: string }) {
  return <p className="flex items-start gap-2.5 rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm leading-6 text-foreground">
    <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
    {message}
  </p>;
}

/* ----------------------------------------------------------------- badges */

/**
 * A single scrollable row, not a grid of large tiles. The detail (progress,
 * next step) lives in "Next up" in the rail, so this strip only has to answer
 * "what have I unlocked?" at a glance.
 */
function Badges({ badges }: { badges: ContributorBadge[] }) {
  const earned = badges.filter((badge) => badge.earned).length;
  return <section className="rounded-xl border border-border bg-card px-5 py-4">
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold text-foreground">Badges</h2>
      <span className="text-xs tabular-nums text-muted-foreground">{earned} / {badges.length} unlocked</span>
    </div>
    <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {badges.map((badge) => <li key={badge.id}><BadgeChip badge={badge} /></li>)}
    </ul>
  </section>;
}

function BadgeChip({ badge }: { badge: ContributorBadge }) {
  const tier = TIER_STYLES[badge.tier];
  if (!badge.earned) {
    return <span
      title={`${badge.label} — ${badge.hint} (${badge.progress}/${badge.target})`}
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border bg-muted/20 px-2.5 py-1.5 text-xs text-subtle-foreground"
    >
      <Lock className="size-3.5" />
      <span className="whitespace-nowrap">{badge.label}</span>
      <span className="tabular-nums opacity-70">{badge.progress}/{badge.target}</span>
    </span>;
  }
  return <span
    title={badge.earnedNote}
    className={`flex shrink-0 items-center gap-1.5 rounded-full border ${tier.ring} ${tier.wash} px-2.5 py-1.5 text-xs font-medium text-foreground`}
  >
    <span className={tier.text}>{BADGE_ICONS[badge.icon]}</span>
    <span className="whitespace-nowrap">{badge.label}</span>
  </span>;
}

/* ----------------------------------------------------------------- skills */

function Skills({ groups, hasResume, total }: { groups: SkillGroup[]; hasResume: boolean; total: number }) {
  return <section className="rounded-xl border border-border bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-primary">Skills</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">Where you stand</h2>
      </div>
      {!hasResume ? <Button asChild size="sm" variant="outline"><Link href="/repositories">Upload a resume</Link></Button> : null}
    </div>

    {/* The legend is the point: a level should never be an unexplained word. */}
    <dl className="mt-4 grid gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 sm:grid-cols-2">
      {SKILL_LEVELS.map((meta) => (
        <div key={meta.level} className="flex items-start gap-2.5">
          <Meter filled={meta.filled} tone={meta.tone} />
          <div className="min-w-0">
            <dt className="text-xs font-semibold text-foreground">{meta.level}</dt>
            <dd className="text-[11px] leading-4 text-muted-foreground">{meta.meaning}</dd>
          </div>
        </div>
      ))}
    </dl>

    {total === 0 ? (
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Nothing to show yet. Upload a resume from an issue&apos;s readiness view, or analyse a repository — both feed this list.
      </p>
    ) : (
      <div className="mt-5 space-y-5">
        {groups.map((group) => (
          <div key={group.meta.level}>
            <div className="flex items-center gap-2">
              <Meter filled={group.meta.filled} tone={group.meta.tone} />
              <h3 className="text-sm font-semibold text-foreground">{group.meta.level}</h3>
              <span className="text-xs text-muted-foreground">{group.skills.length}</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {group.skills.map((skill) => (
                <span key={skill.name} title={skill.evidence}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1.5 text-xs font-medium text-foreground">
                  {skill.name}
                  {skill.issuesCompleted > 0 ? <span className="text-[10px] font-normal text-success">✓{skill.issuesCompleted}</span> : null}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    )}
  </section>;
}

const METER_TONE: Record<string, string> = {
  success: "bg-success",
  info: "bg-info",
  secondary: "bg-muted-foreground",
  warning: "bg-warning",
};

function Meter({ filled, tone }: { filled: number; tone: string }) {
  return <span aria-hidden className="mt-0.5 flex shrink-0 gap-0.5">
    {[0, 1, 2, 3].map((index) => (
      <span key={index} className={`h-3.5 w-1 rounded-full ${index < filled ? METER_TONE[tone] : "bg-border"}`} />
    ))}
  </span>;
}

/* ----------------------------------------------------------- repositories */

/**
 * Progress per project, not a directory of repositories.
 *
 * The card used to lead with language and the date it was analysed - facts
 * about the repository, not about the contributor. What belongs on a profile
 * is how far through each one they are, so every row is now a progress bar
 * with the counts that produced it.
 */
function Repositories({ repositories }: { repositories: BackendProfileRepository[] }) {
  const ordered = [...repositories].sort((a, b) =>
    b.issuesCompleted - a.issuesCompleted || b.issuesStarted - a.issuesStarted || b.issuesViewed - a.issuesViewed);

  return <section className="rounded-xl border border-border bg-card p-5">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <p className="text-sm font-medium text-primary">Progress</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">How far you are in each project</h2>
      </div>
      {repositories.length > 6 ? <Link href="/repositories" className="text-xs text-primary hover:underline">See all {repositories.length}</Link> : null}
    </div>

    {ordered.length === 0 ? (
      <p className="mt-3 text-sm text-muted-foreground">Nothing yet — import a repository to begin.</p>
    ) : (
      <ul className="mt-4 space-y-4">
        {ordered.slice(0, 6).map((repository) => <RepositoryProgress key={repository.repositoryId} repository={repository} />)}
      </ul>
    )}
  </section>;
}

function RepositoryProgress({ repository }: { repository: BackendProfileRepository }) {
  const { issuesViewed, issuesStarted, issuesCompleted } = repository;
  // "Touched" is the honest denominator: issues this contributor has actually
  // opened here. Anything else would be progress against a number they have
  // never seen.
  const touched = Math.max(issuesViewed, issuesStarted, issuesCompleted, 1);
  const done = Math.round((issuesCompleted / touched) * 100);
  const inProgress = Math.round((Math.max(issuesStarted - issuesCompleted, 0) / touched) * 100);
  const [owner, name] = repository.fullName.split("/");

  return <li>
    <div className="flex items-baseline justify-between gap-3">
      <Link href={`/repositories/id/${repository.repositoryId}`} className="min-w-0 truncate text-sm font-medium text-foreground hover:text-primary">
        <span className="text-muted-foreground">{owner}/</span>{name}
      </Link>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {issuesCompleted} of {touched} done
      </span>
    </div>

    <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-muted" role="presentation">
      <span className="bg-success transition-all" style={{ width: `${done}%` }} />
      <span className="bg-info/70 transition-all" style={{ width: `${inProgress}%` }} />
    </div>

    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-subtle-foreground">
      <span><span className="font-medium text-success">{issuesCompleted}</span> completed</span>
      <span><span className="font-medium text-info">{issuesStarted}</span> started</span>
      <span><span className="font-medium text-foreground">{issuesViewed}</span> studied</span>
    </div>
  </li>;
}

/* ----------------------------------------------------------------- issues */

const ISSUE_STATUS = {
  completed: { label: "Completed", rail: "bg-success", chip: "success" as const, icon: <CheckCircle2 className="size-3.5" /> },
  started: { label: "In progress", rail: "bg-info", chip: "info" as const, icon: <PlayCircle className="size-3.5" /> },
  viewed: { label: "Studied", rail: "bg-border", chip: "muted" as const, icon: <CircleDot className="size-3.5" /> },
};

function Issues({ issues }: { issues: BackendProfileIssue[] }) {
  const ordered = [...issues].sort((a, b) => {
    const rank = { completed: 0, started: 1, viewed: 2 } as const;
    return rank[a.status] - rank[b.status] || b.updatedAt.localeCompare(a.updatedAt);
  });
  return <section className="rounded-xl border border-border bg-card p-5">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <p className="text-sm font-medium text-primary">Issue history</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">Issues you have worked on</h2>
      </div>
      {ordered.length > 8 ? <span className="text-xs text-muted-foreground">Showing 8 of {ordered.length}</span> : null}
    </div>
    {ordered.length === 0 ? (
      <p className="mt-3 text-sm text-muted-foreground">No issues yet — open one from a repository to start tracking it.</p>
    ) : (
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {ordered.slice(0, 8).map((issue) => <IssueCard key={issue.issueId} issue={issue} />)}
      </div>
    )}
  </section>;
}

function IssueCard({ issue }: { issue: BackendProfileIssue }) {
  const status = ISSUE_STATUS[issue.status] ?? ISSUE_STATUS.viewed;
  return <Link
    href={`/repositories/id/${issue.repositoryId}/issues/${issue.issueId}`}
    className="group relative overflow-hidden rounded-xl border border-border/70 bg-muted/15 p-4 pl-5 transition-colors hover:border-primary/45 hover:bg-muted/30"
  >
    <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${status.rail}`} />
    <div className="flex items-start justify-between gap-2">
      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">#{issue.number}</span>
      <Badge variant={status.chip} className="shrink-0 gap-1">{status.icon}{status.label}</Badge>
    </div>
    <p className="mt-2 line-clamp-2 text-sm font-medium leading-5 text-foreground group-hover:text-primary">{issue.title}</p>
    <p className="mt-2 truncate text-xs text-muted-foreground">{issue.repositoryFullName}</p>
    {issue.labels.length > 0 ? (
      <div className="mt-2.5 flex flex-wrap gap-1">
        {issue.labels.slice(0, 3).map((label) => (
          <span key={label} className="rounded-full border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">{label}</span>
        ))}
      </div>
    ) : null}
  </Link>;
}

/* --------------------------------------------------------------- activity */

function ActivityCard({ data }: { data: BackendProfileStats }) {
  const busiest = Math.max(1, ...data.activityByDay.map((day) => day.count));
  return <section className="rounded-xl border border-border bg-card p-5">
    <div className="flex items-center gap-2">
      <Activity className="size-4 text-primary" />
      <div>
        <p className="text-sm font-medium text-primary">Activity</p>
        <h2 className="mt-0.5 text-lg font-semibold text-foreground">Last 90 days</h2>
      </div>
    </div>

    <div className="mt-4 flex flex-wrap gap-1">
      {data.activityByDay.map((day) => {
        const ratio = day.count / busiest;
        const tone = day.count === 0 ? "bg-muted" : ratio > 0.66 ? "bg-primary" : ratio > 0.33 ? "bg-primary/70" : "bg-primary/40";
        return <span key={day.date} title={`${day.date}: ${day.count} event${day.count === 1 ? "" : "s"}`} className={`size-2.5 rounded-[3px] ${tone}`} />;
      })}
    </div>

    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
      <Mini label="Streak" value={`${data.streak.current}d`} />
      <Mini label="Longest" value={`${data.streak.longest}d`} />
      <Mini label="Active days" value={String(data.streak.activeDays)} />
    </div>

    <div className="mt-4 space-y-2.5 border-t border-border pt-4">
      {data.activity.length === 0
        ? <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
        : data.activity.slice(0, 7).map((entry) => <ActivityRow key={entry.id} entry={entry} />)}
    </div>
  </section>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border/70 bg-muted/20 p-2">
    <p className="text-base font-semibold tabular-nums text-foreground">{value}</p>
    <p className="text-[11px] text-muted-foreground">{label}</p>
  </div>;
}

const ACTIVITY_LABELS: Record<string, string> = {
  repository_analyzed: "Analysed",
  issue_started: "Started",
  issue_completed: "Completed",
  issue_viewed: "Studied",
};

function ActivityRow({ entry }: { entry: BackendProfileActivity }) {
  const label = ACTIVITY_LABELS[entry.type] ?? "Studied";
  const subject = entry.issueNumber ? `#${entry.issueNumber} ${entry.issueTitle ?? ""}` : entry.repositoryFullName ?? "";
  return <div className="flex items-start gap-2 text-xs">
    <span className="shrink-0 font-medium text-foreground">{label}</span>
    <span className="min-w-0 flex-1 truncate text-muted-foreground">{subject}</span>
    <span className="shrink-0 tabular-nums text-subtle-foreground">{formatDate(entry.occurredAt)}</span>
  </div>;
}

/* ---------------------------------------------------------------- next up */

/** The three locked badges closest to being earned - a concrete "what next". */
function NextUp({ badges }: { badges: ContributorBadge[] }) {
  const upcoming = badges
    .filter((badge) => !badge.earned)
    .sort((a, b) => (b.progress / b.target) - (a.progress / a.target))
    .slice(0, 3);

  if (upcoming.length === 0) {
    return <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2"><Trophy className="size-4 text-success" /><h2 className="text-lg font-semibold text-foreground">Every badge earned</h2></div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">You have cleared the whole set. New badges will appear here as they are added.</p>
    </section>;
  }

  return <section className="rounded-xl border border-border bg-card p-5">
    <div className="flex items-center gap-2">
      <Sparkles className="size-4 text-primary" />
      <div>
        <p className="text-sm font-medium text-primary">Next up</p>
        <h2 className="mt-0.5 text-lg font-semibold text-foreground">Closest to unlocking</h2>
      </div>
    </div>
    <ul className="mt-4 space-y-4">
      {upcoming.map((badge) => (
        <li key={badge.id}>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{badge.label}</p>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{badge.progress}/{badge.target}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.round((badge.progress / badge.target) * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{badge.hint}</p>
        </li>
      ))}
    </ul>
  </section>;
}

/* ------------------------------------------------------------------ state */

function State({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <section className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
    <h1 className="text-lg font-semibold text-foreground">{title}</h1>
    {detail ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{detail}</p> : null}
    {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
  </section>;
}
