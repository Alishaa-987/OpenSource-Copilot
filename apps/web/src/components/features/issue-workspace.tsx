"use client";

import Link from "next/link";
import { PlayCircle, AlertCircle, ArrowLeft, CheckCircle2, ClipboardCheck, ExternalLink, FileCode2, FlaskConical, GraduationCap, Lightbulb, MessageSquare, Network, ShieldCheck, Sparkles, UserCheck, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackendApiError } from "@/lib/backend-api";
import { useAskRepository, useIssue, useIssueIntelligence, useRepository, useResumeProfile, useSetIssueProgress, useSkillGapAssessment } from "@/lib/backend-hooks";
import type { BackendContributorIntelligenceResult, BackendImportedRepository, BackendIssueAnalysis, BackendMappingEvidence } from "@/lib/backend-types";
import { deriveIssueRequirements, type IssueRequirements } from "@/lib/issue-requirements";
import { GitHubMarkdown } from "./github-markdown";
import { ResumeCard } from "./resume-card";

type WorkspaceSection = "overview" | "plan" | "testing" | "chat" | "readiness";
type ChatTurn = { role: "user" | "assistant"; content: string };

export function IssueWorkspace({ repositoryId, issueId, section }: { repositoryId: string; issueId: string; section: WorkspaceSection }) {
  const repository = useRepository(repositoryId);
  const issue = useIssue(issueId);
  const intelligence = useIssueIntelligence(repositoryId, issueId);

  if (repository.isLoading || issue.isLoading || intelligence.isLoading) return <WorkspaceState title="Preparing issue workspace…" detail="Loading the issue, repository context, and evidence-backed guidance." />;
  const error = repository.error ?? issue.error ?? intelligence.error;
  if (error) return <WorkspaceState title={error instanceof BackendApiError && error.status === 401 ? "Your GitHub session has expired" : "Unable to load this issue"} detail={error.message} action={<Button variant="outline" onClick={() => { void repository.refetch(); void issue.refetch(); void intelligence.refetch(); }}>Try again</Button>} />;
  if (!repository.data || !issue.data || !intelligence.data) return <WorkspaceState title="Issue workspace unavailable" detail="The issue or its grounded analysis was not returned by the backend." />;

  return <IssueWorkspaceBody repositoryId={repositoryId} issueId={issueId} section={section} intelligence={intelligence.data} repository={repository.data} />;
}

/**
 * Readiness lives on its own view rather than inside the overview: the resume
 * upload plus the full skill comparison is a page's worth of content on its
 * own, and burying it under the analysis made the overview endless.
 */
/**
 * The section switcher used to sit here as a five-card grid, which made an
 * already long page longer. It now lives in the app sidebar (ContextNav), so
 * this component renders only the section that was asked for.
 */
function IssueWorkspaceBody({ repositoryId, issueId, section, intelligence, repository }: { repositoryId: string; issueId: string; section: WorkspaceSection; intelligence: BackendContributorIntelligenceResult; repository: BackendImportedRepository }) {
  return <div className="space-y-6">
    <IssueHeader repositoryId={repositoryId} data={intelligence} repository={repository} />
    <IssueProgressBar issueId={issueId} />
    {section === "overview" ? <IssueOverview data={intelligence} /> : null}
    {section === "plan" ? <IssuePlan data={intelligence} /> : null}
    {section === "testing" ? <IssueTesting data={intelligence} /> : null}
    {section === "chat" ? <IssueChat repositoryId={repositoryId} repository={repository} data={intelligence} /> : null}
    {section === "readiness" ? <ResumeReadinessPanel repositoryId={repositoryId} data={intelligence} /> : null}
  </div>;
}

