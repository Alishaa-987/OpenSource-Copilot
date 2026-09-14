import { Injectable } from '@nestjs/common';
import { PrismaService } from '@osc/database';

export interface NotificationResponse {
  id: string;
  type: string;
  message: string;
  url: string;
  repositoryId: string;
  issueId: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  items: NotificationResponse[];
  unreadCount: number;
}

/**
 * Owns the notifications table: reading a user's notifications and creating
 * one when the repository monitor finds a genuinely new GitHub issue. Kept
 * separate from RepositoryMonitorService so the "what is a notification"
 * concern (dedup, shape, read state) stays in one place regardless of what
 * triggers a notification in the future.
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
   * Notifies every user who has access to the repository that a new issue
   * appeared. `skipDuplicates` plus the (userId, issueId) unique constraint
   * on the table is what makes this safe to call more than once for the
   * same issue - a repeated call (e.g. an overlapping monitor cycle) never
   * produces a second notification for the same user/issue pair.
   */
  async notifyNewIssue(params: {
    repositoryId: string;
    repositoryFullName: string;
    issueId: string;
    issueTitle: string;
    issueUrl: string;
    userIds: string[];
  }): Promise<void> {
    if (params.userIds.length === 0) return;
    const message = `New issue added in ${params.repositoryFullName}: ${params.issueTitle}`;
    await this.prisma.notification.createMany({
      data: params.userIds.map((userId) => ({
        userId,
        repositoryId: params.repositoryId,
        issueId: params.issueId,
        type: 'new_issue',
        message,
        url: params.issueUrl,
      })),
      skipDuplicates: true,
    });
  }

  private mapNotification(notification: {
    id: string; type: string; message: string; url: string; repositoryId: string; issueId: string; isRead: boolean; createdAt: Date;
  }): NotificationResponse {
    return {
      id: notification.id,
      type: notification.type,
      message: notification.message,
      url: notification.url,
      repositoryId: notification.repositoryId,
      issueId: notification.issueId,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
