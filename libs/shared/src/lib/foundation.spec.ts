import 'reflect-metadata';
import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { IsString } from 'class-validator';
import { correlationStorage } from '@osc/observability';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { buildValidationPipe } from './validation';

interface CapturedResponse {
  status: number;
  body: Record<string, unknown>;
}

/** Builds a fake ArgumentsHost capturing what the filter writes to the response. */
function makeHost(
  requestOverrides: Record<string, unknown> = {},
): { host: ArgumentsHost; captured: CapturedResponse } {
  const captured: CapturedResponse = { status: 0, body: {} };
  const response = {
    status(code: number) {
      captured.status = code;
      return {
        json(body: unknown) {
          captured.body = body as Record<string, unknown>;
        },
      };
    },
  };
  const request = {
    url: '/api/things',
    originalUrl: '/api/things',
    method: 'GET',
    ...requestOverrides,
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, captured };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('serialises an HttpException into the ApiErrorResponse contract', () => {
    const { host, captured } = makeHost();
    filter.catch(new BadRequestException(['name must be a string']), host);

    expect(captured.status).toBe(400);
    expect(captured.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: ['name must be a string'],
      path: '/api/things',
    });
    expect(typeof captured.body['timestamp']).toBe('string');
    expect(captured.body['correlationId']).toBe('unknown');
  });

  it('NEVER leaks internal error detail for unexpected (5xx) errors', () => {
    const { host, captured } = makeHost();
    // A raw error carrying sensitive text — must not reach the client.
    filter.catch(new Error('connect ECONNREFUSED db password=SUPERSECRET'), host);

    expect(captured.status).toBe(500);
    expect(captured.body).toMatchObject({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal server error',
    });
    const serialised = JSON.stringify(captured.body);
    expect(serialised).not.toContain('SUPERSECRET');
    expect(serialised).not.toContain('ECONNREFUSED');
    expect(serialised).not.toContain('password');
  });

  it('uses the correlation id from async-local storage when present', () => {
    const { host, captured } = makeHost();
    correlationStorage.run({ correlationId: 'cid-42' }, () => {
      filter.catch(new BadRequestException('bad'), host);
    });
    expect(captured.body['correlationId']).toBe('cid-42');
  });

  it('falls back to request.correlationId when no ALS context exists', () => {
    const { host, captured } = makeHost({ correlationId: 'req-cid' });
    filter.catch(new Error('boom'), host);
    expect(captured.body['correlationId']).toBe('req-cid');
  });
});

class SampleDto {
  @IsString()
  name!: string;
}

describe('buildValidationPipe', () => {
  const pipe = buildValidationPipe();
  const meta = { type: 'body' as const, metatype: SampleDto, data: '' };

  it('accepts and transforms a valid payload into a DTO instance', async () => {
    const result = await pipe.transform({ name: 'ok' }, meta);
    expect(result).toBeInstanceOf(SampleDto);
    expect(result).toEqual({ name: 'ok' });
  });

  it('rejects unknown properties (forbidNonWhitelisted)', async () => {
    await expect(pipe.transform({ name: 'ok', extra: 'nope' }, meta)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a payload that violates a field constraint', async () => {
    await expect(pipe.transform({ name: 123 }, meta)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not echo the submitted value back in the error (no input leakage)', async () => {
    try {
      await pipe.transform({ name: 'ok', secretField: 'leak-me' }, meta);
      throw new Error('expected validation to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const response = JSON.stringify((err as BadRequestException).getResponse());
      expect(response).not.toContain('leak-me');
    }
  });
});
