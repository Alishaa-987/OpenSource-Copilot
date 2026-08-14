import { Kafka, logLevel } from 'kafkajs';
import { CORRELATION_ID_KAFKA_HEADER, EventEnvelope } from '@osc/contracts';
import { CorrelationService } from '@osc/observability';
import { buildKafkaConfig } from './kafka.config';
import { KafkaProducerService } from './kafka.producer';
import { KafkaConsumerService } from './kafka.consumer';

describe('buildKafkaConfig', () => {
  it('maps connection options and silences the kafkajs logger', () => {
    const cfg = buildKafkaConfig({ brokers: ['localhost:9092'], clientId: 'svc' });
    expect(cfg.brokers).toEqual(['localhost:9092']);
    expect(cfg.clientId).toBe('svc');
    expect(cfg.ssl).toBe(false);
    expect(cfg.logLevel).toBe(logLevel.NOTHING);
    expect(cfg.sasl).toBeUndefined();
  });

  it('includes SASL only when fully provided', () => {
    const cfg = buildKafkaConfig({
      brokers: ['b'],
      clientId: 'c',
      ssl: true,
      sasl: { mechanism: 'plain', username: 'u', password: 'p' },
    });
    expect(cfg.ssl).toBe(true);
    expect(cfg.sasl).toMatchObject({ mechanism: 'plain', username: 'u' });
  });
});

// --- Fakes (typed, no `any`) -------------------------------------------------

interface SentRecord {
  topic: string;
  messages: Array<{ key?: string; value: string; headers: Record<string, string> }>;
}

class FakeProducer {
  readonly events = { CONNECT: 'producer.connect', DISCONNECT: 'producer.disconnect' } as const;
  readonly sent: SentRecord[] = [];
  on(): void {
    /* no-op */
  }
  async connect(): Promise<void> {
    /* no-op */
  }
  async disconnect(): Promise<void> {
    /* no-op */
  }
  async send(record: SentRecord): Promise<void> {
    this.sent.push(record);
  }
}

interface EachMessagePayloadLike {
  topic: string;
  partition: number;
  message: { value: Buffer | null; headers?: Record<string, Buffer | string | undefined> };
}

class FakeConsumer {
  runConfig?: { eachMessage: (payload: EachMessagePayloadLike) => Promise<void> };
  async connect(): Promise<void> {
    /* no-op */
  }
  async subscribe(): Promise<void> {
    /* no-op */
  }
  async run(config: { eachMessage: (payload: EachMessagePayloadLike) => Promise<void> }): Promise<void> {
    this.runConfig = config;
  }
  async disconnect(): Promise<void> {
    /* no-op */
  }
}

describe('KafkaProducerService.publish', () => {
  it('builds a versioned envelope, derives the topic, and propagates correlation', async () => {
    const producer = new FakeProducer();
    const kafka = { producer: () => producer } as unknown as Kafka;
    const service = new KafkaProducerService(kafka, { producerName: 'repo-svc' });

    const envelope = await service.publish<{ repoId: string }>({
      eventName: 'repository.imported',
      eventVersion: 2,
      payload: { repoId: 'r1' },
      key: 'r1',
      correlationId: 'cid-abc',
    });

    expect(producer.sent).toHaveLength(1);
    const record = producer.sent[0];
    expect(record.topic).toBe('repository');

    const message = record.messages[0];
    expect(message.headers[CORRELATION_ID_KAFKA_HEADER]).toBe('cid-abc');
    expect(message.headers['eventName']).toBe('repository.imported');
    expect(message.headers['eventVersion']).toBe('2');

    const parsed = JSON.parse(message.value) as EventEnvelope<{ repoId: string }>;
    expect(parsed.eventName).toBe('repository.imported');
    expect(parsed.eventVersion).toBe(2);
    expect(parsed.correlationId).toBe('cid-abc');
    expect(parsed.producer).toBe('repo-svc');
    expect(parsed.payload).toEqual({ repoId: 'r1' });
    expect(envelope.eventId).toEqual(expect.any(String));
  });

  it('rejects an invalid event name (delegates to @osc/contracts validation)', async () => {
    const producer = new FakeProducer();
    const kafka = { producer: () => producer } as unknown as Kafka;
    const service = new KafkaProducerService(kafka, { producerName: 'svc' });

    await expect(
      service.publish({ eventName: 'NotValid', eventVersion: 1, payload: {}, correlationId: 'c' }),
    ).rejects.toBeInstanceOf(Error);
    expect(producer.sent).toHaveLength(0);
  });
});

describe('KafkaConsumerService.consume', () => {
  it('restores the correlation context from the message header before dispatch', async () => {
    const correlation = new CorrelationService();
    const consumer = new FakeConsumer();
    const kafka = { consumer: () => consumer } as unknown as Kafka;
    const service = new KafkaConsumerService(
      kafka,
      { producerName: 'x', consumerGroup: 'group-1' },
      correlation,
    );

    let seenCorrelationId: string | undefined;
    let seenEventName: string | undefined;
    await service.consume<{ repoId: string }>({ topics: ['repository'] }, (env) => {
      seenCorrelationId = correlation.getCorrelationId();
      seenEventName = env.eventName;
    });

    const envelope: EventEnvelope<{ repoId: string }> = {
      eventId: 'e1',
      eventName: 'repository.imported',
      eventVersion: 1,
      correlationId: 'cid-77',
      occurredAt: new Date().toISOString(),
      producer: 'p',
      payload: { repoId: 'r1' },
    };

    expect(consumer.runConfig).toBeDefined();
    await consumer.runConfig?.eachMessage({
      topic: 'repository',
      partition: 0,
      message: {
        value: Buffer.from(JSON.stringify(envelope)),
        headers: { [CORRELATION_ID_KAFKA_HEADER]: Buffer.from('cid-77') },
      },
    });

    expect(seenEventName).toBe('repository.imported');
    expect(seenCorrelationId).toBe('cid-77');
  });

  it('throws when no consumer group is configured or provided', async () => {
    const correlation = new CorrelationService();
    const consumer = new FakeConsumer();
    const kafka = { consumer: () => consumer } as unknown as Kafka;
    const service = new KafkaConsumerService(kafka, { producerName: 'x' }, correlation);

    await expect(service.consume({ topics: ['t'] }, () => undefined)).rejects.toBeInstanceOf(Error);
  });
});
