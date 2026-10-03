"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CircleDot, ExternalLink, GitBranch, GitFork, Network, Star } from "lucide-react";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { BackendApiError } from "@/lib/backend-api";
import { toUiRepository } from "@/lib/backend-adapters";
import { useRepository } from "@/lib/backend-hooks";
import { GitHubMarkdown } from "@/components/features/github-markdown";

/**
 * Repository overview.
 *
 * This page used to stack everything vertically - metrics, three large action
 * cards, the full README, then the language list - so a developer had to
 * scroll past the orientation to reach anything. It is now a two-column
 * layout: the reading column carries the next actions and the README, and the
 * rail carries the facts you glance at. Section navigation for the repository
 * lives in the app sidebar.
 */
export default function RepositoryDetailPage() {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  const repository = useRepository(repositoryId);

  if (repository.isLoading) return <State title="Loading repository…" />;
  if (repository.error) {
    const expired = repository.error instanceof BackendApiError && repository.error.status === 401;
    return <State
      title={expired ? "Your GitHub session has expired" : "Unable to load this repository"}
      detail={repository.error.message}
      action={<Button variant="outline" onClick={() => void repository.refetch()}>Try again</Button>}
    />;
  }
  if (!repository.data) return <State title="Repository not found" />;

  const repo = toUiRepository(repository.data);
  const base = `/repositories/id/${repositoryId}`;

  return <div className="space-y-6">
    <Button asChild variant="ghost" className="-ml-3 lg:hidden">
      <Link href="/repositories"><ArrowLeft className="mr-2 size-4" />All repositories</Link>
    </Button>

    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div className="min-w-0">
        <p className="text-sm font-medium text-primary">Repository</p>
        <h1 className="mt-1.5 break-words text-3xl font-semibold tracking-tight text-foreground">{repo.fullName}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {repo.description || "Explore the repository context, choose an issue, and prepare a focused contribution."}
        </p>
      </div>
      <Button asChild variant="outline" className="shrink-0">
        <a href={repo.url} target="_blank" rel="noreferrer">Open on GitHub<ExternalLink className="ml-2 size-4" /></a>
      </Button>
    </header>

    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* The sidebar carries these same links on desktop, so showing them
            here too would be the same navigation twice on one screen. */}
        <div className="lg:hidden"><NextActions base={base} openIssues={repo.openIssues} /></div>
        <Readme markdown={repo.readmeSummary} />
      </div>

      <aside className="space-y-4">
        <Facts repo={repo} />
        <Languages languages={repo.languages} />
      </aside>
    </div>
  </div>;
}

/* --------------------------------------------------------- next actions */

/**
 * One compact row instead of three large cards. Same three destinations, a
 * quarter of the vertical space.
 */
function NextActions({ base, openIssues }: { base: string; openIssues: number }) {
  const actions = [
    { href: `${base}/issues`, icon: <CircleDot className="size-4" />, title: "Find an issue", hint: openIssues > 0 ? `${openIssues} open` : "Browse issues" },
    { href: `${base}/intelligence`, icon: <Network className="size-4" />, title: "Architecture", hint: "How it fits together" },
    { href: `${base}/first-pr`, icon: <GitBranch className="size-4" />, title: "First PR guide", hint: "Set up and verify" },
  ];
  return <section className="grid gap-3 sm:grid-cols-3">
    {actions.map((action) => (
      <Link key={action.href} href={action.href}
        className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-primary/5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{action.icon}</span>
        <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
          {action.title}
          <ArrowRight className="size-3.5 text-primary transition-transform group-hover:translate-x-0.5" />
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{action.hint}</p>
      </Link>
    ))}
  </section>;
}

/* ---------------------------------------------------------------- readme */

/** Collapsed by default past a few screens so the README cannot bury the page. */
function Readme({ markdown }: { markdown: string | null | undefined }) {
  const [expanded, setExpanded] = useState(false);
  return <section className="rounded-xl border border-border bg-card p-5">
    <div className="flex items-baseline justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-primary">About</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">README</h2>
      </div>
      {markdown ? (
        <button type="button" onClick={() => setExpanded((value) => !value)} className="text-xs text-primary hover:underline">
          {expanded ? "Collapse" : "Expand"}
        </button>
      ) : null}
    </div>
    {markdown ? (
      <div className={`relative mt-4 overflow-y-auto pr-2 ${expanded ? "max-h-none" : "max-h-[340px]"}`}>
        <GitHubMarkdown markdown={markdown} emptyFallback="No README was imported for this repository." />
        {!expanded ? <div aria-hidden className="pointer-events-none sticky bottom-0 h-12 bg-gradient-to-t from-card to-transparent" /> : null}
      </div>
    ) : (
      <p className="mt-3 text-sm leading-6 text-muted-foreground">No README was imported for this repository.</p>
    )}
  </section>;
}

/* ------------------------------------------------------------------ rail */

function Facts({ repo }: { repo: ReturnType<typeof toUiRepository> }) {
  const rows: Array<{ icon: ReactNode; label: string; value: string }> = [
    { icon: <Star className="size-4" />, label: "Stars", value: repo.stars.toLocaleString() },
    { icon: <CircleDot className="size-4" />, label: "Open issues", value: repo.openIssues.toLocaleString() },
    { icon: <GitFork className="size-4" />, label: "Forks", value: repo.forks.toLocaleString() },
  ];
  return <section className="rounded-xl border border-border bg-card p-5">
    <h2 className="text-sm font-semibold text-foreground">At a glance</h2>
    <dl className="mt-3 space-y-2.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-2 text-sm text-muted-foreground">{row.icon}{row.label}</dt>
          <dd className="text-sm font-semibold tabular-nums text-foreground">{row.value}</dd>
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-2.5">
        <dt className="text-sm text-muted-foreground">Main language</dt>
        <dd className="truncate text-sm font-semibold text-foreground">{repo.primaryLanguage || "Not detected"}</dd>
      </div>
    </dl>
  </section>;
}

function Languages({ languages }: { languages: ReturnType<typeof toUiRepository>["languages"] }) {
  if (languages.length === 0) return null;
  const top = languages.slice(0, 5);
  const palette = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
  return <section className="rounded-xl border border-border bg-card p-5">
    <h2 className="text-sm font-semibold text-foreground">Languages</h2>

    {/* A single proportional bar reads faster than five separate chips. */}
    <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
      {top.map((language, index) => (
        <span key={language.name} style={{ width: `${language.percent}%`, backgroundColor: palette[index % palette.length] }} />
      ))}
    </div>

    <ul className="mt-3 space-y-1.5">
      {top.map((language, index) => (
        <li key={language.name} className="flex items-center justify-between gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} />
            <span className="truncate">{language.name}</span>
          </span>
          <span className="shrink-0 tabular-nums text-subtle-foreground">
            {language.percent < 0.1 ? "<0.1" : language.percent}%
          </span>
        </li>
      ))}
    </ul>
  </section>;
}

/* ----------------------------------------------------------------- state */

function State({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <section className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
    <h2 className="text-lg font-semibold text-foreground">{title}</h2>
    {detail ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{detail}</p> : null}
    {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
  </section>;
}
