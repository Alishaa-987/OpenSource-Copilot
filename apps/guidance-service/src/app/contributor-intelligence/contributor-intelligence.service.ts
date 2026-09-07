import { Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Prisma } from '../../../../../libs/guidance-database/generated';
import { GuidancePrismaService } from '../database/guidance-prisma.service';
import { KnowledgeRetrievalClient, RepositoryIssueDetailClient } from './contributor-intelligence.clients';
import type { ContributorIssue, ContributorIntelligenceResult, Effort, GuidanceStep, IssueAnalysis, IssueMapping, MappingEvidence, RetrievedKnowledgeChunk } from './contributor-intelligence.types';
import { GuidanceLlmService } from './guidance-llm.service';

const DOC_TYPES = new Set(['readme', 'contributing', 'code-of-conduct', 'security', 'documentation']);
const HIGH_RISK_LABELS = new Set(['breaking-change', 'breaking', 'major-feature', 'large-feature', 'architectural-change', 'architecture']);
const BEGINNER_LABELS = new Set(['good-first-issue', 'first-timers-only', 'help-wanted', 'documentation', 'tests', 'testing']);
const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));
const normalize = (value: string): string => value.trim().toLowerCase().replace(/[ _]+/g, '-');

@Injectable()
export class ContributorIntelligenceService {
  private readonly logger = new Logger(ContributorIntelligenceService.name);
  constructor(private readonly issues: RepositoryIssueDetailClient, private readonly knowledge: KnowledgeRetrievalClient, private readonly prisma: GuidancePrismaService, private readonly llm: GuidanceLlmService) {}

  async getIntelligence(repositoryId: string, issueId: string, cookie: string): Promise<ContributorIntelligenceResult> {
    const issue = await this.issues.getIssue(repositoryId, issueId, cookie);
    let chunks: readonly RetrievedKnowledgeChunk[] = [];
    const limitations: string[] = [];
    try { chunks = await this.knowledge.retrieve(repositoryId, this.issueQuestion(issue), cookie); } catch {
      limitations.push('Repository retrieval was unavailable; mapping uses issue metadata only.');
      this.logger.warn('Knowledge retrieval failed; using deterministic issue-only analysis');
    }
    let mapping = this.buildMapping(issue, chunks, limitations);
    const analysis = await this.buildGroundedAnalysis(issue, mapping, chunks, limitations);
    if (analysis.method === 'grounded-llm') {
      const verifiedPaths = new Set(analysis.evidencePaths);
      const relevantFiles = mapping.relevantFiles.filter((file) => verifiedPaths.has(file.path));
      const relevantDocumentation = mapping.relevantDocumentation.filter((file) => verifiedPaths.has(file.path));
      const relevantModules = mapping.relevantModules.filter((module) => relevantFiles.some((file) => file.path.startsWith(module.path + '/')));
      mapping = { ...mapping, relevantFiles, relevantDocumentation, relevantModules, confidence: relevantFiles.length > 0 ? mapping.confidence : 0, limitations: relevantFiles.length > 0 ? mapping.limitations : [...mapping.limitations, 'No repository file was verified by the grounded analysis.'] };
    }
    const generatedAt = new Date().toISOString();
    await this.prisma.issueIntelligence.upsert({
      where: { repositoryId_issueId: { repositoryId, issueId } },
      update: { mappingJson: this.toJson(mapping), analysisJson: this.toJson(analysis), generatedAt, sourceVersion: 'phase3-v1' },
      create: { repositoryId, issueId, mappingJson: this.toJson(mapping), analysisJson: this.toJson(analysis), generatedAt, sourceVersion: 'phase3-v1' },
    });
    return { repositoryId, issue, mapping, analysis, generatedAt, sourceVersion: 'phase3-v1' };
  }

  private issueQuestion(issue: ContributorIssue): string {
    return (issue.title + '\n' + (issue.body ?? '')).slice(0, 8_000);
  }

