import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '@osc/database';
import { GitHubSessionService } from './github/github.session.service';

@Controller('v1/internal/repositories')
export class RepositoryIssuesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: GitHubSessionService,
  ) {}

  @Get(':repositoryId/issues')
  async listOpenIssues(
    @Req() request: Request,
    @Param('repositoryId', new ParseUUIDPipe()) repositoryId: string,
  ) {
    const session = await this.sessions.requireSession(request);
    const issues = await this.prisma.issue.findMany({
      where: {
        repositoryId,
        state: 'open',
        repository: {
          accessEntries: { some: { userId: session.userId } },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { number: 'asc' }, { id: 'asc' }],
      take: 1000,
      include: { labels: true },
    });
    return {
      repositoryId,
      issues: issues.map((issue) => ({
        id: issue.id,
        repositoryId: issue.repositoryId,
        number: issue.number,
        title: issue.title,
        state: issue.state,
        commentsCount: issue.commentsCount,
        updatedAt: issue.updatedAt.toISOString(),
        labels: issue.labels.map((label) => label.name),
        url: issue.url,
      })),
    };
  }
  @Get(':repositoryId/issues/:issueId')
  async getIssue(
    @Req() request: Request,
    @Param('repositoryId', new ParseUUIDPipe()) repositoryId: string,
    @Param('issueId', new ParseUUIDPipe()) issueId: string,
  ) {
    const session = await this.sessions.requireSession(request);
    const issue = await this.prisma.issue.findFirst({
      where: {
        id: issueId,
        repositoryId,
        repository: { accessEntries: { some: { userId: session.userId } } },
      },
      include: { labels: true },
    });
    if (!issue) throw new NotFoundException('Issue not found');
    return { repositoryId, issue: {
      id: issue.id, repositoryId: issue.repositoryId, number: issue.number,
      title: issue.title, body: issue.body, state: issue.state, author: issue.author,
      commentsCount: issue.commentsCount, createdAt: issue.createdAt.toISOString(),
      updatedAt: issue.updatedAt.toISOString(), closedAt: issue.closedAt?.toISOString() ?? null,
      labels: issue.labels.map((label) => ({ name: label.name, color: label.color })),
      url: issue.url,
    } };
  }
}
