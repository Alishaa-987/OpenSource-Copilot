import { BadRequestException, Inject, Injectable, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { TypedConfigService } from '@osc/config';
import { PrismaService } from '@osc/database';
import { REDIS_CLIENT } from '@osc/shared';
import type { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { GITHUB_CLIENT } from '@osc/github';
import { GitHubClient } from '@osc/github';
import { GitHubAuthResponse, GitHubAuthStartResponse, GitHubUserResponse } from './github.dto';
import { RepositoryEnv } from '../env';

interface OAuthState {
  returnTo?: string;
}

export interface GitHubSession {
  sessionId: string;
  userId: string;
  githubUserId: bigint;
  username: string;
  token: string;
  expiresAt: string;
}

@Injectable()
export class GitHubSessionService {
  constructor(
    @Inject(GITHUB_CLIENT) private readonly github: GitHubClient,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly config: TypedConfigService<RepositoryEnv>,
  ) {}

  async startOAuth(returnTo?: string): Promise<GitHubAuthStartResponse> {
    const clientId = this.config.get('GITHUB_CLIENT_ID');
    if (!clientId) {
      throw new ServiceUnavailableException('GitHub authentication is not configured');
    }
    const state = randomUUID();
    const stateTtl = this.config.get('GITHUB_OAUTH_STATE_TTL_SECONDS');
    const validatedReturnTo = this.validateReturnTo(returnTo);
    await this.redis.set(this.stateKey(state), JSON.stringify({ returnTo: validatedReturnTo } satisfies OAuthState), 'EX', stateTtl);
    const authorizationUrl = new URL('https://github.com/login/oauth/authorize');
    authorizationUrl.searchParams.set('client_id', clientId);
    authorizationUrl.searchParams.set('redirect_uri', this.config.get('GITHUB_REDIRECT_URI'));
    authorizationUrl.searchParams.set('scope', 'read:user user:email repo');
    authorizationUrl.searchParams.set('state', state);
    return { authorizationUrl: authorizationUrl.toString() };
  }

  async completeOAuth(code: string, state: string): Promise<GitHubAuthResponse & { session: GitHubSession }> {
    const stateKey = this.stateKey(state);
    const stateRecord = await this.redis.get(stateKey);
    if (!stateRecord) {
      throw new UnauthorizedException('Invalid or expired GitHub OAuth state');
    }
    const stateData = JSON.parse(stateRecord) as OAuthState;
    const returnTo = this.validateReturnTo(stateData.returnTo);
    await this.redis.del(stateKey);
    const clientId = this.config.get('GITHUB_CLIENT_ID');
    const clientSecret = this.config.get('GITHUB_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException('GitHub authentication is not configured');
    }
    const token = await this.github.exchangeOAuthCode(
      clientId,
      clientSecret,
      code,
      this.config.get('GITHUB_REDIRECT_URI'),
    );
    const githubUser = await this.github.getAuthenticatedUser(token);
    const user = await this.prisma.user.upsert({
      where: { githubUserId: BigInt(githubUser.id) },
      create: {
        githubUserId: BigInt(githubUser.id),
        username: githubUser.login,
        displayName: githubUser.name ?? null,
        avatarUrl: githubUser.avatar_url ?? null,
      },
      update: {
        username: githubUser.login,
        displayName: githubUser.name ?? null,
        avatarUrl: githubUser.avatar_url ?? null,
      },
    });
    const sessionId = randomUUID();
    const ttl = this.config.get('GITHUB_SESSION_TTL_SECONDS');
    const expiresAt = new Date(Date.now() + ttl * 1_000).toISOString();
    const session: GitHubSession = {
      sessionId,
      userId: user.id,
      githubUserId: BigInt(githubUser.id),
      username: githubUser.login,
      token,
      expiresAt,
    };
    await this.redis.set(this.sessionKey(sessionId), JSON.stringify({
      ...session,
      githubUserId: session.githubUserId.toString(),
    }), 'EX', ttl);
    return { user: this.mapUser(githubUser), expiresAt, session, returnTo };
  }

  async getSession(request: Request): Promise<GitHubSession | null> {
    const sessionId = this.readCookie(request.headers.cookie, this.config.get('GITHUB_SESSION_COOKIE_NAME'));
    if (!sessionId) return null;
    const raw = await this.redis.get(this.sessionKey(sessionId));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Omit<GitHubSession, 'githubUserId'> & { githubUserId: string };
      return { ...parsed, githubUserId: BigInt(parsed.githubUserId) };
    } catch {
      await this.redis.del(this.sessionKey(sessionId));
      return null;
    }
  }

  async requireSession(request: Request): Promise<GitHubSession> {
    const session = await this.getSession(request);
    if (!session) throw new UnauthorizedException('GitHub authentication is required');
    return session;
  }

  async currentUser(request: Request): Promise<GitHubUserResponse> {
    const session = await this.requireSession(request);
    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) throw new UnauthorizedException('GitHub authentication is required');
    return {
      id: user.githubUserId.toString(),
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    };
  }

  async destroySession(request: Request): Promise<void> {
    const sessionId = this.readCookie(request.headers.cookie, this.config.get('GITHUB_SESSION_COOKIE_NAME'));
    if (sessionId) await this.redis.del(this.sessionKey(sessionId));
  }

  cookieName(): string {
    return this.config.get('GITHUB_SESSION_COOKIE_NAME');
  }

  cookieOptions(): { httpOnly: boolean; sameSite: 'lax'; secure: boolean; maxAge: number; path: string } {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('NODE_ENV') === 'production',
      maxAge: this.config.get('GITHUB_SESSION_TTL_SECONDS') * 1_000,
      path: '/',
    };
  }

  mapUser(user: { id: number; login: string; name?: string | null; avatar_url?: string | null }): GitHubUserResponse {
    return {
      id: String(user.id),
      username: user.login,
      displayName: user.name ?? null,
      avatarUrl: user.avatar_url ?? null,
    };
  }

  private validateReturnTo(returnTo?: string): string | undefined {
    if (!returnTo) return undefined;
    try {
      const candidate = new URL(returnTo);
      const allowed = new URL(this.config.get('FRONTEND_BASE_URL'));
      if (candidate.origin !== allowed.origin) throw new BadRequestException('OAuth return target is not allowed');
      return candidate.toString();
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('OAuth return target is invalid');
    }
  }
  private stateKey(state: string): string {
    return `github:oauth:state:${state}`;
  }

  private sessionKey(sessionId: string): string {
    return `github:session:${sessionId}`;
  }

  private readCookie(cookieHeader: string | undefined, name: string): string | null {
    if (!cookieHeader) return null;
    for (const part of cookieHeader.split(';')) {
      const [key, ...value] = part.trim().split('=');
      if (key === name) return decodeURIComponent(value.join('='));
    }
    return null;
  }
}

