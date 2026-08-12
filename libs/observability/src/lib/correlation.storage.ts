import { AsyncLocalStorage } from 'node:async_hooks';

/** Per-request context propagated through async calls. */
export interface CorrelationStore {
  correlationId: string;
}

/**
 * Async-local store holding the correlation id for the current request/task.
 * Lets non-HTTP code (e.g. a Kafka producer inside a request) read the id
 * without threading it through every function signature.
 */
export const correlationStorage = new AsyncLocalStorage<CorrelationStore>();

/** Returns the correlation id bound to the current async context, if any. */
export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore()?.correlationId;
}
