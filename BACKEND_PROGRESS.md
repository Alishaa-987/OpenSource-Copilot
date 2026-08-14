# Backend Foundation — Progress & Handoff

The backend foundation and Phase 1 GitHub integration are implemented and verified. The frontend at `apps/web` was deliberately left untouched and is not registered in the backend Nx graph.

## Status legend

| Status | Meaning |
|---|---|
| DONE | Implemented and verified in the connected project |
| PARTIAL | Implemented, but an environment-dependent check remains unavailable |
| NOT STARTED | Deliberately outside the current scope |

## Libraries

| Library | Purpose | State | Verification |
|---|---|---|---:|
| `libs/contracts` | Event envelopes, event naming/versioning, correlation constants, API error contracts, and repository-imported event contracts | DONE | 19 tests |
| `libs/config` | dotenv loading, Zod validation, fail-fast typed configuration, and safe configuration errors | DONE | 17 tests |
| `libs/observability` | Pino logging and AsyncLocalStorage correlation middleware | DONE | 9 tests |
| `libs/shared` | Exception filter, validation pipe, Redis client, health primitives, and service bootstrap | DONE | 8 tests |
| `libs/database` | Prisma service and module for repository-service database ownership | DONE | Full suite |
| `libs/kafka` | KafkaJS producer, consumer, correlation propagation, and health support | DONE | Full suite |
| `libs/github` | Resilient GitHub REST/OAuth client, Zod response validation, retry handling, rate-limit classification, and pagination | DONE | 4 tests |

## Applications

| Application | State | Scope |
|---|---|---|
| `apps/gateway` | DONE | Config, observability, health, bootstrap, and shared infrastructure wiring |
| `apps/repository-service` | DONE | Repository data ownership, Prisma integration, GitHub OAuth, repository listing/import, and event publication |
| `apps/guidance-service` | DONE | Isolated recommendation database, config, observability, health, bootstrap, and shared infrastructure wiring |
| `apps/web` | NOT MODIFIED | Explicitly excluded from this backend task |

## Phase 1 PostgreSQL data model

The Phase 1 schema is split by service ownership. `repository-service` owns `User`, `GitHubInstallation`, `Repository`, `RepositoryAccess`, `RepositoryDocument`, `Issue`, and `IssueLabel`. `guidance-service` owns `Recommendation` in its isolated database. There is no cross-service database access and no cross-database foreign key.

Internal entities use UUID primary keys. GitHub identifiers are stored separately in dedicated fields such as `githubUserId`, `githubInstallationId`, `githubRepositoryId`, and `githubIssueId`; they are never used as internal primary keys. Foreign keys, unique constraints, indexes, timestamps, and cascade behavior are defined in the Prisma schemas and migrations. Important indexes cover user repository access, repository issue/document lookup, repository GitHub ID lookup, issue GitHub ID lookup, and recommendation retrieval.

Prisma validation, migrations, generated clients, database constraint tests, and guarded integration coverage were completed for the Phase 1 data model. Integration tests remain guarded by `RUN_INTEGRATION=1` and do not run during the ordinary unit-test command.

## Phase 1 GitHub integration

The GitHub client is implemented in `libs/github`. It provides OAuth token exchange, authenticated-user lookup, accessible-repository listing, repository lookup, README/content retrieval, issue listing, pagination metadata, bounded retries for transient failures, retry-after handling, rate-limit classification, and Zod validation of GitHub responses. Error messages do not expose GitHub response bodies or credentials.

The repository service stores OAuth state and session tokens server-side in Redis with TTLs. Tokens are never included in API response bodies. OAuth state is generated during authorization start, validated and deleted during callback completion, and the authenticated GitHub user is upserted into the repository-service database.

### HTTP endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/v1/github/auth/start` | Create a short-lived OAuth state and return the GitHub authorization URL |
| `GET` | `/v1/github/auth/callback` | Validate OAuth state, exchange the code, persist the user, and establish an HTTP-only session cookie |
| `POST` | `/v1/github/auth/logout` | Delete the server-side Redis session |
| `GET` | `/v1/github/me` | Return the authenticated user profile without credentials |
| `GET` | `/v1/github/repositories` | List repositories accessible to the authenticated GitHub user |
| `POST` | `/v1/github/repositories/import` | Import an authenticated user’s repository idempotently |
| `POST` | `/v1/github/repositories/import/public` | Import a public repository without an authenticated session |

Repository import upserts the repository, access record, README/document data, issues, and issue labels. A `RepositoryImported` Kafka event is published after the import transaction succeeds. The operation uses internal UUIDs while retaining GitHub IDs as external identifiers.

GitHub OAuth and API configuration fields are validated through the repository-service Zod environment schema. Placeholders are documented in `.env.example`; no real secrets or committed `.env` files were added. No GitHub integration was added to the gateway or guidance-service, as required. AI and RAG functionality were not implemented.

## Infrastructure

`docker-compose.yml` provides PostgreSQL for the repository service on port `5432`, an isolated guidance PostgreSQL database on port `5433`, Redis on port `6379`, and Apache Kafka in KRaft mode on port `9092`. The Kafka image uses `apache/kafka:3.9.0`.

## Final verification record

| Check | Result |
|---|---|
| Monorepo typecheck | PASS — zero TypeScript errors |
| GitHub library tests | PASS — 4 tests |
| Repository-service tests | PASS — 8 tests; 1 integration suite skipped by guard |
| Full backend test suite | PASS — all 10 requested projects completed successfully |
| Repository-service production build | PASS — webpack compiled successfully |
| Frontend protection | PASS — `apps/web` not modified |
| Integration tests requiring external infrastructure | Guarded — run with `RUN_INTEGRATION=1` when PostgreSQL, Redis, and Kafka are available |

## Deliberate follow-up scope

Gateway-level GitHub proxying, guidance-service GitHub access, AI/RAG pipelines, background synchronization, webhook processing, and recommendation generation remain outside this Phase 1 implementation.

Last updated: Phase 1 GitHub integration completion and verification.

