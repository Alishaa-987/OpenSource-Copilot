import { Module } from '@nestjs/common';
import { TypedConfigService } from '@osc/config';
import type { GuidanceEnv } from '../env';
import { KnowledgeAnalysisClient } from './repository-analysis.client';
import { RepositoryAnalysisController } from './repository-analysis.controller';
import { RepositoryAnalysisService } from './repository-analysis.service';

@Module({
  controllers: [RepositoryAnalysisController],
  providers: [
    {
      provide: KnowledgeAnalysisClient,
      inject: [TypedConfigService],
      useFactory: (config: TypedConfigService<GuidanceEnv>) => new KnowledgeAnalysisClient(config),
    },
    RepositoryAnalysisService,
  ],
  exports: [RepositoryAnalysisService],
})
export class RepositoryAnalysisModule {}
