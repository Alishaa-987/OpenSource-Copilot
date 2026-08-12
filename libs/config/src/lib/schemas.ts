import { z } from 'zod';

/**
 * Boolean parsed from the common string encodings found in env vars.
 *
 * NOTE: we do NOT use `z.coerce.boolean()` — that treats every non-empty string
 * (including `"false"`) as `true`, a classic config footgun.
 */
export const booleanFromString = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(s)) return true;
    if (['false', '0', 'no', 'off', ''].includes(s)) return false;
  }
  return value; // anything else falls through so zod reports an invalid boolean
}, z.boolean());

/** Log levels understood by pino (see `@osc/observability`). */
export const logLevelSchema = z
  .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
  .default('info');

export const nodeEnvSchema = z.enum(['development', 'test', 'production']).default('development');

/** A TCP port, coerced from string, with a per-service default. */
export function portSchema(defaultPort: number) {
  return z.coerce.number().int().min(1).max(65535).default(defaultPort);
}

/** SERVICE_NAME with a per-service default; used in logs and as the event `producer`. */
export function serviceNameSchema(defaultName: string) {
  return z.string().min(1).default(defaultName);
}

/** Fields common to every service. */
export const baseEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  LOG_LEVEL: logLevelSchema,
});

/** Opt-in: services that own or read a Postgres database via Prisma. */
export const databaseEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .refine(
      (u) => u.startsWith('postgres://') || u.startsWith('postgresql://'),
      'DATABASE_URL must be a postgres:// or postgresql:// connection string',
    ),
});

/** Opt-in: services that use Redis for caching / ephemeral state (never a primary store). */
export const redisEnvSchema = z.object({
  REDIS_URL: z
    .string()
    .min(1)
    .refine(
      (u) => u.startsWith('redis://') || u.startsWith('rediss://'),
      'REDIS_URL must be a redis:// or rediss:// connection string',
    ),
});

/** Opt-in: services that produce or consume Kafka events. */
export const kafkaEnvSchema = z.object({
  /** Comma-separated broker list, parsed into a non-empty string[]. */
  KAFKA_BROKERS: z
    .string()
    .min(1)
    .transform((s) =>
      s
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().min(1)).min(1)),
  KAFKA_CLIENT_ID: z.string().min(1),
  KAFKA_SSL: booleanFromString.default(false),
  KAFKA_SASL_MECHANISM: z.enum(['plain', 'scram-sha-256', 'scram-sha-512']).optional(),
  KAFKA_SASL_USERNAME: z.string().min(1).optional(),
  KAFKA_SASL_PASSWORD: z.string().min(1).optional(),
  /** Consumer group id; required only for services that consume. */
  KAFKA_CONSUMER_GROUP: z.string().min(1).optional(),
});
