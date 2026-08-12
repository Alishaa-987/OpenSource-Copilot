/**
 * `@osc/observability` — structured logging (pino) and request correlation.
 *
 * Re-exports nestjs-pino's `Logger`/`PinoLogger` so services can set the app
 * logger and inject a logger without a direct nestjs-pino import.
 */
export { Logger, PinoLogger, InjectPinoLogger } from 'nestjs-pino';
export * from './lib/correlation.storage';
export * from './lib/correlation.service';
export * from './lib/correlation.middleware';
export * from './lib/logger.options';
export * from './lib/observability.module';
