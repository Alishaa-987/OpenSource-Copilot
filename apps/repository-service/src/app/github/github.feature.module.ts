import { Module } from '@nestjs/common';
import { GitHubModule } from '@osc/github';
import { GitHubController } from './github.controller';
import { GitHubRepositoryService } from './github.repository.service';
import { GitHubSessionService } from './github.session.service';

@Module({
  imports: [GitHubModule.forRoot()],
  controllers: [GitHubController],
  providers: [GitHubSessionService, GitHubRepositoryService],
  exports: [GitHubSessionService, GitHubRepositoryService],
})
export class GitHubFeatureModule {}
