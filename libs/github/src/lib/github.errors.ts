export class GitHubApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message = 'GitHub API request failed',
    public readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

export class GitHubRateLimitError extends GitHubApiError {
  constructor(
    status: number,
    retryAfterSeconds: number | null,
  ) {
    super(status, 'GITHUB_RATE_LIMITED', 'GitHub API rate limit reached', retryAfterSeconds);
    this.name = 'GitHubRateLimitError';
  }
}

export class GitHubResponseValidationError extends Error {
  constructor(public readonly endpoint: string) {
    super('GitHub returned an invalid response');
    this.name = 'GitHubResponseValidationError';
  }
}
