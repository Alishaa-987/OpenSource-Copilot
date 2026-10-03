"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft, CircleDot, ClipboardCheck, FlaskConical, GitBranch, LayoutList,
  MessageSquare, Network, Target, UserCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useIssue, useRepository } from "@/lib/backend-hooks";
import { cn } from "@/lib/utils";

/**
 * Contextual navigation for the page you are currently on.
 *
 * The repository and issue pages used to carry their own section switchers
 * inside the content column, which made an already long page longer while the
 * sidebar sat almost empty. Those switchers live here instead: the sidebar
 * carries "where am I and what else is in here", and the page carries only
 * the section you asked for.
 */
export function ContextNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const match = pathname.match(/^\/repositories\/id\/([^/]+)(?:\/issues\/([^/]+))?/);
  const repositoryId = match?.[1] ?? null;
  const issueId = match?.[2] ?? null;

  if (!repositoryId) return null;
  return issueId
    ? <IssueContext repositoryId={repositoryId} issueId={issueId} pathname={pathname} onNavigate={onNavigate} />
    : <RepositoryContext repositoryId={repositoryId} pathname={pathname} onNavigate={onNavigate} />;
}

/* ------------------------------------------------------------------ parts */

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean };

function Section({
  eyebrow, title, subtitle, items, pathname, onNavigate, back,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  items: Item[];
  pathname: string;
  onNavigate?: () => void;
  back: { href: string; label: string };
}) {
  return (
    <div className="mt-6 border-t border-sidebar-border pt-4">
      <Link
        href={back.href}
        onClick={onNavigate}
        className="mb-3 flex items-center gap-1.5 px-3 text-xs text-sidebar-muted transition-colors hover:text-sidebar-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {back.label}
      </Link>

      <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">
        {eyebrow}
      </p>
      <p className="mt-1 truncate px-3 text-sm font-semibold text-sidebar-foreground" title={title}>
        {title}
      </p>
      {subtitle ? (
        <p className="mt-0.5 line-clamp-2 px-3 text-xs leading-5 text-sidebar-muted">{subtitle}</p>
      ) : null}

      <nav className="mt-3 flex flex-col gap-0.5" aria-label={eyebrow}>
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function RepositoryContext({ repositoryId, pathname, onNavigate }: { repositoryId: string; pathname: string; onNavigate?: () => void }) {
  // Already in the query cache while the page itself is open, so this adds no
  // extra request in the common case.
  const repository = useRepository(repositoryId);
  const base = `/repositories/id/${repositoryId}`;
  return (
    <Section
      eyebrow="Repository"
      title={repository.data?.fullName ?? "Loading…"}
      subtitle={repository.data?.description ?? null}
      pathname={pathname}
      onNavigate={onNavigate}
      back={{ href: "/repositories", label: "All repositories" }}
      items={[
        { href: base, label: "Overview", icon: LayoutList, exact: true },
        { href: `${base}/intelligence`, label: "Architecture", icon: Network },
        { href: `${base}/issues`, label: "Issues", icon: CircleDot },
        { href: `${base}/first-pr`, label: "First PR guide", icon: GitBranch },
      ]}
    />
  );
}

function IssueContext({ repositoryId, issueId, pathname, onNavigate }: { repositoryId: string; issueId: string; pathname: string; onNavigate?: () => void }) {
  const issue = useIssue(issueId);
  const base = `/repositories/id/${repositoryId}/issues/${issueId}`;
  return (
    <Section
      eyebrow={issue.data ? `Issue #${issue.data.number}` : "Issue"}
      title={issue.data?.title ?? "Loading…"}
      pathname={pathname}
      onNavigate={onNavigate}
      back={{ href: `/repositories/id/${repositoryId}/issues`, label: "All issues" }}
      items={[
        { href: base, label: "Overview", icon: Target, exact: true },
        { href: `${base}/plan`, label: "Implementation plan", icon: ClipboardCheck },
        { href: `${base}/testing`, label: "Testing & confidence", icon: FlaskConical },
        { href: `${base}/chat`, label: "Ask about this issue", icon: MessageSquare },
        { href: `${base}/readiness`, label: "Your readiness", icon: UserCheck },
      ]}
    />
  );
}
