import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@osc/database';

export type ActivityType = 'repository_analyzed' | 'issue_viewed' | 'issue_started' | 'issue_completed';
export type IssueProgressStatus = 'viewed' | 'started' | 'completed';

export interface ProfileRepositorySummary {
  repositoryId: string;
  fullName: string;
  url: string;
  language: string | null;
  topics: string[];
  analyzedAt: string;
  lastIssueCheckAt: string | null;
  issuesViewed: number;
  issuesStarted: number;
  issuesCompleted: number;
}

export interface ProfileIssueSummary {
  issueId: string;
  repositoryId: string;
  repositoryFullName: string;
  number: number;
  title: string;
  url: string;
  state: string;
  status: IssueProgressStatus;
  labels: string[];
  updatedAt: string;
}

export interface ProfileActivityEntry {
  id: string;
  type: ActivityType | string;
  occurredAt: string;
  repositoryFullName: string | null;
  issueNumber: number | null;
  issueTitle: string | null;
}

export interface ProfileStatsResponse {
  user: { id: string; githubUserId: string; username: string; displayName: string | null; avatarUrl: string | null; memberSince: string };
  totals: {
    repositoriesAnalyzed: number;
    issuesViewed: number;
    issuesStarted: number;
    issuesCompleted: number;
  };
  /** Language name -> how many analysed repositories use it. Straight from the repository rows. */
  languageUsage: Array<{ name: string; repositories: number; issuesCompleted: number }>;
  /** Topic/tech tags seen across the repositories worked with. */
  technologies: string[];
  repositories: ProfileRepositorySummary[];
  issues: ProfileIssueSummary[];
  activity: ProfileActivityEntry[];
  /** Daily activity counts for the last 90 days, oldest first. */
  activityByDay: Array<{ date: string; count: number }>;
  streak: { current: number; longest: number; activeDays: number };
}

const ACTIVITY_WINDOW_DAYS = 90;

/**
 * Builds the contributor profile.
 *
 * Everything here is counted directly from the database - repository_access,
 * repositories, issues, issue_progress and contributor_activity. No LLM is
 * involved: these are statistics, not judgements.
 */
