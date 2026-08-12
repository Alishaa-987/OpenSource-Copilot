/**
 * `@osc/config` — environment-based configuration.
 *
 * Provides composable zod schemas (base + database/redis/kafka opt-ins), a
 * fail-fast validator that never echoes secret values, and a global Nest module
 * exposing a strongly-typed config service. No fallback secrets, ever.
 */
export * from './lib/schemas';
export * from './lib/validate-config';
export * from './lib/env-loader';
export * from './lib/tokens';
export * from './lib/typed-config.service';
export * from './lib/app-config.module';
