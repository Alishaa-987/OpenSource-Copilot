import { Controller, Get, Param, ParseUUIDPipe, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { ContributionWorkflowService } from './contribution-workflow.service';

@Controller('v1/repositories')
export class ContributionWorkflowController {
  constructor(private readonly workflow: ContributionWorkflowService) {}

  @Get(':repositoryId/issues/:issueId/contribution-workflow')
  getWorkflow(@Param('repositoryId', new ParseUUIDPipe()) repositoryId: string, @Param('issueId', new ParseUUIDPipe()) issueId: string, @Req() request: Request) {
    const cookie = request.headers.cookie;
    if (!cookie) throw new UnauthorizedException('Authentication required');
    return this.workflow.getWorkflow(repositoryId, issueId, cookie);
  }
}
