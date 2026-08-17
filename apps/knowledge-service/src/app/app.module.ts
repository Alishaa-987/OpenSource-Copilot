import { Module } from '@nestjs/common';
import { AppConfigModule } from '@osc/config';
import { KafkaModule } from '@osc/kafka';
import { ObservabilityModule } from '@osc/observability';
import { HealthModule, RedisModule } from '@osc/shared';
import { AppService } from './app.service';
import { knowledgeEnvSchema } from './env';
import { HealthController } from './health.controller';
import { AiModule } from './ai/ai.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { RepositoryImportedConsumer } from './knowledge/repository-imported.consumer';

@Module({
  imports: [AppConfigModule.forRoot({ schema: knowledgeEnvSchema }), ObservabilityModule.forRoot({ serviceName: 'knowledge-service', level: process.env['LOG_LEVEL'] ?? 'info', pretty: process.env['NODE_ENV'] !== 'production' }), KafkaModule.forRoot({ producerName: 'knowledge-service' }), HealthModule, RedisModule.forRoot(), KnowledgeModule, AiModule],
  controllers: [HealthController],
  providers: [AppService, RepositoryImportedConsumer],
})
export class AppModule {}

