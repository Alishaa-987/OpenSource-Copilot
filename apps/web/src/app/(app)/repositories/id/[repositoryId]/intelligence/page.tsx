"use client";

import { useParams } from "next/navigation";
import { RepositoryWorkspace } from "@/components/features/repository-workspace";

export default function RepositoryIntelligencePage() {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  return <RepositoryWorkspace repositoryId={repositoryId} section="intelligence" />;
}
