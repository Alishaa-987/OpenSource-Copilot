import axios from 'axios';
import { TypedConfigService } from '@osc/config';
import { getCorrelationId } from '@osc/observability';
import { z } from 'zod';
import type { GuidanceEnv } from '../env';

/**
 * The analysis document knowledge-service returns. Deliberately permissive
 * (`passthrough`) on the inner shape: this service stores and forwards the
 * document, so a new field added upstream must not start failing requests
 * here. Only the identity fields it actually relies on are pinned.
 */
export const repositoryAnalysisSchema = z
  .object({
    repositoryId: z.string().uuid(),
    generatedAt: z.string().min(1),
    method: z.string().min(1),
    summary: z.string(),
  })
  .passthrough();

export type RepositoryAnalysisDocument = z.infer<typeof repositoryAnalysisSchema>;

/**
 * Calls knowledge-service to compute a repository analysis.
 *
 * knowledge-service owns the computation (RAG + LLM) and has no database of
 * its own; guidance-service owns persistence. The caller's cookie is
 * forwarded unchanged, so access control stays where it already lives.
 */
export class KnowledgeAnalysisClient {
  constructor(private readonly config: TypedConfigService<GuidanceEnv>) {}

  async analyze(repositoryId: string, cookie: string): Promise<RepositoryAnalysisDocument> {
    const base = this.config.get('KNOWLEDGE_SERVICE_BASE_URL').replace(/\/$/, '');
    const url = base + '/api/v1/repositories/' + encodeURIComponent(repositoryId) + '/analyze';
    const correlationId = getCorrelationId();
    const response = await axios.post(url, {}, {
      headers: { cookie, ...(correlationId ? { 'x-correlation-id': correlationId } : {}), 'content-type': 'application/json' },
      timeout: this.config.get('CONTRIBUTOR_INTELLIGENCE_TIMEOUT_MS'),
      maxRedirects: 0,
      maxContentLength: 2_000_000,
      maxBodyLength: 100_000,
    });
    const parsed = repositoryAnalysisSchema.parse(response.data);
    if (parsed.repositoryId !== repositoryId) {
      throw new Error('Knowledge Service returned mismatched repository identity');
    }
    return parsed;
  }
}
