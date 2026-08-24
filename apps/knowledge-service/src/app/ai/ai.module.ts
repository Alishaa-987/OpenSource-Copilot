import { Module } from '@nestjs/common';
import { AiOrchestrationService } from './ai-orchestration.service';
import { AskController } from './ask.controller';
import { GroqLLMProvider } from './groq-llm.provider';
import { RepositoryAnalysisService } from './repository-analysis.service';

import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [KnowledgeModule],
  controllers: [AskController],
  providers: [AiOrchestrationService, RepositoryAnalysisService, GroqLLMProvider, { provide: 'LLM_PROVIDER', useExisting: GroqLLMProvider }],
  exports: [AiOrchestrationService, RepositoryAnalysisService],
})
export class AiModule {}
