import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@osc/database';
import { createRepositoryImportedEvent, REPOSITORY_IMPORTED_EVENT_TYPE, REPOSITORY_IMPORTED_EVENT_VERSION, REPOSITORY_IMPORTED_TOPIC } from '@osc/contracts';
import { GITHUB_CLIENT, GitHubApiError, GitHubClient, GitHubRateLimitError, GitHubRepository } from '@osc/github';
import { KafkaProducerService } from '@osc/kafka';
import { getCorrelationId } from '@osc/observability';
import type { Request } from 'express';
import {
  GitHubRepositoryResponse,
  ImportedRepositoryResponse,
  RepositoryIssueResponse,
  ImportRepositoryDto,
  ListRepositoriesQueryDto,
  PublicRepositoryImportDto,
  RepositoryImportResponse,
  RepositoryListResponse,
} from './github.dto';
import { GitHubSession, GitHubSessionService } from './github.session.service';

const DOCUMENT_PATHS = ['README.md', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'SECURITY.md'] as const;

@Injectable()
export class GitHubRepositoryService {
  constructor(
    @Inject(GITHUB_CLIENT) private readonly github: GitHubClient,
    private readonly sessions: GitHubSessionService,
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaProducerService,
  ) {}

  async listAccessibleRepositories(request: Request, query: ListRepositoriesQueryDto): Promise<RepositoryListResponse> {
    const session = await this.sessions.requireSession(request);
    try {
      const page = await this.github.listAccessibleRepositories(session.token, {
        page: query.page,
        perPage: query.perPage,
        search: query.search,
      });
      return {
        items: page.items.map((repository) => this.mapRepository(repository)),
        page: page.pageInfo.page,
        perPage: page.pageInfo.perPage,
        hasNext: page.pageInfo.hasNext,
        nextPage: page.pageInfo.nextPage,
      };
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  async importRepository(request: Request, input: ImportRepositoryDto): Promise<RepositoryImportResponse> {
    const session = await this.sessions.requireSession(request);
    const githubRepositoryId = this.parseGitHubId(input.githubRepositoryId);
    let repository: GitHubRepository;
    try {
      repository = await this.github.getRepositoryById(session.token, githubRepositoryId);
    } catch (error) {
      throw this.toHttpError(error);
    }
    return this.importFromGitHub(session, repository);
  }

  async importPublicRepository(input: PublicRepositoryImportDto): Promise<RepositoryImportResponse> {
    const parsed = this.parseRepositoryUrl(input.url);
    try {
      const repository = await this.github.getRepository('', parsed.owner, parsed.name);
      return this.importFromGitHub(null, repository);
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  async getImportedRepository(request: Request, repositoryId: string): Promise<ImportedRepositoryResponse> {
    const session = await this.sessions.requireSession(request);
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, accessEntries: { some: { userId: session.userId } } },
    });
    if (!repository) throw new NotFoundException('Repository not found');
    return this.mapStoredRepository(repository);
  }

  async listRepositoryIssues(request: Request, repositoryId: string) {
    const session = await this.sessions.requireSession(request);
    const issues = await this.prisma.issue.findMany({
      where: { repositoryId, state: 'open', repository: { accessEntries: { some: { userId: session.userId } } } },
      orderBy: [{ updatedAt: 'desc' }, { number: 'asc' }, { id: 'asc' }],
      take: 1000,
      include: { labels: true },
    });
    return { repositoryId, issues: issues.map((issue) => this.mapIssue(issue)) };
  }

  async getIssue(request: Request, issueId: string): Promise<RepositoryIssueResponse> {
    const session = await this.sessions.requireSession(request);
    const issue = await this.prisma.issue.findFirst({
      where: { id: issueId, repository: { accessEntries: { some: { userId: session.userId } } } },
      include: { labels: true },
    });
    if (!issue) throw new NotFoundException('Issue not found');
    return this.mapIssue(issue);
  }

  private async importFromGitHub(session: GitHubSession | null, githubRepository: GitHubRepository): Promise<RepositoryImportResponse> {
    const owner = githubRepository.owner.login;
    const name = githubRepository.name;
    const token = session?.token;
    const [documents, issues] = await Promise.all([
      this.fetchDocuments(token, owner, name),
      this.fetchIssues(token, owner, name),
    ]);

    const result = await this.prisma.$transaction(async (tx) => {
      const repository = await tx.repository.upsert({
        where: { githubRepositoryId: BigInt(githubRepository.id) },
        create: this.repositoryCreateData(githubRepository),
        update: this.repositoryUpdateData(githubRepository),
      });
      if (session) {
        await tx.repositoryAccess.upsert({
          where: { userId_repositoryId: { userId: session.userId, repositoryId: repository.id } },
          create: { userId: session.userId, repositoryId: repository.id, accessLevel: this.accessLevel(githubRepository) },
          update: { accessLevel: this.accessLevel(githubRepository) },
        });
      }
      let labels = 0;
      for (const document of documents) {
        await tx.repositoryDocument.upsert({
          where: { repositoryId_path: { repositoryId: repository.id, path: document.path } },
          create: { repositoryId: repository.id, documentType: document.documentType, path: document.path, content: document.content, sha: document.sha },
          update: { documentType: document.documentType, content: document.content, sha: document.sha },
        });
      }
      for (const issue of issues) {
        const storedIssue = await tx.issue.upsert({
          where: { githubIssueId: BigInt(issue.githubIssueId) },
          create: {
            repositoryId: repository.id,
            githubIssueId: BigInt(issue.githubIssueId),
            number: issue.number,
            title: issue.title,
            body: issue.body,
            state: issue.state,
            author: issue.author,
            commentsCount: issue.commentsCount,
            url: issue.url,
            closedAt: issue.closedAt,
          },
          update: {
            repositoryId: repository.id,
            number: issue.number,
            title: issue.title,
            body: issue.body,
            state: issue.state,
            author: issue.author,
            commentsCount: issue.commentsCount,
            url: issue.url,
            closedAt: issue.closedAt,
          },
        });
        for (const label of issue.labels) {
          await tx.issueLabel.upsert({
            where: { issueId_name: { issueId: storedIssue.id, name: label.name } },
            create: { issueId: storedIssue.id, name: label.name, color: label.color },
            update: { color: label.color },
          });
          labels += 1;
        }
      }
      return { repository, labels };
    });

    const event = createRepositoryImportedEvent({
      repositoryId: result.repository.id,
      githubRepositoryId: githubRepository.id.toString(),
      correlationId: getCorrelationId() ?? randomUUID(),
    });
    await this.kafka.publishRaw({
      topic: REPOSITORY_IMPORTED_TOPIC,
      eventType: REPOSITORY_IMPORTED_EVENT_TYPE,
      version: REPOSITORY_IMPORTED_EVENT_VERSION,
      key: result.repository.id,
      event,
    });
    return {
      repository: this.mapStoredRepository(result.repository),
      imported: { documents: documents.length, issues: issues.length, labels: result.labels },
    };
  }

  private async fetchDocuments(token: string | undefined, owner: string, name: string): Promise<Array<{ documentType: string; path: string; content: string; sha: string }>> {
    const documents: Array<{ documentType: string; path: string; content: string; sha: string }> = [];
    for (const path of DOCUMENT_PATHS) {
      const document = path === 'README.md'
        ? await this.github.getReadme(token, owner, name)
        : await this.github.getFile(token, owner, name, path);
      if (!document || document.type !== 'file') continue;
      documents.push({
        documentType: path === 'README.md' ? 'readme' : 'repository-guide',
        path: document.path,
        content: this.decodeContent(document.content, document.encoding),
        sha: document.sha,
      });
    }
    return documents;
  }

  private async fetchIssues(token: string | undefined, owner: string, name: string): Promise<Array<{
    githubIssueId: number;
    number: number;
    title: string;
    body: string | null;
    state: string;
    author: string | null;
    commentsCount: number;
    url: string;
    closedAt: Date | null;
    labels: Array<{ name: string; color: string }>;
  }>> {
    const page = await this.github.listIssues(token, owner, name, { page: 1, perPage: 100, state: 'all' });
    return page.items.map((issue) => ({
      githubIssueId: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body ?? null,
      state: issue.state,
      author: issue.user?.login ?? null,
      commentsCount: issue.comments ?? 0,
      url: issue.html_url,
      closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
      labels: (issue.labels ?? []).map((label) => ({ name: label.name, color: label.color })),
    }));
  }

  private decodeContent(content: string | undefined, encoding: string | undefined): string {
    if (!content) return '';
    if (encoding?.toLowerCase() !== 'base64') return content;
    return Buffer.from(content.replace(/\s/g, ''), 'base64').toString('utf8');
  }

  private parseGitHubId(value: string): bigint {
    if (!/^\d+$/.test(value)) throw new BadRequestException('githubRepositoryId must be a positive integer');
    const parsed = BigInt(value);
    if (parsed <= 0n) throw new BadRequestException('githubRepositoryId must be a positive integer');
    return parsed;
  }

  private parseRepositoryUrl(value: string): { owner: string; name: string } {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new BadRequestException('Repository URL is invalid');
    }
    if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== 'github.com') {
      throw new BadRequestException('Repository URL must be an HTTPS github.com URL');
    }
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length !== 2 || !segments[0] || !segments[1]) {
      throw new BadRequestException('Repository URL must have the form https://github.com/owner/name');
    }
    return { owner: segments[0], name: segments[1].replace(/\.git$/, '') };
  }

  private repositoryCreateData(repository: GitHubRepository) {
    return {
      githubRepositoryId: BigInt(repository.id),
      owner: repository.owner.login,
      name: repository.name,
      fullName: repository.full_name,
      description: repository.description ?? null,
      url: repository.html_url,
      stars: repository.stargazers_count ?? 0,
      forks: repository.forks_count ?? 0,
      language: repository.language ?? null,
      topics: repository.topics ?? [],
      license: repository.license?.spdx_id ?? repository.license?.key ?? null,
      defaultBranch: repository.default_branch ?? 'main',
      openIssuesCount: repository.open_issues_count ?? 0,
      lastSyncedAt: new Date(),
    };
  }

  private repositoryUpdateData(repository: GitHubRepository) {
    const data = this.repositoryCreateData(repository);
    return {
      owner: data.owner,
      name: data.name,
      fullName: data.fullName,
      description: data.description,
      url: data.url,
      stars: data.stars,
      forks: data.forks,
      language: data.language,
      topics: data.topics,
      license: data.license,
      defaultBranch: data.defaultBranch,
      openIssuesCount: data.openIssuesCount,
      lastSyncedAt: data.lastSyncedAt,
    };
  }

  private accessLevel(repository: GitHubRepository): string {
    const permissions = repository.permissions;
    if (permissions?.admin) return 'admin';
    if (permissions?.maintain) return 'maintain';
    if (permissions?.push) return 'write';
    if (permissions?.triage) return 'triage';
    return 'read';
  }

  private mapStoredRepository(repository: {
    id: string; githubRepositoryId: bigint; owner: string; name: string; fullName: string;
    description: string | null; url: string; stars: number; forks: number; language: string | null;
    topics: string[]; license: string | null; defaultBranch: string; openIssuesCount: number;
    lastSyncedAt: Date | null; createdAt: Date; updatedAt: Date;
  }): ImportedRepositoryResponse {
    return { id: repository.githubRepositoryId.toString(), githubRepositoryId: repository.githubRepositoryId.toString(),
      repositoryId: repository.id, owner: repository.owner, name: repository.name, fullName: repository.fullName,
      description: repository.description, url: repository.url, stars: repository.stars, forks: repository.forks,
      language: repository.language, topics: repository.topics, license: repository.license, defaultBranch: repository.defaultBranch,
      openIssuesCount: repository.openIssuesCount, lastSyncedAt: repository.lastSyncedAt?.toISOString() ?? null,
      createdAt: repository.createdAt.toISOString(), updatedAt: repository.updatedAt.toISOString(), };
  }

  private mapIssue(issue: { id: string; repositoryId: string; githubIssueId: bigint; number: number; title: string; body: string | null; state: string; author: string | null; commentsCount: number; url: string; createdAt: Date; updatedAt: Date; closedAt: Date | null; labels: Array<{ id: string; name: string; color: string }> }): RepositoryIssueResponse {
    return { ...issue, githubIssueId: issue.githubIssueId.toString(), createdAt: issue.createdAt.toISOString(), updatedAt: issue.updatedAt.toISOString(), closedAt: issue.closedAt?.toISOString() ?? null, labels: issue.labels.map((label) => ({ id: label.id, name: label.name, color: label.color })) };
  }

  private mapRepository(repository: GitHubRepository): GitHubRepositoryResponse {
    return {
      id: String(repository.id),
      owner: repository.owner.login,
      name: repository.name,
      fullName: repository.full_name,
      description: repository.description ?? null,
      url: repository.html_url,
      stars: repository.stargazers_count ?? 0,
      forks: repository.forks_count ?? 0,
      language: repository.language ?? null,
      topics: repository.topics ?? [],
      license: repository.license?.spdx_id ?? repository.license?.key ?? null,
      defaultBranch: repository.default_branch ?? 'main',
      openIssuesCount: repository.open_issues_count ?? 0,
    };
  }

  private toHttpError(error: unknown): Error {
    if (!(error instanceof GitHubApiError)) return new ServiceUnavailableException('GitHub API request failed');
    if (error instanceof GitHubRateLimitError) return new ServiceUnavailableException('GitHub API rate limit reached');
    if (error.status === 401) return new ForbiddenException('GitHub rejected the access token');
    if (error.status === 403) return new ForbiddenException('GitHub access was denied');
    if (error.status === 404) return new NotFoundException('GitHub repository was not found or is inaccessible');
    if (error.status === 422) return new BadRequestException('GitHub rejected the request');
    return new ServiceUnavailableException('GitHub API is unavailable');
  }
}



