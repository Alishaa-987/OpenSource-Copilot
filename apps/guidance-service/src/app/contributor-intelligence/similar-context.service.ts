import { Injectable } from '@nestjs/common';
import { RepositoryIssueDetailClient } from './contributor-intelligence.clients';
import { RepositorySimilarIssuesClient } from './similar-issues.client';
import type { SimilarContextResult, SimilarIssue } from './similar-context.types';

@Injectable()
export class SimilarContextService {
  constructor(private readonly detail: RepositoryIssueDetailClient, private readonly issues: RepositorySimilarIssuesClient) {}

  async getSimilarContext(repositoryId: string, issueId: string, cookie: string): Promise<SimilarContextResult> {
    const target = await this.detail.getIssue(repositoryId, issueId, cookie);
    const candidates = await this.issues.listOpenIssues(repositoryId, cookie);
    const targetTokens = this.tokens(target.title + ' ' + (target.body ?? ''));
    const similarIssues = candidates.filter((candidate) => candidate.id !== issueId).map((candidate) => {
      const candidateTokens = this.tokens(candidate.title + ' ' + (candidate.body ?? ''));
      const overlap = this.overlap(targetTokens, candidateTokens);
      const labelBoost = target.labels.some((left) => candidate.labels.some((right) => left.name.toLowerCase() === right.name.toLowerCase())) ? 0.1 : 0;
      const confidence = Math.min(1, Number((overlap + labelBoost).toFixed(3)));
      return { issueId: candidate.id, number: candidate.number, title: candidate.title, url: candidate.url, confidence, explanation: labelBoost > 0 ? 'Shares terms and at least one label with the target issue.' : 'Shares meaningful title/body terms with the target issue.' } satisfies SimilarIssue;
    }).filter((candidate) => candidate.confidence >= 0.2).sort((left, right) => right.confidence - left.confidence || left.number - right.number || left.issueId.localeCompare(right.issueId)).slice(0, 10);
    return { repositoryId, issueId, similarIssues, similarPullRequests: { available: false, results: [], limitation: 'Pull-request context is unavailable because no permissioned PR source is configured; no PR data was inferred or exposed.' }, limitations: ['Similar issues are calculated from currently accessible open issues only.', 'Similarity is lexical heuristic evidence, not semantic certainty.'] };
  }

  private tokens(text: string): ReadonlySet<string> { return new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 3)); }
  private overlap(left: ReadonlySet<string>, right: ReadonlySet<string>): number { if (left.size === 0 || right.size === 0) return 0; let shared = 0; for (const token of left) if (right.has(token)) shared += 1; return shared / Math.max(left.size, right.size); }
}
