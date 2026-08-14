import { Module } from '@nestjs/common';
import { AppConfigModule } from '@osc/config';
import { KafkaModule } from '@osc/kafka';
import { ObservabilityModule } from '@osc/observability';
import { HealthModule, RedisModule } from '@osc/shared';
import { GuidanceDatabaseModule } from './database/guidance-database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { guidanceEnvSchema } from './env';
import { HealthController } from './health.controller';
import { RepositoryImportedConsumer } from './events/repository-imported.consumer';

@Module({
  imports: [
    AppConfigModule.forRoot({ schema: guidanceEnvSchema }),
    ObservabilityModule.forRoot({
      serviceName: 'guidance-service',
      level: process.env['LOG_LEVEL'] ?? 'info',
      pretty: process.env['NODE_ENV'] !== 'production',
    }),
    RedisModule.forRoot(),
    KafkaModule.forRoot({ producerName: 'guidance-service' }),
    HealthModule,
    GuidanceDatabaseModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, RepositoryImportedConsumer],
})
export class AppModule {}




