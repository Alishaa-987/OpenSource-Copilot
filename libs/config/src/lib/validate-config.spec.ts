import { z } from 'zod';
import {
  baseEnvSchema,
  booleanFromString,
  databaseEnvSchema,
  kafkaEnvSchema,
  portSchema,
  redisEnvSchema,
  serviceNameSchema,
} from './schemas';
import { ConfigValidationError, validateConfig } from './validate-config';

/** A representative service schema composed from the shared building blocks. */
const serviceSchema = baseEnvSchema
  .extend({
    SERVICE_NAME: serviceNameSchema('repository-service'),
    PORT: portSchema(3002),
  })
  .merge(databaseEnvSchema)
  .merge(redisEnvSchema)
  .merge(kafkaEnvSchema);

const validEnv = {
  NODE_ENV: 'test',
  SERVICE_NAME: 'repository-service',
  PORT: '3002',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/osc',
  REDIS_URL: 'redis://localhost:6379',
  KAFKA_BROKERS: 'localhost:9092, localhost:9093',
  KAFKA_CLIENT_ID: 'repository-service',
};

describe('validateConfig', () => {
  it('parses a valid environment, applying defaults and coercions', () => {
    const cfg = validateConfig(serviceSchema, validEnv);

    expect(cfg.NODE_ENV).toBe('test');
    expect(cfg.LOG_LEVEL).toBe('info'); // default applied
    expect(cfg.PORT).toBe(3002); // coerced string -> number
    expect(typeof cfg.PORT).toBe('number');
    expect(cfg.KAFKA_BROKERS).toEqual(['localhost:9092', 'localhost:9093']); // split + trimmed
    expect(cfg.KAFKA_SSL).toBe(false); // default applied
  });

  it('applies per-service defaults when optional vars are omitted', () => {
    const cfg = validateConfig(serviceSchema, {
      DATABASE_URL: 'postgres://u:p@localhost:5432/db',
      REDIS_URL: 'redis://localhost:6379',
      KAFKA_BROKERS: 'localhost:9092',
      KAFKA_CLIENT_ID: 'x',
    });
    expect(cfg.NODE_ENV).toBe('development');
    expect(cfg.SERVICE_NAME).toBe('repository-service');
    expect(cfg.PORT).toBe(3002);
  });

  it('throws ConfigValidationError listing every missing required var', () => {
    let error: ConfigValidationError | undefined;
    try {
      validateConfig(serviceSchema, { NODE_ENV: 'test' });
    } catch (e) {
      error = e as ConfigValidationError;
    }
    expect(error).toBeInstanceOf(ConfigValidationError);
    const joined = error!.issues.join('\n');
    expect(joined).toContain('DATABASE_URL');
    expect(joined).toContain('REDIS_URL');
    expect(joined).toContain('KAFKA_BROKERS');
    expect(joined).toContain('KAFKA_CLIENT_ID');
  });

  it('rejects a non-postgres DATABASE_URL', () => {
    expect(() =>
      validateConfig(serviceSchema, { ...validEnv, DATABASE_URL: 'mysql://localhost/db' }),
    ).toThrow(/DATABASE_URL must be a postgres/);
  });

  it('rejects an out-of-range PORT', () => {
    expect(() => validateConfig(serviceSchema, { ...validEnv, PORT: '70000' })).toThrow(
      ConfigValidationError,
    );
  });

  it('NEVER includes the offending secret value in the error message', () => {
    const secret = 'postgres://admin:SUPERSECRETpw@db.internal:5432/prod';
    let message = '';
    try {
      // invalid because it is not a valid postgres URL prefix we accept... it IS postgres,
      // so instead make it invalid another way while carrying a secret-looking value:
      validateConfig(serviceSchema, { ...validEnv, DATABASE_URL: `mysql://admin:${'SUPERSECRETpw'}@db/prod` });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain('DATABASE_URL');
    expect(message).not.toContain('SUPERSECRETpw');
    // and the original postgres secret is obviously never referenced
    expect(message).not.toContain(secret);
  });
});

describe('booleanFromString', () => {
  const schema = z.object({ FLAG: booleanFromString.default(false) });

  it.each([
    ['true', true],
    ['1', true],
    ['yes', true],
    ['on', true],
    ['false', false],
    ['0', false],
    ['no', false],
    ['off', false],
    ['', false],
  ] as const)('parses "%s" -> %s', (input, expected) => {
    expect(schema.parse({ FLAG: input }).FLAG).toBe(expected);
  });

  it('defaults to false when absent', () => {
    expect(schema.parse({}).FLAG).toBe(false);
  });

  it('rejects a non-boolean string', () => {
    expect(() => schema.parse({ FLAG: 'maybe' })).toThrow();
  });
});
