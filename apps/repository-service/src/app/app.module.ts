import { Module } from '@nestjs/common';
import { AppConfigModule } from '@osc/config';
import { PrismaModule } from '@osc/database';
import { GitHubModule } from '@osc/github';
import { KafkaModule } from '@osc/kafka';
import { ObservabilityModule } from '@osc/observability';
import { HealthModule, RedisModule } from '@osc/shared';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { repositoryEnvSchema } from './env';
import { HealthController } from './health.controller';
import { GitHubController } from './github/github.controller';
import { GitHubRepositoryService } from './github/github.repository.service';
import { GitHubSessionService } from './github/github.session.service';

@Module({
  imports: [
    AppConfigModule.forRoot({ schema: repositoryEnvSchema }),
    ObservabilityModule.forRoot({
      serviceName: 'repository-service',
      level: process.env['LOG_LEVEL'] ?? 'info',
      pretty: process.env['NODE_ENV'] !== 'production',
    }),
    PrismaModule,
    RedisModule.forRoot(),
    KafkaModule.forRoot({ producerName: 'repository-service' }),
    GitHubModule.forRoot(),
    HealthModule,
  ],
  controllers: [AppController, HealthController, GitHubController],
  providers: [AppService, GitHubSessionService, GitHubRepositoryService],
})
export class AppModule {}
