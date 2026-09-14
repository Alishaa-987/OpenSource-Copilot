import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { TypedConfigService } from '@osc/config';
import { PrismaService } from '@osc/database';
import { GITHUB_CLIENT, GitHubClient, GitHubIssue, GitHubRateLimitError } from '@osc/github';
import { NotificationsService } from './notifications.service';
import type { RepositoryEnv } from './env';

interface MonitoredRepository {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  accessEntries: Array<{ userId: string }>;
}

/**
 * Background job: periodically re-checks every imported ("monitored")
 * repository for GitHub issues we have not stored yet, and turns each one
 * into a notification for every user who imported that repository.
 *
 * Reuses the existing GitHub client and Prisma service directly rather than
 * introducing a new job runner/queue - there is no existing scheduler in
 * this service, so a single guarded setInterval is the smallest addition
 * that satisfies "periodically check monitored repositories".
 *
 * Runs unauthenticated (no user token): monitored repositories on this
 * platform are public open-source projects, and GitHub's issues endpoint
 * does not require auth for public repos. This avoids needing to persist
 * any user's GitHub token outside their short-lived session.
 */
@Injectable()
export class RepositoryMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RepositoryMonitorService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    @Inject(GITHUB_CLIENT) private readonly github: GitHubClient,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: TypedConfigService<RepositoryEnv>,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('REPOSITORY_MONITOR_ENABLED')) {
      this.logger.log('Repository monitor disabled (REPOSITORY_MONITOR_ENABLED=false)');
      return;
    }
    const intervalMs = this.config.get('REPOSITORY_MONITOR_INTERVAL_MS');
    this.timer = setInterval(() => {
      void this.checkMonitoredRepositories();
    }, intervalMs);
    this.timer.unref?.();
    this.logger.log(`Repository monitor started (interval ${intervalMs}ms)`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async checkMonitoredRepositories(): Promise<void> {
    // A monitored repository is simply one at least one user has imported.
    // Guarding with `running` prevents a slow cycle (many repos, retries)
    // from overlapping with the next scheduled tick.
    if (this.running) return;
    this.running = true;
    try {
      const repositories = await this.prisma.repository.findMany({
        where: { accessEntries: { some: {} } },
        select: { id: true, owner: true, name: true, fullName: true, accessEntries: { select: { userId: true } } },
      });
      for (const repository of repositories) {
        try {
          await this.checkRepository(repository);
        } catch (error) {
          if (error instanceof GitHubRateLimitError) {
            this.logger.warn('GitHub rate limit reached while monitoring repositories; resuming next cycle');
            break;
          }
          this.logger.warn(`Failed to check ${repository.fullName} for new issues: ${this.safeErrorMessage(error)}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Repository monitor cycle failed: ${this.safeErrorMessage(error)}`);
    } finally {
      this.running = false;
    }
  }

  private async checkRepository(repository: MonitoredRepository): Promise<void> {
    const openIssues = await this.fetchAllOpenIssues(repository.owner, repository.name);
    const userIds = repository.accessEntries.map((entry) => entry.userId);
    for (const issue of openIssues) {
      const alreadyKnown = await this.prisma.issue.findUnique({ where: { githubIssueId: BigInt(issue.id) } });
      if (alreadyKnown) continue;
      const stored = await this.prisma.issue.create({
        data: {
          repositoryId: repository.id,
          githubIssueId: BigInt(issue.id),
          number: issue.number,
          title: issue.title,
          body: issue.body ?? null,
          state: issue.state,
          author: issue.user?.login ?? null,
          commentsCount: issue.comments ?? 0,
          url: issue.html_url,
          isUpstream: false,
          closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
        },
      });
      for (const label of issue.labels ?? []) {
        await this.prisma.issueLabel.upsert({
          where: { issueId_name: { issueId: stored.id, name: label.name } },
          create: { issueId: stored.id, name: label.name, color: label.color },
          update: { color: label.color },
        });
      }
      await this.notifications.notifyNewIssue({
        repositoryId: repository.id,
        repositoryFullName: repository.fullName,
        issueId: stored.id,
        issueTitle: stored.title,
        issueUrl: `/issues/${stored.id}`,
        userIds,
      });
    }
    await this.prisma.repository.update({ where: { id: repository.id }, data: { lastIssueCheckAt: new Date() } });
  }

  private async fetchAllOpenIssues(owner: string, name: string): Promise<GitHubIssue[]> {
    const all: GitHubIssue[] = [];
    let page = 1;
    // Safety cap: this only needs to see every currently-open issue, and an
    // unauthenticated caller is rate-limited far below what 20 pages costs.
    for (let requests = 0; requests < 20; requests += 1) {
      const result = await this.github.listIssues(undefined, owner, name, { page, perPage: 100, state: 'open' });
      all.push(...result.items);
      if (!result.pageInfo.hasNext) break;
      page = result.pageInfo.nextPage ?? page + 1;
    }
    return all;
  }

  private safeErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error';
  }
}
