import { Module } from '@nestjs/common';
import { AppConfigModule } from '@osc/config';
import { KafkaModule } from '@osc/kafka';
import { ObservabilityModule } from '@osc/observability';
import { HealthModule, RedisModule } from '@osc/shared';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { gatewayEnvSchema } from './env';
import { HealthController } from './health.controller';

@Module({
  imports: [
    AppConfigModule.forRoot({ schema: gatewayEnvSchema }),
    ObservabilityModule.forRoot({
      serviceName: 'gateway',
      level: process.env['LOG_LEVEL'] ?? 'info',
      pretty: process.env['NODE_ENV'] !== 'production',
    }),
    RedisModule.forRoot(),
    KafkaModule.forRoot({ producerName: 'gateway' }),
    HealthModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}

