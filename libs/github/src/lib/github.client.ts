import { Injectable } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  GitHubComment,
  GitHubContent,
  GitHubIssue,
  GitHubIssueListQuery,
  GitHubPage,
  GitHubPageInfo,
  GitHubPullRequest,
  GitHubRepository,
  GitHubRepositoryListQuery,
  GitHubUser,
  GitHubClientOptions,
  GitHubContentSchema,
  GitHubIssueSchema,
  GitHubCommentSchema,
  GitHubPullRequestSchema,
  GitHubRepositorySchema,
  GitHubUserSchema,
  GitHubOAuthTokenSchema,
} from './github.types';
import { GitHubApiError, GitHubRateLimitError, GitHubResponseValidationError } from './github.errors';

interface GitHubRequestOptions {
  token?: string;
  params?: Record<string, string | number | boolean>;
  accept?: string;
}

@Injectable()
export class GitHubClient {
  private readonly http: AxiosInstance;

  constructor(private readonly options: GitHubClientOptions) {
    this.http = axios.create({
      baseURL: options.apiBaseUrl.replace(/\/$/, ''),
      timeout: options.timeoutMs,
      maxRedirects: 3,
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': options.apiVersion,
        'User-Agent': 'opensource-copilot-repository-service',
      },
    });
  }

  async exchangeOAuthCode(
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string,
  ): Promise<string> {
    try {
      const response = await axios.post<unknown>(
        'https://github.com/login/oauth/access_token',
        { client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri },
        {
          timeout: this.options.timeoutMs,
          headers: {
            Accept: 'application/json',
            'User-Agent': 'opensource-copilot-repository-service',
          },
        },
      );
      return this.parse(GitHubOAuthTokenSchema, response.data, '/login/oauth/access_token').access_token;
    } catch (error) {
      if (error instanceof GitHubResponseValidationError) throw error;
      throw this.toApiError(error);
    }
  }

  async getAuthenticatedUser(token: string): Promise<GitHubUser> {
    const response = await this.request<unknown>({ method: 'GET', url: '/user', token });
    return this.parse(GitHubUserSchema, response.data, '/user');
  }

  async listAccessibleRepositories(
    token: string,
    query: GitHubRepositoryListQuery,
  ): Promise<GitHubPage<GitHubRepository>> {
    const response = await this.request<unknown[]>({
      method: 'GET',
      url: '/user/repos',
      token,
      params: {
        visibility: 'all',
        affiliation: 'owner,collaborator,organization_member',
        sort: 'full_name',
        direction: 'asc',
        page: query.page,
        per_page: query.perPage,
      },
    });
    const items = this.parseArray(GitHubRepositorySchema, response.data, '/user/repos');
    const filtered = query.search
      ? items.filter((repository) => repository.full_name.toLowerCase().includes(query.search!.toLowerCase()))
      : items;
    return { items: filtered, pageInfo: this.pageInfo(response, query.page, query.perPage, items.length) };
  }

  async getRepository(token: string | undefined, owner: string, name: string): Promise<GitHubRepository> {
    const response = await this.request<unknown>({
      method: 'GET',
      url: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
      token,
    });
    return this.parse(GitHubRepositorySchema, response.data, `/repos/${owner}/${name}`);
  }

  async getRepositoryById(token: string, githubRepositoryId: bigint): Promise<GitHubRepository> {
    const response = await this.request<unknown>({
      method: 'GET',
      url: `/repositories/${githubRepositoryId.toString()}`,
      token,
    });
    return this.parse(GitHubRepositorySchema, response.data, `/repositories/${githubRepositoryId.toString()}`);
  }

  async getReadme(token: string | undefined, owner: string, name: string): Promise<GitHubContent | null> {
    return this.getOptionalContent(token, owner, name, 'README.md', '/readme');
  }

  async getContents(token: string | undefined, owner: string, name: string, path: string): Promise<GitHubContent | null> {
    return this.getOptionalContent(token, owner, name, path, `/contents/${path}`);
  }

  async getFile(token: string | undefined, owner: string, name: string, path: string): Promise<GitHubContent | null> {
    return this.getOptionalContent(token, owner, name, path, `/contents/${path}`);
  }

  async listIssues(
    token: string | undefined,
    owner: string,
    name: string,
    query: GitHubIssueListQuery,
  ): Promise<GitHubPage<GitHubIssue>> {
    const response = await this.request<unknown[]>({
      method: 'GET',
      url: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues`,
      token,
      params: { state: query.state, page: query.page, per_page: query.perPage, sort: 'created', direction: 'asc' },
    });
    const items = this.parseArray(GitHubIssueSchema, response.data, `/repos/${owner}/${name}/issues`)
      .filter((issue) => issue.pull_request === undefined);
    return { items, pageInfo: this.pageInfo(response, query.page, query.perPage, items.length) };
  }

  async getIssue(token: string | undefined, owner: string, name: string, issueNumber: number): Promise<GitHubIssue> {
    const response = await this.request<unknown>({
      method: 'GET',
      url: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues/${issueNumber}`,
      token,
    });
    return this.parse(GitHubIssueSchema, response.data, `/repos/${owner}/${name}/issues/${issueNumber}`);
  }

  async listIssueComments(token: string | undefined, owner: string, name: string, issueNumber: number): Promise<GitHubComment[]> {
    const response = await this.request<unknown[]>({
      method: 'GET',
      url: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues/${issueNumber}/comments`,
      token,
      params: { page: 1, per_page: 100 },
    });
    return this.parseArray(GitHubCommentSchema, response.data, `/repos/${owner}/${name}/issues/${issueNumber}/comments`);
  }

  async listPullRequests(token: string | undefined, owner: string, name: string): Promise<GitHubPullRequest[]> {
    const response = await this.request<unknown[]>({
      method: 'GET',
      url: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls`,
      token,
      params: { state: 'open', page: 1, per_page: 100 },
    });
    return this.parseArray(GitHubPullRequestSchema, response.data, `/repos/${owner}/${name}/pulls`);
  }

  private async getOptionalContent(
    token: string | undefined,
    owner: string,
    name: string,
    path: string,
    endpoint: string,
  ): Promise<GitHubContent | null> {
    try {
      const response = await this.request<unknown>({
        method: 'GET',
        url: path === 'README.md'
          ? `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/readme`
          : `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`,
        token,
      });
      return this.parse(GitHubContentSchema, response.data, `/repos/${owner}/${name}${endpoint}`);
    } catch (error) {
      if (error instanceof GitHubApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  private async request<T>(config: AxiosRequestConfig & GitHubRequestOptions): Promise<AxiosResponse<T>> {
    let attempt = 0;
    while (true) {
      try {
        return await this.http.request<T>({
          ...config,
          headers: {
            ...(config.headers ?? {}),
            ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
            Accept: config.accept ?? 'application/vnd.github+json',
          },
        });
      } catch (error) {
        const mapped = this.toApiError(error);
        if (!this.isRetryable(mapped) || attempt >= this.options.maxRetries) {
          throw mapped;
        }
        const delay = this.retryDelay(attempt, mapped);
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt += 1;
      }
    }
  }

  private toApiError(error: unknown): GitHubApiError {
    if (error instanceof GitHubApiError) {
      return error;
    }
    if (!axios.isAxiosError(error)) {
      return new GitHubApiError(0, 'GITHUB_NETWORK_ERROR');
    }
    const axiosError = error as AxiosError<unknown>;
    const response = axiosError.response;
    if (!response) {
      return new GitHubApiError(0, 'GITHUB_NETWORK_ERROR');
    }
    const retryAfter = this.headerNumber(response.headers['retry-after']);
    const remaining = response.headers['x-ratelimit-remaining'];
    if (response.status === 429 || (response.status === 403 && remaining === '0')) {
      return new GitHubRateLimitError(response.status, retryAfter);
    }
    return new GitHubApiError(response.status, `GITHUB_HTTP_${response.status}`);
  }

  private isRetryable(error: GitHubApiError): boolean {
    return error instanceof GitHubRateLimitError || error.status === 0 || error.status >= 500;
  }

  private retryDelay(attempt: number, error: GitHubApiError): number {
    if (error.retryAfterSeconds !== null) {
      return Math.min(error.retryAfterSeconds * 1_000, this.options.maxRetryDelayMs);
    }
    return Math.min(this.options.retryBaseDelayMs * 2 ** attempt, this.options.maxRetryDelayMs);
  }

  private parse<T>(schema: { safeParse: (value: unknown) => { success: boolean; data?: T } }, value: unknown, endpoint: string): T {
    const result = schema.safeParse(value);
    if (!result.success || result.data === undefined) {
      throw new GitHubResponseValidationError(endpoint);
    }
    return result.data;
  }

  private parseArray<T>(schema: { safeParse: (value: unknown) => { success: boolean; data?: T } }, value: unknown, endpoint: string): T[] {
    if (!Array.isArray(value)) {
      throw new GitHubResponseValidationError(endpoint);
    }
    return value.map((item) => this.parse(schema, item, endpoint));
  }

  private pageInfo(response: AxiosResponse<unknown>, page: number, perPage: number, itemCount: number): GitHubPageInfo {
    const link = response.headers['link'];
    const nextPage = typeof link === 'string' ? this.parseNextPage(link) : null;
    return { page, perPage, hasNext: nextPage !== null || itemCount === perPage, nextPage };
  }

  private parseNextPage(link: string): number | null {
    const next = link.split(',').find((part) => /rel="next"/.test(part));
    if (!next) return null;
    const match = next.match(/[?&]page=(\d+)/);
    return match ? Number.parseInt(match[1], 10) : null;
  }

  private headerNumber(value: unknown): number | null {
    if (Array.isArray(value)) value = value[0];
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
