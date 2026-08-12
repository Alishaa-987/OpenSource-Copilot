import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { CORRELATION_ID_HEADER } from '@osc/contracts';
import { correlationStorage } from './correlation.storage';

type NextFn = (err?: unknown) => void;

/** Narrow request/response shapes so we don't depend on @types/express. */
type ReqLike = IncomingMessage & { id?: string; correlationId?: string };
type ResLike = ServerResponse;

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.length > 0 ? v : undefined;
}

/**
 * Establishes the correlation context for a request.
 *
 * Order-independent with pino-http's `genReqId`: whichever runs first, they
 * converge on a single id — the incoming `x-correlation-id` header if present,
 * otherwise an existing `req.id`, otherwise a fresh UUID. The id is echoed on
 * the response and bound into async-local storage for the rest of the request.
 *
 * Registered via `app.use(correlationMiddleware)` in the shared bootstrap (not
 * `forRoutes`), which sidesteps Express path-matching entirely.
 */
export function correlationMiddleware(req: ReqLike, res: ResLike, next: NextFn): void {
  const fromHeader = firstHeaderValue(req.headers[CORRELATION_ID_HEADER]);
  const correlationId = fromHeader ?? req.id ?? randomUUID();

  req.correlationId = correlationId;
  if (!res.getHeader(CORRELATION_ID_HEADER)) {
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
  }

  correlationStorage.run({ correlationId }, () => next());
}
