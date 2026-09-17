import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { TypedConfigService } from '@osc/config';
import { PrismaService } from '@osc/database';
import { GITHUB_CLIENT, GitHubClient, GitHubIssue, GitHubRateLimitError } from '@osc/github';
import { NotificationsService, type MonitorEvent } from './notifications.service';
import type { RepositoryEnv } from './env';

interface MonitoredRepository {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  accessEntries: Array<{ userId: string }>;
}

interface KnownIssue {
  id: string;
  githubIssueId: bigint;
  number: number;
  title: string;
  state: string;
  commentsCount: number;
  url: string;
}

/** Newest comments to announce for one issue in one cycle, so a burst of activity cannot flood the bell. */
const MAX_COMMENT_EVENTS_PER_ISSUE = 5;
/** Hard ceiling on issue-list pages per repository, so one huge repo cannot consume a whole cycle. */
const MAX_ISSUE_PAGES = 20;

/**
 * Background monitor for repositories the user has imported/analysed.
 *
 * Detects, purely from GitHub API + database state (no LLM anywhere in this
 * path):
 *   - a new issue appearing,
 *   - a new comment on an issue we already track,
 *   - an issue being closed, reopened, or retitled.
 *
 * Everything it raises goes through NotificationsService, where the
 * (userId, dedupeKey) unique constraint makes repeated polls idempotent.
 *
 * Runs unauthenticated: monitored repositories are public open-source
 * projects, and this avoids persisting any user's GitHub token outside their
 * short-lived session. Unauthenticated GitHub limits are low, so each cycle
 * spends a bounded number of requests and picks up where it left off.
 */
