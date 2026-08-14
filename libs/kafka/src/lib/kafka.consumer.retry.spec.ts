import { KafkaConsumerService } from './kafka.consumer';
import { CorrelationService } from '@osc/observability';
import { CORRELATION_ID_KAFKA_HEADER } from '@osc/contracts';

class FakeConsumer {
  runConfig?: { eachMessage: (payload: any) => Promise<void> };
  async connect(): Promise<void> {}
  async subscribe(): Promise<void> {}
  async run(config: { eachMessage: (payload: any) => Promise<void> }): Promise<void> {
    this.runConfig = config;
  }
  async disconnect(): Promise<void> {}
}

describe('KafkaConsumerService raw event handling', () => {
  function makeConsumer() {
    const consumer = new FakeConsumer();
    const kafka = { consumer: () => consumer } as any;
    const correlation = new CorrelationService();
    const service = new KafkaConsumerService(kafka, { producerName: 'guidance-service', consumerGroup: 'guidance-service' }, correlation);
    return { service, consumer, correlation };
  }

  it('skips malformed events safely', async () => {
    const { service, consumer } = makeConsumer();
    const handler = jest.fn();
    await service.consumeRaw({ topics: ['repository'], maxAttempts: 1, retryDelayMs: 0 }, handler, (value) => {
      if (typeof value !== 'object' || value === null || !('eventId' in value)) throw new Error('invalid');
      return value;
    });
    await consumer.runConfig?.eachMessage({ topic: 'repository', partition: 0, message: { value: Buffer.from('{}'), headers: {} } });
    expect(handler).not.toHaveBeenCalled();
  });

  it('restores correlation and retries temporary failures', async () => {
    const { service, consumer, correlation } = makeConsumer();
    const seen: string[] = [];
    const handler = jest.fn().mockImplementation(async () => {
      seen.push(correlation.getCorrelationId() ?? 'missing');
      if (seen.length < 3) throw new Error('temporary');
    });
    await service.consumeRaw({ topics: ['repository'], maxAttempts: 3, retryDelayMs: 0 }, handler, (value) => value as { correlationId: string });
    await consumer.runConfig?.eachMessage({
      topic: 'repository',
      partition: 1,
      message: { value: Buffer.from(JSON.stringify({ correlationId: 'event-correlation' })), headers: { [CORRELATION_ID_KAFKA_HEADER]: Buffer.from('header-correlation') } },
    });
    expect(handler).toHaveBeenCalledTimes(3);
    expect(seen).toEqual(['header-correlation', 'header-correlation', 'header-correlation']);
  });

  it('skips a poison message after the bounded retry budget', async () => {
    const { service, consumer } = makeConsumer();
    const handler = jest.fn().mockRejectedValue(new Error('permanent'));
    await service.consumeRaw({ topics: ['repository'], maxAttempts: 2, retryDelayMs: 0 }, handler, (value) => value);
    await expect(consumer.runConfig?.eachMessage({ topic: 'repository', partition: 0, message: { value: Buffer.from(JSON.stringify({ correlationId: 'cid' })), headers: {} } })).resolves.toBeUndefined();
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
