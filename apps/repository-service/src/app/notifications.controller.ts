import { Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { GitHubSessionService } from './github/github.session.service';
import { NotificationsService } from './notifications.service';

@Controller('v1/notifications')
export class NotificationsController {
  constructor(
    private readonly sessions: GitHubSessionService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get()
  async list(@Req() request: Request) {
    const session = await this.sessions.requireSession(request);
    return this.notifications.listForUser(session.userId);
  }

  @Post(':id/read')
  async markRead(@Req() request: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    const session = await this.sessions.requireSession(request);
    await this.notifications.markRead(session.userId, id);
    return { read: true };
  }

  @Post('read-all')
  async markAllRead(@Req() request: Request) {
    const session = await this.sessions.requireSession(request);
    await this.notifications.markAllRead(session.userId);
    return { read: true };
  }
}
