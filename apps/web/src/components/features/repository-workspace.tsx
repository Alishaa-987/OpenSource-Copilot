"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, ExternalLink, GitBranch, Network, RadioTower, Sparkles } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackendApiError } from "@/lib/backend-api";
import { useRepository, useRepositoryAnalysis } from "@/lib/backend-hooks";
import type { BackendRepositoryAnalysis } from "@/lib/backend-types";

type Section = "intelligence" | "first-pr";

export function RepositoryWorkspace({ repositoryId, section }: { repositoryId: string; section: Section }) {
  const repository = useRepository(repositoryId);
  const analysis = useRepositoryAnalysis(repositoryId);
  if (repository.isLoading || analysis.isLoading) return <State title="Preparing repository workspace…" detail="Loading verified repository metadata and analysis." />;
  const error = repository.error ?? analysis.error;
  if (error) return <State title={error instanceof BackendApiError && error.status === 401 ? "Your GitHub session has expired" : "Unable to load repository intelligence"} detail={error.message} action={<Button variant="outline" onClick={() => { void repository.refetch(); void analysis.refetch(); }}>Try again</Button>} />;
  if (!repository.data || !analysis.data) return <State title="Repository intelligence unavailable" detail="Analysis is not available until the repository has been indexed." />;
  const base = `/repositories/id/${repositoryId}`;
  return <div className="space-y-6">
    <Button asChild variant="ghost" className="-ml-3"><Link href={base}><ArrowLeft className="mr-2 size-4" />Back to repository</Link></Button>
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-sm font-medium text-primary">{section === "intelligence" ? "Repository intelligence" : "First-PR path"}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{repository.data.fullName}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{section === "intelligence" ? "A concise, evidence-backed map of how this repository is organized." : "A guided sequence for making a safe, reviewable first contribution."}</p><MonitoringStatus lastCheckedAt={repository.data.lastIssueCheckAt} /></div><Button asChild variant="outline"><a href={repository.data.url} target="_blank" rel="noreferrer">Open on GitHub<ExternalLink className="ml-2 size-4" /></a></Button></header>
    <WorkspaceNav repositoryId={repositoryId} active={section} />
    {section === "intelligence" ? <Intelligence analysis={analysis.data} /> : <FirstPr analysis={analysis.data} />}
  </div>;
}

function WorkspaceNav({ repositoryId, active }: { repositoryId: string; active: Section }) { const base = `/repositories/id/${repositoryId}`; return <nav className="grid gap-2 rounded-xl border border-border bg-card p-2 sm:grid-cols-2"><Link href={`${base}/intelligence`} className={`rounded-lg border px-4 py-3 ${active === "intelligence" ? "border-primary/50 bg-primary/10" : "border-transparent hover:border-border hover:bg-muted/30"}`}><span className={`flex items-center gap-2 text-sm font-medium ${active === "intelligence" ? "text-primary" : "text-foreground"}`}><Network className="size-4" />Architecture & context</span><span className="mt-1 block pl-6 text-xs text-muted-foreground">How the repository fits together</span></Link><Link href={`${base}/first-pr`} className={`rounded-lg border px-4 py-3 ${active === "first-pr" ? "border-primary/50 bg-primary/10" : "border-transparent hover:border-border hover:bg-muted/30"}`}><span className={`flex items-center gap-2 text-sm font-medium ${active === "first-pr" ? "text-primary" : "text-foreground"}`}><GitBranch className="size-4" />First-PR path</span><span className="mt-1 block pl-6 text-xs text-muted-foreground">Prepare, change, verify, submit</span></Link></nav>; }

function Intelligence({ analysis }: { analysis: BackendRepositoryAnalysis }) { return <div className="space-y-6"><section className="rounded-xl border border-border bg-card p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-sm font-medium text-primary">Grounded overview</p><h2 className="mt-1 text-xl font-semibold text-foreground">What this repository is made of</h2></div><Confidence value={analysis.confidence} method={analysis.method} /></div><p className="mt-4 max-w-4xl text-sm leading-6 text-muted-foreground">{analysis.summary}</p><p className="mt-4 max-w-4xl text-xs leading-5 text-subtle-foreground">Best understood by: {analysis.audience}</p></section><section className="rounded-xl border border-border bg-card p-5"><p className="text-sm font-medium text-primary">Technology map</p><h2 className="mt-1 text-xl font-semibold text-foreground">Stack detected from repository evidence</h2><div className="mt-4 flex flex-wrap gap-2">{analysis.techStack.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}</div></section><Architecture architecture={analysis.architecture} /><Evidence evidence={analysis.evidence} /></div>; }

