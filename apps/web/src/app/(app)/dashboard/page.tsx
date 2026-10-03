"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BookOpen, FolderGit2, ListChecks, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/features/stat-tile";
import { JourneyStepper, type JourneyDisplayStep } from "@/components/features/journey-stepper";
import { RepoSummaryCard } from "@/components/features/repo-summary-card";
import { BackendApiError } from "@/lib/backend-api";
import { toUiRepository } from "@/lib/backend-adapters";
import { useAccessibleRepositories } from "@/lib/backend-hooks";

const journeySteps: JourneyDisplayStep[] = [
  { id: "repository", title: "Choose a repository", icon: FolderGit2, status: "current", caption: "Phase 1" },
  { id: "issue", title: "Find an issue", icon: ListChecks, status: "upcoming", caption: "Phase 1" },
  { id: "contribute", title: "Make a contribution", icon: Target, status: "upcoming", caption: "Later" },
];

export default function DashboardPage() {
  const repositories = useAccessibleRepositories({ page: 1, perPage: 4 });
  if (repositories.isLoading) return <DashboardState title="Loading your repositories…" />;
  if (repositories.error) return <DashboardState title={repositories.error instanceof BackendApiError && repositories.error.status === 401 ? "Your GitHub session has expired" : "Unable to load your repositories"} detail={repositories.error.message} action={<Button onClick={() => repositories.refetch()}>Try again</Button>} />;
  const items = repositories.data?.items ?? [];
  const uiRepositories = items.map(toUiRepository);
  return <div className="space-y-8"><section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-primary">Your workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Start with a repository</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Connect GitHub, import a repository, and use transparent Phase 1 heuristics to find open issues worth exploring.</p></div><Button asChild><Link href="/repositories">Browse repositories<ArrowRight className="size-4" /></Link></Button></section><section aria-label="Backend summary" className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-4 sm:divide-y-0"><StatTile label="Accessible repositories" value={items.length} hint={repositories.data?.hasNext ? "First page" : "From GitHub"} icon={FolderGit2} /><StatTile label="Recommended issues" value="—" hint="Choose a repository" icon={ListChecks} /><StatTile label="Beginner-friendly" value="—" hint="Available after import" icon={Sparkles} /><StatTile label="Recommendation engine" value="Phase 1" hint="Deterministic rules" icon={BookOpen} /></section><section className="rounded-xl border border-border bg-card p-6"><div className="mb-6"><h2 className="text-base font-semibold text-foreground">Your contribution journey</h2><p className="mt-1 text-sm text-muted-foreground">From choosing a repository to opening your first pull request.</p></div><JourneyStepper steps={journeySteps} /></section><section aria-label="Repositories" className="space-y-4"><div className="flex items-end justify-between"><div><h2 className="text-base font-semibold text-foreground">Accessible repositories</h2><p className="mt-1 text-sm text-muted-foreground">Select a repository to import its metadata and issues.</p></div><Link className="text-sm font-medium text-primary hover:underline" href="/repositories">View all</Link></div>{uiRepositories.length === 0 ? <DashboardState title="No accessible repositories" detail="GitHub did not return any repositories for this account." action={<Button asChild><Link href="/repositories">Refresh repository list</Link></Button>} /> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{uiRepositories.map((repo) => <RepoSummaryCard key={repo.id} repo={repo} />)}</div>}</section></div>;
}

function DashboardState({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <section className="rounded-xl border border-dashed border-border bg-card p-8 text-center"><h1 className="text-lg font-semibold text-foreground">{title}</h1>{detail && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{detail}</p>}{action && <div className="mt-5 flex justify-center">{action}</div>}</section>;
}