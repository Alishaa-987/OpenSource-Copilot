import { Module } from '@nestjs/common';
import { AiOrchestrationService } from './ai-orchestration.service';
import { AskController } from './ask.controller';
import { GroqLLMProvider } from './groq-llm.provider';

import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [KnowledgeModule],
  controllers: [AskController],
  providers: [AiOrchestrationService, GroqLLMProvider, { provide: 'LLM_PROVIDER', useExisting: GroqLLMProvider }],
  exports: [AiOrchestrationService],
})
export class AiModule {}
