# Environment and Local Setup

## Prerequisites

Use Node.js, npm, Docker Desktop, and a running Docker Compose environment. The repository uses PostgreSQL, Redis, and Kafka locally. The frontend is intentionally not part of backend setup instructions.

## Setup

1. Copy `.env.example` to `.env` and fill local-only values. Never commit `.env`.
2. Create a GitHub OAuth application with callback URL `http://localhost:3001/api/v1/github/auth/callback`.
3. Start infrastructure with `npm run infra:up`.
4. Apply or inspect the matching Prisma migrations with the scripts in [DATABASE.md](DATABASE.md).
5. Run backend checks with the commands below.

## Configuration rules

Environment variables are parsed through service-specific Zod schemas. Required values fail fast at startup. Secrets are server-side only: GitHub client secrets and OAuth tokens must not be added to frontend environment variables, logs, Kafka events, or API responses.

## Verification commands

```powershell
npx tsc -p tsconfig.typecheck.json --pretty false
npx eslint 'apps/gateway/src/**/*.ts' 'apps/gateway-e2e/src/**/*.ts' 'apps/repository-service/src/**/*.ts' 'apps/guidance-service/src/**/*.ts' 'libs/*/src/**/*.ts'
RUN_INTEGRATION=1 npx jest --config apps/repository-service/jest.config.cts --runInBand --coverage=false
RUN_INTEGRATION=1 npx jest --config apps/guidance-service/jest.config.cts --runInBand --coverage=false
npx nx build repository-service --skip-nx-cache
npx nx build guidance-service --skip-nx-cache
```

On PowerShell, set environment variables in the current process before invoking Jest. Integration tests are guarded so unit tests do not require Docker. If a command hangs, clear stale Node processes and rerun one focused command at a time; do not use automatic dependency fixes.

## Knowledge Service (Phase 2)

The Knowledge Service runs on port `3003` by default. It calls the Repository Service at `http://localhost:3001/api` for authenticated source access and uses Qdrant at `http://localhost:6333` for vector storage.

| Variable | Purpose | Default or local guidance |
|---|---|---|
| `PORT` | Knowledge Service HTTP port. | `3003` |
| `REPOSITORY_SERVICE_URL` | Internal Repository Service API base URL. | `http://localhost:3001/api` |
| `KNOWLEDGE_SERVICE_TOKEN` | Optional server-side service authentication token. | Unset for local development; never expose it to `apps/web` |
| `QDRANT_URL` | Qdrant HTTP endpoint. | `http://localhost:6333` |
| `QDRANT_API_KEY` | Optional server-side Qdrant credential. | Unset for local Qdrant |
| `QDRANT_COLLECTION` | Qdrant collection name. | `opensource_repository_chunks` |
| `EMBEDDING_BASE_URL` / `EMBEDDING_API_KEY` | OpenAI-compatible embedding endpoint and server-side credential. | Provider-specific; key must remain server-side |
| `EMBEDDING_MODEL` / `EMBEDDING_DIMENSIONS` | Embedding model and vector dimension. | `text-embedding-3-small` / `1536` |
| `EMBEDDING_REQUEST_TIMEOUT_MS` | Embedding request timeout. | `10000` |
| `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` | OpenAI-compatible LLM endpoint, server-side credential, and model. | Provider-specific / server-side / `gpt-4o-mini` |
| `AI_REQUEST_TIMEOUT_MS` | LLM request timeout. | `30000` |
| `KNOWLEDGE_REQUEST_TIMEOUT_MS` | Internal repository and vector-store request timeout. | `10000` |
| `KNOWLEDGE_CHUNK_SIZE` / `KNOWLEDGE_CHUNK_OVERLAP` | Chunk size and overlap. | `1200` / `150` |
| `KNOWLEDGE_RETRIEVAL_LIMIT` / `KNOWLEDGE_MIN_RELEVANCE` | Retrieval cap and minimum relevance threshold. | `5` / `0.35` |

The implementation uses `QDRANT_COLLECTION`; `QDRANT_COLLECTION_NAME` is not a recognized runtime variable. Provider credentials, service tokens, GitHub credentials, and database credentials must remain server-side and must not be placed in browser-exposed environment variables.


## Production-quality runtime controls

All backend services validate the following shared settings at startup. `RATE_LIMIT_ENABLED` controls the Redis-backed fixed-window limiter, while `RATE_LIMIT_MAX_REQUESTS` and `RATE_LIMIT_WINDOW_SECONDS` define its per-client/per-route budget. The limiter hashes Redis keys and uses a bounded process-local fallback during transient Redis outages. Each service exposes non-secret request counters and latency buckets at `/api/metrics`; protect that endpoint at the network or platform layer in production.
