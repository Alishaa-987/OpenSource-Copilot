export interface SimilarIssue { readonly issueId: string; readonly number: number; readonly title: string; readonly url: string; readonly confidence: number; readonly explanation: string; }
export interface SimilarPullRequestContext { readonly available: boolean; readonly results: readonly SimilarIssue[]; readonly limitation?: string; }
export interface SimilarContextResult { readonly repositoryId: string; readonly issueId: string; readonly similarIssues: readonly SimilarIssue[]; readonly similarPullRequests: SimilarPullRequestContext; readonly limitations: readonly string[]; }
