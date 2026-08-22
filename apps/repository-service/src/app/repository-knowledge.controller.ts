import { Controller, ForbiddenException, Get, Inject, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { GITHUB_CLIENT, GitHubClient } from '@osc/github';

import { PrismaService } from '@osc/database';
import { TypedConfigService } from '@osc/config';
import { GitHubSessionService } from './github/github.session.service';
import type { RepositoryEnv } from './env';

@Controller('v1/internal/repositories')
export class RepositoryKnowledgeController {
  constructor(private readonly prisma: PrismaService, private readonly sessions: GitHubSessionService, private readonly config: TypedConfigService<RepositoryEnv>, @Inject(GITHUB_CLIENT) private readonly github: GitHubClient) {}
  @Get(':repositoryId/access')
  async access(@Param('repositoryId', new ParseUUIDPipe()) repositoryId: string, @Req() request: Request) {
    await this.authorize(repositoryId, request);
    return { repositoryId, allowed: true };
  }
  @Get(':repositoryId/knowledge-source')
  async source(@Param('repositoryId', new ParseUUIDPipe()) repositoryId: string, @Req() request: Request, @Query('q') question?: string) {
    await this.authorize(repositoryId, request);
    const repository = await this.prisma.repository.findUnique({ where: { id: repositoryId }, select: { id: true, owner: true, name: true, url: true, defaultBranch: true, documents: { orderBy: { updatedAt: 'desc' }, take: 500, select: { id: true, path: true, content: true, documentType: true } }, issues: { orderBy: { updatedAt: 'desc' }, take: 500, select: { id: true, number: true, title: true, body: true, url: true, updatedAt: true } } } });
    if (!repository) throw new ForbiddenException('Repository access was not granted');
    const documents: Array<{ repositoryId: string; documentId: string; path: string; documentType: 'readme' | 'contributing' | 'code-of-conduct' | 'security' | 'documentation' | 'issue' | 'code'; url: string; content: string }> = [];
    for (const document of repository.documents) documents.push({ repositoryId, documentId: document.id, path: document.path, documentType: this.documentType(document.documentType), url: repository.url + '/blob/' + repository.defaultBranch + '/' + document.path, content: document.content });
    for (const issue of repository.issues) documents.push({ repositoryId, documentId: issue.id, path: 'issues/' + issue.number, documentType: 'issue', url: issue.url, content: issue.title + '\\n\\n' + (issue.body ?? '') });
    if (question?.trim()) await this.appendRelevantCode(repository, question, request, documents);
    return { repositoryId, documents };
  }

  private async appendRelevantCode(repository: { id: string; owner: string; name: string; url: string; defaultBranch: string }, question: string, request: Request, documents: Array<{ repositoryId: string; documentId: string; path: string; documentType: 'readme' | 'contributing' | 'code-of-conduct' | 'security' | 'documentation' | 'issue' | 'code'; url: string; content: string }>): Promise<void> {
    const session = await this.sessions.getSession(request);
    if (!session) return;
    const explicitPaths = [...question.matchAll(/(?:^|[\s`'\"(])((?:[A-Za-z0-9_.-]+\/)+[A-Za-z0-9_.-]+\.[A-Za-z0-9]+)(?=$|[\s`'\"):,])/g)].map((match) => match[1]).filter((path): path is string => Boolean(path));
    const candidates = new Set(explicitPaths);
    if (candidates.size === 0) {
      const terms = question.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length >= 4);
      const tree = await this.github.getRepositoryTree(session.token, repository.owner, repository.name, repository.defaultBranch);
      for (const entry of tree.filter((item) => item.type === 'blob' && /\.(ts|tsx|js|jsx|py|go|java|rb|rs|md)$/i.test(item.path))) {
        const pathText = entry.path.toLowerCase();
        if (terms.some((term) => pathText.includes(term))) candidates.add(entry.path);
        if (candidates.size >= 8) break;
      }
    }
    for (const path of [...candidates].slice(0, 8)) {
      const content = await this.github.getFile(session.token, repository.owner, repository.name, path);
      if (!content || content.type !== 'file' || !content.content || (content.size ?? content.content.length) > 300_000) continue;
      documents.push({ repositoryId: repository.id, documentId: `github-code:${content.sha}`, path: content.path, documentType: 'code', url: repository.url + '/blob/' + repository.defaultBranch + '/' + content.path, content: this.decodeContent(content.content, content.encoding) });
    }
  }

  private decodeContent(content: string, encoding?: string): string {
    return encoding?.toLowerCase() === 'base64' ? Buffer.from(content.replace(/\s/g, ''), 'base64').toString('utf8') : content;
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