function IssueHeader({ repositoryId, data, repository }: { repositoryId: string; data: BackendContributorIntelligenceResult; repository: { fullName: string; url: string; isFork?: boolean; parentFullName?: string | null } }) {
  const issue = data.issue;
  const isUpstream = issue.isUpstream;
  return <>
    <Button asChild variant="ghost" className="-ml-3"><Link href={`/repositories/id/${repositoryId}/issues`}><ArrowLeft className="mr-2 size-4" />Back to issues</Link></Button>
    <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-primary">Issue #{issue.number}</span>
          <Badge variant={issue.state === "closed" ? "secondary" : "outline"} className={issue.state === "closed" ? "" : "border-emerald-400/40 bg-emerald-500/10 text-foreground dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-foreground"}>{issue.state === "closed" ? <CheckCircle2 className="mr-1 size-3" /> : <AlertCircle className="mr-1 size-3 text-emerald-400" />}{issue.state}</Badge>
          <Badge variant="outline" className="border-primary/50 text-primary">{isUpstream ? `Upstream · ${repository.parentFullName ?? "source repository"}` : repository.fullName}</Badge>
        </div>
        <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-foreground">{issue.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">{issue.labels.map((label, index) => <Badge key={`${label.id || label.name}-${label.color}-${index}`} variant="outline" className="font-normal"><span className="mr-1 size-2 rounded-full" style={{ backgroundColor: `#${label.color}` }} />{label.name}</Badge>)}<span className="text-xs text-subtle-foreground">{issue.commentsCount} comments</span></div>
      </div>
      <Button asChild variant="outline" className="shrink-0"><a href={issue.url} target="_blank" rel="noreferrer">Open on GitHub<ExternalLink className="ml-2 size-4" /></a></Button>
    </header>
  </>;
}

function IssueOverview({ data }: { data: BackendContributorIntelligenceResult }) {
  const analysis = data.analysis;
  return <div className="space-y-6">
    <section className="rounded-xl border border-border bg-card p-5"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div><p className="text-sm font-medium text-primary">Issue context</p><h2 className="mt-1 text-xl font-semibold text-foreground">Start with the problem, not the code</h2></div><ConfidenceBadge analysis={analysis} /></div><div className="mt-5"><GitHubMarkdown markdown={data.issue.body || "No description was provided for this issue."} emptyFallback="No description was provided for this issue." /></div></section>
    <section className="grid gap-4 lg:grid-cols-2"><GuidanceCard icon={<Lightbulb className="size-4" />} title="What is this issue?" text={analysis.explanation} /><GuidanceCard icon={<Network className="size-4" />} title="Why is it happening?" text={analysis.rootCause} /></section>
    <EvidencePanel data={data} />
    <section className="rounded-xl border border-border bg-card p-5"><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><h2 className="text-lg font-semibold text-foreground">Difficulty with reasoning</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><Metric label="Complexity" value={capitalize(analysis.complexity)} /><Metric label="Estimated effort" value={capitalize(analysis.effort)} /><Metric label="Beginner suitable" value={analysis.beginnerSuitable ? "Yes" : "Not yet"} /></div><div className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">{analysis.reasons.map((reason) => <p key={reason}>{reason}</p>)}</div></section>
  </div>;
}

/**
 * Readiness, in the order an engineer actually needs it:
 *
 *   1. what this issue requires (cross-checked against the evidence the
 *      analysis grounded itself in - no resume involved yet),
 *   2. what you have to understand to do it,
 *   3. only then, how your resume compares.
 *
 * Step 1 and the codebase half of step 2 are derived deterministically from
 * data this page already holds, so they render even with no resume on file.
 */
