"use client";

import { useParams } from "next/navigation";
import { RepositoryWorkspace } from "@/components/features/repository-workspace";

export default function RepositoryFirstPrPage() {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  return <RepositoryWorkspace repositoryId={repositoryId} section="first-pr" />;
}
