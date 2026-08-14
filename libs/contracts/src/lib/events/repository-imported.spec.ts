import {
  createRepositoryImportedEvent,
  parseRepositoryImportedEvent,
  REPOSITORY_IMPORTED_EVENT_TYPE,
  REPOSITORY_IMPORTED_EVENT_VERSION,
} from './repository-imported';

describe('RepositoryImported contract', () => {
  const input = {
    repositoryId: '11111111-1111-4111-8111-111111111111',
    githubRepositoryId: '123456789',
    correlationId: 'corr-123',
  };

  it('creates an immutable versioned credential-free event', () => {
    const event = createRepositoryImportedEvent(input);
    expect(event).toMatchObject({
      eventType: REPOSITORY_IMPORTED_EVENT_TYPE,
      version: REPOSITORY_IMPORTED_EVENT_VERSION,
      ...input,
    });
    expect(event.eventId).toEqual(expect.any(String));
    expect(event.timestamp).toEqual(expect.any(String));
    expect(Object.isFrozen(event)).toBe(true);
    expect(event).not.toHaveProperty('token');
    expect(event).not.toHaveProperty('contents');
  });

  it('strictly rejects malformed or expanded wire messages', () => {
    expect(() => parseRepositoryImportedEvent({ ...input })).toThrow();
    expect(() => parseRepositoryImportedEvent({
      ...createRepositoryImportedEvent(input),
      unexpected: true,
    })).toThrow();
    expect(() => parseRepositoryImportedEvent({
      ...createRepositoryImportedEvent(input),
      githubRepositoryId: 'not-numeric',
    })).toThrow();
  });

  it('accepts a valid serialized event', () => {
    const event = createRepositoryImportedEvent(input);
    expect(parseRepositoryImportedEvent(JSON.parse(JSON.stringify(event)))).toEqual(event);
  });
});
