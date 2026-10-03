"use client";
import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BackendApiError, backendApi } from "@/lib/backend-api";
export function RepositoryLinkImportForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const mutation = useMutation({ mutationFn: (repositoryUrl: string) => backendApi.importPublicRepository(repositoryUrl) });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); mutation.mutate(url, { onSuccess: (result) => router.push(`/repositories/id/${result.repository.repositoryId}`) }); }
  return <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5"><h2 className="text-base font-semibold text-foreground">Analyze a GitHub repository</h2><p className="mt-1 text-sm text-muted-foreground">Paste a public GitHub repository URL. Only this repository is imported into the active workspace.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row"><input aria-label="GitHub repository URL" type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://github.com/owner/repository" className="min-h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm" /><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Importing…" : "Import repository"}</Button></div>{mutation.error && <p role="alert" className="mt-3 text-sm text-destructive">{mutation.error instanceof BackendApiError ? mutation.error.message : "Repository import failed. Try again."}</p>}</form>;
}
