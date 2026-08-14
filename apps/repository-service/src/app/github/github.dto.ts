import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

export class ListRepositoriesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage = 30;

  @IsOptional()
  @IsString()
  search?: string;
}

export class ImportRepositoryDto {
  @IsString()
  @IsNotEmpty()
  githubRepositoryId!: string;
}

export class PublicRepositoryImportDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  url!: string;
}

export class GitHubOAuthStartQueryDto {
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  returnTo?: string;
}

export class GitHubOAuthCallbackQueryDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  state!: string;
}

export interface GitHubUserResponse {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface GitHubRepositoryResponse {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
  topics: string[];
  license: string | null;
  defaultBranch: string;
  openIssuesCount: number;
}

export interface RepositoryListResponse {
  items: GitHubRepositoryResponse[];
  page: number;
  perPage: number;
  hasNext: boolean;
  nextPage: number | null;
}

export interface RepositoryImportResponse {
  repository: GitHubRepositoryResponse;
  imported: {
    documents: number;
    issues: number;
    labels: number;
  };
}

export interface GitHubAuthStartResponse {
  authorizationUrl: string;
}

export interface GitHubAuthResponse {
  user: GitHubUserResponse;
  expiresAt: string;
}
