import { Injectable } from '@nestjs/common';
import { PrismaService } from '@osc/database';

/** Event kinds the repository monitor can raise. Deterministic, never AI-derived. */
export type NotificationType =
  | 'new_issue'
  | 'new_comment'
  | 'issue_closed'
  | 'issue_reopened'
  | 'issue_retitled';

export interface NotificationResponse {
  id: string;
  type: NotificationType | string;
  message: string;
  url: string;
  githubUrl: string;
  repositoryId: string;
  repositoryFullName: string;
  issueId: string;
  issueNumber: number;
  issueTitle: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  items: NotificationResponse[];
  unreadCount: number;
}

/**
 * One GitHub event, already resolved to our own ids. `dedupeKey` is the
 * identity of the underlying event on GitHub (issue id, comment id, or a
 * state transition), which is what makes re-polling safe.
 */
export interface MonitorEvent {
  type: NotificationType;
  repositoryId: string;
  repositoryFullName: string;
  issueId: string;
  issueNumber: number;
  issueTitle: string;
  githubUrl: string;
  message: string;
  dedupeKey: string;
}

/**
 * Owns the notifications table: reading a user's notifications, and recording
 * the events the repository monitor detects.
 *
 * Nothing here calls an LLM - every message is composed from GitHub API and
 * database state only.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<NotificationListResponse> {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { items: items.map((notification) => this.mapNotification(notification)), unreadCount };
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.updateMany({ where: { id: notificationId, userId }, data: { isRead: true } });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }

  /**
   * Fans one detected event out to every user who has access to the
   * repository. `skipDuplicates` plus the (userId, dedupeKey) unique
   * constraint is the dedup guarantee: replaying a poll, overlapping cycles,
   * or two users importing the same repository can never produce a second
   * copy of the same GitHub event for the same user.
   *
   * Returns how many notification rows were actually created.
   */
  async recordEvents(events: readonly MonitorEvent[], userIds: readonly string[]): Promise<number> {
    if (events.length === 0 || userIds.length === 0) return 0;
    const rows = events.flatMap((event) =>
      userIds.map((userId) => ({
        userId,
        repositoryId: event.repositoryId,
        repositoryFullName: event.repositoryFullName,
        issueId: event.issueId,
        issueNumber: event.issueNumber,
        issueTitle: event.issueTitle,
        type: event.type,
        message: event.message,
        url: `/issues/${event.issueId}`,
        githubUrl: event.githubUrl,
        dedupeKey: event.dedupeKey,
      })),
    );
    const result = await this.prisma.notification.createMany({ data: rows, skipDuplicates: true });
    return result.count;
  }

  private mapNotification(notification: {
    id: string; type: string; message: string; url: string; githubUrl: string;
    repositoryId: string; repositoryFullName: string; issueId: string; issueNumber: number;
    issueTitle: string; isRead: boolean; createdAt: Date;
  }): NotificationResponse {
    return {
      id: notification.id,
      type: notification.type,
      message: notification.message,
      url: notification.url,
      githubUrl: notification.githubUrl,
      repositoryId: notification.repositoryId,
      repositoryFullName: notification.repositoryFullName,
      issueId: notification.issueId,
      issueNumber: notification.issueNumber,
      issueTitle: notification.issueTitle,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
