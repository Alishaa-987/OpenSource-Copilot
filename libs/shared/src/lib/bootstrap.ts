import { DynamicModule, INestApplication, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger, correlationMiddleware } from '@osc/observability';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { buildValidationPipe } from './validation';

export interface BootstrapOptions {
  /** Logical service name (used in the startup log line). */
  serviceName: string;
  /** TCP port to listen on (validated from `PORT` at startup). */
  port: number;
  /** Route prefix for all controllers. Defaults to `api`. */
  globalPrefix?: string;
}

/**
 * Creates and starts a Nest HTTP application with the shared runtime posture:
 *  - pino structured logging as the app logger (buffered until wired),
 *  - correlation-id middleware (async-local storage + `x-correlation-id`),
 *  - a global `ValidationPipe` (whitelist + safe error output),
 *  - the global {@link AllExceptionsFilter} (uniform, leak-free error bodies),
 *  - graceful shutdown hooks.
 *
 * Each service's `main.ts` calls this with its own `AppModule`, so the wiring is
 * identical and defined in exactly one place.
 */
export async function bootstrapService(
  appModule: Type<unknown> | DynamicModule,
  options: BootstrapOptions,
): Promise<INestApplication> {
  const app = await NestFactory.create(appModule, { bufferLogs: true });

  // Route Nest's logs through pino, then flush anything buffered during startup.
  app.useLogger(app.get(Logger));

  // Correlation context for every request (applied app-wide, not per-route, to
  // avoid Express path-matching entirely).
  app.use(correlationMiddleware);

  const prefix = options.globalPrefix ?? 'api';
  app.setGlobalPrefix(prefix);

  app.useGlobalPipes(buildValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableShutdownHooks();

  await app.listen(options.port);

  const logger = app.get(Logger);
  logger.log(
    `${options.serviceName} listening on port ${options.port} (prefix "/${prefix}")`,
    'Bootstrap',
  );

  return app;
}