@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getStats(userId: string): Promise<ProfileStatsResponse> {
    const [user, accesses, progress, activity] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.repositoryAccess.findMany({
        where: { userId },
        select: {
          createdAt: true,
          repository: { select: { id: true, fullName: true, url: true, language: true, topics: true, lastIssueCheckAt: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.issueProgress.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
      this.prisma.contributorActivity.findMany({
        where: { userId },
        orderBy: { occurredAt: 'desc' },
        take: 500,
      }),
    ]);

    const issueIds = progress.map((row) => row.issueId);
    const issues = issueIds.length === 0 ? [] : await this.prisma.issue.findMany({
      where: { id: { in: issueIds } },
      select: {
        id: true, repositoryId: true, number: true, title: true, url: true, state: true, updatedAt: true,
        labels: { select: { name: true } },
        repository: { select: { fullName: true, language: true } },
      },
    });
    const issueById = new Map(issues.map((issue) => [issue.id, issue]));

    const progressByRepository = new Map<string, { viewed: number; started: number; completed: number }>();
    for (const row of progress) {
      const bucket = progressByRepository.get(row.repositoryId) ?? { viewed: 0, started: 0, completed: 0 };
      bucket.viewed += 1;
      if (row.status === 'started') bucket.started += 1;
      if (row.status === 'completed') bucket.completed += 1;
      progressByRepository.set(row.repositoryId, bucket);
    }

    const repositories: ProfileRepositorySummary[] = accesses.map((access) => {
      const counts = progressByRepository.get(access.repository.id) ?? { viewed: 0, started: 0, completed: 0 };
      return {
        repositoryId: access.repository.id,
        fullName: access.repository.fullName,
        url: access.repository.url,
        language: access.repository.language,
        topics: access.repository.topics,
        analyzedAt: access.createdAt.toISOString(),
        lastIssueCheckAt: access.repository.lastIssueCheckAt?.toISOString() ?? null,
        issuesViewed: counts.viewed,
        issuesStarted: counts.started,
        issuesCompleted: counts.completed,
      };
    });

    // Language usage: repositories per language, plus completions in that
    // language - both are plain counts over rows we already store.
    const languageMap = new Map<string, { repositories: number; issuesCompleted: number }>();
    for (const repository of repositories) {
      if (!repository.language) continue;
      const entry = languageMap.get(repository.language) ?? { repositories: 0, issuesCompleted: 0 };
      entry.repositories += 1;
      entry.issuesCompleted += repository.issuesCompleted;
      languageMap.set(repository.language, entry);
    }

    const technologies = [...new Set(repositories.flatMap((repository) => repository.topics))].slice(0, 40);

    const profileIssues: ProfileIssueSummary[] = progress.flatMap((row) => {
      const issue = issueById.get(row.issueId);
      if (!issue) return [];
      return [{
        issueId: issue.id,
        repositoryId: issue.repositoryId,
        repositoryFullName: issue.repository.fullName,
        number: issue.number,
        title: issue.title,
        url: issue.url,
        state: issue.state,
        status: row.status as IssueProgressStatus,
        labels: issue.labels.map((label) => label.name),
        updatedAt: row.updatedAt.toISOString(),
      }];
    });

    const activityEntries: ProfileActivityEntry[] = activity.map((row) => {
      const metadata = (row.metadata ?? {}) as { repositoryFullName?: string; issueNumber?: number; issueTitle?: string };
      return {
        id: row.id,
        type: row.type,
        occurredAt: row.occurredAt.toISOString(),
        repositoryFullName: metadata.repositoryFullName ?? null,
        issueNumber: metadata.issueNumber ?? null,
        issueTitle: metadata.issueTitle ?? null,
      };
    });

    return {
      user: {
        id: user.id,
        githubUserId: user.githubUserId.toString(),
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        memberSince: user.createdAt.toISOString(),
      },
      totals: {
        repositoriesAnalyzed: repositories.length,
        issuesViewed: progress.length,
        issuesStarted: progress.filter((row) => row.status === 'started').length,
        issuesCompleted: progress.filter((row) => row.status === 'completed').length,
      },
      languageUsage: [...languageMap.entries()]
        .map(([name, value]) => ({ name, ...value }))
        .sort((a, b) => b.repositories - a.repositories || b.issuesCompleted - a.issuesCompleted),
      technologies,
      repositories,
      issues: profileIssues,
      activity: activityEntries.slice(0, 50),
      activityByDay: this.toActivityByDay(activityEntries),
      streak: this.toStreak(activityEntries),
    };
  }

  /** Records or advances a user's progress on one issue, and logs the matching event. */
  async setIssueProgress(userId: string, issueId: string, repositoryId: string, status: IssueProgressStatus, context: { repositoryFullName: string; issueNumber: number; issueTitle: string }): Promise<void> {
    const now = new Date();
    await this.prisma.issueProgress.upsert({
      where: { userId_issueId: { userId, issueId } },
      create: {
        userId,
        issueId,
        repositoryId,
        status,
        startedAt: status === 'started' || status === 'completed' ? now : null,
        completedAt: status === 'completed' ? now : null,
      },
      update: {
        status,
        ...(status === 'started' ? { startedAt: now, completedAt: null } : {}),
        ...(status === 'completed' ? { completedAt: now } : {}),
        ...(status === 'viewed' ? {} : {}),
      },
    });
    if (status !== 'viewed') {
      await this.recordActivity(userId, status === 'started' ? 'issue_started' : 'issue_completed', {
        repositoryId,
        issueId,
        dedupeKey: `${status}:${issueId}`,
        metadata: context,
      });
    }
  }

  /**
   * Marks an issue as seen. Only ever creates a row the first time, so simply
   * opening the same issue again does not pollute the timeline or reset a
   * started/completed status.
   */
  async recordIssueViewed(userId: string, issueId: string, repositoryId: string, context: { repositoryFullName: string; issueNumber: number; issueTitle: string }): Promise<void> {
    const existing = await this.prisma.issueProgress.findUnique({ where: { userId_issueId: { userId, issueId } } });
    if (existing) return;
    await this.prisma.issueProgress.create({ data: { userId, issueId, repositoryId, status: 'viewed' } });
    await this.recordActivity(userId, 'issue_viewed', { repositoryId, issueId, dedupeKey: `viewed:${issueId}`, metadata: context });
  }

  /**
   * Append-only event log. `dedupeKey` + the unique index make this safe to
   * call from anywhere, including paths that run more than once.
   */
  async recordActivity(userId: string, type: ActivityType, options: { repositoryId?: string; issueId?: string; dedupeKey: string; metadata?: Record<string, unknown> }): Promise<void> {
    try {
      await this.prisma.contributorActivity.createMany({
        data: [{
          userId,
          type,
          repositoryId: options.repositoryId ?? null,
          issueId: options.issueId ?? null,
          dedupeKey: options.dedupeKey,
          metadata: (options.metadata ?? {}) as never,
        }],
        skipDuplicates: true,
      });
    } catch (error) {
      // Profile history is valuable but never worth failing a user action for.
      this.logger.warn(`Could not record ${type} activity: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  private toActivityByDay(entries: readonly ProfileActivityEntry[]): Array<{ date: string; count: number }> {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      const day = entry.occurredAt.slice(0, 10);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    const days: Array<{ date: string; count: number }> = [];
    const today = new Date();
    for (let offset = ACTIVITY_WINDOW_DAYS - 1; offset >= 0; offset -= 1) {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() - offset);
      const key = date.toISOString().slice(0, 10);
      days.push({ date: key, count: counts.get(key) ?? 0 });
    }
    return days;
  }

  /** Streak over days that actually have recorded activity - no estimation. */
  private toStreak(entries: readonly ProfileActivityEntry[]): { current: number; longest: number; activeDays: number } {
    const days = [...new Set(entries.map((entry) => entry.occurredAt.slice(0, 10)))].sort();
    if (days.length === 0) return { current: 0, longest: 0, activeDays: 0 };

    let longest = 1;
    let run = 1;
    for (let index = 1; index < days.length; index += 1) {
      run = this.isNextDay(days[index - 1], days[index]) ? run + 1 : 1;
      if (run > longest) longest = run;
    }

    const today = new Date().toISOString().slice(0, 10);
    const last = days[days.length - 1];
    let current = 0;
    if (last === today || this.isNextDay(last, today)) {
      current = 1;
      for (let index = days.length - 1; index > 0; index -= 1) {
        if (!this.isNextDay(days[index - 1], days[index])) break;
        current += 1;
      }
    }
    return { current, longest, activeDays: days.length };
  }

  private isNextDay(earlier: string, later: string): boolean {
    const gap = (Date.parse(later) - Date.parse(earlier)) / 86_400_000;
    return Math.round(gap) === 1;
  }
}
