"use client";

import Link from "next/link";
import { FolderGit2 } from "lucide-react";
import { RepoSummaryCard } from "@/components/features/repo-summary-card";
import { RepositoryLinkImportForm } from "@/components/features/repository-link-import-form";
import { Button } from "@/components/ui/button";
import { BackendApiError } from "@/lib/backend-api";
import { toUiRepository } from "@/lib/backend-adapters";
import { useAccessibleRepositories, useGitHubLogin } from "@/lib/backend-hooks";

export default function RepositoriesPage() {
  const repositories = useAccessibleRepositories({ page: 1, perPage: 50 });
  const login = useGitHubLogin("/repositories");
  if (repositories.isLoading) return <PageState title="Loading repositories…" />;
  if (repositories.error) {
    const unauthorized = repositories.error instanceof BackendApiError && repositories.error.status === 401;
    return <PageState title={unauthorized ? "Connect GitHub to see repositories" : "Unable to load repositories"} detail={repositories.error.message} action={<Button onClick={() => unauthorized ? login.mutate() : repositories.refetch()}>{unauthorized ? "Continue with GitHub" : "Try again"}</Button>} />;
  }
  const items = repositories.data?.items ?? [];
  return <div className="space-y-8"><header><p className="text-sm font-medium text-primary">Repository selection</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Choose a repository to explore</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Import a repository once to load its Phase 1 overview, issues, and deterministic recommendations.</p></header><RepositoryLinkImportForm />{items.length === 0 ? <PageState title="No accessible repositories" detail="GitHub did not return any repositories for this account." action={<Button asChild><Link href="/dashboard"><FolderGit2 className="size-4" />Back to overview</Link></Button>} /> : <div className="grid gap-5 md:grid-cols-2">{items.map((repository) => <RepoSummaryCard key={repository.id} repo={toUiRepository(repository)} />)}</div>}</div>;
}

function PageState({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return <section className="rounded-xl border border-dashed border-border bg-card p-8 text-center"><h2 className="text-lg font-semibold text-foreground">{title}</h2>{detail && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{detail}</p>}{action && <div className="mt-5 flex justify-center">{action}</div>}</section>;
}


