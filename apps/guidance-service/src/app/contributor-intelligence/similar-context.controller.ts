import { Controller, Get, Param, ParseUUIDPipe, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { SimilarContextService } from './similar-context.service';

@Controller('v1/repositories')
export class SimilarContextController {
  constructor(private readonly service: SimilarContextService) {}
  @Get(':repositoryId/issues/:issueId/similar-context')
  getSimilarContext(@Param('repositoryId', new ParseUUIDPipe()) repositoryId: string, @Param('issueId', new ParseUUIDPipe()) issueId: string, @Req() request: Request) {
    const cookie = request.headers.cookie;
    if (!cookie) throw new UnauthorizedException('Authentication required');
    return this.service.getSimilarContext(repositoryId, issueId, cookie);
  }
}
