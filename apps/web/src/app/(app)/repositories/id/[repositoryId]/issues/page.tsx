"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { IssueListItem } from "@/components/features/issue-list-item";
import { Button } from "@/components/ui/button";
import { BackendApiError } from "@/lib/backend-api";
import { mergeRecommendations, toUiRepository } from "@/lib/backend-adapters";
import { useRecommendations, useRepository, useRepositoryIssues } from "@/lib/backend-hooks";

export default function RepositoryIssuesPage() {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  const repository = useRepository(repositoryId);
  const issues = useRepositoryIssues(repositoryId);
  const recommendations = useRecommendations(repositoryId, { page: 1, perPage: 100 });
  if (repository.isLoading || issues.isLoading || recommendations.isLoading) return <State title="Loading issues…" />;
  const error = repository.error ?? issues.error ?? recommendations.error;
  if (error) return <State title={error instanceof BackendApiError && error.status === 401 ? "Your GitHub session has expired" : "Unable to load issues"} detail={error.message} action={<Button onClick={() => { void repository.refetch(); void issues.refetch(); void recommendations.refetch(); }}>Try again</Button>} />;
  if (!repository.data) return <State title="Repository not found" />;
  const repo = toUiRepository(repository.data);
  const items = mergeRecommendations(issues.data?.issues ?? [], recommendations.data?.items ?? []);
  return <div className="space-y-6"><Button asChild variant="ghost" className="-ml-3"><Link href={"/repositories/id/" + repositoryId}><ArrowLeft className="size-4" />Repository overview</Link></Button><header><p className="text-sm font-medium text-primary">Issues</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{repo.fullName}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Open issues and their Phase 1 recommendation explanations.</p></header>{items.length === 0 ? <State title="No open issues" detail="This repository currently has no open issues returned by the backend." /> : <div className="overflow-hidden rounded-xl border border-border bg-card">{items.map((issue) => <IssueListItem key={issue.id} issue={issue} repoFullName={repo.fullName} />)}</div>}</div>;
}

function State({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <section className="rounded-xl border border-dashed border-border bg-card p-8 text-center"><h2 className="text-lg font-semibold text-foreground">{title}</h2>{detail && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{detail}</p>}{action && <div className="mt-5 flex justify-center">{action}</div>}</section>;
}
