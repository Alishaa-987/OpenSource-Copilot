# Backend API

All services use the global `/api` prefix. Responses use JSON. Correlation is accepted through `x-correlation-id` and returned on responses. Validation failures and unexpected failures use the shared `ApiErrorResponse` shape with a correlation ID.

## Health endpoints

| Service | Endpoint | Purpose |
|---|---|---|
| Gateway | `GET /api/health/live` | Process liveness |
| Gateway | `GET /api/health/ready` | Dependency readiness |
| Repository Service | `GET /api/health/live` | Process liveness |
| Repository Service | `GET /api/health/ready` | PostgreSQL, Redis, and Kafka readiness |
| Guidance Service | `GET /api/health/live` | Process liveness |
| Guidance Service | `GET /api/health/ready` | PostgreSQL, Redis, and Kafka readiness |

## GitHub and repository endpoints

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/github/auth/start` | Anonymous | Begin GitHub OAuth; state is stored server-side. |
| GET | `/api/v1/github/auth/callback` | Anonymous | Complete OAuth callback and establish the server-side session cookie. |
| GET | `/api/v1/github/me` | Session | Return the authenticated GitHub user summary. |
| GET | `/api/v1/github/repositories` | Session | List repositories accessible to the authenticated user; query supports bounded pagination/search. |
| POST | `/api/v1/github/repositories/import` | Session | Import an accessible repository. The service validates access and publishes `RepositoryImported`. |
| POST | `/api/v1/github/repositories/import/public` | Anonymous, rate limited | Import a public repository through the bounded public-import path. |
| GET | `/api/v1/repositories/:repositoryId` | Session + ownership | Return the repository overview. `repositoryId` must be a UUID. |
| GET | `/api/v1/repositories/:repositoryId/issues` | Session + ownership | Return open issues for the repository. |
| GET | `/api/v1/issues/:issueId` | Session + ownership | Return issue details. |
| GET | `/api/v1/internal/repositories/:repositoryId/issues` | Session + ownership | Service-to-service issue lookup used by Guidance; it is not an unauthenticated internal bypass. |

## Recommendations

`GET /api/v1/repositories/:repositoryId/recommendations` is served by Guidance Service. It requires the authenticated session and repository ownership. Query parameters are bounded: `page` defaults to 1, `perPage` defaults to 20 and is capped at 100, `label` is optional, and `minScore` is optional in the range -100 to 100. Results use deterministic score, update-time, issue-number, and UUID ordering.

## Error handling

Clients should treat `401` as an authentication failure, `403` as an authorization failure, `404` as a missing resource, `400` as validation failure, `429` as rate limiting, and `5xx` as a retryable server-side failure only when the operation is safe to retry. Error responses do not include stack traces, secrets, access tokens, or raw upstream response bodies.
