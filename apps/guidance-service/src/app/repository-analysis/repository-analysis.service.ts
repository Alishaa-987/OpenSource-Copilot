import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Prisma } from '../../../../../libs/guidance-database/generated';
import { GuidancePrismaService } from '../database/guidance-prisma.service';
import { KnowledgeAnalysisClient, type RepositoryAnalysisDocument } from './repository-analysis.client';

/** Format marker: bump when the stored document's shape changes meaningfully. */
const SOURCE_VERSION = 'repo-analysis-v1';

export interface StoredRepositoryAnalysis {
  analysis: RepositoryAnalysisDocument;
  analyzedAt: string;
  fromStore: boolean;
}

/**
 * Persists repository analysis in guidance-service's Postgres.
 *
 * Ownership: knowledge-service computes the analysis (RAG + LLM) and holds no
 * database; guidance-service is already this system's owner of durable,
 * AI-derived analysis (see IssueIntelligence), so the stored document lives
 * here. It is product data rather than a cache - monitoring, notifications,
 * contribution history and progress tracking are all meant to read it later,
 * so it is never given a TTL and never silently evicted.
 */
@Injectable()
export class RepositoryAnalysisService {
  private readonly logger = new Logger(RepositoryAnalysisService.name);

  constructor(
    private readonly prisma: GuidancePrismaService,
    private readonly knowledge: KnowledgeAnalysisClient,
  ) {}

  /** Returns the stored analysis, computing and storing it on first request. */
  async getOrCreate(repositoryId: string, cookie: string): Promise<StoredRepositoryAnalysis> {
    const stored = await this.prisma.repositoryAnalysis.findUnique({ where: { repositoryId } });
    if (stored && stored.sourceVersion === SOURCE_VERSION) {
      return {
        analysis: stored.analysisJson as unknown as RepositoryAnalysisDocument,
        analyzedAt: stored.generatedAt.toISOString(),
        fromStore: true,
      };
    }
    return this.refresh(repositoryId, cookie);
  }

  /** Recomputes the analysis and replaces whatever is stored. */
  async refresh(repositoryId: string, cookie: string): Promise<StoredRepositoryAnalysis> {
    let analysis: RepositoryAnalysisDocument;
    try {
      analysis = await this.knowledge.analyze(repositoryId, cookie);
    } catch (error) {
      // A stored analysis is still useful when the compute path is briefly
      // unavailable, so fall back to it rather than failing the page.
      const stored = await this.prisma.repositoryAnalysis.findUnique({ where: { repositoryId } });
      if (stored) {
        this.logger.warn(`Re-analysis failed for ${repositoryId}, serving the stored analysis: ${this.safeMessage(error)}`);
        return {
          analysis: stored.analysisJson as unknown as RepositoryAnalysisDocument,
          analyzedAt: stored.generatedAt.toISOString(),
          fromStore: true,
        };
      }
      throw new ServiceUnavailableException(`Repository analysis could not be produced: ${this.safeMessage(error)}`);
    }

    const generatedAt = this.parseDate(analysis.generatedAt);
    const row = { analysisJson: this.toJson(analysis), sourceVersion: SOURCE_VERSION, generatedAt };
    const saved = await this.prisma.repositoryAnalysis.upsert({
      where: { repositoryId },
      update: row,
      create: { repositoryId, ...row },
    });
    return {
      analysis,
      analyzedAt: saved.generatedAt.toISOString(),
      fromStore: false,
    };
  }

  /** Whether a repository has a stored analysis, for listings and progress views. */
  async getAnalyzedAt(repositoryId: string): Promise<string | null> {
    const stored = await this.prisma.repositoryAnalysis.findUnique({
      where: { repositoryId },
      select: { generatedAt: true },
    });
    return stored?.generatedAt.toISOString() ?? null;
  }

  private parseDate(value: string): Date {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private safeMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error';
  }
}
