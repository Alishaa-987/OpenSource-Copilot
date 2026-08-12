import { DynamicModule, Global, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { CorrelationService } from './correlation.service';
import { buildLoggerParams, LoggerOptions } from './logger.options';

/**
 * Global observability module: structured pino logging (via nestjs-pino) plus a
 * correlation service.
 *
 * The correlation middleware is applied at the app level in the shared
 * bootstrap (`app.use(correlationMiddleware)`), so it is intentionally NOT wired
 * here as route middleware.
 */
@Global()
@Module({})
export class ObservabilityModule {
  static forRoot(options: LoggerOptions): DynamicModule {
    return {
      module: ObservabilityModule,
      imports: [LoggerModule.forRoot(buildLoggerParams(options))],
      providers: [CorrelationService],
      exports: [CorrelationService, LoggerModule],
    };
  }
}
