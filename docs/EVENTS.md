# Event Contracts

## RepositoryImported v1

Topic: `repository.imported` (the exact topic is configured by the Kafka contract constants). Producer: Repository Service. Consumer: Guidance Service.

```json
{
  "eventId": "uuid",
  "eventType": "RepositoryImported",
  "version": 1,
  "timestamp": "2026-08-15T00:00:00.000Z",
  "correlationId": "request-or-generated-id",
  "repositoryId": "internal-repository-uuid",
  "githubRepositoryId": "github-id"
}
```

The envelope is immutable after publication. Internal UUIDs and GitHub IDs are separate. Credentials, OAuth state, access tokens, repository contents, issue bodies, and authorization headers are prohibited from event payloads.

## Consumer behavior

Guidance validates the event envelope and rejects malformed messages without invoking business processing. It records processed event IDs in its owned database before completing successful handling, making duplicate delivery idempotent. The handler retrieves the required repository issues through the Repository Service API and never uses the Repository Service Prisma client.

## Correlation and retries

The producer includes the correlation ID in the event envelope and Kafka headers. The consumer restores it for structured logs and downstream HTTP calls. Retryable handler failures use bounded attempts and delay. Malformed events are skipped safely. Repeated handler failure is logged and does not corrupt the Guidance database; the current local-development strategy does not add a distributed dead-letter platform.

## Compatibility

Consumers must accept only supported versions and preserve the envelope fields. A schema change requires a new version and corresponding contract tests. Event tests cover publication shape, malformed payload rejection, duplicate handling, and temporary failure recovery.
