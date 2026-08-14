/**
 * `@osc/shared` — cross-cutting HTTP/runtime foundation shared by all services:
 *  - `bootstrapService` (uniform app wiring),
 *  - the global `AllExceptionsFilter` and `buildValidationPipe`,
 *  - Redis client infrastructure (cache/side-store, NOT a primary datastore),
 *  - health primitives (`ServiceHealthIndicator`, `HealthModule`).
 */
export * from './lib/bootstrap';
export * from './lib/all-exceptions.filter';
export * from './lib/validation';
export * from './lib/redis/redis.constants';
export * from './lib/redis/redis.service';
export * from './lib/redis/redis.module';
export * from './lib/health/service-health.indicator';
export * from './lib/health/health.module';
