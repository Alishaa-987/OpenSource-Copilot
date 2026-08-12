/**
 * Metadata carried by every domain event published to Kafka.
 *
 * The envelope is deliberately transport-agnostic: it carries routing and
 * tracing metadata (name, version, correlation id) alongside a typed payload so
 * producers and consumers can evolve independently. Fields are `readonly`
 * because an event, once created, is an immutable historical fact.
 */
export interface EventMetadata {
  /** Globally-unique id for this specific event instance; enables idempotent consumers. */
  readonly eventId: string;
  /**
   * Fully-qualified, past-tense event name in dot notation,
   * e.g. `repository.imported`. Validated by `isValidEventName`.
   */
  readonly eventName: string;
  /**
   * Integer schema version for the payload. Bump on any breaking payload
   * change; consumers use it to pick a compatible deserializer.
   */
  readonly eventVersion: number;
  /** Correlation id propagated from the originating request through all resulting events. */
  readonly correlationId: string;
  /** ISO-8601 timestamp of when the event occurred. */
  readonly occurredAt: string;
  /** Logical name of the producing service, e.g. `repository-service`. */
  readonly producer: string;
}

/**
 * A domain event: metadata envelope plus its typed payload.
 *
 * @typeParam TPayload - shape of the event-specific data.
 */
export interface EventEnvelope<TPayload = unknown> extends EventMetadata {
  readonly payload: TPayload;
}