  private buildMapping(issue: ContributorIssue, chunks: readonly RetrievedKnowledgeChunk[], limitations: string[]): IssueMapping {
    const byPath = new Map<string, RetrievedKnowledgeChunk>();
    for (const chunk of chunks) {
      const prior = byPath.get(chunk.path);
      if (!prior || chunk.relevance > prior.relevance) byPath.set(chunk.path, chunk);
    }
    const evidence: MappingEvidence[] = [...byPath.values()].sort((a, b) => b.relevance - a.relevance || a.path.localeCompare(b.path)).slice(0, 12).map((chunk) => ({
      path: chunk.path, url: chunk.url, documentType: chunk.documentType,
      confidence: clamp(0.25 + (chunk.relevance * 0.7)),
      explanation: this.evidenceExplanation(issue, chunk),
    }));
    const documentation = evidence.filter((item) => DOC_TYPES.has(normalize(item.documentType)) || /(^|\/)(docs?|documentation)(\/|$)|readme|contributing|security/i.test(item.path));
    const files = evidence.filter((item) => !documentation.includes(item));
    const moduleNames = [...new Set(files.map((item) => item.path.split('/')[0]).filter(Boolean))].slice(0, 8);
    const modules = moduleNames.map((name) => {
      const first = files.find((item) => item.path.startsWith(name + '/'));
      return { path: name, url: first?.url ?? issue.url, documentType: 'module', confidence: first?.confidence ?? 0.2, explanation: 'This top-level path groups retrieved evidence; inspect the code before changing it.' };
    });
    const confidence = evidence.length === 0 ? 0.15 : clamp(evidence.reduce((sum, item) => sum + item.confidence, 0) / evidence.length);
    return { relevantFiles: files.slice(0, 8), relevantDocumentation: documentation.slice(0, 8), relevantModules: modules, confidence, limitations: Object.freeze([...limitations, ...(evidence.length === 0 ? ['No indexed repository context matched this issue.'] : [])]) };
  }

  private async buildGroundedAnalysis(issue: ContributorIssue, mapping: IssueMapping, chunks: readonly RetrievedKnowledgeChunk[], limitations: readonly string[]): Promise<IssueAnalysis> {
    if (!this.llm.isConfigured() || chunks.length === 0) return this.buildAnalysis(issue, mapping, limitations);
    try {
      const grounded = await this.llm.generate(issue, mapping, chunks);
      const allowedPaths = new Set(chunks.map((chunk) => chunk.path));
      const evidencePaths = grounded.evidencePaths.filter((path) => allowedPaths.has(path));
      return {
        complexity: grounded.complexity,
        effort: grounded.effort,
        requiredKnowledge: grounded.requiredKnowledge,
        dependencies: grounded.dependencies,
        beginnerSuitable: grounded.beginnerSuitable,
        confidence: mapping.confidence,
        reasons: [...grounded.reasons, ...limitations],
        evidence: evidencePaths.map((path) => `Retrieved path: ${path}`),
        explanation: grounded.explanation,
        rootCause: grounded.rootCause,
        suggestedApproach: grounded.suggestedApproach,
        contributionSteps: grounded.contributionSteps,
        testingPlan: grounded.testingPlan,
        evidencePaths,
        method: 'grounded-llm',
      };
    } catch (error) {
      this.logger.warn(`Grounded guidance unavailable; using deterministic fallback: ${error instanceof Error ? error.message : 'unknown error'}`);
      return this.buildAnalysis(issue, mapping, [...limitations, 'LLM analysis was unavailable; the displayed guidance is heuristic and must be verified against the repository.']);
    }
  }

