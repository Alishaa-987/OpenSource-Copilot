import Link from "next/link";
import { Star, CircleDot, GitFork, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LanguageBadge } from "@/components/features/language-badge";
import { cn, formatCompact } from "@/lib/utils";
import type { AnalysisStatus, Repository } from "@/lib/types";

const STATUS_META: Record<
  AnalysisStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  analyzed: {
    label: "Analyzed",
    dotClass: "bg-success",
    textClass: "text-success",
  },
  analyzing: {
    label: "Analyzing",
    dotClass: "bg-warning animate-pulse",
    textClass: "text-warning",
  },
  "not-analyzed": {
    label: "Not analyzed",
    dotClass: "bg-subtle-foreground",
    textClass: "text-muted-foreground",
  },
};

function MetaStat({
  icon: Icon,
  children,
}: {
  icon: typeof Star;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="size-3.5 text-subtle-foreground" />
      {children}
    </span>
  );
}

/**
 * A recently-analyzed repository, presented as a self-contained panel: identity,
 * one-line description, key signals (language, stars, open issues, beginner
 * issues, health), and a status-aware call to action.
 */
export function RepoSummaryCard({
  repo,
  className,
}: {
  repo: Repository;
  className?: string;
}) {
  const status = STATUS_META[repo.analysisStatus];
  const analyzed = repo.analysisStatus === "analyzed";
  const href = analyzed
    ? `/repositories/id/${repo.id}`
    : `/repositories/${repo.owner}/${repo.name}/analyze`;

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">
            <Link
              href={href}
              className="after:absolute after:inset-0 hover:text-primary focus-visible:outline-none"
            >
              <span className="text-muted-foreground">{repo.owner}/</span>
              {repo.name}
            </Link>
          </h3>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 text-xs font-medium",
            status.textClass,
          )}
        >
          <span className={cn("size-1.5 rounded-full", status.dotClass)} />
          {status.label}
        </span>
      </div>

      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
        {repo.description}
      </p>

      {/* Counts are only shown when GitHub actually reports one. A fork's own
          stars/forks/open-issues are legitimately 0 - printing "0" for each of
          them filled the card with meaningless zeros. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <LanguageBadge language={repo.primaryLanguage} />
        {repo.stars > 0 && <MetaStat icon={Star}>{formatCompact(repo.stars)}</MetaStat>}
        {repo.forks > 0 && <MetaStat icon={GitFork}>{formatCompact(repo.forks)}</MetaStat>}
        {repo.openIssues > 0 && <MetaStat icon={CircleDot}>{formatCompact(repo.openIssues)} open</MetaStat>}
        {repo.goodFirstIssueCount !== null && repo.goodFirstIssueCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
            <Sparkles className="size-3.5" />
            {repo.goodFirstIssueCount} good first
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        {/* Health scoring is not computed yet, so the tile is shown only when
            there is a real score rather than an empty "Health" label. */}
        {repo.health.score !== null ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-subtle-foreground">
            <ShieldCheck className="size-3.5" />
            Health {repo.health.score}
          </span>
        ) : (
          <span className="text-xs text-subtle-foreground">
            {analyzed ? "Ready to explore" : "Not imported yet"}
          </span>
        )}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="relative z-10 -mr-2 text-primary hover:text-primary"
        >
          <Link href={href}>
            {analyzed ? "Explore" : "Analyze"}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

