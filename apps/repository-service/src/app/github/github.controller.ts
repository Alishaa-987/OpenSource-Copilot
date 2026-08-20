import { Body, Controller, Get, HttpException, HttpStatus, Param, ParseUUIDPipe, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { GitHubRepositoryService } from './github.repository.service';
import {
  GitHubOAuthCallbackQueryDto,
  GitHubOAuthStartQueryDto,
  ImportRepositoryDto,
  ListRepositoriesQueryDto,
  PublicRepositoryImportDto,
} from './github.dto';
import { GitHubSessionService } from './github.session.service';

@Controller('v1/github')
export class GitHubController {
  private readonly publicImportAttempts = new Map<string, number[]>();
  constructor(
    private readonly sessions: GitHubSessionService,
    private readonly repositories: GitHubRepositoryService,
  ) {}

  @Get('auth/start')
  startOAuth(@Query() query: GitHubOAuthStartQueryDto) {
    return this.sessions.startOAuth(query.returnTo);
  }

  @Get('auth/callback')
  async completeOAuth(
    @Query() query: GitHubOAuthCallbackQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.sessions.completeOAuth(query.code, query.state);
    response.cookie(this.sessions.cookieName(), result.session.sessionId, this.sessions.cookieOptions());
    if (result.returnTo) return response.redirect(result.returnTo);
    return { user: result.user, expiresAt: result.expiresAt };
  }

  @Post('auth/logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.sessions.destroySession(request);
    response.clearCookie(this.sessions.cookieName(), this.sessions.cookieOptions());
    return { loggedOut: true };
  }

  @Get('me')
  currentUser(@Req() request: Request) {
    return this.sessions.currentUser(request);
  }

  @Get('repositories')
  listRepositories(@Req() request: Request, @Query() query: ListRepositoriesQueryDto) {
    return this.repositories.listAccessibleRepositories(request, query);
  }

  @Post('repositories/import')
  importRepository(@Req() request: Request, @Body() body: ImportRepositoryDto) {
    return this.repositories.importRepository(request, body);
  }

  @Get('repositories/:repositoryId')
  getRepository(@Req() request: Request, @Param('repositoryId', new ParseUUIDPipe()) repositoryId: string) {
    return this.repositories.getImportedRepository(request, repositoryId);
  }

  @Get('repositories/:repositoryId/issues')
  listRepositoryIssues(@Req() request: Request, @Param('repositoryId', new ParseUUIDPipe()) repositoryId: string) {
    return this.repositories.listRepositoryIssues(request, repositoryId);
  }

  @Get('issues/:issueId')
  getIssue(@Req() request: Request, @Param('issueId', new ParseUUIDPipe()) issueId: string) {
    return this.repositories.getIssue(request, issueId);
  }
  @Post('repositories/import/public')
  importPublicRepository(@Req() request: Request, @Body() body: PublicRepositoryImportDto) {
    this.enforcePublicImportLimit(request);
    return this.repositories.importPublicRepository(request, body);
  }

  private enforcePublicImportLimit(request: Request): void {
    const now = Date.now();
    const windowStart = now - 60_000;
    const key = request.ip || request.socket.remoteAddress || 'unknown';
    const attempts = (this.publicImportAttempts.get(key) ?? []).filter((timestamp) => timestamp > windowStart);
    if (attempts.length >= 10) {
      throw new HttpException('Too many public repository imports', HttpStatus.TOO_MANY_REQUESTS);
    }
    attempts.push(now);
    this.publicImportAttempts.set(key, attempts);
    if (this.publicImportAttempts.size > 10_000) {
      for (const [clientKey, clientAttempts] of this.publicImportAttempts) {
        if (clientAttempts.every((timestamp) => timestamp <= windowStart)) {
          this.publicImportAttempts.delete(clientKey);
        }
      }
    }
  }
}





