import { Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Prisma } from '../../../../../libs/guidance-database/generated';
import { GuidancePrismaService } from '../database/guidance-prisma.service';
import { KnowledgeRetrievalClient, RepositoryIssueDetailClient } from './contributor-intelligence.clients';
import type { ContributorIssue, ContributorIntelligenceResult, Effort, GuidanceStep, IssueAnalysis, IssueMapping, MappingEvidence, RetrievedKnowledgeChunk } from './contributor-intelligence.types';

const DOC_TYPES = new Set(['readme', 'contributing', 'code-of-conduct', 'security', 'documentation']);
const HIGH_RISK_LABELS = new Set(['breaking-change', 'breaking', 'major-feature', 'large-feature', 'architectural-change', 'architecture']);
const BEGINNER_LABELS = new Set(['good-first-issue', 'first-timers-only', 'help-wanted', 'documentation', 'tests', 'testing']);
const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));
const normalize = (value: string): string => value.trim().toLowerCase().replace(/[ _]+/g, '-');

@Injectable()
export class ContributorIntelligenceService {
  private readonly logger = new Logger(ContributorIntelligenceService.name);
  constructor(private readonly issues: RepositoryIssueDetailClient, private readonly knowledge: KnowledgeRetrievalClient, private readonly prisma: GuidancePrismaService) {}

  async getIntelligence(repositoryId: string, issueId: string, cookie: string): Promise<ContributorIntelligenceResult> {
    const issue = await this.issues.getIssue(repositoryId, issueId, cookie);
    let chunks: readonly RetrievedKnowledgeChunk[] = [];
    const limitations: string[] = [];
    try { chunks = await this.knowledge.retrieve(repositoryId, this.issueQuestion(issue), cookie); } catch {
      limitations.push('Repository retrieval was unavailable; mapping uses issue metadata only.');
      this.logger.warn('Knowledge retrieval failed; using deterministic issue-only analysis');
    }
    const mapping = this.buildMapping(issue, chunks, limitations);
    const analysis = this.buildAnalysis(issue, mapping);
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

  private buildAnalysis(issue: ContributorIssue, mapping: IssueMapping): IssueAnalysis {
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
    const contributionSteps = this.contributionSteps(paths, mapping);
    const testingPlan = this.testingPlan(rawText, paths);
    return { complexity, effort, requiredKnowledge, dependencies, beginnerSuitable, confidence: clamp(0.45 + (mapping.confidence * 0.35) + (issue.title.length > 10 ? 0.1 : 0)), reasons, evidence, explanation, rootCause, suggestedApproach, contributionSteps, testingPlan, method: 'deterministic-heuristic' };
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
    const steps = ['Reproduce the reported failure and capture the exact compiler or test diagnostic.', 'Inspect the retrieved paths and trace the input from the route boundary through validation to the response.', 'Make the smallest contract-preserving change; keep validation, inferred types, and error messages consistent.', 'Run focused tests first, then the repository checks required by its contribution documentation.'];
    if (/zod|validation/.test(normalize(text))) steps.splice(2, 0, 'Use the existing validation context and schema inference pattern instead of introducing a second validation convention.');
    if (paths.length === 0) steps.unshift('Search the repository for the issue terms and route name locally because the indexed corpus did not return source files.');
    return steps;
  }

  private contributionSteps(paths: readonly string[], mapping: IssueMapping): GuidanceStep[] {
    return [
      { title: 'Before coding', actions: ['Read the repository contribution guidance.', `Review the issue and inspect ${paths.length > 0 ? paths.join(', ') : 'the repository search results'}.`], completionEvidence: 'You can explain the current behavior and the acceptance condition.' },
      { title: 'While coding', actions: ['Create a focused branch.', 'Change only the affected contract, validation, and implementation paths.', 'Keep the retrieved evidence as a hypothesis and verify it against the local code.'], completionEvidence: 'The diff is narrow and the type/runtime contracts agree.' },
      { title: 'Testing', actions: ['Run the focused route or validation tests.', 'Run TypeScript/build checks and relevant lint rules.', 'Check both valid and invalid input paths.'], completionEvidence: 'Tests and checks pass without weakening validation.' },
      { title: 'Create the pull request', actions: ['Summarize the failure, root cause, and fix.', 'Link the issue and include test commands/results.', 'Ask for review if the inferred mapping confidence is below 0.7.'], completionEvidence: `Mapping confidence is ${mapping.confidence.toFixed(2)} and should be stated honestly in the PR.` },
    ];
  }

  private testingPlan(text: string, paths: readonly string[]): string[] {
    const plan = ['Add or update a regression test that fails before the fix and passes after it.', 'Run the focused test suite for the affected route/module.', 'Run the project typecheck/build and lint commands.', 'Verify malformed input still returns the intended validation error and valid input still returns the expected response.'];
    if (/api|route|endpoint/.test(normalize(text))) plan.push('Exercise the endpoint with representative valid, missing, and incorrectly typed parameters.');
    if (paths.length > 0) plan.push(`Review test coverage for the affected path(s): ${paths.join(', ')}.`);
    return plan;
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
