import { type KafkaConfig, logLevel, type SASLOptions } from 'kafkajs';

/** SASL auth, when the broker requires it (optional in local dev). */
export interface KafkaSaslOptions {
  mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
  username: string;
  password: string;
}

/** Connection inputs, sourced from validated env (`kafkaEnvSchema` in `@osc/config`). */
export interface KafkaConnectionOptions {
  brokers: string[];
  clientId: string;
  ssl?: boolean;
  sasl?: KafkaSaslOptions;
}

/**
 * Maps our validated connection options onto a kafkajs {@link KafkaConfig}.
 *
 * kafkajs' own logger is silenced (`logLevel.NOTHING`); connection lifecycle is
 * logged through pino by the producer/consumer services so all logs stay
 * structured and correlated. SASL/SSL are only set when provided — no implicit
 * credentials.
 */
export function buildKafkaConfig(options: KafkaConnectionOptions): KafkaConfig {
  const config: KafkaConfig = {
    clientId: options.clientId,
    brokers: options.brokers,
    ssl: options.ssl ?? false,
    logLevel: logLevel.NOTHING,
    retry: { retries: 5 },
  };

  if (options.sasl) {
    config.sasl = {
      mechanism: options.sasl.mechanism,
      username: options.sasl.username,
      password: options.sasl.password,
    } as SASLOptions;
  }

  return config;
}
