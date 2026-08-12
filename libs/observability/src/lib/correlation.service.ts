import { Injectable } from '@nestjs/common';
import { correlationStorage, getCorrelationId } from './correlation.storage';

/**
 * Injectable accessor for the current request's correlation id, plus a helper
 * to establish a correlation context for non-HTTP work (scheduled jobs, Kafka
 * consumers). HTTP requests get their context from `correlationMiddleware`.
 */
@Injectable()
export class CorrelationService {
  /** The correlation id for the active async context, or `undefined` outside one. */
  getCorrelationId(): string | undefined {
    return getCorrelationId();
  }

  /** Runs `fn` within a fresh correlation context. */
  runWith<T>(correlationId: string, fn: () => T): T {
    return correlationStorage.run({ correlationId }, fn);
  }
}