  private buildAnalysis(issue: ContributorIssue, mapping: IssueMapping, limitations: readonly string[] = []): IssueAnalysis {
    const labels = new Set(issue.labels.map((label) => normalize(label.name)));
    const rawText = issue.title + ' ' + (issue.body ?? '');
    const text = normalize(rawText);
    const paths = mapping.relevantFiles.map((file) => file.path);
    const highRisk = [...labels].some((label) => HIGH_RISK_LABELS.has(label)) || /(breaking|architecture|migration|security-critical)/i.test(text);
    const beginnerSignal = [...labels].some((label) => BEGINNER_LABELS.has(label));
    const complexity: 'low' | 'medium' | 'high' = highRisk ? 'high' : beginnerSignal && issue.commentsCount <= 10 ? 'low' : 'medium';
    const effort: Effort = complexity === 'high' ? 'large' : complexity === 'low' ? 'small' : 'medium';
    const requiredKnowledge = this.knowledgeAreas(text, labels, mapping);
    const dependencies = this.dependencies(text);
    const beginnerSuitable = !highRisk && complexity !== 'high' && (beginnerSignal || issue.commentsCount <= 5);
    const reasons = [
      highRisk ? 'Risk signals indicate architectural, breaking, migration, or security-sensitive work.' : 'No high-risk label or phrase was detected in the issue text or labels.',
      beginnerSignal ? 'The issue has a beginner-oriented label or a documentation/testing signal.' : 'No explicit beginner-oriented label was detected, so beginner suitability is inferred cautiously.',
      paths.length > 0 ? `Repository retrieval identified ${paths.length} code/documentation path(s) that match the issue wording.` : 'No code path was retrieved; estimates rely on issue metadata and should be verified locally.',
      issue.commentsCount <= 5 ? 'Discussion volume is currently low.' : 'The issue has substantial discussion, so review comments before coding.',
    ];
    const evidence = [...issue.labels.map((label) => 'Issue label: ' + label.name), 'Issue comments: ' + issue.commentsCount, ...paths.slice(0, 6).map((path) => 'Retrieved path: ' + path), 'Mapping confidence: ' + mapping.confidence.toFixed(2)];
    const explanation = this.explanation(issue, paths);
    const rootCause = this.rootCause(rawText, mapping);
    const suggestedApproach = this.suggestedApproach(rawText, paths);
    const contributionSteps = this.contributionSteps(rawText, paths, mapping, rootCause);
    const testingPlan = this.testingPlan(rawText, paths);
    return { complexity, effort, requiredKnowledge, dependencies, beginnerSuitable, confidence: clamp(0.45 + (mapping.confidence * 0.35) + (issue.title.length > 10 ? 0.1 : 0)), reasons: [...reasons, ...limitations], evidence, explanation, rootCause, suggestedApproach, contributionSteps, testingPlan, evidencePaths: paths, method: 'deterministic-heuristic' };
  }

  private evidenceExplanation(issue: ContributorIssue, chunk: RetrievedKnowledgeChunk): string {
    const terms = normalize(issue.title + ' ' + (issue.body ?? '')).split(/[^a-z0-9]+/).filter((term) => term.length > 3);
    const overlap = terms.filter((term) => normalize(chunk.content).includes(term)).slice(0, 4);
    return overlap.length > 0 ? `Retrieved because it contains issue-related terms (${overlap.join(', ')}). Verify the exact call path before editing.` : 'Retrieved repository context is related evidence, not certainty; inspect the file before editing.';
  }

  private explanation(issue: ContributorIssue, paths: readonly string[]): string {
    const named = paths.length > 0 ? `The issue points to ${paths.slice(0, 3).join(', ')}.` : 'The issue does not identify a concrete source path in the imported context.';
    return `${issue.title} is a request to correct the behavior described in the issue body, not merely to change a label or configuration. ${named} The expected change should preserve the route or feature contract while removing the reported type or validation failures.`;
  }

  private rootCause(text: string, mapping: IssueMapping): string {
    const normalized = normalize(text);
    if (/zod|validation/.test(normalized) && /type|mismatch|typescript/.test(normalized)) return 'The reported failure is consistent with a boundary mismatch: runtime validation and the TypeScript type contract are not describing the same input shape or error context. The retrieved files provide evidence for this hypothesis, but the compiler and failing test output must confirm it.';
    if (/type|typescript|mismatch/.test(normalized)) return 'The likely root cause is inconsistent TypeScript types across the affected boundary. Compare the producer, validator, and consumer types in the retrieved paths rather than widening types blindly.';
    return mapping.relevantFiles.length > 0 ? 'The issue appears to originate in the retrieved implementation paths; trace the request/data flow there and confirm the first failing assertion or compiler diagnostic.' : 'A repository-specific root cause could not be established because no code files were available in retrieval.';
  }

