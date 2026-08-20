import { BadGatewayException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { TypedConfigService } from '@osc/config';
import { getCorrelationId } from '@osc/observability';
import { z } from 'zod';
import { GuidanceEnv } from '../env';
import { RepositoryIssueInput } from './recommendation.types';

const RepositoryIssueResponseSchema = z
  .object({
    repositoryId: z.string().uuid(),
    issues: z.array(
      z
        .object({
          id: z.string().uuid(),
          repositoryId: z.string().uuid(),
          number: z.number().int().positive(),
          title: z.string().min(1),
          state: z.string().min(1),
          commentsCount: z.number().int().nonnegative(),
          updatedAt: z.string().datetime({ offset: true }),
          labels: z.array(z.string()),
          url: z.string().url(),
        })
        .strict(),
    ),
  })
  .strict();

@Injectable()
export class RepositoryIssuesClient {
  constructor(@Inject(TypedConfigService) private readonly config: TypedConfigService<GuidanceEnv>) {}

  async listOpenIssues(repositoryId: string, cookieHeader?: string): Promise<RepositoryIssueInput[]> {
    const correlationId = getCorrelationId();
    const baseUrl = this.config.get('REPOSITORY_SERVICE_BASE_URL');
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = normalizedBaseUrl + '/api/v1/internal/repositories/' + encodeURIComponent(repositoryId) + '/issues';
    const response = await axios.get(url, {
      headers: {
      ...(correlationId ? { 'x-correlation-id': correlationId } : {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
      timeout: 10_000,
    });

    const parsed = RepositoryIssueResponseSchema.parse(response.data);
    if (parsed.repositoryId !== repositoryId) {
      throw new Error('Repository Service returned a mismatched repository ID');
    }

    return parsed.issues.map((issue) => ({
      ...issue,
      updatedAt: new Date(issue.updatedAt),
      labels: Object.freeze([...new Set(issue.labels.map((label) => label.trim()))]),
    }));
  }
}




