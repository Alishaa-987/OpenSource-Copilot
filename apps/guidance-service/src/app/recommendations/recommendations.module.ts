import { Module } from '@nestjs/common';
import { TypedConfigService } from '@osc/config';
import { GuidanceEnv } from '../env';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationService } from './recommendation.service';
import { RepositoryIssuesClient } from './repository-issues.client';
import { DefaultIssueScoringStrategy, ISSUE_SCORING_STRATEGY } from './scoring/issue-scoring.strategy';

@Module({
  controllers: [RecommendationsController],
  providers: [
    RepositoryIssuesClient,
    RecommendationService,
    {
      provide: ISSUE_SCORING_STRATEGY,
      inject: [TypedConfigService],
      useFactory: (config: TypedConfigService<GuidanceEnv>) => new DefaultIssueScoringStrategy({
        recentActivityDays: config.get('RECOMMENDATION_RECENT_ACTIVITY_DAYS'),
        lowDiscussionCommentsMax: config.get('RECOMMENDATION_LOW_DISCUSSION_MAX'),
        highDiscussionCommentsMin: config.get('RECOMMENDATION_HIGH_DISCUSSION_MIN'),
      }),
    },
  ],
  exports: [RecommendationService],
})
export class RecommendationsModule {}
