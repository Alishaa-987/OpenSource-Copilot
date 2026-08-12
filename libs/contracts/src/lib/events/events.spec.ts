import {
  assertEventName,
  createEventEnvelope,
  isValidEventName,
  topicForEventName,
} from '../../index';

describe('event naming convention', () => {
  it.each(['repository.imported', 'issue.recommendation-generated', 'a.b.c'])(
    'accepts valid name "%s"',
    (name) => {
      expect(isValidEventName(name)).toBe(true);
    },
  );

  it.each([
    '',
    'repository', // single segment, no action
    'Repository.Imported', // upper-case
    'repository.', // trailing dot
    '.imported', // leading dot
    'repository..imported', // empty segment
    'repository.imported ', // trailing space
    'repo_sitory.imported', // underscore not allowed
  ])('rejects invalid name "%s"', (name) => {
    expect(isValidEventName(name)).toBe(false);
    expect(() => assertEventName(name)).toThrow();
  });

  it('derives the topic from the aggregate segment', () => {
    expect(topicForEventName('repository.imported')).toBe('repository');
    expect(topicForEventName('issue.recommendation-generated')).toBe('issue');
  });
});

describe('createEventEnvelope', () => {
  const base = {
    eventName: 'repository.imported',
    eventVersion: 1,
    correlationId: 'corr-123',
    producer: 'repository-service',
    payload: { repositoryId: 'r1' },
  };

  it('builds a complete, immutable envelope', () => {
    const at = new Date('2026-01-01T00:00:00.000Z');
    const evt = createEventEnvelope(base, { eventId: 'evt-1', occurredAt: at });

    expect(evt).toEqual({
      eventId: 'evt-1',
      eventName: 'repository.imported',
      eventVersion: 1,
      correlationId: 'corr-123',
      occurredAt: '2026-01-01T00:00:00.000Z',
      producer: 'repository-service',
      payload: { repositoryId: 'r1' },
    });
  });

  it('generates a unique eventId and timestamp when not provided', () => {
    const a = createEventEnvelope(base);
    const b = createEventEnvelope(base);
    expect(a.eventId).not.toEqual(b.eventId);
    expect(() => new Date(a.occurredAt).toISOString()).not.toThrow();
  });

  it('rejects an invalid event name', () => {
    expect(() => createEventEnvelope({ ...base, eventName: 'nope' })).toThrow(/Invalid event name/);
  });

  it.each([0, -1, 1.5])('rejects non-positive-integer version %s', (v) => {
    expect(() => createEventEnvelope({ ...base, eventVersion: v })).toThrow(/positive integer/);
  });

  it('requires a correlation id', () => {
    expect(() => createEventEnvelope({ ...base, correlationId: '' })).toThrow(/correlationId/);
  });
});
