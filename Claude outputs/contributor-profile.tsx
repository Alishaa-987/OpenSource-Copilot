"use client";

import Link from "next/link";
import { Activity, CheckCircle2, CircleDot, ExternalLink, FolderGit2, PlayCircle, Sparkles, Trophy } from "lucide-react";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackendApiError } from "@/lib/backend-api";
import { useProfileStats, useResumeProfile } from "@/lib/backend-hooks";
import { deriveContributorSkills, deriveMilestones, type SkillLevel } from "@/lib/contributor-skills";
import type { BackendProfileActivity, BackendProfileStats } from "@/lib/backend-types";

const LEVEL_VARIANT: Record<SkillLevel, "success" | "info" | "secondary" | "warning"> = {
  Strong: "success",
  Intermediate: "info",
  Familiar: "secondary",
  Learning: "warning",
};

function initials(name: string): string {
  return name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function ContributorProfile() {
  const stats = useProfileStats();
  // The resume already lives in guidance-service; the profile reads it rather
  // than storing a second copy of the same skills.
  const resume = useResumeProfile();

  if (stats.isLoading) return <State title="Loading your contributor profile…" />;
  if (stats.error) {
    const unauthorized = stats.error instanceof BackendApiError && stats.error.status === 401;
    return <State title={unauthorized ? "Your GitHub session has expired" : "Unable to load your profile"} detail={stats.error.message} action={<Button variant="outline" onClick={() => void stats.refetch()}>Try again</Button>} />;
  }
  if (!stats.data) return <State title="Profile unavailable" />;

  const data = stats.data;
  const skills = deriveContributorSkills(data, resume.data?.profile ?? null);
  const milestones = deriveMilestones(data);
  const displayName = data.user.displayName ?? data.user.username;

  return <div className="space-y-6">
    <ProfileHeader data={data} displayName={displayName} summary={resume.data?.profile?.summary ?? null} />

    <section aria-label="Contribution statistics" className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-4 sm:divide-y-0">
      <Stat label="Repositories analysed" value={data.totals.repositoriesAnalyzed} icon={<FolderGit2 className="size-4" />} />
      <Stat label="Issues studied" value={data.totals.issuesViewed} icon={<CircleDot className="size-4" />} />
      <Stat label="Issues started" value={data.totals.issuesStarted} icon={<PlayCircle className="size-4" />} />
      <Stat label="Issues completed" value={data.totals.issuesCompleted} icon={<CheckCircle2 className="size-4" />} />
    </section>

    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Skills skills={skills} hasResume={Boolean(resume.data?.profile)} />
        <Repositories data={data} />
        <Issues data={data} />
      </div>
      <div className="space-y-6">
        <ActivityCard data={data} />
        <Milestones milestones={milestones} />
      </div>
    </div>
  </div>;
}

function ProfileHeader({ data, displayName, summary }: { data: BackendProfileStats; displayName: string; summary: string | null }) {
  return <header className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex min-w-0 items-start gap-4">
      <Avatar className="size-14">
        {data.user.avatarUrl && <AvatarImage src={data.user.avatarUrl} alt={displayName} />}
        <AvatarFallback>{initials(displayName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-sm font-medium text-primary">Contributor profile</p>
        <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-foreground">{displayName}</h1>
        <p className="text-sm text-muted-foreground">@{data.user.username} · contributing since {formatDate(data.user.memberSince)}</p>
        {summary ? <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{summary}</p> : null}
      </div>
    </div>
    <Button asChild variant="outline" className="shrink-0">
      <a href={`https://github.com/${data.user.username}`} target="_blank" rel="noreferrer noopener">
        GitHub profile<ExternalLink className="ml-2 size-4" />
      </a>
    </Button>
  </header>;
}

function Stat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return <div className="p-4">
    <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{icon}{label}</span>
    <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
  </div>;
}

function Skills({ skills, hasResume }: { skills: ReturnType<typeof deriveContributorSkills>; hasResume: boolean }) {
  return <section className="rounded-xl border border-border bg-card p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-primary">Skills</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">Where you stand</h2>
      </div>
      {!hasResume ? <Button asChild size="sm" variant="outline"><Link href="/repositories">Upload a resume</Link></Button> : null}
    </div>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
      Levels come from your resume and the work recorded here - nothing is estimated.
    </p>
    {skills.length === 0 ? (
      <p className="mt-4 text-sm text-muted-foreground">
        No skills yet. Upload a resume on an issue&apos;s readiness view, or analyse a repository to start building this.
      </p>
    ) : (
      <ul className="mt-4 divide-y divide-border">
        {skills.slice(0, 18).map((skill) => (
          <li key={skill.name} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{skill.name}</p>
              <p className="truncate text-xs text-muted-foreground">{skill.evidence}</p>
            </div>
            <Badge variant={LEVEL_VARIANT[skill.level]} className="shrink-0">{skill.level}</Badge>
          </li>
        ))}
      </ul>
    )}
  </section>;
}

function Repositories({ data }: { data: BackendProfileStats }) {
  return <section className="rounded-xl border border-border bg-card p-5">
    <p className="text-sm font-medium text-primary">Projects</p>
    <h2 className="mt-1 text-lg font-semibold text-foreground">Repositories you work with</h2>
    {data.repositories.length === 0 ? (
      <p className="mt-3 text-sm text-muted-foreground">Nothing yet — import a repository to begin.</p>
    ) : (
      <div className="mt-4 space-y-2">
        {data.repositories.slice(0, 8).map((repository) => (
          <Link key={repository.repositoryId} href={`/repositories/id/${repository.repositoryId}`} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 transition-colors hover:border-primary/40">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{repository.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {repository.language ? `${repository.language} · ` : ""}analysed {formatDate(repository.analyzedAt)}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {repository.issuesCompleted > 0 ? `${repository.issuesCompleted} completed` : `${repository.issuesViewed} studied`}
            </span>
          </Link>
        ))}
      </div>
    )}
  </section>;
}

function Issues({ data }: { data: BackendProfileStats }) {
  const ordered = [...data.issues].sort((a, b) => {
    const rank = { completed: 0, started: 1, viewed: 2 } as const;
    return rank[a.status] - rank[b.status] || b.updatedAt.localeCompare(a.updatedAt);
  });
  return <section className="rounded-xl border border-border bg-card p-5">
    <p className="text-sm font-medium text-primary">Issue history</p>
    <h2 className="mt-1 text-lg font-semibold text-foreground">Issues you have worked on</h2>
    {ordered.length === 0 ? (
      <p className="mt-3 text-sm text-muted-foreground">No issues yet — open one from a repository to start tracking it.</p>
    ) : (
      <div className="mt-4 space-y-2">
        {ordered.slice(0, 10).map((issue) => (
          <Link key={issue.issueId} href={`/issues/${issue.issueId}`} className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 transition-colors hover:border-primary/40">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">#{issue.number} {issue.title}</p>
              <p className="truncate text-xs text-muted-foreground">{issue.repositoryFullName}</p>
            </div>
            <Badge variant={issue.status === "completed" ? "success" : issue.status === "started" ? "info" : "muted"} className="shrink-0 capitalize">
              {issue.status}
            </Badge>
          </Link>
        ))}
      </div>
    )}
  </section>;
}

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
    <div className="mt-4 flex flex-wrap gap-1" aria-hidden>
      {data.activityByDay.map((day) => (
        <span
          key={day.date}
          title={`${day.date}: ${day.count} event${day.count === 1 ? "" : "s"}`}
          className="size-2.5 rounded-[3px]"
          style={{ backgroundColor: day.count === 0 ? "var(--muted)" : undefined }}
          data-level={day.count === 0 ? 0 : Math.ceil((day.count / busiest) * 3)}
        >
          <span className={`block size-2.5 rounded-[3px] ${day.count === 0 ? "bg-muted" : day.count / busiest > 0.66 ? "bg-primary" : day.count / busiest > 0.33 ? "bg-primary/70" : "bg-primary/40"}`} />
        </span>
      ))}
    </div>
    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
      <Mini label="Current streak" value={`${data.streak.current}d`} />
      <Mini label="Longest" value={`${data.streak.longest}d`} />
      <Mini label="Active days" value={String(data.streak.activeDays)} />
    </div>
    <div className="mt-4 space-y-2 border-t border-border pt-4">
      {data.activity.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
      ) : data.activity.slice(0, 8).map((entry) => <ActivityRow key={entry.id} entry={entry} />)}
    </div>
  </section>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border/70 bg-muted/20 p-2">
    <p className="text-base font-semibold text-foreground">{value}</p>
    <p className="text-[11px] text-muted-foreground">{label}</p>
  </div>;
}