function ResumeReadinessPanel({ repositoryId, data }: { repositoryId: string; data: BackendContributorIntelligenceResult }) {
  const resume = useResumeProfile();
  const requirements = useMemo(() => deriveIssueRequirements(data), [data]);

  // Built entirely from data this page has already fetched - this panel never
  // re-runs retrieval or the issue-analysis call, it only asks the backend to
  // compare the stored resume against this already-computed context.
  const issueContext = useMemo(() => JSON.stringify({
    title: data.issue.title,
    labels: data.issue.labels.map((label) => label.name),
    explanation: data.analysis.explanation,
    rootCause: data.analysis.rootCause,
    requiredKnowledge: data.analysis.requiredKnowledge,
    dependencies: data.analysis.dependencies,
    relevantFiles: [...data.mapping.relevantFiles, ...data.mapping.relevantModules].map((item) => item.path),
    complexity: data.analysis.complexity,
    effort: data.analysis.effort,
  }), [data]);

  const profile = resume.data?.profile ?? null;
  const skillGap = useSkillGapAssessment(repositoryId, data.issue.id, issueContext, Boolean(profile));
  const assessment = skillGap.data?.result ?? null;

  return <div className="space-y-6">
    <RequirementsPanel requirements={requirements} />
    <UnderstandPanel requirements={requirements} extra={assessment?.thingsToUnderstand ?? []} />

    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <UserCheck className="size-4 text-primary" />
        <div>
          <p className="text-sm font-medium text-primary">Your readiness</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">How you compare to what is required</h2>
        </div>
      </div>

      <div className="mt-4"><ResumeCard compact /></div>

      {profile && skillGap.isLoading ? <p className="mt-4 text-sm text-muted-foreground">Comparing your resume against this issue…</p> : null}
      {profile && skillGap.error ? (
        <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm leading-6 text-warning">
          <p>{skillGap.error instanceof BackendApiError ? skillGap.error.message : "Could not compare your resume against this issue."}</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => void skillGap.refetch()}>Try again</Button>
        </div>
      ) : null}

      {profile && assessment ? <div className="mt-5 space-y-5 border-t border-border pt-5">
        <p className="text-sm leading-6 text-foreground">{assessment.readinessSummary}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <MatchColumn
            icon={<CheckCircle2 className="size-3.5 text-success" />}
            title="You already have"
            items={assessment.matchedSkills}
            variant="success"
            empty="No direct matches were found in your resume."
          />
          <MatchColumn
            icon={<XCircle className="size-3.5 text-danger" />}
            title="Not on your resume"
            items={assessment.missingSkills}
            variant="danger"
            empty="No clear gaps were identified."
          />
        </div>

        {assessment.partialSkills.length > 0 ? (
          <div>
            <SubHeading icon={<AlertCircle className="size-3.5 text-warning" />}>Partly covered</SubHeading>
            <div className="mt-2 space-y-2">
              {assessment.partialSkills.map((item) => (
                <div key={item.skill} className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                  <Badge variant="warning">{item.skill}</Badge>
                  <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {assessment.relevantExperience.length > 0 ? (
          <div>
            <SubHeading>Relevant experience from your resume</SubHeading>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-foreground">
              {assessment.relevantExperience.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ) : null}

        {assessment.actionChecklist.length > 0 ? (
          <div>
            <SubHeading>Your action checklist</SubHeading>
            <div className="mt-2 space-y-2">
              {assessment.actionChecklist.map((item, index) => (
                <div key={item} className="flex gap-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm leading-6 text-foreground">
                  <span className="text-xs font-semibold text-primary">{index + 1}.</span>{item}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div> : null}
    </section>
  </div>;
}

function SubHeading({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{icon}{children}</h3>;
}

function MatchColumn({ icon, title, items, variant, empty }: { icon: ReactNode; title: string; items: readonly string[]; variant: "success" | "danger"; empty: string }) {
  return <div>
    <SubHeading icon={icon}>{title}</SubHeading>
    {items.length > 0
      ? <div className="mt-2 flex flex-wrap gap-1.5">{items.map((item) => <Badge key={item} variant={variant}>{item}</Badge>)}</div>
      : <p className="mt-2 text-sm text-muted-foreground">{empty}</p>}
  </div>;
}

/**
 * "What this issue actually requires" - the cross-check step. Each area is
 * backed by the real paths that put it there, so the claim can be verified
 * rather than trusted.
 */
function RequirementsPanel({ requirements }: { requirements: IssueRequirements }) {
  const { areas, dependencies, knowledge, scope } = requirements;
  return <section className="rounded-xl border border-border bg-card p-5">
    <div className="flex items-center gap-2">
      <ClipboardCheck className="size-4 text-primary" />
      <div>
        <p className="text-sm font-medium text-primary">Step 1 · Cross-check</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">What this issue actually requires</h2>
      </div>
    </div>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
      Read off the files and labels this issue was grounded in — not from its title. Each row shows the evidence it came from.
    </p>

    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      <Metric label="Complexity" value={capitalize(scope.complexity)} />
      <Metric label="Estimated effort" value={capitalize(scope.effort)} />
      <Metric label="Files in scope" value={String(scope.touchedFiles)} />
    </div>

    {areas.length > 0 ? (
      <ul className="mt-5 space-y-3">
        {areas.map((area) => (
          <li key={area.key} className="rounded-lg border border-border/70 bg-muted/20 p-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm font-semibold text-foreground">{area.label}</span>
              <span className="text-[11px] text-subtle-foreground">from {area.matched.length} match{area.matched.length === 1 ? "" : "es"}</span>
            </div>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{area.meaning}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {area.matched.map((item) => (
                <code key={item} className="rounded bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">{item}</code>
              ))}
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-5 text-sm leading-6 text-muted-foreground">
        No file evidence was returned for this issue yet, so the areas below cannot be verified. Reindex the repository, or read the issue description first.
      </p>
    )}

    {dependencies.length > 0 ? (
      <div className="mt-5 border-t border-border pt-4">
        <SubHeading icon={<FileCode2 className="size-3.5 text-primary" />}>Dependencies to inspect</SubHeading>
        <div className="mt-2 flex flex-wrap gap-1.5">{dependencies.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}</div>
      </div>
    ) : null}

    {knowledge.length > 0 ? (
      <div className="mt-4">
        <SubHeading icon={<Sparkles className="size-3.5 text-primary" />}>Declared required knowledge</SubHeading>
        <div className="mt-2 flex flex-wrap gap-1.5">{knowledge.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}</div>
      </div>
    ) : null}
  </section>;
}

/**
 * "What you need to understand" - the areas turned into concrete things to
 * read, plus anything the resume comparison added on top.
 */
function UnderstandPanel({ requirements, extra }: { requirements: IssueRequirements; extra: readonly string[] }) {
  const points = [
    ...requirements.areas.map((area) => `${area.label} — ${area.meaning}`),
    ...extra,
  ];
  if (points.length === 0) return null;
  return <section className="rounded-xl border border-border bg-card p-5">
    <div className="flex items-center gap-2">
      <GraduationCap className="size-4 text-primary" />
      <div>
        <p className="text-sm font-medium text-primary">Step 2 · Understand</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">What you need to understand before you start</h2>
      </div>
    </div>
    <ol className="mt-4 space-y-2.5">
      {points.map((point, index) => (
        <li key={point} className="flex gap-3 rounded-lg border border-border/70 bg-muted/20 p-3.5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">{index + 1}</span>
          <p className="text-sm leading-6 text-foreground">{point}</p>
        </li>
      ))}
    </ol>
  </section>;
}

function IssuePlan({ data }: { data: BackendContributorIntelligenceResult }) {
  const analysis = data.analysis;
  return <div className="space-y-6"><section className="rounded-xl border border-border bg-card p-5"><p className="text-sm font-medium text-primary">Implementation plan</p><h2 className="mt-1 text-xl font-semibold text-foreground">A change path grounded in this issue</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">These steps come from the issue analysis and repository evidence returned for this repository. Each checkpoint tells you what to inspect before moving on; it is not a generic first-PR checklist.</p><div className="mt-5 space-y-4">{analysis.suggestedApproach.map((item, index) => <div key={item} className="flex gap-3 rounded-lg border border-border/70 bg-muted/20 p-4"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{index + 1}</span><p className="text-sm leading-6 text-foreground">{item}</p></div>)}</div></section>
    <section className="rounded-xl border border-border bg-card p-5"><div className="flex items-center gap-2"><ClipboardCheck className="size-4 text-primary" /><h2 className="text-lg font-semibold text-foreground">Contribution checkpoints</h2></div><div className="mt-5 space-y-5">{analysis.contributionSteps.map((step, index) => <div key={`${step.title}-${index}`} className="relative border-l-2 border-primary/30 pl-5"><span className="absolute -left-[9px] top-0 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">{index + 1}</span><h3 className="font-medium text-foreground">{step.title}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">{step.actions.map((action) => <li key={action}>{action}</li>)}</ul><p className="mt-2 rounded-md bg-muted/30 px-3 py-2 text-xs leading-5 text-subtle-foreground"><span className="font-medium text-foreground">Checkpoint:</span> {step.completionEvidence}</p></div>)}</div></section>
    <section className="grid gap-4 lg:grid-cols-2"><KnowledgeCard title="Knowledge to review" icon={<Sparkles className="size-4" />} items={analysis.requiredKnowledge} /><KnowledgeCard title="Dependencies to inspect" icon={<FileCode2 className="size-4" />} items={analysis.dependencies} empty="No additional dependencies were identified from the returned evidence." /></section>
  </div>;
}

function IssueTesting({ data }: { data: BackendContributorIntelligenceResult }) {
  const analysis = data.analysis;
  return <div className="space-y-6"><section className="rounded-xl border border-border bg-card p-5"><div className="flex items-center gap-2"><FlaskConical className="size-4 text-primary" /><div><p className="text-sm font-medium text-primary">Testing plan</p><h2 className="mt-1 text-xl font-semibold text-foreground">Prove the fix and protect the failure path</h2></div></div><div className="mt-5 space-y-3">{analysis.testingPlan.map((item, index) => <div key={item} className="flex gap-3 rounded-lg border border-border/70 bg-muted/20 p-4"><span className="mt-0.5 text-xs font-semibold text-primary">0{index + 1}</span><p className="text-sm leading-6 text-foreground">{item}</p></div>)}</div></section><section className="rounded-xl border border-border bg-card p-5"><p className="text-sm font-medium text-primary">Before you open a PR</p><h2 className="mt-1 text-xl font-semibold text-foreground">Verification checklist</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{["Re-read the issue acceptance criteria", "Run the narrowest relevant test first", "Check the changed behavior manually", "Run the repository’s existing validation command", "Review the diff for unrelated changes", "Include test evidence in the pull request"].map((item) => <div key={item} className="flex items-start gap-2 rounded-md border border-border/70 p-3 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />{item}</div>)}</div></section><section className="rounded-xl border border-border bg-card p-5"><h2 className="text-lg font-semibold text-foreground">Confidence and limitations</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">This estimate is {Math.round(analysis.confidence * 100)}% confident and was produced with the <span className="font-medium text-foreground">{analysis.method === "grounded-llm" ? "repository-grounded model" : "repository-grounded heuristic"}</span> method. Treat the listed checks as evidence to verify, not as proof that the code is already understood.</p>{analysis.evidence.length > 0 ? <div className="mt-4 space-y-2">{analysis.evidence.map((item) => <p key={item} className="rounded-md bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">{item}</p>)}</div> : null}</section></div>;
}

function IssueChat({ repositoryId, repository, data }: { repositoryId: string; repository: BackendImportedRepository; data: BackendContributorIntelligenceResult }) {
  const ask = useAskRepository();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the conversation to the newest turn so the answer is visible
  // as soon as it arrives, the way a normal chat UI behaves, instead of
  // leaving the user to scroll the page down to find it.
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, ask.isPending, chatError]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = question.trim();
    if (!value || ask.isPending) return;
    setQuestion("");
    setChatError(null);
    // Show the question immediately, before the answer comes back, so the
    // conversation feels live rather than freezing until the request resolves.
    setMessages((previous) => [...previous, { role: "user", content: value }]);
    try {
      const dossier = JSON.stringify({
        repository: {
          fullName: repository.fullName,
          description: repository.description,
          defaultBranch: repository.defaultBranch,
          language: repository.language,
          languages: repository.languages,
          topics: repository.topics,
          readmeSummary: repository.readmeSummary,
          isFork: repository.isFork,
          parentFullName: repository.parentFullName,
        },
        issue: data.issue,
        issueIntelligence: {
          mapping: data.mapping,
          analysis: data.analysis,
          generatedAt: data.generatedAt,
          sourceVersion: data.sourceVersion,
        },
      }, null, 2);
      const currentQuestion = `Issue #${data.issue.number}: ${data.issue.title}\n\nContributor question: ${value}`;
      const result = await ask.mutateAsync({ repositoryId, context: dossier, history: messages.slice(-10), question: currentQuestion });
      setMessages((previous) => [...previous, { role: "assistant", content: result.answer }]);
    } catch (error) {
      setChatError(error instanceof BackendApiError ? error.message : "The assistant could not answer this question. Please retry.");
    }
  };
  const prompts = ["What should I inspect first?", "How can I verify the root cause?", "What is the smallest safe change?", "Which test should I add or update?"];
  return <section className="rounded-xl border border-border bg-card p-5"><div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><MessageSquare className="size-5" /></div><div><p className="text-sm font-medium text-primary">Issue-scoped assistant</p><h2 className="mt-1 text-xl font-semibold text-foreground">Ask about #{data.issue.number}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">This chat includes the issue title, issue description, and the current repository scope. It is separate from repository-level orientation so every answer stays focused on the change you are trying to make.</p></div></div><div className="mt-6 flex flex-wrap gap-2">{prompts.map((prompt) => <button key={prompt} type="button" onClick={() => setQuestion(prompt)} className="rounded-md border border-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">{prompt}</button>)}</div><form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a question about this issue…" className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" /><Button type="submit" disabled={ask.isPending || !question.trim()}>{ask.isPending ? "Thinking…" : "Ask assistant"}</Button></form>{chatError ? <div className="mt-5 rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-sm leading-6 text-amber-200">{chatError}</div> : null}{messages.length > 0 ? <div className="mt-5 max-h-[30rem] space-y-3 overflow-y-auto scroll-smooth pr-1">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={message.role === "user" ? "ml-auto max-w-3xl rounded-lg border border-border bg-muted/40 p-4" : "max-w-3xl rounded-lg border border-primary/30 bg-primary/5 p-4"}><p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">{message.role === "user" ? "You" : "OpenPath"}</p><div className="mt-2 text-sm leading-6 text-foreground">{message.role === "assistant" ? <GitHubMarkdown markdown={message.content} emptyFallback="No answer was returned." /> : <p className="whitespace-pre-wrap">{message.content}</p>}</div></div>)}{ask.isPending ? <ThinkingBubble /> : null}<div ref={scrollAnchorRef} /></div> : <div className="mt-5 rounded-lg border border-dashed border-border p-5 text-sm leading-6 text-muted-foreground">Ask a question about the issue. OpenPath will use the issue dossier, repository analysis, and relevant indexed files to answer, then remember the conversation for your follow-up questions.</div>}</section>;
}

function ThinkingBubble() {
  return <div className="max-w-3xl rounded-lg border border-primary/30 bg-primary/5 p-4"><p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">OpenPath</p><div className="mt-2 flex items-center gap-1.5"><span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.3s]" /><span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.15s]" /><span className="size-1.5 animate-bounce rounded-full bg-primary/70" /></div></div>;
}

function EvidencePanel({ data }: { data: BackendContributorIntelligenceResult }) {
  const evidence = [...data.mapping.relevantFiles, ...data.mapping.relevantDocumentation, ...data.mapping.relevantModules];
  const evidencePaths = Array.isArray(data.analysis.evidencePaths) ? data.analysis.evidencePaths : [];
  if (evidence.length === 0 && evidencePaths.length === 0) return <section className="rounded-xl border border-dashed border-border bg-card p-5"><p className="text-sm font-medium text-primary">Repository evidence</p><h2 className="mt-1 text-lg font-semibold text-foreground">No verified source locations were returned</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">OpenPath will not invent filenames. Use the issue-scoped assistant or reindex the repository when the knowledge service is available.</p></section>;
  const unique = new Map<string, BackendMappingEvidence>(); evidence.forEach((item) => unique.set(item.path, item)); evidencePaths.forEach((path) => { if (!unique.has(path)) unique.set(path, { path, url: "", documentType: "repository evidence", confidence: data.mapping.confidence, explanation: "Returned as verified analysis evidence." }); });
  return <section className="rounded-xl border border-border bg-card p-5"><div className="flex items-center gap-2"><FileCode2 className="size-4 text-primary" /><div><p className="text-sm font-medium text-primary">Verified repository evidence</p><h2 className="mt-1 text-lg font-semibold text-foreground">Where the analysis is grounded</h2></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{Array.from(unique.values()).slice(0, 8).map((item) => <div key={item.path} className="rounded-lg border border-border/70 bg-muted/20 p-3"><div className="flex items-start justify-between gap-3"><code className="break-all text-xs text-foreground">{item.path}</code>{item.url ? <a href={item.url} target="_blank" rel="noreferrer" aria-label={`Open ${item.path} on GitHub`} className="shrink-0 text-primary"><ExternalLink className="size-3.5" /></a> : null}</div><p className="mt-2 text-xs leading-5 text-muted-foreground">{item.explanation}</p></div>)}</div></section>;
}

function KnowledgeCard({ title, icon, items, empty }: { title: string; icon: ReactNode; items: readonly string[]; empty?: string }) { return <section className="rounded-xl border border-border bg-card p-5"><div className="flex items-center gap-2 text-primary">{icon}<h2 className="text-lg font-semibold text-foreground">{title}</h2></div>{items.length > 0 ? <div className="mt-4 flex flex-wrap gap-2">{items.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}</div> : <p className="mt-3 text-sm leading-6 text-muted-foreground">{empty ?? "No additional knowledge areas were returned."}</p>}</section>; }
function GuidanceCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <section className="rounded-xl border border-border bg-card p-5"><div className="flex items-center gap-2 text-primary">{icon}<h2 className="text-lg font-semibold text-foreground">{title}</h2></div><p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p></section>; }
function ConfidenceBadge({ analysis }: { analysis: BackendIssueAnalysis }) { return <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-primary" />{analysis.method === "grounded-llm" ? "Grounded model" : "Grounded heuristic"} · {Math.round(analysis.confidence * 100)}% confidence</span>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium text-foreground">{value}</p></div>; }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function WorkspaceState({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) { return <section className="rounded-xl border border-dashed border-border bg-card p-8 text-center"><h2 className="text-lg font-semibold text-foreground">{title}</h2>{detail ? <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{detail}</p> : null}{action ? <div className="mt-5 flex justify-center">{action}</div> : null}</section>; }


/**
 * Marks progress on this issue. Viewing is recorded automatically by the
 * backend when the issue loads; these two actions are the only parts a
 * contributor states themselves, and they feed the profile directly.
 */
function IssueProgressBar({ issueId }: { issueId: string }) {
  const setProgress = useSetIssueProgress();
  const marked = setProgress.data?.status ?? null;
  return <section className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-sm text-muted-foreground">
      {marked === "completed" ? "Marked as completed - it now counts towards your profile."
        : marked === "started" ? "Marked as in progress. Come back and complete it when the work is done."
        : "Track this issue on your contributor profile."}
    </p>
    <div className="flex shrink-0 gap-2">
      <Button size="sm" variant="outline" disabled={setProgress.isPending} onClick={() => setProgress.mutate({ issueId, status: "started" })}>
        <PlayCircle className="size-4" />Start working
      </Button>
      <Button size="sm" disabled={setProgress.isPending} onClick={() => setProgress.mutate({ issueId, status: "completed" })}>
        <CheckCircle2 className="size-4" />Mark complete
      </Button>
    </div>
  </section>;
}
