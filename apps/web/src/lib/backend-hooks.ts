"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { backendApi } from "./backend-api";
import type { IssueProgressStatus } from "./backend-types";

export const backendQueryKeys = {
  currentUser: ["backend", "current-user"] as const,
  repositories: (params: object) => ["backend", "repositories", params] as const,
  repository: (repositoryId: string) => ["backend", "repository", repositoryId] as const,
  issues: (repositoryId: string) => ["backend", "issues", repositoryId] as const,
  issue: (issueId: string) => ["backend", "issue", issueId] as const,
  recommendations: (repositoryId: string, params: object) => ["backend", "recommendations", repositoryId, params] as const,
  intelligence: (repositoryId: string, issueId: string) => ["backend", "intelligence", repositoryId, issueId] as const,
  ask: (repositoryId: string, question: string) => ["backend", "ask", repositoryId, question] as const,
  analysis: (repositoryId: string) => ["backend", "analysis", repositoryId] as const,
  resumeProfile: ["backend", "resume-profile"] as const,
  skillGap: (repositoryId: string, issueId: string, issueContext: string) => ["backend", "skill-gap", repositoryId, issueId, issueContext] as const,
  notifications: ["backend", "notifications"] as const,
  profileStats: ["backend", "profile-stats"] as const,
};

export function useCurrentUser() {
  return useQuery({ queryKey: backendQueryKeys.currentUser, queryFn: backendApi.currentUser, retry: false, staleTime: 300000 });
}

export function useGitHubLogin(returnTo = "/dashboard") {
  return useMutation({ mutationFn: async () => {
    const result = await backendApi.startGitHubLogin(returnTo);
    window.location.assign(result.authorizationUrl);
  } });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({ mutationFn: backendApi.logout, onSuccess: () => { queryClient.clear(); router.push("/"); } });
}

export function useAccessibleRepositories(params: { page?: number; perPage?: number; search?: string } = {}) {
  return useQuery({ queryKey: backendQueryKeys.repositories(params), queryFn: () => backendApi.listRepositories(params), staleTime: 60000 });
}

export function useImportRepository() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: backendApi.importRepository,
    onSuccess: (result) => {
      const repositoryKey = backendQueryKeys.repository(result.repository.repositoryId);
      queryClient.setQueryData(repositoryKey, result.repository);
      queryClient.invalidateQueries({ queryKey: repositoryKey, refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["backend", "repositories"] });
    },
  });
}

export function useRepository(repositoryId: string) {
  return useQuery({ queryKey: backendQueryKeys.repository(repositoryId), queryFn: () => backendApi.getRepository(repositoryId), enabled: Boolean(repositoryId) });
}

export function useRepositoryIssues(repositoryId: string) {
  return useQuery({ queryKey: backendQueryKeys.issues(repositoryId), queryFn: () => backendApi.listIssues(repositoryId), enabled: Boolean(repositoryId) });
}

export function useIssue(issueId: string) {
  return useQuery({ queryKey: backendQueryKeys.issue(issueId), queryFn: () => backendApi.getIssue(issueId), enabled: Boolean(issueId) });
}

export function useRecommendations(repositoryId: string, params: { page?: number; perPage?: number; label?: string; minScore?: number } = {}) {
  return useQuery({ queryKey: backendQueryKeys.recommendations(repositoryId, params), queryFn: () => backendApi.getRecommendations(repositoryId, params), enabled: Boolean(repositoryId) });
}

export function useIssueIntelligence(repositoryId: string, issueId: string) {
  return useQuery({ queryKey: backendQueryKeys.intelligence(repositoryId, issueId), queryFn: () => backendApi.getIssueIntelligence(repositoryId, issueId), enabled: Boolean(repositoryId) && Boolean(issueId) });
}

export function useRepositoryAnalysis(repositoryId: string) {
  return useQuery({ queryKey: backendQueryKeys.analysis(repositoryId), queryFn: () => backendApi.analyzeRepository(repositoryId), enabled: Boolean(repositoryId), staleTime: 900000, retry: false, refetchOnWindowFocus: false });
}

export function useAskRepository() {
  return useMutation({ mutationFn: ({ repositoryId, question, context, history }: { repositoryId: string; question: string; context?: string; history?: Array<{ role: "user" | "assistant"; content: string }> }) => backendApi.askRepository(repositoryId, question, context, history) });
}

export function useResumeProfile() {
  return useQuery({ queryKey: backendQueryKeys.resumeProfile, queryFn: backendApi.getResumeProfile, staleTime: 60000 });
}

export function useUploadResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => backendApi.uploadResume(file),
    onSuccess: (result) => {
      queryClient.setQueryData(backendQueryKeys.resumeProfile, { profile: result.profile });
      // A new resume invalidates every previously computed skill-gap comparison.
      queryClient.invalidateQueries({ queryKey: ["backend", "skill-gap"] });
    },
  });
}

export function useDeleteResumeProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: backendApi.deleteResumeProfile,
    onSuccess: () => {
      queryClient.setQueryData(backendQueryKeys.resumeProfile, { profile: null });
      queryClient.invalidateQueries({ queryKey: ["backend", "skill-gap"] });
    },
  });
}

export function useSkillGapAssessment(repositoryId: string, issueId: string, issueContext: string, enabled: boolean) {
  return useQuery({
    queryKey: backendQueryKeys.skillGap(repositoryId, issueId, issueContext),
    queryFn: () => backendApi.getSkillGapAssessment(repositoryId, issueId, issueContext),
    enabled: Boolean(repositoryId) && Boolean(issueId) && Boolean(issueContext) && enabled,
    staleTime: 900000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

// Polls so a notification created by the background repository monitor
// (see repository-service) shows up without the user needing to refresh.
export function useNotifications() {
  return useQuery({
    queryKey: backendQueryKeys.notifications,
    queryFn: backendApi.listNotifications,
    staleTime: 15000,
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => backendApi.markNotificationRead(notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: backendQueryKeys.notifications }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: backendApi.markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: backendQueryKeys.notifications }),
  });
}

/**
 * The contributor profile. Every number in it is counted in the database, so
 * this is a plain read - refetched when the window regains focus so progress
 * recorded elsewhere in the app shows up.
 */
export function useProfileStats() {
  return useQuery({ queryKey: backendQueryKeys.profileStats, queryFn: backendApi.getProfileStats, staleTime: 30000 });
}

export function useSetIssueProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ issueId, status }: { issueId: string; status: IssueProgressStatus }) => backendApi.setIssueProgress(issueId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: backendQueryKeys.profileStats }),
  });
}
