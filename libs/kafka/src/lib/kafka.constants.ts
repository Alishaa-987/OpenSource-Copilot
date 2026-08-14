/** DI token for the shared kafkajs `Kafka` client instance. */
export const KAFKA_CLIENT = Symbol('KAFKA_CLIENT');

/** DI token for resolved module options (producer identity, consumer group). */
export const KAFKA_MODULE_OPTIONS = Symbol('KAFKA_MODULE_OPTIONS');

/** Runtime options for the Kafka producer/consumer services. */
export interface KafkaModuleOptions {
  /** Logical name of the producing service, stamped on every event envelope. */
  producerName: string;
  /** Default consumer group id (from `KAFKA_CONSUMER_GROUP`); may be undefined. */
  consumerGroup?: string;
}