  private suggestedApproach(text: string, paths: readonly string[]): string[] {
    const normalizedText = normalize(text);
    const focus = this.issueFocus(text);
    const target = paths.length > 0 ? paths.slice(0, 4).join(', ') : 'a local repository search for the issue terms';
    const steps = [
      `Reproduce “${focus}” locally and record the first failing test, compiler diagnostic, or runtime response.`,
      `Trace the affected behavior through ${target}; treat these paths as retrieved leads and verify the actual call path before editing.`,
      `Make the smallest change that satisfies the issue’s acceptance condition for ${focus}; do not broaden types or weaken validation to silence an error.`,
      'Add a regression check for the observed failure and preserve the existing behavior for valid inputs.',
    ];
    if (/zod|validation|schema/.test(normalizedText)) steps.splice(2, 0, 'Keep the runtime schema and inferred TypeScript type derived from the same source, then verify both accepted and rejected input shapes.');
    if (/type|typescript|mismatch|assign/.test(normalizedText)) steps.splice(2, 0, 'Compare the producer, validator, and consumer types at the failing boundary and correct the narrowest inconsistent contract.');
    if (/docs?|readme|documentation/.test(normalizedText)) steps.splice(2, 0, 'Follow the repository’s documented contribution conventions and update only the documentation section described by the issue.');
    return steps.slice(0, 8);
  }

  private contributionSteps(text: string, paths: readonly string[], mapping: IssueMapping, rootCause: string): GuidanceStep[] {
    const normalizedText = normalize(text);
    const focus = this.issueFocus(text);
    const shortFocus = focus.length > 70 ? focus.slice(0, 67) + '…' : focus;
    const evidenceTarget = paths.length > 0 ? paths.slice(0, 4).join(', ') : 'a targeted repository search for the issue terms (no path was retrieved yet)';
    const confidenceNote = mapping.confidence < 0.7 ? ' Retrieval confidence is limited, so confirm the call path locally before committing.' : ' Retrieval confidence is sufficient to begin tracing, but still verify the code locally.';
    const implementationAction = /zod|validation|schema/.test(normalizedText)
      ? 'Keep the runtime schema and inferred TypeScript type derived from the same source, then verify both accepted and rejected input shapes.'
      : /type|typescript|mismatch|assign/.test(normalizedText)
      ? 'Compare the producer, validator, and consumer types at the failing boundary and correct the narrowest inconsistent contract.'
      : /docs?|readme|documentation/.test(normalizedText)
      ? 'Update only the documentation section this issue describes, following the repository’s existing conventions.'
      : /api|route|endpoint|request|response/.test(normalizedText)
      ? 'Change the request/response handling at the affected endpoint without altering unrelated routes or contracts.'
      : `Make the smallest change that satisfies the acceptance condition for “${shortFocus}”; do not broaden types or weaken validation to silence an error.`;
    return [
      {
        title: `Understand “${shortFocus}”`,
        actions: [
          'Read the full issue discussion and identify the expected outcome, constraints, and unanswered questions.',
          `Write down a reproducible trigger for “${shortFocus}” and the observable acceptance condition described in the issue.`,
        ],
        completionEvidence: `You can state the current behavior, the expected behavior for “${shortFocus}”, and a reproducible trigger.`,
      },
      {
        title: 'Trace the affected path before coding',
        actions: [
          `Inspect the retrieved evidence: ${evidenceTarget}.`,
          `Follow the data or request flow from its boundary to the failure and confirm whether these specific paths are actually involved.${confidenceNote}`,
        ],
        completionEvidence: `You have identified the first failing boundary in ${evidenceTarget} and can explain why it is involved in “${shortFocus}”.`,
      },
      {
        title: 'Implement the narrowest fix',
        actions: [
          'Create a focused branch linked to this issue.',
          implementationAction,
          'Add a regression test alongside the affected behavior.',
        ],
        completionEvidence: rootCause
          ? `The diff addresses this issue's root cause (${rootCause.slice(0, 160)}) without unrelated refactoring, and the regression test fails before the fix.`
          : 'The diff addresses the reported behavior without unrelated refactoring, and the regression test fails before the fix.',
      },
      {
        title: 'Validate and open the pull request',
        actions: [
          'Run the narrowest focused test, then typecheck, lint, and the repository-required checks.',
          'Review the final diff and confirm no secrets or generated artifacts are included.',
          `Open a pull request that links this issue, explains how the change resolves “${shortFocus}”, and reports the exact validation commands and results.`,
        ],
        completionEvidence: 'All required checks pass and the pull request explains the evidence, change, and test coverage.',
      },
    ];
  }

