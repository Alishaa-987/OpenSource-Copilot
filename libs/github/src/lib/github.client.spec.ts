import axios from 'axios';
import { AxiosError } from 'axios';
import { GitHubClient } from './github.client';
import { GitHubRateLimitError, GitHubResponseValidationError } from './github.errors';

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return { ...actual, default: actual, create: jest.fn() };
});

describe('GitHubClient', () => {
  const request = jest.fn();
  let client: GitHubClient;

  beforeEach(() => {
    request.mockReset();
    (axios.create as jest.Mock).mockReturnValue({ request });
    client = new GitHubClient({
      apiBaseUrl: 'https://api.github.com',
      apiVersion: '2026-03-10',
      timeoutMs: 100,
      maxRetries: 1,
      retryBaseDelayMs: 0,
      maxRetryDelayMs: 0,
    });
  });

  it('sends bearer authentication and follows the next-page link', async () => {
    request.mockResolvedValue({
      data: [{
        id: 101,
        name: 'copilot',
        full_name: 'acme/copilot',
        owner: { login: 'acme' },
        html_url: 'https://github.com/acme/copilot',
        topics: [],
      }],
      headers: { link: '<https://api.github.com/user/repos?page=2>; rel="next"' },
    });
    const result = await client.listAccessibleRepositories('secret-token', { page: 1, perPage: 1 });
    expect(result.items).toHaveLength(1);
    expect(result.pageInfo.nextPage).toBe(2);
    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/user/repos',
      headers: expect.objectContaining({ Authorization: 'Bearer secret-token' }),
    }));
  });

  it('rejects malformed GitHub payloads before persistence mapping', async () => {
    request.mockResolvedValue({ data: [{ id: 'not-a-number' }], headers: {} });
    await expect(client.listAccessibleRepositories('token', { page: 1, perPage: 30 }))
      .rejects.toBeInstanceOf(GitHubResponseValidationError);
  });

  it('retries transient HTTP errors with bounded retry policy', async () => {
    const error = { response: { status: 503, headers: {} } };
    request.mockRejectedValueOnce(error).mockResolvedValueOnce({ data: { id: 10, login: 'octocat' }, headers: {} });
    await expect(client.getAuthenticatedUser('token')).resolves.toEqual({ id: 10, login: 'octocat' });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('classifies exhausted rate limits without exposing response bodies', async () => {
    const error = Object.assign(new AxiosError('rate limited'), {
      response: { status: 403, headers: { 'x-ratelimit-remaining': '0', 'retry-after': '7' } },
    });
    request.mockRejectedValue(error);
    await expect(client.getAuthenticatedUser('token')).rejects.toBeInstanceOf(GitHubRateLimitError);
    await expect(client.getAuthenticatedUser('token')).rejects.toThrow('rate limit');
  });
});
