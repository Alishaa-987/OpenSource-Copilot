import axios from 'axios';
import { TypedConfigService } from '@osc/config';
import { getCorrelationId } from '@osc/observability';
import { z } from 'zod';
import type { GuidanceEnv } from '../env';
import type { ContributorIssue } from './contributor-intelligence.types';

const issueSchema = z.object({ id: z.string().uuid(), repositoryId: z.string().uuid(), number: z.number().int().positive(), title: z.string().min(1), state: z.string().min(1), commentsCount: z.number().int().nonnegative(), updatedAt: z.string(), labels: z.array(z.string()), url: z.string().url() });
const responseSchema = z.object({ repositoryId: z.string().uuid(), issues: z.array(issueSchema) });

export class RepositorySimilarIssuesClient {
  constructor(private readonly config: TypedConfigService<GuidanceEnv>) {}
  async listOpenIssues(repositoryId: string, cookie: string): Promise<readonly ContributorIssue[]> {
    const base = this.config.get('REPOSITORY_SERVICE_BASE_URL').replace(/\/$/, '');
    const correlationId = getCorrelationId();
    const response = await axios.get(base + '/api/v1/internal/repositories/' + encodeURIComponent(repositoryId) + '/issues', { headers: { cookie, ...(correlationId ? { 'x-correlation-id': correlationId } : {}) }, timeout: Number(this.config.get('CONTRIBUTOR_INTELLIGENCE_TIMEOUT_MS')), maxRedirects: 0, maxContentLength: 1_000_000, maxBodyLength: 1_000_000 });
    const parsed = responseSchema.parse(response.data);
    if (parsed.repositoryId !== repositoryId) throw new Error('Repository Service returned mismatched repository identity');
    return parsed.issues.map((issue) => ({ ...issue, body: null, author: null, createdAt: issue.updatedAt, closedAt: null, labels: issue.labels.map((name) => ({ name, color: '' })) }));
  }
}
