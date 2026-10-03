import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DifficultyBadge } from "@/components/features/difficulty-badge";
import { RecommendationScore } from "@/components/features/recommendation-score";
import { cn } from "@/lib/utils";
import type { Issue } from "@/lib/types";

/**
 * A single recommended issue row. Shows number, title, labels, difficulty, the
 * top deterministic reason, and the match score. The whole row is a link to the
 * issue's understanding page.
 */
export function IssueListItem({
  issue,
  repoFullName,
  className,
}: {
  issue: Issue;
  /** Optional "owner/name" shown as context when the list spans repos. */
  repoFullName?: string;
  className?: string;
}) {
  const topReason = issue.recommendation.reasons[0];

  return (
    <Link
      href={`/repositories/id/${issue.repositoryId}/issues/${issue.id}`}
      className={cn(
        "group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none sm:px-5",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-xs text-subtle-foreground">
            #{issue.number}
          </span>
          {repoFullName && (
            <span className="font-mono text-xs text-subtle-foreground">
              {repoFullName}
            </span>
          )}
          <Badge variant="outline" className="font-normal">
            {issue.isUpstream ? "Upstream" : "Your fork"}
          </Badge>
          <DifficultyBadge difficulty={issue.recommendation.difficulty} />
        </div>

        <h3 className="mt-1 truncate text-sm font-medium text-foreground group-hover:text-primary">
          {issue.title}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {issue.labels.slice(0, 3).map((label) => (
            <Badge key={label.id} variant="outline" className="font-normal">
              <span
                className="mr-1 size-2 rounded-full"
                style={{ backgroundColor: `#${label.color}` }}
              />
              {label.name}
            </Badge>
          ))}
          <span className="inline-flex items-center gap-1 text-xs text-subtle-foreground">
            <MessageSquare className="size-3.5" />
            {issue.comments}
          </span>
        </div>

        {topReason && (
          <p className="mt-2 truncate text-xs text-muted-foreground">
            <span className="text-success">✓</span> {topReason.label}
          </p>
        )}
      </div>

      <div className="shrink-0">
        <RecommendationScore score={issue.recommendation.score} />
      </div>
    </Link>
  );
}
