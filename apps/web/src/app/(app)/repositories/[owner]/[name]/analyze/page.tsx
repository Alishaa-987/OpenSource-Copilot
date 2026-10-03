"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BackendApiError } from "@/lib/backend-api";
import { useAccessibleRepositories, useImportRepository } from "@/lib/backend-hooks";

export default function RepositoryImportPage() {
  const { owner, name } = useParams<{ owner: string; name: string }>();
  const router = useRouter();
  const repositories = useAccessibleRepositories({ page: 1, perPage: 100, search: owner + "/" + name });
  const importer = useImportRepository();
  const started = useRef(false);
  const match = repositories.data?.items.find((item) => item.owner === owner && item.name === name);
  useEffect(() => {
    if (match && !started.current) {
      started.current = true;
      importer.mutate(match.id, { onSuccess: (result) => router.replace("/repositories/id/" + result.repository.repositoryId) });
    }
  }, [match, importer, router]);
  if (repositories.isLoading || importer.isPending) return <State title="Importing repository…" detail="Fetching repository metadata, documents, and open issues." />;
  if (repositories.error) return <State title="Unable to find this repository" detail={repositories.error.message} action={<Button onClick={() => repositories.refetch()}>Try again</Button>} />;
  if (importer.error) return <State title="Repository import failed" detail={importer.error instanceof BackendApiError ? importer.error.message : "The repository could not be imported."} action={<Button onClick={() => { started.current = false; importer.reset(); }}>Retry import</Button>} />;
  if (!match) return <State title="Repository is not accessible" detail="The selected repository was not returned by GitHub for this account." />;
  return <State title="Preparing repository…" detail="The import is being started." />;
}

function State({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <main className="flex min-h-[60vh] items-center justify-center"><section className="w-full max-w-md rounded-xl border border-dashed border-border bg-card p-8 text-center"><h1 className="text-lg font-semibold text-foreground">{title}</h1>{detail && <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>}{action && <div className="mt-5 flex justify-center">{action}</div>}</section></main>;
}
