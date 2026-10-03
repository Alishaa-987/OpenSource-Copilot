import type {
  BackendIssue,
  BackendIssueListResponse,
  BackendImportedRepository,
  BackendRecommendationPage,
  BackendRepositoryListResponse,
  BackendUser,
  BackendAskResult,
  BackendContributorIntelligenceResult,
  BackendRepositoryAnalysis,
  BackendResumeProfile,
  BackendSkillGapResult,
  BackendNotificationListResponse,
  BackendProfileStats,
  IssueProgressStatus,
} from "./backend-types";

export class BackendApiError extends Error {
  readonly status: number;
  readonly correlationId?: string;

  constructor(status: number, message: string, correlationId?: string) {
    super(message);
    this.name = "BackendApiError";
    this.status = status;
    this.correlationId = correlationId;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  // A FormData body (resume upload) must NOT get a manual Content-Type: the
  // browser needs to set its own multipart boundary, so only string bodies
  // are assumed to be JSON here.
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    let correlationId: string | undefined;
    try {
      const body = (await response.json()) as { message?: string | string[]; correlationId?: string };
      message = Array.isArray(body.message) ? body.message.join(", ") : body.message ?? message;
      correlationId = body.correlationId;
    } catch {
      // Preserve the status message for non-JSON failures.
    }
    throw new BackendApiError(response.status, message, correlationId);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const backendApi = {
  startGitHubLogin(returnTo = "/dashboard") {
    const query = new URLSearchParams({ returnTo: window.location.origin + returnTo });
    return requestJson<{ authorizationUrl: string }>("/api/repository/v1/github/auth/start?" + query.toString());
  },
  currentUser() {
    return requestJson<BackendUser>("/api/repository/v1/github/me");
  },
  logout() {
    return requestJson<{ loggedOut: true }>("/api/repository/v1/github/auth/logout", { method: "POST" });
  },
  listRepositories(params: { page?: number; perPage?: number; search?: string } = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.perPage) query.set("perPage", String(params.perPage));
    if (params.search) query.set("search", params.search);
    const suffix = query.toString() ? "?" + query.toString() : "";
    return requestJson<BackendRepositoryListResponse>("/api/repository/v1/github/repositories" + suffix);
  },
  importRepository(githubRepositoryId: string) {
    return requestJson<{ repository: BackendImportedRepository; imported: { documents: number; issues: number; labels: number } }>("/api/repository/v1/github/repositories/import", {
      method: "POST",
      body: JSON.stringify({ githubRepositoryId }),
    });
  },
  getRepository(repositoryId: string) {
    return requestJson<BackendImportedRepository>("/api/repository/v1/github/repositories/" + repositoryId);
  },
  listIssues(repositoryId: string) {
    return requestJson<BackendIssueListResponse>("/api/repository/v1/github/repositories/" + repositoryId + "/issues");
  },
  getIssue(issueId: string) {
    return requestJson<BackendIssue>("/api/repository/v1/github/issues/" + issueId);
  },
  /**
   * Reads the stored repository analysis from guidance-service, which owns it
   * in Postgres. It is produced on first request and served from the database
   * afterwards, so revisiting a repository costs no LLM call.
   */
  analyzeRepository(repositoryId: string) {
    return requestJson<BackendRepositoryAnalysis>('/api/guidance/v1/repositories/' + repositoryId + '/analysis');
  },
  /** Forces a fresh analysis, replacing the stored one. */
  refreshRepositoryAnalysis(repositoryId: string) {
    return requestJson<BackendRepositoryAnalysis>('/api/guidance/v1/repositories/' + repositoryId + '/analysis/refresh', { method: 'POST' });
  },
  askRepository(repositoryId: string, question: string, context?: string, history?: Array<{ role: "user" | "assistant"; content: string }>) {
    return requestJson<BackendAskResult>("/api/knowledge/v1/repositories/" + repositoryId + "/ask", {
      method: "POST",
      body: JSON.stringify({ question, ...(context ? { context } : {}), ...(history?.length ? { history } : {}) }),
    });
  },
  getRecommendations(repositoryId: string, params: { page?: number; perPage?: number; label?: string; minScore?: number } = {}) {


    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.perPage) query.set("perPage", String(params.perPage));
    if (params.label) query.set("label", params.label);
    if (params.minScore !== undefined) query.set("minScore", String(params.minScore));
    const suffix = query.toString() ? "?" + query.toString() : "";
    return requestJson<BackendRecommendationPage>("/api/guidance/v1/repositories/" + repositoryId + "/recommendations" + suffix);
  },
  getIssueIntelligence(repositoryId: string, issueId: string) {
    return requestJson<BackendContributorIntelligenceResult>("/api/guidance/v1/repositories/" + repositoryId + "/issues/" + issueId + "/intelligence");
  },

  importPublicRepository(url: string) {
    return requestJson<{ repository: BackendImportedRepository; imported: { documents: number; issues: number; labels: number } }>("/api/repository/v1/github/repositories/import/public", { method: "POST", body: JSON.stringify({ url }) });
  },

  getResumeProfile() {
    return requestJson<{ profile: BackendResumeProfile | null }>("/api/guidance/v1/profile/resume");
  },
  uploadResume(file: File) {
    const formData = new FormData();
    formData.append("resume", file);
    return requestJson<{ profile: BackendResumeProfile }>("/api/guidance/v1/profile/resume", { method: "POST", body: formData });
  },
  deleteResumeProfile() {
    return requestJson<{ deleted: true }>("/api/guidance/v1/profile/resume", { method: "DELETE" });
  },
  getSkillGapAssessment(repositoryId: string, issueId: string, issueContext: string) {
    return requestJson<{ repositoryId: string; issueId: string; result: BackendSkillGapResult }>("/api/guidance/v1/repositories/" + repositoryId + "/issues/" + issueId + "/skill-gap", {
      method: "POST",
      body: JSON.stringify({ issueContext }),
    });
  },

  getProfileStats() {
    return requestJson<BackendProfileStats>("/api/repository/v1/profile/stats");
  },
  setIssueProgress(issueId: string, status: IssueProgressStatus) {
    return requestJson<{ issueId: string; status: IssueProgressStatus }>("/api/repository/v1/profile/issues/" + issueId + "/progress", {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  },

  listNotifications() {
    return requestJson<BackendNotificationListResponse>("/api/repository/v1/notifications");
  },
  markNotificationRead(notificationId: string) {
    return requestJson<{ read: true }>("/api/repository/v1/notifications/" + notificationId + "/read", { method: "POST" });
  },
  markAllNotificationsRead() {
    return requestJson<{ read: true }>("/api/repository/v1/notifications/read-all", { method: "POST" });
  },

};
