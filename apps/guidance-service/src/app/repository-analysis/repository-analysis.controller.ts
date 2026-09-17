import { Controller, Get, Param, ParseUUIDPipe, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { RepositoryAnalysisService } from './repository-analysis.service';

@Controller('v1/repositories')
export class RepositoryAnalysisController {
  constructor(private readonly analysis: RepositoryAnalysisService) {}

  /**
   * Returns the stored analysis, producing it on first request. Repeat visits
   * read from Postgres, so re-opening a repository never re-spends an LLM
   * call or depends on knowledge-service being up.
   */
  @Get(':repositoryId/analysis')
  async get(@Param('repositoryId', new ParseUUIDPipe()) repositoryId: string, @Req() request: Request) {
    const cookie = this.requireCookie(request);
    const result = await this.analysis.getOrCreate(repositoryId, cookie);
    return { ...result.analysis, analyzedAt: result.analyzedAt, fromStore: result.fromStore };
  }

  /** Forces a fresh analysis and replaces the stored one. */
  @Post(':repositoryId/analysis/refresh')
  async refresh(@Param('repositoryId', new ParseUUIDPipe()) repositoryId: string, @Req() request: Request) {
    const cookie = this.requireCookie(request);
    const result = await this.analysis.refresh(repositoryId, cookie);
    return { ...result.analysis, analyzedAt: result.analyzedAt, fromStore: result.fromStore };
  }

  private requireCookie(request: Request): string {
    const cookie = request.headers.cookie;
    if (!cookie) throw new UnauthorizedException('Authentication required');
    return cookie;
  }
}
