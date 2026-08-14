import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Consumer, Kafka } from 'kafkajs';
import { CORRELATION_ID_KAFKA_HEADER, EventEnvelope } from '@osc/contracts';
import { CorrelationService } from '@osc/observability';
import { KAFKA_CLIENT, KAFKA_MODULE_OPTIONS, KafkaModuleOptions } from './kafka.constants';

export type EventHandler<TPayload> = (envelope: EventEnvelope<TPayload>) => Promise<void> | void;
export type RawEventHandler<TEvent> = (event: TEvent) => Promise<void> | void;
export type RawEventParser<TEvent> = (value: unknown) => TEvent;

export interface ConsumeOptions {
  /** Topics to subscribe to. */
  topics: string[];
  /** Consumer group id; defaults to KAFKA_CONSUMER_GROUP. */
  groupId?: string;
  /** Read from the beginning of the topic on first run. */
  fromBeginning?: boolean;
  /** Maximum attempts for raw-event handler failures. */
  maxAttempts?: number;
  /** Delay between raw-event retries. */
  retryDelayMs?: number;
}

@Injectable()
export class KafkaConsumerService implements OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private readonly consumers: Consumer[] = [];

  constructor(
    @Inject(KAFKA_CLIENT) private readonly kafka: Kafka,
    @Inject(KAFKA_MODULE_OPTIONS) private readonly options: KafkaModuleOptions,
    private readonly correlation: CorrelationService,
  ) {}

  async consume<TPayload>(
    consumeOptions: ConsumeOptions,
    handler: EventHandler<TPayload>,
  ): Promise<Consumer> {
    const groupId = consumeOptions.groupId ?? this.options.consumerGroup;
    if (!groupId) {
      throw new Error('A Kafka consumer group id is required (set KAFKA_CONSUMER_GROUP or pass groupId)');
    }
    const consumer = this.kafka.consumer({ groupId });
    await consumer.connect();
    await consumer.subscribe({
      topics: consumeOptions.topics,
      fromBeginning: consumeOptions.fromBeginning ?? false,
    });
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const raw = message.value?.toString();
        if (!raw) return;
        let envelope: EventEnvelope<TPayload>;
        try {
          envelope = JSON.parse(raw) as EventEnvelope<TPayload>;
        } catch {
          this.logFailure('malformed-json', topic, partition, undefined, undefined);
          return;
        }
        const correlationId = this.headerValue(message.headers?.[CORRELATION_ID_KAFKA_HEADER]) ?? envelope.correlationId ?? 'unknown';
        await this.correlation.runWith(correlationId, async () => {
          try {
            await handler(envelope);
          } catch (error) {
            this.logger.error(JSON.stringify({ event: 'kafka-handler-failed', topic, partition, correlationId, eventName: envelope.eventName, error: error instanceof Error ? error.message : String(error) }));
            throw error;
          }
        });
      },
    });
    this.consumers.push(consumer);
    this.logger.log(`Consuming [${consumeOptions.topics.join(', ')}] as group "${groupId}"`);
    return consumer;
  }

  async consumeRaw<TEvent>(
    consumeOptions: ConsumeOptions,
    handler: RawEventHandler<TEvent>,
    parser: RawEventParser<TEvent>,
  ): Promise<Consumer> {
    const groupId = consumeOptions.groupId ?? this.options.consumerGroup;
    if (!groupId) {
      throw new Error('A Kafka consumer group id is required (set KAFKA_CONSUMER_GROUP or pass groupId)');
    }
    const consumer = this.kafka.consumer({ groupId });
    await consumer.connect();
    await consumer.subscribe({
      topics: consumeOptions.topics,
      fromBeginning: consumeOptions.fromBeginning ?? false,
    });
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const raw = message.value?.toString();
        if (!raw) return;
        let parsed: TEvent;
        try {
          parsed = parser(JSON.parse(raw));
        } catch (error) {
          this.logFailure('malformed-event', topic, partition, undefined, error);
          return;
        }
        const correlationId = this.headerValue(message.headers?.[CORRELATION_ID_KAFKA_HEADER]) ?? this.readCorrelationId(parsed);
        const maxAttempts = Math.max(1, Math.min(10, consumeOptions.maxAttempts ?? 3));
        const retryDelayMs = Math.max(0, Math.min(60_000, consumeOptions.retryDelayMs ?? 100));
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          try {
            await this.correlation.runWith(correlationId, () => handler(parsed));
            return;
          } catch (error) {
            if (attempt < maxAttempts) {
              this.logger.warn(JSON.stringify({ event: 'kafka-handler-retry', topic, partition, correlationId, attempt, maxAttempts, error: error instanceof Error ? error.message : String(error) }));
              await this.delay(retryDelayMs * 2 ** (attempt - 1));
              continue;
            }
            this.logFailure('poison-message-skipped', topic, partition, correlationId, error);
          }
        }
      },
    });
    this.consumers.push(consumer);
    this.logger.log(`Consuming raw events [${consumeOptions.topics.join(', ')}] as group "${groupId}"`);
    return consumer;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.consumers.map((consumer) => consumer.disconnect().catch(() => undefined)));
  }

  private headerValue(value: string | Buffer | Array<string | Buffer> | undefined): string | undefined {
    if (Array.isArray(value)) return value[0]?.toString();
    return value?.toString();
  }

  private readCorrelationId(value: unknown): string {
    if (typeof value === 'object' && value !== null && 'correlationId' in value && typeof value.correlationId === 'string') {
      return value.correlationId;
    }
    return 'unknown';
  }

  private async delay(milliseconds: number): Promise<void> {
    if (milliseconds === 0) return;
    await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
  }

  private logFailure(reason: string, topic: string, partition: number, correlationId: string | undefined, error: unknown): void {
    this.logger.warn(JSON.stringify({ event: 'kafka-message-skipped', reason, topic, partition, correlationId, error: error instanceof Error ? error.message : error ? String(error) : undefined }));
  }
}
