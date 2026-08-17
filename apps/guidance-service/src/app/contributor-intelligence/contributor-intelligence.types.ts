export interface ContributorIssueLabel {
  readonly name: string;
  readonly color: string;
}

export interface ContributorIssue {
  readonly id: string;
  readonly repositoryId: string;
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly state: string;
  readonly author: string | null;
  readonly commentsCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly closedAt: string | null;
  readonly labels: readonly ContributorIssueLabel[];
  readonly url: string;
}

export interface RetrievedKnowledgeChunk {
  readonly path: string;
  readonly documentType: string;
  readonly url: string;
  readonly content: string;
  readonly relevance: number;
}

export interface MappingEvidence {
  readonly path: string;
  readonly url: string;
  readonly documentType: string;
  readonly confidence: number;
  readonly explanation: string;
}

export interface IssueMapping {
  readonly relevantFiles: readonly MappingEvidence[];
  readonly relevantDocumentation: readonly MappingEvidence[];
  readonly relevantModules: readonly MappingEvidence[];
  readonly confidence: number;
  readonly limitations: readonly string[];
}

export type Complexity = 'low' | 'medium' | 'high';
export type Effort = 'small' | 'medium' | 'large';

export interface IssueAnalysis {
  readonly complexity: Complexity;
  readonly effort: Effort;
  readonly requiredKnowledge: readonly string[];
  readonly dependencies: readonly string[];
  readonly beginnerSuitable: boolean;
  readonly confidence: number;
  readonly reasons: readonly string[];
  readonly evidence: readonly string[];
  readonly method: 'deterministic-heuristic';
}

export interface ContributorIntelligenceResult {
  readonly repositoryId: string;
  readonly issue: ContributorIssue;
  readonly mapping: IssueMapping;
  readonly analysis: IssueAnalysis;
  readonly generatedAt: string;
  readonly sourceVersion: string;
}
