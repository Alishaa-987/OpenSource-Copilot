import { Controller, Get, Param, ParseUUIDPipe, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { ContributorIntelligenceService } from './contributor-intelligence.service';

@Controller('v1/repositories')
export class ContributorIntelligenceController {
  constructor(private readonly intelligence: ContributorIntelligenceService) {}

  @Get(':repositoryId/issues/:issueId/intelligence')
  getIntelligence(@Param('repositoryId', new ParseUUIDPipe()) repositoryId: string, @Param('issueId', new ParseUUIDPipe()) issueId: string, @Req() request: Request) {
    const cookie = request.headers.cookie;
    if (!cookie) throw new UnauthorizedException('Authentication required');
    return this.intelligence.getIntelligence(repositoryId, issueId, cookie);
  }
}
