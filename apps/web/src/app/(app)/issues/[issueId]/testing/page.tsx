"use client";

import { useParams } from "next/navigation";
import { IssueWorkspace } from "@/components/features/issue-workspace";
import { useIssue } from "@/lib/backend-hooks";

export default function LegacyIssueTestingPage() {
  const { issueId } = useParams<{ issueId: string }>();
  const issue = useIssue(issueId);

  if (!issue.data) {
    return <main className="flex min-h-[60vh] items-center justify-center"><p className="text-sm text-muted-foreground">Loading testing and confidence guidance…</p></main>;
  }

  return <IssueWorkspace repositoryId={issue.data.repositoryId} issueId={issueId} section="testing" />;
}
