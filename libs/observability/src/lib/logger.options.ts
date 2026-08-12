import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';
import { CORRELATION_ID_HEADER } from '@osc/contracts';

export interface LoggerOptions {
  /** Logical service name, tagged on every log line. */
  serviceName: string;
  /** pino log level (see `logLevelSchema` in `@osc/config`). */
  level: string;
  /** Human-friendly, colourised output for local dev; JSON in prod. */
  pretty: boolean;
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.length > 0 ? v : undefined;
}

/**
 * Builds nestjs-pino parameters:
 *  - structured JSON logs (or pretty in dev),
 *  - a correlation id per request (from `x-correlation-id` or generated), echoed
 *    on the response and attached to every log line as `correlationId`,
 *  - redaction of auth headers, cookies and common secret fields so tokens and
 *    passwords are NEVER written to logs.
 */
export function buildLoggerParams(options: LoggerOptions): Params {
  const { serviceName, level, pretty } = options;

  return {
    pinoHttp: {
      level,
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const existing = firstHeaderValue(req.headers[CORRELATION_ID_HEADER]);
        const id = existing ?? randomUUID();
        res.setHeader(CORRELATION_ID_HEADER, id);
        return id;
      },
      // `req.id` is the correlation id (see genReqId); surface it explicitly.
      customProps: (req: IncomingMessage & { id?: string }) => ({
        service: serviceName,
        correlationId: req.id,
      }),
      autoLogging: true,
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-api-key"]',
          'res.headers["set-cookie"]',
          'req.body.password',
          'req.body.token',
          'req.body.accessToken',
          'req.body.refreshToken',
          '*.password',
          '*.token',
          '*.accessToken',
          '*.refreshToken',
        ],
        censor: '[REDACTED]',
      },
      serializers: {
        req(req: { id?: string; method?: string; url?: string }) {
          return { id: req.id, method: req.method, url: req.url };
        },
        res(res: { statusCode?: number }) {
          return { statusCode: res.statusCode };
        },
      },
      ...(pretty
        ? {
            transport: {
              target: 'pino-pretty',
              options: {
                singleLine: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            },
          }
        : {}),
    },
  };
}