@Injectable()
export class RepositoryMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RepositoryMonitorService.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private requestsThisCycle = 0;

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

  /**
   * One monitoring cycle. A repository counts as monitored as soon as any
   * user has imported it - that import is what "the user analysed this
   * repository" already persists, so no separate opt-in state is needed.
   */
  async checkMonitoredRepositories(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.requestsThisCycle = 0;
    const budget = this.config.get('REPOSITORY_MONITOR_MAX_REQUESTS_PER_CYCLE');
    try {
      const repositories = await this.prisma.repository.findMany({
        where: { accessEntries: { some: {} } },
        select: { id: true, owner: true, name: true, fullName: true, accessEntries: { select: { userId: true } } },
        // Least-recently-checked first, so a fixed request budget still gives
        // every repository a turn across cycles.
        orderBy: [{ lastIssueCheckAt: { sort: 'asc', nulls: 'first' } }],
      });
      for (const repository of repositories) {
        if (this.requestsThisCycle >= budget) {
          this.logger.log(`Repository monitor hit its per-cycle request budget (${budget}); remaining repositories resume next cycle`);
          break;
        }
        try {
          await this.checkRepository(repository, budget);
        } catch (error) {
          if (error instanceof GitHubRateLimitError) {
            this.logger.warn('GitHub rate limit reached while monitoring; resuming next cycle');
            break;
          }
          this.logger.warn(`Failed to check ${repository.fullName}: ${this.safeErrorMessage(error)}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Repository monitor cycle failed: ${this.safeErrorMessage(error)}`);
    } finally {
      this.running = false;
    }
  }

  private async checkRepository(repository: MonitoredRepository, budget: number): Promise<void> {
    const userIds = repository.accessEntries.map((entry) => entry.userId);
    const { issues: openIssues, complete } = await this.fetchOpenIssues(repository.owner, repository.name, budget);

    const known = await this.prisma.issue.findMany({
      where: { repositoryId: repository.id },
      select: { id: true, githubIssueId: true, number: true, title: true, state: true, commentsCount: true, url: true },
    });
    const knownByGithubId = new Map<string, KnownIssue>(known.map((issue) => [issue.githubIssueId.toString(), issue]));
    const seenGithubIds = new Set<string>();
    const events: MonitorEvent[] = [];

    for (const issue of openIssues) {
      seenGithubIds.add(String(issue.id));
      const existing = knownByGithubId.get(String(issue.id));
      if (!existing) {
        const stored = await this.storeNewIssue(repository.id, issue);
        events.push({
          type: 'new_issue',
          repositoryId: repository.id,
          repositoryFullName: repository.fullName,
          issueId: stored.id,
          issueNumber: issue.number,
          issueTitle: issue.title,
          githubUrl: issue.html_url,
          message: `New issue in ${repository.fullName}: ${issue.title}`,
          dedupeKey: `issue:${issue.id}`,
        });
        continue;
      }
      events.push(...(await this.detectIssueChanges(repository, existing, issue, budget)));
    }

    // An issue we hold as open that GitHub no longer lists as open was closed
    // (or deleted). Only trusted when the listing completed - a truncated or
    // budget-capped fetch would otherwise look like a mass closure.
    if (complete) {
      for (const existing of known) {
        if (existing.state !== 'open' || seenGithubIds.has(existing.githubIssueId.toString())) continue;
        await this.prisma.issue.update({
          where: { id: existing.id },
          data: { state: 'closed', closedAt: new Date() },
        });
        events.push({
          type: 'issue_closed',
          repositoryId: repository.id,
          repositoryFullName: repository.fullName,
          issueId: existing.id,
          issueNumber: existing.number,
          issueTitle: existing.title,
          githubUrl: existing.url,
          message: `Issue #${existing.number} in ${repository.fullName} was closed`,
          dedupeKey: `state:${existing.githubIssueId}:closed`,
        });
      }
    }

    const created = await this.notifications.recordEvents(events, userIds);
    if (created > 0) {
      this.logger.log(`${repository.fullName}: ${events.length} event(s) detected, ${created} notification(s) created`);
    }
    await this.prisma.repository.update({ where: { id: repository.id }, data: { lastIssueCheckAt: new Date() } });
  }

  /** Compares one already-known issue against its current GitHub state. */
  private async detectIssueChanges(
    repository: MonitoredRepository,
    existing: KnownIssue,
    issue: GitHubIssue,
    budget: number,
  ): Promise<MonitorEvent[]> {
    const events: MonitorEvent[] = [];
    const base = {
      repositoryId: repository.id,
      repositoryFullName: repository.fullName,
      issueId: existing.id,
      issueNumber: issue.number,
      issueTitle: issue.title,
      githubUrl: issue.html_url,
    };

    if (existing.state !== 'open') {
      events.push({
        ...base,
        type: 'issue_reopened',
        message: `Issue #${issue.number} in ${repository.fullName} was reopened`,
        dedupeKey: `state:${issue.id}:reopened:${issue.updated_at ?? ''}`,
      });
    }

    if (existing.title !== issue.title) {
      events.push({
        ...base,
        type: 'issue_retitled',
        message: `Issue #${issue.number} in ${repository.fullName} was renamed to "${issue.title}"`,
        dedupeKey: `title:${issue.id}:${issue.title}`,
      });
    }

    const currentComments = issue.comments ?? 0;
    if (currentComments > existing.commentsCount && this.requestsThisCycle < budget) {
      events.push(...(await this.detectNewComments(repository, existing, issue, currentComments)));
    }

    await this.prisma.issue.update({
      where: { id: existing.id },
      data: {
        title: issue.title,
        body: issue.body ?? null,
        state: issue.state,
        commentsCount: currentComments,
        url: issue.html_url,
        closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
      },
    });
    return events;
  }

  /**
   * Fetches only the newest page of comments (they come back oldest-first, so
   * the last page holds what is new) and raises one event per comment id.
   * Dedup is by comment id, so a miscounted delta can never double-notify.
   */
  private async detectNewComments(
    repository: MonitoredRepository,
    existing: KnownIssue,
    issue: GitHubIssue,
    currentComments: number,
  ): Promise<MonitorEvent[]> {
    const lastPage = Math.max(1, Math.ceil(currentComments / 100));
    this.requestsThisCycle += 1;
    const comments = await this.github.listIssueComments(undefined, repository.owner, repository.name, issue.number, lastPage);
    const newCount = Math.min(currentComments - existing.commentsCount, MAX_COMMENT_EVENTS_PER_ISSUE);
    const newest = comments.slice(-newCount);
    return newest.map((comment) => ({
      type: 'new_comment' as const,
      repositoryId: repository.id,
      repositoryFullName: repository.fullName,
      issueId: existing.id,
      issueNumber: issue.number,
      issueTitle: issue.title,
      githubUrl: issue.html_url,
      message: `New comment on issue #${issue.number} in ${repository.fullName}${comment.user?.login ? ` by ${comment.user.login}` : ''}`,
      dedupeKey: `comment:${comment.id}`,
    }));
  }

  private async storeNewIssue(repositoryId: string, issue: GitHubIssue) {
    const stored = await this.prisma.issue.create({
      data: {
        repositoryId,
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
    return stored;
  }

  /**
   * Walks the open-issue listing within the cycle's remaining request budget.
   * `complete` reports whether the whole listing was seen, which is what the
   * closed-issue detection above depends on.
   */
  private async fetchOpenIssues(owner: string, name: string, budget: number): Promise<{ issues: GitHubIssue[]; complete: boolean }> {
    const issues: GitHubIssue[] = [];
    let page = 1;
    for (let visited = 0; visited < MAX_ISSUE_PAGES; visited += 1) {
      if (this.requestsThisCycle >= budget) return { issues, complete: false };
      this.requestsThisCycle += 1;
      const result = await this.github.listIssues(undefined, owner, name, { page, perPage: 100, state: 'open' });
      issues.push(...result.items);
      if (!result.pageInfo.hasNext) return { issues, complete: true };
      page = result.pageInfo.nextPage ?? page + 1;
    }
    return { issues, complete: false };
  }

  private safeErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error';
  }
}
