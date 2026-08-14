import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { KafkaProducerService } from '@osc/kafka';
import { RedisService, ServiceHealthIndicator } from '@osc/shared';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicator: ServiceHealthIndicator,
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {}

  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([
      () => this.indicator.check('service', async () => true),
    ]);
  }

  @Get()
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.indicator.check('service', async () => true),
      () => this.indicator.check('redis', () => this.redis.ping()),
      () => this.indicator.check('kafka', async () => this.kafka.isHealthy()),
    ]);
  }
}

