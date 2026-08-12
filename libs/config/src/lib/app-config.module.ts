import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { z } from 'zod';
import { loadEnvFiles } from './env-loader';
import { APP_CONFIG } from './tokens';
import { TypedConfigService } from './typed-config.service';
import { validateConfig } from './validate-config';

export interface AppConfigModuleOptions<T extends z.ZodTypeAny> {
  /** The zod schema describing this service's environment. */
  schema: T;
  /** Skip `.env` file discovery (tests inject env directly). Default `false`. */
  skipEnvFile?: boolean;
}

/**
 * Global configuration module. Call `forRoot` once in each service's AppModule.
 *
 * Validation runs EAGERLY inside `forRoot` — i.e. while the module metadata is
 * being evaluated, before `NestFactory.create` wires anything — so a
 * misconfigured service fails fast with a clear, aggregated error and never
 * boots in a half-configured state. There are deliberately no fallback secrets:
 * a missing required variable is a hard error.
 */
@Global()
@Module({})
export class AppConfigModule {
  static forRoot<T extends z.ZodTypeAny>(options: AppConfigModuleOptions<T>): DynamicModule {
    if (!options.skipEnvFile) {
      loadEnvFiles();
    }

    // Throws ConfigValidationError here if the environment is invalid.
    const config = validateConfig(options.schema);

    const configValueProvider: Provider = { provide: APP_CONFIG, useValue: config };

    return {
      module: AppConfigModule,
      providers: [configValueProvider, TypedConfigService],
      exports: [APP_CONFIG, TypedConfigService],
    };
  }
}
