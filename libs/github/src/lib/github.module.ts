import { DynamicModule, Module } from '@nestjs/common';
import { TypedConfigService } from '@osc/config';
import { GitHubClient } from './github.client';
import { GitHubClientOptions } from './github.types';

export const GITHUB_CLIENT = Symbol('GITHUB_CLIENT');

export interface GitHubRuntimeConfig extends Record<string, unknown> {
  GITHUB_API_BASE_URL?: string;
  GITHUB_API_VERSION?: string;
  GITHUB_API_TIMEOUT_MS?: number;
  GITHUB_API_MAX_RETRIES?: number;
  GITHUB_API_RETRY_BASE_DELAY_MS?: number;
  GITHUB_API_MAX_RETRY_DELAY_MS?: number;
}

@Module({})
export class GitHubModule {
  static forRoot(): DynamicModule {
    return {
      module: GitHubModule,
      providers: [
        {
          provide: GITHUB_CLIENT,
          inject: [TypedConfigService],
          useFactory: (config: TypedConfigService<GitHubRuntimeConfig>): GitHubClient => {
            const options: GitHubClientOptions = {
              apiBaseUrl: config.get('GITHUB_API_BASE_URL') ?? 'https://api.github.com',
              apiVersion: config.get('GITHUB_API_VERSION') ?? '2026-03-10',
              timeoutMs: config.get('GITHUB_API_TIMEOUT_MS') ?? 10_000,
              maxRetries: config.get('GITHUB_API_MAX_RETRIES') ?? 3,
              retryBaseDelayMs: config.get('GITHUB_API_RETRY_BASE_DELAY_MS') ?? 250,
              maxRetryDelayMs: config.get('GITHUB_API_MAX_RETRY_DELAY_MS') ?? 5_000,
            };
            return new GitHubClient(options);
          },
        },
      ],
      exports: [GITHUB_CLIENT],
    };
  }
}
