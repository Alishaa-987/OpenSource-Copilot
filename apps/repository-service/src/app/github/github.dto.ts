import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';

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
  @MaxLength(100)
  search?: string;
}

export class ImportRepositoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^\d{1,20}$/)
  githubRepositoryId!: string;
}

export class PublicRepositoryImportDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  url!: string;
}

export class GitHubOAuthStartQueryDto {
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  @MaxLength(2048)
  returnTo?: string;
}

export class GitHubOAuthCallbackQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  state!: string;

  /** Optional issuer parameter now included by GitHub OAuth callbacks. */
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true, require_tld: false })
  @MaxLength(2048)
  iss?: string;
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
  languages: Record<string, number>;
  topics: string[];
  license: string | null;
  defaultBranch: string;
  fork?: boolean;
  openIssuesCount: number;
  /**
   * Whether this repository has already been imported/analysed by the caller.
   * Resolved from our own database, so the listing can show real state
   * instead of assuming every row is new.
   */
  imported?: boolean;
  /** Internal repository id, present only once imported. */
  repositoryId?: string | null;
  /** When the background monitor last checked it, present only once imported. */
  lastIssueCheckAt?: string | null;
}

export interface RepositoryListResponse {
  items: GitHubRepositoryResponse[];
  page: number;
  perPage: number;
  hasNext: boolean;
  nextPage: number | null;
}

export interface RepositoryImportResponse {
  repository: ImportedRepositoryResponse;
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
  returnTo?: string;
}


export interface ImportedRepositoryResponse extends GitHubRepositoryResponse {
  /** GitHub identifier kept separate from the internal UUID. */
  githubRepositoryId: string;
  /** Internal UUID owned by Repository Service. */
  repositoryId: string;
  readmeSummary: string | null;
  isFork: boolean;
  parentFullName: string | null;
  lastSyncedAt: string | null;
  /** When the background monitor last checked this repository for new issue activity. */
  lastIssueCheckAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RepositoryIssueResponse {
  id: string;
  repositoryId: string;
  githubIssueId: string;
  number: number;
  title: string;
  body: string | null;
  state: string;
  author: string | null;
  commentsCount: number;
  url: string;
  isUpstream: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  labels: Array<{ id: string; name: string; color: string }>;
}



