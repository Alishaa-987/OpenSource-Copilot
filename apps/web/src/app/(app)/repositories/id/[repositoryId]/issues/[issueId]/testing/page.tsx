"use client";

import { useParams } from "next/navigation";
import { IssueWorkspace } from "@/components/features/issue-workspace";

export default function IssueTestingPage() {
  const { repositoryId, issueId } = useParams<{ repositoryId: string; issueId: string }>();
  return <IssueWorkspace repositoryId={repositoryId} issueId={issueId} section="testing" />;
}