function Architecture({ architecture }: { architecture: BackendRepositoryAnalysis["architecture"] }) { const [selectedId, setSelectedId] = useState<string | null>(null); const selected = architecture.nodes.find((node) => node.id === selectedId); const linked = new Set(selectedId ? architecture.edges.flatMap((edge) => edge.from === selectedId ? [edge.to] : edge.to === selectedId ? [edge.from] : []) : architecture.nodes.map((node) => node.id)); return <section className="rounded-xl border border-border bg-card p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-primary">Architecture explorer</p><h2 className="mt-1 text-xl font-semibold text-foreground">Follow the request and data flow</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{architecture.description}</p></div><span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{architecture.nodes.length} nodes · {architecture.edges.length} links</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{architecture.nodes.map((node) => <button key={node.id} type="button" onClick={() => setSelectedId((current) => current === node.id ? null : node.id)} className={`rounded-lg border p-3 text-left transition-colors ${selectedId === node.id ? "border-primary bg-primary/10" : linked.has(node.id) ? "border-border/70 bg-muted/20 hover:border-primary/50" : "border-border/50 bg-muted/10 opacity-45"}`}><span className="block text-[10px] uppercase tracking-[0.14em] text-primary">{node.type}</span><span className="mt-1 block text-sm font-medium text-foreground">{node.label}</span></button>)}</div>{selected ? <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4"><p className="text-xs font-medium uppercase tracking-[0.12em] text-primary">Selected component</p><p className="mt-1 text-sm font-medium text-foreground">{selected.label}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{architecture.edges.filter((edge) => edge.from === selected.id || edge.to === selected.id).map((edge) => `${edge.from} → ${edge.to}${edge.label ? ` · ${edge.label}` : ""}`).join(" | ") || "No connected flow was returned."}</p></div> : <p className="mt-4 text-xs text-subtle-foreground">Select a component to isolate its returned dependencies.</p>}</section>; }

function Evidence({ evidence }: { evidence: BackendRepositoryAnalysis["evidence"] }) { return <section className="rounded-xl border border-border bg-card p-5"><p className="text-sm font-medium text-primary">Evidence</p><h2 className="mt-1 text-xl font-semibold text-foreground">What the analysis used</h2>{evidence.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{evidence.map((item) => <div key={item.path} className="rounded-lg border border-border/70 bg-muted/20 p-3"><code className="break-all text-xs text-foreground">{item.path}</code><p className="mt-2 text-xs leading-5 text-muted-foreground">{item.reason}</p></div>)}</div> : <p className="mt-3 text-sm text-muted-foreground">No source evidence was returned.</p>}</section>; }

function FirstPr({ analysis }: { analysis: BackendRepositoryAnalysis }) { const [completed, setCompleted] = useState<Set<number>>(new Set()); const toggle = (index: number) => setCompleted((current) => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; }); const steps = analysis.firstPrPath; return <div className="space-y-6"><section className="rounded-xl border border-border bg-card p-5"><div className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /><div><p className="text-sm font-medium text-primary">Guided contribution</p><h2 className="mt-1 text-xl font-semibold text-foreground">Your first PR, one verified checkpoint at a time</h2></div></div><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Use the returned repository path as a preparation guide. Do not mark a checkpoint complete until its outcome is true in your local workspace.</p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${steps.length ? Math.round(completed.size / steps.length * 100) : 0}%` }} /></div><p className="mt-2 text-xs text-subtle-foreground">{completed.size} of {steps.length} checkpoints complete</p></section><section className="space-y-3">{steps.map((step, index) => <button key={`${step.title}-${index}`} type="button" onClick={() => toggle(index)} className={`w-full rounded-xl border p-5 text-left transition-colors ${completed.has(index) ? "border-primary/50 bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}><div className="flex items-start gap-4"><span className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${completed.has(index) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{completed.has(index) ? <CheckCircle2 className="size-4" /> : index + 1}</span><div className="min-w-0"><h3 className="font-medium text-foreground">{step.title}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">{step.actions.map((action) => <li key={action}>{action}</li>)}</ul><p className="mt-3 rounded-md bg-muted/30 px-3 py-2 text-xs leading-5 text-subtle-foreground"><span className="font-medium text-foreground">Outcome:</span> {step.outcome}</p></div></div></button>)}</section></div>; }

function Confidence({ value, method }: { value: BackendRepositoryAnalysis["confidence"]; method: BackendRepositoryAnalysis["method"] }) { return <span className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">{method === "grounded-llm" ? "Grounded analysis" : "Context limited"} · {value} confidence</span>; }
function State({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) { return <section className="rounded-xl border border-dashed border-border bg-card p-8 text-center"><h2 className="text-lg font-semibold text-foreground">{title}</h2>{detail ? <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{detail}</p> : null}{action ? <div className="mt-5 flex justify-center">{action}</div> : null}</section>; }


/**
 * Monitoring is implicit: importing a repository is what puts it on the
 * background monitor's list, so this reports that state rather than offering
 * a toggle. `lastIssueCheckAt` is written by repository-service's monitor at
 * the end of every cycle.
 */
function MonitoringStatus({ lastCheckedAt }: { lastCheckedAt: string | null }) {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 font-medium text-success">
        <RadioTower className="size-3" />
        Monitoring active
      </span>
      <span>
        {lastCheckedAt
          ? `Last checked ${relativeTime(lastCheckedAt)} for new issues, comments and status changes`
          : "Waiting for the first check - new issues, comments and status changes will appear in your notifications"}
      </span>
    </p>
  );
}

function relativeTime(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