function ActivityRow({ entry }: { entry: BackendProfileActivity }) {
  const label = entry.type === "repository_analyzed" ? "Analysed"
    : entry.type === "issue_started" ? "Started"
    : entry.type === "issue_completed" ? "Completed"
    : "Studied";
  const subject = entry.issueNumber ? `#${entry.issueNumber} ${entry.issueTitle ?? ""}` : entry.repositoryFullName ?? "";
  return <div className="flex items-start gap-2 text-xs">
    <span className="shrink-0 font-medium text-foreground">{label}</span>
    <span className="min-w-0 flex-1 truncate text-muted-foreground">{subject}</span>
    <span className="shrink-0 text-subtle-foreground">{formatDate(entry.occurredAt)}</span>
  </div>;
}

function Milestones({ milestones }: { milestones: ReturnType<typeof deriveMilestones> }) {
  const achieved = milestones.filter((milestone) => milestone.achieved).length;
  return <section className="rounded-xl border border-border bg-card p-5">
    <div className="flex items-center gap-2">
      <Trophy className="size-4 text-primary" />
      <div>
        <p className="text-sm font-medium text-primary">Milestones</p>
        <h2 className="mt-0.5 text-lg font-semibold text-foreground">{achieved} of {milestones.length}</h2>
      </div>
    </div>
    <ul className="mt-4 space-y-2.5">
      {milestones.map((milestone) => (
        <li key={milestone.label} className="flex items-start gap-2.5">
          {milestone.achieved
            ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
            : <Sparkles className="mt-0.5 size-4 shrink-0 text-subtle-foreground" />}
          <div className="min-w-0">
            <p className={`text-sm ${milestone.achieved ? "font-medium text-foreground" : "text-muted-foreground"}`}>{milestone.label}</p>
            {!milestone.achieved ? (
              <p className="text-xs text-subtle-foreground">{milestone.hint} ({milestone.progress}/{milestone.target})</p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  </section>;
}

function State({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <section className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
    <h1 className="text-lg font-semibold text-foreground">{title}</h1>
    {detail ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{detail}</p> : null}
    {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
  </section>;
}
