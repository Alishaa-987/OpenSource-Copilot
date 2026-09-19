import { z } from 'zod';
import { baseEnvSchema, databaseEnvSchema, kafkaEnvSchema, redisEnvSchema } from '@osc/config';

export const repositoryEnvSchema = baseEnvSchema
  .merge(databaseEnvSchema)
  .merge(redisEnvSchema)
  .merge(kafkaEnvSchema)
  .extend({
    PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    FRONTEND_BASE_URL: z.string().url().default('http://localhost:3000'),
    KNOWLEDGE_SERVICE_TOKEN: z.string().min(32).optional(),
    GITHUB_CLIENT_ID: z.string().min(1).optional(),
    GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
    GITHUB_REDIRECT_URI: z.string().url().default('http://localhost:3001/api/v1/github/auth/callback'),
    GITHUB_API_BASE_URL: z.string().url().default('https://api.github.com'),
    GITHUB_API_VERSION: z.string().min(1).default('2026-03-10'),
    GITHUB_API_TIMEOUT_MS: z.coerce.number().int().min(500).max(60_000).default(10_000),
    GITHUB_API_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(3),
    GITHUB_API_RETRY_BASE_DELAY_MS: z.coerce.number().int().min(50).max(10_000).default(250),
    GITHUB_API_MAX_RETRY_DELAY_MS: z.coerce.number().int().min(250).max(120_000).default(5_000),
    GITHUB_SESSION_COOKIE_NAME: z.string().min(1).default('osc_github_session'),
    GITHUB_SESSION_TTL_SECONDS: z.coerce.number().int().min(300).max(2_592_000).default(604_800),
    GITHUB_OAUTH_STATE_TTL_SECONDS: z.coerce.number().int().min(60).max(600).default(600),
    REPOSITORY_MONITOR_ENABLED: z.coerce.boolean().default(true),
    // How often the background job re-checks monitored (imported) repositories
    // for new GitHub issues. Kept well above GitHub's unauthenticated rate
    // limit window (60 req/hour) since the monitor calls the GitHub API
    // without a user token.
    REPOSITORY_MONITOR_INTERVAL_MS: z.coerce.number().int().min(60_000).max(3_600_000).default(600_000),
    // Bounded work per cycle: the monitor calls GitHub unauthenticated (60
    // requests/hour), so a cycle spends at most this many requests and the
    // least-recently-checked repositories continue on the next one.
    REPOSITORY_MONITOR_MAX_REQUESTS_PER_CYCLE: z.coerce.number().int().min(1).max(500).default(40),
    // Off by default: marking an issue closed because it is absent from an
    // unauthenticated listing is unreliable and can wipe a whole repository.
    // Enable only once the monitor reads GitHub with a real token.
    REPOSITORY_MONITOR_CLOSE_DETECTION: z.coerce.boolean().default(false),
  });

export type RepositoryEnv = z.infer<typeof repositoryEnvSchema>;


