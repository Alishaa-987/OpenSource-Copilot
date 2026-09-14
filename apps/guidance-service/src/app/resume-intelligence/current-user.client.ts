import axios from 'axios';
import { TypedConfigService } from '@osc/config';
import { getCorrelationId } from '@osc/observability';
import { z } from 'zod';
import type { GuidanceEnv } from '../env';

// This service intentionally has no relation to repository-service's
// internal user table (see the schema.prisma OWNERSHIP note). The stable
// GitHub numeric user id - already the identity the frontend and
// repository-service both expose via GET /api/repository/v1/github/me - is
// what we key resume ownership on, following the same "forward the cookie,
// let repository-service enforce the session" pattern already used by
// RepositoryIssueDetailClient.
const currentUserResponseSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
}).passthrough();

export interface CurrentUser {
  readonly githubUserId: string;
  readonly username: string;
}

export class CurrentUserClient {
  constructor(private readonly config: TypedConfigService<GuidanceEnv>) {}

  async getCurrentUser(cookie: string): Promise<CurrentUser> {
    const base = this.config.get('REPOSITORY_SERVICE_BASE_URL').replace(/\/$/, '');
    const url = base + '/api/v1/github/me';
    const correlationId = getCorrelationId();
    const response = await axios.get(url, {
      headers: { cookie, ...(correlationId ? { 'x-correlation-id': correlationId } : {}) },
      timeout: this.config.get('CONTRIBUTOR_INTELLIGENCE_TIMEOUT_MS'),
      maxRedirects: 0,
      maxContentLength: 100_000,
      maxBodyLength: 100_000,
    });
    const parsed = currentUserResponseSchema.parse(response.data);
    return { githubUserId: parsed.id, username: parsed.username };
  }
}
