import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { KafkaProducerService } from '@osc/kafka';
import { PrismaService } from '@osc/database';
import { RedisService } from '@osc/shared';

const integration = process.env['RUN_INTEGRATION'] === '1' ? describe : describe.skip;

integration('repository service integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env['NODE_ENV'] ??= 'test';
    process.env['LOG_LEVEL'] ??= 'silent';
    process.env['PORT'] ??= '3001';
    process.env['DATABASE_URL'] ??= 'postgresql://opensource_copilot:local-development-placeholder@localhost:5432/opensource_copilot';
    process.env['REDIS_URL'] ??= 'redis://localhost:6379';
    process.env['KAFKA_BROKERS'] ??= 'localhost:9092';
    process.env['KAFKA_CLIENT_ID'] ??= 'opensource-copilot-integration';
    process.env['KAFKA_SSL'] ??= 'false';
    process.env['KAFKA_CONSUMER_GROUP'] ??= 'opensource-copilot-integration';

    const { AppModule } = await import('./app.module');
    app = await NestFactory.create(AppModule, { logger: false });
    await app.init();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  it('starts and reaches every foundation dependency', async () => {
    expect(app).toBeDefined();
    expect(await app.get(PrismaService).ping()).toBe(true);
    expect(await app.get(RedisService).ping()).toBe(true);
    expect(app.get(KafkaProducerService).isHealthy()).toBe(true);
  }, 30_000);
});

