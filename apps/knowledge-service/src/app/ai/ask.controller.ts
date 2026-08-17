import { Body, Controller, Param, ParseUUIDPipe, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AiOrchestrationService } from './ai-orchestration.service';
import { AskQuestionDto } from './ask.dto';

@Controller('v1/repositories')
export class AskController {
  constructor(private readonly ai: AiOrchestrationService) {}
  @Post(':repositoryId/ask')
  ask(@Param('repositoryId', new ParseUUIDPipe()) repositoryId: string, @Body() body: AskQuestionDto, @Req() request: Request) {
    const cookie = request.headers.cookie;
    if (!cookie) throw new UnauthorizedException('Authentication required');
    return this.ai.ask(repositoryId, body.question, cookie);
  }
}
