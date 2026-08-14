/** DI token for the configured ioredis client instance. */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/** DI token for the resolved Redis connection options. */
export const REDIS_OPTIONS = Symbol('REDIS_OPTIONS');

/** Options consumed by {@link RedisModule} to build the client. */
export interface RedisModuleOptions {
  /** `redis://` or `rediss://` connection string (from `REDIS_URL`). */
  url: string;
}
