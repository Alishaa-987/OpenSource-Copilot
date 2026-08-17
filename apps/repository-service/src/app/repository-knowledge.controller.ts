import { Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '@osc/database';
import { TypedConfigService } from '@osc/config';
import { GitHubSessionService } from './github/github.session.service';
import type { RepositoryEnv } from './env';

@Controller('v1/internal/repositories')
export class RepositoryKnowledgeController {
  constructor(private readonly prisma: PrismaService, private readonly sessions: GitHubSessionService, private readonly config: TypedConfigService<RepositoryEnv>) {}
  @Get(':repositoryId/access')
  async access(@Param('repositoryId', new ParseUUIDPipe()) repositoryId: string, @Req() request: Request) {
    await this.authorize(repositoryId, request);
    return { repositoryId, allowed: true };
  }
  @Get(':repositoryId/knowledge-source')
  async source(@Param('repositoryId', new ParseUUIDPipe()) repositoryId: string, @Req() request: Request) {
    await this.authorize(repositoryId, request);
    const repository = await this.prisma.repository.findUnique({ where: { id: repositoryId }, select: { id: true, url: true, defaultBranch: true, documents: { orderBy: { updatedAt: 'desc' }, take: 500, select: { id: true, path: true, content: true, documentType: true } }, issues: { orderBy: { updatedAt: 'desc' }, take: 500, select: { id: true, number: true, title: true, body: true, url: true, updatedAt: true } } } });
    if (!repository) throw new ForbiddenException('Repository access was not granted');
    const documents: Array<{ repositoryId: string; documentId: string; path: string; documentType: 'readme' | 'contributing' | 'code-of-conduct' | 'security' | 'documentation' | 'issue'; url: string; content: string }> = [];
    for (const document of repository.documents) documents.push({ repositoryId, documentId: document.id, path: document.path, documentType: this.documentType(document.documentType), url: repository.url + '/blob/' + repository.defaultBranch + '/' + document.path, content: document.content });
    for (const issue of repository.issues) documents.push({ repositoryId, documentId: issue.id, path: 'issues/' + issue.number, documentType: 'issue', url: issue.url, content: issue.title + '\\n\\n' + (issue.body ?? '') });
    return { repositoryId, documents };
  }
  private async authorize(repositoryId: string, request: Request): Promise<void> {
    const token = request.headers['x-internal-service-token'];
    const configured = this.config.get('KNOWLEDGE_SERVICE_TOKEN');
    if (configured && typeof token === 'string' && token === configured) return;
    const session = await this.sessions.requireSession(request);
    const access = await this.prisma.repositoryAccess.findFirst({ where: { repositoryId, userId: session.userId }, select: { id: true } });
    if (!access) throw new ForbiddenException('Repository access was not granted');
  }
  private documentType(value: string): 'readme' | 'contributing' | 'code-of-conduct' | 'security' | 'documentation' {
    const normalized = value.toLowerCase();
    if (normalized === 'readme' || normalized === 'contributing' || normalized === 'code-of-conduct' || normalized === 'security') return normalized;
    return 'documentation';
  }
}

