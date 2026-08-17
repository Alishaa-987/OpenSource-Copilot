import { Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Prisma } from '../../../../../libs/guidance-database/generated';
import { GuidancePrismaService } from '../database/guidance-prisma.service';
import { KnowledgeRetrievalClient, RepositoryIssueDetailClient } from './contributor-intelligence.clients';
import type { ContributorIssue, ContributorIntelligenceResult, Effort, IssueAnalysis, IssueMapping, MappingEvidence, RetrievedKnowledgeChunk } from './contributor-intelligence.types';

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
      explanation: 'Retrieved repository context is related evidence, not certainty.',
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
    const text = normalize(issue.title + ' ' + (issue.body ?? ''));
    const highRisk = [...labels].some((label) => HIGH_RISK_LABELS.has(label)) || /(breaking|architecture|migration|security-critical)/i.test(text);
    const beginnerSignal = [...labels].some((label) => BEGINNER_LABELS.has(label));
    const complexity: 'low' | 'medium' | 'high' = highRisk ? 'high' : beginnerSignal && issue.commentsCount <= 10 ? 'low' : 'medium';
    const effort: Effort = complexity === 'high' ? 'large' : complexity === 'low' ? 'small' : 'medium';
    const requiredKnowledge = this.knowledgeAreas(text, labels);
    const dependencies = this.dependencies(text);
    const beginnerSuitable = !highRisk && complexity !== 'high' && (beginnerSignal || issue.commentsCount <= 5);
    const reasons = [
      highRisk ? 'Risk signals indicate architectural, breaking, migration, or security-sensitive work.' : 'No high-risk label or phrase was detected.',
      beginnerSignal ? 'The issue has a beginner-oriented label or a documentation/testing signal.' : 'No explicit beginner-oriented label was detected.',
      issue.commentsCount <= 5 ? 'Discussion volume is currently low.' : 'Discussion volume is not low enough to treat the issue as obviously beginner-friendly.',
    ];
    const evidence = [...issue.labels.map((label) => 'Label: ' + label.name), 'Comments: ' + issue.commentsCount, 'Mapping confidence: ' + mapping.confidence.toFixed(2)];
    return { complexity, effort, requiredKnowledge, dependencies, beginnerSuitable, confidence: clamp(0.45 + (mapping.confidence * 0.35) + (issue.title.length > 10 ? 0.1 : 0)), reasons, evidence, method: 'deterministic-heuristic' };
  }

  private knowledgeAreas(text: string, labels: ReadonlySet<string>): string[] {
    const areas: string[] = [];
    if (/(api|endpoint|http|rest|graphql)/i.test(text)) areas.push('API and request/response design');
    if (/(test|testing|spec|coverage)/i.test(text) || labels.has('tests')) areas.push('Automated testing');
    if (/(database|sql|schema|migration|prisma)/i.test(text)) areas.push('Database and migration safety');
    if (/(typescript|javascript|node|nestjs|react)/i.test(text)) areas.push('TypeScript/JavaScript service development');
    if (/(docs?|documentation|readme|guide)/i.test(text)) areas.push('Documentation conventions');
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
