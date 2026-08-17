import { Body, Controller, Param, ParseUUIDPipe, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { KnowledgeIngestionService } from './knowledge-ingestion.service';
import { RetrieveKnowledgeDto } from './knowledge.dto';

@Controller('v1/repositories')
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeIngestionService) {}
  @Post(':repositoryId/index')
  async index(@Param('repositoryId', new ParseUUIDPipe()) repositoryId: string, @Req() request: Request) {
    const cookie = request.headers.cookie;
    if (!cookie) throw new UnauthorizedException('Authentication required');
    return this.knowledge.indexRepository(repositoryId, cookie);
  }
  @Post(':repositoryId/retrieve')
  async retrieve(@Param('repositoryId', new ParseUUIDPipe()) repositoryId: string, @Body() body: RetrieveKnowledgeDto, @Req() request: Request) {
    if (!request.headers.cookie) throw new UnauthorizedException('Authentication required');
    const rows = await this.knowledge.retrieve(repositoryId, body.question, body.limit);
    return { repositoryId, chunks: rows };
  }
}
