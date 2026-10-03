# Frontend / Backend Contract Notes

## Integration decisions

The existing Next.js frontend keeps its current routes, components, styling, and TanStack Query provider. It now uses a typed same-origin client and adapters instead of mock data for Phase 1 repository, issue, and recommendation flows. No GitHub token, GitHub secret, XAI key, or database credential is placed in frontend environment variables.

| Flow | Intentional contract |
|---|---|
| GitHub login | Frontend calls `GET /api/repository/v1/github/auth/start?returnTo=...`; the backend returns an authorization URL and stores the token server-side. The client then navigates to that external URL. |
| Current session | `GET /api/repository/v1/github/me` returns the authenticated GitHub user directly. A `401` is rendered as an authentication state, not as an empty repository state. |
| Accessible repositories | `GET /api/repository/v1/github/repositories?page=&perPage=` returns GitHub-accessible repositories. Its `id` is the GitHub repository ID, not the internal UUID. |
| Import | `POST /api/repository/v1/github/repositories/import` accepts `{ githubRepositoryId }` and returns the imported repository plus document/issue counts. The imported response includes both `githubRepositoryId` and the Repository Service-owned internal `repositoryId`. |
| Repository overview | `GET /api/repository/v1/github/repositories/:repositoryId` uses the internal UUID after import. |
| Issues | `GET /api/repository/v1/github/repositories/:repositoryId/issues` returns open issue records owned by Repository Service. `GET /api/repository/v1/github/issues/:issueId` returns authenticated issue details. |
| Recommendations | `GET /api/guidance/v1/repositories/:repositoryId/recommendations` returns deterministic ranked items with score, rank, labels, updated time, and human-readable reasons. |

## Frontend adapters

The existing UI types expect analysis-only fields such as difficulty, effort, health, and enriched author profiles. Phase 1 does not provide those fields, so adapters use explicit neutral values and do not claim that AI analysis exists. Recommendation reasons are converted to the existing display contract without inventing machine-learning metadata.

## Same-origin transport

`apps/web/next.config.ts` rewrites `/api/repository/*` to Repository Service and `/api/guidance/*` to Guidance Service. Browser requests use relative paths with `credentials: include`, allowing the httpOnly session cookie to remain server-side. Service URLs are server-side configuration only.

## Failure and empty states

The authenticated shell distinguishes loading, expired authentication, and backend failure. Repository pages distinguish loading, empty repository lists, import failure, issue failure, and no recommendations. Retry actions reuse the existing query mutations and do not change the visual architecture.

## Explicit mismatch resolution

The original frontend was mock-driven and had no API layer. Its repository list used a single generic ID and its issue/recommendation types assumed enriched analysis data. The integration intentionally separates GitHub IDs from internal UUIDs, adds the backend-owned detail/import contracts, and adapts only the missing display fields.
