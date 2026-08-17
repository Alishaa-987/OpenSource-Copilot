import axios from 'axios';
import { TypedConfigService } from '@osc/config';
import { getCorrelationId } from '@osc/observability';
import { z } from 'zod';
import type { GuidanceEnv } from '../env';
import type { ContributorIssue, RetrievedKnowledgeChunk } from './contributor-intelligence.types';

const issueSchema = z.object({
  id: z.string().uuid(), repositoryId: z.string().uuid(), number: z.number().int().positive(),
  title: z.string().min(1), body: z.string().nullable(), state: z.string().min(1),
  author: z.string().nullable(), commentsCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime({ offset: true }), updatedAt: z.string().datetime({ offset: true }),
  closedAt: z.string().datetime({ offset: true }).nullable(),
  labels: z.array(z.object({ name: z.string().min(1), color: z.string().min(1) }).strict()),
  url: z.string().url(),
}).strict();
const issueResponseSchema = z.object({ repositoryId: z.string().uuid(), issue: issueSchema }).strict();
const retrievalResponseSchema = z.object({
  repositoryId: z.string().uuid(),
  chunks: z.array(z.object({
    path: z.string().min(1), documentType: z.string().min(1), url: z.string().url(),
    content: z.string(), relevance: z.number().finite(),
  }).strict()),
}).strict();

function headers(cookie: string): Record<string, string> {
  const correlationId = getCorrelationId();
  return { cookie, ...(correlationId ? { 'x-correlation-id': correlationId } : {}) };
}

export class RepositoryIssueDetailClient {
  constructor(private readonly config: TypedConfigService<GuidanceEnv>) {}
  async getIssue(repositoryId: string, issueId: string, cookie: string): Promise<ContributorIssue> {
    const base = this.config.get('REPOSITORY_SERVICE_BASE_URL').replace(/\/$/, '');
    const url = base + '/api/v1/internal/repositories/' + encodeURIComponent(repositoryId) + '/issues/' + encodeURIComponent(issueId);
    const response = await axios.get(url, { headers: headers(cookie), timeout: this.config.get('CONTRIBUTOR_INTELLIGENCE_TIMEOUT_MS'), maxRedirects: 0, maxContentLength: 1_000_000, maxBodyLength: 1_000_000 });
    const parsed = issueResponseSchema.parse(response.data);
    if (parsed.repositoryId !== repositoryId || parsed.issue.repositoryId !== repositoryId || parsed.issue.id !== issueId) throw new Error('Repository Service returned mismatched issue identity');
    return parsed.issue;
  }
}

export class KnowledgeRetrievalClient {
  constructor(private readonly config: TypedConfigService<GuidanceEnv>) {}
  async retrieve(repositoryId: string, question: string, cookie: string): Promise<readonly RetrievedKnowledgeChunk[]> {
    const base = this.config.get('KNOWLEDGE_SERVICE_BASE_URL').replace(/\/$/, '');
    const url = base + '/api/v1/repositories/' + encodeURIComponent(repositoryId) + '/retrieve';
    const response = await axios.post(url, { question }, { headers: { ...headers(cookie), 'content-type': 'application/json' }, timeout: this.config.get('CONTRIBUTOR_INTELLIGENCE_TIMEOUT_MS'), maxRedirects: 0, maxContentLength: 1_000_000, maxBodyLength: 100_000 });
    const parsed = retrievalResponseSchema.parse(response.data);
    if (parsed.repositoryId !== repositoryId) throw new Error('Knowledge Service returned mismatched repository identity');
    return parsed.chunks.map((chunk) => ({ ...chunk }));
  }
}
