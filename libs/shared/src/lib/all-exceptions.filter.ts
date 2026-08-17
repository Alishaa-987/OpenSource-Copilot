import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiErrorResponse } from '@osc/contracts';
import { getCorrelationId } from '@osc/observability';

/**
 * Minimal structural shapes so this lib does not need `@types/express`.
 * At runtime these are the Express request/response provided by Nest.
 */
interface HttpResponseLike {
  status(code: number): { json(body: unknown): unknown };
}
interface HttpRequestLike {
  url?: string;
  originalUrl?: string;
  method?: string;
  correlationId?: string;
}

/** Human-readable reason phrases for the status codes we care about. */
const REASON_PHRASES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

function reasonPhrase(status: number): string {
  return REASON_PHRASES[status] ?? (status >= 500 ? 'Internal Server Error' : 'Error');
}

/**
 * Catch-all exception filter that serialises **every** error into the single
 * {@link ApiErrorResponse} contract.
 *
 * Security requirement â€” "Do not return sensitive internal errors to clients":
 *  - `HttpException`s (our own 4xx/expected errors) expose their client-safe
 *    message and reason phrase only.
 *  - Any other error (unexpected, 5xx) returns a **generic** message; the real
 *    exception (with stack) is logged server-side under the correlation id and
 *    NEVER placed in the response body.
 */
function sanitizeExceptionForLog(exception: unknown): string {
  const detail = exception instanceof Error ? exception.stack ?? exception.message : String(exception);
  return detail
    .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s,]+/gi, '$1[REDACTED]')
    .replace(/((?:cookie|password|secret|token|accessToken|refreshToken|api[_-]?key|client[_-]?secret)\s*[:=]\s*)[^\s,;)]*/gi, '$1[REDACTED]');
}
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<HttpResponseLike>();
    const request = ctx.getRequest<HttpRequestLike>();

    const correlationId = getCorrelationId() ?? request?.correlationId ?? 'unknown';
    const path = request?.originalUrl ?? request?.url ?? '';

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      error = reasonPhrase(statusCode);
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object') {
        const body = res as { message?: string | string[]; error?: string };
        if (body.message !== undefined) {
          message = body.message;
        }
        if (typeof body.error === 'string' && body.error.length > 0) {
          error = body.error;
        }
      }
    }

    // Log the full error server-side (with stack for 5xx). This is the ONLY
    // place internal detail is recorded â€” it never reaches the client.
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Unhandled exception [${correlationId}] ${request?.method ?? ''} ${path}`,
        sanitizeExceptionForLog(exception),
      );
    } else {
      this.logger.warn(
        `Request error ${statusCode} [${correlationId}] ${request?.method ?? ''} ${path}`,
      );
    }

    const payload: ApiErrorResponse = {
      statusCode,
      error,
      message,
      correlationId,
      timestamp: new Date().toISOString(),
      path,
    };

    response.status(statusCode).json(payload);
  }
}


