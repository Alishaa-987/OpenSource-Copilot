import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
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

  @Post('repositories/import/public')
  importPublicRepository(@Body() body: PublicRepositoryImportDto) {
    return this.repositories.importPublicRepository(body);
  }
}
