import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { Redis } from 'ioredis';
import { TypedConfigService } from '@osc/config';
import { REDIS_CLIENT, REDIS_OPTIONS, RedisModuleOptions } from './redis.constants';
import { RedisService } from './redis.service';

/**
 * Provides a single, shared ioredis client wired from `REDIS_URL`.
 *
 * `REDIS_URL` is validated at startup by `redisEnvSchema` (`@osc/config`), so by
 * the time this factory runs the value is guaranteed present and well-formed —
 * no fallback/default connection string is ever used.
 */
@Global()
@Module({})
export class RedisModule {
  static forRoot(): DynamicModule {
    const optionsProvider: Provider = {
      provide: REDIS_OPTIONS,
      useFactory: (config: TypedConfigService): RedisModuleOptions => ({
        url: config.get('REDIS_URL') as string,
      }),
      inject: [TypedConfigService],
    };

    const clientProvider: Provider = {
      provide: REDIS_CLIENT,
      useFactory: (options: RedisModuleOptions): Redis =>
        new Redis(options.url, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          // Bounded exponential-ish backoff so a down Redis doesn't spin hot.
          retryStrategy: (times: number) => Math.min(times * 200, 2_000),
        }),
      inject: [REDIS_OPTIONS],
    };

    return {
      module: RedisModule,
      providers: [optionsProvider, clientProvider, RedisService],
      exports: [RedisService, REDIS_CLIENT],
    };
  }
}
