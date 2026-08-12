import { randomUUID } from 'node:crypto';
import { EventEnvelope } from './event-envelope';
import { assertEventName } from './event-names';

/** Caller-supplied fields required to build an event envelope. */
export interface CreateEventInput<TPayload> {
  eventName: string;
  eventVersion: number;
  correlationId: string;
  producer: string;
  payload: TPayload;
}

/**
 * Overrides for deterministic construction in tests. Production callers omit
 * these and get a random `eventId` and the current time.
 */
export interface CreateEventOptions {
  eventId?: string;
  occurredAt?: Date;
}

/**
 * Builds an immutable {@link EventEnvelope}, filling in `eventId` and
 * `occurredAt` and validating the name/version. Injecting `options` keeps the
 * factory pure and unit-testable without mocking global time or randomness.
 */
export function createEventEnvelope<TPayload>(
  input: CreateEventInput<TPayload>,
  options: CreateEventOptions = {},
): EventEnvelope<TPayload> {
  assertEventName(input.eventName);

  if (!Number.isInteger(input.eventVersion) || input.eventVersion < 1) {
    throw new Error(
      `eventVersion must be a positive integer, received ${String(input.eventVersion)}`,
    );
  }
  if (!input.correlationId) {
    throw new Error('correlationId is required to create an event envelope');
  }
  if (!input.producer) {
    throw new Error('producer is required to create an event envelope');
  }

  return {
    eventId: options.eventId ?? randomUUID(),
    eventName: input.eventName,
    eventVersion: input.eventVersion,
    correlationId: input.correlationId,
    occurredAt: (options.occurredAt ?? new Date()).toISOString(),
    producer: input.producer,
    payload: input.payload,
  };
}
