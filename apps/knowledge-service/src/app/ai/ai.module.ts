import { Module } from '@nestjs/common';
import { AiOrchestrationService } from './ai-orchestration.service';
import { AskController } from './ask.controller';
import { HttpLlmProvider } from './http-llm.provider';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [KnowledgeModule],
  controllers: [AskController],
  providers: [AiOrchestrationService, HttpLlmProvider, { provide: 'LLM_PROVIDER', useExisting: HttpLlmProvider }],
  exports: [AiOrchestrationService],
})
export class AiModule {}
