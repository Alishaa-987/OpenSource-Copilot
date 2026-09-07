import axios, { AxiosInstance } from 'axios';
import { ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { TypedConfigService } from '@osc/config';
import { KnowledgeEnv } from '../env';
import { RepositoryKnowledgeSource, SourceDocument } from './knowledge.types';

interface SourceResponse { repositoryId?: string; documents?: SourceDocument[]; }
interface AccessResponse { repositoryId?: string; allowed?: boolean; }

@Injectable()
export class RepositorySourceClient {
  private readonly client: AxiosInstance;
  constructor(private readonly config: TypedConfigService<KnowledgeEnv>) {
    this.client = axios.create({ baseURL: this.config.get('REPOSITORY_SERVICE_URL').replace(/\/$/, ''), timeout: this.config.get('KNOWLEDGE_REQUEST_TIMEOUT_MS'), maxContentLength: 10_000_000, maxBodyLength: 10_000_000, maxRedirects: 0 });
  }
  private headers(cookieHeader?: string): Record<string, string> {
    const headers: Record<string, string> = {};
    const serviceToken = this.config.get('KNOWLEDGE_SERVICE_TOKEN');
    if (cookieHeader) headers['cookie'] = cookieHeader;
    if (serviceToken) headers['x-internal-service-token'] = serviceToken;
    return headers;
  }
  async assertAccess(repositoryId: string, cookieHeader?: string): Promise<void> {
    try {
      const response = await this.client.get<AccessResponse>('/v1/internal/repositories/' + encodeURIComponent(repositoryId) + '/access', { headers: this.headers(cookieHeader) });
      if (response.data.repositoryId !== repositoryId || response.data.allowed !== true) throw new ForbiddenException('Repository access was not granted');
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) throw error;
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401) throw new UnauthorizedException('GitHub session is missing or expired');
        if (status === 403) throw new ForbiddenException('You do not have access to this repository');
        throw new ServiceUnavailableException('Repository Service is unavailable while checking access');
      }
      throw error;
    }
  }
  async getSource(repositoryId: string, cookieHeader?: string, question?: string): Promise<RepositoryKnowledgeSource> {
    const params = question ? { q: question.slice(0, 8_000) } : undefined;
    const response = await this.client.get<SourceResponse>('/v1/internal/repositories/' + encodeURIComponent(repositoryId) + '/knowledge-source', { headers: this.headers(cookieHeader), params });
    if (response.data.repositoryId !== repositoryId || !Array.isArray(response.data.documents)) throw new Error('Repository source response was invalid');
    return { repositoryId, documents: response.data.documents };
  }
}
