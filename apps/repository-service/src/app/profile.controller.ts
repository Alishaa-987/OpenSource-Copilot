import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import type { Request } from 'express';
import { PrismaService } from '@osc/database';
import { GitHubSessionService } from './github/github.session.service';
import { ProfileService, type IssueProgressStatus } from './profile.service';

export class UpdateIssueProgressDto {
  @IsString()
  @IsIn(['started', 'completed', 'viewed'])
  status!: IssueProgressStatus;
}

@Controller('v1/profile')
export class ProfileController {
  constructor(
    private readonly sessions: GitHubSessionService,
    private readonly profile: ProfileService,
    private readonly prisma: PrismaService,
  ) {}

  /** Everything the contributor profile page needs, counted from the database. */
  @Get('stats')
  async stats(@Req() request: Request) {
    const session = await this.sessions.requireSession(request);
    return this.profile.getStats(session.userId);
  }

  /**
   * Moves an issue between viewed / started / completed. The issue must be one
   * the caller can already see, which is what keeps this from being a way to
   * write progress against arbitrary ids.
   */
  @Post('issues/:issueId/progress')
  async setProgress(
    @Req() request: Request,
    @Param('issueId', new ParseUUIDPipe()) issueId: string,
    @Body() body: UpdateIssueProgressDto,
  ) {
    const session = await this.sessions.requireSession(request);
    const issue = await this.prisma.issue.findFirst({
      where: { id: issueId, repository: { accessEntries: { some: { userId: session.userId } } } },
      select: { id: true, repositoryId: true, number: true, title: true, repository: { select: { fullName: true } } },
    });
    if (!issue) throw new NotFoundException('Issue not found');
    await this.profile.setIssueProgress(session.userId, issue.id, issue.repositoryId, body.status, {
      repositoryFullName: issue.repository.fullName,
      issueNumber: issue.number,
      issueTitle: issue.title,
    });
    return { issueId: issue.id, status: body.status };
  }
}
