import { z } from 'zod';

export interface GitHubClientOptions {
  apiBaseUrl: string;
  apiVersion: string;
  timeoutMs: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  maxRetryDelayMs: number;
}

export interface GitHubPageInfo {
  page: number;
  perPage: number;
  hasNext: boolean;
  nextPage: number | null;
}

export interface GitHubPage<T> {
  items: T[];
  pageInfo: GitHubPageInfo;
}

export const GitHubUserSchema = z
  .object({
    id: z.number().int().nonnegative(),
    login: z.string().min(1),
    name: z.string().nullable().optional(),
    avatar_url: z.string().url().nullable().optional(),
    html_url: z.string().url().optional(),
  })
  .passthrough();
export type GitHubUser = z.infer<typeof GitHubUserSchema>;

const GitHubPermissionsSchema = z
  .object({
    admin: z.boolean().optional(),
    maintain: z.boolean().optional(),
    push: z.boolean().optional(),
    triage: z.boolean().optional(),
    pull: z.boolean().optional(),
  })
  .passthrough();

const GitHubLicenseSchema = z
  .object({
    key: z.string().optional(),
    name: z.string().optional(),
    spdx_id: z.string().nullable().optional(),
  })
  .passthrough();

export const GitHubRepositorySchema = z
  .object({
    id: z.number().int().nonnegative(),
    name: z.string().min(1),
    full_name: z.string().min(3),
    owner: z.object({ login: z.string().min(1) }).passthrough(),
    fork: z.boolean().default(false),
    description: z.string().nullable().optional(),
    html_url: z.string().url(),
    stargazers_count: z.number().int().nonnegative().optional(),
    forks_count: z.number().int().nonnegative().optional(),
    language: z.string().nullable().optional(),
    topics: z.array(z.string()).optional(),
    license: GitHubLicenseSchema.nullable().optional(),
    default_branch: z.string().min(1).optional(),
    open_issues_count: z.number().int().nonnegative().optional(),
    permissions: GitHubPermissionsSchema.optional(),
    parent: z
      .object({
        owner: z.object({ login: z.string().min(1) }).passthrough(),
        name: z.string().min(1),
        full_name: z.string().min(3),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
export type GitHubRepository = z.infer<typeof GitHubRepositorySchema>;

export const GitHubContentSchema = z
  .object({
    type: z.enum(['file', 'dir', 'symlink', 'submodule']),
    path: z.string().min(1),
    name: z.string().min(1),
    sha: z.string().min(1),
    size: z.number().int().nonnegative().optional(),
    encoding: z.string().optional(),
    content: z.string().optional(),
    entries: z.array(z.unknown()).optional(),
  })
  .passthrough();
export type GitHubContent = z.infer<typeof GitHubContentSchema>;

export const GitHubTreeEntrySchema = z.object({
  path: z.string().min(1),
  mode: z.string().optional(),
  type: z.enum(['blob', 'tree', 'commit']),
  sha: z.string().min(1),
  size: z.number().int().nonnegative().optional(),
  url: z.string().url().optional(),
}).passthrough();
export type GitHubTreeEntry = z.infer<typeof GitHubTreeEntrySchema>;

export const GitHubIssueLabelSchema = z
  .object({
    name: z.string().min(1),
    color: z.string().min(1),
  })
  .passthrough();

export const GitHubIssueSchema = z
  .object({
    id: z.number().int().nonnegative(),
    number: z.number().int().positive(),
    title: z.string().min(1),
    body: z.string().nullable().optional(),
    state: z.enum(['open', 'closed']),
    user: z.object({ login: z.string().min(1) }).passthrough().nullable().optional(),
    comments: z.number().int().nonnegative().optional(),
    html_url: z.string().url(),
    closed_at: z.string().datetime({ offset: true }).nullable().optional(),
    labels: z.array(GitHubIssueLabelSchema).optional(),
    pull_request: z.unknown().optional(),
  })
  .passthrough();
export type GitHubIssue = z.infer<typeof GitHubIssueSchema>;

export const GitHubCommentSchema = z
  .object({
    id: z.number().int().nonnegative(),
    body: z.string().nullable().optional(),
    user: z.object({ login: z.string().min(1) }).passthrough().nullable().optional(),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
  })
  .passthrough();
export type GitHubComment = z.infer<typeof GitHubCommentSchema>;

export const GitHubPullRequestSchema = z
  .object({
    id: z.number().int().nonnegative(),
    number: z.number().int().positive(),
    title: z.string().min(1),
    state: z.enum(['open', 'closed']),
    html_url: z.string().url(),
  })
  .passthrough();
export type GitHubPullRequest = z.infer<typeof GitHubPullRequestSchema>;

export interface GitHubRepositoryListQuery {
  page: number;
  perPage: number;
  search?: string;
}

export const GitHubOAuthTokenSchema = z
  .object({
    access_token: z.string().min(1),
    token_type: z.string().min(1),
    scope: z.string().optional(),
  })
  .passthrough();
export type GitHubOAuthToken = z.infer<typeof GitHubOAuthTokenSchema>;

export interface GitHubIssueListQuery {
  page: number;
  perPage: number;
  state: 'open' | 'closed' | 'all';
}
