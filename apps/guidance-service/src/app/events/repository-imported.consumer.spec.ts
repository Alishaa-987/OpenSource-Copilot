/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createRepositoryImportedEvent,
  parseRepositoryImportedEvent,
} from '@osc/contracts';
import { RepositoryImportedConsumer } from './repository-imported.consumer';

describe('RepositoryImportedConsumer', () => {
  function makeConsumer() {
    const processed = new Set<string>();
    const processedEvent = {
      create: jest.fn(async ({ data }: any) => {
        if (processed.has(data.eventId)) throw { code: 'P2002' };
        processed.add(data.eventId);
        return data;
      }),
    };
    const importedRepositoryProjection = { upsert: jest.fn(async (args: any) => args) };
    const prisma = {
      processedEvent,
      importedRepositoryProjection,
      $transaction: jest.fn(async (callback: any) => callback({ processedEvent, importedRepositoryProjection })),
    };
    const kafka = { consumeRaw: jest.fn() };
    const config = { get: jest.fn((key: string) => ({
      KAFKA_CONSUMER_GROUP: 'guidance-service',
      KAFKA_CONSUMER_FROM_BEGINNING: false,
      KAFKA_CONSUMER_MAX_ATTEMPTS: 3,
      KAFKA_CONSUMER_RETRY_DELAY_MS: 0,
    } as any)[key]) };
    const consumer = new RepositoryImportedConsumer(kafka as any, prisma as any, config as any);
    return { consumer, prisma, importedRepositoryProjection };
  }

  const event = createRepositoryImportedEvent({
    repositoryId: '11111111-1111-4111-8111-111111111111',
    githubRepositoryId: '123456789',
    correlationId: 'corr-123',
  });

  it('processes a received event into Guidance-owned state', async () => {
    const { consumer, prisma, importedRepositoryProjection } = makeConsumer();
    await consumer.handle(event);
    expect(prisma.processedEvent.create).toHaveBeenCalledTimes(1);
    expect(importedRepositoryProjection.upsert).toHaveBeenCalledTimes(1);
  });

  it('does not duplicate processing for a repeated event ID', async () => {
    const { consumer, prisma, importedRepositoryProjection } = makeConsumer();
    await consumer.handle(event);
    await consumer.handle(event);
    expect(prisma.processedEvent.create).toHaveBeenCalledTimes(2);
    expect(importedRepositoryProjection.upsert).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed events through the strict parser', () => {
    expect(() => parseRepositoryImportedEvent({ ...event, unexpected: true })).toThrow();
  });

  it('allows a temporary transaction failure to be retried without a projection write', async () => {
    const { consumer, prisma, importedRepositoryProjection } = makeConsumer();
    prisma.processedEvent.create.mockImplementationOnce(async () => { throw new Error('temporary database failure'); });
    await expect(consumer.handle(event)).rejects.toThrow('temporary database failure');
    expect(importedRepositoryProjection.upsert).not.toHaveBeenCalled();
    await consumer.handle(event);
    expect(importedRepositoryProjection.upsert).toHaveBeenCalledTimes(1);
  });
});