  private testingPlan(text: string, paths: readonly string[]): string[] {
    const normalizedText = normalize(text);
    const focus = this.issueFocus(text);
    const plan = [
      `Create a regression test that reproduces “${focus}” before the fix and passes after it.`,
      'Run the narrowest affected test target first, then the repository’s full relevant test suite.',
      'Run the repository typecheck/build and lint commands required by its contribution documentation.',
    ];
    if (/api|route|endpoint|request|response/.test(normalizedText)) plan.push('Exercise the affected boundary with valid input, missing input, and incorrectly typed input; verify status codes and response shape.');
    if (/database|sql|schema|migration|prisma/.test(normalizedText)) plan.push('Run the affected database test or migration check against an isolated database and verify both existing and new records.');
    if (/ui|component|render|page|frontend/.test(normalizedText)) plan.push('Verify the affected state in the UI and cover loading, success, empty, and error states where applicable.');
    if (paths.length > 0) plan.push(`Review coverage and the final diff for the verified evidence paths: ${paths.slice(0, 6).join(', ')}.`);
    else plan.push('Because no repository source path was retrieved, confirm the implementation location locally before claiming path-specific test coverage.');
    return plan.slice(0, 10);
  }

  private issueFocus(text: string): string {
    const cleaned = text.replace(/```[\s\S]*?```/g, ' ').replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ').trim();
    return (cleaned || 'the reported issue').slice(0, 220);
  }

  private knowledgeAreas(text: string, labels: ReadonlySet<string>, mapping: IssueMapping): string[] {
    const areas: string[] = [];
    if (/(api|endpoint|http|rest|graphql)/i.test(text)) areas.push('API and request/response design');
    if (/(test|testing|spec|coverage)/i.test(text) || labels.has('tests')) areas.push('Automated testing');
    if (/(database|sql|schema|migration|prisma)/i.test(text)) areas.push('Database and migration safety');
    if (/(typescript|javascript|node|nestjs|react)/i.test(text)) areas.push('TypeScript/JavaScript service development');
    if (/(docs?|documentation|readme|guide)/i.test(text)) areas.push('Documentation conventions');
    if (mapping.relevantFiles.some((file) => /\.tsx?$|\.jsx?$/.test(file.path))) areas.push('Repository-specific TypeScript module structure');
    if (mapping.relevantDocumentation.length > 0) areas.push('This repository\'s contribution and test conventions');
    return areas.length > 0 ? areas : ['Repository-specific conventions and testing workflow'];
  }

  private dependencies(text: string): string[] {
    const dependencies: string[] = [];
    if (/(database|sql|schema|migration|prisma)/i.test(text)) dependencies.push('Database schema or migration review');
    if (/(api|endpoint|http|rest|graphql)/i.test(text)) dependencies.push('API contract and compatibility review');
    if (/(github|oauth|permission|authorization|auth)/i.test(text)) dependencies.push('Authentication and authorization review');
    if (/(kafka|event|queue|async)/i.test(text)) dependencies.push('Asynchronous event and retry behavior');
    return dependencies;
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
