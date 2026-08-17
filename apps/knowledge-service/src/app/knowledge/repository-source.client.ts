import axios, { AxiosInstance } from 'axios';
import { Injectable } from '@nestjs/common';
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
    const response = await this.client.get<AccessResponse>('/v1/internal/repositories/' + encodeURIComponent(repositoryId) + '/access', { headers: this.headers(cookieHeader) });
    if (response.data.repositoryId !== repositoryId || response.data.allowed !== true) throw new Error('Repository access was not granted');
  }
  async getSource(repositoryId: string, cookieHeader?: string): Promise<RepositoryKnowledgeSource> {
    const response = await this.client.get<SourceResponse>('/v1/internal/repositories/' + encodeURIComponent(repositoryId) + '/knowledge-source', { headers: this.headers(cookieHeader) });
    if (response.data.repositoryId !== repositoryId || !Array.isArray(response.data.documents)) throw new Error('Repository source response was invalid');
    return { repositoryId, documents: response.data.documents };
  }
}
