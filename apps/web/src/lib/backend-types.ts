export interface BackendUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface BackendRepository {
  id: string;
  githubRepositoryId?: string;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
  languages?: Record<string, number>;
  topics: string[];
  license: string | null;
  defaultBranch: string;
  openIssuesCount: number;
  /** True when this repository has already been imported/analysed by the user. */
  imported?: boolean;
  repositoryId?: string | null;
  lastIssueCheckAt?: string | null;
}

export interface BackendImportedRepository extends BackendRepository {
  repositoryId: string;
  readmeSummary: string | null;
  isFork: boolean;
  parentFullName: string | null;
  lastSyncedAt: string | null;
  lastIssueCheckAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendRepositoryListResponse {
  items: BackendRepository[];
  page: number;
  perPage: number;
  hasNext: boolean;
  nextPage: number | null;
}

export interface BackendIssue {
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

export interface BackendIssueListResponse {
  repositoryId: string;
  issues: BackendIssue[];
}

export interface BackendRecommendation {
  issueId: string;
  repositoryId: string;
  number: number;
  title: string;
  url: string;
  score: number;
  rank: number;
  reasons: string[];
  updatedAt: string;
  labels: string[];
}

export interface BackendRecommendationPage {
  repositoryId: string;
  items: BackendRecommendation[];
  page: number;
  perPage: number;
  total: number;
}

export interface BackendAskSource {
  path: string;
  url: string;
  relevance: number;
}

export interface BackendAskResult {
  answer: string;
  sources: BackendAskSource[];
}

export interface BackendRepositoryAnalysis {
  repositoryId: string;
  generatedAt: string;
  method: 'grounded-llm' | 'insufficient-context';
  summary: string;
  audience: string;
  techStack: string[];
  architecture: {
    description: string;
    nodes: Array<{ id: string; label: string; type: 'app' | 'service' | 'library' | 'data' | 'external' | 'entrypoint' }>;
    edges: Array<{ from: string; to: string; label?: string }>;
  };
  firstPrPath: Array<{ title: string; actions: string[]; outcome: string }>;
  questionsToExplore: string[];
  evidence: Array<{ path: string; reason: string }>;
  confidence: 'high' | 'medium' | 'low';
  /** When this analysis was stored in the database. */
  analyzedAt?: string;
  /** True when it was served from the database rather than recomputed. */
  fromStore?: boolean;
}

export interface BackendMappingEvidence {
  path: string;
  url: string;
  documentType: string;
  confidence: number;
  explanation: string;
}

export interface BackendIssueMapping {
  relevantFiles: BackendMappingEvidence[];
  relevantDocumentation: BackendMappingEvidence[];
  relevantModules: BackendMappingEvidence[];
  confidence: number;
  limitations: string[];
}

export interface BackendGuidanceStep {
  title: string;
  actions: string[];
  completionEvidence: string;
}

export interface BackendIssueAnalysis {
  complexity: 'low' | 'medium' | 'high';
  effort: 'small' | 'medium' | 'large';
  requiredKnowledge: string[];
  dependencies: string[];
  beginnerSuitable: boolean;
  confidence: number;
  reasons: string[];
  evidence: string[];
  explanation: string;
  rootCause: string;
  suggestedApproach: string[];
  contributionSteps: BackendGuidanceStep[];
  testingPlan: string[];
  evidencePaths: string[];
  method: 'grounded-llm' | 'deterministic-heuristic';
}

export interface BackendContributorIntelligenceResult {
  repositoryId: string;
  issue: BackendIssue;
  mapping: BackendIssueMapping;
  analysis: BackendIssueAnalysis;
  generatedAt: string;
  sourceVersion: string;
}

export interface BackendResumeProject {
  name: string;
  description: string;
  technologies: string[];
}

export interface BackendResumeExperience {
  role: string;
  organization: string;
  duration: string;
  highlights: string[];
}

export interface BackendResumeEducation {
  credential: string;
  institution: string;
  year?: string;
}

export interface BackendResumeProfile {
  githubUserId: string;
  fileName: string;
  fileType: string;
  summary: string;
  skills: string[];
  programmingLanguages: string[];
  frameworksTools: string[];
  projects: BackendResumeProject[];
  experience: BackendResumeExperience[];
  education: BackendResumeEducation[];
  parsedAt: string;
  updatedAt: string;
}

export interface BackendSkillGapPartialSkill {
  skill: string;
  note: string;
}

export interface BackendSkillGapResult {
  readinessSummary: string;
  matchedSkills: string[];
  missingSkills: string[];
  partialSkills: BackendSkillGapPartialSkill[];
  relevantExperience: string[];
  thingsToUnderstand: string[];
  actionChecklist: string[];
}

export type BackendNotificationType =
  | "new_issue"
  | "new_comment"
  | "issue_closed"
  | "issue_reopened"
  | "issue_retitled";

export interface BackendNotification {
  id: string;
  type: BackendNotificationType | string;
  message: string;
  /** Internal link into the issue workspace. */
  url: string;
  /** Canonical github.com link for the issue this event belongs to. */
  githubUrl: string;
  repositoryId: string;
  repositoryFullName: string;
  issueId: string;
  issueNumber: number;
  issueTitle: string;
  isRead: boolean;
  createdAt: string;
}

export interface BackendNotificationListResponse {
  items: BackendNotification[];
  unreadCount: number;
}

export type ContributorActivityType = "repository_analyzed" | "issue_viewed" | "issue_started" | "issue_completed";
export type IssueProgressStatus = "viewed" | "started" | "completed";

export interface BackendProfileRepository {
  repositoryId: string;
  fullName: string;
  url: string;
  language: string | null;
  topics: string[];
  analyzedAt: string;
  lastIssueCheckAt: string | null;
  issuesViewed: number;
  issuesStarted: number;
  issuesCompleted: number;
}

export interface BackendProfileIssue {
  issueId: string;
  repositoryId: string;
  repositoryFullName: string;
  number: number;
  title: string;
  url: string;
  state: string;
  status: IssueProgressStatus;
  labels: string[];
  updatedAt: string;
}

export interface BackendProfileActivity {
  id: string;
  type: ContributorActivityType | string;
  occurredAt: string;
  repositoryFullName: string | null;
  issueNumber: number | null;
  issueTitle: string | null;
}

export interface BackendProfileStats {
  user: { id: string; githubUserId: string; username: string; displayName: string | null; avatarUrl: string | null; memberSince: string };
  totals: { repositoriesAnalyzed: number; issuesViewed: number; issuesStarted: number; issuesCompleted: number };
  languageUsage: Array<{ name: string; repositories: number; issuesCompleted: number }>;
  technologies: string[];
  repositories: BackendProfileRepository[];
  issues: BackendProfileIssue[];
  activity: BackendProfileActivity[];
  activityByDay: Array<{ date: string; count: number }>;
  streak: { current: number; longest: number; activeDays: number };
}
