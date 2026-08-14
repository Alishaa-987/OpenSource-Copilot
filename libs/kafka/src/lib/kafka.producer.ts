import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Kafka, Producer } from 'kafkajs';
import {
  CORRELATION_ID_KAFKA_HEADER,
  createEventEnvelope,
  EventEnvelope,
  topicForEventName,
} from '@osc/contracts';
import { getCorrelationId } from '@osc/observability';
import { KAFKA_CLIENT, KAFKA_MODULE_OPTIONS, KafkaModuleOptions } from './kafka.constants';

/** Inputs for publishing a domain event using the existing envelope contract. */
export interface PublishInput<TPayload> {
  eventName: string;
  eventVersion: number;
  payload: TPayload;
  key?: string;
  correlationId?: string;
}

/** Inputs for publishing an exact versioned wire event. */
export interface PublishRawInput<TEvent extends { eventType: string; version: number; correlationId: string }> {
  topic: string;
  eventType: TEvent['eventType'];
  version: TEvent['version'];
  event: TEvent;
  key?: string;
}

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly producer: Producer;
  private connected = false;

  constructor(
    @Inject(KAFKA_CLIENT) private readonly kafka: Kafka,
    @Inject(KAFKA_MODULE_OPTIONS) private readonly options: KafkaModuleOptions,
  ) {
    this.producer = this.kafka.producer();
    this.producer.on(this.producer.events.CONNECT, () => {
      this.connected = true;
    });
    this.producer.on(this.producer.events.DISCONNECT, () => {
      this.connected = false;
    });
  }

  async onModuleInit(): Promise<void> {
    await this.producer.connect();
    this.logger.log('Kafka producer connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect().catch(() => undefined);
  }

  /** Liveness signal for the health check (producer connected to a broker). */
  isHealthy(): boolean {
    return this.connected;
  }

  async publish<TPayload>(input: PublishInput<TPayload>): Promise<EventEnvelope<TPayload>> {
    const correlationId = input.correlationId ?? getCorrelationId() ?? randomUUID();
    const envelope = createEventEnvelope<TPayload>({
      eventName: input.eventName,
      eventVersion: input.eventVersion,
      correlationId,
      producer: this.options.producerName,
      payload: input.payload,
    });
    const topic = topicForEventName(input.eventName);
    await this.producer.send({
      topic,
      messages: [{
        key: input.key,
        value: JSON.stringify(envelope),
        headers: {
          [CORRELATION_ID_KAFKA_HEADER]: correlationId,
          eventName: envelope.eventName,
          eventVersion: String(envelope.eventVersion),
        },
      }],
    });
    return envelope;
  }

  /** Publishes the exact event object without adding credentials or content. */
  async publishRaw<TEvent extends { eventType: string; version: number; correlationId: string }>(
    input: PublishRawInput<TEvent>,
  ): Promise<TEvent> {
    await this.producer.send({
      topic: input.topic,
      messages: [{
        key: input.key,
        value: JSON.stringify(input.event),
        headers: {
          [CORRELATION_ID_KAFKA_HEADER]: input.event.correlationId,
          eventType: input.eventType,
          version: String(input.version),
        },
      }],
    });
    return input.event;
  }
}
