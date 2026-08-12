import type { IncomingMessage, ServerResponse } from 'node:http';
import { CORRELATION_ID_HEADER } from '@osc/contracts';
import { CorrelationService } from './correlation.service';
import { correlationMiddleware } from './correlation.middleware';
import { getCorrelationId } from './correlation.storage';
import { buildLoggerParams } from './logger.options';

/** Minimal fake response capturing headers set during the test. */
class FakeRes {
  private headers = new Map<string, string>();
  setHeader(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value);
  }
  getHeader(name: string): string | undefined {
    return this.headers.get(name.toLowerCase());
  }
}

function fakeReq(headers: Record<string, string> = {}): IncomingMessage & { id?: string } {
  return { headers } as unknown as IncomingMessage & { id?: string };
}
function fakeRes(): ServerResponse & FakeRes {
  return new FakeRes() as unknown as ServerResponse & FakeRes;
}

describe('CorrelationService + storage', () => {
  const service = new CorrelationService();

  it('returns undefined outside any context', () => {
    expect(service.getCorrelationId()).toBeUndefined();
  });

  it('exposes the id within runWith', () => {
    const seen = service.runWith('abc-123', () => service.getCorrelationId());
    expect(seen).toBe('abc-123');
  });
});

describe('correlationMiddleware', () => {
  it('reuses an incoming correlation id and echoes it on the response', () => {
    const req = fakeReq({ [CORRELATION_ID_HEADER]: 'incoming-id' });
    const res = fakeRes();
    let idInside: string | undefined;
    correlationMiddleware(req, res, () => {
      idInside = getCorrelationId();
    });
    expect(req.correlationId).toBe('incoming-id');
    expect(res.getHeader(CORRELATION_ID_HEADER)).toBe('incoming-id');
    expect(idInside).toBe('incoming-id');
  });

  it('generates an id when none is provided', () => {
    const req = fakeReq();
    const res = fakeRes();
    let idInside: string | undefined;
    correlationMiddleware(req, res, () => {
      idInside = getCorrelationId();
    });
    expect(req.correlationId).toBeDefined();
    expect(res.getHeader(CORRELATION_ID_HEADER)).toBe(req.correlationId);
    expect(idInside).toBe(req.correlationId);
  });
});

describe('buildLoggerParams', () => {
  const params = buildLoggerParams({ serviceName: 'svc', level: 'debug', pretty: false });
  const pinoHttp = params.pinoHttp;
  if (!pinoHttp) throw new Error('pinoHttp params missing');

  it('sets the configured level', () => {
    expect(pinoHttp.level).toBe('debug');
  });

  it('genReqId reuses the incoming header and sets the response header', () => {
    const res = fakeRes();
    const id = pinoHttp.genReqId?.(
      fakeReq({ [CORRELATION_ID_HEADER]: 'hdr-id' }),
      res as unknown as ServerResponse,
    );
    expect(id).toBe('hdr-id');
    expect(res.getHeader(CORRELATION_ID_HEADER)).toBe('hdr-id');
  });

  it('genReqId generates an id when the header is absent', () => {
    const res = fakeRes();
    const id = pinoHttp.genReqId?.(fakeReq(), res as unknown as ServerResponse);
    expect(typeof id).toBe('string');
    expect((id as string).length).toBeGreaterThan(0);
    expect(res.getHeader(CORRELATION_ID_HEADER)).toBe(id);
  });

  it('redacts auth headers, cookies and secret-like fields', () => {
    const redact = pinoHttp.redact as { paths: string[]; censor: string };
    expect(redact.paths).toEqual(
      expect.arrayContaining([
        'req.headers.authorization',
        'req.headers.cookie',
        '*.password',
        '*.token',
        '*.accessToken',
      ]),
    );
    expect(redact.censor).toBe('[REDACTED]');
  });

  it('omits the pretty transport when pretty is false', () => {
    expect('transport' in pinoHttp).toBe(false);
  });
});
