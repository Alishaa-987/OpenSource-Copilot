"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { BackendApiError } from "@/lib/backend-api";
import { useAskRepository, useIssue } from "@/lib/backend-hooks";

export default function IssueDetailPage() {
  const { issueId } = useParams<{ issueId: string }>();
  const issue = useIssue(issueId);
  const ask = useAskRepository();
  const [question, setQuestion] = useState("");

  if (issue.isLoading) return <State title="Loading issue…" />;
  if (issue.error) return <State title={issue.error instanceof BackendApiError && issue.error.status === 401 ? "Your GitHub session has expired" : "Unable to load issue"} detail={issue.error.message} action={<Button onClick={() => issue.refetch()}>Try again</Button>} />;
  if (!issue.data) return <State title="Issue not found" />;

  const item = issue.data;
  const submitQuestion = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || ask.isPending) return;
    const issueContext = [`Issue title: ${item.title}`, `Issue description: ${item.body || "No description was provided."}`, `Contributor question: ${trimmed}`].join("\n\n");
    ask.mutate({ repositoryId: item.repositoryId, question: issueContext });
  };

  return <div className="space-y-6">
    <Button asChild variant="ghost" className="-ml-3"><Link href={`/repositories/id/${item.repositoryId}`}><ArrowLeft className="size-4" />Repository issues</Link></Button>
    <header className="space-y-3"><div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><span>#{item.number}</span><span>•</span><span>{item.state}</span><span>•</span><span>{item.commentsCount} comments</span></div><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground">{item.title}</h1><Button asChild variant="outline"><a href={item.url} target="_blank" rel="noreferrer">Open on GitHub<ExternalLink className="size-4" /></a></Button></div><div className="flex flex-wrap gap-2">{item.labels.map((label) => <span key={label.id} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{label.name}</span>)}</div></header>
    <article className="rounded-xl border border-border bg-card p-6"><h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Issue description</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground">{item.body || "No description was provided."}</p></article>
    <section className="rounded-xl border border-border bg-card p-6"><div className="space-y-1"><h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Repository-aware guidance</h2><p className="text-sm text-muted-foreground">Ask about this issue using indexed documents and issue knowledge from the active repository.</p></div><form onSubmit={submitQuestion} className="mt-4 space-y-3"><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What should I understand before working on this issue?" maxLength={2000} rows={4} className="w-full resize-y rounded-lg border border-border bg-background p-3 text-sm text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" /><div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{question.length}/2000</span><Button type="submit" disabled={!question.trim() || ask.isPending}>{ask.isPending ? "Checking repository context…" : "Ask about this issue"}</Button></div></form>{ask.error && <p className="mt-4 text-sm text-destructive">{ask.error.message}</p>}{ask.data && <div className="mt-5 space-y-4 border-t border-border pt-5"><div className="whitespace-pre-wrap text-sm leading-7 text-foreground">{ask.data.answer}</div>{ask.data.sources.length > 0 && <div><h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sources</h3><ul className="mt-2 space-y-2">{ask.data.sources.map((source) => <li key={`${source.path}-${source.url}`} className="flex flex-wrap items-center justify-between gap-2 text-sm"><a className="text-primary underline-offset-4 hover:underline" href={source.url} target="_blank" rel="noreferrer">{source.path}</a><span className="text-xs text-muted-foreground">relevance {source.relevance.toFixed(3)}</span></li>)}</ul></div>}</div>}</section>
    <dl className="grid gap-3 sm:grid-cols-3"><Info label="Author" value={item.author ?? "Unknown"} /><Info label="Created" value={new Date(item.createdAt).toLocaleDateString()} /><Info label="Updated" value={new Date(item.updatedAt).toLocaleDateString()} /></dl>
  </div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-card p-5"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-2 font-medium text-foreground">{value}</dd></div>;
}

function State({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <main className="flex min-h-[60vh] items-center justify-center"><section className="w-full max-w-md rounded-xl border border-dashed border-border bg-card p-8 text-center"><h1 className="text-lg font-semibold text-foreground">{title}</h1>{detail && <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>}{action && <div className="mt-5 flex justify-center">{action}</div>}</section></main>;
}
