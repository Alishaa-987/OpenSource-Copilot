import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

/**
 * Thin wrapper over an ioredis client.
 *
 * Redis is used here as a cache / ephemeral side-store and coordination
 * primitive — it is explicitly **NOT** a primary datastore. Durable state lives
 * in PostgreSQL (see `@osc/database`). Nothing written here is treated as a
 * system of record.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {
    this.client.on('error', (err: Error) => {
      // ioredis throttles reconnects; log the message only (no secrets in it).
      this.logger.warn(`Redis connection error: ${err.message}`);
    });
    this.client.on('ready', () => this.logger.log('Redis connection ready'));
  }

  /** Access the underlying client for feature code (cache, locks, etc.). */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Liveness probe used by the health check. Resolves `true` only on a `PONG`.
   * Bounded by a timeout so a hung connection cannot stall the health endpoint.
   */
  async ping(timeoutMs = 2_000): Promise<boolean> {
    const pong = this.client.ping();
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('redis ping timeout')), timeoutMs).unref(),
    );
    const result = await Promise.race([pong, timeout]);
    return result === 'PONG';
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      // Best-effort during shutdown; force-disconnect if quit fails.
      this.client.disconnect();
    }
  }
}
