# Backend Foundation

This repository contains the phase-one backend foundation for OpenSource Copilot. The backend uses an Nx classic path-based workspace with three NestJS applications: gateway, repository-service, and guidance-service. The existing apps/web frontend remains outside the backend project graph and is intentionally untouched.

## Service map

| Service | Default port | Responsibilities | Readiness dependencies |
|---|---:|---|---|
| gateway | 3000 | HTTP entrypoint and edge-facing foundation | Redis, Kafka |
| repository-service | 3001 | PostgreSQL/Prisma owner and repository boundary | PostgreSQL, Redis, Kafka |
| guidance-service | 3002 | Guidance service foundation | Redis, Kafka |

Every service uses the shared configuration, observability, validation, exception, correlation, and health primitives. Configuration is loaded from dotenv files and validated with Zod at startup. Invalid configuration stops startup; secret values are not included in validation errors or logs.

## Local infrastructure

Copy .env.example to .env and keep real credentials out of version control. The example values are local-development placeholders only.

Start PostgreSQL, Redis, and Kafka with:

    npm run infra:up

Inspect infrastructure logs with:

    npm run infra:logs

Stop infrastructure with:

    npm run infra:down

The repository service is the only service that owns a Prisma schema and applies database migrations. Generate the Prisma client with:

    npm run prisma:generate

Apply migrations with:

    npm run prisma:deploy

The schema currently contains only the MigrationProbe table. It is deliberately a connectivity and migration probe, not a business-domain model.

## Running services

Use the Nx serve targets from separate terminals. The default ports are 3000 for gateway, 3001 for repository-service, and 3002 for guidance-service.

    npx nx serve gateway
    npx nx serve repository-service
    npx nx serve guidance-service

Each process reads the same environment contract. PORT may be overridden per terminal when needed.

## Health endpoints

The shared bootstrap applies the api global prefix. Each service exposes a liveness endpoint at /api/health/live and a readiness endpoint at /api/health or /api/health/ready.

Liveness checks only application availability. Readiness checks the service plus its configured infrastructure dependencies. Repository-service additionally runs SELECT 1 through Prisma. A dependency failure produces a standard Terminus unhealthy response without leaking connection strings or credentials.

## Kafka foundation

KafkaProducerService creates the shared event envelope, assigns or propagates a correlation identifier, derives the topic from the event name, and includes correlation, event name, and version headers. KafkaConsumerService parses envelopes, restores correlation context for each message, and lets KafkaJS retry by rethrowing handler failures. Consumer groups are supplied through KAFKA_CONSUMER_GROUP.

## Verification

Run the backend unit tests with:

    npx nx run-many -t test --projects=gateway,repository-service,guidance-service,config,contracts,observability,shared,database,kafka

Run the backend lint targets with:

    npx nx run-many -t lint --projects=gateway,repository-service,guidance-service,config,contracts,observability,shared,database,kafka

Run the typecheck with:

    npm run typecheck

Build the three applications with:

    npx nx run-many -t build --projects=gateway,repository-service,guidance-service

The repository-service integration test is guarded by RUN_INTEGRATION=1. With Docker infrastructure running, set RUN_INTEGRATION to 1 and run the repository-service test target to verify application startup plus PostgreSQL, Redis, and Kafka connectivity. Without that flag, the integration suite is skipped so ordinary unit tests do not require external services.

## Security and scope notes

Redis is used only as a cache or ephemeral side-store. PostgreSQL is the primary datastore for repository-service. No real secrets are included in .env.example. The known transitive npm audit findings are not automatically force-fixed because doing so could introduce breaking dependency changes; review them separately before production release.


### Phase 1 data ownership

Repository-service and guidance-service use separate Prisma schemas and databases. Repository-service owns repository-facing tables; guidance-service owns `Recommendation`. Cross-service identifiers are UUID scalar values and are not database foreign keys. Use `npm run prisma:deploy` for repository migrations and `npm run prisma:guidance:deploy` for guidance migrations.
