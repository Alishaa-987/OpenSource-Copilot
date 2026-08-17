import { Module } from '@nestjs/common';
import { TypedConfigService } from '@osc/config';
import type { GuidanceEnv } from '../env';
import { ContributorIntelligenceController } from './contributor-intelligence.controller';
import { ContributorIntelligenceService } from './contributor-intelligence.service';
import { KnowledgeRetrievalClient, RepositoryIssueDetailClient } from './contributor-intelligence.clients';
import { ContributionWorkflowController } from './contribution-workflow.controller';
import { ContributionWorkflowService } from './contribution-workflow.service';
import { SimilarContextController } from './similar-context.controller';
import { SimilarContextService } from './similar-context.service';
import { RepositorySimilarIssuesClient } from './similar-issues.client';

@Module({
  controllers: [ContributorIntelligenceController, ContributionWorkflowController, SimilarContextController],
  providers: [
    { provide: RepositoryIssueDetailClient, inject: [TypedConfigService], useFactory: (config: TypedConfigService<GuidanceEnv>) => new RepositoryIssueDetailClient(config) },
    { provide: KnowledgeRetrievalClient, inject: [TypedConfigService], useFactory: (config: TypedConfigService<GuidanceEnv>) => new KnowledgeRetrievalClient(config) },
    { provide: RepositorySimilarIssuesClient, inject: [TypedConfigService], useFactory: (config: TypedConfigService<GuidanceEnv>) => new RepositorySimilarIssuesClient(config) },
    ContributorIntelligenceService,
    ContributionWorkflowService,
    SimilarContextService,
  ],
})
export class ContributorIntelligenceModule {}
