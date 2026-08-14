/**
 * `@osc/kafka` — event backbone: a shared kafkajs client with a producer that
 * publishes versioned, correlated event envelopes and a consumer that restores
 * the correlation context before dispatching to handlers.
 */
export * from './lib/kafka.constants';
export * from './lib/kafka.config';
export * from './lib/kafka.producer';
export * from './lib/kafka.consumer';
export * from './lib/kafka.module';
