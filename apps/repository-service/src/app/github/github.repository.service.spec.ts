import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { GitHubApiError } from '@osc/github';
import { GitHubRepositoryService } from './github.repository.service';

const githubRepository = {
  id: 123,
  name: 'copilot',
  full_name: 'acme/copilot',
  owner: { login: 'acme' },
  description: 'A repository',
  html_url: 'https://github.com/acme/copilot',
  stargazers_count: 12,
  forks_count: 2,
  language: 'TypeScript',
  topics: ['copilot'],
  license: { spdx_id: 'MIT' },
  default_branch: 'main',
  open_issues_count: 3,
  permissions: { pull: true, push: true },
};

function makeService() {
  const github = {
    listAccessibleRepositories: jest.fn(),
    getRepositoryById: jest.fn(),
    getRepository: jest.fn(),
    getReadme: jest.fn().mockResolvedValue(null),
    getFile: jest.fn().mockResolvedValue(null),
    listIssues: jest.fn().mockResolvedValue({ items: [], pageInfo: { page: 1, perPage: 100, hasNext: false, nextPage: null } }),
  };
  const sessions = { requireSession: jest.fn().mockResolvedValue({ sessionId: 's', userId: 'u', token: 't', githubUserId: 7n, username: 'octocat', expiresAt: new Date().toISOString() }) };
  const tx = {
    repository: { upsert: jest.fn().mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111', githubRepositoryId: 123n, owner: 'acme', name: 'copilot', fullName: 'acme/copilot', description: 'A repository', url: 'https://github.com/acme/copilot', stars: 12, forks: 2, language: 'TypeScript', topics: ['copilot'], license: 'MIT', defaultBranch: 'main', openIssuesCount: 3, lastSyncedAt: new Date('2026-01-01T00:00:00.000Z'), createdAt: new Date('2026-01-01T00:00:00.000Z'), updatedAt: new Date('2026-01-01T00:00:00.000Z') }) },
    repositoryAccess: { upsert: jest.fn() },
    repositoryDocument: { upsert: jest.fn() },
    issue: { upsert: jest.fn() },
    issueLabel: { upsert: jest.fn() },
  };
  const prisma = { $transaction: jest.fn(async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx)) };
  const kafka = { publishRaw: jest.fn().mockResolvedValue(undefined) };
  const service = new GitHubRepositoryService(github as never, sessions as never, prisma as never, kafka as never);
  return { service, github, sessions, prisma, tx, kafka };
}

describe('GitHubRepositoryService', () => {
  it('lists only repositories returned for the authenticated session', async () => {
    const { service, github } = makeService();
    github.listAccessibleRepositories.mockResolvedValue({
      items: [githubRepository],
      pageInfo: { page: 1, perPage: 30, hasNext: true, nextPage: 2 },
    });
    await expect(service.listAccessibleRepositories({} as never, { page: 1, perPage: 30 }))
      .resolves.toMatchObject({ items: [{ id: '123', fullName: 'acme/copilot' }], hasNext: true, nextPage: 2 });
    expect(github.listAccessibleRepositories).toHaveBeenCalledWith('t', { page: 1, perPage: 30, search: undefined });
  });

  it('rejects malformed public repository URLs before any API call', async () => {
    const { service, github } = makeService();
    await expect(service.importPublicRepository({ url: 'http://evil.example/acme/copilot' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(github.getRepository).not.toHaveBeenCalled();
  });

  it('imports a public repository without a session token', async () => {
    const { service, github, tx, kafka } = makeService();
    github.getRepository.mockResolvedValue(githubRepository);
    await expect(service.importPublicRepository({ url: 'https://github.com/acme/copilot' }))
      .resolves.toMatchObject({ repository: { id: '123' }, imported: { documents: 0, issues: 0 } });
    expect(github.getRepository).toHaveBeenCalledWith('', 'acme', 'copilot');
    expect(tx.repository.upsert).toHaveBeenCalledTimes(1);
    expect(kafka.publishRaw).toHaveBeenCalledWith(expect.objectContaining({
      topic: 'repository',
      key: '11111111-1111-4111-8111-111111111111',
      event: expect.objectContaining({
        eventType: 'RepositoryImported',
        version: 1,
        repositoryId: '11111111-1111-4111-8111-111111111111',
        githubRepositoryId: '123',
      }),
    }));
  });

  it('keeps repeated imports idempotent through upserts and publishes each synchronization event', async () => {
    const { service, github, tx, kafka } = makeService();
    github.getRepositoryById.mockResolvedValue(githubRepository);
    await service.importRepository({} as never, { githubRepositoryId: '123' });
    await service.importRepository({} as never, { githubRepositoryId: '123' });
    expect(tx.repository.upsert).toHaveBeenCalledTimes(2);
    expect(kafka.publishRaw).toHaveBeenCalledTimes(2);
  });

  it('maps an inaccessible repository to a not-found response', async () => {
    const { service, github } = makeService();
    github.getRepositoryById.mockRejectedValue(new GitHubApiError(404, 'GITHUB_HTTP_404'));
    await expect(service.importRepository({} as never, { githubRepositoryId: '123' }))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps upstream failures to a service-unavailable response', async () => {
    const { service, github } = makeService();
    github.getRepositoryById.mockRejectedValue(new GitHubApiError(503, 'GITHUB_HTTP_503'));
    await expect(service.importRepository({} as never, { githubRepositoryId: '123' }))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
